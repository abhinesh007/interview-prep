# 12 — Modules, Bundlers & Tree-Shaking

> Deep dive into script loading attributes (`defer`, `async`, `type="module"`), ES Modules vs CommonJS runtime mechanics, the Dual-Package Hazard, modern bundler architectures (Vite, Rollup, Webpack, Rspack), AST-based tree-shaking, and `"sideEffects": false`.

---

## 📑 Table of Contents
1. [Script Loading & Browser Module Execution](#1-script-loading--browser-module-execution)
2. [ES Modules (ESM) vs CommonJS (CJS)](#2-es-modules-esm-vs-commonjs-cjs)
3. [Modern Bundlers & Build Tool Architecture](#3-modern-bundlers--build-tool-architecture)
4. [Tree-Shaking & Dead Code Elimination (DCE)](#4-tree-shaking--dead-code-elimination-dce)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Script Loading & Browser Module Execution

### Q1: Compare `<script>`, `<script async>`, `<script defer>`, and `<script type="module">`. How do they interact with HTML parsing and `DOMContentLoaded`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Visual Timeline  
**Tags:** `[Script-Loading]` `[Async-Defer]` `[ESM]` `[CRP]`

**Answer:**

```text
HTML Parsing:  [===========]              [=================]
<script>:                  [Fetch][Execute] (Blocks HTML parsing!)

HTML Parsing:  [==========================]
<script async>:       [Fetch]
                             [Execute]      (Executes immediately on download; blocks parser!)

HTML Parsing:  [==========================] (Parses completely to end!)
<script defer>:       [Fetch]
                                           [Execute] (Executes in order before DOMContentLoaded!)

HTML Parsing:  [==========================]
<script type="module">: [Fetch Tree]
                                           [Execute] (Deferred by default; scoped to module!)
```

| Script Tag | Network Fetch | Execution Timing | Execution Order Guaranteed? | Blocks HTML Parser? |
|---|---|---|:---:|:---:|
| **`<script>`** | Pauses HTML parsing immediately | Executes immediately upon fetch | ✅ Yes (DOM order) | 🔴 **Yes** |
| **`<script async>`** | Parallel / Non-blocking | Executes **immediately** when downloaded | ❌ **No** (First fetched runs first!) | 🟡 Only during execution |
| **`<script defer>`** | Parallel / Non-blocking | Executes after HTML parsing completes, right before `DOMContentLoaded` | ✅ Yes (Strict DOM order) | 🟢 **No** |
| **`<script type="module">`** | Parallel (recursive module graph) | **Deferred by default**; executes after HTML parsing completes | ✅ Yes (In graph order) | 🟢 **No** |

---

## 2. ES Modules (ESM) vs CommonJS (CJS)

### Q2: What are the fundamental runtime differences between ES Modules (ESM) and CommonJS (CJS)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[ESM]` `[CommonJS]` `[Live-Bindings]` `[Dual-Package-Hazard]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│                   ESM vs CommonJS Matrix               │
├───────────────────────┬────────────────────────────────┤
│ Feature               │ CommonJS (CJS)  │ ES Modules   │
├───────────────────────┼─────────────────┼──────────────┤
│ Loading Mechanism     │ Dynamic / Sync  │ Static / Async
│ Dependency Graph      │ Evaluated at    │ Parsed at    │
│                       │ runtime         │ compile time │
│ Variable Exports      │ Value Clones    │ Live Pointer │
│                       │ (Copied)        │ Bindings     │
│ Tree-Shaking Support  │ ❌ Impossible   │ ✅ Native    │
│ Top-Level await       │ ❌ No           │ ✅ Yes       │
└───────────────────────┴─────────────────┴──────────────┘
```

### The Live Bindings Difference:
In CommonJS, `module.exports` copies primitive values. In ESM, `import` creates **live read-only pointers** back to the exporting module's scope:

```javascript
// counter.mjs (ESM)
export let count = 1;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 1
increment();
console.log(count); // 2! (Live binding reflects exported mutation!)
```

### The Dual-Package Hazard:
When a library author publishes a package containing both CJS and ESM builds, if a consumer's dependency graph imports the CJS build in one file and the ESM build in another, Node.js loads **two completely separate instances** of the library into memory. Any internal singletons or shared state (e.g., React Context, database connection pools) become desynchronized and broken!
*Solution:* Use strict `exports` maps in `package.json` with conditional export targets.

---

## 3. Modern Bundlers & Build Tool Architecture

### Q3: How do modern bundlers work? Compare Webpack, Rollup, and Vite.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Tooling  
**Tags:** `[Vite]` `[Webpack]` `[Rollup]` `[Bundlers]` `[ESBuild]`

**Answer:**

1. **Webpack:**
   - Universal bundler based on an extensible plugin tapable architecture.
   - Bundles all assets (JS, CSS, images) into a unified dependency graph.
   - Ideal for complex enterprise web applications requiring mature code-splitting and legacy compatibility.

2. **Rollup:**
   - Designed specifically for bundling **ES Modules**.
   - Produces clean, flat, highly readable bundles with superior tree-shaking algorithms.
   - The de-facto standard for authoring open-source libraries and powering Vite's production build.

3. **Vite:**
   - **Dev Server:** Completely **unbundled**. Leverages the browser's native ESM (`<script type="module">`) to serve files on demand, using **esbuild** (written in Go) for pre-bundling dependencies 50x faster than Webpack.
   - **Production:** Bundles via Rollup (and transitioning to Rolldown, a Rust-based Rollup port).

```text
Webpack Dev:  [Source Code] ──> [Bundle Entire App (Slow)] ──> [Start Server]

Vite Dev:     [Start Server (Instant)] ──> Browser requests /App.jsx ──> Transform on Demand
```

---

## 4. Tree-Shaking & Dead Code Elimination (DCE)

### Q4: How does Tree-Shaking work under the hood, and what does `"sideEffects": false` do?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Build Optimization  
**Tags:** `[Tree-Shaking]` `[SideEffects]` `[Dead-Code-Elimination]` `[AST]`

**Answer:**
**Tree-Shaking** is a form of dead-code elimination that removes unused exports from the final production bundle.

It relies strictly on the **static nature of ES Modules**:
- Because `import` and `export` statements cannot be placed inside `if` conditions or loops, the bundler can determine the exact dependency graph by analyzing the Abstract Syntax Tree (AST) **without executing a single line of code**.

### The Role of `"sideEffects": false` in `package.json`:
Even if a function is never imported, the bundler cannot automatically drop the file if executing the file could alter global state (e.g., polyfilling `Array.prototype`, attaching window listeners).
Setting `"sideEffects": false` in `package.json` gives the bundler explicit permission:
> *"If an export from this module is not imported anywhere, you may safely discard the entire file without evaluating it."*

```json
{
  "name": "my-ui-library",
  "sideEffects": [
    "*.css",
    "./src/polyfills.js"
  ]
}
```

**Common Tree-Shaking Pitfalls:**
1. **Babel / TypeScript Transpiling to CJS:** If Babel transpiles `import/export` to `require/module.exports` before the bundler runs, static analysis breaks completely.
2. **Namespace Imports with Dynamic Lookups:** `import * as utils from './utils'; utils[dynamicKey]()` forces the bundler to retain all exports in `utils`.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What are Import Maps (`<script type="importmap">`)?
**Difficulty:** 🟡 Mid | **Type:** 📖 Browser Platform  
**Answer:** Import Maps allow web browsers to resolve bare module specifiers (e.g., `import React from 'react'`) directly in native ESM without requiring a bundler. The import map maps package names to CDN URLs or local file paths.

### Q6: What are Import Attributes / Assertions?
**Difficulty:** 🟡 Mid | **Type:** 📖 Modern Standards  
**Answer:** Import attributes allow importing non-JavaScript assets securely with explicit MIME-type validation:
```javascript
import config from './config.json' with { type: 'json' };
```
This prevents a server from accidentally or maliciously serving executable JavaScript under a `.json` URL.
