# 02 — Angular Dependency Injection & Modern `inject()`

> Hierarchical Injector Tree, Resolution Modifiers (`@Self`, `@SkipSelf`, `@Host`, `@Optional`), Injection Context, the `inject()` Function, Provider Types, and `DestroyRef`.

---

## 📑 Table of Contents
1. [Hierarchical Injector Architecture](#1-hierarchical-injector-architecture)
2. [Modern `inject()` vs Constructor DI](#2-modern-inject-vs-constructor-di)
3. [Injection Context & RunInInjectionContext](#3-injection-context--runininjectioncontext)
4. [Resolution Modifiers Deep-Dive](#4-resolution-modifiers-deep-dive)
5. [Provider Types & Multi-Providers](#5-provider-types--multi-providers)
6. [🎯 Traps & Senior Scenarios](#6--traps--senior-scenarios)

---

## 1. Hierarchical Injector Architecture

### Q1: How does Angular's Hierarchical Dependency Injection system work?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture  
**Tags:** `[DI]` `[Architecture]`

**Answer:**
Angular's DI system is a tree of hierarchical injectors that mirrors both the application structure and the DOM hierarchy. When a component requests a dependency, Angular traverses the injector hierarchy upwards until it finds a provider or throws `NullInjectorError`.

The injector hierarchy consists of two distinct parallel tiers:
1. **ElementInjector Hierarchy:** Created implicitly for every DOM component or directive that registers `providers: [...]` or `viewProviders: [...]`.
2. **EnvironmentInjector Hierarchy:** Created for the platform, root application, and lazy-loaded route boundaries.

```text
[NullInjector]                     Throws error if dependency not found
      ▲
[PlatformInjector]                 Platform-wide singletons (e.g., DomSanitizer)
      ▲
[Root EnvironmentInjector]         Services with { providedIn: 'root' }
      ▲
[Route EnvironmentInjector]        Route providers: [{ path: 'admin', providers: [...] }]
      ▲
[Parent ElementInjector]           Parent component providers: [...]
      ▲
[Child ElementInjector]            Child component inject(Service)
```

**Lookup Flow:**
Angular searches the **ElementInjector** hierarchy first (from child component up through ancestors to root component). If not found, it switches to the **EnvironmentInjector** hierarchy (route injector ➔ root injector ➔ platform injector ➔ NullInjector).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if two lazy-loaded routes both define `{ provide: AuthService, useClass: AuthService }` in their route providers?"  
*Senior Answer:* Each route will receive its **own isolated singleton instance** of `AuthService`. State stored inside `AuthService` will NOT be shared between the two routes. To ensure a single true global singleton across the entire app, use `@Injectable({ providedIn: 'root' })`.

---

### Q2: What is the difference between `@Injectable({ providedIn: 'root' })` vs providing a service in `@Component({ providers: [...] })`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[DI]` `[Providers]`

**Answer:**

```typescript
// Pattern A: Global Singleton (Recommended default)
@Injectable({ providedIn: 'root' })
export class CartService {}

// Pattern B: Component-scoped Instance
@Component({
  selector: 'app-checkout-wizard',
  providers: [CheckoutStateService],
  template: `...`
})
export class CheckoutWizardComponent {}
```

| Feature | `providedIn: 'root'` | `@Component({ providers: [...] })` |
|---|---|---|
| **Instance Scope** | Global Singleton across entire app | Scoped to that component & its children |
| **Lifecycle** | Lives for lifetime of application | Created when component mounts; destroyed on unmount |
| **Tree-Shaking** | Fully tree-shakable (omitted from bundle if unused) | Not tree-shakable if component is imported |
| **State Sharing** | Shared everywhere | Isolated per component instance (e.g. multiple tabs) |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a parent component lists `providers: [CounterService]` and renders 5 child components?"  
*Senior Answer:* All 5 child components share the **single** instance created by that parent. However, if each child also lists `providers: [CounterService]`, each child gets its **own separate instance**, shadowing the parent's instance.

---

### Q3: What is the difference between `providers` and `viewProviders` in a Component decorator?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[DI]` `[ViewProviders]`

**Answer:**
Both configure the component's `ElementInjector`, but they control visibility to **projected content** (`<ng-content>`):

- **`providers`:** Accessible to the component's own template **AND** any projected content passed into `<ng-content>`.
- **`viewProviders`:** Accessible **ONLY** to the component's own template views and child components defined inside its template. It is **hidden** from projected content.

```typescript
@Component({
  selector: 'app-accordion',
  viewProviders: [InternalAccordionStateService], // Projected items CANNOT inject this
  providers: [PublicThemeService],                // Projected items CAN inject this
  template: `
    <div class="accordion">
      <ng-content></ng-content>
    </div>
  `
})
export class AccordionComponent {}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When should an enterprise library author use `viewProviders`?"  
*Senior Answer:* When encapsulating internal component state (like a form field wrapper's internal label ID generator) so that projected third-party inputs or child components do not accidentally collide with or corrupt the container's internal state.

---

## 2. Modern `inject()` vs Constructor DI

### Q4: Compare modern `inject()` with constructor-based dependency injection. Why is `inject()` preferred in modern Angular?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[inject]` `[Modern]`

**Answer:**
Angular 14+ introduced the `inject()` function as a first-class alternative to constructor parameters.

```typescript
// 1. Classic Constructor DI
@Component({...})
export class UserProfileComponent {
  constructor(
    private http: HttpClient,
    private router: Router,
    @Optional() private logger?: LoggerService
  ) {}
}

// 2. Modern inject() Function
@Component({...})
export class UserProfileComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private logger = inject(LoggerService, { optional: true });
}
```

### Why `inject()` is superior:
1. **No Constructor Inheritance Boilerplate:** When extending base classes, subclasses do not need to call `super(http, router, logger, ...)`.
2. **Custom Composable Functions:** You can create reusable utility functions that inject dependencies directly (functional composition / mixins).
3. **Cleaner Typing:** Works seamlessly with TypeScript property initializers.
4. **Functional APIs:** Required for functional guards (`CanActivateFn`), functional interceptors (`HttpInterceptorFn`), and signal helpers.

```typescript
// Composable utility function using inject()
export function injectParams(paramName: string) {
  const route = inject(ActivatedRoute);
  return route.snapshot.paramMap.get(paramName);
}

// Consumed cleanly inside any component:
export class ProductDetailComponent {
  productId = injectParams('id'); // Clean, reusable!
}
```

---

## 3. Injection Context & RunInInjectionContext

### Q5: What causes `NG0203: inject() must be called from an injection context`? How do you fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[InjectionContext]` `[Gotchas]`

**Answer:**
The `inject()` function only works when Angular has an active **Injection Context**. This context exists only during:
1. Class property initialization (`private service = inject(Service);`).
2. Class `constructor()` execution.
3. Functional factory execution (guards, interceptors, resolvers, `APP_INITIALIZER`).

#### The Bug: Calling `inject()` asynchronously or inside a method:
```typescript
@Component({...})
export class BrokenComponent {
  doAction() {
    // ❌ CRASH! NG0203: Called outside injection context (during button click)
    const dialog = inject(MatDialog);
  }

  fetchData() {
    setTimeout(() => {
      // ❌ CRASH! NG0203: Async callback runs outside injection context
      const http = inject(HttpClient);
    }, 1000);
  }
}
```

#### How to Fix:
**Solution A:** Inject as a class property or inside the constructor:
```typescript
private dialog = inject(MatDialog);
```

**Solution B:** Use `EnvironmentInjector.runInInjectionContext()` or `runInInjectionContext()`:
```typescript
@Component({...})
export class DynamicComponent {
  private injector = inject(EnvironmentInjector);

  onLateAsyncEvent() {
    runInInjectionContext(this.injector, () => {
      // ✅ Works! Explicit injection context established
      const service = inject(LateLoadedService);
      service.execute();
    });
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does `assertInInjectionContext()` help library authors?"  
*Senior Answer:* It allows custom utility functions to fail fast with a helpful, descriptive error message if a developer attempts to call their helper outside an active injection context.

---

## 4. Resolution Modifiers Deep-Dive

### Q6: Explain resolution modifiers: `@Self()`, `@SkipSelf()`, `@Optional()`, and `@Host()`. How do you write them with `inject()`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ResolutionModifiers]` `[DI]`

**Answer:**
Resolution modifiers dictate how the hierarchical injector traverses the tree:

```typescript
// Modern inject() modifier flags:
const service = inject(MyService, {
  optional: true,
  self: true,
  skipSelf: true,
  host: true
});
```

| Modifier | Constructor Decorator | `inject()` Flag | Resolution Behavior |
|---|---|---|---|
| **Self** | `@Self()` | `{ self: true }` | Checks ONLY the current element's injector. Never traverses parents. Throws if missing. |
| **SkipSelf** | `@SkipSelf()` | `{ skipSelf: true }` | Skips current element; starts searching from the parent injector upwards. |
| **Optional** | `@Optional()` | `{ optional: true }` | Returns `null` instead of throwing `NullInjectorError` if dependency is not found. |
| **Host** | `@Host()` | `{ host: true }` | Searches up the ElementInjector hierarchy, but **stops at the host component** boundary. |

#### Classic Use Case for `@SkipSelf()`:
Preventing recursive circular dependency when creating hierarchical tree-like components (e.g. nested menus, tree nodes):
```typescript
@Component({
  selector: 'app-tree-node',
  template: `...`
})
export class TreeNodeComponent {
  // Injects the parent tree node, NOT itself!
  parent = inject(TreeNodeComponent, { optional: true, skipSelf: true });
}
```

---

### Q7: What is the boundary of `@Host()`, and how does it behave with components vs directives?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Host]` `[DI]`

**Answer:**
The "host" is the component whose template declared the current element/directive.
- If placed on a **Directive**: `@Host()` searches upwards through directives on the same DOM element, up to the component that owns that template. It will **not** search parent components.
- If placed on a **Component**: The host is the component itself. It will not search ancestors.

```html
<!-- Parent Component Template -->
<app-child-card myDirective>
  <p>Content</p>
</app-child-card>
```
If `myDirective` injects `ChildCardService` with `{ host: true }`, resolution succeeds because `app-child-card` is its host. If it asks for `ParentService`, resolution fails.

---

## 5. Provider Types & Multi-Providers

### Q8: Explain all Angular provider types: `useClass`, `useValue`, `useExisting`, and `useFactory`.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Providers]` `[Core]`

**Answer:**

```typescript
// 1. useClass — Instantiates a class when token is requested
{ provide: LoggerService, useClass: ProductionLoggerService }

// 2. useValue — Provides a static primitive, object, or function
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
{ provide: API_CONFIG, useValue: { baseUrl: 'https://api.domain.com', timeout: 5000 } }

// 3. useExisting — Alias/redirects to an existing singleton without creating a new instance
{ provide: MinimalLogger, useExisting: LoggerService }

// 4. useFactory — Runs a factory function with dynamic injected dependencies
{
  provide: PaymentGateway,
  useFactory: (config: ApiConfig, http: HttpClient) => {
    return config.isMock ? new MockPaymentGateway() : new StripePaymentGateway(http);
  },
  deps: [API_CONFIG, HttpClient] // Or use inject() directly inside the factory in v14+
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the difference between `useClass` and `useExisting`?"  
*Senior Answer:* `useClass` creates a **new, separate instance** for the token. `useExisting` creates an **alias** pointing to the existing instance of another token, ensuring both tokens share the exact same memory reference.

---

### Q9: How do Multi-Providers (`multi: true`) work in Angular?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[MultiProviders]` `[Tokens]`

**Answer:**
When `{ multi: true }` is specified on a provider, Angular compiles an **array of instances** instead of returning a single instance.

```typescript
export const VALIDATOR_RULE = new InjectionToken<ValidatorRule[]>('VALIDATOR_RULE');

// Feature A provides a rule:
{ provide: VALIDATOR_RULE, useClass: EmailRule, multi: true }

// Feature B provides another rule:
{ provide: VALIDATOR_RULE, useClass: MinLengthRule, multi: true }

// Injected as an array:
@Injectable({ providedIn: 'root' })
export class ValidatorService {
  private rules = inject(VALIDATOR_RULE); // Array: [EmailRule, MinLengthRule]

  validate(value: string) {
    return this.rules.every(r => r.check(value));
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if one provider registers a token with `multi: true` and another registers the same token without `multi: true`?"  
*Senior Answer:* Angular throws a runtime compiler error (`Cannot mix multi-providers and regular providers for token X`). All registrations for that token must consistently agree on `multi: true`.

---

## 6. 🎯 Traps & Senior Scenarios

### Q10: What is `DestroyRef`, and how does it eliminate `ngOnDestroy` in modern Angular?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[DestroyRef]` `[Cleanup]`

**Answer:**
`DestroyRef` (Angular 16+) is an injectable token representing the current lifecycle destruction context. It allows registering cleanup callbacks without implementing `OnDestroy`.

```typescript
import { Component, DestroyRef, inject } from '@angular/core';

@Component({...})
export class TimerWidgetComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    const timerId = setInterval(() => console.log('Tick'), 1000);

    // Register cleanup callback directly
    this.destroyRef.onDestroy(() => {
      clearInterval(timerId);
    });
  }
}
```

### Huge Advantage:
Enables cleanup inside reusable functional helpers:
```typescript
export function useInterval(callback: () => void, ms: number) {
  const destroyRef = inject(DestroyRef);
  const id = setInterval(callback, ms);
  destroyRef.onDestroy(() => clearInterval(id));
}
```

---

### Q11: What is `forwardRef()`, and when is it necessary?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[forwardRef]` `[Circular]`

**Answer:**
`forwardRef()` breaks JavaScript class declaration hoisting limitations. Because ES6 classes are not hoisted, referencing a class before its declaration causes `ReferenceError`.

Classic case: Registering a custom component as a `NG_VALUE_ACCESSOR` inside its own decorator:
```typescript
@Component({
  selector: 'app-custom-input',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomInputComponent), // Evaluated lazily when called
      multi: true
    }
  ]
})
export class CustomInputComponent implements ControlValueAccessor { ... }
```
`forwardRef(() => CustomInputComponent)` returns a closure that Angular evaluates *after* the class is compiled into JavaScript memory.

---

### Q12: 🐛 Bug: Service provided in a Lazy-Loaded Route becomes a duplicate instance. Find the cause.
```typescript
// auth.service.ts
@Injectable() // Notice: no providedIn: 'root'
export class AuthService {
  token = '';
}

// app.routes.ts
export const routes: Routes = [
  {
    path: 'admin',
    providers: [AuthService], // ❌ Cause of bug!
    loadChildren: () => import('./admin/admin.routes')
  }
];
```
**Fix:**
Providing a service in a route configuration creates a new child `EnvironmentInjector` for that route subtree. Any components under `/admin` will inject a new instance of `AuthService` with an empty `token`.  
To fix, add `@Injectable({ providedIn: 'root' })` to the service and delete `providers: [AuthService]` from the route.
