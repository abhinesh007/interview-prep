# 02 — Memory Allocation, Lifecycles & Garbage Collection (GC)

> Deep dive into Call Stack vs Heap memory allocation, the V8 Weak Generational Hypothesis, Cheney's Scavenger copying collector, Major Mark-Sweep-Compact GC, Orinoco concurrent/parallel optimizations, and weak resource lifecycles (`WeakMap`, `WeakRef`, `FinalizationRegistry`).

---

## 📑 Table of Contents
1. [Stack vs Heap Memory Layout](#1-stack-vs-heap-memory-layout)
2. [The Generational Hypothesis & Minor GC (Scavenger)](#2-the-generational-hypothesis--minor-gc-scavenger)
3. [Major GC: Mark-Sweep, Mark-Compact & Orinoco](#3-major-gc-mark-sweep-mark-compact--orinoco)
4. [Weak References & Resource Lifecycle APIs](#4-weak-references--resource-lifecycle-apis)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Stack vs Heap Memory Layout

### Q1: What is the physical difference between Call Stack memory and Heap memory in JavaScript?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Memory-Management]` `[Call-Stack]` `[Heap]` `[V8-Internals]`

**Answer:**
JavaScript engines partition process memory into two primary runtime structures:

```text
┌───────────────────────────────────────────────────────────────┐
│                    JavaScript Process Memory                  │
├───────────────────────────────┬───────────────────────────────┤
│          Call Stack           │          Memory Heap          │
├───────────────────────────────┼───────────────────────────────┤
│ • Fixed, contiguous memory    │ • Dynamic, unorganized space │
│ • LIFO execution frames       │ • Graph of reference objects  │
│ • Primitives & pointers       │ • Closures, Objects, Arrays   │
│ • Deallocated automatically   │ • Managed via Garbage         │
│   on function return          │   Collector (GC)              │
└───────────────────────────────┴───────────────────────────────┘
```

1. **The Call Stack:**
   - Fast, contiguous memory managed directly by CPU stack pointers.
   - Allocates **Stack Frames** for every function call. A frame contains:
     - Function parameters
     - Local primitive variables (Numbers, Booleans, null, undefined) that do not escape to closures
     - Pointers (memory addresses) referencing objects on the heap
     - Return addresses
   - Allocation and deallocation are instantaneous ($O(1)$) by incrementing or decrementing the stack pointer.

2. **The Memory Heap:**
   - A large, unstructured region of memory dedicated to reference types (Objects, Arrays, Functions, RegEx, Maps, Sets).
   - Variables stored in closures that outlive their creating function are allocated on the Heap (Context objects), even if they are primitives!
   - Because objects have dynamic sizes that can grow or shrink at runtime, the engine cannot allocate them on the contiguous stack.

```javascript
function allocate() {
  const count = 42;          // Primitive '42': Stored directly in Call Stack frame
  const user = { id: 101 };  // 'user' pointer on Stack -> points to { id: 101 } on Heap
  return user;
}
const ref = allocate();      // Stack frame popped, but { id: 101 } stays alive on Heap
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Strings are primitive values in JavaScript. Are strings stored on the Call Stack or on the Heap?"  
*Senior Answer:* Almost universally on the **Heap**. While strings are immutable primitives conceptually, strings can be arbitrarily large (up to 1 GB in V8). Storing a 50MB string on the tiny Call Stack (which is typically capped at 1MB to 2MB) would cause an immediate stack overflow. V8 stores strings as `SeqOneByteString` or `SeqTwoByteString` heap objects and places a small pointer to that string on the stack frame.

---

### Q2: What causes a `RangeError: Maximum call stack size exceeded` vs an `Out of Memory: JavaScript heap out of memory` crash?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Stack-Overflow]` `[OOM]` `[Memory-Errors]`

**Answer:**
These two errors represent failures of entirely different memory subsystems:

```text
1. Call Stack Overflow:
   ┌──────────────┐
   │ recursive()  │ ▲  Stack frames piled up until hitting
   │ recursive()  │ │  the fixed stack ceiling (~10,000-15,000 frames)
   │ recursive()  │ │  Result: RangeError: Maximum call stack size exceeded
   └──────────────┘

2. Heap Out of Memory (OOM):
   ┌──────────────────────────────────────────────┐
   │ [Heap Memory Space: 2 GB Default / 4 GB Cage]│  Heap filled to capacity
   │ [████████████████████████████████████████████]  GC cannot reclaim enough space
   └──────────────────────────────────────────────┘  Result: FATAL ERROR: Ineffective mark-compacts
```

| Crash Signature | Subsystem | Common Culprit | Resolution Strategy |
|---|---|---|---|
| `RangeError: Maximum call stack size exceeded` | **Call Stack** | Unbounded recursion; circular function calls without base condition. | Add base termination check; convert recursion to a `while` loop or trampoline. |
| `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` | **Heap Memory** | Memory leaks (detached DOM nodes, uncleaned event listeners); reading massive files entirely into memory. | Use Streams/Buffers; profile heap dumps via Chrome DevTools; increase limit with `--max-old-space-size`. |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can you overflow the heap with an infinite loop without triggering a stack overflow?"  
*Senior Answer:* Yes:
```javascript
const leaky = [];
while (true) {
  leaky.push(new Array(1e6).fill("leak")); // Heap fills rapidly; stack depth remains 1!
}
```
Because all allocations occur within the same stack frame in a single loop, the call stack never grows. The heap, however, exhausts its maximum limit within seconds and triggers a process crash.

---

## 2. The Generational Hypothesis & Minor GC (Scavenger)

### Q3: What is the Generational Hypothesis, and how is the V8 Heap partitioned?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Generational-GC]` `[V8-Heap]` `[Young-Generation]` `[Old-Generation]`

**Answer:**
Garbage collection algorithms are governed by the empirical **Weak Generational Hypothesis**:
> *"Most objects die young."*

In web applications, the overwhelming majority of allocated objects (intermediate variables, promise closures, temporary string concatenations) become unreachable almost immediately after their containing function finishes execution. Only a small percentage of objects (singletons, long-lived caches, application state) persist across long sessions.

To optimize GC pauses, V8 splits heap memory into distinct spaces:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             V8 Heap Spaces                                  │
├───────────────────────────────────────┬─────────────────────────────────────┤
│           Young Generation            │           Old Generation            │
│  ┌─────────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │ From-Space (Nursery)            │  │  │ Old Pointer Space             │  │
│  ├─────────────────────────────────┤  │  │ (Objects containing pointers) │  │
│  │ To-Space (Inactive)             │  │  ├───────────────────────────────┤  │
│  └─────────────────────────────────┘  │  │ Old Data Space                │  │
│                                       │  │ (Raw data: strings, floats)   │  │
│                                       │  ├───────────────────────────────┤  │
│                                       │  │ Large Object Space (LOS)      │  │
│                                       │  │ (Objects exceeding page size) │  │
│                                       │  ├───────────────────────────────┤  │
│                                       │  │ Code Space (JIT machine code) │  │
└───────────────────────────────────────┴─────────────────────────────────────┘
```

1. **Young Generation (1MB – 64MB):** Where newly created objects are born. Cleaned frequently and ultra-fast by the **Scavenger (Minor GC)**.
2. **Old Generation (~1.4GB – 4GB+):** Holds objects that survived multiple Minor GC cycles. Cleaned less frequently by the **Mark-Sweep-Compact Collector (Major GC)**.
3. **Large Object Space (LOS):** Objects that exceed the size of a standard memory page (~256KB) bypass the Young Generation entirely and are allocated directly here so they are never copied during Minor GC.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Under what conditions is an object promoted from the Young Generation to the Old Generation?"  
*Senior Answer:* Two conditions trigger promotion (tenuring):
1. **Survival Count:** The object has already survived one Scavenge cycle in the Nursery and survives a second cycle.
2. **Space Pressure:** If the destination `To-Space` fills up beyond 25% during a Scavenge cycle, surviving objects are immediately promoted to the Old Generation to prevent `To-Space` overflow.

---

### Q4: How does Cheney's Copying Algorithm work during a Minor GC (Scavenge) cycle?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Algorithm  
**Tags:** `[Scavenge]` `[Cheney-Algorithm]` `[Minor-GC]` `[Semi-Space]`

**Answer:**
Minor GC in V8 uses **Cheney's Copying Algorithm** running over two semi-spaces: **From-Space** and **To-Space**.

```text
Before Scavenge:
  From-Space (Active Allocations):
  ┌───────┬───────┬───────┬───────┬───────┐
  │ Obj A │ Dead  │ Obj B │ Dead  │ Obj C │
  └───────┴───────┴───────┴───────┴───────┘
     │               │               │
     ▼ Reachable     ▼ Reachable     ▼ Reachable

After Scavenge:
  To-Space (Compacted & Contiguous):
  ┌───────┬───────┬───────┬───────────────────┐
  │ Obj A │ Obj B │ Obj C │   Free Memory     │
  └───────┴───────┴───────┴───────────────────┘
  (Pointers swapped: To-Space becomes the new From-Space!)
```

**Step-by-Step Scavenge Cycle:**
1. **Allocation:** All new allocations are bumped sequentially into `From-Space`.
2. **Trigger:** When `From-Space` becomes full, a Minor GC cycle begins.
3. **Traverse & Copy:** The Scavenger traverses GC roots (stack pointers, global variables). When it encounters a live object in `From-Space`:
   - It copies the object byte-for-byte to a contiguous block in `To-Space`.
   - It leaves a **Forwarding Pointer** in the old location in `From-Space` so other references know where the object moved.
   - Any dead objects are simply ignored (they are never copied).
4. **Pointer Swap:** The roles of the two spaces flip: `To-Space` becomes `From-Space` (now cleanly compacted without fragmentation), and the old `From-Space` is discarded in bulk.

**Performance Advantage:**
Because dead objects are never copied or processed, the execution time of a Minor GC is proportional **only to the number of surviving live objects**, not the total allocated memory! This allows Minor GC to finish in 1 to 5 milliseconds.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is a 'Write Barrier', and why does Minor GC need a Remembered Set?"  
*Senior Answer:* An object in the Old Generation might hold a reference to a young object in the Young Generation (e.g., `globalConfig.temp = new User()`). If Minor GC only scanned the Young Generation, it would miss this live reference and accidentally collect the young object! To avoid scanning the entire multi-gigabyte Old Generation on every Minor GC, V8 uses a **Write Barrier**: whenever an Old Generation object is mutated to point to a Young Generation object, that reference is recorded in a bitset called the **Remembered Set**. Minor GC only scans GC Roots + the Remembered Set.

---

## 3. Major GC: Mark-Sweep, Mark-Compact & Orinoco

### Q5: Why was Reference Counting abandoned for garbage collection, and how does Mark-Sweep-Compact solve circular references?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Algorithm  
**Tags:** `[Mark-Sweep]` `[Reference-Counting]` `[Circular-References]`

**Answer:**
Early browsers (like Internet Explorer 6) used **Reference Counting** for DOM memory management:
- Every object tracked an internal counter of how many variables pointed to it.
- When the counter reached 0, the object was destroyed immediately.

**The Fatal Flaw of Reference Counting: Circular References**
```javascript
function createCycle() {
  const objA = {};
  const objB = {};
  objA.link = objB; // objB ref count = 1
  objB.link = objA; // objA ref count = 1
  return "done";
}
createCycle();
// Both objA and objB are unreachable from the rest of the application!
// BUT: objA ref count is 1 (held by objB), and objB ref count is 1 (held by objA).
// Result: Reference Counting NEVER frees either object -> PERMANENT MEMORY LEAK!
```

**The Solution: Mark-Sweep-Compact (Reachability Analysis)**
Modern engines use **Reachability Analysis** originating from **GC Roots**:
1. **GC Roots:** Global object (`window` / `globalThis`), active call stack frames and local variables, DOM tree elements attached to the document.
2. **Mark Phase:** The collector performs a Graph Traversal (DFS/BFS) starting from GC Roots. Every reachable object has its "Mark bit" flipped to 1. If an isolated island of objects points to each other in a circle, but none of them are reachable from any GC root, their mark bits remain 0.
3. **Sweep Phase:** The collector scans the heap linearly. Any memory block with a mark bit of 0 is added to a **Free-List** for future allocations.
4. **Compact Phase:** Over time, sweeping leaves the heap fragmented (like Swiss cheese). Compact moves live objects together to contiguous memory, updating all pointer references.

```text
Root ──> [Object A] ──> [Object B]     [Island 1] <───> [Island 2]
            │                              (Mark bit: 0 -> RECLAIMED!)
            ▼
       [Object C]
       (Mark bit: 1 -> KEPT)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can circular references still cause memory leaks in modern browsers?"  
*Senior Answer:* Not on their own! Pure circular JavaScript objects that are detached from GC roots will be cleanly collected by Mark-Sweep. However, a circular reference **will** leak if ANY node in the circle is kept alive by an external root—such as an active `setInterval`, an uncleaned event listener on `window`, or a closure retained by a long-lived service.

---

### Q6: How does V8's Project Orinoco eliminate "Stop-The-World" latency pauses during Major GC?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Performance  
**Tags:** `[Orinoco]` `[Stop-The-World]` `[Concurrent-Marking]` `[Incremental-GC]`

**Answer:**
Historically, performing a full Major GC on a 2GB heap required a **Stop-The-World (STW)** pause: the JavaScript main thread was frozen for 100ms to 1000ms while the engine marked, swept, and compacted memory. On web apps running at 60fps (where each frame must render in 16.6ms), a 500ms STW pause causes severe UI jank and dropped frames.

V8's **Project Orinoco** completely revamped the GC subsystem using three concurrency strategies:

```text
Historical Stop-The-World:
Main Thread: ──[JS Execution]──► ╳ ──[ FULL GC PAUSE (500ms) ]── ╳ ──► [JS Execution]

Orinoco Concurrent & Incremental Model:
Main Thread: ──[JS]─► [1ms Step] ─► [JS] ─► [1ms Step] ─► [Finalize (5ms)] ─► [JS]
Worker 1:    ──────────────[Concurrent Marking Thread]─────────────────────────
Worker 2:    ──────────────[Concurrent Marking Thread]─────────────────────────
Worker 3:    ───────────────────────[Concurrent Sweeping Thread]───────────────
```

1. **Incremental Marking:**
   - The main thread breaks the marking phase into tiny slices (1–2ms each) interleaved with normal JavaScript execution.
2. **Concurrent Marking:**
   - Background worker threads scan the heap and mark live objects *while the main thread is actively executing JavaScript*.
   - A concurrent Write Barrier informs worker threads whenever the main thread mutates object pointers during marking.
3. **Parallel Compacting & Sweeping:**
   - Sweeping and memory evacuation are executed across multiple CPU cores in parallel.
4. **Idle-Time GC Scheduling:**
   - V8 hooks into the browser's `requestIdleCallback` mechanism to perform GC compaction specifically during idle gaps when the frame has finished rendering early.

This reduced Major GC main-thread pause times from hundreds of milliseconds down to **under 5ms**.

---

## 4. Weak References & Resource Lifecycle APIs

### Q7: Compare `WeakMap` / `WeakSet` with `WeakRef` and `FinalizationRegistry`. What are their real-world use cases?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Conceptual  
**Tags:** `[WeakMap]` `[WeakRef]` `[FinalizationRegistry]` `[Memory-Leaks]`

**Answer:**
JavaScript provides four built-in tools for interacting with weak garbage collection lifecycles:

| API | Key / Value Storage | GC Behavior | Iterable / Enumerable? |
|---|---|---|:---:|
| `WeakMap` | Keys must be Objects/Symbols; Values are arbitrary | Key is held weakly. When the key object is collected, the entry is automatically freed. | ❌ No |
| `WeakSet` | Values must be Objects/Symbols | Value is held weakly. When the object is collected, it is removed from the set. | ❌ No |
| `WeakRef` | Holds a weak reference to a single target object | Dereferenced via `.deref()`. Returns the object if alive, or `undefined` if GC collected it. | ❌ N/A |
| `FinalizationRegistry` | Registers a callback triggered after an object has been garbage collected | Asynchronously notifies when a tracked object is collected; used for external resource cleanup. | ❌ N/A |

```javascript
// REAL-WORLD USE CASE: DOM Node Metadata Cache using WeakMap
// When the DOM node is removed from the document, the cached metadata is automatically freed!
const domMetadataCache = new WeakMap();

function setNodeMetadata(element, metadata) {
  domMetadataCache.set(element, metadata);
}

function getNodeMetadata(element) {
  return domMetadataCache.get(element);
}
```

```javascript
// ADVANCED USE CASE: WeakRef Cache with FinalizationRegistry Cleanup
class ImageCache {
  #cache = new Map();
  #registry = new FinalizationRegistry((key) => {
    // Fired after the heavy ImageBitmap has been garbage collected!
    console.log(`Garbage collected image for key: ${key}`);
    this.#cache.delete(key);
  });

  set(key, heavyImage) {
    this.#cache.set(key, new WeakRef(heavyImage));
    this.#registry.register(heavyImage, key);
  }

  get(key) {
    const ref = this.#cache.get(key);
    if (!ref) return undefined;
    const img = ref.deref();
    if (!img) {
      // Memory was reclaimed by GC!
      this.#cache.delete(key);
      return undefined;
    }
    return img;
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why does the TC39 specification strongly advise against relying on `WeakRef` and `FinalizationRegistry` for critical business logic?"  
*Senior Answer:* Because garbage collection timing is **non-deterministic**. Different engines (or even the same engine under different battery, memory, or CPU conditions) run GC at completely unpredictable intervals. A `WeakRef` might retain its target for 1 second or 10 minutes. If your application's correctness depends on `FinalizationRegistry` firing before a user navigates to the next page, your code will fail intermittently in production.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q8: What is memory fragmentation, and why does Mark-Compact solve it?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:** Memory fragmentation occurs when free memory is broken into many tiny, non-contiguous holes scattered across the heap after dead objects are swept away. Even if 100MB of total free memory is available, an allocation request for a single contiguous 5MB array will fail if no single hole is $\ge 5\text{MB}$. The **Compact phase** slides all surviving live objects together to one end of the memory page, consolidating all free space into one large contiguous block.

### Q9: Can developers explicitly force garbage collection in production JavaScript?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:** No. There is no standard ECMAScript API to force garbage collection. `window.gc()` or `global.gc()` is only exposed when running Node.js or Chrome with the explicit diagnostic flag `--expose-gc`. This is intentional: allowing third-party scripts to trigger GC would lead to performance abuse and frame drops.

### Q10: What is the Large Object Space (LOS) in V8, and why are large objects never moved?
**Difficulty:** 🔴 Senior | **Type:** 📖 Conceptual  
**Answer:** The Large Object Space contains objects exceeding V8's standard allocation page size (~256KB), such as massive TypedArrays or huge string buffers. Because physically copying 50MB of bytes between semi-spaces during a Minor GC Scavenge would be unacceptably slow, large objects bypass the Young Generation completely and are allocated directly in LOS. They are never moved or compacted; their virtual memory pages are simply unmapped upon collection.
