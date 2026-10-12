# 06 — Angular Modern Routing, Guards & Resolvers

> `provideRouter()` Architecture, Functional Guards (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`), `withComponentInputBinding()`, Standalone Lazy Loading, Resolvers, Preloading Strategies, and Route Reuse.

---

## 📑 Table of Contents
1. [Modern Router Configuration](#1-modern-router-configuration)
2. [Functional Route Guards](#2-functional-route-guards)
3. [Component Input Binding (`withComponentInputBinding`)](#3-component-input-binding-withcomponentinputbinding)
4. [Lazy Loading & Resolvers](#4-lazy-loading--resolvers)
5. [Preloading Strategies & Performance](#5-preloading-strategies--performance)
6. [🎯 Gotchas & Senior Scenarios](#6--gotchas--senior-scenarios)

---

## 1. Modern Router Configuration

### Q1: How do you configure modern routing using `provideRouter()` vs legacy `RouterModule.forRoot()`?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[Routing]` `[Standalone]`

**Answer:**
Modern Angular eliminates `RouterModule.forRoot()` in favor of the functional `provideRouter()` API configured in `app.config.ts`:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
  withInMemoryScrolling
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),                         // Map params to inputs
      withViewTransitions(),                               // Native CSS View Transitions API
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }) // Scroll back to top
    )
  ]
};
```

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  }
];
```

---

## 2. Functional Route Guards

### Q2: Compare modern functional guards (`CanActivateFn`, `CanMatchFn`) with legacy class-based guards implementing `CanActivate`.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Guards]` `[Modern]`

**Answer:**
In Angular 15+, class-based guards (`@Injectable() class AuthGuard implements CanActivate`) were deprecated in favor of **Functional Guards** that leverage `inject()`.

```typescript
// auth.guard.ts (Modern Functional Guard)
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login with return URL
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

### Why Functional Guards are superior:
1. **Zero Class Boilerplate:** No classes, decorators, or module registrations.
2. **First-Class Composition:** Multiple guards can be chained or combined using higher-order functions.
3. **Returns `UrlTree` directly:** Clean, race-condition-free redirects.

---

### Q3: Why is `CanMatchFn` preferred over `CanActivateFn` and `CanLoad`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[CanMatch]` `[Guards]`

**Answer:**
- **`CanActivate`:** Evaluates *after* route matching succeeds and after lazy bundles begin loading. If it returns `false`, navigation stops with an empty screen (or redirect), but the bundle was already fetched.
- **`CanLoad` (Deprecated):** Prevented bundle downloading, but could not check routes sharing the same path.
- **`CanMatch` (Recommended):** Evaluates *during* the route matching phase. If `CanMatch` returns `false`, Angular **skips that route configuration entirely and continues searching for another matching route** in the routes array!

#### Real-World Power Pattern: Feature Flag / Role-Based Route Splitting:
```typescript
export const routes: Routes = [
  // Version for Admins:
  {
    path: 'dashboard',
    canMatch: [() => inject(AuthService).isAdmin()],
    loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent)
  },
  // Version for Standard Users (Same URL path!):
  {
    path: 'dashboard',
    loadComponent: () => import('./user-dashboard.component').then(m => m.UserDashboardComponent)
  }
];
```
If the user is not an admin, Angular silently skips the first route and matches the second.

---

### Q4: How does `CanDeactivateFn` prevent dirty form data loss when navigating away?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[CanDeactivate]` `[Forms]`

**Answer:**

```typescript
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  }
  return true;
};
```
Applied to the route:
```typescript
{
  path: 'editor',
  component: PostEditorComponent,
  canDeactivate: [unsavedChangesGuard]
}
```

---

## 3. Component Input Binding (`withComponentInputBinding`)

### Q5: How does `withComponentInputBinding()` eliminate `ActivatedRoute` subscriptions in components?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[withComponentInputBinding]` `[Signals]`

**Answer:**
Prior to Angular 16, reading route params required injecting `ActivatedRoute` and subscribing to `paramMap` or `queryParams`.

With `withComponentInputBinding()`, Angular automatically passes:
- **Route path parameters** (`:id`)
- **Query parameters** (`?sort=asc`)
- **Static route data** (`data: { title: 'Home' }`)
- **Resolved data from Resolvers**

Directly into the component's **`@Input()` or `input()`** signals matching the parameter name!

```typescript
// app.routes.ts
{
  path: 'product/:id',
  loadComponent: () => import('./product-detail.component').then(m => m.ProductDetailComponent)
}
```

```typescript
// product-detail.component.ts
@Component({
  selector: 'app-product-detail',
  standalone: true,
  template: `<h1>Product: {{ id() }}</h1>`
})
export class ProductDetailComponent {
  // Automatically bound from route path `:id`!
  id = input.required<string>();

  // Automatically bound if URL is `?filter=active`
  filter = input<string>('all');
}
```

---

## 4. Lazy Loading & Resolvers

### Q6: Contrast lazy loading a single Standalone Component (`loadComponent`) vs a Child Routes group (`loadChildren`).
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[LazyLoading]` `[Core]`

**Answer:**

```typescript
export const routes: Routes = [
  // 1. loadComponent — Lazy loads an individual standalone component file
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component')
      .then(m => m.SettingsComponent)
  },

  // 2. loadChildren — Lazy loads an entire sub-tree of routes (feature slice)
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.routes')
      .then(m => m.ORDER_ROUTES)
  }
];
```

**Rule of Thumb:**
- Use `loadComponent` for flat, isolated views.
- Use `loadChildren` for self-contained business modules that contain nested child routes, guards, and route-scoped services.

---

### Q7: What are modern Functional Resolvers (`ResolveFn`), and when should you use them vs fetching in component lifecycle?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Resolvers]` `[Modern]`

**Answer:**
A Resolver prefetches data **before** the router activates the component view.

```typescript
// product.resolver.ts
export const productResolver: ResolveFn<Product> = (route) => {
  const productService = inject(ProductService);
  const id = route.paramMap.get('id')!;
  return productService.getProduct(id);
};

// In routes:
{
  path: 'products/:id',
  resolve: { product: productResolver },
  loadComponent: () => import('./product.component').then(m => m.ProductComponent)
}
```

#### Pros and Cons (The Senior Dilemma):
- **Pro:** When the view renders, the data is already available; no layout flashes or empty states.
- **Con:** **Delays navigation!** If the API takes 3 seconds to respond, the router pauses navigation, leaving the user feeling like the app is unresponsive unless a global navigation progress bar is displayed.
- **Modern Recommendation:** For fast transitions, prefer eager navigation with skeleton loading screens inside the component (using `@defer` or `resource()`), and reserve Resolvers for critical security tokens or configuration handshakes.

---

## 5. Preloading Strategies & Performance

### Q8: How do Preloading Strategies work, and how do you write a Custom Preloader?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Preloading]` `[Performance]`

**Answer:**
Lazy loading saves initial bandwidth, but the user experiences a delay when clicking lazy routes. Preloading downloads lazy bundles in the background **after** the initial app has bootstrapped and painted.

Built-in strategies:
- `NoPreloading` (Default): Never preloads.
- `PreloadAllModules`: Preloads all lazy routes immediately after app launch.

#### Custom Strategy: Opt-in route preloading via Route Data:
```typescript
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Only preload if route has { data: { preload: true } }
    return route.data?.['preload'] ? load() : of(null);
  }
}
```
Register in `app.config.ts`:
```typescript
provideRouter(routes, withPreloading(SelectivePreloadStrategy))
```

---

## 6. 🎯 Gotchas & Senior Scenarios

### Q9: 🐛 Bug: Navigating to the same route with different query params does not refresh component data. How to fix?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix  
**Tags:** `[Routing]` `[Gotchas]`

**Answer:**
By default, Angular's `RouteReuseStrategy` reuses component instances when only query parameters or path parameters change on the active route.

#### The Bug:
```typescript
ngOnInit() {
  // ❌ Snapshot only captures initial value on mount!
  const page = this.route.snapshot.queryParamMap.get('page');
  this.loadPage(page);
}
```
When user navigates from `?page=1` to `?page=2`, `ngOnInit` does **not** run again!

#### Fix Options:
1. **Modern Fix:** Use `withComponentInputBinding()` with an `input()` signal:
   ```typescript
   page = input<string>('1');
   // Reactively fetch whenever page signal updates!
   pageResource = resource({
     request: () => ({ page: this.page() }),
     loader: ({ request }) => this.fetchPage(request.page)
   });
   ```
2. **Classic Fix:** Subscribe to `queryParamMap`:
   ```typescript
   this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
     this.loadPage(params.get('page'));
   });
   ```
3. **Router Option:** Set `onSameUrlNavigation: 'reload'` and `runGuardsAndResolvers: 'always'`.
