# 04 — Performance: Core Web Vitals & Metrics

> Core Web Vitals (LCP, INP, CLS), Secondary Metrics (TTFB, FCP, TBT), The Interaction to Next Paint (INP) Architecture, Long Tasks vs Long Animation Frames (LoAF API), Real User Monitoring (RUM) with `PerformanceObserver`, and Layout Thrashing Elimination.

---

## 📑 Table of Contents
1. [The Modern Core Web Vitals Standard (2024–2026)](#1-the-modern-core-web-vitals-standard-20242026)
2. [Interaction to Next Paint (INP) Deep Dive](#2-interaction-to-next-paint-inp-deep-dive)
3. [Cumulative Layout Shift (CLS) & Layout Stability](#3-cumulative-layout-shift-cls--layout-stability)
4. [Production Observability: RUM & LoAF API](#4-production-observability-rum--loaf-api)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Modern Core Web Vitals Standard (2024–2026)

### Q1: What are Google's Core Web Vitals? Break down each metric, its mathematical threshold, and its primary drivers.

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[CoreWebVitals]` `[LCP]` `[INP]` `[CLS]` `[Performance]`

**Answer:**
Core Web Vitals (CWV) are Google's subset of user-centric web performance metrics that directly impact SEO ranking and user conversion.

```text
The Core Web Vitals Triumvirate:

  1. Loading Speed                   2. Interactivity & Responsiveness          3. Visual Stability
 ┌───────────────────────────┐      ┌─────────────────────────────────┐      ┌─────────────────────────┐
 │ LCP                       │      │ INP (Replaced FID in Mar 2024)  │      │ CLS                     │
 │ Largest Contentful Paint  │      │ Interaction to Next Paint       │      │ Cumulative Layout Shift │
 │ Target: <= 2.5s           │      │ Target: <= 200ms                │      │ Target: <= 0.1          │
 └───────────────────────────┘      └─────────────────────────────────┘      └─────────────────────────┘
```

#### Detailed Metrics Breakdown:

| Metric | Threshold (Good) | What It Measures | Primary Root Causes |
| :--- | :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | $\le 2.5\text{s}$ | Time taken to render the largest visible content element in the viewport (hero image, video poster, large heading). | Slow server TTFB, render-blocking CSS/JS, slow asset load time, client-side render delay. |
| **INP** (Interaction to Next Paint) | $\le 200\text{ms}$ | The worst (98th percentile) latency of all user interactions (clicks, taps, keypresses) from input to the next painted frame. | Main thread blocking tasks (>50ms), massive DOM re-renders, layout thrashing, unoptimized event handlers. |
| **CLS** (Cumulative Layout Shift) | $\le 0.1$ | Sum of all unexpected layout shift scores during the entire page lifecycle. | Images/videos without dimension attributes, late-loaded dynamic ads/banners, FOIT/FOUT font swaps. |

#### Secondary Diagnostic Metrics:
- **TTFB (Time to First Byte):** Target $\le 800\text{ms}$. Measures network and backend processing time.
- **FCP (First Contentful Paint):** Target $\le 1.8\text{s}$. Marks the first moment any text, image, or canvas renders.
- **TBT (Total Blocking Time):** Lab proxy for INP. Sum of the blocking portions of all tasks exceeding 50ms between FCP and TTI.

```text
The LCP Sub-Part Breakdown (The 4 Quarters):

0s ────────────────────────────── Total LCP Window (Target <= 2.5s) ──────────────────────────────►
┌─────────────────┬────────────────────┬─────────────────────────────┬──────────────────────────┐
│ 1. TTFB (~20%)  │ 2. Load Delay (10%)│ 3. Load Duration (~40%)     │ 4. Render Delay (~30%)   │
│ DNS, TLS,       │ Time between HTML  │ Time to download the actual │ Time between image bytes │
│ Server HTML     │ parse & starting   │ image/font bytes across the │ arriving & browser       │
│ generation      │ the asset request  │ network pipe                │ painting to screen       │
└─────────────────┴────────────────────┴─────────────────────────────┴──────────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What element types can qualify as the LCP element?"  
*Senior Answer:* "The browser only considers: (1) `<img>` elements, (2) `<image>` elements inside `<svg>`, (3) `<video>` elements (via their `poster` attribute image), (4) elements with a CSS background image loaded via `url()`, and (5) block-level elements containing text nodes. Notably, SVG text, canvas elements, and video playback frames without posters are **excluded** from LCP candidacy."

---

## 2. Interaction to Next Paint (INP) Deep Dive

### Q2: Why did Google replace First Input Delay (FID) with Interaction to Next Paint (INP)? Deconstruct the three phases of an INP event.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Architecture  
**Tags:** `[INP]` `[FID]` `[EventLoop]` `[MainThread]`

**Answer:**
#### Why First Input Delay (FID) Was Broken:
1. **First-Only Blindspot:** FID measured only the **first** user interaction during page load. Once the page finished loading, FID stopped tracking completely. A page could freeze for 3 seconds on every subsequent click, yet pass FID with a green score.
2. **Ignored Processing & Paint:** FID measured only the **delay before the event handler started executing**. It did not measure how long the JavaScript handler took to run, nor how long the browser took to paint the visual feedback.

#### How INP Operates:
INP observes **all** click, tap, and keyboard interactions across the entire lifespan of the page session, reporting the worst interaction latency (calculated using the 98th percentile for sites with hundreds of interactions).

```text
The Anatomy of an INP Interaction:

User Clicks Button
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. INPUT DELAY (Queue Time)                                            │
│    Time waiting for previous Long Tasks on Main Thread to finish       │
│    (e.g., background analytics, React hydration, GC pauses)            │
├────────────────────────────────────────────────────────────────────────┤
│ 2. PROCESSING TIME (Execution Time)                                    │
│    Execution of all registered event handlers (click, mousedown, etc.) │
│    (e.g., synchronous state updates, expensive filtering, calculations)│
├────────────────────────────────────────────────────────────────────────┤
│ 3. PRESENTATION DELAY (Paint Time)                                     │
│    Browser recalculating styles, reflowing layout, compositing frames, │
│    and GPU rendering the next frame to the physical display screen     │
└────────────────────────────────────────────────────────────────────────┘
       │
       ▼
Next Frame Painted on Screen (INP Total = Input Delay + Processing + Presentation)
```

#### Mitigating INP Bottlenecks:
1. **Yield to the Main Thread using `scheduler.yield()`:**
   Break long synchronous work into smaller tasks to allow the browser to paint intermediate frames.
2. **Prioritize Visual Feedback (`isPending` / `requestAnimationFrame`):**
   Update optimistic loading spinners immediately before initiating heavy computations.
3. **Offload Heavy Calculations to Web Workers:**
   Keep data parsing, encryption, and sorting completely off the UI thread.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does `scheduler.yield()` differ from `setTimeout(fn, 0)` when breaking up Long Tasks?"  
*Senior Answer:* "`setTimeout(fn, 0)` pushes the continuation to the back of the browser macrotask queue and introduces an arbitrary clamp penalty (often 4ms). Crucially, other pending macrotasks and queued timers can jump in front of it. `scheduler.yield()` (or a polyfill using `MessageChannel`) yields execution back to the browser **just long enough to process input events and paint a frame**, then resumes execution at the front of the queue, avoiding starvation."

---

## 3. Cumulative Layout Shift (CLS) & Layout Stability

### Q3: How is Cumulative Layout Shift (CLS) mathematically calculated? What causes CLS in production, and how do you achieve CLS = 0?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[CLS]` `[LayoutShift]` `[CSS]`

**Answer:**
#### The Mathematical CLS Formula:
$$\text{Layout Shift Score} = \text{Impact Fraction} \times \text{Distance Fraction}$$
- **Impact Fraction:** The percentage of the visible viewport area that shifted elements occupied between the previous frame and the current frame.
- **Distance Fraction:** The greatest distance an unstable element moved relative to the viewport height.

```text
CLS Calculation Diagram:

  Viewport (1000px height)
 ┌────────────────────────┐
 │ Fixed Header           │
 ├────────────────────────┤
 │ [Dynamic Banner Injected!]  ◄── Pushes content down by 300px
 ├────────────────────────┤
 │ Main Content Box       │ ◄── Shifted from Y=100px to Y=400px (Distance = 300/1000 = 0.3)
 │ (Height: 500px)        │     Impacted Area = (300px + 500px) / 1000px = 0.8
 └────────────────────────┘
 Shift Score = 0.8 x 0.3 = 0.24 (FAILS CLS threshold of 0.1!)
```

#### Production Patterns to Achieve CLS = 0:
1. **Explicit Aspect Ratios on Images and Media:**
   Always specify `width` and `height` attributes on HTML `<img>` tags or use CSS `aspect-ratio`:
   ```css
   .card-image {
     width: 100%;
     aspect-ratio: 16 / 9; /* Browser reserves exact layout box before image downloads */
     object-fit: cover;
   }
   ```
2. **Reserve Space for Dynamic Ads and Banners:**
   Never inject a banner with `height: auto` after page load. Wrap it in a container with a fixed minimum height:
   ```css
   .ad-slot-container {
     min-height: 250px; /* Pre-allocated placeholder */
   }
   ```
3. **Prevent Font Swap Shifts (FOIT / FOUT):**
   Use `font-display: optional` or configure font metric overrides (`size-adjust`, `ascent-override`, `descent-override`) so that the fallback font matches the web font's exact bounding box dimensions.

---

## 4. Production Observability: RUM & LoAF API

### Q4: How do you build a Real User Monitoring (RUM) performance tracking pipeline using the `PerformanceObserver` and Long Animation Frames (LoAF) API?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[RUM]` `[PerformanceObserver]` `[LoAF]` `[Telemetry]`

**Answer:**
Synthetic Lighthouse tests run in sterile lab environments (throttled simulated Moto G4). Real users run on varied devices, varying battery states, and erratic network conditions. Production architectures rely on **RUM (Real User Monitoring)**.

```typescript
// Production RUM Performance Telemetry Collector
export class PerformanceTelemetry {
  private static endpoint = '/api/telemetry/vitals';

  public static init(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // 1. Observe Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { element?: Element };
      this.sendBeacon('LCP', lastEntry.startTime, {
        elementTag: lastEntry.element?.tagName,
        elementId: lastEntry.element?.id,
      });
    });

    // 2. Observe Layout Shifts (CLS)
    let clsScore = 0;
    this.observeMetric('layout-shift', (entries) => {
      for (const entry of entries) {
        // Only count shifts without recent user input (hadRecentInput prevents counting clicks)
        if (!(entry as any).hadRecentInput) {
          clsScore += (entry as any).value;
        }
      }
      this.sendBeacon('CLS', clsScore);
    });

    // 3. Observe Long Animation Frames (LoAF API - Chrome 123+)
    // Pinpoints the EXACT script URL and function blocking INP!
    if (PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')) {
      const loafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const loaf = entry as any;
          if (loaf.duration > 150) {
            for (const script of loaf.scripts) {
              this.sendBeacon('LoAF_BLOCK', loaf.duration, {
                invoker: script.invoker,
                sourceURL: script.sourceURL,
                sourceFunction: script.sourceFunctionName,
                charPosition: script.sourceCharPosition,
              });
            }
          }
        }
      });
      loafObserver.observe({ type: 'long-animation-frame', buffered: true });
    }
  }

  private static observeMetric(type: string, callback: (entries: PerformanceEntry[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()));
      observer.observe({ type, buffered: true });
    } catch (e) {
      // Type unsupported in this browser
    }
  }

  private static sendBeacon(metric: string, value: number, metadata?: Record<string, any>): void {
    const payload = JSON.stringify({
      metric,
      value: Math.round(value),
      metadata,
      url: window.location.pathname,
      timestamp: Date.now(),
    });

    // sendBeacon guarantees transmission even if tab is closing!
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, payload);
    } else {
      fetch(this.endpoint, { method: 'POST', body: payload, keepalive: true });
    }
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why must we check `entry.hadRecentInput` when tracking layout shifts for CLS?"  
*Senior Answer:* "When a user explicitly clicks an accordion or an expansion toggle, content moves down intentionally. The layout shift specification sets `hadRecentInput = true` for any shift that occurs within 500ms of a user input. If you fail to filter out `hadRecentInput`, user-initiated interactions will falsely inflate your CLS score, ruining your metrics."

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug: Layout Thrashing (Forced Synchronous Layout). Why is this loop taking 2.5 seconds to resize 100 elements?

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[LayoutThrashing]` `[Reflow]` `[DevTools]`

**Scenario:**
```javascript
function resizeCards() {
  const cards = document.querySelectorAll('.card');
  for (let i = 0; i < cards.length; i++) {
    // Read: Reading offsetWidth forces the browser to calculate layout immediately!
    const width = cards[i].offsetWidth;
    // Write: Changing style invalidates the layout tree!
    cards[i].style.height = (width * 0.75) + 'px';
  }
}
```

#### The Root Cause (The Read-Write Thrashing Loop):
1. In standard execution, the browser **batches** DOM style writes and defers layout calculation until the end of the frame.
2. In this loop, iteration 1 writes `style.height` (invalidating the layout).
3. In iteration 2, reading `offsetWidth` forces the browser to perform a **synchronous reflow (Forced Layout)** immediately to determine the exact pixel width.
4. The browser executes 100 reflows and layouts in a single frame, locking the Main Thread and triggering an INP disaster!

#### The Fix: Batch All Reads Before Writes
```javascript
function resizeCardsOptimized() {
  const cards = document.querySelectorAll('.card');
  const widths = new Array(cards.length);

  // 1. Batch ALL Reads First (Single clean layout calculation)
  for (let i = 0; i < cards.length; i++) {
    widths[i] = cards[i].offsetWidth;
  }

  // 2. Batch ALL Writes Second (Browser recalculates layout ONCE at end of frame)
  for (let i = 0; i < cards.length; i++) {
    cards[i].style.height = (widths[i] * 0.75) + 'px';
  }
}
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: How does `content-visibility: auto` improve rendering performance, and what is its caveat?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** `content-visibility: auto` instructs the browser to skip layout and painting for off-screen elements entirely until they approach the viewport. This can reduce initial render time by 50%+. **The Caveat:** When using it, you must provide `contain-intrinsic-size: auto 500px` to give off-screen elements an estimated height; otherwise, the page scrollbar will violently shrink and jump as elements enter the viewport, generating severe CLS.

### Q7: What is the difference between Lab Data (Lighthouse) and Field Data (Chrome User Experience Report - CrUX)?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Answer:** Lab Data measures performance in a controlled, simulated environment (fixed CPU/network throttling, single page visit). Field Data captures real user experiences across diverse devices, real cellular networks, and multi-page interaction sessions across 28-day rolling windows. Google uses **Field Data only** for Core Web Vitals SEO rankings.

### Q8: What is Total Blocking Time (TBT), and how is it calculated?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** TBT measures the total amount of time between First Contentful Paint (FCP) and Time to Interactive (TTI) where the Main Thread was blocked by Long Tasks. For any task exceeding 50ms, the time **beyond 50ms** is added to TBT. (e.g., a 120ms task contributes $120 - 50 = 70\text{ms}$ to TBT).
