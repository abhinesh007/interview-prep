# 📋 JavaScript Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise JavaScript interview Question & Answer guide in `/Users/abhineshgour/learning-space/abhi-agy/interview-prep/interview-guides/javascript`.  
> Spanning runtime engine mechanics (V8/SpiderMonkey/JSC, JIT compilation, hidden classes, inline caching), memory allocation and GC generational heuristics, event loop task queues (microtasks, macrotasks, starvation), execution contexts, closures, prototypes, asynchronous concurrency, functional programming paradigms (transducers, monads, currying, async memoization), language-specific implementational caveats (array holes, sort quirks, destructuring traps, regex statefulness, parameter scopes, serialization quirks), modern ECMAScript features (ES6 through ES2026+), modular architecture, and an extensive deep-dive into **Browser Web Platform Features** (Storage APIs, IndexedDB, OPFS, Cache Storage, memory heap profiling, detached DOM leaks, DevTools, Web Workers, Observers, security boundaries, and bundler/tree-shaking mechanics).

---

## 🎯 Design Principles & Structure

Every question in the guide adheres strictly to the repository standards defined in [`CONTEXT.md`](../CONTEXT.md) and [`TEMPLATES.md`](../TEMPLATES.md):

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

### Five Mandatory Question Archetypes:
- 📖 **Conceptual & Deep-Dive:** Engine compilation stages, hidden classes/shapes, generational GC algorithms, scope chain activation objects, event loop turn mechanics, browser critical rendering path.
- 💻 **Practical Coding & Refactoring:** Handcrafting polyfills (`Promise`, `bind`, `deepClone`, `debounce`, `throttle`, `flatten`), writing custom async concurrency limiters, transducers, currying with placeholders, LRU memoizers, and reactive observable proxies.
- 🧩 **Output & Behavior Prediction:** Complex microtask/macrotask interleaving puzzles, closure staleness, loose equality type coercion traps, regex `lastIndex` statefulness, prototype shadowing, `this` context loss, default parameter scope traps.
- 🐛 **Debug & Bug Hunting:** Production memory leaks (detached DOM nodes, uncleaned event listeners, circular references with closures), IndexedDB transaction auto-commit bugs, array `sort()` alphabetic crashes, unhandled promise rejections, race conditions.
- 🏗️ **System Design & Web Architecture:** Offline-first state synchronization with IndexedDB & Web Workers, 60fps virtualized windowing lists, client-side telemetry SDK with zero main-thread impact, microfrontends bundle sharing.

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|:---:|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation Index, Topic Matrix, Difficulty Breakdown & Study Tracks | Index |
| `01` | [`01-engine-internals-and-jit-compilation-qa.md`](01-engine-internals-and-jit-compilation-qa.md) | V8 Pipeline (Ignition, TurboFan, Sparkplug), AST, Hidden Classes/Shapes, Inline Caches (IC), De-optimizations | 18–22 |
| `02` | [`02-memory-allocation-and-garbage-collection-qa.md`](02-memory-allocation-and-garbage-collection-qa.md) | Stack vs Heap, V8 Generational GC, Scavenge, Mark-Sweep-Compact, Orinoco, WeakRef, FinalizationRegistry | 18–22 |
| `03` | [`03-execution-context-scope-and-closures-qa.md`](03-execution-context-scope-and-closures-qa.md) | Lexical/Variable Environment, Hoisting, TDZ, Scope Chains, Heap-Allocated Closures, Memory Retention Leaks | 20–24 |
| `04` | [`04-event-loop-microtasks-and-asynchrony-qa.md`](04-event-loop-microtasks-and-asynchrony-qa.md) | Call Stack, Microtasks vs Macrotasks, Starvation, 60fps Frame Pipeline, rAF/rIC, Browser vs Node.js Event Loops | 20–25 |
| `05` | [`05-types-coercion-equality-and-serialization-qa.md`](05-types-coercion-equality-and-serialization-qa.md) | 8 Data Types, IEEE 754 Floats, `ToPrimitive` Coercion, `==` vs `===` vs `Object.is()`, `JSON.stringify` Serialization Quirks, `structuredClone` Limits, Object Freezing | 20–24 |
| `06` | [`06-this-prototypes-and-object-oriented-js-qa.md`](06-this-prototypes-and-object-oriented-js-qa.md) | 4 Rules of `this`, Arrow Functions, Prototype Chain (`[[Prototype]]` vs `prototype`), ES6 Classes, `#private` Fields | 18–22 |
| `07` | [`07-promises-async-await-and-concurrency-qa.md`](07-promises-async-await-and-concurrency-qa.md) | Promises/A+ Specification, Combinators (`all`, `allSettled`, `race`, `any`), `AbortController`, Concurrency Limiters | 20–24 |
| `08` | [`08-functional-patterns-transducers-and-monads-qa.md`](08-functional-patterns-transducers-and-monads-qa.md) | HOFs, Pure Functions, Currying & Partial Application, Function Composition, Point-Free Traps, Transducers, Monadic Error Handling (`Result`/`Either`), Async Memoization with LRU, Trampolining | 20–25 |
| `09` | [`09-objects-iterables-generators-and-proxies-qa.md`](09-objects-iterables-generators-and-proxies-qa.md) | Property Descriptors, Iteration Protocols, Generators (`function*`), Async Iterators, `Proxy` & `Reflect`, Structural Sharing (Immer Pattern), Well-Known Symbols | 18–22 |
| `10` | [`10-collections-array-internals-and-modern-features-qa.md`](10-collections-array-internals-and-modern-features-qa.md) | `Map`/`Set` vs Objects, `WeakMap`/`WeakSet`, Sparse Arrays (Holes vs Undefined), `sort()` Default Comparator Trap, In-Place Mutating vs Copying Array Methods, `reduce()` Traps, Temporal API | 20–24 |
| `11` | [`11-common-language-quirks-regex-and-coding-caveats-qa.md`](11-common-language-quirks-regex-and-coding-caveats-qa.md) | Parameter Scope vs Body Scope, Destructuring Traps (`null` vs `undefined`), Regex `/g` Statefulness & `lastIndex`, ReDoS, `finally` Return Hijacks, Custom Error Inheritance, Property Key Coercion & Enumeration Order, `Object.assign` vs Spread | 20–25 |
| `12` | [`12-modules-bundlers-and-tree-shaking-qa.md`](12-modules-bundlers-and-tree-shaking-qa.md) | ESM vs CJS, Dual-Package Hazard, Dynamic Imports, Bundlers (Vite, Rollup, Webpack, Rspack), Tree-Shaking Mechanics (`sideEffects: false`) | 18–22 |
| `13` | [`13-browser-storage-apis-and-offline-dbs-qa.md`](13-browser-storage-apis-and-offline-dbs-qa.md) | Storage Matrix: Cookies, `localStorage`, `sessionStorage`, `IndexedDB`, Cache Storage, OPFS, Quotas & Eviction | 20–24 |
| `14` | [`14-browser-memory-profiling-and-heap-analysis-qa.md`](14-browser-memory-profiling-and-heap-analysis-qa.md) | Chrome DevTools Memory Panel, Heap Snapshots, Shallow vs Retained Size, Detached DOM Leaks, Long Tasks & INP | 18–22 |
| `15` | [`15-dom-events-observers-and-browser-apis-qa.md`](15-dom-events-observers-and-browser-apis-qa.md) | Critical Rendering Path (CRP), Layout Thrashing, Event Bubbling/Capturing, Observers (`Intersection`, `Resize`, `Mutation`), Web Workers, Cross-tab Comms | 18–22 |
| `16` | [`16-web-security-sandbox-and-vulnerabilities-qa.md`](16-web-security-sandbox-and-vulnerabilities-qa.md) | XSS, CSRF, Content Security Policy (CSP), CORS Preflight, Prototype Pollution, In-Browser Token Storage | 16–20 |
| `17` | [`17-practical-coding-polyfills-and-gotchas-qa.md`](17-practical-coding-polyfills-and-gotchas-qa.md) | Polyfills (`bind`, `Promise`, `deepClone`, `flat`), 25 Output Prediction Puzzles, Bug Hunts, RADIO Frontend Design | 24–28 |

---

## 📑 Detailed Section Specifications

---

### 📄 `01-engine-internals-and-jit-compilation-qa.md` — Engine Internals, JIT Compilation & AST Pipeline (18–22 Questions)
> **Core Theme:** Architecture of modern JavaScript engines (Google V8, Mozilla SpiderMonkey, Apple JavaScriptCore), the Just-In-Time (JIT) compilation model, abstract syntax trees, hidden classes, inline caches, and optimization bailouts.

```text
Source Code ──> Scanner (Tokens) ──> Parser (AST) ──> Ignition (Bytecode)
                                                               │
                                                       Type Feedback Vector
                                                               │
                                                               ▼
Machine Code <── TurboFan (Optimized Compiler) <── Hot Functions (Sparkplug / Profiler)
     │
     └──> [Type Mismatch] ──> Deoptimization (Bailout) ──> Revert to Ignition
```

#### 1. Engine Architecture & The Compilation Pipeline
- Is JavaScript an interpreted or compiled language? Explain the modern Just-In-Time (JIT) hybrid execution model.
- Walk through the V8 engine lifecycle: Source Code $\rightarrow$ Scanner $\rightarrow$ Parser $\rightarrow$ Abstract Syntax Tree (AST) $\rightarrow$ Ignition (Bytecode) $\rightarrow$ Sparkplug $\rightarrow$ TurboFan (Optimized Machine Code).
- What role does the Parser play, and what is the difference between **Pre-parsing** (lazy parsing) vs **Full parsing** (eager parsing)? How do IIFEs trigger eager parsing?
- What is Bytecode, why does V8 compile AST to bytecode instead of directly emitting machine code, and how does bytecode minimize memory footprint on mobile devices?

#### 2. Hidden Classes (Shapes / Maps) and Transitions
- What are **Hidden Classes** (known as *Shapes* in SpiderMonkey or *Maps* in V8), and why does a dynamically typed language need them?
- How does adding properties to an object alter its hidden class? The Hidden Class Transition Tree and transition back-pointers.
- Why does initializing objects with properties in different orders (e.g. `{ a: 1, b: 2 }` vs `{ b: 2, a: 1 }`) create divergent hidden classes and double memory consumption?
- Why is using the `delete` operator considered an anti-pattern in high-performance JavaScript? (Shifting an object from fast shape mode to slow dictionary/hash mode).

#### 3. Inline Caches (IC) & Call Site Polymorphism
- What is an **Inline Cache (IC)**, and how does it speed up property accesses (`obj.foo`) from $O(\log n)$ dictionary lookups to single pointer offsets?
- The four states of an Inline Cache: **Uninitialized**, **Monomorphic** (1 shape observed), **Polymorphic** (2–4 shapes), and **Megamorphic** (>4 shapes / dictionary fallback).
- 🧩 **Output & Performance Prediction:** Benchmarking a hot function called with 1 object shape vs 5 different object shapes — explain the massive drop in throughput.
- What are **Type Feedback Vectors**, and how does TurboFan use speculative optimization based on observed runtime types?

#### 4. De-optimization (Bailouts) & JIT Anti-Patterns
- What causes a TurboFan optimization bailout (de-optimization)?
- The "Hot Loop Type Mutation" trap: What happens when an array of integers that TurboFan optimized for 32-bit integers (`Smi`) suddenly encounters a floating-point number or a string?
- Arguments object and leaking `arguments`: Why historical patterns like `[].slice.call(arguments)` prevented JIT inlining, and how ES6 rest parameters (`...args`) solved it.
- 🐛 **Bug Hunt:** A critical mathematical utility function is running 40x slower in production because of polymorphic parameter pass-through. Isolate and refactor.
- 🎯 **Quick-Fire Section:**
  - What is a `Smi` (Small Integer) vs a `HeapObject` in V8 pointer tagging?
  - What is Pointer Compression in 64-bit V8 runtimes, and how does it save 40% heap space?
  - Does JavaScript run bytecode in parallel across multiple CPU cores by default?

---

### 📄 `02-memory-allocation-and-garbage-collection-qa.md` — Memory Allocation, Lifecycles & Garbage Collection (18–22 Questions)
> **Core Theme:** Memory layout (Stack vs Heap), generational garbage collection heuristics, Cheney's scavenge copying algorithm, Mark-Sweep-Compact, concurrent/incremental GC (Orinoco), and weak references.

```text
V8 Heap Memory Layout:
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Young Generation                                │
│  ┌───────────────────────────┬───────────────────────────────────────────┐  │
│  │     From-Space (Nursery)  │             To-Space (Inactive)           │  │
│  └───────────────────────────┴───────────────────────────────────────────┘  │
│                     │ Survivors promoted after 2 rounds                     │
│                     ▼                                                       │
│                              Old Generation                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │   Old Pointer Space  │  Old Data Space  │  Large Object Space (LOS)   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Stack vs Heap Memory Layout
- What is the difference between Call Stack memory and Heap memory in JavaScript? Which values live on the stack and which on the heap?
- Value types vs Reference types: Why are primitive strings, symbols, and bigints often stored in the heap despite being immutable primitives?
- Object references: What happens in memory when an object is assigned to another variable (`const b = a`), and how does mutation affect both?
- What causes a `RangeError: Maximum call stack size exceeded` vs an `Out of Memory: JavaScript heap out of memory` crash?

#### 2. The Generational Hypothesis & Minor GC (Scavenger)
- What is the **Weak Generational Hypothesis**, and why is it the foundational premise of modern V8 garbage collection?
- Structure of the **Young Generation**: Nursery space vs Intermediate space, and the semi-space (From-Space and To-Space) model.
- How Cheney's Copying Algorithm operates during a **Minor GC (Scavenge)** cycle: Allocating into From-space, copying survivors to To-space, compacting sequentially, and swapping pointers.
- When and how are objects promoted (tenured) from the Young Generation to the Old Generation? (Surviving two GC cycles or filling >25% of To-space).

#### 3. Major GC: Mark-Sweep, Mark-Compact & Orinoco
- Why was the historical **Reference Counting** algorithm abandoned for Garbage Collection, and how did it fail on circular references?
- How does the **Mark-Sweep-Compact** algorithm work? (Reachability analysis from Root objects $\rightarrow$ Marking reachable objects $\rightarrow$ Sweeping dead memory to free-lists $\rightarrow$ Compacting fragmented memory).
- What are GC Roots in a JavaScript application? (Global window/globalThis, active execution context call stack, DOM tree, script source).
- The evolution of V8's **Project Orinoco**: How did V8 eliminate catastrophic "Stop-The-World" pauses using:
  - **Incremental Marking** (breaking marking into small slices interleaved with JS execution).
  - **Concurrent Marking & Sweeping** (worker threads mark/sweep memory while the main thread executes JS).
  - **Parallel Compacting** (multiple threads compact memory chunks simultaneously).

#### 4. Weak References & Resource Lifecycle APIs
- What is the fundamental difference between strong references and weak references in JavaScript?
- How does `WeakMap` allow garbage collection of keys, and why can only objects (and non-registered symbols) be keys in a `WeakMap`?
- Deep dive: `WeakRef` and `FinalizationRegistry`. When should they be used, and why does the TC39 specification warn against relying on them for program correctness?
- 💻 **Practical Coding:** Implement an automatic DOM Element Metadata Cache that associates expensive computed data with DOM nodes using `WeakMap` without leaking memory when nodes are removed.
- 🎯 **Quick-Fire Section:**
  - What is memory fragmentation, and why does Mark-Compact solve it?
  - Can developers explicitly invoke `window.gc()` in production web applications?
  - What is the Large Object Space (LOS) in V8, and why are large arrays never moved by the Scavenger?

---

### 📄 `03-execution-context-scope-and-closures-qa.md` — Execution Context, Scope Chains & Closures (20–24 Questions)
> **Core Theme:** Execution context creation vs execution phases, lexical vs variable environments, hoisting mechanics, the Temporal Dead Zone (TDZ), scope chain resolution, and the physical runtime mechanics of closures.

#### 1. Execution Context Anatomy
- What is an Execution Context? Explain the Global Execution Context (GEC), Function Execution Context (FEC), and `eval` Execution Context.
- The two distinct phases of an Execution Context:
  - **Creation Phase:** Setting up the Global Object, `this` binding, LexicalEnvironment, and VariableEnvironment.
  - **Execution Phase:** Line-by-line code execution, variable assignment, function invocation.
- What is an **Environment Record**? Declarative Environment Record vs Object Environment Record.

#### 2. Hoisting & The Temporal Dead Zone (TDZ)
- What is variable and function hoisting *under the hood*? Why is hoisting not the physical moving of code to the top of the file?
- Detailed comparison of declaration mechanics:
  - `function` declaration: Hoisted and fully initialized with function pointer.
  - `var`: Hoisted and initialized with `undefined`.
  - `let` and `const`: Hoisted into the Lexical Environment but left in an **Uninitialized** state.
- What is the **Temporal Dead Zone (TDZ)**? When does TDZ start and end for a variable?
- 🧩 **Output Prediction:** Accessing a `let` variable before declaration inside a function when a global variable of the same name exists — does it log the global value or throw a `ReferenceError`? Why?
- Function declarations vs Function expressions vs Arrow functions: How does hoisting treat each?

#### 3. Scope Chains & Lexical Resolution
- What is **Lexical Scope** (Static Scope), and how does it differ from Dynamic Scope?
- How is the Scope Chain constructed? The `[[Scopes]]` internal slot on function objects.
- Shadowing: How does variable shadowing work, and can an inner block-scoped variable shadow an outer `var`? What is illegal shadowing?
- 🐛 **Bug Hunt:** A function accesses an outer variable that is accidentally overwritten by an implicit global assignment (`count = 10` without declaration in non-strict mode).

#### 4. Closures Under the Hood
- What is a closure technically at the runtime engine level? How does V8 allocate closure scope variables on the heap (Context objects) instead of letting them die with the call stack frame?
- The Classic Loop Trap: Why does `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }` log `3, 3, 3`? Explain the 3 different ways to fix it (`let`, IIFE, `bind` / extra argument).
- How do closures cause unintentional memory retention? The "Shared Lexical Scope Leak" where a small closure retains a massive array because another unused closure in the same parent scope references it.
- 💻 **Practical Coding:** Implement a private variable encapsulation pattern using closures (a factory function providing getter/setter without exposing raw properties on the returned object).
- 🎯 **Quick-Fire Section:**
  - What is the difference between `undeclared`, `undefined`, and `null`?
  - Does an empty block `{}` create a new execution context?
  - How does `"use strict"` fundamentally alter execution context behavior?

---

### 📄 `04-event-loop-microtasks-and-asynchrony-qa.md` — The Event Loop, Task Queues & Asynchronous Scheduling (20–25 Questions)
> **Core Theme:** The concurrency model of JavaScript, Call Stack mechanics, Microtask Queue vs Macrotask Queue, Task starvation, browser frame rendering pipeline (`rAF`, layout, paint), and browser vs Node.js `libuv` event loops.

```text
======================= The Browser Event Loop Turn =======================
  ┌──────────────┐       1. Pick & execute ONE Task from Macrotask Queue
  │  Call Stack  │       2. Drain ENTIRE Microtask Queue (including nested microtasks)
  └──────┬───────┘       3. Check Rendering Opportunity (60Hz / 120Hz display refresh)
         │                  ├── run requestAnimationFrame (rAF) callbacks
         ▼                  ├── Recalculate Styles & Layout (Reflow)
  ┌──────────────┐          └── Paint
  │  Microtasks  │       4. Run requestIdleCallback (if idle time remains in frame)
  │ (Drain ALL)  │       5. Repeat!
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Macrotasks  │
  │ (Execute 1)  │
  └──────────────┘
```

#### 1. The Concurrency Model & Task Queues
- JavaScript is single-threaded. How does it handle asynchronous I/O and timers without blocking execution?
- What constitutes a **Macrotask** (Task Queue)? (`setTimeout`, `setInterval`, `setImmediate`, I/O operations, UI events, `MessageChannel`).
- What constitutes a **Microtask**? (`Promise.then/catch/finally`, `queueMicrotask`, `MutationObserver`).
- What is the exact execution algorithm of one turn of the Event Loop? (Execute 1 Macrotask $\rightarrow$ Drain Microtask Queue completely until empty $\rightarrow$ Rendering Pipeline $\rightarrow$ Next Macrotask).

#### 2. Microtask Starvation & UI Freezing
- What is **Microtask Starvation**? What happens to the browser UI and user input events if a microtask recursively enqueues another microtask indefinitely (`function loop() { queueMicrotask(loop); }`)?
- Why does a recursive `setTimeout` loop NOT starve the event loop, while a recursive `queueMicrotask` or `Promise.resolve().then()` loop completely freezes the browser tab?
- When should a developer intentionally use `queueMicrotask()` over `setTimeout(fn, 0)`?

#### 3. Browser Rendering Pipeline & Frame Timing
- How does the Event Loop coordinate with screen refresh rates (60Hz = 16.6ms per frame, 120Hz = 8.3ms per frame)?
- When does `requestAnimationFrame` (rAF) execute relative to microtasks and macrotasks? Why is `rAF` the only reliable way to schedule smooth visual animations?
- How does `requestIdleCallback` (rIC) work, what is the `deadline.timeRemaining()` API, and how does it prevent long-running background tasks from causing input lag?
- The Long Task Problem: What is defined as a "Long Task" by Chrome (>50ms), and how does it degrade **Interaction to Next Paint (INP)**?
- 💻 **Practical Coding:** Implement a non-blocking chunked array processor (`yieldToMain` using `scheduler.yield()` or `MessageChannel`) that processes 100,000 items without dropping frames.

#### 4. Browser Event Loop vs Node.js `libuv` Event Loop
- How does the Node.js event loop differ fundamentally from the browser event loop?
- Breakdown of the 6 phases of Node.js's `libuv` loop:
  1. Timers (`setTimeout`, `setInterval`)
  2. Pending callbacks (system I/O callbacks)
  3. Idle, Prepare (internal libuv operations)
  4. Poll (retrieving new I/O events)
  5. Check (`setImmediate` callbacks)
  6. Close callbacks (`socket.on('close')`)
- Where do `process.nextTick()` and Promises execute in Node.js? (The two intermediate microtask queues drained between every phase transition).
- 🧩 **Output & Interleaving Prediction:**
  ```javascript
  console.log('1');
  setTimeout(() => console.log('2'), 0);
  Promise.resolve().then(() => {
    console.log('3');
    queueMicrotask(() => console.log('4'));
  });
  requestAnimationFrame(() => console.log('5'));
  console.log('6');
  ```
  Predict the log order across environments and explain why.
- 🎯 **Quick-Fire Section:**
  - Why is `setTimeout(fn, 0)` clamped to a minimum delay of 4ms in nested calls?
  - Does `async/await` introduce any new queue to the event loop?
  - Can Web Workers access the main thread's event loop directly?

---

### 📄 `05-types-coercion-equality-and-serialization-qa.md` — Types, Coercion, Equality & Serialization Quirks (20–24 Questions)
> **Core Theme:** The 8 ECMAScript data types, IEEE 754 floating point arithmetic, abstract type coercion algorithms (`ToPrimitive`), equality semantics, `JSON.stringify` edge cases, `structuredClone` limitations, and object mutation protection.

#### 1. Data Types & IEEE 754 Floating-Point Mechanics
- What are the 8 data types in modern JavaScript? Identify the 7 primitives and the 1 reference type.
- Why does `typeof null === 'object'`? The historical 32-bit type tag bug in the original 1995 JavaScript engine.
- Why does `0.1 + 0.2 !== 0.3`? Deep dive into binary representation of fractions under IEEE 754 double-precision floating-point format (sign bit, exponent, mantissa).
- How to safely compare floats in financial/high-precision applications (`Number.EPSILON`, integer scaling, or BigInt / Decimal libraries).
- `BigInt`: Why can't BigInt and regular numbers be mixed in arithmetic operations? What are its serialization limitations (`JSON.stringify` throws a TypeError)?
- Math API Quirks: Why does `Math.max()` with no arguments return `-Infinity`, while `Math.min()` returns `Infinity`?

#### 2. Implicit & Explicit Type Coercion Under the Hood
- Walk through the ECMAScript `ToPrimitive` specification algorithm: How do the `hint` parameter ('number', 'string', 'default'), `Symbol.toPrimitive`, `valueOf`, and `toString` interact?
- The Binary Addition Operator (`+`): Why does `[] + []` evaluate to `""`, `[] + {}` evaluate to `"[object Object]"`, and `{} + []` evaluate to `0` (or `"[object Object]"` depending on statement parsing)?
- Numeric coercion: How do unary plus (`+`), `Number()`, `parseInt()`, and `parseFloat()` differ when parsing `"42px"`, `""`, `null`, and `undefined`?
- 🧩 **Output Prediction:** Predict results for:
  - `true + false`
  - `12 / "6"`
  - `"foo" + + "bar"`
  - `!+[]+!+[]`

#### 3. Equality Semantics: `==` vs `===` vs `Object.is()`
- The Abstract Equality Comparison Algorithm (`==`): How does coercion rule conversion between boolean, string, number, and object references?
- Why is `null == undefined` true, but `null === undefined` false, and why is `null >= 0` true while `null > 0` is false?
- What are the limitations of Strict Equality (`===`)? (Fails to distinguish `+0` from `-0`, and evaluates `NaN === NaN` to `false`).
- What is the `SameValue` algorithm implemented by `Object.is()`, and when is it required? (React state diffing algorithm `Object.is`).

#### 4. JSON Serialization & Deep Cloning Quirks
- The 6 Deadly Gotchas of `JSON.stringify`:
  1. Properties with values of `undefined`, functions, or symbols are completely omitted from objects.
  2. In arrays, `undefined`, functions, and symbols are converted to `null`.
  3. `NaN`, `Infinity`, and `-Infinity` are converted to `null`.
  4. Circular references throw `TypeError: Converting circular structure to JSON`.
  5. `BigInt` values throw `TypeError: Do not know how to serialize a BigInt`.
  6. `Map` and `Set` serialize to empty `{}` objects without custom replacers.
- How the `.toJSON()` method works on objects (e.g., `Date.prototype.toJSON` outputting an ISO string).
- Native `structuredClone()` vs `JSON.parse(JSON.stringify())`: What structuredClone can handle (Maps, Sets, Dates, Regex, circular references) and what throws a `DataCloneError` (Functions, DOM nodes, Error objects).
- `Object.freeze()` vs `Object.seal()` vs `Object.preventExtensions()`: Feature matrix and shallow freezing limitations.
- 💻 **Practical Coding:** Implement a custom JSON serializer replacer function that safely encodes `BigInt`, `Map`, `Set`, and `RegExp` values into serializable JSON and reconstitutes them via a reviver function.
- 🎯 **Quick-Fire Section:**
  - What does `void 0` evaluate to, and why was it traditionally used instead of `undefined`?
  - What is the result of `typeof NaN`?
  - What is the difference between shallow copy and deep copy regarding nested object references?

---

### 📄 `06-this-prototypes-and-object-oriented-js-qa.md` — `this` Context, Prototypes & Object-Oriented JavaScript (18–22 Questions)
> **Core Theme:** The 4 binding rules of `this`, lexical binding in arrow functions, prototypal inheritance under the hood (`[[Prototype]]` vs `prototype`), ES6 `class` compilation, `#private` brand checks, and subclassing internals.

#### 1. The `this` Keyword Resolution Mechanics
- What determines the value of `this` in JavaScript? Why is `this` determined by call-site invocation rather than definition location?
- The 4 Rules of `this` binding in order of precedence:
  1. `new` binding
  2. Explicit binding (`call`, `apply`, `bind`)
  3. Implicit binding (method invocation on an object context)
  4. Default binding (global object in sloppy mode, `undefined` in strict mode)
- Method borrowing and lost context: Why does passing an object method as a callback (e.g. `setTimeout(obj.handleClick, 100)`) lose its `this` binding?
- How does `Function.prototype.bind()` work under the hood, and can a function bound with `.bind()` be re-bound to a different context with another `.bind()` or `.call()`?

#### 2. Arrow Functions vs Regular Functions
- How does an Arrow Function handle `this`? What does it mean that arrow functions have **Lexical `this`** and no internal `[[Construct]]` method?
- What internal slots do arrow functions lack? (`this`, `arguments`, `super`, `new.target`, `prototype`).
- Why should arrow functions NEVER be used as object methods when referencing `this`, or as constructor functions with `new`?
- 🧩 **Output Prediction:** Evaluating `this` inside an arrow function nested inside a regular method of an object vs a method using an object literal declaration.

#### 3. Prototypes & Prototypal Inheritance Under the Hood
- What is the Prototype Chain? Demystify the difference between:
  - `func.prototype` (the blueprint object attached to constructor functions).
  - `obj.__proto__` (the deprecated accessor property exposing `[[Prototype]]`).
  - `Object.getPrototypeOf(obj)` (the standard specification method).
- What happens during property lookup (`obj.prop`)? Shadowing, prototype delegation, and terminating at `Object.prototype.__proto__ === null`.
- Why does modifying `Object.prototype` (monkey-patching) cause severe performance de-optimizations and prototype pollution vulnerabilities across the entire application?
- Why does invoking `Object.setPrototypeOf(obj, newProto)` destroy JIT inline cache optimizations on that object shape?

#### 4. ES6 Classes & Modern Object-Oriented Features
- Is the ES6 `class` keyword purely syntactic sugar? What does the engine do differently when instantiating a class vs calling a constructor function? (`class` cannot be called without `new`, class methods are non-enumerable, class bodies run in strict mode automatically).
- The `super()` call in derived classes: Why must `super()` be called before accessing `this` in a subclass constructor? (Derived constructors do not allocate `this`; the base constructor does).
- Modern Private Class Fields (`#field`): How do they differ from TypeScript's `private` keyword and closures? (Hard private encapsulation backed by engine PrivateSymbols and Brand Checks).
- 🐛 **Bug Hunt:** An event handler inside a class component is not bound, throwing `TypeError: Cannot read properties of undefined (reading 'setState')`. Refactor using class fields vs constructor binding.
- 🎯 **Quick-Fire Section:**
  - What does the `new` operator do step-by-step? (Create object $\rightarrow$ Link prototype $\rightarrow$ Bind `this` $\rightarrow$ Return object).
  - What is `new.target`?
  - What is the difference between `for...in` and `Object.keys()` regarding inherited prototype properties?

---

### 📄 `07-promises-async-await-and-concurrency-qa.md` — Asynchronous JavaScript, Promises & Concurrency Control (20–24 Questions)
> **Core Theme:** Promises/A+ state machine, reaction records, combinators (`all`, `allSettled`, `race`, `any`), `async`/`await` coroutine desugaring, request cancellation with `AbortController`, and enterprise concurrency throttling.

#### 1. Promise Architecture Under the Hood
- What is a Promise? Explain the 3 states of a Promise (`pending`, `fulfilled`, `rejected`) and why state transitions are irrevocable.
- The Promises/A+ Specification: How do `[[PromiseState]]`, `[[PromiseResult]]`, and `[[PromiseFulfillReactions]]` internal slots work?
- What is **Promise Chaining**, and what happens when a `.then()` callback returns a primitive value vs another pending Promise? (The Promise Resolution Procedure).
- Unhandled Promise Rejections: Why did older browsers swallow unhandled rejections, and how do modern engines handle `unhandledrejection` events?

#### 2. Promise Combinators: The Core Four
- Detailed comparative analysis of the four combinators:
  - `Promise.all`: Fail-fast mechanics, concurrency, and handling an empty iterable.
  - `Promise.allSettled`: Never rejects; returns status objects (`{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`).
  - `Promise.race`: First settled promise wins (whether fulfilled or rejected).
  - `Promise.any`: First fulfilled promise wins; rejects only if all reject, throwing an `AggregateError`.
- 🐛 **Bug Hunt:** An application uses `Promise.all` for fetching 5 non-critical dashboard widgets. One widget fails with a 500 error, causing the entire dashboard to render blank. Refactor to `Promise.allSettled` with graceful degradation.

#### 3. `async` / `await` Mechanics & Anti-Patterns
- What is `async/await` under the hood? How does the engine translate `async/await` into Generator functions wrapped in an auto-advancing coroutine runner?
- The Async Waterfall Anti-Pattern: Identifying sequential `await` calls inside loops that accidentally serialize independent network requests.
- When is returning `await myPromise` redundant vs when is it essential? (Tail-call optimization vs preserving stack traces inside `try/catch` blocks).
- How do `try/catch/finally` blocks interact with asynchronous rejections and early returns?

#### 4. Cancellation & Concurrency Management
- The `AbortController` and `AbortSignal` APIs:
  - Cancelling `fetch` requests mid-flight.
  - Removing event listeners automatically via `{ signal: controller.signal }`.
  - Composing signals with `AbortSignal.any([signal1, signal2])` and `AbortSignal.timeout(5000)`.
- 💻 **Practical Coding:** Implement an Asynchronous Concurrency Pooler (`pLimit(concurrency)`) from scratch that processes a queue of 50 promise-generating tasks with a maximum concurrency limit of $N$.
- 🎯 **Quick-Fire Section:**
  - What happens if you resolve a Promise with another Promise?
  - Can you cancel a native JavaScript Promise without `AbortController`?
  - Does an `async` function always return a Promise, even if it returns a non-promise primitive?

---

### 📄 `08-functional-patterns-transducers-and-monads-qa.md` — Functional Patterns, Transducers & Monads (20–25 Questions)
> **Core Theme:** Advanced functional programming in production JavaScript: Higher-order functions, pure functions, currying with placeholders, function composition, point-free style caveats, transducers (single-pass array processing), monadic error handling (`Result`/`Either`), async memoization with LRU, and call stack recursion management.

#### 1. Functional Foundations & The Point-Free Trap
- What is Tacit Programming (Point-Free Style), and what are its hidden hazards in JavaScript?
- The Infamous `['1', '2', '3'].map(parseInt)` Gotcha: Explain line-by-line why this outputs `[1, NaN, NaN]` (`map` passes 3 arguments: `element`, `index`, `array`; `parseInt` treats `index` as the radix base).
- Referential Transparency and Pure Functions: How to mathematically prove a JavaScript function is pure, and why side effects compromise concurrency and testability.

#### 2. Advanced Currying, Placeholders & Function Composition
- Currying vs Partial Application: Mathematical distinctions and memory characteristics.
- Currying with Placeholders: Implementing `curry` supporting placeholder arguments (`_`), e.g. `const sub = curry((a, b) => a - b); const subFrom10 = sub(10, _); subFrom10(3) === 7`.
- `pipe(...fns)` vs `compose(...fns)`: Implementing synchronous and asynchronous pipeline runners.
- 💻 **Practical Coding:** Write an asynchronous function pipeline (`pipeAsync`) that threads data through sync functions, async functions, and Promises in clean left-to-right syntax.

#### 3. Transducers: High-Performance Single-Pass Data Transformations
- The Chaining Problem: What is the memory and CPU overhead of `.map(f).filter(g).map(h)` on an array of 500,000 items? (Allocates 3 massive intermediate arrays and iterates the collection 3 times).
- What is a **Transducer**? How do composable reducing functions transform data in a single pass ($O(n)$ time with $O(1)$ intermediate array allocation)?
- Anatomy of a Transducer: Transformer protocol (`init`, `step`, `result`), `mapping` transducer, and `filtering` transducer.
- 💻 **Practical Coding:** Implement a native `transduce` utility without external libraries and benchmark it against chained array methods on 1,000,000 records.

#### 4. Monadic Error Handling & Advanced Memoization
- Why relying exclusively on `throw` and `try/catch` for control flow violates functional principles and creates un-type-checkable runtime bugs.
- Implementing the **Result Monad** (`Ok(value)` / `Err(error)`) or **Either Monad** in JavaScript for railway-oriented programming.
- The `Maybe` / `Option` Monad: Safe navigation and transformation of nullable data pipelines without nested `if (val != null)` guards.
- **Async Memoization with LRU Eviction & Stampede Prevention:**
  - Building a memoizer with a fixed capacity that evicts least-recently-used entries.
  - The Cache Stampede Problem: What happens when 100 concurrent requests call an un-cached async function simultaneously? How to cache the *Promise* itself rather than the resolved value to collapse concurrent calls into a single network execution.
- Recursion & Trampolining: How converting recursive functions into loops returning thunk functions prevents `RangeError: Maximum call stack size exceeded`.
- 🎯 **Quick-Fire Section:**
  - What is a Closure-based Thunk?
  - What is an Idempotent Function vs a Pure Function?
  - Does JavaScript perform automatic Tail Call Optimization (TCO) in modern V8 engines?

---

### 📄 `09-objects-iterables-generators-and-proxies-qa.md` — Objects, Iterables, Generators & Metaprogramming (18–22 Questions)
> **Core Theme:** Property descriptors and internal slots, the Iteration protocols, Generator functions (`function*`), Async Iterators, Metaprogramming with `Proxy` & `Reflect`, and structural sharing with Proxies (the Immer pattern).

#### 1. Property Descriptors & Object Internals
- What is a Property Descriptor? The 4 flags of Data Descriptors (`value`, `writable`, `enumerable`, `configurable`) and Accessor Descriptors (`get`, `set`, `enumerable`, `configurable`).
- Why is `configurable: false` the ultimate lock on a property? What mutations are still permitted when `configurable: false`? (Only changing `writable` from `true` to `false`).
- What is the difference between `in`, `hasOwnProperty`, and the modern `Object.hasOwn()`? Why should `obj.hasOwnProperty()` be avoided on user-supplied objects (`Object.create(null)`)?

#### 2. The Iteration Protocols
- The **Iterable Protocol**: What must an object implement to be iterable? (`[Symbol.iterator]()` method returning an Iterator).
- The **Iterator Protocol**: The `next()` method returning `{ value: any, done: boolean }`.
- What JavaScript constructs consume the Iterable protocol? (`for...of`, spread `[...iterable]`, `Array.from()`, `Promise.all()`, destructuring).
- Why are plain objects `{}` NOT iterable by default in JavaScript? (Ambiguity between iterating keys, values, or entries, and prototype properties).
- 💻 **Practical Coding:** Implement a custom `Range(start, end, step)` class that adheres to the Iterable protocol so it can be consumed by `for (const n of new Range(1, 10, 2))`.

#### 3. Generator Functions & Coroutines
- What are Generator functions (`function*`), and how does the `yield` keyword suspend and resume execution context?
- Bidirectional communication with Generators: Passing values *into* a generator via `generator.next(val)`.
- Error handling in generators: `generator.throw(err)` and cleaning up with `generator.return()` / `finally` blocks.
- **Async Iteration:** The `[Symbol.asyncIterator]()` protocol and `for await...of` loops. How are streams (e.g. Node.js readable streams or Web Fetch Streams) consumed as async iterables?

#### 4. Metaprogramming with `Proxy`, `Reflect` & Structural Sharing
- What is Metaprogramming? How does the `Proxy` object allow developers to intercept fundamental language operations (traps)?
- What is `Reflect`, and why should every Proxy trap delegate default behavior through the corresponding `Reflect` method (`Reflect.get`, `Reflect.set`)?
- Proxy Invariants: Why does ECMAScript forbid a Proxy from returning a forged value for a non-configurable, non-writable target property?
- **Under the Hood of Immer (Copy-on-Write with Proxies):**
  - How do modern immutable state libraries (like Immer) allow developers to write mutable state mutations (`state.user.age++`) while generating a perfectly frozen immutable tree with structural sharing?
  - Explaining the draft state Proxy, modified flag tracking, and shallow copying only the modified ancestor path.
- 💻 **Practical Coding:** Build a mini `produce(baseState, recipe)` function from scratch using `Proxy` that provides copy-on-write structural sharing for nested objects.
- 🎯 **Quick-Fire Section:**
  - What is a Revocable Proxy (`Proxy.revocable()`), and when should it be used for security?
  - What is the purpose of `Symbol.species`?
  - What is `Symbol.toPrimitive` and what are its three possible hint values?

---

### 📄 `10-collections-array-internals-and-modern-features-qa.md` — Collections, Array Internals & Modern ECMAScript (20–24 Questions)
> **Core Theme:** `Map`, `Set`, `WeakMap`, `WeakSet` vs traditional data structures, key equality algorithms (`SameValueZero`), array internal quirks (sparse array holes, sorting traps, mutating vs copying methods), and latest ECMAScript additions through ES2026+.

#### 1. Array Internals, Quirks & The Sparse Array Trap
- What is a **Sparse Array** (an array with "holes"), and how does the V8 engine store sparse arrays (Dictionary Elements) vs packed arrays (Fast Elements)?
- The `Array(3)` vs `[...Array(3)]` vs `Array.from({ length: 3 })` Trap:
  - Why does `Array(3).map(() => 1)` return `[empty × 3]` (does not execute callback)?
  - How array iteration methods (`forEach`, `map`, `filter`, `every`) skip empty slots (holes) entirely while including explicit `undefined`.
- The Default Comparator Trap in `Array.prototype.sort()`:
  - Why does `[10, 2, 5, 1].sort()` evaluate to `[1, 10, 2, 5]`? (Engine casts all elements to strings before sorting alphabetically!).
  - Writing proper numerical and locale-aware comparators (`(a, b) => a - b`, `a.localeCompare(b)`).

#### 2. In-Place Mutating Methods vs Immutable Copy Methods
- Categorizing native Array methods into:
  - **In-Place Mutators:** `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`.
  - **Non-Mutating Accessors:** `slice`, `concat`, `map`, `filter`, `flat`.
  - **Modern Immutable Copying Alternatives (ES2023):** `toSorted()`, `toReversed()`, `toSpliced()`, and `with(index, value)`.
- 🐛 **Bug Hunt:** An application sorts an array prop passed down to a child component using `items.sort()`, causing undetected state bugs in parent component rendering.
- `Array.prototype.reduce` Edge Cases:
  - What happens if `reduce` is called on an empty array without an `initialValue`? (Throws `TypeError: Reduce of empty array with no initial value`).
  - What happens if `reduce` is called on a 1-element array without an `initialValue`? (Returns the 1 element immediately without invoking the callback!).

#### 3. Advanced Collections: `Map`, `Set`, `WeakMap`, `WeakSet`
- `Map` vs Plain Object `{}`: Comprehensive comparison across key types (primitives vs objects), key ordering (insertion order), performance in frequent additions/deletions, size retrieval (`map.size`), and serialization.
- `Set` vs Array: Performance difference for membership testing (`set.has(x)` is $O(1)$ vs `array.includes(x)` is $O(n)$) and uniqueness enforcement.
- Key Equality: How do `Map` and `Set` determine key equality? (The `SameValueZero` algorithm: treats `NaN === NaN` and `+0 === -0`).
- Modern Set Methods (ES2024): `set.intersection()`, `set.union()`, `set.difference()`, `set.symmetricDifference()`, `set.isSubsetOf()`.
- Ephemerons under the hood: Why `WeakMap` and `WeakSet` cannot be iterated, lack `.size`, and allow garbage collection of keys.

#### 4. The Modern ECMAScript Horizon (ES2020 to ES2026+)
- Safe property verification: `Object.hasOwn(obj, prop)` vs `Object.prototype.hasOwnProperty`.
- Array grouping: `Object.groupBy(iterable, fn)` and `Map.groupBy(iterable, fn)`.
- Top-level `await` in modules: Evaluation order and dependency graph impact.
- `Array.fromAsync()`: Mapping over async iterables and promise streams.
- The **Temporal API** (replacing the broken `Date` object):
  - Why `Date` is notorious (zero-based months, UTC parsing quirks, mutable methods).
  - How `Temporal.Instant`, `Temporal.ZonedDateTime`, and `Temporal.PlainDate` solve timezone arithmetic cleanly.
- 🎯 **Quick-Fire Section:**
  - What is the difference between `for...in` and `for...of`?
  - Does `Map` maintain insertion order?
  - What is `Array.prototype.at()` and how does it support negative indexing?

---

### 📄 `11-common-language-quirks-regex-and-coding-caveats-qa.md` — Common Language Quirks, Regex & Everyday Coding Caveats (20–25 Questions)
> **Core Theme:** The most notorious language quirks, parameter scopes, destructuring pitfalls, regular expression statefulness, catastrophic backtracking (ReDoS), control-flow hijackings in `try/finally`, custom error subclassing, and object property traversal ordering.

#### 1. Scope Quirks: Parameter Scope vs Body Scope
- What happens when a function has default parameter values? Explain the **Intermediate Parameter Scope Environment**.
- The Parameter TDZ Trap: Why does `function foo(a = b, b = 2) {}` throw a `ReferenceError` when called without arguments?
- 🧩 **Output Prediction:** Parameter scope shadowing body scope:
  ```javascript
  let x = 1;
  function test(x, y = () => x) {
    var x = 2;
    console.log(x);
    console.log(y());
  }
  test(5);
  ```
  What is logged and why? (Prints `2` then `5` because `y` closes over the parameter `x`, not the body `x`!).

#### 2. Destructuring Traps & Default Value Quirks
- The `null` vs `undefined` Default Value Trap:
  - Why does `const { count = 10 } = { count: undefined }` assign `10`, while `const { count = 10 } = { count: null }` assigns `null`?
  - Default values trigger ONLY on `undefined`, NOT on `null`, `false`, `0`, or `""`.
- The Nested Destructuring Crash:
  - Why does `const { user: { address: { city } } } = data;` throw an uncaught `TypeError` if `data.user` is undefined?
  - How to provide defensive fallback defaults at every nesting level: `const { user: { address: { city } = {} } = {} } = data || {};`.
- Renaming and Default Values Simultaneously: The syntax gotcha `const { originalKey: aliasName = defaultValue } = obj;`.

#### 3. Regular Expression Gotchas & ReDoS
- The Statefulness Trap with the Global `/g` Flag:
  - Why does calling `.test()` twice consecutively on the same regex instance with `/g` toggle between `true` and `false`?
    ```javascript
    const regex = /foo/g;
    console.log(regex.test('foo')); // true
    console.log(regex.test('foo')); // false!
    ```
  - Explaining the `regex.lastIndex` internal pointer and how it persists across calls until it reaches the end and resets to `0`.
- Catastrophic Backtracking (Regular Expression Denial of Service - ReDoS):
  - How do nested quantifiers (e.g., `/(a+)+$/` on `"aaaaaaaaaaaaaaaaaaaaaaaaaaaa!"`) cause exponential CPU execution ($O(2^n)$), locking up the main thread indefinitely?
  - Defenses against ReDoS: avoiding nested quantifiers, setting regex execution timeouts, or using atomic groups / possessive quantifiers.

#### 4. Control Flow, Errors & Property Enumeration
- The `finally` Block Hijack Trap:
  - What happens when a `finally` block contains a `return` or `throw` statement?
  - Why does a `return` inside `finally` silently discard any pending `return` or unhandled `throw` from the `try` or `catch` blocks?
    ```javascript
    function test() {
      try {
        throw new Error('Fatal');
      } finally {
        return 'All good!'; // Swallows error completely!
      }
    }
    ```
- Subclassing `Error` Correctly in JavaScript:
  - Why does `class CustomError extends Error` lose its prototype chain or display `Error: message` instead of `CustomError: message` if not configured properly?
  - Properly setting `this.name = this.constructor.name` and capturing stack traces with `Error.captureStackTrace(this, this.constructor)`.
  - ES2022 Error Cause: Chaining root errors with `new Error('Failed', { cause: originalErr })`.
- Property Key Coercion & Enumeration Order:
  - Why does `const obj = {}; obj[{}] = 'a'; obj[{}] = 'b';` result in `obj['[object Object]'] === 'b'`?
  - What is the strict ES2015 specification for object key enumeration order in `for...in`, `Object.keys()`, and `JSON.stringify`? (1. Integer indices in ascending numeric order; 2. String keys in insertion order; 3. Symbols in insertion order).
- `Object.assign` vs Object Spread (`{ ...obj }`):
  - Why does `Object.assign(target, source)` trigger setters defined on `target`, whereas Object Spread uses `[[DefineOwnProperty]]` creating fresh properties without invoking setters?
- 🎯 **Quick-Fire Section:**
  - What is the difference between `break` and `continue` in labeled loops?
  - What happens if you forget a `break` in a `switch` statement (Fall-through behavior)?
  - Why does `parseInt(0.0000005)` return `5`? (Scientific notation `'5e-7'` coercion!).

---

### 📄 `12-modules-bundlers-and-tree-shaking-qa.md` — Modules, Bundlers, Tree-Shaking & Build Architecture (18–22 Questions)
> **Core Theme:** Script loading attributes, ESM vs CommonJS execution models, the dual-package hazard, dynamic imports, bundler mechanics (Webpack, Rollup, Vite, Rspack), tree-shaking algorithms, and source map architecture.

```text
Static ESM Graph:
  entry.js
  ├── import { a } from './math.js'  ──> math.js (exports a, b, c)
  └── import { greet } from './ui.js' ──> ui.js (exports greet)

Tree-Shaking (DCE):
  math.js:
  ├── export function a() { ... }  [RETAINED - Used by entry.js]
  ├── export function b() { ... }  [DROPPED - Dead Code]
  └── export function c() { ... }  [DROPPED - Dead Code]
```

#### 1. Script Loading & Browser Module Execution
- What is the difference between `<script>`, `<script async>`, `<script defer>`, and `<script type="module">`?
- Detailed timing diagram: When are scripts fetched and executed relative to HTML parsing and `DOMContentLoaded`?
- `<link rel="preload">` vs `<link rel="prefetch">` vs `<link rel="modulepreload">`: When to use each for optimizing asset delivery.

#### 2. ES Modules (ESM) vs CommonJS (CJS)
- Exhaustive comparative analysis:
  - **Syntax:** Static (`import`/`export`) vs Dynamic (`require()`/`module.exports`).
  - **Loading:** Asynchronous multi-phase loading (Parse $\rightarrow$ Instantiate $\rightarrow$ Evaluate) vs Synchronous runtime loading.
  - **Bindings:** Live read-only bindings in ESM vs Value copies/clones in CJS.
  - **Circular Dependencies:** How ESM handles circular dependencies via uninitialized live bindings vs CJS returning incomplete exports objects.
- The **Dual-Package Hazard**: What is it, why does loading both CJS and ESM versions of a singleton library cause dual state bugs in Node.js, and how to resolve it with `package.json` `exports` conditions.

#### 3. Modern Bundlers & Build Tool Architecture
- How do modern bundlers work? (Building the dependency graph $\rightarrow$ AST transformation $\rightarrow$ Bundle emission).
- Bundler Evolution:
  - **Webpack:** Historic plugin architecture, tapable hooks, chunking, code-splitting.
  - **Rollup:** Focused on ESM libraries, flat bundle output, superior tree-shaking.
  - **Vite:** Unbundled dev server powered by native browser ESM and ESBuild, bundling production with Rollup/Rolldown.
  - **Rspack & Turbopack:** Rust-based high-performance bundling engines solving enterprise build latency.

#### 4. Tree-Shaking & Dead Code Elimination (DCE)
- How does Tree-Shaking work under the hood? Why is static ESM syntax strictly required for tree-shaking to function?
- The `"sideEffects": false` flag in `package.json`: What does it tell the bundler, and what happens if a module containing global CSS imports is incorrectly flagged as side-effect free?
- Common Tree-Shaking Gotchas:
  - Babel or TypeScript transpiling ESM down to CJS *before* the bundler processes it.
  - Object namespace imports (`import * as utils from './utils'; utils.foo()`).
  - Top-level expressions that cannot be guaranteed pure by static analysis (e.g. `const x = fn()`).
- 💻 **Practical Coding:** Configure dynamic code-splitting and prefetching for heavy modules using native `import()` with webpack chunk names / Vite dynamic imports.
- 🎯 **Quick-Fire Section:**
  - What are Import Maps (`<script type="importmap">`), and how do they enable native ESM without bundlers?
  - What are Import Attributes / Assertions (`import data from './data.json' with { type: 'json' }`)?
  - How do Source Maps work, and why should production source maps never be exposed publicly?

---

### 📄 `13-browser-storage-apis-and-offline-dbs-qa.md` — Browser Storage APIs, Client-Side Databases & Offline Architecture (20–24 Questions)
> **Core Theme:** Comprehensive breakdown of browser storage mechanisms: Cookies, LocalStorage, SessionStorage, IndexedDB, Cache Storage, and the Origin Private File System (OPFS). Storage quotas, ACID transactions, and offline architectures.

| Storage Mechanism | Capacity | Access Model | Latency / Thread | Stored Data Types | Persistence / Eviction |
|---|---|---|---|---|---|
| **Cookies** | ~4 KB | Synchronous (Client & Server HTTP headers) | Main thread blocking | Strings only | Expire date / Session |
| **LocalStorage** | ~5–10 MB | Synchronous | Main thread blocking | Strings only | Persistent until cleared |
| **SessionStorage** | ~5 MB | Synchronous | Main thread blocking | Strings only | Tab close / Session |
| **IndexedDB** | Up to 80% disk | Asynchronous (Events / Promises) | Non-blocking / Worker | Structured Clones, Blobs, Files | Best-effort / Persistent |
| **Cache Storage** | Up to 80% disk | Asynchronous (Promises) | Non-blocking / Worker | Request / Response pairs | Best-effort / Persistent |
| **OPFS** | High disk | Async (Sync in Dedicated Workers) | Ultra-fast native FS | Raw Binary, Streams, SQLite | Managed by application |

#### 1. Cookies & Web Security Flags
- Anatomical breakdown of a cookie: Name, Value, `Domain`, `Path`, `Expires`/`Max-Age`.
- Security Flags:
  - `HttpOnly`: Mitigating cookie theft via XSS.
  - `Secure`: Restricting transmission to HTTPS.
  - `SameSite`: Comparing `Strict` vs `Lax` vs `None` and their role in preventing Cross-Site Request Forgery (CSRF).
- Cookie payload overhead: Why storing large amounts of data in cookies degrades HTTP request performance across all static asset requests on that domain.

#### 2. LocalStorage & SessionStorage Pitfalls
- Why is `localStorage` an anti-pattern for performance-critical, high-throughput web applications? (Synchronous disk I/O directly on the main UI thread causing jank and dropped frames).
- Storage capacity limits, quota errors (`QuotaExceededError`), and string serialization overhead (`JSON.stringify`).
- Cross-tab communication via the `storage` event: How updates in one browser tab trigger reactive sync in other open tabs on the same origin.
- `sessionStorage` scope: Why opening a link in a "New Tab" creates a completely separate session storage instance, and when data is cloned.

#### 3. IndexedDB Deep Dive & Transaction Mechanics
- Architecture of IndexedDB: Databases, Object Stores, Keys, Auto-increment, Primary Keys, and Indexes.
- Transactions in IndexedDB: `readonly` vs `readwrite` modes, concurrency guarantees, and ACID compliance.
- Cursors vs Key Ranges: Iterating through millions of records with `IDBKeyRange` (`bound`, `only`, `lowerBound`).
- **The IndexedDB Auto-Commit Trap:** Why do IndexedDB transactions automatically commit when the microtask queue empties? What happens if you run `await fetch()` inside an IndexedDB transaction? (Throws `TransactionInactiveError`).
- 💻 **Practical Coding:** Write an IndexedDB wrapper module (or using `idb`) supporting database version upgrades (`onupgradeneeded`), index queries, and transactional batch writes.

#### 4. Cache Storage API, OPFS & Quota Management
- The **Cache Storage API**: Managing Request/Response object pairs for Service Workers and offline-first PWA caching strategies.
- The **Origin Private File System (OPFS)**: What is it, why is it revolutionizing web apps (Figma, Photoshop Web, SQLite in browser), and how does `createWritable()` / `createSyncAccessHandle()` achieve near-native disk speeds inside Web Workers?
- Storage Quota and Eviction Policies:
  - Checking available quota with `navigator.storage.estimate()`.
  - Requesting durable storage with `navigator.storage.persist()`.
  - How the browser decides which origins to evict under low-disk memory pressure (Best-effort vs Persistent).
- 🎯 **Quick-Fire Section:**
  - Can Web Workers access `localStorage`? Why or why not?
  - Does Private / Incognito browsing mode change storage persistence rules?
  - What is the difference between structured cloning and JSON serialization in IndexedDB?

---

### 📄 `14-browser-memory-profiling-and-heap-analysis-qa.md` — Browser Performance Profiling, Memory Leaks & Heap Dumps (18–22 Questions)
> **Core Theme:** Diagnosing memory leaks using Chrome DevTools Memory Panel, Heap Snapshot analysis (Shallow vs Retained size), allocation timelines, detached DOM elements, and runtime profiling of Long Tasks and Core Web Vitals.

```text
GC Roots (Window, Stack, DOM)
       │
       ▼
 [Main Controller] ──(Strong Ref)──> [Closure Scope]
                                            │
                                            ▼
                                  [Detached HTMLDivElement]
                                  (Removed from active DOM,
                                  but retained in Heap!)
```

#### 1. DevTools Memory Panel: Tools & Perspectives
- The 3 Memory Profiling Modes in Chrome DevTools:
  1. **Heap Snapshot:** Point-in-time memory distribution graph.
  2. **Allocation instrumentation on timeline:** Visualizing memory allocation bursts over time (blue spikes) and GC reclamation (greyed spikes).
  3. **Allocation sampling:** Low-overhead profiling using sampling across thread execution.
- Heap Snapshot Perspectives: **Summary**, **Comparison** (diffing two snapshots), **Containment**, and **Statistics**.
- Demystifying **Shallow Size** vs **Retained Size**: Why can an object with a shallow size of 32 bytes have a retained size of 50 MB?
- What is **Distance** in a heap snapshot? (Shortest path of references from GC root to the object).

#### 2. The Retainer Tree & The 5 Deadliest SPA Memory Leaks
- How to read the **Retainers Pane** to isolate the root object preventing garbage collection.
- Leak 1: **Detached DOM Nodes:** What is a detached DOM node? How does a detached node keep an entire sub-tree of DOM elements and event handlers trapped in memory?
- Leak 2: **Forgotten Global & Window Event Listeners:** Failing to call `removeEventListener` when unmounting components in React, Vue, or Angular.
- Leak 3: **Uncleared Timers:** `setInterval` or recursive `setTimeout` holding closures over component instances.
- Leak 4: **Closure Scope Retention (The Meteor Leak):** How two closures sharing the same lexical parent environment retain memory even when only one closure is active.
- Leak 5: **Unbounded Caches & Event Emitters:** Global maps or pub-sub subjects accumulating state without TTL, LRU eviction, or unsubscription.

#### 3. Step-by-Step Memory Leak Debugging Workflow
- How to systematically reproduce, isolate, and prove a memory leak using the **3-Snapshot Technique**:
  - Snapshot 1: Baseline state.
  - Action: Execute suspected leaky workflow (e.g. open/close heavy modal 5 times).
  - Snapshot 2: After action.
  - Snapshot 3: Force garbage collection (trash icon) and take comparison snapshot. Filter by delta and inspect `#Alloc` vs `#Freed`.
- 🐛 **Bug Hunt:** Given a real-world code snippet containing a heavy chart component with an uncleaned resize observer and closure retention, inspect the heap dump trace and write the fix.

#### 4. Runtime Profiling, Long Tasks & Core Web Vitals (CWV)
- The Performance Panel: Analyzing Flame Charts, Main Thread activity, Long Tasks (>50ms), and Total Blocking Time (TBT).
- Understanding **Interaction to Next Paint (INP)**: How excessive JavaScript execution delays user input feedback, and how to profile INP breakdowns (Input Delay, Processing Time, Presentation Delay).
- The `PerformanceObserver` API: Measuring Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and Long Animation Frames (LoAF).
- 💻 **Practical Coding:** Instrument a production performance monitor using `PerformanceObserver` that captures Long Tasks and logs attribution data to analytics without degrading performance.
- 🎯 **Quick-Fire Section:**
  - What does the yellow vs red highlighting mean for constructors in a Heap Snapshot?
  - What is a "GC Thrashing" loop?
  - How does Layout Thrashing (Forced Synchronous Layout) impact memory allocation?

---

### 📄 `15-dom-events-observers-and-browser-apis-qa.md` — DOM Mechanics, Events, Observers & Browser APIs (18–22 Questions)
> **Core Theme:** The Critical Rendering Path (CRP), event bubbling and capturing phases, modern Observer APIs (`Intersection`, `Resize`, `Mutation`), multi-threading with Web Workers, and cross-tab communication.

#### 1. Critical Rendering Path & DOM Architecture
- Walk through the Critical Rendering Path (CRP): HTML Parsing $\rightarrow$ DOM Construction $\rightarrow$ CSSOM Construction $\rightarrow$ Render Tree $\rightarrow$ Layout (Reflow) $\rightarrow$ Paint $\rightarrow$ Compositing.
- What triggers a **Reflow (Layout)** vs a **Repaint** vs a **Composite-Only** change? (e.g. changing `width` vs `color` vs `transform`/`opacity`).
- What is **Layout Thrashing (Forced Synchronous Layout)**? How does reading a layout property (`offsetWidth`, `scrollTop`, `getBoundingClientRect()`) immediately after writing a style property force the browser into an emergency synchronous reflow?

#### 2. Event Dispatching & Delegation
- The 3 Phases of DOM Event Propagation: **Capturing Phase** (Window $\rightarrow$ Target), **Target Phase**, and **Bubbling Phase** (Target $\rightarrow$ Window).
- `addEventListener(type, listener, options)`: Deep dive into options:
  - `capture: boolean`
  - `once: boolean`
  - `passive: boolean` (Why `{ passive: true }` on touch/scroll listeners eliminates scroll jank by disallowing `preventDefault()`).
  - `signal: AbortSignal` (Automatic event listener cleanup).
- `event.stopPropagation()` vs `event.stopImmediatePropagation()` vs `event.preventDefault()`.
- **Event Delegation:** Why is attaching a single listener to a parent container superior to binding 10,000 listeners to individual table rows? How to handle child clicks with `.closest()`.

#### 3. Modern Observer APIs
- **IntersectionObserver:** How it works off the main thread, the `threshold` and `rootMargin` properties, and implementing lazy-loading images and infinite scroll.
- **ResizeObserver:** Tracking element dimension shifts without window resize listeners; preventing the `ResizeObserver loop limit exceeded` error.
- **MutationObserver:** Observing DOM child mutations, attribute alterations, and character data changes; microtask execution timing.
- 💻 **Practical Coding:** Implement an infinite-scroll list manager using `IntersectionObserver` that automatically fetches new pages when the sentinel element enters the viewport.

#### 4. Multi-Threading & Inter-Process Communication
- Web Workers (Dedicated Workers): Offloading heavy CPU tasks off the main thread.
- Data Transfer Mechanics:
  - **Structured Cloning:** Deep copy overhead between threads.
  - **Transferable Objects:** Transferring ownership of `ArrayBuffer` with zero-copy memory pointer passing.
  - **SharedArrayBuffer & Atomics:** Shared memory threading and atomic synchronization primitives (and CORS headers `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` requirements).
- Cross-Tab Communication: `BroadcastChannel` API vs `SharedWorker` vs `window.postMessage` vs the `localStorage` storage-event trick.
- 🎯 **Quick-Fire Section:**
  - What is the difference between `element.innerHTML`, `element.innerText`, and `element.textContent`?
  - What is a DocumentFragment, and how does it optimize bulk DOM insertions?
  - Can a Web Worker manipulate the DOM directly?

---

### 📄 `16-web-security-sandbox-and-vulnerabilities-qa.md` — Web Security, Sandbox Boundaries & Vulnerabilities (16–20 Questions)
> **Core Theme:** Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), Content Security Policy (CSP), Cross-Origin Resource Sharing (CORS), Prototype Pollution, and client-side credential storage security.

#### 1. Cross-Site Scripting (XSS) & Defenses
- The 3 Types of XSS: **Stored XSS**, **Reflected XSS**, and **DOM-based XSS**.
- Dangerous JavaScript sink APIs: `innerHTML`, `document.write`, `outerHTML`, `eval()`, `setTimeout(string)`, and dynamic `javascript:` URLs.
- Modern Mitigation: Context-aware HTML entity encoding, DOMPurify sanitization, and the **Trusted Types API** (`trustedTypes.createPolicy`).

#### 2. Cross-Site Request Forgery (CSRF) & Same-Origin Policy
- What is the Same-Origin Policy (SOP)? The definition of Origin (Protocol + Host + Port).
- How does a CSRF attack work? How malicious sites exploit ambient credentials (cookies automatically sent with cross-site requests).
- Defenses against CSRF:
  - `SameSite` cookies (`SameSite=Lax` or `Strict`).
  - Anti-CSRF Synchronizer Tokens (CSRF tokens in headers).
  - Custom Request Headers (e.g. `X-Requested-With`) verified by backend.

#### 3. Content Security Policy (CSP) & Subresource Integrity
- What is a Content Security Policy (CSP), and how is it delivered via HTTP headers vs `<meta>` tags?
- Key Directives: `default-src`, `script-src`, `style-src`, `connect-src`, `img-src`, `frame-ancestors`.
- Eliminating XSS with CSP: Why `script-src 'unsafe-inline'` is dangerous, and how **Cryptographic Nonces** (`'nonce-...'`) and **Hashes** (`'sha256-...'`) whitelist approved scripts.
- Subresource Integrity (SRI): How the `integrity="sha384-..."` attribute on `<script>` tags prevents compromised third-party CDNs from executing altered code.

#### 4. CORS, Prototype Pollution & Token Storage
- Cross-Origin Resource Sharing (CORS):
  - Simple Requests vs Preflight Requests (`OPTIONS`).
  - What triggers a preflight? (Methods other than GET/POST/HEAD, custom headers like `Authorization`, Content-Types other than text/plain, multipart, form-urlencoded).
  - Credentials mode: `Access-Control-Allow-Credentials: true` and why `Access-Control-Allow-Origin: *` fails when credentials are included.
- **Prototype Pollution Attacks:** How recursive object merging functions (`deepMerge(target, source)`) vulnerable to `__proto__` and `constructor.prototype` keys corrupt global object prototypes. Mitigations (`Object.create(null)`, `Map`, `Object.freeze(Object.prototype)`).
- **The Token Storage Debate:** Where should JWT / Session tokens be stored in modern web applications? Comparing `HttpOnly` Cookie vs `localStorage` vs in-memory JavaScript variables.
- 🎯 **Quick-Fire Section:**
  - What is Clickjacking, and how does `X-Frame-Options` / CSP `frame-ancestors` stop it?
  - What is the difference between `window.location.href` assignment and `window.location.replace()`?
  - Does HTTPS encrypt URL query parameters?

---

### 📄 `17-practical-coding-polyfills-and-gotchas-qa.md` — Practical Coding, Polyfills, Gotchas & Architecture Scenarios (24–28 Questions)
> **Core Theme:** Handcrafting essential polyfills from scratch, solving the 25 most notorious tricky JavaScript output puzzles, production debugging drills, and end-to-end senior frontend architecture scenarios.

#### 1. The Essential Polyfill Suite (High-Frequency Coding Rounds)
- 💻 **Coding 1:** Polyfill `Function.prototype.bind`, `call`, and `apply` supporting partial application and `new` operator binding delegation.
- 💻 **Coding 2:** Polyfill a fully Promises/A+ compliant `CustomPromise` class supporting chaining, error recovery, and microtask scheduling.
- 💻 **Coding 3:** Polyfill the complete Promise Combinator family: `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`.
- 💻 **Coding 4:** Polyfill `Array.prototype.flat` and `Array.prototype.flatMap` with recursive and iterative implementations supporting custom depth.
- 💻 **Coding 5:** Polyfill `Array.prototype.reduce` matching all ECMAScript edge cases (initialValue presence, sparse arrays).
- 💻 **Coding 6:** Implement a production-grade `deepClone(obj)` handling primitive types, Objects, Arrays, Dates, RegExp, Maps, Sets, and circular references.
- 💻 **Coding 7:** Implement an advanced `debounce` and `throttle` utility supporting `{ leading: boolean, trailing: boolean }` and `.cancel()`.
- 💻 **Coding 8:** Implement a typed `EventEmitter` (Pub-Sub) supporting `on()`, `off()`, `emit()`, `once()`, wildcard events, and listener cleanup.

#### 2. The 25 Output Prediction & Gotchas Marathon
- 🧩 **Puzzle 1:** Hoisting and function declaration override vs variable assignment.
- 🧩 **Puzzle 2:** Lexical scope closure inside asynchronous loops with varying declarations (`var`, `let`, `const`).
- 🧩 **Puzzle 3:** Intricate Event Loop interleaving: Nested Promises, `setTimeout`, `queueMicrotask`, and synchronous logs.
- 🧩 **Puzzle 4:** Coercion arithmetic: Adding objects, arrays, booleans, and nulls in various operator contexts.
- 🧩 **Puzzle 5:** Prototype property shadowing and `delete` behavior on instances vs prototypes.
- 🧩 **Puzzle 6:** `this` resolution with method borrowing, arrow functions, and nested object literals.
- 🧩 **Puzzle 7:** Array method quirks: `[1, 2, 3].map(parseInt)`.
- 🧩 **Puzzle 8:** Sparse arrays and the `length` property (`const arr = [1, 2]; arr[5] = 10;`).
- 🧩 **Puzzle 9:** `new` operator return value override (returning a primitive vs returning an object from a constructor).
- 🧩 **Puzzle 10:** TDZ evaluation with default parameter referencing itself (`function foo(a = a) {}`).
- 🧩 **Puzzle 11:** Parameter scope vs body scope variable mutation.
- 🧩 **Puzzle 12:** Destructuring default values on `null` vs `undefined`.
- 🧩 **Puzzle 13:** Regex global `/g` flag `.test()` consecutive executions (`lastIndex`).
- 🧩 **Puzzle 14:** `try/catch/finally` return override.
- 🧩 **Puzzle 15:** Property key coercion (`obj[{}] = 1; obj[{}] = 2;`).
- 🧩 **Puzzle 16:** Object key traversal ordering (integer vs string keys).
- 🧩 **Puzzle 17:** `Object.assign` setter invocation vs Object spread.
- 🧩 **Puzzle 18:** Scientific notation string coercion in `parseInt(0.0000005)`.
- 🧩 **Puzzle 19:** `Math.min()` vs `Math.max()` empty parameter values.
- 🧩 **Puzzle 20:** `JSON.stringify` handling of `undefined`, functions, symbols, and `NaN`.
- 🧩 **Puzzle 21:** `Array.prototype.sort()` alphabetical string sorting on numbers.
- 🧩 **Puzzle 22:** `reduce()` on a single-element array without initial value.
- 🧩 **Puzzle 23:** Subclassing `Error` and prototype inspection.
- 🧩 **Puzzle 24:** `WeakMap` garbage collection lifecycle simulation.
- 🧩 **Puzzle 25:** In-place mutating array methods vs immutable copying methods.

#### 3. Production Debug & Bug-Hunting Drills
- 🐛 **Drill 1:** Fixing a race condition in a live typeahead search input where older slower network responses overwrite newer responses.
- 🐛 **Drill 2:** Locating and fixing a silent memory leak in a dashboard component caused by an orphaned resize listener capturing state.
- 🐛 **Drill 3:** Resolving an unhandled rejection that silently crashes a Node.js process during microtask batching.
- 🐛 **Drill 4:** Fixing a catastrophic ReDoS CPU freeze caused by an un-anchored email validation regex.

#### 4. Frontend System Design & Architecture Scenarios (The RADIO Framework)
- 🏗️ **Scenario 1: Offline-First Rich Text Synchronization Engine**
  - Architecture using `IndexedDB`, Web Workers, and Cache Storage.
  - Conflict resolution algorithms, optimistic updates, and background synchronization queue.
- 🏗️ **Scenario 2: Ultra-High-Performance Virtualized Windowing List**
  - Rendering 500,000 items at 60fps.
  - DOM node recycling, dynamic item heights measurement, scroll event throttling, and layout thrashing prevention.
- 🏗️ **Scenario 3: Zero-Main-Thread-Impact Client Analytics SDK**
  - Collecting user telemetry, error traces, and performance metrics without degrading Interaction to Next Paint (INP).
  - Leveraging `navigator.sendBeacon()`, `requestIdleCallback`, and queue buffering.

---

## 🚦 Recommended Learning Tracks

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Role-Based Study Pathways                       │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 🟢 Junior Track          │ 03, 05, 06, 07, 10, 11, 17                  │
│ Foundations & Syntax     │ Focus: Primitives, scope, async basics, DOM │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 🟡 Mid-Level Track       │ 04, 07, 08, 09, 10, 11, 12, 13, 15, 17      │
│ Production Engineering   │ Focus: Event loop, promises, storage, build │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 🔴 Senior & Staff Track  │ 01, 02, 04, 08, 11, 12, 14, 15, 16, 17      │
│ Internals & Performance  │ Focus: JIT, GC, heap leaks, CWV, security   │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 🌐 Browser Specialist    │ 04, 12, 13, 14, 15, 16, 17                  │
│ Web Platform & Tooling   │ Focus: Storage, DevTools, workers, CRP, CSP │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 💻 Functional & Polyfill │ 06, 07, 08, 09, 10, 11, 17                  │
│ Practical Coding & Traps │ Focus: Currying, transducers, gotchas, code │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 📊 Question Archetype Distribution Target

| Archetype | Minimum Target % | Focus Area |
|---|:---:|---|
| 📖 **Conceptual & Deep-Dive** | 35% | Engine compilation, memory layout, specs, event loop, security models |
| 💻 **Practical Coding & Polyfills** | 25% | Implementing polyfills, algorithms, concurrency limiters, custom utilities |
| 🧩 **Output & Behavior Prediction** | 15% | Event loop ordering, coercion puzzles, closure staleness, `this` binding |
| 🐛 **Debug & Bug Hunting** | 15% | Memory leaks, detached DOM nodes, race conditions, IndexedDB gotchas |
| 🏗️ **System Design & Architecture** | 10% | Offline sync, virtual windowing, performance budgets, analytics SDKs |

---

## 🛠️ Verification & Implementation Roadmap

1. **Phase 1: Foundations & Runtime (Modules 01–04)**
   - V8 pipeline, JIT compilation, hidden classes, GC scavenge/mark-compact, execution contexts, event loop turns.
2. **Phase 2: Core Language Mastery & Serialization (Modules 05–07)**
   - Types, coercion, IEEE 754, `JSON.stringify` serialization traps, `this` rules, prototypes, Promise state machines.
3. **Phase 3: Functional Paradigms & Language Caveats (Modules 08–11)**
   - Transducers, currying, monads, async memoizers, Proxy structural sharing, sparse arrays, sort quirks, parameter scopes, destructuring traps, regex statefulness.
4. **Phase 4: Modular Architecture & Browser Platform (Modules 12–16)**
   - ESM vs CJS, bundlers, tree-shaking, storage matrix, IndexedDB, DevTools heap dumps, detached DOM leaks, CRP, Observers, Web Workers, and Web Security.
5. **Phase 5: Synthesis, Polyfills & Architecture (Module 17)**
   - 8 essential polyfills, 25 output prediction puzzles, 4 bug-hunting drills, and 3 fullscale RADIO system design scenarios.
