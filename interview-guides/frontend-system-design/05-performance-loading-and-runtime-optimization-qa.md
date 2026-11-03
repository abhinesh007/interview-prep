# 05 — Loading & Runtime Optimization

> Code Splitting & Dynamic Bundling, Media Pipelines (AVIF/WebP, Responsive `<picture>`), The PRPL Pattern, Resource Hints Hierarchy (`preload`, `prefetch`, `preconnect`), Tree-Shaking Mechanics, and V8 Memory Leak Diagnostics.

---

## 📑 Table of Contents
1. [Code Splitting & Dynamic Bundling Patterns](#1-code-splitting--dynamic-bundling-patterns)
2. [Asset Pipelines: Next-Gen Media & Web Fonts](#2-asset-pipelines-next-gen-media--web-fonts)
3. [The PRPL Pattern & Resource Hints Hierarchy](#3-the-prpl-pattern--resource-hints-hierarchy)
4. [V8 Memory Leaks & Detached DOM Diagnostics](#4-v8-memory-leaks--detached-dom-diagnostics)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Code Splitting & Dynamic Bundling Patterns

### Q1: How do modern bundlers split JavaScript code? Architect a multi-tiered code-splitting strategy for an enterprise SPA.

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Architecture  
**Tags:** `[CodeSplitting]` `[Webpack]` `[Vite]` `[Bundling]`

**Answer:**
Shipping a single monolithic `bundle.js` forces mobile browsers to download, parse, and compile megabytes of JavaScript that the user may never execute.

```text
Monolithic Bundle vs Multi-Tiered Code Splitting:

Monolithic Architecture (Anti-Pattern):
[===================== bundle.js (2.5MB) =====================]
(User on /login must download entire admin portal, rich-text editor, and charting engine!)

Multi-Tiered Code Splitting (Production Standard):
┌───────────────────────────┐ ◄── Downloaded on Initial Navigation
│ Core Runtime & Framework  │     (Shared vendor chunk: React, Router ~45KB)
├───────────────────────────┤
│ Active Route Chunk        │ ◄── Downloaded per Route (e.g., /login ~15KB)
└───────────────────────────┘
              ▲
              │ Prefetched on Idle or Hover
┌───────────────────────────┐ ┌───────────────────────────┐
│ Next Likely Route Chunk   │ │ Heavy Feature Chunk       │
│ (e.g., /dashboard ~30KB)  │ │ (e.g., Charting / PDF     │
└───────────────────────────┘ │  dynamic import ~120KB)   │
                              └───────────────────────────┘
```

#### The Three Tiers of Enterprise Code Splitting:
1. **Tier 1 — Route-Based Splitting:**
   Split at URL routing boundaries using dynamic `import()` and framework lazy primitives (React `lazy`, Angular standalone routes).
2. **Tier 2 — Interaction / Intent-Based Splitting:**
   Heavy interactive modules (rich text editors, date pickers, Stripe payment elements, export-to-PDF generators) should **never** load with the route. Defer loading until user intent is demonstrated:
   - *On Hover:* Prefetch the chunk when the user's cursor hovers over the "Export PDF" button.
   - *On Focus:* Prefetch when an input gains focus.
   - *On Click:* Load dynamically inside the click handler:
     ```typescript
     async function handleExportReport() {
       // Only downloaded when user explicitly clicks export!
       const { exportToPDF } = await import('@heavy-lib/pdf-exporter');
       exportToPDF(reportData);
     }
     ```
3. **Tier 3 — Vendor Chunk Splitting:**
   Separate stable, long-lived third-party dependencies (`react`, `react-dom`, `zustand`) from volatile, frequently deployed application business logic.
   - Set HTTP cache headers for vendor chunks to `Cache-Control: public, max-age=31536000, immutable`.
   - When you ship a bug fix in your app code, returning users only download the modified 10KB app chunk; the 80KB vendor chunk is served from browser disk cache instantly!

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the 'Too Many Micro-Chunks' hazard in HTTP/2?"  
*Senior Answer:* "While HTTP/2 multiplexing eliminated domain sharding, creating hundreds of tiny 1KB micro-chunks degrades performance: (1) **Compression Penalty:** Brotli/Gzip compresses one 100KB file far more efficiently than one hundred 1KB files because dictionary compression cannot share state across distinct requests. (2) **V8 Module Resolution Overhead:** Parsing hundreds of ES module dependency graphs blocks the main thread. Production bundlers (Rollup, Webpack) should enforce a minimum chunk size threshold (e.g., `minSize: 20000` = 20KB)."

---

## 2. Asset Pipelines: Next-Gen Media & Web Fonts

### Q2: Compare modern image formats (JPEG vs WebP vs AVIF). How do you implement a responsive, art-directed image pipeline with zero layout shift?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[AVIF]` `[WebP]` `[ResponsiveImages]` `[CLS]`

**Answer:**
Images represent over 60% of total page weight on typical websites.

#### Image Format Comparison:
- **JPEG / PNG:** Legacy baseline. Lossy (JPEG) or lossless (PNG). Large file size.
- **WebP:** ~30% smaller than JPEG with identical visual fidelity. Supported by 97%+ of browsers.
- **AVIF (AV1 Image File Format):** ~50% smaller than JPEG and ~20% smaller than WebP. Superior compression in high-frequency detail areas and dark gradients. Supports 10-bit and 12-bit HDR color.

#### Production Responsive `<picture>` Architecture:
```html
<picture>
  <!-- 1. Serve AVIF to cutting-edge browsers on high-DPI mobile screens -->
  <source
    type="image/avif"
    media="(max-width: 600px)"
    srcset="hero-mobile-1x.avif 1x, hero-mobile-2x.avif 2x" />

  <!-- 2. Serve AVIF to desktop viewports -->
  <source
    type="image/avif"
    media="(min-width: 601px)"
    srcset="hero-desktop-1x.avif 1x, hero-desktop-2x.avif 2x" />

  <!-- 3. Fallback to WebP for older browsers -->
  <source
    type="image/webp"
    srcset="hero-desktop-1x.webp 1x, hero-desktop-2x.webp 2x" />

  <!-- 4. Ultimate fallback to standard JPEG with explicit dimensions to PREVENT CLS -->
  <img
    src="hero-fallback.jpg"
    alt="Modern Workspace Setup"
    width="1200"
    height="675"
    fetchpriority="high"
    decoding="async"
    class="hero-image" />
</picture>
```

#### Crucial Attributes Explained:
1. `fetchpriority="high"`: Tells the browser network scheduler that this is the **LCP candidate**. Moves this image to the top of the HTTP request queue above non-critical scripts and images.
2. `decoding="async"`: Decodes image bytes off the Main Thread, preventing frame drops during user scrolling.
3. Explicit `width="1200"` and `height="675"`: Allows browser CSS layout engine to calculate the aspect ratio ($1200/675 = 1.777$) immediately, reserving exact layout space before bytes download and guaranteeing **CLS = 0**.

---

### Q3: How do Web Fonts cause FOIT and FOUT? How do you optimize web font delivery for instant visual rendering?

**Answer:**
When a browser encounters `@font-face`, it delays rendering text until the font file downloads:
- **FOIT (Flash of Invisible Text):** Browser hides text completely for up to 3 seconds while waiting for font download (bad user experience, blank screen).
- **FOUT (Flash of Unstyled Text):** Browser renders system fallback font immediately, then abruptly swaps to the custom web font when downloaded, triggering layout shifts (CLS).

```text
Web Font Optimization Pipeline:

1. Preload WOFF2 in HTML <head>:
   <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>

2. Use font-display: optional or swap with Metric Overrides:
```

```css
/* Eliminates CLS during font swap using CSS Font Metrics Overrides */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF; /* Latin Subsetting only! 15KB instead of 180KB */
}

/* Fallback font adjusted to match Inter's exact bounding box */
@font-face {
  font-family: 'Inter-Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%; /* Scales Arial glyphs to match Inter pixel-for-pixel */
}

body {
  font-family: 'Inter', 'Inter-Fallback', sans-serif;
}
```

---

## 3. The PRPL Pattern & Resource Hints Hierarchy

### Q4: Detail the PRPL pattern. What is the execution hierarchy among `dns-prefetch`, `preconnect`, `preload`, `prefetch`, and `modulepreload`?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[PRPL]` `[ResourceHints]` `[Preload]` `[Prefetch]`

**Answer:**
The **PRPL Pattern** was designed by Google to structure high-performance web applications on mobile networks:

```text
The PRPL Pattern:
┌──────────────┐   Push / Preload the most critical resources (HTML, critical CSS, LCP image).
│ P - PRELOAD  │
├──────────────┤   Render the initial route as rapidly as possible (FCP < 1.5s).
│ R - RENDER   │
├──────────────┤   Pre-cache remaining route assets in background using Service Workers.
│ P - PRE-CACHE│
├──────────────┤   Lazy-load off-screen components, secondary routes, and non-critical scripts.
│ L - LAZY-LOAD│
└──────────────┘
```

#### The Resource Hints Decision Hierarchy:

```text
Resource Hints Execution Matrix:

Level 1 (DNS):
<link rel="dns-prefetch" href="https://api.external.com">
Resolves domain IP in advance (~50ms saving). Minimal cost.

Level 2 (TCP + TLS):
<link rel="preconnect" href="https://cdn.store.com" crossorigin>
Performs DNS + TCP + TLS handshake (~200ms saving).
Use ONLY for critical domains used within the first 2 seconds! (Limit to 2-3 origins).

Level 3 (Current Navigation Critical Fetch):
<link rel="preload" href="/hero.avif" as="image">
Forces immediate high-priority download for the CURRENT page.

Level 4 (ES Modules Optimization):
<link rel="modulepreload" href="/app.js">
Preloads, compiles, and parses an ES module in parallel background threads.

Level 5 (Future Navigation Low-Priority Fetch):
<link rel="prefetch" href="/dashboard-chunk.js" as="script">
Downloads asset with low priority during idle network time for the NEXT page visit.
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you use `<link rel="preload">` on an asset that is not used by the page within 3 seconds?"  
*Senior Answer:* "Chrome prints a loud console warning: *'The resource was preloaded using link preload but not used within a few seconds from the window's load event.'* Preloading an unused asset steals high-priority bandwidth from actual critical assets and wastes user cellular data. Preload must be reserved strictly for assets discovered late in HTML (e.g., fonts defined inside external CSS files or LCP background images)."

---

## 4. V8 Memory Leaks & Detached DOM Diagnostics

### Q5: What are Detached DOM Nodes? Walk through diagnosing and fixing a client-side memory leak using Chrome DevTools Heap Snapshots.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[MemoryLeaks]` `[V8]` `[HeapSnapshot]` `[DetachedDOM]`

**Answer:**
A **Detached DOM Tree** occurs when a DOM element has been removed from the document tree (e.g., via `element.remove()` or component unmount), but a JavaScript variable or closure still retains a reference to it. The V8 garbage collector cannot free the element or any of its child nodes!

```text
Detached DOM Memory Leak Retention:

Document DOM Tree:
<html> ──► <body> ──► <div id="root"> (Component unmounts; node removed from tree!)

JavaScript Heap Memory:
window.analyticsListeners = [
  function onClick() {
    console.log(unmountedButton.id); ◄── Retains direct reference to unmounted DOM node!
  }
];
Result: unmountedButton and its entire DOM subtree CANNOT BE GARBAGE COLLECTED!
```

#### Debugging in Chrome DevTools:
1. Open **DevTools ➔ Memory Panel**.
2. Take **Heap Snapshot 1** (baseline).
3. Perform the user action (e.g., open and close a modal dialog 10 times).
4. Take **Heap Snapshot 2**.
5. Filter by **Class filter: `Detached`**.
6. Inspect `Detached HTMLDivElement`:
   - Expand the tree to view the **Retainers** panel at the bottom.
   - Look for the yellow highlighting (elements with direct JavaScript references) vs red highlighting (detached DOM trees retained by parent nodes).
   - Find the exact variable path (e.g., `window.eventBus.subscribers`).

#### Bug Hunting Code Example:
```typescript
// ❌ MEMORY LEAK: Retaining detached DOM node & event listener
export class NotificationWidget {
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    // Bug: Global window listener closures over 'this.container'
    window.addEventListener('resize', () => {
      this.updatePosition();
    });
  }

  public destroy() {
    this.container.remove(); // Removed from DOM, but 'this' is retained by window resize!
  }

  private updatePosition() {
    this.container.style.top = '10px';
  }
}

// ✅ FIXED: Clean up all listener references
export class NotificationWidgetFixed {
  private container: HTMLDivElement;
  private handleResize = () => this.updatePosition();

  constructor() {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    window.addEventListener('resize', this.handleResize);
  }

  public destroy() {
    window.removeEventListener('resize', this.handleResize); // Sever listener
    this.container.remove();
  }

  private updatePosition() {
    this.container.style.top = '10px';
  }
}
```

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🧩 Output Prediction: Tree-Shaking Failure. Why did importing a single helper function import 700KB of unused libraries?

**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[TreeShaking]` `[ESM]` `[Bundling]`

**Scenario:**
You have a utility file:
```javascript
// utils.js
import moment from 'moment';
import lodash from 'lodash';

export function add(a, b) {
  return a + b;
}

export function formatCustomDate(date) {
  return moment(date).format('YYYY-MM-DD');
}
```
In your app, you write:
```javascript
import { add } from './utils';
console.log(add(2, 3));
```
**Why does the production bundle still contain all of `moment` and `lodash`, and how do you fix it?**

#### Output & Mechanics:
The bundle contains both `moment` and `lodash`!
1. In `utils.js`, `import moment` and `import lodash` are top-level module statements.
2. Unless the bundler knows that importing these modules produces **no side effects**, it must preserve them in case executing the module modifies global state (e.g., patching prototypes).
3. If `package.json` does not declare `"sideEffects": false`, the bundler plays it safe and retains the imported dependencies.

#### The Fix:
1. Declare in `package.json`:
   ```json
   {
     "sideEffects": false
   }
   ```
2. Split utilities into independent atomic files (`math.js`, `date.js`) so that importing `add` never evaluates `date.js`.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What is the difference between `<script async>` and `<script defer>`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Answer:** Both download scripts asynchronously in parallel without blocking HTML parsing. However:
- `async`: Executes the moment the script bytes finish downloading, interrupting HTML parsing if parsing is still in progress. Execution ordering is **non-deterministic** (first downloaded executes first).
- `defer`: Defers execution until HTML parsing is completely finished, right before `DOMContentLoaded`. Execution ordering is **guaranteed** to match the order in HTML source.

### Q8: Why should you avoid using Barrel Files (`index.ts` exporting 100 modules) in large applications?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Answer:** Barrel files force bundlers and dev-servers (Vite/Webpack) to load, parse, and analyze the AST of every single exported file just to import one function. This balloons development server cold start times, increases bundle memory consumption, and frequently breaks tree-shaking when modules within the barrel have side effects.
