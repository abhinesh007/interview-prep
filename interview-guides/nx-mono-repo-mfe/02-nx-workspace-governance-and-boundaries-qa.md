# 02 — Workspace Governance, Module Boundaries & Architecture Enforcement

> Application vs Library Taxonomy, The 4-Tier Library System (`feature`, `ui`, `data-access`, `util`), Project Tags, `@nx/enforce-module-boundaries` ESLint Rule, Circular Dependency Detection, and Custom Generators & Executors.

---

## 📑 Table of Contents
1. [Enterprise Application & Library Taxonomy](#1-enterprise-application--library-taxonomy)
2. [Module Boundaries & ESLint Architecture Rules](#2-module-boundaries--eslint-architecture-rules)
3. [Circular Dependencies & Barrel Export Traps](#3-circular-dependencies--barrel-export-traps)
4. [Custom Nx Generators & Workspace Automation](#4-custom-nx-generators--workspace-automation)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Enterprise Application & Library Taxonomy

### Q1: What is the recommended App vs Lib relationship in an Nx monorepo, and why should applications contain almost no business logic?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Architecture]` `[Taxonomy]`

**Answer:**
In an enterprise Nx monorepo, **Applications should be thin deployment containers (<100 lines of code)**, while **Libraries contain 100% of the business logic, state, components, and routing**.

```text
TRADITIONAL MONOLITHIC APP:
apps/store-app/
├── components/ (50 components)
├── services/   (20 API clients)
├── state/      (Global store)
└── pages/      (All routes)
[Problem: Impossible to share with other apps, build caching cannot isolate modules]

NX THIN APP ARCHITECTURE:
apps/shell-host/
├── src/main.ts       (Bootstrap root)
├── src/routes.ts     (Maps to libs/checkout/feature, libs/catalog/feature)
└── project.json
libs/
├── checkout/feature  (Smart container, checkout form)
├── checkout/data-acc (Stripe API, Cart state)
├── catalog/feature   (Product grid, pagination)
└── shared/ui-kit     (Buttons, Modal, Inputs)
[Benefit: Fine-grained caching, strict boundary enforcement, high reusability]
```

Why applications must remain thin:
1. **Reusability Across Targets:** An Angular or React feature component housed in a library can be mounted by a desktop shell, an SSR Node.js server, a Mobile container (Capacitor/React Native), or exposed as a Micro-Frontend remote without copying code.
2. **Fine-Grained Computation Caching:** When code lives inside an application, any edit invalidates the entire app's build cache. When code is decomposed into libraries, modifying `libs/checkout/data-access` leaves `libs/catalog/feature` cached.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What should actually live inside an application's `src/` directory?"  
*Senior Answer:* Strictly the bootstrapping entrypoint (`main.ts`, `bootstrap.ts`), the root layout shell (`app.component.ts` or `App.tsx`), high-level root routing that lazy-loads library features, and deployment environment injection (`app.config.ts`, `environment.prod.ts`). Zero business calculations or UI presentation.

---

### Q2: Explain the standard 4-Tier Library Taxonomy (`feature`, `ui`, `data-access`, `util`).
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Taxonomy]` `[Governance]`

**Answer:**
Nx formalizes library design into four distinct architectural layers to prevent spaghetti code and guarantee predictable dependency graphs:

| Library Type | Purpose | Dependencies Allowed | Example Contents |
|---|---|---|---|
| 📱 **`feature`** | Smart/container components, page orchestration, routing | `ui`, `data-access`, `util` | `checkout-page.component.ts`, routing tables |
| 🎨 **`ui`** | Dumb/presentational components, zero business logic | `ui`, `util` | `data-table.component.tsx`, `modal.component.ts` |
| 🗄️ **`data-access`** | State management, HTTP clients, API contracts, DTOs | `data-access`, `util` | `cart.store.ts`, `order.service.ts`, Zod schemas |
| 🛠️ **`util`** | Pure helper functions, string formatters, mathematical algorithms | `util` only | `currency-formatter.ts`, `date-utils.ts` |

```text
               ┌─────────────────────┐
               │    App / Remote     │
               └──────────┬──────────┘
                          │ imports
                          ▼
               ┌─────────────────────┐
               │   feature library   │
               └────┬───────────┬────┘
        imports     │           │     imports
        ┌───────────┘           └───────────┐
        ▼                                   ▼
┌──────────────┐                     ┌──────────────┐
│  ui library  │                     │ data-access  │
└───────┬──────┘                     └──────┬───────┘
        │ imports                           │ imports
        └───────────────┬───────────────────┘
                        ▼
               ┌─────────────────────┐
               │    util library     │
               └─────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can a `ui` library import a `data-access` library?"  
*Senior Answer:* **Strictly No.** Presentational UI components must remain completely decoupled from specific data sources, stores, or HTTP APIs. They should only receive data via Inputs/Props and emit events via Outputs/Callbacks. If a `ui` component imports an API client or store, it can no longer be reused across different apps or showcased cleanly in Storybook.

---

## 2. Module Boundaries & ESLint Architecture Rules

### Q3: How does `@nx/enforce-module-boundaries` work, and how do you configure it in `eslint.config.js`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[ESLint]` `[Module-Boundaries]` `[Governance]`

**Answer:**
The `@nx/enforce-module-boundaries` rule inspects the TypeScript Abstract Syntax Tree (AST) on every `import` statement and enforces that:
1. Projects only import libraries tagged with allowable scopes and types.
2. Circular dependencies are caught at lint time.
3. Code is imported exclusively through public entrypoint barrel files (`index.ts`).

### Configuration Example (`eslint.config.js`):
```javascript
// eslint.config.js (Flat Config)
const nx = require('@nx/eslint-plugin');

module.exports = [
  ...nx.configs['flat/base'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            // Scope Constraints: Domain boundaries
            {
              sourceTag: 'scope:checkout',
              onlyDependOnLibsWithTags: ['scope:checkout', 'scope:shared'],
            },
            {
              sourceTag: 'scope:catalog',
              onlyDependOnLibsWithTags: ['scope:catalog', 'scope:shared'],
            },
            // Type Constraints: Architectural layers
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:ui', 'type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
            },
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
          ],
        },
      ],
    },
  },
];
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What stops a developer from bypassing the rule using deep relative imports like `import { CartService } from '../../../libs/checkout/src/lib/cart.service'`?"  
*Senior Answer:* The `@nx/enforce-module-boundaries` rule explicitly detects and forbids relative imports that cross project roots by default. It throws the error: `"Projects shouldn't include other projects through relative paths. Use path mappings instead."`

---

### Q4: Why must deep imports into library internals be forbidden in favor of barrel files (`index.ts`)?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Barrel-Files]` `[Encapsulation]`

**Answer:**
Each library in an Nx monorepo has an entry point—traditionally `src/index.ts`—configured in `tsconfig.base.json`:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@myorg/shared-ui": ["libs/shared/ui/src/index.ts"],
      "@myorg/checkout-data-access": ["libs/checkout/data-access/src/index.ts"]
    }
  }
}
```

Reasons deep imports are prohibited:
1. **Public API Contract (Information Hiding):** The `index.ts` file acts as the library's formal public interface. Internal private classes, test helpers, or implementation details can be refactored freely without breaking external consuming apps.
2. **Refactoring Safety:** Internal file movements within a library do not cause import paths to break across 30 consumer applications.
3. **Circular Dependency Prevention:** Direct internal imports often bypass graph dependency checks, creating hidden circular compilation knots.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the critical trade-off of barrel files regarding bundle size and tree-shaking?"  
*Senior Answer:* The **"Barrel File Pitfall"**: If `index.ts` exports 50 components, legacy bundlers might pull all 50 files into memory, slowing compilation and potentially pulling in heavy side-effectful code (like icon sets or date libraries). Modern setups mitigate this by using side-effect-free annotations (`"sideEffects": false` in `package.json`), enabling SWC/Webpack subpath exports, or using modern tree-shaking in Rspack/Vite.

---

## 3. Circular Dependencies & Barrel Export Traps

### Q5: How do circular dependencies occur across libraries, and what is the standard architectural refactoring pattern to eliminate them?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Circular-Dependencies]` `[Refactoring]`

**Answer:**
A circular dependency occurs when Library A imports Library B, while Library B directly or transitively imports Library A.

```text
CIRCULAR DEPENDENCY LOOP (Illegal DAG):
┌───────────────────────────┐
│ libs/users/data-access    │ ◄──────────┐
│ (Imports OrderInterface)  │            │
└─────────────┬─────────────┘            │
              │                          │
              ▼                          │
┌───────────────────────────┐            │
│ libs/orders/data-access   │ ───────────┘
│ (Imports UserProfile)     │
└───────────────────────────┘

REFACTORED ARCHITECTURE (Unidirectional DAG):
┌───────────────────────────┐      ┌───────────────────────────┐
│ libs/users/data-access    │      │ libs/orders/data-access   │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │                                  │
              └────────────────┬─────────────────┘
                               ▼
              ┌─────────────────────────────────┐
              │  libs/shared/domain-models      │
              │  (Contains pure interfaces)     │
              └─────────────────────────────────┘
```

### Refactoring Strategy:
1. **Extract Shared Contracts:** Create a new lightweight leaf library (`libs/shared/domain-models` or `libs/shared/contracts`).
2. Move pure TypeScript interfaces (`OrderInterface`, `UserProfile`) into the leaf library.
3. Both `users` and `orders` now import exclusively from the shared domain models library.
4. The cycle is eliminated, restoring a valid Directed Acyclic Graph.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can circular dependencies exist inside the *same* library between internal files?"  
*Senior Answer:* Yes. Internal circular dependencies between sibling files often cause runtime `undefined` errors during module evaluation because one file attempts to access a class or variable from another file before its closure has executed. Nx includes the `import/no-cycle` or `@nx/enforce-module-boundaries` check to catch intra-project cycles.

---

## 4. Custom Nx Generators & Workspace Automation

### Q6: Why do enterprise teams write Custom Nx Generators, and what is the difference between a Generator and an Executor?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Generators]` `[Executors]` `[Devkit]`

**Answer:**
- **Nx Generator (Scaffolding & Code Modification):**
  - Runs at authoring time to create or modify code in the repository.
  - Generates files, updates `project.json`, modifies `tsconfig.base.json`, and applies architectural tags automatically.
  - Examples: Creating a standardized Micro-Frontend remote with pre-configured Module Federation, Tailwind, and ESLint tags.
- **Nx Executor (Task Execution):**
  - Runs at build/test/deployment time to execute a task target on a project.
  - Examples: Compiling TypeScript with SWC, running Vitest, deploying a container to Kubernetes.

```text
┌───────────────────────┐          ┌───────────────────────┐
│     Nx Generator      │          │      Nx Executor      │
├───────────────────────┤          ├───────────────────────┤
│ • Modifies disk files │          │ • Executes target task│
│ • Runs once on demand │          │ • Runs in CI/CD pipeline│
│ • Enforces standards  │          │ • Supports caching    │
└───────────────────────┘          └───────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does the Nx Devkit `Tree` virtual file system prevent half-executed generator failures from corrupting a repository?"  
*Senior Answer:* The `@nx/devkit` API operates on an in-memory **Virtual File System Tree (`Tree`)**. When a generator runs, all file creations, deletions, and AST modifications are performed in memory. Only if the entire generator execution completes without throwing an unhandled exception does Nx commit the batch changes to the physical disk.

---

### Q7: Write a production-ready custom Nx Generator that scaffolds a new federated Angular remote with required tags and module boundaries.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Generators]` `[Devkit]` `[Angular]`

**Answer:**

```typescript
// tools/generators/mfe-remote/index.ts
import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  updateJson,
  readProjectConfiguration,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/angular/generators';

interface Schema {
  name: string;
  domain: string; // e.g. 'checkout', 'dashboard'
}

export default async function (tree: Tree, schema: Schema) {
  const remoteName = `${schema.name}-remote`;
  const projectRoot = `apps/${remoteName}`;

  // 1. Invoke standard Angular remote generator under the hood
  await applicationGenerator(tree, {
    name: remoteName,
    directory: projectRoot,
    routing: true,
    standalone: true,
    mfe: true,
    mfeType: 'remote',
    port: 4201,
  });

  // 2. Enforce strict workspace governance tags in project.json
  updateJson(tree, joinPathFragments(projectRoot, 'project.json'), (json) => {
    json.tags = [
      `scope:${schema.domain}`,
      'type:app',
      'platform:mfe-remote',
    ];
    return json;
  });

  // 3. Template custom bootstrap and error boundary wrappers
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    projectRoot,
    {
      name: schema.name,
      domain: schema.domain,
      tmpl: '', // Strips __tmpl__ suffix
    }
  );

  // 4. Format all generated files using Prettier
  await formatFiles(tree);
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How can you test custom generators automatically in CI?"  
*Senior Answer:* Using `createTreeWithEmptyWorkspace()` from `@nx/devkit/testing`. You run the generator against the virtual Tree in a Vitest or Jest unit test, assert file existence using `tree.exists('apps/test-remote/project.json')`, and assert JSON contents with `readJson()`.

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q8: 🧩 Output Prediction: Lint Failure on Module Boundary Violation
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[ESLint]` `[depConstraints]`

**Scenario:**
Consider an Nx monorepo with the following configuration in `eslint.config.js`:
- Libraries tagged with `scope:orders` can only import `scope:orders` and `scope:shared`.
- Libraries tagged with `type:ui` can only import `type:ui` and `type:util`.

A developer working on `libs/orders/ui/src/lib/order-summary.component.ts` (tagged `['scope:orders', 'type:ui']`) adds the following import:
```typescript
import { CheckoutStateService } from '@myorg/checkout/data-access';
```
Where `@myorg/checkout/data-access` is tagged `['scope:checkout', 'type:data-access']`.

**Predict the exact ESLint errors output when `nx lint orders-ui` is executed:**

**Answer:**
The command fails with **two distinct `@nx/enforce-module-boundaries` errors**:

1. **Scope Violation:**
   ```text
   A project tagged with "scope:orders" can only depend on libs tagged with "scope:orders", "scope:shared"
   (@nx/enforce-module-boundaries)
   ```
2. **Type/Layer Violation:**
   ```text
   A project tagged with "type:ui" can only depend on libs tagged with "type:ui", "type:util"
   (@nx/enforce-module-boundaries)
   ```

Both rules are evaluated independently, preventing domain leaks and architectural tier inversions.

---

### Q9: 🐛 Debug Scenario: Accidental Massive Bundle Leak via Barrel File
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Barrel-File]` `[Bundle-Size]`

**Scenario:**
A developer builds a lightweight federated remote `apps/search-remote`. They import a simple date formatting function `formatDate` from `@myorg/shared-util`.
Suddenly, the compiled bundle for `search-remote` increases by **1.4 MB**, and Webpack bundle analyzer shows that `@angular/material`, `rxjs`, and `chart.js` were bundled into the remote!
The developer checks `formatDate`:
```typescript
// libs/shared/util/src/lib/date.ts
export function formatDate(d: Date): string { return d.toISOString(); }
```
Why did importing this 1-line function pull in 1.4 MB of unrelated heavy dependencies?

**Answer:**
**Root Cause:** The barrel file `libs/shared/util/src/index.ts` was re-exporting another library or module that contained side-effectful imports!

```typescript
// libs/shared/util/src/index.ts
export * from './lib/date';
export * from './lib/chart-helpers'; // <--- Imports Chart.js!
export * from './lib/material-dialog-adapter'; // <--- Imports Angular Material!
```

Because `shared-util` was bundled as a single TypeScript path alias without subpath exports, the bundler evaluated the entire barrel file upon import. Because `chart-helpers` and `material-dialog-adapter` contained top-level side effects (or lacked `"sideEffects": false`), the bundler was unable to tree-shake them away.

**Fix:**
1. Split `libs/shared/util` into focused, granular libraries: `libs/shared/util-date`, `libs/shared/util-charts`.
2. Add `"sideEffects": false` to the library's `package.json`.
3. Configure TypeScript subpath exports so apps import directly from `@myorg/shared-util/date`.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q10: How can you enforce that no remote MFE imports another remote MFE directly at build time?
**Answer:** Tag all remotes with `type:app` or `type:remote`. In `eslint.config.js`, configure `depConstraints` such that `type:remote` can **never** import `type:remote`. Remotes must only communicate at runtime via Module Federation, never via build-time source imports.

### Q11: What is the purpose of `enforceBuildableLibDependency: true` in the module boundaries lint rule?
**Answer:** It prevents a buildable library (compiled via `tsc` or `vite build`) from importing a non-buildable library. If allowed, the buildable library's compiled output in `dist/` would contain broken or missing type references because the non-buildable library is not compiled into the output.

### Q12: How do project tags differ from TypeScript path aliases?
**Answer:** TypeScript path aliases (in `tsconfig.base.json`) only tell the TypeScript compiler *where files live on disk*. They provide zero access control. Project tags (in `project.json`) are architectural metadata used by Nx's ESLint plugin to govern *who is allowed to import whom*.

### Q13: What happens if an app imports a file from a library using a relative path like `../../libs/auth/src/lib/auth.ts` instead of the TS path alias?
**Answer:** `@nx/enforce-module-boundaries` throws an immediate lint error. Furthermore, relative imports bypass the library's barrel file and break computation caching, as Nx might fail to trace the dependency in the project graph accurately.

### Q14: Can a `data-access` library contain UI components?
**Answer:** No. A `data-access` library must contain only services, stores, HTTP clients, DTOs, and state logic. Housing UI components inside a data-access library violates single responsibility and creates circular dependencies when UI components need to be reused.
