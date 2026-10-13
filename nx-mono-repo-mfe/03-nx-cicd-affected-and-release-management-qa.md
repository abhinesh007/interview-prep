# 03 — CI/CD, Affected Analysis & Release Automation

> `nx affected` Git Diffing Algorithms, Distributed Task Execution (DTE) vs Matrix CI, Nx Cloud Orchestration, Nx Release (`nx release`), Single Version Policy, and Independent Micro-Frontend Deployment Pipelines.

---

## 📑 Table of Contents
1. [`nx affected` Mechanics & Git Diff Traversal](#1-nx-affected-mechanics--git-diff-traversal)
2. [Distributed Task Execution (DTE) vs Matrix CI](#2-distributed-task-execution-dte-vs-matrix-ci)
3. [Release Automation & Versioning (`nx release`)](#3-release-automation--versioning-nx-release)
4. [Continuous Deployment Pipelines for Micro-Frontends](#4-continuous-deployment-pipelines-for-micro-frontends)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. `nx affected` Mechanics & Git Diff Traversal

### Q1: How does `nx affected` calculate affected projects under the hood, and how does it determine the git base and head?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[CI/CD]` `[nx-affected]` `[Git]`

**Answer:**
`nx affected` combines **Git diff analysis** with the **Nx Project Graph Directed Acyclic Graph (DAG)** to determine the minimal set of projects that need to be re-linted, re-tested, or re-built.

### The Algorithm:
1. **Calculate the Git Merge Base:**
   Nx identifies the common ancestor commit between the current working branch (`HEAD`) and the target base branch (`origin/main`):
   $$\text{merge-base} = \text{git merge-base origin/main HEAD}$$
2. **Collect Changed Files:**
   Nx queries Git for all files added, modified, or deleted between `merge-base` and `HEAD`:
   $$\text{git diff --name-only <merge-base> HEAD}$$
3. **Map Files to Projects:**
   Every changed file path is mapped to its owning project root (e.g., `libs/cart/ui/src/button.ts` maps to `cart-ui`).
4. **Topological Graph Traversal:**
   Nx traverses the DAG upwards from the directly touched nodes to identify all **transitively affected consumers**:

```text
Touched in PR:
libs/cart/data-access (MODIFIED)
        │
        ├──► libs/cart/feature (AFFECTED) ──► apps/checkout-remote (AFFECTED)
        │
        └──► apps/shell-host (AFFECTED)

Untouched & Unaffected:
libs/catalog/feature  (SKIPPED - Cached)
apps/admin-dashboard  (SKIPPED - Cached)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a developer edits a root configuration file like `nx.json` or `package.json`?"  
*Senior Answer:* Files defined in `nx.json`'s `sharedGlobals` or root lockfiles (`pnpm-lock.yaml`, `package-lock.json`) are configured as inputs to *every* project in the workspace. Touching them causes `nx affected` to flag **all projects** in the monorepo as affected, triggering a full workspace build.

---

### Q2: What are the differences between `nx affected -t build`, `nx run-many -t build`, and `nx build <project>`?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical / Coding  
**Tags:** `[CLI]` `[Workflow]`

**Answer:**

| Command | Scope | Primary Use Case |
|---|---|---|
| `nx build <project>` | Single specific project | Local feature development on one app/lib |
| `nx run-many -t build --projects=app1,app2` | Explicit list of projects or all projects matching a pattern (`--all`) | Manual release triggers, scheduled nightly CI builds |
| `nx affected -t build --base=origin/main` | Only projects modified in the current branch + their downstream consumers | **Pull Request CI Pipelines** (Maximizes speed) |

### Modern Syntax Note (Nx v17–v20+):
The legacy syntax `nx affected:build` has been replaced by the unified multi-target syntax:
```bash
nx affected -t lint test build --parallel=3
```
This executes `lint`, `test`, and `build` across all affected projects according to topological dependency rules defined in `nx.json`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does `--base` behave differently on the `main` branch post-merge vs in a PR branch?"  
*Senior Answer:* In a PR branch, `--base=origin/main` compares your feature branch against trunk. But on `main` itself (after merging), the merge-base of `main` against `main` is zero! On the trunk branch, you must use `--base=HEAD~1` to inspect only the commit that was just merged.

---

## 2. Distributed Task Execution (DTE) vs Matrix CI

### Q3: What is Distributed Task Execution (DTE), and how does it fundamentally outperform traditional CI Matrix builds?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[CI/CD]` `[DTE]` `[Nx-Cloud]`

**Answer:**
Traditional CI platforms (GitHub Actions, GitLab CI, CircleCI) use static **Matrix Builds** to parallelize work. In an enterprise monorepo, matrix builds suffer from severe inefficiency:

```text
TRADITIONAL MATRIX CI (Static Worker Slicing):
Worker 1: [ E2E Tests (18 mins) ──────────────────────────► ]
Worker 2: [ Linting (2 mins) ──► ][ IDLE FOR 16 MINS       ]
Worker 3: [ Unit Tests (5 mins) ────► ][ IDLE FOR 13 MINS  ]
[Total CI Time = 18 mins (Gated by slowest worker! Massive waste)]

NX DISTRIBUTED TASK EXECUTION (DTE with Dynamic Bin-Packing):
Worker 1: [ E2E Chunk 1 (6m) ──► ][ Unit Tests (5m) ──► ][ Lint (2m) ]
Worker 2: [ E2E Chunk 2 (6m) ──► ][ Build App 1 (4m) ──► ][ Build Libs ]
Worker 3: [ E2E Chunk 3 (6m) ──► ][ Build App 2 (4m) ──► ][ Done ]
[Total CI Time = ~7 mins (Perfect worker utilization, dynamic balance)]
```

### Key DTE Mechanics:
1. **Dynamic Task Bin-Packing:** The Nx Cloud orchestrator maintains historical runtimes for every task in the workspace. It distributes tasks dynamically to agents as they become free, ensuring all workers finish nearly simultaneously.
2. **Automatic Artifact Forwarding:** If Agent 1 builds `libs/shared-ui`, and Agent 2 needs that build output to run an E2E test on `shell-host`, Nx Cloud automatically streams the artifact over the network from Agent 1 to Agent 2 without manual caching scripts.
3. **Flaky Task Retries:** Tasks that fail intermittently can be automatically retried in isolation on a clean agent.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a network hiccup occurs while streaming a build artifact between DTE agents?"  
*Senior Answer:* Nx Cloud verifies SHA-256 integrity hashes on all transferred artifact packages. If an artifact transfer fails or corrupts, Nx flags the cache miss, re-executes the build on the local agent, and falls back gracefully rather than crashing the pipeline.

---

## 3. Release Automation & Versioning (`nx release`)

### Q4: How does `nx release` automate versioning, changelog generation, and package publishing in an Nx workspace?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Release]` `[Versioning]` `[npm]`

**Answer:**
`nx release` is the modern, first-party release orchestrator in Nx (replacing third-party tools like Lerna or Changesets). It operates in three distinct phases:

```text
$ nx release
     │
     ├── 1. nx release version
     │      Parses Conventional Commits (feat: -> minor, fix: -> patch)
     │      Updates package.json files & aligns inter-package semver ranges
     │
     ├── 2. nx release changelog
     │      Generates CHANGELOG.md & creates Git release tags
     │
     └── 3. nx release publish
            Compiles artifacts & publishes to npm / internal registry
```

### Configuration in `nx.json`:
```json
// nx.json
{
  "release": {
    "projects": ["libs/shared/*", "libs/ui-kit"],
    "version": {
      "conventionalCommits": true,
      "generatorOptions": {
        "currentVersionResolver": "git-tag",
        "specifierSource": "conventional-commits"
      }
    },
    "changelog": {
      "projectChangelogs": true,
      "workspaceChangelog": {
        "createRelease": "github"
      }
    }
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "In a monorepo with 50 packages, how does `nx release` handle updating internal dependencies when one package bumps its version?"  
*Senior Answer:* `nx release version` automatically updates the `dependencies` or `peerDependencies` fields across all consuming packages in the monorepo to match the newly generated version range, preventing broken references when packages are published.

---

### Q5: Single Version Policy vs Multi-Package Versioning: When should an enterprise choose which?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Versioning]` `[Single-Version-Policy]`

**Answer:**

| Dimension | Single Version Policy (Recommended for Apps/MFEs) | Independent Multi-Package Versioning |
|---|---|---|
| **Version Alignment** | All external packages (React, Angular) locked to one exact version in root `package.json` | Each sub-package in `packages/*` defines its own versions |
| **Dependency Hell** | Completely eliminated inside the workspace | High risk of diamond dependency conflicts |
| **MFE Compatibility**| Guarantees shared singleton compatibility at runtime | Fragile; Remote A can request React 18 while Host uses 19 |
| **Publishing to npm**| Internal apps don't publish to npm; libraries deployed together | Ideal for public open-source libraries (e.g. Angular CDK, Babel) |

**The Enterprise Consensus:** For applications, Micro-Frontends, and backend microservices, the **Single Version Policy** is strictly superior because it ensures that code tested together in CI is guaranteed to run together in production without runtime module resolution mismatches.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if Team A urgently needs Angular 19 for a new remote, but Team B is stuck on Angular 18 for their remote?"  
*Senior Answer:* This is an architectural smell. In an integrated monorepo, the proper approach is upgrading the workspace atomically using `nx migrate`. If an immediate upgrade is truly blocked, the legacy remote must be decoupled into an isolated runtime sandbox (e.g. via an iframe) or maintained temporarily in an independent repository, because loading Angular 18 and Angular 19 in the same browser window under Module Federation will corrupt Zone.js and DI singletons.

---

## 4. Continuous Deployment Pipelines for Micro-Frontends

### Q6: How should an independent deployment pipeline be structured for Micro-Frontends inside an Nx monorepo?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[CI/CD]` `[MFE]` `[Deployment]`

**Answer:**
A common antipattern in monorepos is forcing a full deployment of the entire system whenever a commit lands on `main`. Micro-Frontends require **Independent Continuous Deployment (CD)**:

```text
Developer merges PR touching only apps/checkout-remote:
┌────────────────────────────────────────────────────────┐
│                   GitHub Actions / GitLab CI           │
│                                                        │
│  1. git diff analysis:                                 │
│     AFFECTED_APPS=$(nx show projects --affected        │
│                     --type=app --base=HEAD~1)          │
│                                                        │
│  2. Matrix Dispatch:                                   │
│     Triggers deployment job ONLY for "checkout-remote" │
│                                                        │
│  3. Build & CDN Upload:                                │
│     $ nx build checkout-remote --configuration=prod    │
│     Uploads dist/apps/checkout-remote/* to S3 / Cloud  │
│     Path: /mfe/checkout/v[commit-hash]/remoteEntry.js  │
│                                                        │
│  4. Update Dynamic Manifest:                           │
│     Updates central manifest service:                  │
│     { "checkout": "https://cdn.corp.com/mfe/checkout..."}│
└────────────────────────────────────────────────────────┘
```

### Key Principles:
1. **Immutable CDN Storage:** Remote assets are uploaded to versioned or hashed directories on a CDN to prevent caching collisions.
2. **Dynamic Manifest Swap:** Instead of rebuilding the Host Shell, the shell fetches a lightweight JSON manifest (`module-federation.manifest.json`) at runtime. Deploying a remote simply updates the URL in the manifest.
3. **Atomic Revertibility:** If `checkout-remote` contains a production bug, rolling back requires updating a single JSON URL in the manifest service—instant rollback in <1 second with zero rebuilds!

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q7: 🐛 Debug Scenario: `nx affected` Detects Zero Changes in CI
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[GitHub-Actions]` `[Git-Clone]`

**Scenario:**
A developer opens a Pull Request on GitHub Actions with 15 commits modifying several files in `apps/dashboard-remote`.
However, the CI pipeline job executing:
```bash
npx nx affected -t lint test build --base=origin/main
```
prints:
```text
✔ No projects were affected by change.
```
All tests are skipped, and the PR passes erroneously! What is the root cause in the GitHub Actions workflow?

**Answer:**
**Root Cause:** The GitHub Actions `actions/checkout` step defaults to a **shallow clone (`fetch-depth: 1`)**!

```yaml
# Defective GitHub Actions Step
- uses: actions/checkout@v4 # Defaults to fetch-depth: 1!
```

1. With `fetch-depth: 1`, Git only downloads the single latest commit of the PR branch.
2. The commit history for `origin/main` does not exist on the runner's local disk.
3. When Nx executes `git merge-base origin/main HEAD`, Git fails or points to `HEAD`, resulting in a diff of 0 files!

**Fix:** Set `fetch-depth: 0` to fetch the complete commit history:
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- run: git fetch --no-tags --prune origin main
```

---

### Q8: 🧩 Output Prediction: Affected Projects Traversal
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Output-Prediction]` `[DAG]`

**Scenario:**
Consider the following dependency graph:
- `apps/shell-host` depends on `libs/nav-feature` and `libs/auth-data-access`.
- `libs/nav-feature` depends on `libs/ui-kit`.
- `apps/orders-remote` depends on `libs/ui-kit` and `libs/orders-data-access`.
- `apps/billing-remote` depends on `libs/billing-data-access`.

A commit modifies **only one file**: `libs/ui-kit/src/lib/button.component.ts`.

**Predict the output list of `nx show projects --affected`:**

**Answer:**
**Affected Projects:**
1. `ui-kit` (Directly modified)
2. `nav-feature` (Directly imports `ui-kit`)
3. `shell-host` (Imports `nav-feature`, transitively affected)
4. `orders-remote` (Directly imports `ui-kit`)

**Unaffected Projects (Omitted):**
- `auth-data-access`
- `orders-data-access`
- `billing-data-access`
- `billing-remote`

Nx traverses only the upstream paths from `ui-kit`.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: Why is `nx affected` faster than running tasks sequentially on all projects?
**Answer:** It completely skips compilation, linting, and testing for projects whose source files, configuration, and dependencies have not changed between the current commit and the base branch.

### Q10: How do you prevent cache poisoning in a shared remote cache during PR builds?
**Answer:** Configure CI so that Pull Requests from un-trusted forks or feature branches are **read-only** (`NX_CACHE_READ_ONLY=true`). Only merges into protected trunk branches (`main`) are granted write permissions to update the shared remote cache.

### Q11: What is the purpose of `nx format:check` and `nx format:write`?
**Answer:** They use Git diffs to run Prettier formatting exclusively on files touched in the current branch, rather than formatting the entire repository of 50,000 files.

### Q12: Can `nx release` be used with independent versioning across packages?
**Answer:** Yes. In `nx.json`, configure `"version": { "generatorOptions": { "projects": ["libs/*"], "relationship": "independent" } }`. Each package is then versioned according to its own individual commit history.

### Q13: What is the difference between `--base=origin/main~1` and `--base=HEAD~1`?
**Answer:** `--base=origin/main~1` checks changes relative to the commit before the tip of `origin/main`. `--base=HEAD~1` checks changes relative to the immediate predecessor commit of the current checkout (useful for CI post-merge verification).
