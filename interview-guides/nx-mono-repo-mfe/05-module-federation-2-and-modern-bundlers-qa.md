# 05 — Module Federation 2.0 & Modern Bundlers (Rspack & Vite)

> Module Federation 2.0 (`@module-federation/enhanced`), Federated Types (`@module-federation/dts-plugin`), Runtime Plugin Lifecycle Hooks, Rspack in Nx (`@nx/rspack`), and Vite Federation Trade-offs (`@originjs/vite-plugin-federation`).

---

## 📑 Table of Contents
1. [Module Federation 2.0 Architecture & Advancements](#1-module-federation-20-architecture--advancements)
2. [Federated Types & End-to-End Type Safety](#2-federated-types--end-to-end-type-safety)
3. [The Runtime Plugin Lifecycle System](#3-the-runtime-plugin-lifecycle-system)
4. [High-Performance Bundling with Rspack in Nx](#4-high-performance-bundling-with-rspack-in-nx)
5. [Vite Module Federation & The Dev/Prod Gap](#5-vite-module-federation--the-devprod-gap)
6. [🧩 Output Prediction & 🐛 Debug Scenarios](#6--output-prediction---debug-scenarios)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. Module Federation 2.0 Architecture & Advancements

### Q1: What are the fundamental architectural differences between Module Federation 1.0 (Webpack 5) and Module Federation 2.0 (Enhanced)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Module-Federation-2.0]` `[Rspack]` `[Architecture]`

**Answer:**
Module Federation 1.0 was tightly coupled to Webpack internals (`webpack.container.ModuleFederationPlugin`), making it difficult to optimize, extend, or run outside of Webpack.

**Module Federation 2.0 (powered by `@module-federation/enhanced`)** extracts federation into a framework-agnostic, bundler-agnostic specification with four core architectural enhancements:

```text
┌────────────────────────────────────────────────────────┐
│            MODULE FEDERATION 2.0 ECOSYSTEM             │
├────────────────────────────────────────────────────────┤
│ 1. Bundler-Agnostic Core: Rspack, Webpack, Vite        │
│ 2. Federated Types (@module-federation/dts-plugin):   │
│    Automatic compilation & consumption of .d.ts types  │
│ 3. Runtime Plugin Hooks (beforeRequest, onLoad, error) │
│ 4. Native Manifest Specification (mf-manifest.json)    │
│ 5. Improved Semantic Version Negotiation Engine        │
└────────────────────────────────────────────────────────┘
```

| Dimension | Module Federation 1.0 | Module Federation 2.0 (`@module-federation/enhanced`) |
|---|---|---|
| **Bundler Support** | Strictly Webpack 5 | Webpack 5, Rspack (Native Rust), Vite |
| **Type Safety** | None (manual `.d.ts` copying or ambient declarations) | **Automatic Federated Types** (Build & Dev time sync) |
| **Runtime Customization**| Minimal (hardcoded Webpack container callbacks) | **Extensible Runtime Plugin System** (Lifecycle hooks) |
| **Manifest Spec** | Ad-hoc `remoteEntry.js` script tag injection | Standardized `mf-manifest.json` describing chunks and assets |
| **Version Negotiation** | Rigid; often throws container runtime errors on minor diffs | Resilient semver negotiation with graceful fallback loading |

---

### Q2: What is `mf-manifest.json` in Module Federation 2.0, and how does it replace raw script injection?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Manifest]` `[MF-2.0]`

**Answer:**
In MF 1.0, the Host had to blindly inject `<script src="https://.../remoteEntry.js">` into the DOM. If the remote deployed CSS chunks, assets, or polyfills, the Host had no prior awareness of them until runtime execution occurred.

In MF 2.0, the remote compiler produces **`mf-manifest.json`**:

```json
// Example: dist/apps/checkout/mf-manifest.json
{
  "id": "checkoutRemote",
  "name": "checkoutRemote",
  "meta": {
    "buildVersion": "2.4.1",
    "compiler": "rspack"
  },
  "remotes": [],
  "shared": [
    { "name": "react", "version": "19.0.0", "singleton": true }
  ],
  "exposes": [
    {
      "id": "checkoutRemote:PaymentForm",
      "name": "PaymentForm",
      "assets": {
        "js": { "sync": ["remoteEntry.js"], "async": ["src_payment_form_tsx.js"] },
        "css": { "sync": ["src_payment_form_tsx.css"] }
      }
    }
  ]
}
```

### Benefits:
1. **Preloading CSS & Assets:** The Host reads the manifest and preloads the remote's CSS stylesheets **before** mounting the component, eliminating Flash of Unstyled Content (FOUC).
2. **Metadata & Canary Routing:** The manifest contains build IDs and version tags, allowing API gateways to route users to canary remotes seamlessly.

---

## 2. Federated Types & End-to-End Type Safety

### Q3: How do "Federated Types" work under the hood, and how do they eliminate the "Blind Consumption" problem in TypeScript?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[TypeScript]` `[Federated-Types]` `[dts-plugin]`

**Answer:**
### The "Blind Consumption" Problem (MF 1.0):
In MF 1.0, consuming an exposed remote component meant TypeScript treated it as `any` unless developers manually authored a declaration file:

```typescript
// Legacy ambient declaration in shell: types.d.ts
declare module 'orders/OrderList' {
  const OrderList: any; // Zero type checking! Prone to breaking prop changes!
  export default OrderList;
}
```

### The Federated Types Solution (MF 2.0):
The `@module-federation/dts-plugin` automates type generation and consumption through an integrated background compilation step:

```text
REMOTE BUILD PIPELINE:
1. Remote compiles components.
2. dts-plugin extracts TypeScript declarations for all `exposes`.
3. Packages them into a lightweight archive: `@mf-types.zip` (hosted alongside remoteEntry.js).

HOST CONSUMPTION PIPELINE:
1. Host builds or runs dev server.
2. dts-plugin queries remote manifest, fetches `@mf-types.zip`.
3. Unpacks types into Host's node_modules/@mf-types/orders.
4. Host IDE provides full autocomplete, prop validation, and refactoring support!
```

### Configuration in `rspack.config.ts`:
```typescript
import { composePlugins, withNx, withReact } from '@nx/rspack';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';

export default composePlugins(withNx(), withReact(), (config) => {
  config.plugins.push(
    new ModuleFederationPlugin({
      name: 'ordersRemote',
      exposes: {
        './OrderList': './src/app/order-list.tsx',
      },
      dts: {
        generateTypes: true, // Emits @mf-types
        consumeTypes: true,  // Consumes remote types
      },
    })
  );
  return config;
});
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if the Remote is temporarily offline during Host compilation in CI?"  
*Senior Answer:* The `dts-plugin` supports type caching. If the remote URL is unreachable during a build, it falls back to previously cached type definitions in `.mf-types/` or uses committed type definitions, emitting a non-fatal warning rather than crashing the CI pipeline.

---

## 3. The Runtime Plugin Lifecycle System

### Q4: How does the Module Federation 2.0 Runtime Plugin lifecycle work, and how can you use it to inject Authorization Bearer tokens?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Plugins]` `[Runtime]` `[Security]`

**Answer:**
MF 2.0 introduces a formal **Runtime Plugin System** exposing core lifecycle hooks:
- `beforeInit`: Runs before containers are initialized with shared scope.
- `beforeRequest`: Intercepts chunk/script network requests before they are sent.
- `afterResolve`: Runs after remote container entry URL is resolved.
- `onLoad`: Fires when a federated chunk finishes loading.
- `errorLoadRemote`: Catches remote loading errors for fallback recovery.

### Use Case: Dynamically Injecting Auth Headers for Secure Remote CDNs
When remotes are hosted behind private enterprise CDNs (e.g. S3 presigned URLs or Cloudflare Access):

```typescript
// libs/shared/federation-plugins/src/auth-plugin.ts
import { FederationRuntimePlugin } from '@module-federation/enhanced/runtime';

export const authFederationPlugin: () => FederationRuntimePlugin = () => ({
  name: 'auth-federation-plugin',

  beforeRequest: async (args) => {
    const token = sessionStorage.getItem('ACCESS_TOKEN');
    if (token && args.url.includes('cdn.private-corp.com')) {
      // Append secure temporary token parameter or modify request headers
      const url = new URL(args.url);
      url.searchParams.set('auth_token', token);
      args.url = url.toString();
    }
    return args;
  },

  errorLoadRemote: async (args) => {
    console.warn(`[MFE Fallback] Remote ${args.id} failed to load. Serving offline stub.`);
    return {
      default: () => '<div>Widget Temporarily Unavailable</div>',
    };
  },
});
```

---

## 4. High-Performance Bundling with Rspack in Nx

### Q5: Why is Rspack replacing Webpack for massive Module Federation monorepos, and what are its trade-offs?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Rspack]` `[Performance]` `[Bundlers]`

**Answer:**
**Rspack** is a high-performance web bundler written in **Rust**, developed by ByteDance and maintained in partnership with the Webpack team.

```text
BENCHMARK: Enterprise Monorepo (30 MFEs, 100 Libs, 50,000 Modules)
Webpack 5:  Cold Build: 2m 45s  | HMR: 2.8s
Rspack:     Cold Build: 14s      | HMR: 85ms (5–10x Faster!)
```

### Architectural Reasons for Rspack's Speed:
1. **Multi-Threaded Rust Compilation:** Parses ASTs, computes module hashes, and writes chunks across all CPU cores in parallel.
2. **Built-in SWC Transpilation:** Replaces slow Babel and `ts-loader` with Rust-native SWC.
3. **Native Webpack API Compatibility:** Implements Webpack's exact plugin and loader architecture, meaning existing loaders (`postcss-loader`, `sass-loader`, `svg-loader`) run with zero rewrites.
4. **Native Enhanced Module Federation:** First-class support for Module Federation 2.0 built directly into the core engine.

**Trade-offs to Consider:**
- Some highly obscure or legacy Webpack plugins that tap deeply into internal V8 AST representations may require minor refactoring or replacement.

---

## 5. Vite Module Federation & The Dev/Prod Gap

### Q6: How does Vite handle Module Federation, and why does the "Dev vs Prod Gap" present significant challenges in Vite MFEs?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Vite]` `[Dev-vs-Prod]` `[Rollup]`

**Answer:**
Vite was built around Native ES Modules (`<script type="module">`) in development and **Rollup** in production. Because Webpack Module Federation was historically Webpack-specific, Vite relies on plugins like `@originjs/vite-plugin-federation`.

### The "Dev vs Prod Gap" Problem:

```text
VITE DEVELOPMENT MODE:
- No bundling! Uses browser-native ESM + esbuild.
- Resolves modules via HTTP 304 imports.
- Dynamic federation shared scope emulation is fragile because esbuild
  does not natively implement Webpack's container initialization protocol.

VITE PRODUCTION BUILD:
- Runs Rollup.
- Rewrites chunks into SystemJS or Rollup federated containers.
- Generates a completely different chunk layout than dev mode!
```

### The Consequences:
1. **Shared Scope Mismatches in Dev:** Marking React or Angular as `singleton: true` often works in the production Rollup build, but fails during local development with `"Multiple instances of React"` because Vite's dev server does not negotiate singletons across independent dev servers.
2. **Top-Level Await Compatibility:** Vite remotes output Native ESM with Top-Level Await, which can break if consumed by a Webpack 5 Host that has not enabled `experiments: { topLevelAwait: true }`.

**Modern Best Practice:** If building a massive enterprise Micro-Frontend architecture with dynamic shared singletons and Angular/React polyglot remotes, **Rspack or Webpack 5 with Module Federation 2.0** provides vastly superior stability and reliability compared to Vite federation plugins.

---

## 6. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q7: 🐛 Debug Scenario: Top-Level Await Failure in Webpack Consuming Vite Remote
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Vite]` `[Webpack]` `[Top-Level-Await]`

**Scenario:**
An enterprise has an Angular shell compiled with `@nx/webpack`. They dynamically load a new lightweight marketing remote built with Vite and `@originjs/vite-plugin-federation`.
The build passes in CI. However, at runtime in the browser, the Host throws:
```text
Uncaught SyntaxError: Unexpected reserved word 'await'
at remoteEntry.js:1:12
```
The remote loads fine when opened directly in Chrome, but halts the Angular host. What is the cause and fix?

**Answer:**
**Root Cause:** The Vite remote outputs modern ESM chunks that utilize **Top-Level Await** inside `remoteEntry.js` to initialize shared libraries. The Angular Webpack 5 Host is compiling to an ES target or Webpack output format that does not enable Top-Level Await support.

**Fix:** Enable Top-Level Await in the Host's Webpack configuration:
```javascript
// apps/shell-host/webpack.config.js
module.exports = {
  experiments: {
    topLevelAwait: true,
  },
  output: {
    module: true,
    library: { type: 'module' },
  },
};
```
And ensure `target: ['web', 'es2022']` is configured in `tsconfig.base.json`.

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q8: What does `@module-federation/enhanced` provide that standard Webpack 5 does not?
**Answer:** Federated Types automatic compilation/consumption (`dts-plugin`), runtime lifecycle plugins (`beforeRequest`, `errorLoadRemote`), manifest-driven asset loading (`mf-manifest.json`), and support for Rspack.

### Q9: Can an Rspack Host consume a Webpack 5 Remote?
**Answer:** **Yes, 100% compatible.** Both comply with the universal Module Federation container interface (`init` and `get`). An Rspack Host can seamlessly federate Webpack 5 remotes and vice versa.

### Q10: How does Rspack achieve sub-100ms Hot Module Replacement (HMR)?
**Answer:** Rspack performs module dependency invalidation and AST transformations entirely in parallel native Rust code, avoiding Node.js garbage collection pauses and single-threaded event loop bottlenecks.

### Q11: What is the purpose of the `errorLoadRemote` runtime plugin hook?
**Answer:** It intercepts network errors (like 404s or timeouts) when fetching a remote entry script, allowing the application to return a graceful fallback component or cached offline version without crashing the host.
