# 10 — State Management: NgRx Store, ComponentStore & SignalStore

> The State Management Spectrum, Classic NgRx Redux Store (`createFeature`, `createActionGroup`), NgRx ComponentStore, and NgRx SignalStore (`@ngrx/signals`) with Custom Features, `patchState`, and `rxMethod`.

---

## 📑 Table of Contents
1. [The State Management Decision Spectrum](#1-the-state-management-decision-spectrum)
2. [Classic NgRx Global Store (Redux Pattern)](#2-classic-ngrx-global-store-redux-pattern)
3. [NgRx SignalStore (`@ngrx/signals`) Architecture](#3-ngrx-signalstore-ngrxsignals-architecture)
4. [Custom Feature Extensions in SignalStore](#4-custom-feature-extensions-in-signalstore)
5. [Managing Side Effects: `rxMethod` vs `effect`](#5-managing-side-effects-rxmethod-vs-effect)
6. [🎯 Gotchas & Senior Scenarios](#6--gotchas--senior-scenarios)

---

## 1. The State Management Decision Spectrum

### Q1: Compare State Management approaches in Angular: Service with Signals vs ComponentStore vs NgRx SignalStore vs NgRx Global Store.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[StateManagement]` `[Architecture]`

**Answer:**

```text
Complexity & Boilerplate Scale:
[ Local signal() ] ──► [ Signal Service ] ──► [ NgRx SignalStore ] ──► [ Classic NgRx Redux ]
```

| Approach | Reactivity Primitive | Mental Model | Best For |
|---|---|---|---|
| **Local Signals** | `signal()`, `computed()` | Component-local | UI toggles, tabs, local accordion state |
| **Service with Signals** | Injectable class with signals | Lightweight shared singleton | Medium features, user preferences, cart |
| **NgRx ComponentStore** | RxJS Observable streams | Feature/Component scoped | Complex component trees (legacy RxJS codebases) |
| **NgRx SignalStore** | Angular Signals | **Modular, extensible function composition** | Modern feature & global state, clean signals, custom features |
| **Classic NgRx Store** | Redux (Actions, Reducers, Effects) | Strict CQRS / Event-Sourcing | Massive financial/enterprise apps requiring strict event audit logs & time-travel |

**Senior Rule of Thumb:**  
In modern Angular (v17+), **NgRx SignalStore (`@ngrx/signals`)** is the recommended default for complex state. It delivers full type safety, zero action/reducer boilerplate, and native Angular Signals integration.

---

## 2. Classic NgRx Global Store (Redux Pattern)

### Q2: Explain the Redux lifecycle in NgRx: Actions, Reducers, Selectors, and Effects.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[NgRx]` `[Redux]`

**Answer:**

```text
[Component UI] ──(Dispatches Action)──► [NgRx Store]
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
              [Reducers]                                        [Effects]
     (Pure function updates state)                    (Async side effects: HTTP)
                    │                                               │
                    ▼                                               ▼
          [New State Tree]                              (Dispatches Success Action)
                    │
                    ▼
          [Memoized Selectors]
                    │
                    ▼
          [Component receives new slice via Signal/Observable]
```

#### Modern Redux Syntax (Angular 14+):
```typescript
// 1. Action Group
export const ProductsActions = createActionGroup({
  source: 'Products Page',
  events: {
    'Load Products': emptyProps(),
    'Load Products Success': props<{ products: Product[] }>(),
    'Load Products Failure': props<{ error: string }>()
  }
});

// 2. Feature Reducer
export const productsFeature = createFeature({
  name: 'products',
  reducer: createReducer(
    initialState,
    on(ProductsActions.loadProductsSuccess, (state, { products }) => ({
      ...state,
      products,
      isLoading: false
    }))
  )
});
```

---

### Q3: Why do memoized selectors created with `createSelector` fail memoization, and how do you debug this?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[NgRx]` `[Selectors]`

**Answer:**
`createSelector` caches the last evaluated result. It only recomputes its projector function if input slice references change.

#### Causes of broken memoization:
1. **Returning a new object/array reference inside the projector:**
   ```typescript
   // ❌ FAILS MEMOIZATION: Returns a brand new array every time state changes!
   export const selectActiveUsers = createSelector(
     selectAllUsers,
     (users) => users.filter(u => u.isActive) // New array reference!
   );
   ```
   *Impact:* Even if the active users haven't changed, downstream subscribers re-render.
2. **Impure Reducer Mutations:** If a reducer mutates state in place (`state.users.push(item)`), selectors relying on referential comparison will not detect changes.

---

## 3. NgRx SignalStore (`@ngrx/signals`) Architecture

### Q4: What is NgRx SignalStore (`@ngrx/signals`), and how is a store constructed?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[SignalStore]` `[Modern]`

**Answer:**
`@ngrx/signals` is a standalone, tree-shakable state management library built on native Angular Signals. Stores are composed using functional building blocks:
- `withState()`: Declares reactive state properties.
- `withComputed()`: Declares pure derived signals.
- `withMethods()`: Declares methods to update state or trigger async operations.
- `withHooks()`: Lifecycle hooks (`onInit`, `onDestroy`).

```typescript
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { ProductApiService } from './product-api.service';

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  filter: string;
}

const initialState: ProductsState = {
  products: [],
  isLoading: false,
  filter: ''
};

export const ProductsStore = signalStore(
  { providedIn: 'root' }, // Or omit to make it component-scoped!
  withState(initialState),

  // Derived Signals
  withComputed(({ products, filter }) => ({
    filteredProducts: computed(() => {
      const q = filter().toLowerCase();
      return products().filter(p => p.name.toLowerCase().includes(q));
    }),
    productCount: computed(() => products().length)
  })),

  // Methods
  withMethods((store, api = inject(ProductApiService)) => ({
    updateFilter(filter: string) {
      patchState(store, { filter });
    },
    async loadProducts() {
      patchState(store, { isLoading: true });
      try {
        const products = await api.fetchAll();
        patchState(store, { products, isLoading: false });
      } catch (error) {
        patchState(store, { isLoading: false });
      }
    }
  }))
);
```

#### Consumption in Component:
```typescript
@Component({
  standalone: true,
  template: `
    @if (store.isLoading()) { <p>Loading...</p> }
    @for (product of store.filteredProducts(); track product.id) {
      <div>{{ product.name }}</div>
    }
  `
})
export class ProductsComponent {
  readonly store = inject(ProductsStore);

  ngOnInit() {
    this.store.loadProducts();
  }
}
```

---

## 4. Custom Feature Extensions in SignalStore

### Q5: How do you build reusable custom store features using `signalStoreFeature`?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Coding  
**Tags:** `[SignalStore]` `[CustomFeatures]`

**Answer:**
`signalStoreFeature` enables true higher-order composable extensions (like plugins) across any number of stores.

#### Example: Reusable `withCallState()` Feature:
```typescript
import { signalStoreFeature, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export type CallState = 'INIT' | 'LOADING' | 'LOADED' | { error: string };

export function withCallState() {
  return signalStoreFeature(
    withState<{ callState: CallState }>({ callState: 'INIT' }),
    withComputed(({ callState }) => ({
      isLoading: computed(() => callState() === 'LOADING'),
      isLoaded: computed(() => callState() === 'LOADED'),
      error: computed(() => typeof callState() === 'object' ? callState().error : null)
    })),
    withMethods((store) => ({
      setLoading() { patchState(store, { callState: 'LOADING' }); },
      setLoaded() { patchState(store, { callState: 'LOADED' }); },
      setError(error: string) { patchState(store, { callState: { error } }); }
    }))
  );
}
```

#### Composed effortlessly into any store:
```typescript
export const UserStore = signalStore(
  withState({ users: [] }),
  withCallState() // ✅ Injects callState, isLoading(), error(), setLoading()...
);
```

---

## 5. Managing Side Effects: `rxMethod` vs `effect`

### Q6: How does `rxMethod` handle asynchronous side effects and cancellation in SignalStore?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[rxMethod]` `[Async]`

**Answer:**
`rxMethod` (from `@ngrx/signals/rxjs-interop`) creates a reactive method that accepts static values, Observables, or Signals, piping them cleanly through RxJS operators (`switchMap`, `debounceTime`).

```typescript
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

export const SearchStore = signalStore(
  withState({ results: [], query: '' }),
  withMethods((store, api = inject(SearchApiService)) => ({
    // rxMethod handles debouncing, cancellation, and state patching!
    search: rxMethod<string>(
      pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => patchState(store, { isLoading: true })),
        switchMap(term =>
          api.query(term).pipe(
            tap(results => patchState(store, { results, isLoading: false }))
          )
        )
      )
    )
  }))
);
```

### Consumption:
You can pass a raw value `store.search('angular')` OR connect a Signal directly:
`store.search(this.queryInputSignal);` — it re-executes whenever the signal updates!

---

## 6. 🎯 Gotchas & Senior Scenarios

### Q7: 🐛 Bug: Passing signals directly into `effect()` inside a store triggers an infinite loop. Why?
**Answer:**
```typescript
// ❌ Dangerous infinite loop:
effect(() => {
  const count = store.count(); // Reads count
  patchState(store, { count: count + 1 }); // Mutates count -> triggers effect again!
});
```

#### Best Practices:
1. Never update store state inside an `effect()` that reads from the same store.
2. For reactive stream reactions, use `rxMethod` or `withHooks`.
3. Use `computed()` for any state derived from existing store signals.
