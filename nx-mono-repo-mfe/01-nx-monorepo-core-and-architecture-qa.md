# 01 — Nx Monorepo Core Fundamentals & Architecture

> Core Architecture, Project Graph Directed Acyclic Graph (DAG), Computation Hashing Mechanics, Local & Remote Caching, Task Pipelines (`dependsOn`), and Monorepo vs Polyrepo vs Modular Monolith Trade-offs.

---

## 📑 Table of Contents
1. [Monorepo Philosophy & Architectural Paradigms](#1-monorepo-philosophy--architectural-paradigms)
2. [Nx Workspace Anatomy & The Daemon Worker](#2-nx-workspace-anatomy--the-daemon-worker)
3. [The Project Graph & Task Pipeline Orchestration](#3-the-project-graph--task-pipeline-orchestration)
4. [Computation Hashing & Cache Invalidation Mechanics](#4-computation-hashing--cache-invalidation-mechanics)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Monorepo Philosophy & Architectural Paradigms

### Q1: What is an Nx monorepo, and how does it fundamentally differ from a polyrepo and a traditional "modular monolith"?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Architecture]` `[Monorepo]`

**Answer:**
A **Monorepo** is a single version-controlled repository containing multiple distinct projects, applications, and shared libraries with well-defined boundaries and explicit relationships.

The core differences lie in **versioning cadence, build coupling, and deployment autonomy**:

```text
POLYREPO ARCHITECTURE (Multi-Repo):
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ App Repo A   │     │ App Repo B   │     │ Shared Lib   │
│ (v2.1.0)     │     │ (v1.4.0)     │     │ (npm package)│
└──────┬───────┘     └──────┬───────┘     └──────▲───────┘
       │                    │                    │
       └──── (npm install @corp/shared-lib) ─────┘
       [Friction: Version desync, semantic version bumping, multi-PR coordination]

NX MONOREPO ARCHITECTURE:
┌────────────────────────────────────────────────────────┐
│ Workspace Root (Single Git History & Unified Lockfile) │
│                                                        │
│  apps/                 libs/                           │
│  ├── shell-host        ├── auth/data-access            │
│  ├── order-remote      ├── shared/ui-kit               │
│  └── billing-remote    └── inventory/contracts         │
│                                                        │
│  [Shared direct TS paths, atomic commits, Instant PRs] │
└────────────────────────────────────────────────────────┘
```

- **Monorepo vs Polyrepo:** In polyrepos, sharing code requires publishing npm packages, updating semantic versions, coordinating breaking changes across PRs, and suffering dependency desynchronization. In an Nx monorepo, projects consume libraries directly via TypeScript source path mappings (`@myorg/ui-kit`). A single atomic commit updates both the shared library and every consumer, verified instantly in CI.
- **Monorepo vs Modular Monolith:** A modular monolith typically compiles and bundles all code into a single runtime binary or monolithic JavaScript artifact deployed at once. An Nx monorepo contains distinct apps that can be deployed independently (such as federated micro-frontends or separate serverless microservices) while sharing build tools, governance rules, and code.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Doesn't putting 50 projects in one repository cause CI times to explode exponentially?"  
*Senior Answer:* Without intelligent tooling, yes. A naive monorepo rebuilds everything on every commit. Nx solves this using **Computation Caching** and **Affected Graph Analysis**. Nx analyzes the Git diff against the base commit, traverses the dependency graph, and executes tasks *only* for projects directly or transitively affected by the change. Everything else is retrieved instantaneously from local or remote cache.

---

### Q2: What are the differences between Package-Based, Integrated, and Standalone Nx workspace setups?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Workspace-Setup]` `[Governance]`

**Answer:**
Nx supports three distinct layout paradigms depending on the level of tooling automation and dependency governance needed:

| Feature | Standalone | Package-Based | Integrated (Recommended Enterprise) |
|---|---|---|---|
| **Primary Use Case** | Single application migrating to Nx | Multi-package npm publishing (like Lerna/pnpm) | Large-scale enterprise monorepo with multiple apps & libs |
| **`package.json` Layout** | Single root `package.json` | Every package in `packages/*` has its own `package.json` | Single root `package.json` enforcing Single Version Policy |
| **Configuration** | Root `nx.json` + `project.json` | Each package has its own scripts | `project.json` per project or inferred via plugins |
| **Compilation** | Direct bundler | Independent `npm run build` per package | Unified TypeScript path aliases (`tsconfig.base.json`) |
| **Tooling Generators** | Standard Nx generators | Minimal (run-commands) | Rich Nx generators (`@nx/angular`, `@nx/react`, `@nx/nest`) |

- **Package-Based:** Ideal for open-source library authors who need to publish 20 independent packages to npm with individual version numbers and distinct dependencies.
- **Integrated:** The gold standard for enterprise application development. Enforces a **Single Version Policy** across external third-party dependencies (one version of Angular, React, TypeScript, and RxJS across the entire company), eliminating version mismatch bugs across micro-frontends.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the danger of using a Package-Based setup when building Micro-Frontends?"  
*Senior Answer:* In a Package-Based setup, Remote A can install React 18.2 while the Host installs React 19.0 in its own private `package.json`. When Module Federation attempts to load both into the same browser window under `singleton: true`, runtime container panic occurs. Integrated repositories enforce a single root lockfile, guaranteeing alignment before runtime federation.

---

## 2. Nx Workspace Anatomy & The Daemon Worker

### Q3: What is the architectural role of `nx.json` vs `project.json` in an Nx workspace?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Configuration]` `[Nx-Json]`

**Answer:**
Nx splits configuration between **workspace-wide global defaults** and **project-specific target declarations**:

1. **`nx.json` (Workspace Root):**
   - Declares workspace-wide plugins (`plugins: ['@nx/angular', '@nx/react']`).
   - Defines target defaults (`targetDefaults`): Caching rules, inputs/outputs, and task dependencies (`dependsOn`).
   - Defines named input sets (`namedInputs: { default: ['{projectRoot}/**/*', 'sharedGlobals'] }`).
   - Configures task runner, Nx Cloud tokens, and workspace generators.

2. **`project.json` (Project Root):**
   - Defines metadata for a single app or library (`name`, `sourceRoot`, `projectType: 'application' | 'library'`).
   - Declares project tags (`tags: ['scope:checkout', 'type:feature']`).
   - Overrides or specifies targets (`build`, `serve`, `lint`, `test`) using dedicated executors (`executor: '@nx/webpack:webpack'`) or shell scripts (`nx:run-commands`).

```json
// Example: project.json target definition
{
  "name": "checkout-feature",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library",
  "sourceRoot": "libs/checkout/feature/src",
  "tags": ["scope:checkout", "type:feature"],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/checkout/feature",
        "main": "libs/checkout/feature/src/index.ts",
        "tsConfig": "libs/checkout/feature/tsconfig.lib.json"
      }
    }
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "In modern Nx (v17–v20+), many projects don't have a `project.json` at all! How does Nx know how to build or test them?"  
*Senior Answer:* This is **Project Crystal (Inferred Tasks)**. Nx plugins (like `@nx/vite`, `@nx/jest`, `@nx/playwright`) automatically inspect configuration files (e.g., `vite.config.ts`, `jest.config.ts`, `playwright.config.ts`) and synthesize target tasks dynamically on the fly without requiring boilerplate `project.json` target definitions.

---

### Q4: What is the Nx Daemon, how does it work under the hood, and when can it cause developer friction?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Daemon]` `[Performance]`

**Answer:**
The **Nx Daemon** is a lightweight, background Node.js process that runs continuously on a developer's local machine or CI server to make Nx commands execute instantly.

```text
┌────────────────────────────────────────────────────────┐
│                    Developer Shell                     │
│  $ nx test my-app (CLI Invocation)                     │
└───────────────────────┬────────────────────────────────┘
                        │ IPC Socket Query (sub-millisecond)
                        ▼
┌────────────────────────────────────────────────────────┐
│                   Nx Background Daemon                 │
│                                                        │
│  ├── File System Watcher (chokidar/native watcher)     │
│  │   Tracks every added/modified/deleted file in RAM   │
│  ├── Cached Project Graph in Memory (Pre-computed DAG) │
│  └── Ready Computation Hash Index                      │
└────────────────────────────────────────────────────────┘
```

Without the daemon, every invocation of `nx` would have to:
1. Scan thousands of files across the file system.
2. Parse TypeScript ASTs and `project.json` files from scratch.
3. Construct the dependency graph ($O(N+E)$ graph traversal).

With the daemon running, the graph is pre-computed and kept warm in memory.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Have you ever experienced an issue where changes to a project were ignored by Nx commands? How did you fix it?"  
*Senior Answer:* Yes. If the native file watcher loses synchronization (e.g., during massive Git branch switches, `git rebase`, or IDE node_modules rewrites), the daemon's in-memory project graph can become stale. The solution is running **`nx reset`**, which kills the background daemon, flushes memory, and clears `.nx/cache`.

---

## 3. The Project Graph & Task Pipeline Orchestration

### Q5: How does Nx calculate its Project Graph Directed Acyclic Graph (DAG) under the hood?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Project-Graph]` `[AST]` `[Internals]`

**Answer:**
Nx calculates the Project Graph using a combination of **static code analysis, configuration metadata, and workspace plugins**:

1. **Source Code Static Analysis:**
   - Nx scans all TypeScript/JavaScript files in the workspace using the TypeScript compiler API / SWC.
   - It extracts `import ... from '@myorg/shared-ui'` and `export ... from ...` statements.
   - It maps path mappings in `tsconfig.base.json` back to the owning library project root.
2. **Explicit Dependency Definitions:**
   - Developers can define `implicitDependencies` in `project.json`. For example, an E2E test project can explicitly depend on the backend API project even if it never imports code directly from it.
3. **Plugin Ingestion:**
   - Plugins (e.g., for NestJS, Angular, or Module Federation) register dynamic dependencies (e.g., manifest-driven federated remotes).
4. **Graph Construction & Cycle Detection:**
   - Nodes represent projects (apps and libs).
   - Directed edges represent dependencies ($A \rightarrow B$ means $A$ depends on $B$).
   - A topological sort ensures there are no circular dependency cycles.

```text
         ┌───────────────┐
         │  shell-host   │
         └──┬─────────┬──┘
            │         │
    ┌───────▼──┐   ┌──▼────────┐
    │  order-  │   │  billing- │
    │  remote  │   │  remote   │
    └──┬───────┘   └──┬────────┘
       │              │
       └──────┬───────┘
              ▼
       ┌──────────────┐
       │  shared-ui   │
       └──────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can circular dependencies exist in an Nx monorepo? What happens when one is introduced?"  
*Senior Answer:* Circular dependencies break topological sorting, meaning task orchestration (`dependsOn`) cannot determine which project to build first. Nx's lint rule `@nx/enforce-module-boundaries` detects cycles during linting and errors immediately. If ignored, builds fail or enter infinite compilation loops.

---

### Q6: How does `targetDependencies` (`dependsOn`) model task execution ordering in Nx?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Task-Pipeline]` `[dependsOn]`

**Answer:**
`dependsOn` in `nx.json` or `project.json` defines task orchestration pipelines. It allows targets to wait for dependencies before executing.

The `^` prefix signifies **"run this target on all topological upstream dependencies first"**:

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["default", "^production"],
      "cache": true
    }
  }
}
```

- `"build": { "dependsOn": ["^build"] }`: Before building `shell-host`, Nx will topologically traverse the graph and build `shared-ui`, `order-remote`, and all other libraries first.
- `"test": { "dependsOn": ["build"] }`: Before testing a project, its own build target must complete successfully.

Nx executes independent upstream builds **in parallel** up to the machine's CPU core limit (`--parallel=4`).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the danger of setting `dependsOn: ["^build"]` for non-buildable TypeScript libraries?"  
*Senior Answer:* If libraries are non-buildable (consumed directly as raw TypeScript files by an application bundler like Webpack or Vite), they have no `build` target in their `project.json`. Setting `dependsOn: ["^build"]` will cause Nx to throw an error that the target doesn't exist, unless the target is omitted or configured as optional.

---

## 4. Computation Hashing & Cache Invalidation Mechanics

### Q7: Explain the exact mathematics and mechanics of Nx's Computation Hashing algorithm.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Caching]` `[Hashing]` `[Internals]`

**Answer:**
Nx does not compare file timestamps or git commit IDs to determine if a build is stale. Instead, it computes an SHA-256 hash across **5 distinct input dimensions**:

$$\text{CacheKey} = \text{SHA256}(\text{ProjectFiles} + \text{DependencyOutputs} + \text{EnvVars} + \text{RuntimeTools} + \text{TargetConfig})$$

```text
┌────────────────────────────────────────────────────────┐
│                   Computation Hash Inputs              │
├────────────────────────────────────────────────────────┤
│ 1. Project Source Files (AST / file contents)          │
│ 2. Upstream Dependencies Source & Hash (`^production`) │
│ 3. Global Configuration (`nx.json`, `tsconfig.base`)   │
│ 4. External Dependencies Versions (Lockfile entries)   │
│ 5. Environment Variables (`NODE_ENV`, custom envs)     │
│ 6. Runtime Inputs (e.g. `node -v`, `os.platform`)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
              SHA-256 Hash: "a7f3c9e..."
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        Cache Hit                   Cache Miss
   Replay terminal logs        Execute task & store:
   & restore `outputs/`        - terminal output
   from `.nx/cache/`           - artifact files
```

When a task is triggered:
1. Nx computes the hash key.
2. Checks `.nx/cache/terminalOutputs/<hash>` and `.nx/cache/<hash>`.
3. If found: **Cache Hit**. Restores dist files to the disk instantly and prints terminal output. Execution time: ~20ms!
4. If missing: **Cache Miss**. Spawns worker process, writes artifacts to `outputs`, records terminal output, and saves hash entry.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What causes a 'false cache hit' (cache poisoning), and how can you safeguard against it?"  
*Senior Answer:* A false cache hit happens when a task depends on an implicit environmental input that was **omitted from the `namedInputs` configuration**—such as reading an un-hashed `.env` variable or querying a live database during build. If Developer A builds with `API_URL=staging` and pushes to shared remote cache, Developer B might download that artifact thinking it was built for production. The mitigation is strictly declaring all environmental variables in `inputs: [{ env: "API_URL" }]`.

---

### Q8: What are `namedInputs` and why are they critical for preventing cache invalidation cascades?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[namedInputs]` `[Caching]`

**Answer:**
By default, modifying *any* file inside a project directory (even a markdown file or test script) would invalidate the project's build cache. `namedInputs` allows developers to partition file sets so changes to documentation or unit tests do not invalidate production builds:

```json
// nx.json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?",
      "!{projectRoot}/src/test-setup.[jt]s",
      "!{projectRoot}/**/*.stories.[jt]s?(x)?",
      "!{projectRoot}/README.md"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/babel.config.json",
      "{workspaceRoot}/tsconfig.base.json"
    ]
  },
  "targetDefaults": {
    "build": {
      "inputs": ["production", "^production"]
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"]
    }
  }
}
```

- When `README.md` or `button.spec.ts` is edited: The `production` input hash **does not change**.
- Therefore, the `build` target for this project—and all downstream applications that depend on it—remains a **100% Cache Hit**!

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What does the `^production` symbol mean in the inputs array?"  
*Senior Answer:* The caret (`^`) denotes transitive dependencies. It tells Nx: *"Only compute the hash of the upstream dependencies using their `production` input rules, ignoring their test and documentation files."* Without this, editing a test file in `shared-ui` would invalidate the build cache of the entire `shell-host` application!

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q9: 🧩 Output Prediction: Cache Hit vs Cache Miss with Custom Inputs
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Output-Prediction]` `[Caching]`

**Scenario:**
Consider an Nx project with the following configuration:

```json
// project.json
{
  "name": "cart-ui",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{workspaceRoot}/dist/libs/cart-ui"],
      "inputs": ["production"]
    }
  }
}
```

The developer performs the following sequential actions:
1. Runs `nx build cart-ui` (Takes 4.2s, outputs compilation).
2. Edits `libs/cart-ui/README.md`.
3. Runs `nx build cart-ui`.
4. Adds `console.log('debug')` to `libs/cart-ui/src/lib/cart.component.spec.ts`.
5. Runs `nx build cart-ui`.
6. Modifies `libs/cart-ui/src/lib/cart.component.ts`.
7. Runs `nx build cart-ui`.

**Predict the outcome of steps 3, 5, and 7:**

**Answer:**
- **Step 3 (`README.md` edited):**  
  `✔ nx run cart-ui:build [existing outputs match the cache, left as is]`  
  **Result:** `[local cache hit]` (0.05s). `README.md` is excluded from the `production` named input set.
- **Step 5 (`spec.ts` edited):**  
  `✔ nx run cart-ui:build [existing outputs match the cache, left as is]`  
  **Result:** `[local cache hit]` (0.04s). Spec files are excluded from `production` inputs.
- **Step 7 (`cart.component.ts` edited):**  
  `✔ nx run cart-ui:build [compiled in 3.9s]`  
  **Result:** **Cache Miss**. The source code file is included in `production`, altering the SHA-256 hash and triggering full re-execution.

---

### Q10: 🐛 Debug Scenario: Stale Build Artifacts & Broken Output Mapping
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Outputs]` `[Ghost-Build]`

**Scenario:**
A developer updates a React UI component in `libs/shared-ui`. They run `nx build host-app`, but the resulting output bundle in `dist/apps/host-app` still reflects the old, un-updated component! Even after multiple edits, Nx reports:
`nx run host-app:build [local cache]`
When they run with `--skip-nx-cache`, the build succeeds with fresh code. Why was Nx returning stale cache, and what was misconfigured?

```json
// Defective target in project.json
{
  "name": "host-app",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{projectRoot}/dist"], // <--- BUG HERE!
      "options": {
        "outputPath": "dist/apps/host-app",
        "main": "apps/host-app/src/main.ts"
      }
    }
  }
}
```

**Answer:**
**Root Cause:** The `outputs` array in `project.json` does not match the actual `outputPath` produced by the bundler!
1. Webpack was emitting build artifacts to `dist/apps/host-app` (relative to the workspace root).
2. However, the `outputs` property declared in `project.json` pointed to `"{projectRoot}/dist"` (`apps/host-app/dist`).
3. When Nx saved the cache, it archived an empty or non-existent folder.
4. When subsequent builds resulted in a cache hit, Nx looked at `"{projectRoot}/dist"`, restored nothing, and left whatever stale files happened to be sitting in `dist/apps/host-app`.

**Fix:** Correct the `outputs` path:
```json
"outputs": ["{workspaceRoot}/dist/apps/host-app"]
```
Or use the tokenized option shorthand:
```json
"outputs": ["{options.outputPath}"]
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q11: What is the exact purpose of `nx reset`?
**Answer:** It kills the background Nx Daemon, purges the in-memory cached Project Graph, and clears the local cache directory (`.nx/cache`). It is the primary command to run when the file system watcher desynchronizes.

### Q12: How does Nx distinguish between a terminal log replay and an actual command execution?
**Answer:** During a cache hit, Nx outputs a distinct header: `[existing outputs match the cache, left as is]` or `[local cache]` along with an execution duration in single-digit milliseconds, replaying stored stdout/stderr from `.nx/cache/terminalOutputs`.

### Q13: Can you run an Nx workspace without the Nx Daemon?
**Answer:** Yes. Set the environment variable `NX_DAEMON=false` or configure `"useDaemonProcess": false` in `nx.json`. This is standard practice in containerized, short-lived CI runners (like Docker containers in GitHub Actions or GitLab CI) where background daemons provide no benefit across disposable runners.

### Q14: What is the difference between `--skip-nx-cache` and `nx reset`?
**Answer:** `--skip-nx-cache` forces Nx to bypass reading from or writing to the cache for that single execution while leaving the existing cache intact. `nx reset` terminates background processes and removes cached files permanently from disk.

### Q15: Why is `nx.json`'s `targetDefaults` superior to defining configurations in individual `project.json` files?
**Answer:** It enforces DRY (Don't Repeat Yourself) governance across hundreds of projects. If a workspace grows to 200 libraries, changing `dependsOn` or caching inputs is done in one line in `nx.json` rather than editing 200 individual `project.json` files.
