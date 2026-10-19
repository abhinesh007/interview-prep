# 12 — Modules, Namespaces & ESM/CJS Interop

> Deep dive into CommonJS vs ECMAScript Modules (ESM), the Dual-Package Hazard, package `exports` mapping, Import Attributes (`with`), `esModuleInterop` mechanics, and native TypeScript runtimes.

---

## 📑 Table of Contents
1. [CommonJS vs ESM & The Dual-Package Hazard](#1-commonjs-vs-esm--the-dual-package-hazard)
2. [Configuring `package.json` for Modern TypeScript](#2-configuring-packagejson-for-modern-typescript)
3. [Import Attributes (`with`) vs Import Assertions](#3-import-attributes-with-vs-import-assertions)
4. [`esModuleInterop` & Ambient Declarations](#4-esmoduleinterop--ambient-declarations)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. CommonJS vs ESM & The Dual-Package Hazard

### Q1: What is the Dual-Package Hazard when publishing an npm library supporting both CommonJS and ESM?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Dual-Package-Hazard]` `[CJS]` `[ESM]` `[Interop]`

**Answer:**
The **Dual-Package Hazard** occurs when an npm library provides both a CommonJS (`.cjs`) and an ECMAScript Module (`.mjs`) build, and an application or its dependencies end up loading **both builds into the same running Node.js process**.

```text
┌────────────────────────────────────────────────────────┐
│                   NODE.JS PROCESS HEAP                 │
├──────────────────────────┬─────────────────────────────┤
│   CommonJS Module Cache  │     ESM Module Registry     │
│   require("my-lib")      │     import "my-lib"         │
│   ├── instance_1         │     ├── instance_2          │
│   └── (Internal State A) │     └── (Internal State B)  │
└──────────────────────────┴─────────────────────────────┘
  ❌ TWO DIFFERENT SINGLETON INSTANCES IN MEMORY!
```

#### Production Catastrophes Caused by Dual Packaging:
1. **Broken Singletons:** Libraries relying on module-scoped state (e.g., database connection pools, global telemetry collectors, logger registries) instantiate two completely separate states.
2. **`instanceof` Failures:** A custom error or class created by the CJS build will fail `instanceof` checks inside code using the ESM build!

#### Senior Prevention Strategy:
Use an **Isomorphic Core Wrapper**:
Have the CommonJS build simply act as a thin wrapper that delegates to the ESM build, or use tools like **`attw` (*Are the Types Wrong?*)** in CI to verify that package export conditions do not diverge.

---

## 2. Configuring `package.json` for Modern TypeScript

### Q2: How do you configure modern `package.json` `"exports"` with TypeScript types, and why MUST `"types"` come first?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Library Publishing  
**Tags:** `[Package-Exports]` `[Subpath-Exports]` `[Types-Condition]`

**Answer:**
Modern Node.js and TypeScript rely on the `"exports"` field in `package.json` to define public entry points:

```json
{
  "name": "enterprise-sdk",
  "version": "2.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    }
  }
}
```

#### Why `"types"` MUST Come First:
Node.js export condition matching evaluates **in object key order from top to bottom**. 
- If you place `"import"` before `"types"`:
  ```json
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
  ```
- When a bundler or compiler searches the conditions, it may match `"import"` first, assume it has resolved the entry point, and **completely ignore your `"types"` condition**!
- Placing `"types"` first guarantees TypeScript identifies the declaration file before resolving the runtime code target.

---

## 3. Import Attributes (`with`) vs Import Assertions

### Q3: What is the transition from Import Assertions to Import Attributes (`with` vs `assert`) in TypeScript 5.3 & 5.8?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Version Evolution  
**Tags:** `[Import-Attributes]` `[TS-5.3]` `[TS-5.8]` `[JSON-Imports]`

**Answer:**
When importing non-JavaScript files (such as JSON or CSS) via ESM, TC39 originally proposed **Import Assertions** using `assert`:

```typescript
// ❌ Legacy Syntax (TS 4.5 through 5.2):
import config from "./config.json" assert { type: "json" };
```

TC39 revised the specification to **Import Attributes** using the `with` keyword due to security considerations (assertions could only verify content types, whereas attributes can alter module evaluation semantics).

- **TypeScript 5.3** added support for `with { type: "json" }`.
- **TypeScript 5.8** strictly enforces `with` when `"module": "NodeNext"` is enabled, flagging `assert` as a deprecated syntax error:

```typescript
// ✅ Modern ECMAScript Standard (TS 5.3+ & TS 5.8 Enforced):
import config from "./config.json" with { type: "json" };
```

---

## 4. `esModuleInterop` & Ambient Declarations

### Q4: What does `"esModuleInterop": true` actually do under the hood in emitted JavaScript?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Code Deconstruction  
**Tags:** `[EsModuleInterop]` `[CJS-ESM-Interop]`

**Answer:**
In CommonJS, a module exports a single value via `module.exports = function() {}`.
In ECMAScript Modules, there is a clear distinction between a **default export** (`export default ...`) and **named exports** (`export { foo }`).

Before `esModuleInterop`, importing a CommonJS library like Express required namespace imports:
`import * as express from 'express';` (which violated the ES specification because Express is callable as a function!).

When `"esModuleInterop": true` is enabled, TypeScript injects runtime helper functions (`__importDefault` and `__importStar`) into the emitted JavaScript:

```javascript
// Emitted Helper:
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

// Allows natural default imports:
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What makes a TypeScript file a "Module" vs a "Script"?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Modules]` `[Scripts]`

**Answer:**
Any file containing a top-level `import` or `export` statement is treated as an isolated **Module**.
A file without any `import` or `export` is treated as a **Script**, and all its top-level variables and types pollute the **global scope**!
*(Tip: Add `export {};` to an empty file to force it into module scope).*

---

### Q6: Why are TypeScript `namespaces` considered legacy in modern development?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Namespaces]`

**Answer:**
`namespaces` were invented before ES6 modules existed. They emit custom JavaScript IIFEs, break static tree-shaking, complicate module bundlers, and are incompatible with modern native type-stripping runtimes (`--erasableSyntaxOnly`). Standard ES modules (`import`/`export`) should always be used instead.
