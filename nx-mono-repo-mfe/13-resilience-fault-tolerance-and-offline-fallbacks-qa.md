# 13 — Resilience, Fault Tolerance & Offline Fallbacks

> Distributed MFE Failure Modes, React Error Boundaries, Angular Fallback Components, Circuit Breaker & Exponential Backoff Retries, and Service Worker Offline Caching.

---

## 📑 Table of Contents
1. [Distributed Failure Modes in Micro-Frontends](#1-distributed-failure-modes-in-micro-frontends)
2. [Error Boundaries & Localized Fallback UI](#2-error-boundaries--localized-fallback-ui)
3. [Circuit Breakers & Exponential Backoff Retries](#3-circuit-breakers--exponential-backoff-retries)
4. [Offline Caching & Service Worker Stale-While-Revalidate](#4-offline-caching--service-worker-stale-while-revalidate)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Distributed Failure Modes in Micro-Frontends

### Q1: What makes Micro-Frontends susceptible to distributed runtime failures, and what is the principle of "The Blameless Host"?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Resilience]` `[Distributed-Systems]` `[UX]`

**Answer:**
In a traditional monolithic SPA, all JavaScript chunks reside on the same server/CDN and are deployed atomically. In a Micro-Frontend architecture, the Host shell dynamically downloads JavaScript chunks from **multiple independent CDN endpoints owned by different teams**.

```text
THE CATASTROPHIC WHITE SCREEN (No Resilience):
Host loads:
├── Shell Nav (OK)
├── User Profile (OK)
└── Recommendations Remote ──► CDN Returns 404 / 500 / Network Timeout!
    └── Unhandled Promise Rejection bubbles up to window.onerror
        └── CRASHES THE ENTIRE APPLICATION! White screen of death for user!

THE BLAMELESS HOST PATTERN (Resilient Degradation):
Host loads:
├── Shell Nav (OK)
├── User Profile (OK)
└── Recommendations Remote ──► CDN Returns 404
    └── Error Boundary Catches Error
        └── Renders Localized Fallback: "Recommendations temporarily offline"
            └── Core features (Cart, Checkout) remain 100% operational!
```

### The Principle of "The Blameless Host":
A failure in a non-critical, secondary micro-frontend (such as Product Reviews, Recommendations, or Customer Chat) **must never take down the critical business transaction path** (Product Catalog, Cart, Payment Checkout). The Host must isolate failures to the specific component mount slot.

---

## 2. Error Boundaries & Localized Fallback UI

### Q2: How do you implement resilient remote error boundaries in both React and Angular?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Error-Boundary]` `[React]` `[Angular]`

**Answer:**

### 1. In React: Functional Remote Wrapper with Error Boundary
```tsx
import React, { Component, ReactNode, Suspense } from 'react';

interface ErrorBoundaryProps {
  remoteName: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class MfeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[MFE Panic] Remote ${this.props.remoteName} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-800">
            <p className="font-semibold">{this.props.remoteName} Unavailable</p>
            <p className="text-sm">We are experiencing technical issues loading this section.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

### 2. In Angular: Catching Route Loader Failures
In Angular Router, catch errors inside `loadChildren` and dynamically redirect to a Fallback Component:

```typescript
// apps/shell/src/app/app.routes.ts
export const APP_ROUTES: Routes = [
  {
    path: 'reviews',
    loadChildren: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'reviews',
        exposedModule: './Routes',
      })
        .then((m) => m.REVIEWS_ROUTES)
        .catch((err) => {
          console.error('[MFE Failure] Reviews Remote unreachable:', err);
          // Return an inline fallback component instead of crashing navigation!
          return [
            {
              path: '',
              loadComponent: () =>
                import('./fallbacks/reviews-fallback.component').then(
                  (m) => m.ReviewsFallbackComponent
                ),
            },
          ];
        }),
  },
];
```

---

## 3. Circuit Breakers & Exponential Backoff Retries

### Q3: Implement a Circuit Breaker with Exponential Backoff and Jitter for fetching federated remotes over unstable mobile networks.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Circuit-Breaker]` `[Retry]` `[Exponential-Backoff]`

**Answer:**

```typescript
// libs/shared/resilience/src/lib/circuit-breaker.ts

interface CircuitBreakerOptions {
  failureThreshold: number; // e.g. 3 consecutive failures
  cooldownPeriodMs: number; // e.g. 30,000ms before retrying
  maxRetries: number;       // e.g. 3 attempts per load
}

export class MfeCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private remoteName: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 3,
      cooldownPeriodMs: 30000,
      maxRetries: 3,
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Check if cooldown has elapsed to test recovery (HALF_OPEN)
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.options.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`[Circuit Breaker] ${this.remoteName} is OPEN. Fast-failing.`);
      }
    }

    // Attempt execution with retries and exponential backoff
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await fn();
        this.onSuccess();
        return result;
      } catch (err) {
        if (attempt === this.options.maxRetries) {
          this.onFailure();
          throw err;
        }
        // Exponential backoff + full jitter: delay = 2^attempt * 100ms + random(0, 100)
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((res) => setTimeout(res, delay));
      }
    }
    throw new Error('Unreachable');
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[Circuit Breaker] Tripped OPEN for ${this.remoteName}`);
    }
  }
}
```

---

## 4. Offline Caching & Service Worker Stale-While-Revalidate

### Q4: How do you configure a Service Worker to cache federated chunks for offline use without serving stale code permanently?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Service-Worker]` `[PWA]` `[Offline]` `[Caching]`

**Answer:**
Federated remotes present a unique caching challenge: `remoteEntry.js` is un-hashed (fixed filename), while internal chunks have content hashes (`src_app_summary_ts_8f3a9b.js`).

### The Strategy: Stale-While-Revalidate with Short Cache TTL:
1. **`remoteEntry.js` & `mf-manifest.json`:**
   - Must **NEVER be cached permanently**.
   - Use a **Network-First** strategy with a short fallback cache, or `stale-while-revalidate` with a 60-second revalidation TTL.
2. **Hashed Chunks (`*.[hash].js`):**
   - Content is immutable. Use **Cache-First** strategy with a long expiration (30 days).

```javascript
// service-worker.js (Workbox strategy example)
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// 1. remoteEntry.js - Stale-While-Revalidate
registerRoute(
  ({ url }) => url.pathname.endsWith('remoteEntry.js') || url.pathname.endsWith('mf-manifest.json'),
  new StaleWhileRevalidate({
    cacheName: 'mfe-manifests-cache',
  })
);

// 2. Hashed asynchronous chunks - Cache-First
registerRoute(
  ({ url }) => url.pathname.match(/\.[a-f0-9]{8,16}\.js$/),
  new CacheFirst({
    cacheName: 'mfe-immutable-chunks',
  })
);
```

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug Scenario: Unhandled Promise Rejection Halts Router Navigation
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Router]` `[Promise-Rejection]`

**Scenario:**
An Angular Host loads a remote route using `loadRemoteModule`:
```typescript
{
  path: 'analytics',
  loadChildren: () => loadRemoteModule('analytics', './Routes').then(m => m.ANALYTICS_ROUTES),
}
```
The analytics remote CDN experiences a temporary 504 Gateway Timeout.
When the user clicks the Analytics tab:
1. The URL bar changes to `/analytics`.
2. The browser console logs: `GET https://cdn.corp.com/analytics/remoteEntry.js 504`.
3. The page freezes on the previous screen with the progress bar stuck, and all future clicks on navigation links stop responding!
Why did the navigation freeze, and how do you resolve it?

**Answer:**
**Root Cause:** An unhandled promise rejection in `loadChildren` **halts the Angular Router state transition pipeline**!
1. When `loadRemoteModule` rejects, Angular Router cancels navigation and enters an error state.
2. Because no `.catch()` was attached and no global `NavigationError` handler redirected the user, the router remains locked in transition state.

**Fix:** Catch the error and either provide a fallback route or navigate to an error page:
```typescript
loadChildren: () =>
  loadRemoteModule('analytics', './Routes')
    .then((m) => m.ANALYTICS_ROUTES)
    .catch((err) => {
      inject(NotificationService).showError('Analytics service is temporarily unavailable');
      return inject(Router).createUrlTree(['/home']);
    })
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What is the "Overnight Tab Stale Chunk" bug in Module Federation?
**Answer:** A user leaves an application tab open overnight. In the morning, the remote team deploys a new version that purges old hashed chunks from the CDN. When the user clicks a tab, the Host attempts to fetch a chunk hash that no longer exists on the CDN (HTTP 404).

### Q7: How do you fix the "Overnight Tab Stale Chunk" bug?
**Answer:** Implement a global chunk loading error listener (`window.addEventListener('error')`). When a `ChunkLoadError` or `Loading chunk failed` occurs, prompt the user or execute a clean `window.location.reload(true)` to download fresh manifests.

### Q8: What is the difference between graceful degradation and failing fast?
**Answer:** Graceful degradation preserves core application availability by substituting failed widgets with fallback stubs. Failing fast halts execution immediately with an error (appropriate for banking transactions or security validations where partial execution is dangerous).
