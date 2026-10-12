# 13 — Angular Performance, SSR & Deferrable Views

> Non-Destructive Hydration (`provideClientHydration`), Deferrable Views (`@defer`), Core Web Vitals (INP, LCP, CLS), Bundle Optimization via esbuild, TransferState API, and Memory Leak Profiling.

---

## 📑 Table of Contents
1. [Modern SSR & Non-Destructive Hydration](#1-modern-ssr--non-destructive-hydration)
2. [Deferrable Views (`@defer`) Deep-Dive](#2-deferrable-views-defer-deep-dive)
3. [State Transfer API (`TransferState`)](#3-state-transfer-api-transferstate)
4. [Build System & Bundle Optimization](#4-build-system--bundle-optimization)
5. [Memory Profiling & Detached DOM Nodes](#5-memory-profiling--detached-dom-nodes)
6. [🎯 Output Challenges & Hydration Gotchas](#6--output-challenges--hydration-gotchas)

---

## 1. Modern SSR & Non-Destructive Hydration

### Q1: What is Non-Destructive Hydration, and how does it differ from legacy Angular Universal SSR?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[SSR]` `[Hydration]`

**Answer:**
- **Legacy Angular Universal (Pre-v16):** The server rendered HTML and sent it to the client. When the client-side JavaScript bundle finished loading, Angular **destroyed the entire server-rendered DOM** and rebuilt the entire DOM tree from scratch. This caused an ugly visual flicker, dropped scroll position, and wasted CPU cycles.
- **Modern Non-Destructive Hydration (Angular 16+):** The server annotates DOM nodes with hydration IDs. When the client bundle initializes, Angular **attaches event listeners and change detection directly to the existing server-rendered DOM nodes** without destroying or re-creating them.

#### How to enable in `app.config.ts`:
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()) // Hydrates DOM and replays user clicks made before hydration!
  ]
};
```

**⚠️ Key Feature:** `withEventReplay()` captures user interactions (e.g. clicks or inputs) made while JavaScript is still downloading and replays them once hydration completes, eliminating dead clicks!

---

### Q2: What causes Hydration Mismatch Errors, and how do you resolve them?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[HydrationErrors]` `[SSR]`

**Answer:**
A hydration mismatch occurs when the DOM structure generated on the server does not match the DOM structure generated during the initial client-side render pass:
`Error: NG0500: During hydration Angular expected an element matching "div", but found "span".`

#### Common Root Causes & Fixes:
1. **Invalid HTML Nesting:** Browser DOM parsers automatically rewrite invalid HTML (e.g., placing a `<div>` inside a `<p>`, or forgetting `<tbody>` inside `<table>`).  
   *Fix:* Write valid HTML5 markup.
2. **Accessing Client-Only Globals (`window`, `localStorage`, `navigator`):**
   ```typescript
   // ❌ Broken in SSR:
   const theme = localStorage.getItem('theme'); // Crashes on Node server!
   ```
   *Fix:* Guard with `isPlatformBrowser`:
   ```typescript
   private platformId = inject(PLATFORM_ID);
   if (isPlatformBrowser(this.platformId)) {
     const theme = localStorage.getItem('theme');
   }
   ```
3. **Render Differences (Timestamps / Randomness):** Generating `new Date()` or `Math.random()` in the template creates different text on server vs client.
4. **Escape Hatch:** If a legacy third-party component cannot be hydrated, suppress hydration for that element:
   ```html
   <div ngSkipHydration>
     <app-legacy-chart />
   </div>
   ```

---

## 2. Deferrable Views (`@defer`) Deep-Dive

### Q3: How do Deferrable Views (`@defer`) work, and what are all 4 sub-blocks?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[defer]` `[Modern]`

**Answer:**
Introduced in Angular 17, `@defer` is a compiler-level feature that automatically splits code into separate lazy-loaded JavaScript chunks and delays rendering until specified conditions or user interactions occur.

```html
@defer (on viewport; prefetch on idle) {
  <app-heavy-comments [postId]="id()" />
} @placeholder (minimum 500ms) {
  <div class="skeleton-comments">Comments will appear when scrolled into view...</div>
} @loading (after 100ms; minimum 500ms) {
  <div class="spinner">Loading comments...</div>
} @error {
  <div class="error-box">Failed to load comments.</div>
}
```

### The 4 Blocks:
1. **`@defer`:** The heavy component/UI to load lazily. Angular automatically extracts this into an independent chunk bundle.
2. **`@placeholder`:** Rendered immediately before defer triggers. Supports `minimum` display time to avoid UI flickering.
3. **`@loading`:** Displayed while the lazy bundle is downloading over the network. Supports `after` (delay before showing spinner) and `minimum` duration.
4. **`@error`:** Displayed if the JavaScript chunk fails to download (network offline).

---

### Q4: List all `@defer` Triggers and explain the difference between `on` vs `when`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[defer]` `[Performance]`

**Answer:**
- **`on <trigger>`:** Triggers based on declarative user or browser events.
- **`when <expression>`:** Triggers based on a boolean imperative or reactive condition (e.g. `when isUserAdmin()`).

| Trigger | When It Fires |
|---|---|
| **`on idle`** | Default trigger; fires when the browser main thread is idle (`requestIdleCallback`). |
| **`on viewport`** | Fires when the placeholder scrolls into view (uses native `IntersectionObserver`). |
| **`on interaction`** | Fires when user clicks or types into the placeholder element. |
| **`on hover`** | Fires when user hovers their mouse over the placeholder element. |
| **`on immediate`** | Fires immediately once the main page finishes initial rendering. |
| **`on timer(2s)`** | Fires after a specified duration. |

#### Combining Triggers with Prefetching:
```html
<!-- Prefetch bundle in background when idle, but only RENDER when user hovers! -->
@defer (on hover; prefetch on idle) {
  <app-product-reviews />
}
```

---

## 3. State Transfer API (`TransferState`)

### Q5: What is `TransferState`, and why is `withHttpTransferCacheOptions()` critical for SSR performance?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[TransferState]` `[SSR]`

**Answer:**
Without state transfer, an SSR application suffers from **Duplicate HTTP Calls**:
1. Server executes `GET /api/user` and renders the HTML.
2. Client downloads the bundle and hydrates the page.
3. Client component executes its `ngOnInit` and **fires `GET /api/user` a second time!**

`TransferState` serializes API responses on the server and embeds them as a `<script id="ng-state">` JSON tag in the HTML. On the client, Angular reads from this cache instead of repeating the network request!

#### Modern Automatic Transfer Cache (Angular 16+):
Enabled automatically with `provideClientHydration()`, or customized via:
```typescript
provideClientHydration(
  withHttpTransferCacheOptions({
    includePostRequests: false,
    filter: (req) => !req.url.includes('/realtime-stock')
  })
)
```

---

## 4. Build System & Bundle Optimization

### Q6: How does the new esbuild Application Builder (`@angular-devkit/build-angular:application`) outperform Webpack?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[esbuild]` `[Tooling]`

**Answer:**
Starting in Angular 17, the default build toolchain transitioned from Webpack to a modern hybrid pipeline:
- **Production Builds:** Powered by **esbuild** (written in Go) for blistering compilation speed, superior dead-code elimination, and direct ES2022 output.
- **Development Server:** Powered by **Vite**, delivering near-instant hot module replacement (HMR).

```text
Build Benchmark Comparison (100k+ lines of Angular):
Webpack:  [ 45 - 90 seconds initial build ]
esbuild:  [ 4 - 8 seconds initial build ] (Up to 10x faster!)
```

### Key Optimizations:
1. Native ECMAScript Modules (ESM) output.
2. Direct CSS/SCSS compilation via LightningCSS / modern engines.
3. Built-in unified SSR bundling (bundles client and server in a single unified build step).

---

## 5. Memory Profiling & Detached DOM Nodes

### Q7: How do you identify and fix Detached DOM Tree memory leaks in an Angular application using Chrome DevTools?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🐛 Debug & Fix  
**Tags:** `[MemoryLeaks]` `[Performance]`

**Answer:**
A **Detached DOM Node** occurs when a DOM element is removed from the document tree, but a JavaScript object (e.g. a dangling event listener, global service callback, or unclosed RxJS subscription) still holds a reference to it. The browser's garbage collector cannot free the memory.

#### How to Profile in Chrome DevTools:
1. Open DevTools ➔ **Memory Tab** ➔ Select **Heap snapshot**.
2. Take Baseline Snapshot #1.
3. Perform the user action (e.g. open a complex modal or navigate to a heavy table view).
4. Close the modal / navigate away.
5. Take Snapshot #2.
6. In the Class Filter, type **`Detached`** (e.g., `Detached HTMLDivElement`).
7. Inspect the **Retainers Tree** at the bottom to identify the variable holding the reference.

#### Common Culprits:
- Dangling RxJS subscriptions storing component references in closures.
- Attaching listeners to `window` or `document` via `addEventListener` without cleaning up in `DestroyRef`.
- Third-party chart/editor libraries not calling `.destroy()` when the Angular component unmounts.
