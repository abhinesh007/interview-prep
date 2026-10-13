# 07 — Angular Runtime Gotchas, Zoneless Architecture & Hierarchical DI

> Zone.js Multi-Zone Collision Traps, Zoneless Angular MFEs (Signals), Hierarchical Dependency Injection Across Federation Boundaries, The `providedIn: 'root'` Singleton Trap, and Angular SSR Hydration Traps.

---

## 📑 Table of Contents
1. [Zone.js Collision Traps & Multi-Zone Pollution](#1-zonejs-collision-traps--multi-zone-pollution)
2. [Zoneless Angular (Signals) — The MFE Holy Grail](#2-zoneless-angular-signals--the-mfe-holy-grail)
3. [Hierarchical Dependency Injection Across Federation Boundaries](#3-hierarchical-dependency-injection-across-federation-boundaries)
4. [The `providedIn: 'root'` Duplicate Singleton Trap](#4-the-providedin-root-duplicate-singleton-trap)
5. [Angular SSR & Hydration Mismatches in MFEs](#5-angular-ssr--hydration-mismatches-in-mfes)
6. [🧩 Output Prediction & 🐛 Debug Scenarios](#6--output-prediction---debug-scenarios)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. Zone.js Collision Traps & Multi-Zone Pollution

### Q1: What happens under the hood when multiple federated Angular applications load `zone.js`, and why does it cause runtime chaos?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Zone.js]` `[Runtime]` `[Change-Detection]`

**Answer:**
`zone.js` works by monkey-patching all asynchronous browser APIs (`setTimeout`, `setInterval`, `Promise`, `addEventListener`, `XMLHttpRequest`) at the global `window` level.

When a Host and a Remote **both bundle and load their own instance of `zone.js`**, catastrophic runtime failures occur:

```text
Host loads zone.js (Instance A):
  window.setTimeout = patched_by_Zone_A
  window.addEventListener = patched_by_Zone_A

Remote loads zone.js (Instance B):
  window.setTimeout = patched_by_Zone_B (Overwrites Zone A!)
  window.addEventListener = patched_by_Zone_B (Overwrites Zone A!)

COLLISION RESULTS:
1. "Zone already loaded" Warning / Fatal Exception.
2. Microtask Queue Corruption: Zone A fails to receive notifications when
   async operations complete in Zone B.
3. Change Detection Paralysis: The Host Shell stops updating its views because
   events resolve inside Remote's isolated Zone instance!
```

### The Mitigation in Module Federation 1.0:
1. **Host-Only Loading:** Load `zone.js` **exclusively in the Host Shell's polyfills**.
2. **Remove Polyfill in Remotes:** Remove `zone.js` from the `polyfills` array in every Remote's `project.json`.
3. **Strict Singleton Configuration:** In `module-federation.config.ts`, ensure `zone.js` is shared as a strict singleton:
   ```typescript
   shared: {
     'zone.js': { singleton: true, strictVersion: true, requiredVersion: 'auto' }
   }
   ```

---

## 2. Zoneless Angular (Signals) — The MFE Holy Grail

### Q2: Why is Zoneless Angular (`provideExperimentalZonelessChangeDetection()`) the definitive solution for Micro-Frontends?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Zoneless]` `[Signals]` `[Angular-18+]`

**Answer:**
In modern Angular (18–20+), the framework can run completely **Zoneless** by relying on fine-grained reactivity powered by **Angular Signals** (`signal()`, `computed()`, `effect()`):

```typescript
// apps/shell/src/app/app.config.ts
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
  ],
};
```

### Why Zoneless is Revolutionary for Micro-Frontends:
1. **Eliminates `zone.js` Completely:** Zero global monkey-patching of browser APIs. Zero risk of multi-zone pollution.
2. **Framework Interoperability:** An Angular Zoneless Remote can be embedded inside a React Shell, Vue Shell, or Angular Zone-based Shell with zero conflicts!
3. **Slashed Bundle Size:** Eliminates ~40KB of `zone.js` polyfills from the initial network load.
4. **Targeted DOM Updates:** Instead of traversing the entire component tree from the root down during every mouse click, Angular updates only the specific DOM nodes bound to the mutated Signal.

```text
ZONE-BASED CHANGE DETECTION:
Async Event occurs in Remote ──► Zone.js intercepts
                             ──► Triggers Tick at HOST ROOT
                             ──► Re-evaluates entire App Component Tree!

ZONELESS CHANGE DETECTION:
Signal mutated in Remote ─────► Marks specific Component dirty
                             ──► Scheduler updates ONLY that Component's DOM!
```

---

## 3. Hierarchical Dependency Injection Across Federation Boundaries

### Q3: How do Hierarchical Dependency Injectors behave across a Module Federation boundary?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[DI]` `[Hierarchical-Injectors]` `[Internals]`

**Answer:**
Angular's Dependency Injection system has two parallel trees:
1. **Environment Injector Hierarchy:** Root Injector $\rightarrow$ Route Environment Injectors.
2. **Element Injector Hierarchy:** Component $\rightarrow$ Child Component $\rightarrow$ Directive.

```text
┌────────────────────────────────────────────────────────┐
│               Host Root Environment Injector          │
│               - AuthService (Host singleton)           │
│               - Router, TitleService                   │
└───────────────────────────┬────────────────────────────┘
                            │
               loadChildren (Module Federation)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Remote Route Environment Injector         │
│              - OrdersService                           │
│              - providers: [PaymentGateway]             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Remote Element Injector                   │
│              - OrdersListComponent                     │
│              - Child Components                        │
└────────────────────────────────────────────────────────┘
```

When a remote component requests a dependency via `inject(AuthService)`:
1. Angular checks the component's own **Element Injector**.
2. Traverses up to the **Remote Route Environment Injector**.
3. If not found, traverses up to the **Host Root Environment Injector**!
4. The remote component successfully receives the Host's `AuthService` instance.

---

## 4. The `providedIn: 'root'` Duplicate Singleton Trap

### Q4: Why can a service decorated with `@Injectable({ providedIn: 'root' })` instantiate twice in a federated architecture?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[DI]` `[providedIn-root]` `[Singleton-Trap]`

**Answer:**
In a standard Angular application, `providedIn: 'root'` guarantees a single memory instance across the entire application.

In Module Federation, this guarantee **shatters** if the library defining the service is not shared as a singleton!

```text
THE DUPLICATE INJECTOR DISASTER:
1. libs/shared/auth defines AuthService with @Injectable({ providedIn: 'root' }).
2. Host imports AuthService. Webpack compiles AuthService into host bundle.
   - Host Root Injector registers: Instance A (Token: Symbol(AuthService_Host)).
3. Remote imports AuthService. Because shared/auth was NOT configured in
   Module Federation's `shared` block, Webpack compiles a DUPLICATE copy
   of AuthService into remote bundle!
   - Remote Route Injector registers: Instance B (Token: Symbol(AuthService_Remote)).

RESULT:
- Host logs user in: updates Instance A.
- Remote checks auth state: reads Instance B (Shows "Not Logged In"!).
```

### The Architectural Fix:
1. **Share the Library in Federation Config:** Mark the shared library as a singleton in `module-federation.config.ts`:
   ```typescript
   shared: (pkg, config) => {
     if (pkg === '@myorg/shared-auth') {
       return { ...config, singleton: true, strictVersion: true };
     }
     return config;
   }
   ```
2. **Explicit Injection Tokens:** Use a shared `InjectionToken<AuthContract>('AUTH_SERVICE')` declared in a pure leaf contracts library.

---

## 5. Angular SSR & Hydration Mismatches in MFEs

### Q5: How do Non-Destructive Hydration errors occur when Server-Side Rendering federated Angular remotes?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[SSR]` `[Hydration]` `[Node.js]`

**Answer:**
Modern Angular (17–20+) uses **Non-Destructive Hydration**: the Node.js server generates the HTML, and the client browser matches existing DOM nodes against component templates instead of destroying and re-rendering them.

### Hydration Trap in MFEs:
When the Host SSR server renders a page containing a federated remote:
1. The Node.js server fetches the remote via `@module-federation/node` and renders `<div class="order-price">$100.00</div>`.
2. In the client browser, `remoteEntry.js` is fetched over a slow connection.
3. If the client evaluates the remote before or during hydration with mismatched state (e.g. currency formatted with the browser's local timezone/currency instead of the server's UTC):
   ```text
   Server HTML: <div class="order-price">$100.00</div>
   Client DOM:   <div class="order-price">€92.00</div>
   ```
4. Angular halts hydration with an error:
   ```text
   NG0500: During hydration, Angular expected DOM node to match, but found mismatch.
   ```
5. Angular falls back to destroying the server-rendered DOM and recreating it, causing layout shift and poor Core Web Vitals (INP/CLS).

### Mitigations:
- Ensure all environment configurations and locale providers are serialized into the server transfer cache (`TransferState` / `withHttpTransferCache()`).
- Wrap client-only or dynamic widgets in `@defer (on immediate)` blocks so hydration skips them during initial server compilation.

---

## 6. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🐛 Debug Scenario: Multi-Zone Change Detection Paralysis
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Zone.js]` `[Deadlock]`

**Scenario:**
An Angular Host loads an Angular Remote. Inside the Remote, a button click triggers an HTTP call:
```typescript
onCheckout() {
  this.http.post('/api/checkout', {}).subscribe((res) => {
    this.status = 'COMPLETED'; // Template does NOT update in UI!
  });
}
```
The HTTP response returns successfully with 200 OK, and `console.log(this.status)` prints `'COMPLETED'`. However, the screen still displays `'PENDING'`. Only when the user clicks anywhere else in the Host shell does the text update.
What caused this de-synchronization?

**Answer:**
**Root Cause:** The HTTP subscription callback resolved **outside the Host's active NgZone**!
1. The Remote was bundled with its own internal copy of `zone.js` or instantiated without inheriting the Host's `NgZone`.
2. When the HTTP request finished, the event loop callback executed in a foreign zone context.
3. The Host's Angular change detection scheduler received no notification that microtasks completed.
4. When the user clicked on the Host shell, the Host's native click listener ran, triggering a global Zone tick that finally flushed the dirty state.

**Fix:** Wrap the callback in `NgZone.run()` or migrate the remote to Zoneless Angular Signals:
```typescript
// Immediate Fix:
this.ngZone.run(() => {
  this.status = 'COMPLETED';
});

// Modern Architectural Fix:
// Use Signals (Zoneless):
status = signal('PENDING');
// Mutating status.set('COMPLETED') schedules dirty component rendering directly!
```

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q7: Can an Angular Zoneless Remote run inside an Angular Host that still uses `Zone.js`?
**Answer:** **Yes!** Because Zoneless remotes notify Angular's scheduler directly via Signals and internal change detection flags, they operate seamlessly even when the outer Host application is wrapped by `Zone.js`.

### Q8: What is the risk of calling `inject()` inside an asynchronous callback in a federated remote?
**Answer:** `inject()` requires an active **Injection Context**. Calling `inject()` inside an asynchronous `setTimeout` or Promise callback after component construction has finished throws `NG0203: inject() must be called from an injection context`.

### Q9: How can you inspect the active injector hierarchy of a federated remote component in Chrome DevTools?
**Answer:** Select the DOM element in the Elements panel and execute `ng.getInjector($0)` or `ng.getComponent($0)` in the DevTools console.

### Q10: Why does `provideZoneChangeDetection({ eventCoalescing: true })` improve performance in federated Angular applications?
**Answer:** It batches multiple rapid microtasks and events into a single change detection tick rather than triggering separate change detection cycles for each event, dramatically reducing CPU overhead when multiple remotes emit events simultaneously.
