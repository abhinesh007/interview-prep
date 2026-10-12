# 04 — Memory Management & Garbage Collection

> V8 Heap Anatomy, Scavenge & Mark-Sweep-Compact GC, Memory Leak Diagnostics, Heap Snapshots, and CPU Profiling Flamegraphs.

---

## 📑 Table of Contents
1. [V8 Memory Architecture & Heap Spaces](#1-v8-memory-architecture--heap-spaces)
2. [Garbage Collection Algorithms Deep Dive](#2-garbage-collection-algorithms-deep-dive)
3. [Diagnosing & Hunting Memory Leaks](#3-diagnosing--hunting-memory-leaks)
4. [Profiling Tools & Production Heap Diagnostics](#4-profiling-tools--production-heap-diagnostics)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. V8 Memory Architecture & Heap Spaces

### Q1: What is the anatomy of a Node.js process's memory, and what do RSS, Heap Total, Heap Used, and External Memory represent?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Memory]` `[V8]` `[Diagnostics]`

**Answer:**
When you inspect memory via `process.memoryUsage()`, Node.js returns four core metrics:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Resident Set Size (RSS)                      │
│  Total physical RAM allocated to the Node.js process by OS      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     V8 Heap Memory                        │  │
│  │  ┌─────────────────────────┐ ┌─────────────────────────┐  │  │
│  │  │        Heap Used        │ │     Heap Unused/Free    │  │  │
│  │  │  (Live JS objects)      │ │  (Allocated headroom)   │  │  │
│  │  └─────────────────────────┘ └─────────────────────────┘  │  │
│  │  ◄────────────────────── Heap Total ─────────────────────►│  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │       External Memory & ArrayBuffers (C++ allocations)    │  │
│  │       (Buffers, WebAssembly, Libuv handles, socket buffers)│  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │       Process Code & Call Stack (C++ binary + JS stack)   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

1. **Resident Set Size (RSS):** Total RAM occupied by the process in physical memory. Includes the V8 heap, external C++ bindings, code segments, and the execution stack.
2. **Heap Total:** Total memory allocated by V8 from the OS for JavaScript objects.
3. **Heap Used:** Actual memory currently consumed by live JavaScript objects and closures.
4. **External:** Memory bound to JavaScript objects managed by C++ (e.g., Node.js `Buffer` objects, native N-API addons).
5. **ArrayBuffers:** Memory allocated specifically for `ArrayBuffer` and `SharedArrayBuffer` (a subset of External).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If `process.memoryUsage().heapUsed` is stable at 200MB, but RSS is climbing to 2GB, what is leaking?"  
*Senior Answer:* Memory is leaking **outside the V8 heap** in C++ space or native bindings. Common culprits include:
1. Buffers allocated via C++ native streams or third-party C++ addons (`node-gyp`).
2. Sockets and Libuv handles opened and never closed.
3. Native memory fragmentation caused by rapid allocations in external libraries (e.g., sharp, canvas, or native database drivers).

---

### Q2: What are the different V8 Heap Spaces, and what is the "Generational Hypothesis"?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[V8]` `[HeapSpaces]` `[Internals]`

**Answer:**
The **Weak Generational Hypothesis** observes that in software runtimes, **most objects die shortly after creation** (e.g., temporary variables in function scopes, request objects).

To optimize cleanup, V8 partitions its heap into dedicated functional spaces:

```text
┌─────────────────────────────────────────────────────────────────┐
│                           V8 HEAP SPACES                        │
├───────────────────────────────┬─────────────────────────────────┤
│ 1. New Space (Young Gen)      │ Short-lived allocations (< few  │
│    ├── Nursery                │ megabytes). Fast Scavenge GC.   │
│    └── Intermediate           │ Promoted after surviving 2 GCs. │
├───────────────────────────────┼─────────────────────────────────┤
│ 2. Old Pointer Space          │ Objects that survived young gen │
│                               │ and contain pointers to others. │
├───────────────────────────────┼─────────────────────────────────┤
│ 3. Old Data Space             │ Raw data objects (strings,      │
│                               │ numbers, arrays of raw values). │
├───────────────────────────────┼─────────────────────────────────┤
│ 4. Large Object Space         │ Objects too large for normal    │
│                               │ spaces; allocated page-by-page. │
├───────────────────────────────┼─────────────────────────────────┤
│ 5. Code Space                 │ JIT compiled machine code       │
│                               │ produced by Sparkplug/TurboFan. │
├───────────────────────────────┼─────────────────────────────────┤
│ 6. Map / Cell Space           │ Hidden classes (Shapes) for fast│
│                               │ property access and transitions.│
└───────────────────────────────┴─────────────────────────────────┘
```

- **New Space (Nursery):** Where every new JavaScript object is initially allocated (unless it is too large, in which case it goes straight to the Large Object Space).
- **Promotion:** An object that survives two consecutive minor GC cycles in New Space is promoted ("tenured") to the **Old Space**.

---

## 2. Garbage Collection Algorithms Deep Dive

### Q3: How do Minor GC (Scavenge) and Major GC (Mark-Sweep-Compact) work under the hood?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[GC]` `[Scavenge]` `[MarkSweep]`

**Answer:**

#### 1. Minor GC: Cheney's Scavenge Algorithm (Young Generation)
New Space is split into two equal halves: **From-Space** and **To-Space**:
1. New allocations enter **From-Space**.
2. When From-Space fills up, Minor GC triggers.
3. V8 traverses root pointers. Live (reachable) objects are copied contiguously into **To-Space**. Dead objects are simply discarded.
4. If an object has already survived a previous Scavenge cycle, it is promoted to **Old Space** instead of To-Space.
5. The roles of From-Space and To-Space are swapped.
*Benefit:* Extremely fast (proportional only to the number of *surviving* objects, not total allocated space).

#### 2. Major GC: Mark-Sweep-Compact (Old Generation)
Old space is much larger (gigabytes). Copying would be prohibitively slow and memory-intensive:

```text
Phase 1: Mark        Phase 2: Sweep        Phase 3: Compact
[■][□][■][□][■] ──►  [■][ ][■][ ][■] ──►   [■][■][■][ ][ ]
(Identify live       (Free dead object     (Defragment live objects
 from roots)          memory to free list)  into contiguous memory)
```

1. **Marking:** Traverses the object graph starting from roots (global objects, call stack pointers). Marks all reachable objects as live.
2. **Sweeping:** Adds the memory addresses of unmarked (dead) objects back to a "Free List" for future allocation.
3. **Compacting (Defragmentation):** Shifts live objects into contiguous blocks of memory to prevent heap fragmentation.

#### Modern V8 Optimizations to Minimize STW (Stop-The-World):
- **Incremental Marking:** Breaks the marking phase into tiny slices interleaved with JavaScript execution.
- **Concurrent Marking & Sweeping:** Helper threads mark and sweep memory on background threads while the main JavaScript thread continues running.

---

## 3. Diagnosing & Hunting Memory Leaks

### Q4: What are the top 5 most common causes of memory leaks in production Node.js applications?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[MemoryLeaks]` `[Production]`

**Answer:**

#### 1. Unbounded Module-Level Caches
```javascript
// BUG: In-memory cache grows infinitely with every unique user/token
const cache = new Map();
app.get('/user/:id', async (req, res) => {
  if (!cache.has(req.params.id)) {
    cache.set(req.params.id, await fetchUser(req.params.id));
  }
  res.json(cache.get(req.params.id));
});
// FIX: Use an LRU cache with max entries and TTL (e.g., lru-cache)
```

#### 2. Lingering Event Listeners (`EventEmitter`)
```javascript
// BUG: Adding listener to shared singleton per request without cleanup
class PaymentGateway extends EventEmitter {}
const gateway = new PaymentGateway();

app.post('/pay', (req, res) => {
  // Leaks 1 listener function + its entire closure scope per request!
  gateway.on('processed', () => res.send('OK'));
});
// FIX: Use gateway.once() or removeListener in 'finish'/'close' hook.
```

#### 3. Accidental Closures Retaining Large Outer Scopes
```javascript
let lingeringScope;
function leakyFunction() {
  const massiveBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
  const unused = function () {
    if (massiveBuffer) return; // Retains massiveBuffer in lexical closure!
  };
  lingeringScope = function () {
    console.log('Doing small task');
  };
}
// Both closures share the same hidden lexical scope object in V8!
```

#### 4. Detached Timers (`setInterval`)
A `setInterval` whose callback references an object will retain that object in memory forever until `clearInterval()` is explicitly invoked.

#### 5. Unbounded Global Arrays / Logging Buffers
Pushing logs, metrics, or error contexts to a global array waiting for a batch flusher that silently fails or lags behind incoming throughput.

---

### Q5: How do you take and analyze a Heap Snapshot in production without freezing user traffic?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[HeapSnapshot]` `[DevTools]` `[Production]`

**Answer:**

#### Taking a Snapshot Programmatically:
Using the native `node:v8` module:
```typescript
import v8 from 'node:v8';
import fs from 'node:fs';
import path from 'node:path';

export function takeProductionHeapSnapshot(): string {
  const fileName = `heap-${process.pid}-${Date.now()}.heapsnapshot`;
  const filePath = path.join(process.cwd(), 'snapshots', fileName);

  // v8.getHeapSnapshot() returns a readable stream!
  // Streaming to disk prevents allocating the snapshot itself into the V8 heap
  const snapshotStream = v8.getHeapSnapshot();
  const fileWriteStream = fs.createWriteStream(filePath);

  snapshotStream.pipe(fileWriteStream);

  fileWriteStream.on('finish', () => {
    console.log(`Heap snapshot saved successfully to ${filePath}`);
  });

  return filePath;
}
```

#### The Analysis Workflow (Chrome DevTools):
1. Take **Snapshot 1** under normal load.
2. Trigger the suspected leaky operation or wait 10 minutes.
3. Take **Snapshot 2**.
4. Open Chrome DevTools ➔ Memory Panel ➔ Load both files.
5. Select **Snapshot 2** and switch the perspective from **Summary** to **Comparison** (compared against Snapshot 1).
6. Sort by **# Delta** and **Size Delta**.
7. Look for constructors with massive positive deltas (e.g., `(closure)`, `Object`, `Array`, `Timeout`).
8. Inspect the **Retainers view** to locate the root object (Global/Window/Context) preventing garbage collection.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the difference between Shallow Size and Retained Size in Chrome DevTools?"  
*Senior Answer:*
- **Shallow Size:** Memory held directly by the object itself (its primitive fields, immediate pointers).
- **Retained Size:** Total memory freed if the object were deleted and its children in the dominator tree became unreachable. An object with a shallow size of 32 bytes might have a retained size of 500MB if it holds the root reference to a massive array.

---

## 4. Profiling Tools & Production Heap Diagnostics

### Q6: How do you profile high CPU usage and generate Flamegraphs using `0x` or `clinic flame`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Profiling]` `[Flamegraph]` `[Clinic]`

**Answer:**
When a Node.js process consumes 100% CPU, synchronous code is blocking the event loop.

#### 1. Using `0x`:
```bash
# Start your application with 0x profiling
npx 0x -- node dist/server.js

# In another terminal, generate load with autocannon
npx autocannon -c 100 -d 20 http://localhost:3000/api/heavy-endpoint

# Stop the server with Ctrl+C (SIGINT). 0x opens an interactive HTML flamegraph!
```

#### How to Read a Flamegraph:
```text
┌──────────────────────────────────────────────┐
│                crypto.pbkdf2Sync             │ ◄── WIDE TOP BAR = HOT SPOT!
├──────────────────────────────────────────────┤
│                hashUserPassword              │
├──────────────────────────────────────────────┤
│                handleRegister                │
├──────────────────────────────────────────────┤
│                (V8 Root Call Stack)          │
└──────────────────────────────────────────────┘
```
- **Horizontal Axis (Width):** Proportion of total CPU time spent in that function and its children. The wider the block, the more CPU cycles it consumed.
- **Vertical Axis (Depth):** Call stack depth (caller ➔ callee).
- **The "Plateau":** Any wide block at the very top of the flamegraph is the **CPU bottleneck** (hot spot).

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q7: What CLI flag adjusts the maximum old space memory limit in Node.js?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Configuration]` `[V8]`

**Answer:**
`--max-old-space-size=<megabytes>`
```bash
# Set maximum heap to 4GB:
node --max-old-space-size=4096 server.js
```
*Gotcha:* Default limit is roughly 1.4GB on 64-bit systems in older Node versions and ~2GB to 4GB in modern Node depending on available host memory.

---

### Q8: What does `node:diagnostics_channel` provide for zero-overhead production monitoring?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Diagnostics]` `[Observability]`

**Answer:**
`node:diagnostics_channel` is a built-in publish-subscribe channel mechanism designed for APMs and profilers. If no subscribers exist on a channel (e.g., `tracing:http:request`), the publishing overhead is near **zero CPU cost** because the channel check short-circuits before payload construction, eliminating the performance penalties of traditional monkey-patching.
