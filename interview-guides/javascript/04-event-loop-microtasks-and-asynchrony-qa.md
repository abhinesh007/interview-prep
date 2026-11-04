# 04 — The Event Loop, Task Queues & Asynchronous Scheduling

> Deep dive into JavaScript's single-threaded concurrency model, the Call Stack, Microtasks vs Macrotasks, microtask starvation, 60fps rendering frame pipelines (`rAF` vs `rIC`), and architectural differences between Browser and Node.js `libuv` event loops.

---

## 📑 Table of Contents
1. [The Concurrency Model & Task Queues](#1-the-concurrency-model--task-queues)
2. [Microtask Starvation & Thread Freezing](#2-microtask-starvation--thread-freezing)
3. [The Browser Rendering Pipeline & Frame Timing](#3-the-browser-rendering-pipeline--frame-timing)
4. [Browser Event Loop vs Node.js `libuv` Event Loop](#4-browser-event-loop-vs-nodejs-libuv-event-loop)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. The Concurrency Model & Task Queues

### Q1: How does JavaScript achieve non-blocking asynchronous execution if it is strictly single-threaded?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Event-Loop]` `[Concurrency]` `[Web-APIs]` `[Single-Threaded]`

**Answer:**
JavaScript's runtime engine (V8) possesses only a **single call stack** and executes one instruction at a time. It achieves non-blocking behavior through collaboration with the **Host Environment** (the browser or Node.js runtime):

```text
┌────────────────────────────────────────────────────────┐
│                      Host Environment                  │
│                                                        │
│   ┌──────────────┐                  ┌──────────────┐   │
│   │  Call Stack  │                  │   Web APIs   │   │
│   │ (JS Engine)  │ ───────────────> │  (Background │   │
│   └──────────────┘   fetch/timers   │   Threads)   │   │
│          ▲                          └──────────────┘   │
│          │                                 │           │
│   Event  │                                 ▼ Event     │
│   Loop   │        ┌──────────────────────────────┐     │
│          └─────── │ Microtask Queue (Promises)   │ ◄───┘
│                   ├──────────────────────────────┤
│                   │ Macrotask Queue (setTimeout) │ ◄───┘
│                   └──────────────────────────────┘
└────────────────────────────────────────────────────────┘
```

1. **Call Stack:** Executes synchronous functions immediately.
2. **Web APIs / Host Bindings:** When an asynchronous operation is initiated (`setTimeout`, `fetch`, `addEventListener`), the engine delegates the actual waiting, disk I/O, or network polling to host C++ background threads. The Call Stack continues executing synchronous code without waiting!
3. **Task Queues:** When a background task completes (e.g., timer expires, HTTP packet arrives), the host pushes its callback onto a Task Queue.
4. **The Event Loop:** A continuous, low-latency loop that checks whether the Call Stack is empty. When empty, it transfers queued callbacks from the task queues to the Call Stack for execution.

---

### Q2: What is the exact execution algorithm of one turn of the Browser Event Loop?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[Event-Loop-Turn]` `[Microtasks]` `[Macrotasks]` `[HTML-Spec]`

**Answer:**
Per the W3C / WHATWG HTML Living Standard, one complete turn (tick) of the browser event loop executes strictly in this order:

```text
======================= The Event Loop Turn =======================
  Step 1: Pick and execute ONE oldest task from the Macrotask Queue.
             │
             ▼
  Step 2: DRAIN THE ENTIRE MICROTASK QUEUE COMPLETELY.
          (If a microtask schedules another microtask, that new
           microtask runs immediately in the SAME turn!)
             │
             ▼
  Step 3: Check Rendering Opportunity (Display Refresh: 60Hz / 120Hz):
          ├── Run requestAnimationFrame (rAF) callbacks
          ├── Recalculate Styles & Layout (Reflow)
          └── Paint pixels to screen
             │
             ▼
  Step 4: Run requestIdleCallback (rIC) if idle frame budget remains.
             │
             ▼
  Step 5: Repeat loop from Step 1!
```

**Classification of Queues:**
- **Macrotasks (Task Queue):** `setTimeout`, `setInterval`, `setImmediate` (Node), I/O events, UI interaction events (click, scroll), `MessageChannel`.
- **Microtasks:** `Promise.prototype.then / catch / finally`, `queueMicrotask()`, `MutationObserver` callbacks.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the key difference in how the Event Loop drains Macrotasks vs Microtasks?"  
*Senior Answer:* The Event Loop executes **only ONE Macrotask per turn**, after which it immediately pauses to drain the **entire Microtask queue until it is 100% empty**.

---

## 2. Microtask Starvation & Thread Freezing

### Q3: What is Microtask Starvation, and why does a recursive `Promise` loop freeze the browser while a recursive `setTimeout` does not?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Starvation]` `[Microtasks]` `[UI-Jank]` `[Event-Loop]`

**Answer:**
**Microtask Starvation** occurs when microtasks continuously schedule additional microtasks without yielding to the event loop.

```javascript
// CASE A: TOTAL BROWSER TAB FREEZE (Starvation)
function freezeTab() {
  Promise.resolve().then(freezeTab);
}
freezeTab();

// CASE B: RESPONSIVE BROWSER TAB (Non-blocking)
function keepResponsive() {
  setTimeout(keepResponsive, 0);
}
keepResponsive();
```

**Why Case A Freezes the UI:**
Because the Event Loop specification requires the microtask queue to be **completely drained** before moving to rendering or the next macrotask, `freezeTab` schedules another microtask inside the microtask queue. The queue is never empty!
Result:
- Macrotask queue is blocked.
- Browser **Rendering Phase is blocked**: user cannot click buttons, text cannot be selected, and animations freeze.

**Why Case B Stays Responsive:**
`setTimeout` queues a callback into the **Macrotask Queue**. The event loop executes exactly **one** macrotask, then drains microtasks, then allows the browser to re-paint and process user clicks, before picking the next `setTimeout` macrotask.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When should a production engineer intentionally use `queueMicrotask()`?"  
*Senior Answer:* When you need to guarantee execution ordering asynchronously (e.g., ensuring a consumer has time to register an event listener or attach a callback) but want the work to finish **before** the browser renders or paints pixels to the screen.

---

## 3. The Browser Rendering Pipeline & Frame Timing

### Q4: How does the Event Loop coordinate with screen refresh rates (60Hz / 120Hz), and where do `rAF` and `rIC` fit?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Performance  
**Tags:** `[requestAnimationFrame]` `[requestIdleCallback]` `[60fps]` `[Rendering]`

**Answer:**
Modern displays refresh at 60Hz (1 frame every **16.6ms**) or 120Hz (1 frame every **8.3ms**).
The browser rendering engine cannot paint while JavaScript code is running on the main thread!

```text
 0ms                      16.6ms                     33.2ms
  ├───────── Frame 1 ────────┼───────── Frame 2 ────────┤
  ┌────────┬──────┬────┬─────┬────────┬──────┬────┬─────┐
  │ JS/rAF │Style │Flow│Paint│ JS/rAF │Style │Flow│Paint│
  └────────┴──────┴────┴─────┴────────┴──────┴────┴─────┘
```

1. **`requestAnimationFrame(callback)` (rAF):**
   - Fires **immediately before** style recalculation and layout.
   - Guaranteed to synchronize with the hardware display refresh rate.
   - Using `setTimeout` for animations causes frame stutter (jank) because `setTimeout` can fire unpredictably midway through a frame or miss the vsync window.

2. **`requestIdleCallback(callback)` (rIC):**
   - Fires only if the browser finishes JS execution, styling, and painting with time to spare in the current 16.6ms frame budget.
   - Provides a `deadline.timeRemaining()` API so non-critical background jobs (e.g., analytics telemetry) can run without delaying input handling.

```javascript
// HIGH-PERFORMANCE CHUNKED PROCESSOR: Yielding to Main Thread
async function processHugeArray(items) {
  for (let i = 0; i < items.length; i++) {
    heavyComputation(items[i]);
    
    // Yield every 50 items to keep UI responsive and prevent Long Tasks
    if (i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
      // Or modern: await scheduler.yield();
    }
  }
}
```

---

## 4. Browser Event Loop vs Node.js `libuv` Event Loop

### Q5: How does Node.js's `libuv` event loop differ from the browser's event loop?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[NodeJS]` `[libuv]` `[Phases]` `[process.nextTick]`

**Answer:**
While browsers have a unified Macrotask and Microtask queue coordinating with rendering, Node.js uses **libuv**, which organizes asynchronous operations into **6 distinct chronological phases**:

```text
┌────────────────────────────────────────────────────────┐
│               Node.js libuv Event Loop Phases          │
├────────────────────────────────────────────────────────┤
│ 1. Timers: Executes setTimeout and setInterval         │
│ 2. Pending Callbacks: Executes deferred I/O callbacks  │
│ 3. Idle, Prepare: Used internally by libuv             │
│ 4. Poll: Retrieves new I/O events (blocks if waiting)  │
│ 5. Check: Executes setImmediate() callbacks            │
│ 6. Close Callbacks: Executes close events (socket.on)  │
└────────────────────────────────────────────────────────┘
```

**Microtasks in Node.js:**
Microtasks in Node.js are drained **between every single phase transition**:
- Node.js maintains **two distinct microtask queues**:
  1. **`process.nextTick` Queue:** Takes priority over all other microtasks!
  2. **Promise Microtask Queue:** Runs only after all pending `nextTick` callbacks are drained.

```text
Any Phase Ends ──> [Drain process.nextTick Queue] ──> [Drain Promise Queue] ──> Next Phase
```

**The Output Prediction Interleaving Trap:**
```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

Promise.resolve().then(() => {
  console.log('4');
  setTimeout(() => console.log('5'), 0);
});

console.log('6');
```

**Output:** `1` $\rightarrow$ `6` $\rightarrow$ `4` $\rightarrow$ `2` $\rightarrow$ `3` $\rightarrow$ `5`

**Execution Breakdown:**
1. Synchronous execution logs `1` and `6`.
2. Stack is empty; Microtask queue has `console.log('4')`. Runs and logs `4`, enqueueing `setTimeout 5`.
3. Microtasks empty; Event loop picks first Macrotask (`setTimeout 2`). Runs and logs `2`.
4. Enqueues microtask `3`.
5. Event loop drains microtasks immediately after the macrotask: runs and logs `3`.
6. Event loop picks next Macrotask (`setTimeout 5`). Runs and logs `5`.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: Why is `setTimeout(fn, 0)` clamped to a minimum delay of 4ms in browsers?
**Difficulty:** 🟡 Mid | **Type:** 📖 Specifications  
**Answer:** Per the HTML specification, once a timer has nested more than 5 times consecutively (`setTimeout` scheduling another `setTimeout`), the browser forces a minimum clamping delay of **4ms** to prevent timer loops from monopolizing CPU threads and battery life.

### Q7: What is `setImmediate()` vs `setTimeout(fn, 0)` in Node.js?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:** `setTimeout(fn, 0)` runs in the **Timers phase**, whereas `setImmediate()` runs in the **Check phase**. When both are scheduled within an I/O cycle (e.g., inside an `fs.readFile` callback), `setImmediate` is guaranteed to execute **before** `setTimeout`.

### Q8: What is defined as a "Long Task" in Chrome, and why does it damage Interaction to Next Paint (INP)?
**Difficulty:** 🔴 Senior | **Type:** 📖 Performance  
**Answer:** Any continuous main-thread JavaScript execution exceeding **50ms** is flagged as a **Long Task**. During a Long Task, the browser cannot respond to user inputs (clicks, keypresses). This input delay directly degrades the Core Web Vital **Interaction to Next Paint (INP)**.
