# 11 — Nx Monorepos & Enterprise Angular Architecture

> Nx Monorepo Philosophy, Apps vs Libs Taxonomy (`feature`, `ui`, `data-access`, `util`), Enforcing Architectural Boundaries (`@nx/enforce-module-boundaries`), Computation Caching, and `nx affected` CI Pipelines.

---

## 📑 Table of Contents
1. [Monorepo Philosophy & Polyrepo Trade-offs](#1-monorepo-philosophy--polyrepo-trade-offs)
2. [Nx Library Taxonomy & Architecture](#2-nx-library-taxonomy--architecture)
3. [Module Boundary Enforcement & Tagging](#3-module-boundary-enforcement--tagging)
4. [Nx Computation Caching & Task Graph](#4-nx-computation-caching--task-graph)
5. [`nx affected` in Enterprise CI/CD](#5-nx-affected-in-enterprise-cicd)
6. [🎯 Monorepo Traps & Senior Scenarios](#6--monorepo-traps--senior-scenarios)

---

## 1. Monorepo Philosophy & Polyrepo Trade-offs

### Q1: What is a Monorepo, and why do large enterprises choose Nx over Polyrepos for Angular?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture  
**Tags:** `[Nx]` `[Architecture]`

**Answer:**
A **Monorepo** is a single version-controlled repository containing multiple distinct projects (applications and shared libraries) with well-defined relationships.

```text
Polyrepo Model:
[ Repo: Customer App ] ──► Depends on ──► [ Published npm: @company/ui v1.2.0 ]
[ Repo: Admin App ]    ──► Depends on ──► [ Published npm: @company/ui v1.1.0 (Outdated!) ]
(Result: Version skew, broken contracts, multi-PR overhead)

Nx Monorepo Model:
my-enterprise-org/
├── apps/
│   ├── customer-portal/
│   └── admin-dashboard/
└── libs/
    ├── shared/ui/
    └── shared/auth/
(Single commit updates shared library AND all consumer apps simultaneously!)
```

### Key Enterprise Advantages:
1. **Atomic Refactoring:** Renaming an API or updating a shared UI component updates all consumers in a single PR with instant type-checking.
2. **Single Dependency Tree:** One `package.json` lockfile eliminates dependency drift (e.g. apps running conflicting versions of RxJS or Angular).
3. **Smart CI Execution:** Computation caching and affected graph analysis prevent testing or building unaffected applications.

---

## 2. Nx Library Taxonomy & Architecture

### Q2: Explain the recommended Nx Library Taxonomy: `feature`, `ui`, `data-access`, and `util`.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[Taxonomy]` `[Design]`

**Answer:**
To prevent code sprawl and spaghetti imports, Nx categorizes libraries into 4 standardized architectural tiers:

```text
         [ Applications (apps/) ]
                    │
                    ▼
         [ Feature Libraries ]  (Smart/routed views)
           ├── imports ──► [ UI Libraries ] (Dumb/presentational)
           ├── imports ──► [ Data-Access Libraries ] (Services, stores, API)
           └── imports ──► [ Util Libraries ] (Pure functions, helpers)
```

| Library Type | Responsibility | Can Import From | Cannot Import From |
|---|---|---|---|
| **`feature`** | Smart containers, route endpoints, orchestrates state & UI | `ui`, `data-access`, `util` | Other apps |
| **`ui`** | Presentational/dumb components, design system buttons, cards | `util` | `feature`, `data-access` |
| **`data-access`**| Services, SignalStores, HTTP clients, backend models | `util` | `feature`, `ui` |
| **`util`** | Pure helper functions, formatting, date utilities, validators | Only other `util` | `feature`, `ui`, `data-access` |

---

## 3. Module Boundary Enforcement & Tagging

### Q3: How do you enforce architectural boundaries and prevent illegal cross-domain imports in an Nx Monorepo?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Linting]` `[Boundaries]`

**Answer:**
Nx uses the `@nx/enforce-module-boundaries` ESLint rule combined with project **tags** defined in each project's `project.json`.

#### 1. Define Tags in `project.json`:
```json
// libs/checkout/feature-payment/project.json
{
  "name": "checkout-feature-payment",
  "tags": ["scope:checkout", "type:feature"]
}

// libs/admin/data-access-users/project.json
{
  "name": "admin-data-access-users",
  "tags": ["scope:admin", "type:data-access"]
}
```

#### 2. Configure Boundary Rules in `.eslintrc.json`:
```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "allow": [],
        "depConstraints": [
          {
            "sourceTag": "scope:checkout",
            "onlyDependOnLibsWithTags": ["scope:checkout", "scope:shared"]
          },
          {
            "sourceTag": "scope:admin",
            "onlyDependOnLibsWithTags": ["scope:admin", "scope:shared"]
          },
          {
            "sourceTag": "type:ui",
            "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
          },
          {
            "sourceTag": "type:data-access",
            "onlyDependOnLibsWithTags": ["type:data-access", "type:util"]
          }
        ]
      }
    ]
  }
}
```
If a developer in `checkout` attempts to import from `admin`, or a `ui` library tries to import a `data-access` service, **the linter fails instantly in their IDE and in CI!**

---

## 4. Nx Computation Caching & Task Graph

### Q4: How does Nx Computation Caching work, and what makes a task cacheable?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Caching]` `[CI]`

**Answer:**
Nx calculates a unique **computation hash** for every task (e.g. `nx test customer-portal`) based on:
1. Source code files of the project and its dependencies.
2. Global configuration (`tsconfig.json`, `nx.json`).
3. External dependency versions in `package.json`.
4. CLI command flags.

```text
[ Developer / CI runs: nx build admin ]
                 │
      [ Compute Hash: e7f1a9... ]
                 │
       Is hash in cache?
        ├── YES: Replay recorded terminal output and restore build artifacts instantly (< 50ms)!
        └── NO:  Execute actual build, save output & logs into cache for future runs.
```

- **Local Cache:** Stored in `.nx/cache` on the developer's machine.
- **Distributed Cache (Nx Cloud):** Shared across the entire engineering team and CI pipeline. If CI already built a commit, the developer's machine downloads the result instantly.

---

## 5. `nx affected` in Enterprise CI/CD

### Q5: How does `nx affected` optimize enterprise CI/CD execution time?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[nxAffected]` `[DevOps]`

**Answer:**
In a monorepo with 50 applications and 300 libraries, running unit tests and builds across everything on every PR is unfeasible.

`nx affected` inspects the Git history (e.g. diff between current PR branch and `main`), constructs the project dependency graph, and executes tasks **only on projects directly changed or impacted downstream**:

```bash
# Test ONLY projects affected by changes in this PR
nx affected -t test --base=origin/main --head=HEAD

# Build ONLY affected apps
nx affected -t build --base=origin/main --head=HEAD --parallel=3
```

```text
PR Changes: libs/shared/auth (Modified)
     │
     ├── Affected: apps/customer-portal (Depends on auth -> REBUILD & TEST)
     ├── Affected: apps/admin-portal    (Depends on auth -> REBUILD & TEST)
     └── NOT Affected: apps/marketing-site (Does NOT depend on auth -> SKIPPED!)
```

---

## 6. 🎯 Monorepo Traps & Senior Scenarios

### Q6: 🐛 Bug: Circular Dependency and Deep Imports (`../../libs/...`). How to fix?
**Answer:**
#### 1. Deep Imports Trap:
```typescript
// ❌ WRONG: Relative deep import breaches library encapsulation
import { UserCardComponent } from '../../../../libs/shared/ui/src/lib/user-card/user-card.component';
```
*Why it's toxic:* Bypasses the library's public API, breaks tree-shaking, and tightly couples internals.  
*Fix:* Always import through TypeScript path aliases defined in `tsconfig.base.json`:
```typescript
// ✅ CORRECT: Public entry point
import { UserCardComponent } from '@my-org/shared/ui';
```

#### 2. Circular Dependencies:
Occurs when Lib A imports Lib B, and Lib B imports Lib A.  
*Fix:*
1. Run `nx graph` to visualize the cycle.
2. Extract the shared interface, model, or utility into a lower-tier `util` or `data-access` library that both A and B can safely import.
