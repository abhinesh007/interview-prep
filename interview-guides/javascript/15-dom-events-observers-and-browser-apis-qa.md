# 15 — DOM Mechanics, Events, Observers & Web Platform APIs

> Deep dive into the Critical Rendering Path (CRP), event bubbling and capturing, passive event listeners, modern Observer APIs (`Intersection`, `Resize`, `Mutation`), multi-threading with Web Workers (`Transferable` objects), and cross-tab communication.

---

## 📑 Table of Contents
1. [The Critical Rendering Path (CRP) & Reflow vs Repaint](#1-the-critical-rendering-path-crp--reflow-vs-repaint)
2. [Event Propagation & Delegation Mechanics](#2-event-propagation--delegation-mechanics)
3. [Modern Observer APIs](#3-modern-observer-apis)
4. [Multi-Threading with Web Workers & Transferables](#4-multi-threading-with-web-workers--transferables)
5. [Cross-Tab & Cross-Window Communication](#5-cross-tab--cross-window-communication)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Critical Rendering Path (CRP) & Reflow vs Repaint

### Q1: Walk through the Critical Rendering Path (CRP). What is the difference between Reflow, Repaint, and Composite-Only changes?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Visual Flow  
**Tags:** `[CRP]` `[Reflow]` `[Repaint]` `[Composite]` `[Performance]`

**Answer:**

```text
HTML ──> DOM Tree ──┐
                    ├──> Render Tree ──> Layout (Reflow) ──> Paint ──> Compositing
CSS  ──> CSSOM   ──┘                    (Geometry & Box)    (Pixels)   (GPU Layers)
```

1. **Reflow (Layout):** The browser calculates the exact geometric positions and dimensions of elements.
   - *Triggers:* Changing `width`, `height`, `margin`, `padding`, `display`, adding/removing DOM elements, or resizing the viewport.
   - *Cost:* **Extremely expensive**; often recalculates geometric layout for child and parent nodes.
2. **Repaint:** Redrawing visual elements to screen pixels without altering geometry.
   - *Triggers:* Changing `color`, `background-color`, `visibility`, `box-shadow`.
   - *Cost:* Medium; skips Layout, but requires rasterization.
3. **Composite-Only (GPU Accelerated):**
   - *Triggers:* Animating `transform` (`translate3d`, `scale`) or `opacity`.
   - *Cost:* **Cheapest / 60fps Smooth**; the element is promoted to its own GPU layer (RenderLayer). The GPU composites the layer without running Layout or Paint on the main thread!

---

## 2. Event Propagation & Delegation Mechanics

### Q3: Explain the 3 phases of DOM event propagation. Why are passive event listeners critical for smooth mobile scrolling?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Mobile Optimization  
**Tags:** `[Event-Propagation]` `[Capturing]` `[Bubbling]` `[Passive-Listeners]`

**Answer:**

```text
               Phase 1: Capturing Phase (Downwards from Window)
                       Window ──► Document ──► <body> ──► <div>
                                                            │
               Phase 2: Target Phase ───────────────────────┤
                                                            ▼
                                                        <button>
                                                            │
               Phase 3: Bubbling Phase (Upwards to Window)  │
                       Window ◄── Document ◄── <body> ◄── <div>
```

1. **Capturing Phase:** Event trickles down from `window` through ancestors toward the target. Registered via `{ capture: true }`.
2. **Target Phase:** Event reaches the actual element clicked.
3. **Bubbling Phase:** Event bubbles upwards through ancestors back to `window`. (Default mode).

### Passive Event Listeners (`{ passive: true }`):
When a user touches or scrolls a touchscreen, the browser thread normally pauses scrolling to check if any `touchstart` or `touchmove` listener calls `event.preventDefault()`. This causes noticeable scroll stutter and lag.

Marking a listener as **passive** informs the browser:
> *"This listener promises it will NEVER call `event.preventDefault()`. Start scrolling immediately on the GPU compositor thread without waiting for JavaScript!"*

```javascript
// High-Performance Smooth Touch Listener:
window.addEventListener("touchmove", onTouchMove, { passive: true });
```

---

## 3. Modern Observer APIs

### Q4: Compare `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. Implement infinite scrolling with `IntersectionObserver`.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Tooling  
**Tags:** `[IntersectionObserver]` `[ResizeObserver]` `[MutationObserver]` `[Infinite-Scroll]`

**Answer:**

| Observer API | Target Tracked | Execution Thread | Primary Production Use Case |
|---|---|---|---|
| **`IntersectionObserver`** | Visibility relative to viewport or parent | Off main thread | Lazy loading images; infinite scroll; tracking ad viewability. |
| **`ResizeObserver`** | Dimension shifts of specific element box | Synchronous with layout | Responsive component widgets without `window.resize` listeners. |
| **`MutationObserver`** | DOM tree mutations (children, attributes) | Microtask queue | Third-party script monitoring; undo/redo systems. |

```javascript
// Production Infinite Scroll Implementation
function setupInfiniteScroll(sentinelElement, fetchNextPage) {
  let isLoading = false;

  const observer = new IntersectionObserver(async (entries) => {
    const [entry] = entries;

    if (entry.isIntersecting && !isLoading) {
      isLoading = true;
      try {
        await fetchNextPage();
      } finally {
        isLoading = false;
      }
    }
  }, {
    root: null, // Default: browser viewport
    rootMargin: "200px", // Trigger 200px before user reaches the bottom!
    threshold: 0.1
  });

  observer.observe(sentinelElement);
  return () => observer.disconnect();
}
```

---

## 4. Multi-Threading with Web Workers & Transferables

### Q5: How do Web Workers enable true multi-threading? What are `Transferable` objects and how do they eliminate copy overhead?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Memory Architecture  
**Tags:** `[Web-Workers]` `[Transferables]` `[ArrayBuffer]` `[Zero-Copy]`

**Answer:**
**Web Workers** run JavaScript on separate background OS threads with their own call stack, event loop, and global context (`DedicatedWorkerGlobalScope`). They have **zero access to the DOM**.

### Structured Cloning vs Transferables:
Normally, sending data to a worker via `worker.postMessage(data)` performs a **Structured Clone**:
- Sending a 100MB typed array causes the browser to allocate another 100MB on the worker heap and physically copy the bytes (taking 100ms+ of main-thread CPU time).

**The Solution: Transferable Objects (`ArrayBuffer`, `ImageBitmap`)**
Transferable objects allow **Zero-Copy Memory Ownership Transfer**:
- The memory pointer is instantly transferred from the main thread to the worker thread ($O(1)$ constant time: ~0.1ms).
- The original `ArrayBuffer` on the main thread is **detached** (its `.byteLength` becomes 0; it can no longer be read).

```javascript
// Main Thread: Generating heavy 50MB audio buffer
const audioData = new ArrayBuffer(50 * 1024 * 1024); // 50MB

// Transfer ownership to worker (passed as second argument array!)
worker.postMessage({ buffer: audioData }, [audioData]);

console.log(audioData.byteLength); // 0! (Detached and emptied instantly!)
```

---

## 5. Cross-Tab & Cross-Window Communication

### Q6: What are the modern mechanisms for communicating between different browser tabs and windows on the same origin?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Architecture & Comparison  
**Tags:** `[BroadcastChannel]` `[SharedWorker]` `[Cross-Tab]` `[postMessage]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│               Cross-Tab Communication Options          │
├─────────────────────┬──────────────────────────────────┤
│ Mechanism           │ Communication Topology           │
├─────────────────────┼──────────────────────────────────┤
│ 1. BroadcastChannel │ Many-to-Many pub/sub across all  │
│                     │ open tabs/windows on same origin │
│ 2. SharedWorker     │ Centralized worker thread acting │
│                     │ as single source of truth/hub    │
│ 3. Storage Event    │ Key-value mutation hook via      │
│                     │ window.addEventListener('storage'│
│ 4. window.postMessage Direct 1-to-1 messaging between  │
│                     │ window and iframe or popup       │
└─────────────────────┴──────────────────────────────────┘
```

```javascript
// BroadcastChannel: Clean One-to-Many Cross-Tab Communication
const channel = new BroadcastChannel("auth_sync");

// Broadcast login from Tab 1:
channel.postMessage({ type: "USER_LOGGED_IN", userId: 101 });

// Listen in Tab 2, Tab 3, etc.:
channel.onmessage = (event) => {
  if (event.data.type === "USER_LOGGED_IN") {
    refreshUserSession();
  }
};
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What is the difference between `innerHTML`, `innerText`, and `textContent`?
**Difficulty:** 🟢 Junior | **Type:** 📖 APIs  
**Answer:**
- **`innerHTML`:** Parses and emits HTML markup; vulnerable to XSS.
- **`innerText`:** Returns human-visible text; triggers a layout recalculation (reflow) because it respects CSS styles like `display: none` and `text-transform`.
- **`textContent`:** Returns raw text content of all nodes (including `<script>` and hidden text); fast because it **never** triggers reflow.

### Q8: What is a `DocumentFragment`?
**Difficulty:** 🟢 Junior | **Type:** 📖 DOM Performance  
**Answer:** A lightweight, minimal document container that exists entirely in memory detached from the main DOM tree. Appending 1,000 nodes to a `DocumentFragment` and injecting the fragment into the DOM triggers **only 1 single reflow** instead of 1,000 reflows.
