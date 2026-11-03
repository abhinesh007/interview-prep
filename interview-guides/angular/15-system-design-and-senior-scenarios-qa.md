# 15 — Angular System Design & Senior Enterprise Scenarios

> Micro-Frontends via Native/Module Federation, Enterprise Design Systems, Security (`DomSanitizer` & CSP Nonce), High-Throughput Real-Time State (1,000+ msgs/sec), Web Worker Offloading, and 24/7 Long-Running Memory Diagnostics.

---

## 📑 Table of Contents
1. [Enterprise Micro-Frontends (Module Federation)](#1-enterprise-micro-frontends-module-federation)
2. [Enterprise Design Systems Architecture](#2-enterprise-design-systems-architecture)
3. [Angular Security & Content Security Policy (CSP)](#3-angular-security--content-security-policy-csp)
4. [High-Throughput Real-Time Architecture (1,000 msgs/sec)](#4-high-throughput-real-time-architecture-1000-msgssec)
5. [Diagnostics: The 8-Hour Memory Leak Trading Terminal](#5-diagnostics-the-8-hour-memory-leak-trading-terminal)
6. [Offline-First Architecture & Service Workers](#6-offline-first-architecture--service-workers)

---

## 1. Enterprise Micro-Frontends (Module Federation)

### Q1: How do you architect an Enterprise Micro-Frontend system in Angular using Module Federation / Native Federation?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture  
**Tags:** `[MicroFrontends]` `[SystemDesign]`

**Answer:**
In large enterprises with 15+ independent squads, a monolithic deployment creates bottleneck deployments. Micro-Frontends allow independent deployment of feature slices while sharing common runtimes.

```text
                  [ Shell Host Application ]
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼ (Loads via HTTP)       ▼ (Loads via HTTP)       ▼ (Loads via HTTP)
[ MFE: Payments Remote ]  [ MFE: Analytics Remote ]  [ MFE: User Profile Remote ]
(Team Alpha, CI/CD #1)   (Team Beta, CI/CD #2)      (Team Gamma, CI/CD #3)

Shared Singletons in Browser:
- @angular/core, @angular/common, @angular/router, @angular/platform-browser
```

#### Modern Native Federation / Module Federation Configuration:
In modern Angular (esbuild-based), **Native Federation** leverages standard browser Import Maps and ESM:

```typescript
// shell: app.routes.ts
import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'payments',
    loadComponent: () =>
      loadRemoteModule('paymentsRemote', './Component').then(m => m.PaymentEntryComponent)
  }
];
```

#### Key Architectural Rules for MFE Success:
1. **Shared Runtime Singletons:** Configure `@angular/core`, `@angular/router`, and `rxjs` as **shared singletons** (`singleton: true, strictVersion: true`) so multiple MFEs don't load duplicate copies of Angular into browser memory.
2. **Cross-MFE Communication:** Never share global mutable state directly. Communicate across MFE boundaries using:
   - URL Route parameters and query strings (loose coupling).
   - Custom Browser Events (`window.dispatchEvent(new CustomEvent('org:auth-expired'))`).
   - Lightweight event bus token library.

---

## 2. Enterprise Design Systems Architecture

### Q3: How do you design an enterprise-grade UI Component Library in an Angular Nx Monorepo?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[DesignSystem]` `[Architecture]`

**Answer:**
A robust enterprise design system must balance consistency, accessibility, and theming across multiple brands without locking teams into rigid DOM structures.

```text
Layered Design System Architecture:
1. [ Design Tokens Layer ]     (CSS Custom Properties: colors, spacing, typography)
          │
2. [ Headless / CDK Layer ]    (Angular CDK: FocusTrap, Overlay, Portal, A11y, CVA)
          │
3. [ Core UI Primitives ]      (Button, Card, Modal, Input, Table with Directive Composition)
          │
4. [ Composite Patterns ]      (App Header, Global Navigation, Data Table with Filtering)
```

### Architectural Best Practices:
1. **Headless Behavior via Angular CDK:** Build complex components (dialogs, dropdowns, autocompletes) on top of `@angular/cdk` to ensure full WCAG AAA accessibility, ARIA attributes, and keyboard navigation.
2. **Theme Tokens via CSS Custom Properties:** Never hardcode HEX colors in SCSS. Use semantic tokens:
   `background: var(--color-surface-primary);`
   Switching themes (Dark mode, High Contrast, Brand B) simply swaps the root CSS class (`<body class="theme-brand-b">`).
3. **Directive Composition API:** Expose behaviors (e.g. ripple, tooltip) as composable `hostDirectives`.

---

## 3. Angular Security & Content Security Policy (CSP)

### Q4: How does Angular protect against Cross-Site Scripting (XSS)? When is `DomSanitizer` dangerous?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[XSS]`

**Answer:**
By default, Angular treats all values as untrusted. When values are inserted into templates via property, attribute, or style bindings (`[innerHTML]="val"`), Angular automatically sanitizes them according to the `SecurityContext`:
- HTML (`SecurityContext.HTML`)
- Style (`SecurityContext.STYLE`)
- Script (`SecurityContext.SCRIPT`)
- URL / Resource URL (`SecurityContext.URL`)

```html
<!-- If untrustedHtml contains <script>alert('hack')</script>, Angular strips the script tag! -->
<div [innerHTML]="untrustedHtml"></div>
```

#### ⚠️ The Major Vulnerability Hazard:
Angular provides escape hatches via `DomSanitizer`:
`bypassSecurityTrustHtml()`, `bypassSecurityTrustScript()`, `bypassSecurityTrustResourceUrl()`.

```typescript
// ❌ HIGH RISK OF XSS VULNERABILITY!
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(userInputFromQueryParam);
```
**Golden Rule:** **NEVER** call `bypassSecurityTrustHtml` on user-supplied or untrusted input! If rich HTML must be rendered from external sources, sanitize it using a battle-tested library like **DOMPurify** *before* trusting it in Angular.

---

### Q5: How do you configure a strict Content Security Policy (CSP) with Angular without using `unsafe-inline`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Security]` `[CSP]`

**Answer:**
Enterprise security policies frequently ban `'unsafe-inline'` for CSS and scripts to prevent XSS.  
Angular generates inline styles for component view encapsulation (`Emulated`). To comply with strict CSP without `'unsafe-inline'`:

Provide a **CSP Nonce** at application bootstrap:
```typescript
import { CSP_NONCE } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: CSP_NONCE,
      useValue: window.__CSP_NONCE__ // Passed by server-side HTML template
    }
  ]
};
```
Angular will automatically attach `nonce="..."` to every `<style>` tag it injects into the `<head>`!

---

## 4. High-Throughput Real-Time Architecture (1,000 msgs/sec)

### Q6: Architect an Angular dashboard that receives 1,000 WebSocket market ticks per second without freezing the UI or dropping below 60 FPS.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture  
**Tags:** `[Performance]` `[HighThroughput]`

**Answer:**
Directly binding 1,000 WebSocket emissions per second into Angular templates will trigger 1,000 change detection cycles, completely freezing the JavaScript main thread.

```text
High-Throughput Data Pipeline:
[ WebSocket (1,000 msgs/sec) ]
              │
              ▼
[ Web Worker (worker.ts) ] ──► Parses JSON, calculates rolling moving averages & deltas
              │
              ▼ (PostMessage batched at 60 FPS / 16ms buffer)
[ NgZone.runOutsideAngular() ] ──► Stores data in circular buffer / TypedArray
              │
              ▼ (Throttled Signal / requestAnimationFrame)
[ OnPush / Zoneless Component ] ──► Canvas / Virtualized Grid renders updated cells only
```

### Key Engineering Pillars:
1. **Offload parsing to a Web Worker:** Use `ng generate web-worker` to parse JSON and calculate math off the UI thread.
2. **Buffer and Throttle:** Batch updates using `sampleTime(16)` or `auditTime(33)` (~30–60 FPS) before notifying Angular.
3. **`NgZone.runOutsideAngular()`:** Listen to WebSocket events completely outside Angular.
4. **Zoneless / Signals:** Use a Signal to hold the visible viewport slice, rendering via **`@angular/cdk/scrolling` (Virtual Scroll)** or HTML5 Canvas.

---

## 5. Diagnostics: The 8-Hour Memory Leak Trading Terminal

### Q7: Enterprise Scenario: A financial trading terminal built with Angular runs out of memory (OOM crash) after 8 hours of continuous operation. Walk through your diagnostic playbook.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🐛 Debug & Fix  
**Tags:** `[Diagnostics]` `[MemoryLeaks]`

**Answer:**

#### Step 1: Reproduce & Isolate in DevTools
1. Run application in production mode with source maps enabled.
2. In Chrome DevTools ➔ **Performance tab**, record a 2-minute trace during active data streaming. Observe the **JS Heap Memory sawtooth pattern**. If the baseline memory continually rises after garbage collection cycles, a leak is verified.
3. In DevTools ➔ **Memory tab**, take **Allocation Instrumentation on Timeline**. Look for blue bars (allocations) that never turn gray (freed).

#### Step 2: Three Common Root Causes in Long-Running Angular Apps:
1. **RxJS Subscription Leak on Destroyed Components:**
   - *Symptom:* Switching tabs 50 times leaves 50 active subscriptions running in background memory.
   - *Check:* Audit for missing `takeUntilDestroyed()`.
2. **Global Event Listeners / Window Resizing:**
   - *Symptom:* `fromEvent(window, 'resize')` or `document.addEventListener('keydown')` added in services or components without unregistering.
3. **Retained Closures in Singletons:**
   - *Symptom:* A root service (`@Injectable({ providedIn: 'root' })`) maintains an internal cache array (`cache = []`) that appends messages without a maximum length or FIFO eviction policy.

#### Step 3: Verifying the Fix
Re-run heap snapshots and confirm that `Detached HTMLDivElement` count remains 0 after navigating away from heavy views.

---

## 6. Offline-First Architecture & Service Workers

### Q8: How do you implement an Offline-First Enterprise Angular PWA with `@angular/service-worker`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[PWA]` `[Offline]`

**Answer:**
Add official PWA support:
```bash
ng add @angular/pwa
```

Configure caching strategies in `ngsw-config.json`:
```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app-shell",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/*.css", "/*.js"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": ["/api/v1/catalog"],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "12h",
        "strategy": "freshness",
        "timeout": "3s"
      }
    }
  ]
}
```

- **`freshness` strategy:** Network first; falls back to cached API response if network is offline or times out after 3 seconds.
- **`performance` strategy:** Cache first; returns instant response and refreshes cache in background.
- Combine with **IndexedDB** for local storage of draft user transactions created while offline, synchronizing via Background Sync when connection is restored.
