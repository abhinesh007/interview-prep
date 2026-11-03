# 03 — CommonJS & ECMAScript Modules (ESM)

> Module Loading Internals, `require.cache`, Circular Dependencies, ESM Top-Level `await`, CJS ↔ ESM Interoperability Traps, and Modern `package.json` `"exports"`.

---

## 📑 Table of Contents
1. [CommonJS (CJS) Internals & Resolution](#1-commonjs-cjs-internals--resolution)
2. [ECMAScript Modules (ESM) Architecture](#2-ecmascript-modules-esm-architecture)
3. [CJS ↔ ESM Interoperability Pitfalls & Dual-Package Hazards](#3-cjs--esm-interoperability-pitfalls--dual-package-hazards)
4. [Circular Dependencies in CJS vs ESM](#4-circular-dependencies-in-cjs-vs-esm)
5. [Modern package.json Configuration & Subpath Exports](#5-modern-packagejson-configuration--subpath-exports)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. CommonJS (CJS) Internals & Resolution

### Q1: What happens under the hood when `require('./module')` is executed in Node.js?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[CommonJS]` `[Internals]` `[require]`

**Answer:**
The synchronous `require()` function in Node.js follows 5 distinct operational steps:

```text
require('foo')
      │
      ▼
1. Resolving  ──► Checks core modules ➔ require.cache ➔ node_modules lookup
      │
      ▼
2. Loading    ──► Reads file from disk into memory string (fs.readFileSync)
      │
      ▼
3. Wrapping   ──► Wraps code in IIFE wrapper function
      │
      ▼
4. Evaluating ──► V8 executes the function; populates module.exports
      │
      ▼
5. Caching    ──► Stores module instance in require.cache
```

#### The Module Wrapper Function:
Before evaluating any CJS file, Node.js wraps the file content in a hidden function wrapper:
```javascript
(function (exports, require, module, __filename, __dirname) {
  // Your file contents execute here!
});
```
This is why `exports`, `require`, `module`, `__filename`, and `__dirname` appear as pseudo-global variables inside any CommonJS file without being declared.

#### Caching Mechanism:
Every successfully loaded module is cached in `require.cache` by its resolved absolute path. Subsequent calls to `require('./module')` do not read the disk or re-evaluate the code; they immediately return the cached `module.exports` object.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you delete an entry from `require.cache`?"  
*Senior Answer:* The next `require()` call re-reads and re-evaluates the file from scratch, creating a new instance. This is frequently used in hot-reloading dev tools, but dangerous in production: singletons (like database connection pools) will be duplicated, causing connection exhaustion.

---

### Q2: What is the difference between `exports` and `module.exports`? What causes the classic "empty object" export bug?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[CommonJS]` `[Exports]` `[Gotcha]`

**Answer:**
Inside the CJS wrapper function, `exports` is simply a reference pointing to `module.exports`:
```javascript
var module = { exports: {} };
var exports = module.exports; // Reference to same memory object
```

- When you add properties to `exports` (`exports.foo = 123`), you are mutating the shared object.
- When `require()` returns, it returns `module.exports`, **NOT** `exports`.

#### The Bug:
```javascript
// BUG: Reassigning exports breaks the reference link!
exports = function calculateTotal() {
  return 100;
};
```
When another file calls `require('./calculator')`, it receives an **empty object `{}`**! Why? Because reassigning `exports` merely pointed the local variable `exports` to a new function; `module.exports` remained pointing to the original empty object `{}`.

#### The Fix:
```javascript
// Always assign directly to module.exports when exporting a function, class, or primitive
module.exports = function calculateTotal() {
  return 100;
};
```

---

## 2. ECMAScript Modules (ESM) Architecture

### Q3: How does the ESM module lifecycle fundamentally differ from CommonJS?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ESM]` `[V8]` `[Lifecycle]`

**Answer:**
CommonJS is **dynamic, synchronous, and evaluated upon execution**. `require()` statements can appear inside `if` statements or loops.

ECMAScript Modules (ESM) are **static, asynchronous, and executed in three distinct, decoupled phases**:

```text
┌─────────────────────────────────────────────────────────┐
│ 1. Construction (Parsing):                              │
│    Finds all import statements, downloads/reads files,  │
│    and builds the Module Record dependency graph.       │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│ 2. Instantiation:                                       │
│    Allocates memory locations for all exports/imports   │
│    and wires them together via Live Bindings.           │
│    (NO JavaScript code has executed yet!)               │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│ 3. Evaluation:                                          │
│    V8 executes top-level code; populates memory slots.  │
└─────────────────────────────────────────────────────────┘
```

#### Key Differences:
1. **Static Analysis & Tree-Shaking:** Because imports/exports are parsed before code runs, bundlers (esbuild, rollup) can eliminate unused exports with 100% safety.
2. **Live Bindings vs Value Copies:** In CJS, `module.exports` copies or passes the object reference at that moment. In ESM, imported variables are **live bindings** (pointers to the exporter's memory slot). If the exporting module updates the variable, the importer sees the new value immediately.
3. **Asynchronous Loading:** ESM supports network URLs and asynchronous top-level `await`.

---

### Q4: Why don't `__dirname` and `__filename` exist in ESM, and what is the modern replacement in Node.js?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical / Coding  
**Tags:** `[ESM]` `[Paths]` `[Modern]`

**Answer:**
`__dirname` and `__filename` were parameters injected by CommonJS's wrapper function. In ESM, there is no CJS wrapper function; code runs in the standard ECMAScript module environment.

#### Legacy ESM Workaround (Node 12–18):
```javascript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

#### Modern Standard Idiom (Node 20.11+ & Node 22+):
Node.js added native properties directly to `import.meta`:
```javascript
// Native in modern Node.js!
console.log(import.meta.filename); // Equivalent to __filename
console.log(import.meta.dirname);  // Equivalent to __dirname
console.log(import.meta.url);      // file:///path/to/module.js
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is top-level `await`, and what danger does it introduce to the application startup?"  
*Senior Answer:* In ESM, you can write `await db.connect()` directly at the top level of a module outside of any function. While convenient, it causes that module and any module importing it to pause evaluation until the promise resolves. If a dependency's top-level await hangs (e.g., waiting for an unreachable external network host), the entire application bootstrap hangs silently without throwing an error.

---

## 3. CJS ↔ ESM Interoperability Pitfalls & Dual-Package Hazards

### Q5: Why can you `import` CommonJS into ESM, but you cannot synchronously `require()` ESM in CommonJS (prior to Node 22)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Interop]` `[ESM]` `[CommonJS]`

**Answer:**
- **ESM importing CJS:** Works seamlessly because CJS is synchronous. ESM's asynchronous loader can synchronously call CJS's `require()` loader and wrap the returned `module.exports` into an ESM module record.
- **CJS `require()`ing ESM:** Historically failed with `ERR_REQUIRE_ESM`. Why? Because ESM modules can contain **top-level `await`**, making ESM evaluation inherently **asynchronous**. `require()` is fundamentally a **synchronous** function; it cannot block the V8 call stack waiting for an asynchronous Promise to settle without violating JavaScript run-to-completion semantics.

#### How to consume ESM from CommonJS:
```javascript
// In CommonJS: Must use dynamic asynchronous import()
async function loadEsmPackage() {
  const { default: chalk } = await import('chalk');
  console.log(chalk.blue('Hello ESM!'));
}
```

*Note on Node.js 22 LTS:* Node 22 introduced `--experimental-require-module` (and stabilized synchronous `require(esm)` when the targeted ESM file contains **no top-level `await`**). If top-level `await` is present, `require()` throws `ERR_REQUIRE_ASYNC_MODULE`.

---

### Q6: What is the "Dual-Package Hazard", and how does it create critical runtime state bugs?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Architecture]` `[Bundling]` `[DualPackageHazard]`

**Answer:**
When a library author publishes both CommonJS (`index.cjs`) and ESM (`index.mjs`) builds of the same package, an application or its transitive dependencies may load **both versions into memory at runtime**.

```text
App Code (ESM) ────────► loads package/index.mjs (Instance A)
                              ▲
Downstream Lib (CJS) ──► loads package/index.cjs (Instance B)
```

#### Catastrophic Consequences:
1. **Broken `instanceof` Checks:**
   ```javascript
   // If App catches an error created by Downstream Lib:
   error instanceof CustomError // Evaluates to FALSE!
   ```
   Because `CustomError` in `index.mjs` has a different prototype reference in memory than `CustomError` in `index.cjs`.
2. **Duplicated Singletons:**
   If the package holds internal state (e.g., an in-memory cache, connection registry, or metrics store), two distinct isolated instances exist simultaneously in the process, corrupting application state.

#### The Mitigation: The "CJS Wrapper" Pattern
The package author writes the single core implementation in CJS, and the ESM file simply re-exports the CJS module:
```javascript
// index.mjs
import cjsModule from './index.cjs';
export const { query, connect } = cjsModule;
export default cjsModule;
```
This guarantees only one singleton instance ever resides in memory.

---

## 4. Circular Dependencies in CJS vs ESM

### Q7: How does Node.js handle circular dependencies in CommonJS versus ESM? Predict the output of each.
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction  
**Tags:** `[CircularDependency]` `[CJS]` `[ESM]`

**Answer:**

#### Scenario A: CommonJS Circular Dependency
```javascript
// a.js
exports.loaded = false;
const b = require('./b.js');
exports.bLoaded = b.loaded;
exports.loaded = true;

// b.js
exports.loaded = false;
const a = require('./a.js');
exports.aLoaded = a.loaded; // What is a.loaded right now?
exports.loaded = true;

// main.js
const a = require('./a.js');
console.log('Result in CJS:', a.bLoaded, a.loaded);
```

**Output in CJS:**
```text
Result in CJS: true true
```
**Mechanism:**
When `b.js` requires `a.js`, `a.js` is already in `require.cache`. To prevent an infinite recursion loop, Node returns an **incomplete copy** of `a.js`'s current `exports` object (`{ loaded: false }`). `b.js` reads `a.loaded` as `false`, finishes, and exports `{ loaded: true, aLoaded: false }`.

#### Scenario B: ESM Circular Dependency with `const`
```javascript
// a.mjs
import { bVal } from './b.mjs';
export const aVal = 'A';
console.log('In A:', bVal);

// b.mjs
import { aVal } from './a.mjs';
export const bVal = 'B';
console.log('In B:', aVal);
```

**Output in ESM:**
```text
ReferenceError: Cannot access 'aVal' before initialization
```
**Mechanism:**
ESM uses **Live Bindings**. Memory slots for `aVal` and `bVal` are allocated during the Instantiation phase in the **Temporal Dead Zone (TDZ)**. During Evaluation, `b.mjs` runs first to evaluate `aVal`. Because `aVal` is declared with `const` and `a.mjs` has not reached its assignment expression yet, accessing `aVal` throws a `ReferenceError`!

---

## 5. Modern package.json Configuration & Subpath Exports

### Q8: How does the modern `package.json` `"exports"` field work, and how does it prevent unauthorized internal deep imports?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[package.json]` `[Exports]` `[Architecture]`

**Answer:**
Historically, any file in a package could be accessed via deep import:
`require('my-lib/dist/internal/private-helper')`.

The modern `"exports"` field in `package.json` acts as a strict encapsulation boundary. **Any file not explicitly declared in `"exports"` is completely inaccessible** to consumers (throws `ERR_PACKAGE_PATH_NOT_EXPORTED`).

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
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js",
      "require": "./dist/client.cjs"
    },
    "./package.json": "./package.json"
  }
}
```

#### Order Matters in Conditional Exports:
Node.js matches conditions in the order they are defined in the object. Always specify `"types"` first (for TypeScript), followed by `"import"`, `"require"`, and `"default"` as the fallback.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: Can an ESM file import JSON directly without special syntax in modern Node.js?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ESM]` `[JSON]` `[ImportAttributes]`

**Answer:**
No. Direct `import data from './data.json'` throws an error because of MIME type security checks. You must specify **Import Attributes** (formerly Import Assertions):
```javascript
// Modern Node 18.20+ / Node 20+ syntax:
import data from './data.json' with { type: 'json' };
```

---

### Q10: How do you mock ESM modules in unit tests compared to CommonJS?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Testing]` `[Mocking]`

**Answer:**
- In CommonJS, you could manipulate `require.cache['/path/to/module.js'] = { exports: mockObj }` or use libraries like `proxyquire`.
- In ESM, the module registry is internal to V8 and immutable once instantiated. You cannot mutate live bindings. You must use loader hooks (`module.register()`), module-level test mocks (e.g., `test.mock.module` in Node's native test runner or `vi.mock()` in Vitest), or dependency injection.
