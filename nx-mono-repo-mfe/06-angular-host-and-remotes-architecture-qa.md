# 06 — Angular Host & Remotes Architecture (Standalone & Dynamic Federation)

> Angular Shell Host Setup (`@nx/angular:host`), Dynamic Remotes via `loadRemoteModule`, Angular Router Integration, Standalone Components in MFEs, and Manifest-Driven Discovery (`module-federation.manifest.json`).

---

## 📑 Table of Contents
1. [Angular Host & Remotes Setup with Nx](#1-angular-host--remotes-setup-with-nx)
2. [Dynamic Federation & Manifest-Driven Routing](#2-dynamic-federation--manifest-driven-routing)
3. [Standalone Components Revolution in Angular MFEs](#3-standalone-components-revolution-in-angular-mfes)
4. [Routing Integration & Lazy Loading Strategies](#4-routing-integration--lazy-loading-strategies)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Angular Host & Remotes Setup with Nx

### Q1: How do you scaffold a production-grade Angular Host Shell and Remote micro-frontends using modern Nx generators?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Nx]` `[Angular]` `[CLI]`

**Answer:**
Nx provides first-class generators via `@nx/angular` to scaffold federated architecture with zero manual Webpack configuration:

### 1. Generating the Host Shell:
```bash
npx nx g @nx/angular:host shell \
  --standalone \
  --routing \
  --style=scss \
  --prefix=mfe-shell
```
This generates:
- An Angular application pre-configured with `withModuleFederation()` in `webpack.config.ts`.
- An asynchronous bootstrap split (`main.ts` $\rightarrow$ `bootstrap.ts`).
- A `module-federation.config.ts` defining shared packages.

### 2. Generating Remote Applications:
```bash
npx nx g @nx/angular:remote orders \
  --host=shell \
  --standalone \
  --routing \
  --port=4201 \
  --prefix=mfe-orders
```
This automatically:
- Configures `orders` with its own `webpack.config.ts` exposing `./Routes`.
- Adds `orders` to the Host's `module-federation.config.ts` remotes mapping.
- Generates an entry route file (`entry.routes.ts`) designed for lazy consumption.

---

### Q2: What is the purpose of `module-federation.config.ts` in an Nx Angular project?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Configuration]` `[Module-Federation]`

**Answer:**
`module-federation.config.ts` is the declarative interface consumed by Nx's `withModuleFederation()` helper to build the underlying Webpack or Rspack `ModuleFederationPlugin`:

```typescript
// apps/orders/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'orders',
  exposes: {
    // Defines public contract exposed to Host
    './Routes': 'apps/orders/src/app/remote-entry/entry.routes.ts',
  },
  // Automatically shares core framework dependencies
  // (Angular core, common, router, rxjs) as singletons
  shared: (libraryName, defaultConfig) => {
    if (libraryName === '@angular/core') {
      return { ...defaultConfig, singleton: true, strictVersion: true };
    }
    return defaultConfig;
  },
};

export default config;
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why should remotes expose an `entry.routes.ts` file rather than exporting the root `AppComponent`?"  
*Senior Answer:* If a remote exposes `AppComponent`, it exposes its entire standalone page layout (including its own local headers, footers, and navigation bars). Exposing a **routed sub-tree (`entry.routes.ts`)** allows the Host Shell to seamlessly embed the remote's views directly inside the Host's `<router-outlet>` beneath the shared global header and navigation layout.

---

## 2. Dynamic Federation & Manifest-Driven Routing

### Q3: Why does Static Federation fail in multi-environment enterprise deployments, and how does Manifest-Driven Dynamic Federation solve this?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Dynamic-Federation]` `[Manifest]` `[DevOps]`

**Answer:**
### The Static Federation Failure Mode:
In static federation, remote URLs are baked directly into the Host bundle at build time:
```typescript
// Hardcoded build-time config (FAILS IN ENTERPRISE CI/CD)
remotes: {
  orders: 'http://localhost:4201/remoteEntry.js',
}
```
When promoting this bundle from Development $\rightarrow$ Staging $\rightarrow$ Production, the Host application must be **re-compiled three separate times** to bake in environment-specific URLs (`staging-orders.corp.com`, `prod-orders.corp.com`). This violates the 12-Factor App methodology (Build once, deploy anywhere).

### The Manifest-Driven Solution:
The Host shell downloads a lightweight JSON manifest at runtime before bootstrapping:

```text
┌────────────────────────────────────────────────────────┐
│                      Host Shell                        │
│                                                        │
│  1. main.ts fetches /assets/module-federation.manifest.json
│  2. Initializes federation with environment URLs       │
│  3. Router dynamically fetches remoteEntry on demand   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
/assets/module-federation.manifest.json (Loaded at Runtime):
{
  "orders": "https://orders-cdn.production.corp.com/remoteEntry.js",
  "billing": "https://billing-cdn.production.corp.com/remoteEntry.js",
  "catalog": "https://catalog-cdn.production.corp.com/remoteEntry.js"
}
```

Promoting between environments requires only swapping the static `module-federation.manifest.json` file or pointing to a runtime Configuration API endpoint—**zero rebuilding of the Host application!**

---

### Q4: Implement dynamic manifest initialization and route loading in modern Angular using `loadRemoteModule`.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Angular-Router]` `[loadRemoteModule]` `[Code]`

**Answer:**

### Step 1: Initialize Manifest in `main.ts`
```typescript
// apps/shell/src/main.ts
import { initFederation } from '@nx/angular/dynamic-module-federation';

// Fetch environment-specific manifest before bootstrapping application
fetch('/assets/module-federation.manifest.json')
  .then((res) => res.json())
  .then((definitions) => initFederation(definitions))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error('Failed to initialize dynamic federation:', err));
```

### Step 2: Route Definition in `app.routes.ts`
```typescript
// apps/shell/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { loadRemoteModule } from '@nx/angular/dynamic-module-federation';

export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'orders',
    loadChildren: () =>
      loadRemoteModule({
        type: 'manifest',
        remoteName: 'orders',
        exposedModule: './Routes',
      }).then((m) => m.ORDERS_ROUTES),
  },
];
```

```typescript
// apps/orders/src/app/remote-entry/entry.routes.ts
import { Routes } from '@angular/router';
import { OrdersListComponent } from '../orders-list/orders-list.component';
import { OrderDetailComponent } from '../order-detail/order-detail.component';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    component: OrdersListComponent,
  },
  {
    path: ':id',
    component: OrderDetailComponent,
  },
];
```

---

## 3. Standalone Components Revolution in Angular MFEs

### Q5: How did Angular Standalone Components revolutionize Micro-Frontend architecture compared to legacy `NgModule` remotes?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Standalone]` `[NgModule]` `[Modern-Angular]`

**Answer:**
Prior to Angular 14+, Angular required every component to be declared inside an `NgModule`. This created extreme friction in federated architectures:

```text
LEGACY NGMODULE FEDERATION (Heavy & Leaky):
Remote: Exposes RemoteEntryModule
Host:   Imports RemoteEntryModule via loadChildren
[Drawbacks:
 - NgModule injector context leaks into host
 - Heavy boilerplate: RemoteEntryModule, RoutingModule, declarations arrays
 - Complex provider resolution tree]

MODERN STANDALONE FEDERATION (Lean & Tree-Shakable):
Remote: Exposes raw Routes array (or single Standalone Component)
Host:   loadChildren: () => loadRemoteModule(...).then(m => m.ROUTES)
[Benefits:
 - Zero NgModule boilerplate
 - Direct tree-shaking of unused child components
 - Direct dependency injection context scoping via Environment Injectors]
```

### Key Architectural Advantages:
1. **Isolated Environment Injectors:** Standalone routes create an **Environment Injector** scoped specifically to that route branch. Services declared in `providers: [OrderService]` are scoped to the remote and destroyed when the user navigates away.
2. **Dual-Boot Capability:** A Standalone Remote can bootstrap itself locally using `bootstrapApplication(OrdersRootComponent)` for isolated feature development, while exposing a clean `ORDERS_ROUTES` array for consumption inside the Host Shell.

---

## 4. Routing Integration & Lazy Loading Strategies

### Q6: How do Route Guards, Resolvers, and Route Input Binding behave across an Angular federated route boundary?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Routing]` `[Guards]` `[Input-Binding]`

**Answer:**
When navigating to a federated route (`/orders/123`):

1. **Route Guards (`canActivate`, `canDeactivate`):**
   - Can be placed on the **Host** (`canActivate: [AuthGuard]`) to prevent unauthorized users from even *downloading* the remote's `remoteEntry.js` script!
   - Can also be placed inside the **Remote's internal routes** (`canActivate: [OrdersPermissionGuard]`) for granular internal access control.
2. **Component Input Binding (`withComponentInputBinding()`):**
   - In modern Angular, route path parameters and query parameters bind directly to component inputs:
     ```typescript
     @Component({ ... })
     export class OrderDetailComponent {
       // Automatically receives '123' from route path '/orders/:id'
       id = input.required<string>();
     }
     ```
   - This works seamlessly across Module Federation boundaries because the Host Router manages the active `ActivatedRouteSnapshot` and injects parameter values directly into the federated component instance.

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q7: 🐛 Debug Scenario: Missing Router Provider in Standalone Host Scope
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Router]` `[DI]`

**Scenario:**
A developer scaffolds a new minimal Angular Host application without routing using standalone components. Later, they add a federated remote route:
```typescript
const routes: Routes = [
  {
    path: 'catalog',
    loadChildren: () => loadRemoteModule('catalog', './Routes').then((m) => m.CATALOG_ROUTES),
  },
];
```
When they run the application and click navigate, the console throws:
```text
NullInjectorError: R3InjectorError(Standalone[_AppComponent])[_Router -> _Router]:
  NullInjectorError: No provider for _Router!
```
Why does this happen, and how is it resolved?

**Answer:**
**Root Cause:** In standalone Angular applications, the Router service and its navigation listeners are not provided automatically. They must be registered explicitly at bootstrap in `app.config.ts`.

**Fix:** Add `provideRouter()` in the Host application configuration:
```typescript
// apps/shell/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(APP_ROUTES, withComponentInputBinding()),
  ],
};
```

---

### Q8: 🧩 Output Prediction: Router Guard Evaluation Sequence
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Guards]` `[Output-Prediction]`

**Scenario:**
- Host defines Route:
  ```typescript
  { path: 'billing', canActivate: [HostAuthGuard], loadChildren: () => loadRemoteModule(...) }
  ```
- Remote defines Route:
  ```typescript
  { path: '', canActivate: [RemotePlanGuard], component: BillingComponent }
  ```
- User logs in, but does not have the billing plan subscription (`RemotePlanGuard` returns `false`).
- User navigates to `/billing`.

**Predict the execution ordering of guards and network downloads:**

**Answer:**
1. **`HostAuthGuard.canActivate()` executes first.**
   - Verified: User is logged in $\rightarrow$ returns `true`.
2. **Network Fetch:** Because the Host guard passed, the browser initiates the HTTP request for `billing/remoteEntry.js` and its chunk.
3. **Remote Module Evaluated:** `BILLING_ROUTES` are loaded into memory.
4. **`RemotePlanGuard.canActivate()` executes second.**
   - Evaluated: User lacks plan $\rightarrow$ returns `false`.
5. **Navigation Canceled:** `BillingComponent` is **never instantiated**; the router stays on the previous page or redirects according to the guard's `UrlTree`.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: Can an Angular Remote use a different version of Angular than the Host?
**Answer:** In theory, only if `@angular/core` is marked `singleton: false` or isolated inside Web Components / iframes. In native Module Federation with Angular Router integration, **no**: sharing the Router and Zone.js requires strict singleton alignment across Angular versions.

### Q10: What does `withComponentInputBinding()` solve in federated routing?
**Answer:** It eliminates the need for federated components to manually inject `ActivatedRoute` and subscribe to `route.params`. Route parameters flow naturally as `@Input()` or `input()` signal properties.

### Q11: How do you handle 404s for unregistered routes in a federated host?
**Answer:** Define a catch-all wildcard route (`{ path: '**', component: NotFoundComponent }`) as the **very last entry** in the Host's `app.routes.ts`.

### Q12: Why should `initFederation()` be called before `import('./bootstrap')`?
**Answer:** It guarantees that all remote URLs, manifests, and shared scope negotiation bindings are registered in memory before Angular's runtime framework attempts to resolve lazy federated routes.
