# 🎯 JavaScript Interview Master Index & Table of Contents

> **Comprehensive, production-grade JavaScript interview preparation guide** covering JavaScript engine internals (V8/SpiderMonkey/JSC, JIT compilation, Hidden Classes, Inline Caches), memory allocation, generational garbage collection (Scavenge, Mark-Sweep-Compact, Orinoco), the Event Loop (Call Stack, Microtask/Macrotask queues, frame rendering, starvation), closures, `this` context, prototypes, asynchronous concurrency, functional programming (transducers, monads, currying, async memoization), language-specific implementational caveats (array holes, sort quirks, destructuring traps, regex statefulness, parameter scopes, serialization quirks), modern ECMAScript standards (ES6 through ES2026+), bundlers & tree-shaking, and an exhaustive deep dive into **Browser Web Platform Features** (Storage APIs, IndexedDB, OPFS, Cache Storage, Chrome DevTools Memory Panel, Heap Snapshots, detached DOM leaks, Critical Rendering Path, Observers, Web Workers, and Web Security).

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Link | Target Qs | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **00** | **Table of Contents** | Master Index, Role-Based Learning Tracks & Question Format Standard | [Read Index →](00-table-of-contents.md) | Index | 🎯 Ready |
| **01** | **Engine Internals & JIT Compilation** | V8 Pipeline (Ignition, TurboFan, Sparkplug), AST, Hidden Classes/Shapes, Inline Caches (IC), De-optimizations | [Read Guide →](01-engine-internals-and-jit-compilation-qa.md) | 10 Qs | ✅ Ready |
| **02** | **Memory Allocation & Garbage Collection** | Stack vs Heap, V8 Generational GC, Scavenge, Mark-Sweep-Compact, Orinoco, WeakRef, FinalizationRegistry | [Read Guide →](02-memory-allocation-and-garbage-collection-qa.md) | 10 Qs | ✅ Ready |
| **03** | **Execution Context, Scope & Closures** | Lexical/Variable Environment, Hoisting, TDZ, Scope Chains, Heap-Allocated Closures, Memory Retention Leaks | [Read Guide →](03-execution-context-scope-and-closures-qa.md) | 9 Qs | ✅ Ready |
| **04** | **Event Loop, Microtasks & Asynchrony** | Call Stack, Microtasks vs Macrotasks, Starvation, 60fps Frame Pipeline, rAF/rIC, Browser vs Node.js Event Loops | [Read Guide →](04-event-loop-microtasks-and-asynchrony-qa.md) | 8 Qs | ✅ Ready |
| **05** | **Types, Coercion, Equality & Serialization** | 8 Data Types, IEEE 754 Floats, `ToPrimitive` Coercion, `==` vs `===` vs `Object.is()`, `JSON.stringify` Serialization Quirks, `structuredClone` | [Read Guide →](05-types-coercion-equality-and-serialization-qa.md) | 8 Qs | ✅ Ready |
| **06** | **`this`, Prototypes & OOP JavaScript** | 4 Rules of `this`, Arrow Functions, Prototype Chain (`[[Prototype]]` vs `prototype`), ES6 Classes, `#private` Fields | [Read Guide →](06-this-prototypes-and-object-oriented-js-qa.md) | 7 Qs | ✅ Ready |
| **07** | **Promises, Async/Await & Concurrency** | Promises/A+ Specification, Combinators (`all`, `allSettled`, `race`, `any`), `AbortController`, Concurrency Limiters | [Read Guide →](07-promises-async-await-and-concurrency-qa.md) | 8 Qs | ✅ Ready |
| **08** | **Functional Patterns, Transducers & Monads** | HOFs, Pure Functions, Currying & Placeholders, Function Composition, Point-Free Traps, Transducers, Monadic Error Handling (`Result`/`Either`), Async Memoization with LRU | [Read Guide →](08-functional-patterns-transducers-and-monads-qa.md) | 7 Qs | ✅ Ready |
| **09** | **Objects, Iterables, Generators & Proxies** | Property Descriptors, Iteration Protocols, Generators (`function*`), Async Iterators, `Proxy` & `Reflect`, Structural Sharing (Immer Pattern), Well-Known Symbols | [Read Guide →](09-objects-iterables-generators-and-proxies-qa.md) | 6 Qs | ✅ Ready |
| **10** | **Collections, Array Internals & Modern JS** | `Map`/`Set` vs Objects, `WeakMap`/`WeakSet`, Sparse Arrays (Holes vs Undefined), `sort()` Default Comparator Trap, Mutating vs Copying Methods, Temporal API | [Read Guide →](10-collections-array-internals-and-modern-features-qa.md) | 7 Qs | ✅ Ready |
| **11** | **Language Quirks, Regex & Coding Caveats** | Parameter Scope vs Body Scope, Destructuring Traps (`null` vs `undefined`), Regex `/g` Statefulness & `lastIndex`, ReDoS, `finally` Return Hijacks, Custom Error Inheritance, Object Key Coercion | [Read Guide →](11-common-language-quirks-regex-and-coding-caveats-qa.md) | 13 Qs | ✅ Ready |
| **12** | **Modules, Bundlers & Tree-Shaking** | ESM vs CJS, Dual-Package Hazard, Dynamic Imports, Bundlers (Vite, Rollup, Webpack, Rspack), Tree-Shaking Mechanics (`sideEffects: false`) | [Read Guide →](12-modules-bundlers-and-tree-shaking-qa.md) | 6 Qs | ✅ Ready |
| **13** | **Browser Storage APIs & Offline Databases** | Storage Matrix: Cookies, `localStorage`, `sessionStorage`, `IndexedDB`, Cache Storage, OPFS, Quotas & Eviction | [Read Guide →](13-browser-storage-apis-and-offline-dbs-qa.md) | 7 Qs | ✅ Ready |
| **14** | **Browser Memory Profiling & Heap Analysis** | Chrome DevTools Memory Panel, Heap Snapshots, Shallow vs Retained Size, Detached DOM Leaks, Long Tasks & INP | [Read Guide →](14-browser-memory-profiling-and-heap-analysis-qa.md) | 7 Qs | ✅ Ready |
| **15** | **DOM Mechanics, Events & Browser APIs** | Critical Rendering Path (CRP), Layout Thrashing, Event Bubbling/Capturing, Observers (`Intersection`, `Resize`, `Mutation`), Web Workers | [Read Guide →](15-dom-events-observers-and-browser-apis-qa.md) | 8 Qs | ✅ Ready |
| **16** | **Web Security, Sandbox & Vulnerabilities** | XSS, CSRF, Content Security Policy (CSP), CORS Preflight, Prototype Pollution, In-Browser Token Storage | [Read Guide →](16-web-security-sandbox-and-vulnerabilities-qa.md) | 7 Qs | ✅ Ready |
| **17** | **Practical Coding, Polyfills & Gotchas** | Polyfills (`bind`, `Promise`, `deepClone`, `flat`), 25 Output Prediction Puzzles, Bug Hunts, RADIO Frontend Design | [Read Guide →](17-practical-coding-polyfills-and-gotchas-qa.md) | 14 Qs | ✅ Ready |

---

## 🎯 Question Schema Standard

Every question in this repository adheres strictly to this standardized format:

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation breaking down JavaScript engine mechanics, specifications, functional patterns, or browser platform internals. Accompanied by ASCII/Unicode mental model diagrams, comparison tables, and idiomatic, production-ready JavaScript code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Realistic edge-case challenge, production gotcha, or trap scenario]"  
*Senior Answer:* [How a staff engineer resolves the nuance with concrete mitigations, runtime mechanics, performance trade-offs, and architectural clarity.]
```

---

## 🧭 Role-Based Learning Tracks

Choose the preparation pathway tailored to your target engineering level:

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ROLE-BASED STUDY TRACKS                              │
├────────────────────────────────────────────────────────────────────────────────┤
│ 1. 🟢 Junior Core Mastery         ──▶  03 ─▶ 05 ─▶ 06 ─▶ 07 ─▶ 10 ─▶ 11 ─▶ 17  │
│ 2. 🟡 Mid-Level Production Track  ──▶  04 ─▶ 07 ─▶ 08 ─▶ 09 ─▶ 10 ─▶ 11 ─▶ 13  │
│ 3. 🔴 Senior & Staff Track        ──▶  01 ─▶ 02 ─▶ 04 ─▶ 08 ─▶ 11 ─▶ 14 ─▶ 17  │
│ 4. 🌐 Browser & Performance Lead  ──▶  04 ─▶ 12 ─▶ 13 ─▶ 14 ─▶ 15 ─▶ 16 ─▶ 17  │
│ 5. 💻 Functional & Polyfill Track ──▶  06 ─▶ 07 ─▶ 08 ─▶ 09 ─▶ 10 ─▶ 11 ─▶ 17  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 1. 🟢 Junior Core Mastery Track
- **Focus:** Foundations, variable scoping, data types, type coercion, equality semantics, `this` rules, basic async promises, array manipulations, destructuring, and language gotchas.
- **Recommended Modules:**
  - [`03-execution-context-scope-and-closures-qa.md`](03-execution-context-scope-and-closures-qa.md)
  - [`05-types-coercion-equality-and-serialization-qa.md`](05-types-coercion-equality-and-serialization-qa.md)
  - [`06-this-prototypes-and-object-oriented-js-qa.md`](06-this-prototypes-and-object-oriented-js-qa.md)
  - [`07-promises-async-await-and-concurrency-qa.md`](07-promises-async-await-and-concurrency-qa.md)
  - [`10-collections-array-internals-and-modern-features-qa.md`](10-collections-array-internals-and-modern-features-qa.md)
  - [`11-common-language-quirks-regex-and-coding-caveats-qa.md`](11-common-language-quirks-regex-and-coding-caveats-qa.md)
  - [`17-practical-coding-polyfills-and-gotchas-qa.md`](17-practical-coding-polyfills-and-gotchas-qa.md)

### 2. 🟡 Mid-Level Production Engineering Track
- **Focus:** The event loop, microtask execution order, error handling in async/await, functional pipelines, generators, iterables, bundlers (ESM vs CJS), browser storage APIs, DOM events, and bubbling.
- **Recommended Modules:**
  - [`04-event-loop-microtasks-and-asynchrony-qa.md`](04-event-loop-microtasks-and-asynchrony-qa.md)
  - [`07-promises-async-await-and-concurrency-qa.md`](07-promises-async-await-and-concurrency-qa.md)
  - [`08-functional-patterns-transducers-and-monads-qa.md`](08-functional-patterns-transducers-and-monads-qa.md)
  - [`09-objects-iterables-generators-and-proxies-qa.md`](09-objects-iterables-generators-and-proxies-qa.md)
  - [`10-collections-array-internals-and-modern-features-qa.md`](10-collections-array-internals-and-modern-features-qa.md)
  - [`11-common-language-quirks-regex-and-coding-caveats-qa.md`](11-common-language-quirks-regex-and-coding-caveats-qa.md)
  - [`12-modules-bundlers-and-tree-shaking-qa.md`](12-modules-bundlers-and-tree-shaking-qa.md)
  - [`13-browser-storage-apis-and-offline-dbs-qa.md`](13-browser-storage-apis-and-offline-dbs-qa.md)
  - [`15-dom-events-observers-and-browser-apis-qa.md`](15-dom-events-observers-and-browser-apis-qa.md)

### 3. 🔴 Senior & Staff Engine Internals Track
- **Focus:** V8 architecture, JIT compilation, Hidden Classes (Shapes), Inline Caching (IC), de-optimizations, generational GC (Scavenge vs Mark-Sweep-Compact), Orinoco concurrent GC, microtask starvation, transducers, parameter scopes, heap dump analysis, detached DOM leaks, web security (CSP, CSRF, Prototype Pollution), and system design.
- **Recommended Modules:**
  - [`01-engine-internals-and-jit-compilation-qa.md`](01-engine-internals-and-jit-compilation-qa.md)
  - [`02-memory-allocation-and-garbage-collection-qa.md`](02-memory-allocation-and-garbage-collection-qa.md)
  - [`04-event-loop-microtasks-and-asynchrony-qa.md`](04-event-loop-microtasks-and-asynchrony-qa.md)
  - [`08-functional-patterns-transducers-and-monads-qa.md`](08-functional-patterns-transducers-and-monads-qa.md)
  - [`11-common-language-quirks-regex-and-coding-caveats-qa.md`](11-common-language-quirks-regex-and-coding-caveats-qa.md)
  - [`12-modules-bundlers-and-tree-shaking-qa.md`](12-modules-bundlers-and-tree-shaking-qa.md)
  - [`14-browser-memory-profiling-and-heap-analysis-qa.md`](14-browser-memory-profiling-and-heap-analysis-qa.md)
  - [`16-web-security-sandbox-and-vulnerabilities-qa.md`](16-web-security-sandbox-and-vulnerabilities-qa.md)
  - [`17-practical-coding-polyfills-and-gotchas-qa.md`](17-practical-coding-polyfills-and-gotchas-qa.md)

### 4. 🌐 Browser Specialist & Web Platform Track
- **Focus:** Complete mastery of web platform APIs: Cookies, LocalStorage, IndexedDB auto-commit mechanics, Origin Private File System (OPFS), Cache Storage, Chrome DevTools Memory Panel, Heap Snapshots, Critical Rendering Path (CRP), Layout Thrashing, Observers (`Intersection`, `Resize`, `Mutation`), Web Workers, Transferables, and Web Security.
- **Recommended Modules:**
  - [`04-event-loop-microtasks-and-asynchrony-qa.md`](04-event-loop-microtasks-and-asynchrony-qa.md)
  - [`12-modules-bundlers-and-tree-shaking-qa.md`](12-modules-bundlers-and-tree-shaking-qa.md)
  - [`13-browser-storage-apis-and-offline-dbs-qa.md`](13-browser-storage-apis-and-offline-dbs-qa.md)
  - [`14-browser-memory-profiling-and-heap-analysis-qa.md`](14-browser-memory-profiling-and-heap-analysis-qa.md)
  - [`15-dom-events-observers-and-browser-apis-qa.md`](15-dom-events-observers-and-browser-apis-qa.md)
  - [`16-web-security-sandbox-and-vulnerabilities-qa.md`](16-web-security-sandbox-and-vulnerabilities-qa.md)
  - [`17-practical-coding-polyfills-and-gotchas-qa.md`](17-practical-coding-polyfills-and-gotchas-qa.md)

### 5. 💻 Functional Programming, Polyfill & Gotchas Track
- **Focus:** High-frequency interview coding challenges: handcrafting polyfills (`Function.prototype.bind`, `Promise`, `deepClone`, `Array.prototype.flat`), transducers, currying with placeholders, solving the 25 most tricky output-prediction gotchas, parameter scope traps, and regex ReDoS debugging drills.
- **Recommended Modules:**
  - [`06-this-prototypes-and-object-oriented-js-qa.md`](06-this-prototypes-and-object-oriented-js-qa.md)
  - [`07-promises-async-await-and-concurrency-qa.md`](07-promises-async-await-and-concurrency-qa.md)
  - [`08-functional-patterns-transducers-and-monads-qa.md`](08-functional-patterns-transducers-and-monads-qa.md)
  - [`09-objects-iterables-generators-and-proxies-qa.md`](09-objects-iterables-generators-and-proxies-qa.md)
  - [`10-collections-array-internals-and-modern-features-qa.md`](10-collections-array-internals-and-modern-features-qa.md)
  - [`11-common-language-quirks-regex-and-coding-caveats-qa.md`](11-common-language-quirks-regex-and-coding-caveats-qa.md)
  - [`17-practical-coding-polyfills-and-gotchas-qa.md`](17-practical-coding-polyfills-and-gotchas-qa.md)
