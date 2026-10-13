# 📋 Nx Monorepo & Micro-Frontends (MFEs) Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise Nx Monorepo and Micro-Frontends (MFEs) interview Question & Answer guide in `interview-prep/nx-mono-repo-mfe`.  
> **Core Focus:** Nx Monorepo internals (Project Graph, computation caching, task pipelines, `@nx/enforce-module-boundaries`, `nx affected`, DTE), Micro-Frontends architecture (Module Federation 1.0 & 2.0, Rspack, Vite), Angular MFEs (Host/Remotes, Dynamic Federation, Zoneless, Zone.js collision traps, Hierarchical DI), React UI component libraries & polyglot interop, Node.js/NestJS backend code sharing (DTOs, Zod, OpenAPI), modern tooling (Vitest, Playwright, Tailwind v3/v4), and high-frequency production gotchas.

---

## 🎯 Design Principles & Structure

Every question in the guide adheres strictly to the repository standards documented in [CONTEXT.md](../CONTEXT.md) and [TEMPLATES.md](../TEMPLATES.md):

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation explaining under-the-hood engine mechanics. Accompanied by ASCII architecture diagrams, comparative analysis tables, and idiomatic, production-grade TypeScript/JSON code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Probing question, edge-case trap, runtime disaster, or architectural failure scenario]"  
*Senior Answer:* [How a staff/principal engineer handles trade-offs, mitigates failure modes, and resolves conflicts.]
```

### Five Mandatory Question Archetypes:
- 📖 **Conceptual & Deep-Dive:** Project graph topological resolution, computation hashing algorithms, Module Federation container interfaces (`init`, `get`), shared singleton negotiation mechanics, zone-patching collisions.
- 💻 **Practical Coding & Refactoring:** Dynamic remote loading via `loadRemoteModule`, custom Angular adapter directive for React root lifecycle management, custom Nx generators and executors, ESLint module boundary tagging, cross-MFE event buses.
- 🧩 **Output & Behavior Prediction:** Execution order of federated chunk initialization, version resolution fallback behavior with `strictVersion: true` vs `false`, cache hit/miss evaluation with custom task inputs, routing history stack synchronization.
- 🐛 **Debug & Bug Hunting:** Resolving `"Multiple instances of React detected / Invalid hook call"`, debugging `"Uncaught Error: Shared module is not available for eager consumption"`, fixing multi-zone change detection deadlocks in Angular remotes, repairing memory leaks on remote component unmounting.
- 🏗️ **System Design & Architecture:** Designing enterprise-scale polyglot MFEs with Angular host and React remotes using the **RADIO Framework**, implementing dynamic remote manifests for blue-green canary deployments, architecting fullstack type-safe contracts with NestJS and Zod.

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|:---:|:---|:---|:---:|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation, Master Index, Difficulty Matrix & Learning Tracks | Index |
| `01` | [`01-nx-monorepo-core-and-architecture-qa.md`](01-nx-monorepo-core-and-architecture-qa.md) | Nx Architecture, Project Graph, Computation Hashing & Local/Remote Caching | 18–22 |
| `02` | [`02-nx-workspace-governance-and-boundaries-qa.md`](02-nx-workspace-governance-and-boundaries-qa.md) | Tags, `@nx/enforce-module-boundaries`, App/Lib Taxonomy, Circular Dependencies & Custom Generators | 18–22 |
| `03` | [`03-nx-cicd-affected-and-release-management-qa.md`](03-nx-cicd-affected-and-release-management-qa.md) | `nx affected`, Distributed Task Execution (DTE), Nx Cloud, Versioning & `nx release` | 16–20 |
| `04` | [`04-micro-frontends-architecture-and-module-federation-core-qa.md`](04-micro-frontends-architecture-and-module-federation-core-qa.md) | MFE Paradigms (Iframes, Single-SPA vs Module Federation), `remoteEntry.js` Internals & Container API | 18–22 |
| `05` | [`05-module-federation-2-and-modern-bundlers-qa.md`](05-module-federation-2-and-modern-bundlers-qa.md) | Module Federation 2.0 (`@module-federation/enhanced`), Federated Types, Rspack & Vite in Nx | 16–20 |
| `06` | [`06-angular-host-and-remotes-architecture-qa.md`](06-angular-host-and-remotes-architecture-qa.md) | Angular Host Setup (`@nx/angular:host`), Dynamic Federation (`loadRemoteModule`), Standalone Components & Manifests | 18–22 |
| `07` | [`07-angular-runtime-gotchas-zoneless-and-di-qa.md`](07-angular-runtime-gotchas-zoneless-and-di-qa.md) | Zone.js Collision Traps, Zoneless Angular MFEs, Hierarchical DI Across Remotes & SSR Hydration | 18–22 |
| `08` | [`08-react-ui-libraries-and-polyglot-mfe-interop-qa.md`](08-react-ui-libraries-and-polyglot-mfe-interop-qa.md) | Cross-Framework Integration (React in Angular Host), Web Components, Buildable Design System Libs & Storybook | 18–22 |
| `09` | [`09-cross-mfe-communication-state-and-routing-sync-qa.md`](09-cross-mfe-communication-state-and-routing-sync-qa.md) | Decoupled State Topology, Global Store Anti-Pattern, Browser Event Bus, Routing Sync & Deep Linking | 18–22 |
| `10` | [`10-design-systems-styling-and-css-isolation-qa.md`](10-design-systems-styling-and-css-isolation-qa.md) | CSS Isolation (Shadow DOM vs CSS Modules), Tailwind CSS v3/v4 in Nx Monorepos, Token Sharing & Overlay Portals | 16–20 |
| `11` | [`11-nodejs-nestjs-and-fullstack-monorepo-qa.md`](11-nodejs-nestjs-and-fullstack-monorepo-qa.md) | Node.js & NestJS Apps in Nx, Shared DTOs/Zod Schemas, Prisma/Drizzle ORM & E2E Type-Safe Contracts | 16–20 |
| `12` | [`12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md`](12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md) | Federation `shared` Config (`singleton`, `strictVersion`, `requiredVersion`, `eager`), React Dispatcher & Angular Crashes | 18–22 |
| `13` | [`13-resilience-fault-tolerance-and-offline-fallbacks-qa.md`](13-resilience-fault-tolerance-and-offline-fallbacks-qa.md) | Remote Failure Handling (404s, CDN Drops), Error Boundaries, Circuit Breakers, Retry Logic & Offline Caching | 16–20 |
| `14` | [`14-security-authentication-and-multi-tenant-mfe-qa.md`](14-security-authentication-and-multi-tenant-mfe-qa.md) | Cross-MFE Auth (OAuth2/OIDC, PKCE), Token Propagation (`HttpOnly` vs In-Memory), CSP Nonces & Multi-Tenant Routing | 16–20 |
| `15` | [`15-testing-strategies-and-local-dx-orchestration-qa.md`](15-testing-strategies-and-local-dx-orchestration-qa.md) | Testing Federated MFEs (Vitest/Jest Isolated Mocks, Playwright E2E), Nx Dev vs Static Remotes & Proxying | 16–20 |
| `16` | [`16-enterprise-system-design-case-studies-and-migration-qa.md`](16-enterprise-system-design-case-studies-and-migration-qa.md) | Senior Architecture Case Studies: Multi-Framework E-Commerce, SaaS Suite & Monolith-to-MFE Strangler Fig (RADIO) | 12–15 |

---

## 📑 Detailed Section Specifications

---

### 📄 `01-nx-monorepo-core-and-architecture-qa.md` — Nx Architecture, Project Graph & Computation Caching
1. **Core Philosophy & Architectural Paradigms:**
   - Monorepo vs Polyrepo vs Modular Monolith: Real trade-offs in cognitive load, dependency hell, deployment velocity, and team autonomy.
   - Package-Based vs Integrated vs Standalone repository structures: When to use root dependencies (`single-version-policy`) vs independent `package.json` files per library.
   - Nx Architecture anatomy: The Nx Daemon (`nx daemon`), Project Graph daemon worker, Workspace root configuration (`nx.json`), and project-level configuration (`project.json`).
2. **Project Graph Internals & Calculation:**
   - How Nx constructs the Directed Acyclic Graph (DAG): Static AST analysis using TypeScript compiler API, package dependencies, and explicit implicit dependencies (`implicitDependencies`).
   - Visualizing and inspecting the graph: `nx graph`, JSON export, filtering subgraphs (`nx graph --focus=shell`).
   - Target Dependencies (`dependsOn`): Task pipeline modeling (`build` depends on `^build`, `test` depends on `build`).
3. **Computation Hashing & Caching Mechanics:**
   - The Hashing Algorithm: How Nx computes cache keys: Source code files hash (`namedInputs`, `fileset`), runtime inputs (`runtime: node -v`), environment variables (`env: NODE_ENV`), external dependency versions from lockfile, and target configuration.
   - Cache storage: Local cache (`.nx/cache`) vs Distributed Remote Cache (Nx Cloud, self-hosted S3/GCS cache).
   - Cache invalidation and troubleshooting: Cache miss forensics (`nx run app:build --verbose`), cache poisoning dangers, and cache bypass (`--skip-nx-cache`).
4. **Comparative Analysis Matrix:**
   | Feature | Nx Monorepo | Turborepo | Lerna (Legacy) | pnpm Workspaces alone |
   |:---|:---|:---|:---|:---|
   | **Graph Resolution** | AST + TypeScript + Plugins | Package.json only | Package.json only | Package.json only |
   | **Computation Caching** | Fine-grained (file/env/config) | File hash + env | Basic caching (via Nx) | None (install-only) |
   | **Task Orchestration** | Topological + Distributed (DTE)| Topological local | Sequential / parallel | Sequential / parallel |
   | **MFE & Tooling Plugins**| Native Angular, React, NestJS | Agnostic / minimal | Minimal | None |
   | **Module Boundaries** | AST ESLint Rules (`scope/type`)| None built-in | None | None |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting cache hit vs cache miss when an untracked README file is edited vs a source file with strict `namedInputs`.
   - 🐛 Debug: Debugging a catastrophic stale build where Nx serves old code despite local changes due to an improper `outputs` directory definition in `project.json`.
6. **🎯 Quick-Fire & Trap Questions:**
   - What happens under the hood when `nx reset` is executed?
   - Why is `namedInputs` preferable to hashing the entire project folder?
   - How does Nx differentiate between a task execution cache hit and a terminal replay?

---

### 📄 `02-nx-workspace-governance-and-boundaries-qa.md` — Tags, Module Boundaries & Workspace Governance
1. **Application & Library Taxonomy:**
   - Enterprise App/Lib Architecture: Why applications should be thin entry shells (<100 lines of code) and libraries should hold all business logic.
   - The 4-Tier Library Classification:
     - 📱 `feature`: Smart components, routing, use-case flows.
     - 🎨 `ui`: Dumb/presentational components, pure design system elements.
     - 🗄️ `data-access`: State stores, HTTP services, API clients, DTOs.
     - 🛠️ `util`: Pure functions, helper types, validators.
2. **ESLint Boundary Enforcement (`@nx/enforce-module-boundaries`):**
   - Project tagging strategy: `scope:*` (domain boundaries like `scope:checkout`, `scope:auth`, `scope:shared`) and `type:*` (architectural layer like `type:feature`, `type:ui`, `type:data-access`, `type:util`).
   - Configuring `depConstraints` in `.eslintrc.json` / `eslint.config.js`: Preventing `type:ui` from importing `type:data-access`, or `scope:orders` from importing `scope:checkout`.
   - Banning deep relative imports (`../../libs/shared/src/lib/foo.ts`) and enforcing Barrel file public API contracts (`index.ts`).
3. **Circular Dependencies & Architectural Leaks:**
   - Detecting circular dependencies via graph cycle analysis.
   - Refactoring cyclic dependencies: Extracting shared models to `data-access` or `util` libraries.
   - Enforcing unidirectional data flow across monorepo boundaries.
4. **Nx Extensibility: Custom Generators & Executors:**
   - Why enterprise teams write custom Nx Generators: Automating micro-frontend scaffolding, design system component creation, and lint compliance.
   - Tree abstraction and AST transformations with `@nx/devkit`: `generateFiles`, `updateJson`, `formatFiles`.
   - Custom Executors: Wrapping custom build tools, Docker build scripts, or deployment pipelines into `nx:run-commands` or custom TypeScript executors.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting ESLint error messages when a `type:ui` component imports a `type:feature` smart container across scopes.
   - 🐛 Debug: Resolving an illegal barrel export leak where importing a utility function accidentally pulls the entire NgRx/Redux store into a lightweight remote chunk.
6. **🎯 Quick-Fire & Trap Questions:**
   - How do project tags differ from TypeScript path aliases in `tsconfig.base.json`?
   - What is the performance cost of large barrel files (`index.ts`) in an Nx monorepo and how does modern bundling mitigate it?
   - How can you enforce that no remote MFE imports another remote MFE directly at build time?

---

### 📄 `03-nx-cicd-affected-and-release-management-qa.md` — CI/CD, Affected Analysis & Release Automation
1. **`nx affected` Command Mechanics:**
   - Git diffing algorithm: How Nx calculates affected projects (`git merge-base`, `--base=origin/main`, `--head=HEAD`).
   - The commands: `nx affected:lint`, `nx affected:test`, `nx affected:build`, `nx affected:e2e`.
   - Corner cases: What happens when `package.json`, `nx.json`, or root lockfiles change? (Triggering full workspace rebuild vs selective hashing).
2. **CI Pipeline Optimization & Distributed Task Execution (DTE):**
   - Traditional matrix builds vs Nx Distributed Task Execution (DTE).
   - How Nx Cloud orchestrates task distribution across ephemeral agent workers: Dynamically assigning tasks based on historical runtimes to eliminate idle worker time.
   - Flaky task detection and automatic retries in CI.
3. **Release Management & Versioning Strategies:**
   - Single Version Policy vs Multi-Package Versioning: Trade-offs when publishing npm libraries vs deploying independent micro-frontend apps.
   - Nx Release (`nx release`): Automating version bumping, changelog generation from conventional commits, and artifact publishing.
   - Continuous Deployment for MFEs: Why independent MFE deployments require decoupling app release pipelines from monorepo commit tags.
4. **Comparative Analysis Matrix:**
   | Strategy | Pipeline Execution Time | Setup Complexity | Cost / Worker Efficiency | Fault Isolation |
   |:---|:---|:---|:---|:---|
   | **Sequential CI** | 🔴 Extremely slow ($O(N)$) | 🟢 Trivial | 🔴 Very wasteful | 🔴 Single point of failure |
   | **Naive Matrix CI** | 🟡 Moderate (static splits) | 🟡 Medium | 🟡 Idle worker bottlenecks | 🟡 Partial |
   | **Nx Affected CI** | 🟢 Fast (skips unchanged) | 🟡 Medium | 🟢 High efficiency | 🟢 High |
   | **Nx DTE (Nx Cloud)** | 🟣 Blazing (dynamic pack) | 🔴 Requires Cloud setup | 🟣 Optimal worker packing | 🟣 Complete |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting which projects are marked "affected" given a git diff that touches only a shared utility library consumed by 2 out of 5 MFEs.
   - 🐛 Debug: Troubleshooting CI failure where `nx affected` fails to detect changes due to a shallow git clone (`fetch-depth: 1` in GitHub Actions).
6. **🎯 Quick-Fire & Trap Questions:**
   - Why does `fetch-depth: 0` matter in GitHub Actions for Nx affected commands?
   - How do you prevent cache poisoning in a shared remote cache when running untrusted PR builds?
   - How does `nx release` handle updating inter-package dependency version ranges across publishable libraries?

---

### 📄 `04-micro-frontends-architecture-and-module-federation-core-qa.md` — MFE Architecture & Module Federation Internals
1. **Micro-Frontends Architectural Foundations:**
   - Why Micro-Frontends? Autonomous deployability, team ownership, technology isolation, and progressive migration.
   - Composition Patterns:
     - Build-time composition (npm packages): The "False Micro-Frontend" trap — why version bumping requires rebuilding the entire shell.
     - Server-side composition (Edge SSI, ESI, Tailor, Podlet).
     - Client-side runtime composition: Iframes (security vs UX penalties), Single-SPA (in-browser dynamic script tags), and Module Federation.
2. **Webpack Module Federation Internals Under the Hood:**
   - The Container Architecture:
     ```text
     ┌────────────────────────────────────────────────────────┐
     │                      Host Shell                        │
     │  ┌────────────────┐         ┌────────────────────────┐ │
     │  │  Host Runtime  │ ──────► │ Shared Scope Singleton │ │
     │  └────────┬───────┘         └───────────▲────────────┘ │
     └───────────┼─────────────────────────────┼──────────────┘
                 │ Dynamic fetch               │ Negotiate
                 ▼                             │
     ┌─────────────────────────────────────────┴──────────────┐
     │                 Remote Entry Script                    │
     │               (remoteEntry.js container)               │
     │  ┌──────────────────────────────────────────────────┐  │
     │  │ container.init(sharedScope)                      │  │
     │  │ container.get('./Module') ──► Promise<Factory>   │  │
     │  └──────────────────────────────────────────────────┘  │
     └────────────────────────────────────────────────────────┘
     ```
   - What is inside `remoteEntry.js`: The global container object (`window.remoteApp`), manifest mapping exposed module paths to asynchronous chunk file IDs.
   - The Two-Phase Container Handshake:
     1. `container.init(__webpack_share_scopes__.default)`: Host passes its shared dependency registry to the remote.
     2. `const factory = await container.get('./Module')`: Remote returns a module factory returning the instantiated export (`const module = factory()`).
3. **Chunk Loading & Asynchronous Boundary (`bootstrap.ts`):**
   - The `"Shared module is not available for eager consumption"` error: Why Module Federation requires an asynchronous import boundary (`import('./bootstrap')` inside `main.ts`).
   - How Webpack's initialization chunk resolves shared singletons before application execution begins.
4. **Comparative Analysis Matrix:**
   | MFE Approach | Independent Deploy | Shared Memory / State | Performance / Bundle Size | Style / DOM Isolation | Cross-Framework |
   |:---|:---|:---|:---|:---|:---|
   | **Iframes** | 🟢 Full | 🔴 Impossible (postMessage) | 🔴 Worst (duplicate DOM/libs) | 🟢 Perfect sandbox | 🟢 Universal |
   | **Single-SPA** | 🟢 Full | 🟡 Manual (SystemJS) | 🟡 Moderate (duplicate risks)| 🟡 Manual / Shadow DOM | 🟢 Native |
   | **Module Federation**| 🟢 Full | 🟢 Native (Shared Scope) | 🟢 Best (deduped singletons) | 🟡 Requires discipline| 🟢 Native |
   | **Web Components** | 🟢 Full | 🟡 Manual event bus | 🟡 Moderate | 🟢 Shadow DOM native | 🟢 Universal |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting network request sequence (HTML → host chunk → `remoteEntry.js` → shared React/Angular chunk → exposed component chunk).
   - 🐛 Debug: Debugging an app crash where a developer removed the asynchronous `import('./bootstrap')` boundary in `main.ts` causing eager consumption runtime panic.
6. **🎯 Quick-Fire & Trap Questions:**
   - What is the exact difference between `remotes` and `exposes` in `module-federation.config.js`?
   - Can an application simultaneously act as both a Host and a Remote (Bi-directional Federation)?
   - Why does Webpack assign chunk IDs as hashes and how does it prevent chunk collision between remotes?

---

### 📄 `05-module-federation-2-and-modern-bundlers-qa.md` — Module Federation 2.0, Rspack & Modern Bundlers
1. **Module Federation 2.0 Revolution (`@module-federation/enhanced`):**
   - Limitations of Webpack Module Federation 1.0: Fragile runtime errors, manual type sharing, lack of extensible lifecycle hooks, and build-time slowdowns.
   - What Module Federation 2.0 introduces:
     - **Federated Types (`@module-federation/dts-plugin`):** Automatic generation and compilation of `.d.ts` bundles from remotes, dynamically consumed by the host during build and development.
     - **Runtime Plugin System:** Extensible lifecycle hooks (`beforeInit`, `beforeRequest`, `afterResolve`, `onLoad`, `errorLoadRemote`).
     - **Dynamic Manifest Discovery:** Native manifest support (`mf-manifest.json`) replacing hardcoded script URLs.
2. **Rspack in Nx Monorepo (`@nx/rspack`):**
   - Why Rspack: Rust-based performance (5–10x faster builds and HMR) with 99% Webpack API compatibility.
   - Configuring `@module-federation/enhanced/rspack` in an Nx workspace.
   - Handling loader transformations (SWC vs Babel, PostCSS, CSS Modules) in Rspack for federated remotes.
3. **Vite Module Federation in Nx:**
   - How Vite approaches federation: `@originjs/vite-plugin-federation` vs Native ESM federation.
   - Vite in development (native ESM / esbuild) vs Vite in production (Rollup bundling): Why Module Federation in Vite behaves differently in dev vs prod.
   - Interoperability between Vite Remotes and Webpack/Rspack Hosts.
4. **Comparative Analysis Matrix:**
   | Bundler / Engine | Build Speed | HMR Speed | Module Federation Support | TypeScript Type Sync | Nx Plugin Support |
   |:---|:---|:---|:---|:---|:---|
   | **Webpack 5** | 🔴 Slow on large repos | 🟡 1–3s | 🟢 Mature (MF 1.0 & 2.0) | 🟡 Manual / third-party | 🟢 `@nx/webpack` |
   | **Rspack** | 🟣 Blazing (Rust) | 🟣 <100ms | 🟣 Native (MF 2.0 Enhanced) | 🟣 Native (`dts-plugin`) | 🟢 `@nx/rspack` |
   | **Vite** | 🟢 Very fast | 🟣 <50ms | 🟡 Plugin-based (Rollup dev/prod gap) | 🟡 Partial | 🟢 `@nx/vite` |
   | **esbuild** | 🟣 Instant (Go) | 🟣 Instant | 🔴 No native shared scope federation | 🔴 None | 🟢 `@nx/esbuild` |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting TypeScript compiler feedback when consuming an un-typed remote module before vs after configuring Federated Types.
   - 🐛 Debug: Debugging a Vite remote failing to load in a Webpack host due to mismatching Top-Level Await or SystemJS module format expectations.
6. **🎯 Quick-Fire & Trap Questions:**
   - How does the `@module-federation/dts-plugin` download remote types in a decoupled CI/CD environment?
   - What lifecycle hook in MF 2.0 runtime allows you to inject an authorization bearer token before requesting a remote chunk?
   - Why did Vite struggle historically with Module Federation during development mode?

---

### 📄 `06-angular-host-and-remotes-architecture-qa.md` — Angular Host & Remotes Architecture
1. **Angular Monorepo MFE Setup with Nx:**
   - Generating an Angular Host shell: `nx g @nx/angular:host shell --remotes=dashboard,checkout`.
   - Generating Remotes: Standalone components vs NgModule remotes (`--standalone`).
   - Understanding `module-federation.config.ts`: Exposing routes and components (`exposes: { './Routes': './src/app/remote-entry/entry.routes.ts' }`).
2. **Dynamic Federation & Manifest-Driven Routing:**
   - Static Federation vs Dynamic Federation: Why hardcoding remote URLs in `module-federation.config.ts` fails in multi-environment deployments (Dev, Staging, Prod).
   - Dynamic remote loading using Angular Router and `loadRemoteModule`:
     ```typescript
     export const APP_ROUTES: Routes = [
       {
         path: 'dashboard',
         loadChildren: () =>
           loadRemoteModule({
             type: 'manifest',
             remoteName: 'dashboard',
             exposedModule: './Routes',
           }).then((m) => m.DASHBOARD_ROUTES),
       },
     ];
     ```
   - Manifest configuration (`assets/module-federation.manifest.json`): Mapping remote names to environment-specific URLs dynamically loaded at bootstrap via `initFederation()`.
3. **Angular Standalone Components in MFEs:**
   - Why Standalone Components revolutionized Angular MFEs: Eliminating cumbersome `NgModule` containers and boilerplate wrappers.
   - Bootstrapping a Remote in standalone mode for isolated local execution (`bootstrapApplication`) vs exposing a pure routed component tree for Host consumption.
4. **Comparative Analysis Matrix:**
   | Federation Strategy | URL Configuration | Deployment Flexibility | Fallback Handling | Build-Time Coupling |
   |:---|:---|:---|:---|:---|
   | **Static Federation** | Hardcoded at build time | 🔴 Rebuild needed per env | 🔴 Hard crash on 404 | 🟡 Fixed host config |
   | **Dynamic Manifest** | Loaded at runtime via JSON | 🟢 Zero rebuilds across envs | 🟢 High (manifest swap) | 🟢 Fully decoupled |
   | **Service Discovery API**| Dynamic API call at runtime | 🟣 Dynamic canary/A/B routing | 🟣 Dynamic fallback routing | 🟢 Dynamic |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting route activation order when navigating to a federated route with Route Guards (`CanActivate`) defined on the Host vs the Remote.
   - 🐛 Debug: Debugging an Angular Remote failing with `"No provider for Router!"` when instantiated as a standalone component without importing `provideRouter` in the Host scope.
6. **🎯 Quick-Fire & Trap Questions:**
   - How does Angular's `loadRemoteModule` utility interact with the browser's native module cache?
   - How can you implement an Angular Route Guard that verifies remote availability before allowing navigation?
   - What is the difference between exposing an entire routing table (`./Routes`) vs a single component (`./Component`)?

---

### 📄 `07-angular-runtime-gotchas-zoneless-and-di-qa.md` — Zone.js, Zoneless Angular & Hierarchical DI Traps
1. **Zone.js Pitfalls & Collision Traps in MFEs:**
   - The Global Monkey-Patching Dilemma: How `zone.js` mutates browser async primitives globally (`setTimeout`, `Promise`, `addEventListener`).
   - The Multi-Zone Collision: What happens when Host and Remote both load `zone.js`: Duplicate zone executions, infinite change detection loops, or missed ticks.
   - Running Remotes inside the Host Zone: Ensuring `zone.js` is marked as a strict singleton (`singleton: true, strictVersion: true, requiredVersion: 'auto'`) and loaded exclusively by the Host shell.
2. **Zoneless Angular (Signals) in Micro-Frontends:**
   - Why Zoneless Angular (`provideExperimentalZonelessChangeDetection()`) is the ultimate solution for Angular MFEs.
   - Eliminating the `zone.js` singleton requirement: Allowing an Angular Zoneless Remote to run seamlessly inside a Host without Zone conflicts.
   - Signal reactivity across remotes: Using Angular Signals (`signal`, `computed`, `effect`) for localized, fine-grained DOM updates without triggering full component tree traversal.
3. **Hierarchical Dependency Injection (DI) Across Federation Boundaries:**
   - How DI injectors resolve services across federated boundaries:
     - Environment Injectors: The Host's root injector vs the Remote's environment injector.
     - The `providedIn: 'root'` trap: Why a service marked `providedIn: 'root'` inside a Remote can either instantiate two separate instances or overwrite the Host's singleton depending on Webpack shared scope configuration!
   - Sharing Service Singletons: How to properly share an `AuthService` or `AnalyticsService` as a shared singleton library across Host and Remotes.
4. **Angular SSR & Hydration with Module Federation:**
   - Server-Side Rendering federated remotes using Node.js and `@module-federation/node`.
   - Non-destructive hydration traps: Mismatched DOM nodes when remote chunk HTML from the server does not match client-side evaluated remotes.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting change detection execution when an asynchronous event resolves inside a federated Angular component loaded outside the Angular Zone (`NgZone.runOutsideAngular`).
   - 🐛 Debug: Debugging a duplicate singleton bug where an `AuthService` containing the user's login state is instantiated twice, causing the remote to show "Logged Out" while the host shows "Logged In".
6. **🎯 Quick-Fire & Trap Questions:**
   - Why does `provideZoneChangeDetection({ eventCoalescing: true })` improve performance in federated Angular hosts?
   - Can an Angular Zoneless Remote be loaded inside an Angular Host that still runs `Zone.js`?
   - How do injection context tokens (`InjectionToken`) behave when defined in a shared library consumed across federated remotes?

---

### 📄 `08-react-ui-libraries-and-polyglot-mfe-interop-qa.md` — React UI Libraries & Polyglot MFE Interoperability
1. **Cross-Framework Integration Architecture:**
   - The Polyglot Reality: Why enterprise acquisitions and diverse teams lead to Angular Shells hosting React Remotes (and vice versa).
   - Core technical challenges: Different rendering engines, discordant lifecycle hooks, competing event propagation models, and divergent change detection vs reconciliation.
2. **The Adapter Pattern: Mounting React in Angular:**
   - Writing an idiomatic Angular Wrapper Directive / Component to mount React:
     ```typescript
     @Component({
       selector: 'mfe-react-wrapper',
       standalone: true,
       template: '<div #reactRootContainer></div>',
     })
     export class ReactWrapperComponent implements OnInit, OnDestroy, OnChanges {
       @ViewChild('reactRootContainer', { static: true }) containerRef!: ElementRef;
       @Input() props!: Record<string, unknown>;
       private root?: ReactDOM.Root;

       async ngOnInit() {
         const { ReactComponent } = await loadRemoteModule('reactRemote', './Component');
         this.root = ReactDOM.createRoot(this.containerRef.nativeElement);
         this.root.render(React.createElement(ReactComponent, this.props));
       }

       ngOnChanges(changes: SimpleChanges) {
         if (this.root) {
           this.root.render(React.createElement(ReactComponent, this.props));
         }
       }

       ngOnDestroy() {
         this.root?.unmount(); // CRITICAL: Prevent memory leaks!
       }
     }
     ```
   - ⚠️ Crucial Gotcha: Why omitting `root.unmount()` causes massive memory leaks by retaining DOM nodes, closures, and React Fiber nodes after Angular navigates away!
3. **Web Components / Custom Elements Bridge:**
   - Packaging Angular components as Web Components via `@angular/elements` (`createCustomElement`).
   - Packaging React components as Custom Elements: Custom element wrapper libraries (`@r2wc/react-to-web-component`).
   - Shadow DOM considerations: Encapsulating styles vs penetrating design system theme tokens.
4. **React UI Component Libraries in Nx:**
   - Buildable vs Non-Buildable libraries in Nx:
     - Non-buildable (source code / tree-shakable): Consumed directly via TS path mappings, compiled by the consuming application's bundler.
     - Buildable (compiled via Vite/Rollup): Faster local caching in massive repos, publishable to internal npm registries.
   - Setting up Storybook (`@nx/storybook`) to preview shared React and Angular UI components in a unified workspace.
5. **Comparative Analysis Matrix:**
   | Integration Approach | Runtime Overhead | Prop/Event Sync | Lifecycle Cleanliness | Styling Portability |
   |:---|:---|:---|:---|:---|
   | **Adapter Wrapper Component**| 🟡 Moderate (React root) | 🟢 Natural (Inputs/Outputs) | 🟢 Direct `ngOnDestroy` unmount | 🟡 Shared or CSS modules |
   | **Web Components** | 🟡 Low-to-Moderate | 🟡 HTML attributes/events | 🟡 `disconnectedCallback` | 🟢 Shadow DOM isolation |
   | **Iframes** | 🔴 Heavy (Full page) | 🔴 `postMessage` only | 🟢 Auto destroyed with iframe | 🟢 Complete isolation |
6. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting event dispatch behavior when a React component inside an Angular host emits a synthetic event vs a native DOM event.
   - 🐛 Debug: Debugging the catastrophic React error: `"Invalid hook call. Hooks can only be called inside of the body of a function component"` caused by duplicate React instances across Angular host and React remote.
7. **🎯 Quick-Fire & Trap Questions:**
   - Why can't React 19 Server Components run directly inside a client-side Angular Module Federation host?
   - How do React Portals (`createPortal`) behave when mounted inside an Angular component container?
   - What happens to React context (`useContext`) providers when a React remote is mounted inside an Angular shell?

---

### 📄 `09-cross-mfe-communication-state-and-routing-sync-qa.md` — Communication, State Topology & Routing Sync
1. **State Topology & The Global Store Anti-Pattern:**
   - The Monolithic State Trap: Why creating a single, shared NgRx or Redux store across independent MFEs re-creates a monolithic bottleneck, tightly couples release schedules, and triggers version locks.
   - The 3-Tier State Topology:
     - 🏠 Local Component State: Internal to the MFE component (Signals, `useState`).
     - 📦 MFE Domain State: Private to the specific micro-frontend (MFE-level store / service).
     - 🌐 Global Ambient State: Minimal shared state strictly limited to User Identity, Theme, and Tenant config.
2. **Decoupled Cross-MFE Communication Patterns:**
   - Browser Custom Events (`window.dispatchEvent(new CustomEvent('CART_UPDATED', { detail: { count: 3 } }))`).
   - Type-Safe Contract Event Bus: Authoring a shared lightweight TypeScript event bus library in `libs/shared/event-bus`.
   - RxJS Subject Singletons: Exposing a typed Observable stream in a shared singleton package across Angular and React MFEs.
   - Multi-Tab & Window Sync: Using `BroadcastChannel` API and `localStorage` storage events for cross-tab session synchronization.
3. **Routing Synchronization & Deep Linking Traps:**
   - Host Router vs Remote Router: The Dual-Router Problem.
   - URL synchronization architecture:
     - The Host owns the primary URL bar and root path prefix (`/checkout/*`).
     - The Remote operates with an internal basename or sub-route routing configuration.
     - Synchronizing browser `popstate` events: Preventing back-button navigation glitches where the Remote changes internal route without updating the browser history, or vice versa.
   - Deep Linking race conditions: What happens when a user lands directly on `app.com/checkout/step-2` before the remote entry chunk has finished downloading and registering its routes.
4. **Comparative Analysis Matrix:**
   | Communication Pattern | Coupling Level | Performance | Type Safety | Framework Agnostic |
   |:---|:---|:---|:---|:---|
   | **Shared Global Store (Redux/NgRx)**| 🔴 Extremely High | 🟡 Moderate | 🟢 High | 🔴 Poor |
   | **Browser CustomEvents** | 🟢 Decoupled | 🟢 High | 🟡 Requires contract wrapper | 🟢 Universal |
   | **Shared RxJS Event Bus** | 🟡 Low | 🟢 High | 🟢 Full TypeScript safety | 🟢 Universal |
   | **URL Query Parameters** | 🟢 Fully Decoupled | 🟢 Instant / Bookmarkable | 🟡 String-only serialization | 🟢 Universal |
   | **BroadcastChannel API** | 🟢 Decoupled | 🟢 High (cross-tab) | 🟡 Contract dependent | 🟢 Universal |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting event listener trigger order across 3 remotes listening to the same custom window event.
   - 🐛 Debug: Debugging an infinite routing redirect loop caused by Host and Remote routers fighting for control over the browser URL bar.
6. **🎯 Quick-Fire & Trap Questions:**
   - Why should URL state (query params) always be favored over memory state for navigational filters?
   - How do you implement a contract-driven event bus in an Nx monorepo with zero runtime dependencies?
   - What is the "Micro-Frontend Shell Desynchronization" problem during rapid back/forward browser navigation?

---

### 📄 `10-design-systems-styling-and-css-isolation-qa.md` — Design Systems, Styling & CSS Isolation
1. **Style Leaking & Specificity Wars in MFEs:**
   - How CSS bleeding manifests: Remote A's CSS reset (`* { box-sizing: border-box; margin: 0 }`) or custom styles overriding Host layout elements or Remote B's buttons.
   - Specificity collisions: Two remotes importing conflicting versions of Bootstrap, Material, or utility classes.
2. **CSS Isolation Mechanisms:**
   - **Shadow DOM:** True native encapsulation. Benefits (impenetrable styles) vs Drawbacks (breaks global design tokens, CSS variables inheritance challenges, font loading overhead, form associations).
   - **CSS Modules & PostCSS Prefixing:** Scoping CSS class names with unique hashes or namespace prefixes (`.mfe-checkout__btn`).
   - **CSS `@scope` (Modern Native CSS):** Scoping stylesheets directly to the micro-frontend root DOM element without Shadow DOM overhead.
3. **Tailwind CSS v3 & v4 in an Nx Monorepo:**
   - Managing Tailwind across multiple MFEs: Shared Tailwind presets (`tailwind.preset.js`) in `libs/shared/ui-theme`.
   - The Tailwind Conflict Trap: Two remotes generating slightly different utility classes or competing `@tailwind base` resets.
   - Scoping Tailwind with prefixing (`prefix: 'tw-checkout-'`) or using container class wrapping (`.checkout-root { @apply ... }`).
4. **The Modal / Overlay Portal Trap:**
   - The `document.body` Escape: Why rendering modals, tooltips, and dropdowns into `document.body` (via React `createPortal` or Angular CDK Overlay) breaks scoped CSS boundaries and Shadow DOM styles.
   - Solutions: Injecting overlay container targets inside the Remote's bounded root container or configuring custom overlay container providers in Angular CDK (`OverlayContainer`).
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting visual styling outcomes when two federated remotes define identical CSS classes with different rules loaded asynchronously in different orders.
   - 🐛 Debug: Debugging an unstyled Angular Material or Ant Design modal when triggered from inside a federated remote due to missing overlay styles at the Host root.
6. **🎯 Quick-Fire & Trap Questions:**
   - How can CSS Custom Properties (CSS variables) penetrate Shadow DOM boundaries to enable unified theme switching?
   - Why is `@tailwind base` dangerous when loaded multiple times in a micro-frontend architecture?
   - How do design system token libraries (e.g., Style Dictionary) distribute tokens to both React and Angular MFEs in an Nx workspace?

---

### 📄 `11-nodejs-nestjs-and-fullstack-monorepo-qa.md` — Node.js, NestJS & Fullstack Code Sharing in Nx
1. **Fullstack Architecture in an Nx Monorepo:**
   - Co-locating Frontend MFEs with Backend Node.js Services: NestJS (`@nx/nest`), Fastify, Express.
   - The BFF Pattern (Backend-for-Frontend): Aligning each MFE with a dedicated lightweight NestJS/Fastify BFF service.
2. **End-to-End Code Sharing (The Monorepo Superpower):**
   - Sharing Data Transfer Objects (DTOs) and TypeScript interfaces between backend and frontend.
   - Shared validation schemas using Zod:
     ```typescript
     // libs/shared/contracts/src/auth.schema.ts
     import { z } from 'zod';

     export const LoginRequestSchema = z.object({
       email: z.string().email(),
       password: z.string().min(8),
     });

     export type LoginRequest = z.infer<typeof LoginRequestSchema>;
     ```
   - Consuming the same Zod schema for frontend form validation (Angular Reactive Forms / React Hook Form) and backend request payload validation (NestJS `ZodValidationPipe`).
3. **Database Layer & ORM Sharing:**
   - Managing Prisma or Drizzle ORM inside an Nx library (`libs/backend/database`).
   - Running database migrations in an Nx task pipeline (`nx run database:migrate`).
   - Preventing frontend libraries from accidentally importing backend-only database code: How `@nx/enforce-module-boundaries` blocks Node.js native modules (`fs`, `crypto`, database clients) from leaking into client-side MFE bundles.
4. **API Contracts & Fullstack Type Safety:**
   - tRPC in an Nx monorepo: End-to-end type safety without code generation between Node.js and client apps.
   - OpenAPI / Swagger auto-generation: Using NestJS Swagger plugins to generate client SDKs inside `libs/shared/api-client`.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting build errors when a frontend Angular library imports a DTO file that accidentally imports `@nestjs/common` decorators.
   - 🐛 Debug: Debugging a Webpack bundle failure where client-side compilation fails with `"Module not found: Can't resolve 'fs'"` caused by a shared contract importing server-side code.
6. **🎯 Quick-Fire & Trap Questions:**
   - How do you structure shared contract libraries so they compile cleanly without importing server-only or client-only dependencies?
   - Why is Zod often preferred over `class-validator` for shared fullstack contracts in an Nx monorepo?
   - How can you configure Nx task pipelines so frontend E2E tests automatically spin up the NestJS backend and seed a test database?

---

### 📄 `12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md` — Shared Dependencies & Version Traps
1. **Module Federation `shared` Configuration Deep-Dive:**
   - The anatomy of the `shared` configuration:
     ```javascript
     shared: {
       '@angular/core': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
       '@angular/common': { singleton: true, strictVersion: true, requiredVersion: 'auto' },
       'rxjs': { singleton: true, strictVersion: false, requiredVersion: '^7.8.0' },
       'lodash-es': { singleton: false }, // Allowed to have multiple versions
     }
     ```
   - Understanding configuration parameters:
     - `singleton: true` vs `singleton: false`: Enforcing single memory instance vs permitting multi-version duplication.
     - `strictVersion: true` vs `strictVersion: false`: Crashing on mismatch vs falling back to loading a duplicate.
     - `requiredVersion`: Specifying semver ranges vs `'auto'` (inferred from `package.json`).
     - `eager: true` vs `eager: false`: Bundling into main initial chunk vs loading asynchronously on demand.
2. **The "Multiple Instances of React" Disaster:**
   - Why React breaks catastrophically if duplicated: The internal React Dispatcher singleton (`ReactCurrentDispatcher`).
   - The error: `"Cannot read properties of null (reading 'useState')"` / `"Invalid hook call"`.
   - How Module Federation negotiates React version matching and why mismatching minor versions can cause silent failures.
3. **The Angular Multi-Zone Crash:**
   - Why Angular `@angular/core` must always be a strict singleton: Multiple instances load separate `TestabilityRegistry`, `PlatformRef`, and injector trees, crashing application bootstrap.
4. **Bundle Duplication Profiling & Tree-Shaking Traps:**
   - Identifying duplicated libraries across remotes using Webpack Bundle Analyzer or `@nx/rspack` visualizer.
   - The Tree-Shaking Trap in Shared Modules: Why marking a library as shared in Module Federation can disable tree-shaking for that library, forcing the entire bundle to be downloaded!
5. **Comparative Analysis Matrix:**
   | Library Type | `singleton` | `strictVersion` | `requiredVersion` | Fallback Behavior on Mismatch |
   |:---|:---:|:---:|:---:|:---|
   | **React / React-DOM** | `true` | `true` | Semver match | Throws error (prevents hook crash) |
   | **Angular Core / Common** | `true` | `true` | Semver match | Throws error (prevents DI crash) |
   | **RxJS** | `true` | `false` | Semver range | Re-uses highest compatible version |
   | **Utility (lodash, date-fns)**| `false` | `false` | Any | Loads duplicate version cleanly |
   | **UI Design System** | `true` / `false` | `false` | Semver range | Depends on state/token storage |
6. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting console output and network downloads when Host has React 18.2.0 and Remote requires React 19.0.0 with `strictVersion: false` vs `true`.
   - 🐛 Debug: Debugging an `"Uncaught Error: Shared module is not available for eager consumption"` caused by setting `eager: false` in a project with no asynchronous bootstrap split.
7. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between `requiredVersion: 'auto'` and explicitly providing a semver string?
   - Why does sharing a large icon library via Module Federation often result in larger bundles than not sharing it?
   - How does Module Federation 2.0 handle runtime version negotiation when three different remotes request three different minor versions?

---

### 📄 `13-resilience-fault-tolerance-and-offline-fallbacks-qa.md` — Resilience, Fault Tolerance & Offline Fallbacks
1. **Failure Modes in Micro-Frontends:**
   - Why MFEs introduce distributed failure modes: Network latency, CDN deployment downtime, 404 on `remoteEntry.js`, script syntax errors in a remote deployment, CORS errors, DNS outages.
   - The Blameless Crash: Why a failure in a minor widget (e.g., "Recommended Products") must never white-screen the primary Host application (e.g., "Checkout").
2. **Error Boundaries & Graceful UI Degradation:**
   - React Error Boundaries around federated remote loaders:
     ```tsx
     <ErrorBoundary fallback={<RemoteUnavailableFallback remoteName="Reviews" />}>
       <Suspense fallback={<SkeletonLoader />}>
         <FederatedReviewsRemote />
       </Suspense>
     </ErrorBoundary>
     ```
   - Angular Fallback Component: Catching errors in `loadRemoteModule` and returning a dynamic fallback component or router redirect.
3. **Circuit Breakers & Retry Logic for Remotes:**
   - Implementing dynamic retry mechanisms with exponential backoff and jitter when fetching remote entry scripts over unstable mobile connections.
   - Circuit Breaker Pattern: If Remote A fails 3 consecutive times, stop pinging its CDN for 60 seconds and immediately render the fallback state.
4. **Offline Caching & Service Workers:**
   - Caching federated chunks using Service Workers and Cache API (`stale-while-revalidate` strategy).
   - Handling cache versioning when a remote deploys a new version while the host is cached offline.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting UI rendering sequence when Remote script returns HTTP 500 error vs network timeout.
   - 🐛 Debug: Debugging an unhandled promise rejection in `loadRemoteModule` that bubbles up and halts the entire Angular router navigation pipeline.
6. **🎯 Quick-Fire & Trap Questions:**
   - Why is a simple `try/catch` block insufficient around React federated component rendering without an Error Boundary?
   - How can you implement a health-check endpoint for federated remotes before attempting to fetch their `remoteEntry.js`?
   - What happens when a user leaves an MFE tab open overnight and a remote publishes a new deployment with new hashed chunk IDs?

---

### 📄 `14-security-authentication-and-multi-tenant-mfe-qa.md` — Security, Authentication & Multi-Tenancy
1. **Authentication Across Micro-Frontends:**
   - The Cross-MFE Auth Problem: How to authenticate users once in the Host shell and securely propagate authentication state to independently deployed remotes.
   - OAuth 2.0 / OpenID Connect (OIDC) with PKCE (Proof Key for Code Exchange).
   - Token Storage Strategies:
     - `HttpOnly`, `SameSite=Strict`, `Secure` Cookies: The gold standard for web security — tokens never exposed to JavaScript.
     - In-Memory Access Tokens + Silent Refresh: Token held in Host memory, remotes access it via a secured, read-only token getter.
     - ⚠️ Danger: Why storing JWT tokens in `localStorage` across MFEs exposes all remotes to catastrophic XSS token theft!
2. **Authorization & Role-Based Access Control (RBAC):**
   - Centralized authorization vs decentralized authorization: Shell guards routes based on user claims; Remotes conditionally render feature buttons based on granular permissions.
3. **Cross-Site Scripting (XSS) & Content Security Policy (CSP):**
   - Why Module Federation increases the XSS attack surface: The Host dynamically evaluates external JavaScript files from various domains via `<script>` injection.
   - Hardening CSP for Module Federation: Configuring `script-src` with strict CDN domain allowlists, trusted types, and CSP nonces.
   - Subresource Integrity (SRI) in Module Federation: Challenges and solutions when remote chunk hashes change dynamically on every independent deployment.
4. **Multi-Tenant Architecture & Dynamic Tenant Discovery:**
   - Dynamic tenant branding and remote routing based on subdomain (`tenant1.app.com` vs `tenant2.app.com`).
   - Loading tenant-specific remotes dynamically via tenant manifest discovery services.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting browser network request headers when an MFE remote makes an API call to a different domain without `withCredentials: true`.
   - 🐛 Debug: Debugging a CSP violation error blocking `remoteEntry.js` evaluation in production environments.
6. **🎯 Quick-Fire & Trap Questions:**
   - How do you securely refresh an expired OAuth2 access token without causing 5 simultaneous remotes to trigger 5 separate refresh API calls?
   - Can an untrusted remote access `document.cookie` if cookies are not marked `HttpOnly`?
   - How do you prevent prototype pollution attacks across federated remotes sharing the global `window` object?

---

### 📄 `15-testing-strategies-and-local-dx-orchestration-qa.md` — Testing Strategies & Local DX Orchestration
1. **Testing Federated Micro-Frontends:**
   - The Testing Pyramid in an MFE Monorepo:
     - **Unit Testing (Vitest / Jest):** Testing MFE components in complete isolation without running the Host. Mocking `loadRemoteModule` and federated dependencies.
     - **Integration Testing:** Testing Host shell integration with mocked remote containers.
     - **End-to-End Testing (Playwright / Cypress):** Testing true end-to-end user journeys spanning Host and live Remotes.
2. **Modern Testing with Vitest in Nx (`@nx/vite`):**
   - Migrating from Jest to Vitest: 4–10x faster unit test execution, native ESM support, and instant worker pooling in monorepos.
   - Component testing across federated boundaries using Vitest and Testing Library.
3. **Local Developer Experience (DX) Orchestration:**
   - The "Laptop Meltdown" Problem: Running 15 micro-frontends simultaneously locally consuming all CPU and RAM!
   - Nx Solution: **Dev Remotes vs Static Remotes:**
     - Running only the app under active development as a dev server (`nx serve shell --devRemotes=dashboard`).
     - Serving all other remotes statically from pre-built artifacts or staging CDN proxies (`--staticRemotes`).
   - Local API proxying and mocking with MSW (Mock Service Worker) in an Nx monorepo.
4. **Comparative Analysis Matrix:**
   | Testing Tier | Tool | Execution Speed | Fidelity | Isolation |
   |:---|:---|:---:|:---:|:---|
   | **Unit Tests** | Vitest | 🟣 Blazing (<50ms) | 🟡 Moderate (Mocked remote) | 🟢 Complete isolation |
   | **Component Tests** | Testing Library | 🟢 Fast (<200ms) | 🟢 High (DOM rendered) | 🟢 MFE boundary |
   | **Contract Tests** | Pact / Zod | 🟢 Fast (<500ms) | 🟢 High (API contract) | 🟢 Decoupled |
   | **E2E Tests** | Playwright | 🟡 Moderate (1–5s) | 🟣 Complete (Real browser) | 🔴 Full system integration |
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting Vitest test results when a test imports a component that relies on a federated remote module that hasn't been mocked.
   - 🐛 Debug: Debugging a flaky Playwright test failing on CI due to race conditions during remote script downloading.
6. **🎯 Quick-Fire & Trap Questions:**
   - How do you mock `loadRemoteModule` in Vitest/Jest unit tests to return a dummy component?
   - How does Playwright test independent remotes in isolation without booting the host shell?
   - What is the difference between `nx serve shell` with `--devRemotes` vs `--staticRemotes`?

---

### 📄 `16-enterprise-system-design-case-studies-and-migration-qa.md` — Enterprise System Design & Migrations (RADIO)
1. **The RADIO System Design Framework for MFEs:**
   - **R — Requirements Clarification:** Functional scope, non-functional budgets (bundle size < 150KB initial, LCP < 1.8s, INP < 100ms, independent deployability SLA).
   - **A — Architecture & High-Level Topology:** Shell host, dynamic remotes, CDN routing, BFF layer, event bus contracts.
   - **D — Data Model & API Contracts:** Shared DTOs, Zod contracts, token synchronization schema, navigation event models.
   - **I — Interface & Component Hierarchy:** Host layout shell (header/footer/nav), container mount slots, remote wrappers, state boundaries.
   - **O — Optimizations, Resilience & Security:** Fallback error boundaries, caching strategies, CSP, bundle deduplication, disaster recovery.
2. **Case Study 1: Large-Scale Polyglot E-Commerce Platform:**
   - System Design: Angular 19 Zoneless Host Shell, React 19 Product Catalog Remote, Angular Checkout & Payment Remote, NestJS BFF Microservices in Nx Monorepo.
   - Managing cart state across Angular Shell and React Catalog without a monolithic store.
3. **Case Study 2: Multi-Tenant Enterprise SaaS Suite:**
   - System Design: Dynamic manifest service discovery, RBAC permissions matrix, White-label theme injection, lazy-loaded plugin remotes.
3. **Case Study 3: Legacy Monolith to Micro-Frontends Migration (Strangler Fig Pattern):**
   - Step-by-step enterprise migration plan using an Nx monorepo:
     1. Moving legacy Angular/React monolith into the monorepo root.
     2. Introducing the new Nx Host Shell with a catch-all route pointing to the legacy app.
     3. Slicing off features one by one (e.g., Auth, Dashboard, Billing) into independent federated remotes.
     4. Rerouting traffic dynamically at the Shell router.
     5. Decommissioning the legacy monolith with zero downtime.
5. **🎯 Senior Scenario & Trap Questions:**
   - What architectural criteria determine whether a feature should be an Nx monorepo library vs a federated micro-frontend?
   - How do you prevent organizational Conway's Law traps where team boundaries create dozens of tiny, inefficient, over-fragmented micro-frontends?
