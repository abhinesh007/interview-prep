# 01 — Node.js Architecture & Event Loop Internals

> V8 Engine, Libuv Architecture, Event Loop Phases, Microtask Queues (`process.nextTick` vs Promises), Timers & Drift, and Event Loop Starvation.

---

## 📑 Table of Contents
1. [Node.js Runtime Architecture & Engine Primitives](#1-nodejs-runtime-architecture--engine-primitives)
2. [The Libuv Event Loop Phases Deep Dive](#2-the-libuv-event-loop-phases-deep-dive)
3. [Microtask Queues & Starvation Mechanics](#3-microtask-queues--starvation-mechanics)
4. [Timers, Drift & Execution Order Predictions](#4-timers-drift--execution-order-predictions)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Node.js Runtime Architecture & Engine Primitives

### Q1: What is Node.js under the hood, and how do V8, Libuv, and the C++ bindings interact?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Architecture]` `[V8]` `[Libuv]`

**Answer:**
Node.js is an open-source, cross-platform JavaScript runtime environment built on Chrome's **V8 JavaScript engine** and **Libuv**. It is not a language or a framework; it embeds V8 inside a C++ host program that exposes operating system primitives (networking, filesystem, cryptography) not present in browser JavaScript runtimes.

```text
┌─────────────────────────────────────────────────────────────────┐
│                     JavaScript Application Code                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                   Node.js Standard Library                      │
│        (node:fs, node:http, node:crypto, node:stream, etc.)     │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│               Node.js C++ Bindings & Node-API (N-API)           │
└────────────────┬───────────────────────────────┬────────────────┘
                 │                               │
┌────────────────▼────────────────┐ ┌────────────▼────────────────┐
│       Google V8 Engine          │ │          Libuv Core         │
│  - JIT Compilation (Ignition/   │ │  - Event Loop Implementation│
│    Sparkplug/TurboFan)          │ │  - Thread Pool (default: 4) │
│  - Heap & Call Stack            │ │  - Async I/O Multiplexing   │
│  - Garbage Collection           │ │    (epoll, kqueue, IOCP)    │
└─────────────────────────────────┘ └────────────┬────────────────┘
                                                 │
┌────────────────────────────────────────────────▼────────────────┐
│              Underlying Operating System Kernel                 │
└─────────────────────────────────────────────────────────────────┘
```

Core responsibilities:
- **V8 Engine:** Parses and executes JavaScript source code, compiles it into native machine code (via Ignition bytecode interpreter and TurboFan optimizing compiler), allocates memory on the V8 heap, and runs garbage collection.
- **Libuv:** A multi-platform C library that handles non-blocking asynchronous I/O via native OS multiplexing (`epoll` on Linux, `kqueue` on macOS/BSD, `IOCP` on Windows) and manages an internal C thread pool for operations without asynchronous OS primitives (file I/O, DNS `getaddrinfo`, crypto).
- **Core C++ Bindings:** Bridge JavaScript method invocations (like `fs.open()`) across the V8 isolate boundary into Libuv C system calls.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "People say Node.js is single-threaded. Is that statement factually accurate?"  
*Senior Answer:* It is partially true and commonly misunderstood. The **JavaScript execution context** (the Call Stack running in the V8 isolate) is single-threaded; user code executes one turn at a time without multi-threaded synchronization primitives. However, the **Node.js runtime process as a whole is multi-threaded**. Libuv maintains an internal thread pool (4 worker threads by default, resizable up to 1024), V8 runs background threads for concurrent garbage collection and compilation, and modern Node.js allows explicit multi-threading via the `worker_threads` module.

---

### Q2: How does Node.js achieve non-blocking I/O without creating a new OS thread for every incoming HTTP request?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Libuv]` `[Networking]` `[Kernel]`

**Answer:**
Traditional multi-threaded servers (e.g., Apache HTTP Server or legacy Java Servlet containers) allocate a dedicated operating system thread per client connection. When thousands of concurrent clients connect, thread context-switching overhead and memory footprint (1–2MB stack space per thread) exhaust operating system resources.

Node.js avoids this via **I/O multiplexing and the Reactor Pattern**:

```text
1. Client Connects ───► Non-blocking Socket registered with Libuv
                             │
2. Libuv Event Demultiplexer ├──► Linux:   epoll_ctl()
                             ├──► macOS:   kqueue()
                             └──► Windows: GetQueuedCompletionStatus() (IOCP)
                             │
3. Kernel watches file descriptors in hardware/network buffers
                             │
4. Socket receives data ──► Kernel notifies Libuv event loop
                             │
5. Libuv queues callback ──► V8 Call Stack executes JS handler
```

- When an HTTP socket opens, Node registers the file descriptor with the OS kernel's event demultiplexer (`epoll`/`kqueue`) in non-blocking mode (`O_NONBLOCK`).
- The single JavaScript thread yields control immediately to process other requests.
- When TCP packets arrive, the OS kernel signals Libuv. Libuv places the associated callback into the Event Loop's Poll queue.
- The single JavaScript thread executes the callback when the Call Stack empties.

| Metric / Dimension | Thread-per-Connection Model | Node.js Reactor Pattern |
|---|---|---|
| **Concurrency Ceiling** | Limited by OS thread limits (~10,000 threads) | Tens of thousands of sockets per process |
| **Memory per Socket** | High (1–2MB per thread stack) | Low (a few kilobytes for socket handle) |
| **CPU Overhead** | High context-switching penalties | Zero context switches for I/O waits |
| **Weakness** | Tolerates CPU blocking easily | Single CPU-intensive loop blocks all users |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a developer puts a synchronous `while(true)` loop or `crypto.pbkdf2Sync()` in an HTTP request handler?"  
*Senior Answer:* Because the JavaScript call stack runs on a single thread, synchronous CPU-bound operations occupy that thread continuously. The Event Loop cannot advance to poll incoming network packets or execute timers. All concurrent HTTP connections stall, health probes fail, and the application becomes completely unresponsive until the synchronous computation completes.

---

## 2. The Libuv Event Loop Phases Deep Dive

### Q3: What are the distinct phases of the Libuv Event Loop, and in what exact sequence do they execute?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[EventLoop]` `[Libuv]` `[Internals]`

**Answer:**
The Libuv Event Loop runs in a continuous tick cycle through **6 specific phases** in an unvarying order. Each phase maintains a FIFO queue of callbacks:

```text
   ┌──────────────────────────────────────────────┐
┌─►│ 1. Timers                                    │ ──► setTimeout(), setInterval()
│  └──────────────────────┬───────────────────────┘
│  ┌──────────────────────▼───────────────────────┐
│  │ 2. Pending Callbacks                         │ ──► I/O callbacks deferred from prev tick
│  └──────────────────────┬───────────────────────┘
│  ┌──────────────────────▼───────────────────────┐
│  │ 3. Idle, Prepare                             │ ──► Internal Libuv subsystem only
│  └──────────────────────┬───────────────────────┘
│  ┌──────────────────────▼───────────────────────┐
│  │ 4. Poll                                      │ ──► Retrieves new I/O events; blocks if idle
│  └──────────────────────┬───────────────────────┘
│  ┌──────────────────────▼───────────────────────┐
│  │ 5. Check                                     │ ──► setImmediate() callbacks execute here
│  └──────────────────────┬───────────────────────┘
│  ┌──────────────────────▼───────────────────────┐
│  │ 6. Close Callbacks                           │ ──► socket.on('close'), handle cleanups
└──┴──────────────────────────────────────────────┘
```

1. **Timers Phase:** Executes callbacks scheduled by expired timers (`setTimeout()` and `setInterval()`). Note: Node checks if the threshold has passed; it does not execute them at the exact millisecond if the call stack was busy.
2. **Pending Callbacks (I/O Callbacks):** Executes system-level I/O callbacks deferred from the previous loop iteration (e.g., some TCP errors like `ECONNREFUSED` reported by the OS).
3. **Idle, Prepare Phase:** Used strictly internally by Libuv for state synchronization before polling.
4. **Poll Phase:**
   - Calculates how long it should block and wait for I/O.
   - Processes events in the poll queue (incoming network packets, completed disk reads).
   - If the poll queue is empty:
     - If `setImmediate()` callbacks are scheduled, the loop exits Poll and proceeds to **Check**.
     - If no `setImmediate()` callbacks exist, the loop blocks and waits for OS I/O events up to the nearest timer threshold.
5. **Check Phase:** Executes callbacks scheduled exclusively by `setImmediate()`.
6. **Close Callbacks Phase:** Executes handle close events, such as `socket.on('close', ...)`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Where do Promises and `process.nextTick` live in this diagram? Which phase are they?"  
*Senior Answer:* Neither Promises nor `process.nextTick` are part of Libuv or any of the 6 Libuv event loop phases. They are managed by V8 and Node's JavaScript layer as **Microtask Queues**. Microtasks are drained immediately when the currently executing JavaScript operation finishes, between transitions of *every single callback* across all Libuv phases.

---

### Q4: Explain the execution order of `setTimeout(fn, 0)` versus `setImmediate(fn)`. Why is top-level behavior nondeterministic, but deterministic inside an I/O callback?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction  
**Tags:** `[EventLoop]` `[setImmediate]` `[setTimeout]` `[Gotcha]`

**Answer:**

#### Scenario A: Top-Level Script
```javascript
// index.js
setTimeout(() => {
  console.log('setTimeout');
}, 0);

setImmediate(() => {
  console.log('setImmediate');
});
```

**Output:** Non-deterministic! Sometimes `setTimeout` logs first; sometimes `setImmediate` logs first.
**Why:**
- When Node.js starts, it compiles and runs the main script, then enters the Event Loop starting at the **Timers phase**.
- In V8/Node, `setTimeout(fn, 0)` is internally normalized to `setTimeout(fn, 1)` because a 0ms timeout is not representable.
- Depending on CPU load and the precision of the system clock, entering the event loop may take < 1ms or >= 1ms:
  - If entering took >= 1ms: The 1ms timer has already expired. Timers phase fires ➔ `setTimeout` prints first.
  - If entering took < 1ms: The timer has not expired yet. The loop skips Timers, advances through Poll to Check phase ➔ `setImmediate` prints first.

#### Scenario B: Inside an I/O Cycle
```javascript
const fs = require('node:fs');

fs.readFile(__filename, () => {
  setTimeout(() => {
    console.log('setTimeout inside I/O');
  }, 0);

  setImmediate(() => {
    console.log('setImmediate inside I/O');
  });
});
```

**Output (100% Deterministic):**
```text
setImmediate inside I/O
setTimeout inside I/O
```

**Why:**
- The `fs.readFile` callback executes inside the **Poll phase**.
- While executing this callback, we schedule both `setTimeout` and `setImmediate`.
- After completing the `readFile` callback in the Poll phase, the loop moves directly forward in its cycle to the **Check phase**.
- The Check phase executes `setImmediate` **before** the event loop can wrap around to the Timers phase on the next iteration.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If you want code to execute asynchronously as fast as possible on the next tick without blocking I/O, which should you use: `setImmediate()` or `setTimeout(..., 0)`?"  
*Senior Answer:* Always use `setImmediate()`. It avoids the millisecond timer normalization penalty, eliminates Libuv timer heap traversal, and guarantees execution in the very next Check phase right after I/O polling.

---

## 3. Microtask Queues & Starvation Mechanics

### Q5: What is the exact difference between `process.nextTick()` and `queueMicrotask()` / `Promise.resolve()`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Microtasks]` `[nextTick]` `[Promises]`

**Answer:**
Node.js maintains two separate queues for deferred asynchronous execution that run outside the Libuv phases:

1. **The `process.nextTick` Queue:** Specific to Node.js.
2. **The Microtask Queue:** Managed by V8 (executes Promise `.then()`/`.catch()`/`.finally()` handlers and `queueMicrotask()`).

```text
                      [ JavaScript Call Stack Empties ]
                                      │
                                      ▼
                    ┌───────────────────────────────────┐
                    │     process.nextTick Queue        │
                    │   (Drained completely first)      │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────┐
                    │     Promise Microtask Queue       │
                    │      (queueMicrotask / then)      │
                    └─────────────────┬─────────────────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────┐
                    │      Next Libuv Phase Callback    │
                    └───────────────────────────────────┘
```

#### Rules of Precedence:
- Whenever the call stack clears, Node.js flushes the entire `process.nextTick` queue **before** checking the Promise microtask queue.
- Both microtask queues take absolute priority over any Libuv phase (Timers, Poll, Check).

```javascript
Promise.resolve().then(() => console.log('1. Promise microtask'));
queueMicrotask(() => console.log('2. queueMicrotask'));
process.nextTick(() => console.log('3. nextTick 1'));
process.nextTick(() => {
  console.log('4. nextTick 2');
  process.nextTick(() => console.log('5. nested nextTick'));
});

console.log('6. Synchronous');
```

**Output:**
```text
6. Synchronous
3. nextTick 1
4. nextTick 2
5. nested nextTick
1. Promise microtask
2. queueMicrotask
```
*Note that even the nested `nextTick` executes before the outer Promise microtask because Node completely drains the `nextTick` queue before touching Promise jobs.*

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When is `process.nextTick()` legitimately needed in production code?"  
*Senior Answer:* To allow constructors or synchronous initializers to emit events or execute callbacks asynchronously after the current call stack finishes, allowing the consumer time to attach event listeners. For example:
```javascript
function StreamWrapper() {
  EventEmitter.call(this);
  // If we emitted 'open' synchronously here, listeners attached by consumer wouldn't catch it!
  process.nextTick(() => this.emit('open'));
}
const s = new StreamWrapper();
s.on('open', () => { /* Guaranteed to catch the event */ });
```

---

### Q6: What is Event Loop Starvation, and how can recursive `process.nextTick()` crash or freeze a production service?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[EventLoop]` `[Starvation]` `[ProductionBug]`

**Answer:**
**Event Loop Starvation** occurs when microtasks continuously feed the microtask queue without allowing the call stack to return control to Libuv. Because Node.js drains the microtask queue exhaustively before advancing to the next Libuv phase, Libuv can never reach the Poll phase (to accept new HTTP connections or read disk files) or the Timers phase.

#### The Poison Pill (Recursive `nextTick`):
```javascript
// BAD: Starves the entire process indefinitely
function infiniteTick() {
  process.nextTick(infiniteTick);
}
infiniteTick();

// Incoming HTTP requests, timers, and I/O will NEVER run!
setTimeout(() => console.log('This will NEVER print'), 100);
```

#### The Fix (Yielding to the Event Loop):
Use `setImmediate()`. Because `setImmediate()` queues a callback into Libuv's **Check phase**, the event loop is guaranteed to advance through the other phases (Timers, Poll, Close) on successive loop ticks rather than starving them in a microtask spin.

```javascript
// GOOD: Yields control after each turn
function cooperativeChunk() {
  setImmediate(cooperativeChunk);
}
cooperativeChunk();

setTimeout(() => console.log('This WILL print'), 100);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does recursive `Promise.resolve().then(...)` cause the same starvation as `process.nextTick()`?"  
*Senior Answer:* Yes. In modern V8/Node.js versions, recursive Promise resolution (`function loop() { return Promise.resolve().then(loop); }`) also starves the event loop because V8 drains the microtask checkpoint until the queue is empty before relinquishing control to Libuv.

---

## 4. Timers, Drift & Execution Order Predictions

### Q7: Predict the exact output of this complex asynchronous execution sequence and explain the mechanics behind every step.
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction  
**Tags:** `[ExecutionOrder]` `[Microtasks]` `[EventLoop]`

```javascript
const fs = require('node:fs');

console.log('1: Start');

setTimeout(() => {
  console.log('2: Timeout 1');
  Promise.resolve().then(() => console.log('3: Promise inside Timeout 1'));
  process.nextTick(() => console.log('4: nextTick inside Timeout 1'));
}, 0);

setImmediate(() => {
  console.log('5: Immediate 1');
  process.nextTick(() => console.log('6: nextTick inside Immediate 1'));
});

Promise.resolve().then(() => {
  console.log('7: Promise 1');
  process.nextTick(() => console.log('8: nextTick inside Promise 1'));
});

process.nextTick(() => {
  console.log('9: nextTick 1');
  Promise.resolve().then(() => console.log('10: Promise inside nextTick 1'));
});

fs.readdir(__dirname, () => {
  console.log('11: fs.readdir');
});

console.log('12: End');
```

**Output:**
```text
1: Start
12: End
9: nextTick 1
7: Promise 1
10: Promise inside nextTick 1
8: nextTick inside Promise 1
2: Timeout 1  (or 5: Immediate 1 depending on startup drift)
4: nextTick inside Timeout 1
3: Promise inside Timeout 1
5: Immediate 1 (or 2: Timeout 1)
6: nextTick inside Immediate 1
11: fs.readdir
```

**Step-by-step Trace:**
1. **Synchronous Execution:** `1: Start` and `12: End` print immediately. Synchronous script queues `nextTick 1`, `Promise 1`, `Timeout 1`, `Immediate 1`, and initiates `fs.readdir`.
2. **First Microtask Drain (before entering event loop):**
   - Drain `nextTick` queue: Prints `9: nextTick 1`. During its execution, it schedules `10: Promise inside nextTick 1`.
   - Next, drain Promise microtasks: Prints `7: Promise 1`. During its execution, it schedules `8: nextTick inside Promise 1`.
   - Drain `10: Promise inside nextTick 1`.
   - Node detects `8: nextTick inside Promise 1` in the nextTick queue and flushes it.
3. **Event Loop Turn 1 (Timers Phase):**
   - `Timeout 1` fires: Prints `2: Timeout 1`.
   - Immediately after the timer callback completes, microtasks flush:
     - `nextTick` runs first: Prints `4: nextTick inside Timeout 1`.
     - Promise runs: Prints `3: Promise inside Timeout 1`.
4. **Event Loop Turn 1 (Check Phase):**
   - `Immediate 1` fires: Prints `5: Immediate 1`.
   - Microtask flush: Prints `6: nextTick inside Immediate 1`.
5. **Event Loop Turn 2 (Poll Phase):**
   - The OS thread pool finishes directory reading: Prints `11: fs.readdir`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "In older Node versions (Node 10 and below), did microtasks run between every timer callback or only after the entire Timers queue emptied?"  
*Senior Answer:* In Node 10 and earlier, Node executed all pending timer callbacks in the Timers queue before running microtasks. In Node 11+, Node aligned with the WHATWG browser standard: microtasks execute immediately after **each individual callback**, ensuring predictable cross-platform consistency.

---

### Q8: What is timer drift, and why is `setInterval(fn, 1000)` dangerous for high-precision scheduling?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Timers]` `[Performance]` `[Drift]`

**Answer:**
`setInterval(fn, ms)` does not guarantee execution at strictly fixed intervals. Two issues cause timer drift:

1. **Callback Execution Duration:** If `fn()` takes 200ms of synchronous CPU time, the next interval is scheduled relative to the completion, or multiple ticks compress together.
2. **Event Loop Lag:** If other I/O callbacks or microtasks delay the Libuv Timers phase, the execution drifts forward continuously over time.

```text
Target:   0s ─────── 1s ─────── 2s ─────── 3s ─────── 4s
Actual:   0s ─────── 1.05s ───── 2.12s ──── 3.28s ─── 4.45s (Accumulated Drift)
```

#### Production-Grade Drift-Corrected Scheduler:
```typescript
export class DriftCorrectedTimer {
  private expectedTime: number = 0;
  private timeoutId?: NodeJS.Timeout;

  constructor(
    private readonly intervalMs: number,
    private readonly callback: () => void | Promise<void>
  ) {}

  public start(): void {
    this.expectedTime = Date.now() + this.intervalMs;
    this.step();
  }

  private step = async (): Promise<void> => {
    const drift = Date.now() - this.expectedTime;
    
    await this.callback();

    this.expectedTime += this.intervalMs;
    // Compensate for accumulated drift in the next timer tick
    const nextInterval = Math.max(0, this.intervalMs - drift);
    this.timeoutId = setTimeout(this.step, nextInterval);
  };

  public stop(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What does `timer.unref()` do, and where is it used in production libraries?"  
*Senior Answer:* By default, active timers keep the Node.js event loop alive; the process will not exit while a timer is active. Calling `timer.unref()` removes the timer from the event loop's reference count. If the only remaining work in the process is an unreferenced timer, Node.js terminates cleanly. This is essential for background heartbeat pings, cache eviction loops, and connection pool keep-alives in libraries like `ioredis` or `pg`.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q9: What happens when an unhandled promise rejection occurs in modern Node.js vs older versions?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Promises]` `[Process]`

**Answer:**
- **Node.js <= 14:** Emitted an `UnhandledPromiseRejectionWarning` to stderr, but the process kept running.
- **Node.js 15+ (through Node 20 & 22):** The default unhandled rejection mode changed to `throw`. An unhandled rejection terminates the Node.js process with exit code `1` (`ERR_UNHANDLED_REJECTION`).

**Interviewer Follow-up:** *"Can you intercept this?"*  
**Senior Answer:** Yes, by attaching `process.on('unhandledRejection', (reason, promise) => { ... })`. However, catching and ignoring unhandled rejections is dangerous: the application is left in an unpredictable, partially mutated state. Best practice is to log the error structured via Pino, trigger alerting, and perform a graceful process exit.

---

### Q10: Does Node.js execute garbage collection on the main thread?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[V8]` `[GC]`

**Answer:**
Both. V8 performs **concurrent and parallel garbage collection**. Major Mark-Sweep-Compact marking and sweeping happens largely on background helper threads concurrently with JavaScript execution. However, final memory compaction, pointer updates, and young generation Scavenge cycles require short **Stop-The-World (STW) pauses** on the main thread, directly contributing to event loop lag.

---

### Q11: What is the return value of `setImmediate()` in Node.js vs the browser?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Timers]` `[Interop]`

**Answer:**
- In the browser, timer functions return a numeric `number` ID (e.g., `123`).
- In Node.js, `setTimeout()`, `setInterval()`, and `setImmediate()` return an **`Immediate` or `Timeout` object** (`NodeJS.Timeout`), which contains methods like `.ref()`, `.unref()`, and `.hasRef()`.

---

### Q12: Why can `JSON.parse()` cause high latency spikes in high-throughput API gateways?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[EventLoop]` `[Performance]`

**Answer:**
`JSON.parse()` and `JSON.stringify()` are completely **synchronous operations** executed on the V8 main thread. If a client sends a 20MB nested JSON payload, parsing it blocks the call stack for 50–150ms. During this interval, the event loop is completely frozen and cannot process incoming network packets for other connected clients.
*Mitigation:* Enforce strict payload body limits (e.g., 100KB in Fastify/Express) and offload massive JSON processing to a Worker Thread or streaming parser (`stream-json`).
