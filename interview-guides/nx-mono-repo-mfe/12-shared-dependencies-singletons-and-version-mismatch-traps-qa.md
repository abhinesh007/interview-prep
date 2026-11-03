# 12 — Shared Dependencies, Singletons & Version Mismatch Traps

> Deep Dive into Module Federation `shared` Config (`singleton`, `strictVersion`, `requiredVersion`, `eager`), The React Dispatcher Disaster, Angular Multi-Zone Crashes, and Tree-Shaking Traps in Shared Libraries.

---

## 📑 Table of Contents
1. [The Anatomy of the `shared` Configuration Block](#1-the-anatomy-of-the-shared-configuration-block)
2. [The "Multiple Instances of React" Dispatcher Disaster](#2-the-multiple-instances-of-react-dispatcher-disaster)
3. [The Angular Core Multi-Instance Bootstrap Crash](#3-the-angular-core-multi-instance-bootstrap-crash)
4. [The Tree-Shaking Trap in Shared Federated Modules](#4-the-tree-shaking-trap-in-shared-federated-modules)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Anatomy of the `shared` Configuration Block

### Q1: Explain the exact runtime behavior of every property in Module Federation's `shared` configuration object.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[shared-config]` `[Singletons]` `[Internals]`

**Answer:**
The `shared` configuration tells Webpack/Rspack how to register and negotiate dependencies between Host and Remotes at runtime:

```typescript
// module-federation.config.ts
shared: {
  'react': {
    singleton: true,
    strictVersion: true,
    requiredVersion: '^19.0.0',
    eager: false,
  },
  'lodash-es': {
    singleton: false,
  }
}
```

### 1. `singleton: boolean` (Default: `false`)
- **`true`:** Forces the runtime to instantiate **only one copy** of the package across the entire browser window. All containers share the exact same in-memory reference.
- **`false`:** If versions mismatch, the runtime allows each container to download and execute its own private copy of the library.

### 2. `strictVersion: boolean` (Default: `false`)
- **`true`:** If the runtime discovers a version mismatch between what the Host provides and what the Remote demands, **it halts execution and throws a runtime exception**. It refuses to run with mismatched versions.
- **`false`:** If versions mismatch, the runtime emits a console warning and either loads a duplicate fallback version (if `singleton: false`) or forces the highest compatible version.

### 3. `requiredVersion: string | 'auto'` (Default: `'auto'`)
- Defines the required semantic version range (e.g. `'^18.2.0'`). When set to `'auto'` (recommended in Nx), Nx automatically inspects the root `package.json` lockfile and injects the exact installed semver range during compilation.

### 4. `eager: boolean` (Default: `false`)
- **`false` (Recommended):** Emits the shared package as a separate asynchronous chunk, loaded dynamically during the Two-Phase Container Handshake.
- **`true`:** Bundles the shared package directly into the initial entry script (`remoteEntry.js` or `main.js`). **Warning:** If multiple remotes mark a package as eager, all remotes will bundle duplicate copies into their entry scripts!

---

### Q2: Comparison Matrix: How should different categories of packages be configured in Module Federation?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Matrix]` `[Best-Practices]`

**Answer:**

| Package Category | Example Packages | `singleton` | `strictVersion` | `requiredVersion` | Strategy Rationale |
|---|---|:---:|:---:|:---:|---|
| **Framework Runtimes** | `react`, `react-dom`, `@angular/core` | `true` | `true` | `'auto'` | **Strict Singleton:** Multiple instances crash internal hook/DI dispatchers. |
| **Reactive Observables** | `rxjs` | `true` | `false` | `'^7.8.0'` | **Tolerant Singleton:** Semver minor differences are compatible; sharing prevents `instanceof Observable` bugs. |
| **Pure Utility Libraries**| `lodash-es`, `date-fns` | `false` | `false` | `'auto'` | **Independent Copies:** Pure functions have no global state. Duplication is completely safe. |
| **State Stores** | `zustand`, `@ngrx/signals` | `true` | `true` | `'auto'` | **Strict Singleton:** Must share memory references if coordinating state across remotes. |

---

## 2. The "Multiple Instances of React" Dispatcher Disaster

### Q3: Why does React crash catastrophically when duplicated, and what is `ReactCurrentDispatcher`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[React]` `[Dispatcher]` `[Hooks]` `[Internals]`

**Answer:**
In React, hooks like `useState`, `useEffect`, and `useContext` do not contain their own state storage. Instead, they are thin proxies that delegate to a global internal object called **`ReactCurrentDispatcher`**:

```text
React Package Internal Architecture:
┌────────────────────────────────────────────────────────┐
│                      react package                     │
│  export function useState(initial) {                   │
│    const dispatcher = ReactCurrentDispatcher.current;  │
│    return dispatcher.useState(initial);                │
│  }                                                     │
└───────────────────────────┬────────────────────────────┘
                            │
               Bound at runtime by renderer
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    react-dom package                   │
│  When component renders:                               │
│  ReactCurrentDispatcher.current = HooksDispatcher;     │
└────────────────────────────────────────────────────────┘
```

### Why Duplication Causes a Crash:
1. The Host loads `react` (Instance A) and `react-dom` (Instance A).
2. The Remote bundles its own `react` (Instance B).
3. When the Remote's component executes in the browser, `react-dom` (Instance A) initiates rendering and sets `ReactCurrentDispatcher.current` on **Instance A**.
4. But the Remote component's `useState()` hook was imported from **Instance B**!
5. On Instance B, `ReactCurrentDispatcher.current` is still `null`!
6. React throws:
   ```text
   TypeError: Cannot read properties of null (reading 'useState')
   Error: Invalid hook call. Hooks can only be called inside the body of a function component.
   ```

---

## 3. The Angular Core Multi-Instance Bootstrap Crash

### Q4: What happens if `@angular/core` is instantiated twice in the same browser window?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Angular]` `[PlatformRef]` `[TestabilityRegistry]`

**Answer:**
When Angular bootstraps, `@angular/core` initializes global platform singletons:
1. **`PlatformRef`:** The root browser platform instance.
2. **`TestabilityRegistry`:** A global map of root elements used for automated testing.
3. **Internal Injection Metadata:** Angular Ivy's instruction set relies on internal symbol references (`ɵɵdefineComponent`).

If a Remote loads a second copy of `@angular/core`:
```text
Cannot have multiple platforms active at once.
Error: PlatformRef is already initialized.
```
Or, if bypassing platform initialization, Ivy instruction symbols generated by Instance A will not be recognized by Instance B, causing:
```text
NullInjectorError: No provider for InjectionToken!
```
Therefore, `@angular/core`, `@angular/common`, and `@angular/router` **must always be configured with `singleton: true, strictVersion: true`**.

---

## 4. The Tree-Shaking Trap in Shared Federated Modules

### Q5: What is the "Tree-Shaking Trap" when marking large utility libraries as shared in Module Federation?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Tree-Shaking]` `[Bundle-Size]` `[Optimization]`

**Answer:**
In a standard standalone build, if you import one function from `lodash-es` (`import { debounce } from 'lodash-es'`), the bundler performs tree-shaking and compiles **only the 2KB `debounce` function** into the output bundle.

### The Federation Tree-Shaking Trap:
When you configure a library in the Module Federation `shared` block:
```typescript
shared: {
  'lodash-es': { singleton: false } // <--- THE TRAP!
}
```
Module Federation must make `lodash-es` available to **any other federated remote that might request it at runtime**. Because Webpack cannot know at build time which functions an external, independently deployed remote might request in the future:
1. **Webpack is forced to package the ENTIRE `lodash-es` library (all 600+ functions) into a shared chunk!**
2. The user downloads a **500KB+ bloated bundle** instead of 2KB!

### Best Practices:
1. **Never share large utility or icon libraries via Module Federation** (`lodash-es`, `lucide-react`, `@angular/material/icons`).
2. Allow each remote to bundle and tree-shake utility functions locally. A 2KB duplication across 3 remotes (6KB total) is dramatically better than downloading a 500KB shared chunk!

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🧩 Output Prediction: Version Mismatch Negotiation with `strictVersion: false` vs `true`
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Output-Prediction]` `[strictVersion]`

**Scenario:**
- Host application provides: `react@18.2.0`.
- Remote application declares in `package.json`: `react@^19.0.0`.
- Case A: `strictVersion: true, singleton: true`.
- Case B: `strictVersion: false, singleton: true`.

**Predict what happens in the browser console for Case A and Case B:**

**Answer:**
- **Case A (`strictVersion: true`):**  
  **Result:** Fatal Exception! Execution halts:
  ```text
  Uncaught Error: Shared module react@18.2.0 doesn't satisfy the version requirement of react@^19.0.0
  ```
- **Case B (`strictVersion: false`):**  
  **Result:** Console Warning emitted, but execution continues:
  ```text
  [Federation] Unsatisfied version react@18.2.0 from host satisfies none of ^19.0.0 from remote.
  Using react@18.2.0 as singleton.
  ```
  The browser attempts to execute the React 19 Remote using the Host's React 18 instance. If the remote utilizes React 19 features (like `useActionState` or `useOptimistic`), it will crash with `TypeError: useActionState is not a function`.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What does `requiredVersion: 'auto'` mean?
**Answer:** It instructs Nx/Webpack to automatically inspect the root `package.json` lockfile during compilation and infer the exact installed version range (e.g. `'~19.1.0'`), eliminating manual version string maintenance.

### Q8: What happens if two remotes share a package marked `singleton: false` with identical versions?
**Answer:** Even with `singleton: false`, if the versions match exactly, Webpack is smart enough to share the single downloaded chunk, avoiding duplicate network downloads while permitting duplication if versions diverge.

### Q9: Why does sharing RxJS as a singleton prevent `instanceof Observable` bugs?
**Answer:** In JavaScript, `instanceof` checks prototype chain identity in memory. If two copies of RxJS are loaded, an Observable created in Remote A will return `false` when evaluated with `source instanceof Observable` in Host B!

### Q10: How can you visualize duplicated packages across federated remotes?
**Answer:** Use `@nx/rspack` or Webpack Bundle Analyzer (`nx build my-app --stats-json` followed by `npx webpack-bundle-analyzer dist/apps/my-app/stats.json`) to inspect chunk sizes and identify duplicated modules.
