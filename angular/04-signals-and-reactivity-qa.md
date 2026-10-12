# 04 — Angular Signals & Modern Reactivity

> Signal Primitives (`signal`, `computed`, `effect`), Signal Inputs & Outputs, Two-Way Binding with `model()`, Signal Queries, `linkedSignal()`, `resource()`, and Push-Pull Reactivity Internals.

---

## 📑 Table of Contents
1. [Signals Foundation & Reactivity Model](#1-signals-foundation--reactivity-model)
2. [`computed()` vs `effect()`](#2-computed-vs-effect)
3. [Signal-Based Component Authoring (`input`, `output`, `model`)](#3-signal-based-component-authoring-input-output-model)
4. [Signal Queries (`viewChild`, `contentChild`)](#4-signal-queries-viewchild-contentchild)
5. [Next-Gen Reactivity: `linkedSignal` & `resource`](#5-next-gen-reactivity-linkedsignal--resource)
6. [🎯 Output Challenges & Common Traps](#6--output-challenges--common-traps)

---

## 1. Signals Foundation & Reactivity Model

### Q1: What problem do Angular Signals solve, and what is the "Push-Pull" reactivity algorithm?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Signals]` `[Architecture]`

**Answer:**
Historically, Angular used Zone.js to perform coarse-grained, top-down tree checking.  
**Signals** introduce **fine-grained reactivity**. A Signal is a wrapper around a value that notifies interested consumers when that value changes, maintaining a dynamic dependency graph.

Angular Signals implement a **Push-Pull (Glitch-Free)** algorithm:
1. **Push Phase (Dirty Notification):** When a writable signal changes via `.set()` or `.update()`, it pushes a lightweight "dirty" flag down through its dependents in the graph. **No computations run yet.**
2. **Pull Phase (Lazy Evaluation):** When a dependent value (such as a `computed()` or template expression) is actually **read**, it pulls the latest value by evaluating only if marked dirty.

```text
[Writable Signal: count = 1]
           │ (Push: "I am dirty")
           ▼
[Computed: double = count * 2] (Marked dirty, does not execute yet)
           │
      (Pull: Read in template {{ double() }})
           ▼
[Double executes calculation: 1 * 2 = 2] (Memoized until next dirty notification)
```

### Why it solves the "Diamond Dependency Glitch":
If `A` updates, and both `B` and `C` depend on `A`, and `D` depends on both `B` and `C`:
In naive push systems, `D` evaluates twice (once when `B` updates, and once when `C` updates), potentially exposing an inconsistent intermediate state. In Angular's push-pull model, `D` is guaranteed to evaluate **exactly once** with consistent values.

---

### Q2: Explain the writable signal APIs: `.set()`, `.update()`, and `.asReadonly()`.
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[Signals]` `[Core]`

**Answer:**

```typescript
import { signal } from '@angular/core';

// 1. Creation
const count = signal(0);

// 2. .set() — Replaces the value directly
count.set(5);

// 3. .update() — Computes new value based on current value (immutable update)
count.update(current => current + 1);

// 4. .asReadonly() — Exposes a read-only view to prevent external mutation
export class UserService {
  private _user = signal<User | null>(null);

  // Consumers can only read, not mutate!
  readonly user = this._user.asReadonly();

  loadUser(u: User) {
    this._user.set(u);
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you mutate an object property inside a signal without creating a new reference?"  
```typescript
const user = signal({ name: 'Alice' });
user().name = 'Bob'; // ❌ Anti-pattern!
```
*Senior Answer:* Because Signals check equality using `Object.is` by default, mutating an object in-place does not change the reference. Angular's dependency graph will NOT detect the change, and dependent `computed()` or template views will not update. Always return a new object:
`user.update(u => ({ ...u, name: 'Bob' }));`

---

## 2. `computed()` vs `effect()`

### Q3: What is the architectural difference between `computed()` and `effect()`? When should each be used?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Signals]` `[computed]` `[effect]`

**Answer:**

| Feature | `computed()` | `effect()` |
|---|---|---|
| **Purpose** | Derive state from other signals | Perform external side-effects |
| **Execution** | **Lazy & Memoized** (runs only when read) | **Eager** (scheduled asynchronously on microtask queue) |
| **Purity** | **Pure function** (MUST NOT perform side effects) | Side-effect container (logging, DOM, storage) |
| **Return Value** | Returns a `Signal<T>` | Returns an `EffectRef` (cleanup handle) |

```typescript
@Component({...})
export class CartComponent {
  items = signal<CartItem[]>([]);

  // ✅ computed: Pure derivation, lazy, memoized
  totalPrice = computed(() => {
    return this.items().reduce((sum, item) => sum + item.price, 0);
  });

  constructor() {
    // ✅ effect: External side-effect (syncing with localStorage)
    effect(() => {
      const items = this.items();
      localStorage.setItem('cart', JSON.stringify(items));
    });
  }
}
```

---

### Q4: ⚠️ Gotcha: Why does Angular throw `NG0600: Writing to signals is not allowed in a computed or effect`?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[effect]` `[Gotchas]`

**Answer:**
By default, Angular explicitly disallows setting or updating signals inside an `effect()`:

```typescript
// ❌ WRONG: Attempting to synchronize state inside effect
effect(() => {
  const currentCount = this.count();
  this.doubleCount.set(currentCount * 2); // Throws NG0600!
});
```

#### Why it's disallowed:
Writing to signals inside effects creates **circular dependency cascades and infinite render loops** (`A` triggers effect, effect writes to `B`, `B` triggers another effect, etc.).

#### How to fix:
1. **Architectural Fix (95% of cases):** If you are calculating state based on another signal, use `computed()`, NOT an `effect()`:
   ```typescript
   doubleCount = computed(() => this.count() * 2);
   ```
2. **If truly necessary (rare integration):** You can pass `{ allowSignalWrites: true }`:
   ```typescript
   effect(() => {
     // Allowed, but proceed with extreme caution!
   }, { allowSignalWrites: true });
   ```

---

### Q5: How do you handle cleanup and untracked reads inside `effect()`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[effect]` `[untracked]`

**Answer:**

#### 1. `onCleanup`:
`effect()` provides an `onCleanup` registration function to dispose of subscriptions, timers, or sockets when the effect re-runs or when the enclosing context is destroyed:

```typescript
effect((onCleanup) => {
  const userId = this.currentUserId();
  const socket = new WebSocket(`wss://api.com/users/${userId}`);

  onCleanup(() => {
    socket.close(); // Cleans up previous socket before next execution
  });
});
```

#### 2. `untracked()`:
By default, **any** signal read inside an effect registers as a dependency. If you want to read a signal without triggering re-execution when it changes, wrap it in `untracked()`:

```typescript
effect(() => {
  const user = this.currentUser(); // Trigger dependency

  // Read logging config WITHOUT tracking it
  const verbose = untracked(() => this.isVerboseLogging());

  if (verbose) {
    console.log('User changed to:', user.name);
  }
});
```

---

## 3. Signal-Based Component Authoring (`input`, `output`, `model`)

### Q6: Compare Signal Inputs (`input()`, `input.required()`) with legacy `@Input()` decorators.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[input]` `[Modern]`

**Answer:**
Introduced in Angular 17.1+, Signal Inputs replace the `@Input()` decorator with a reactive, type-safe Signal.

```typescript
// Legacy @Input()
@Input() title: string = '';
@Input({ required: true }) userId!: number;
@Input({ transform: booleanAttribute }) disabled = false;

// Modern Signal Input
title = input('');                                       // InputSignal<string> (optional with default)
userId = input.required<number>();                       // InputSignal<number> (compiler-enforced required)
disabled = input(false, { transform: booleanAttribute }); // With transform function
```

### Key Advantages:
1. **Reactive in TypeScript:** Can be directly consumed in `computed()` without needing `ngOnChanges`:
   ```typescript
   userId = input.required<number>();
   userProfileUrl = computed(() => `/api/users/${this.userId()}`);
   ```
2. **Read-only by default:** Signal inputs cannot be mutated by the child component.
3. **No lifecycle delay:** Safe to read inside `computed()` properties immediately.

---

### Q7: Explain Two-Way Binding with `model()` signals.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[model]` `[TwoWayBinding]`

**Answer:**
The `model()` API creates a **writable signal input** that supports Angular's "banana-in-a-box" two-way binding syntax (`[(value)]="parentState"`).

```typescript
// custom-toggle.component.ts
@Component({
  selector: 'app-custom-toggle',
  standalone: true,
  template: `
    <button (click)="toggle()">
      {{ checked() ? 'ON' : 'OFF' }}
    </button>
  `
})
export class CustomToggleComponent {
  // Two-way binding signal
  checked = model(false);

  toggle() {
    this.checked.update(v => !v); // Updates internal signal AND notifies parent!
  }
}
```

```html
<!-- parent.component.html -->
<app-custom-toggle [(checked)]="isNotificationsEnabled" />
```

Under the hood, Angular automatically generates an output named `checkedChange` that emits whenever `this.checked.set()` or `.update()` is invoked.

---

### Q8: Compare `output()` vs legacy `@Output() EventEmitter`.
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[output]` `[Modern]`

**Answer:**
Angular's modern `output()` function replaces `@Output() new EventEmitter<T>()` without bundling RxJS `Subject` overhead into simple DOM events.

```typescript
// Legacy:
@Output() selectItem = new EventEmitter<Item>();
this.selectItem.emit(item);

// Modern:
selectItem = output<Item>();
this.selectItem.emit(item);

// Observable Output interop:
priceChanges$ = inject(StockService).prices$;
priceUpdated = outputFromObservable(this.priceChanges$);
```

---

## 4. Signal Queries (`viewChild`, `contentChild`)

### Q9: Contrast Signal Queries (`viewChild`, `contentChild`) with legacy `@ViewChild` and `@ContentChild`.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[viewChild]` `[Queries]`

**Answer:**
Modern Angular replaces decorator-based queries with signal queries:

```typescript
// Legacy
@ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;
@ViewChildren(ItemComponent) items!: QueryList<ItemComponent>;

// Modern Signal Queries (Angular 17.2+)
inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');       // Signal<ElementRef | undefined>
requiredInput = viewChild.required<ElementRef>('inputRef');            // Signal<ElementRef>
items = viewChildren(ItemComponent);                                  // Signal<readonly ItemComponent[]>

// Content queries:
projectedCard = contentChild(CardHeaderComponent);                     // Signal<CardHeaderComponent | undefined>
```

### Major Advantages:
- Returns a `Signal`, so queries can be consumed inside `computed()` or `effect()`.
- `viewChild.required()` eliminates undefined checks when an element is guaranteed to exist.
- No need to configure `{ static: true/false }` — Angular resolves timing reactively.

---

## 5. Next-Gen Reactivity: `linkedSignal` & `resource`

### Q10: What is `linkedSignal()` (Angular 19+), and what problem does it solve?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[linkedSignal]` `[Angular19]`

**Answer:**
Historically, if you had a writable signal that needed to reset or calculate its value whenever a *source* signal changed (e.g. selecting a shipping method when the selected country changes), developers wrote fragile `effect()` or `ngOnChanges` workarounds.

`linkedSignal()` creates a **writable signal that is linked to a source signal**. It resets or computes a new default whenever the source changes, but can still be mutated independently.

```typescript
import { Component, signal, input, linkedSignal } from '@angular/core';

@Component({...})
export class QuantitySelectorComponent {
  // Input: Max allowed quantity (e.g., from product inventory)
  maxAllowed = input.required<number>();

  // Writable signal that resets to maxAllowed whenever maxAllowed changes!
  selectedQuantity = linkedSignal(() => this.maxAllowed());

  decrement() {
    this.selectedQuantity.update(q => Math.max(1, q - 1)); // User can override
  }
}
```

---

### Q11: What is `resource()` and `rxResource()` in modern Angular?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[resource]` `[Async]`

**Answer:**
`resource()` is Angular's native primitive for **asynchronous data fetching tied to reactive signals** (analogous to TanStack Query / React Query):

```typescript
import { Component, signal, resource } from '@angular/core';

@Component({...})
export class UserDetailComponent {
  userId = signal(1);

  // Resource tracks loading, value, status, error automatically!
  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(`/api/users/${request.id}`, { signal: abortSignal });
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    }
  });

  // In template:
  // @if (userResource.isLoading()) { <p>Loading...</p> }
  // @if (userResource.value()) { <h3>{{ userResource.value().name }}</h3> }
  // @if (userResource.error()) { <p>Error!</p> }
}
```
If using RxJS streams, `rxResource` provides the same API powered by Observables.

---

## 6. 🎯 Output Challenges & Common Traps

### Q12: 🧩 Output Prediction: What is printed to the console?
```typescript
const count = signal(1);
const double = computed(() => {
  console.log('Computing double...');
  return count() * 2;
});

console.log('Step 1');
count.set(2);
count.set(3);
console.log('Step 2');
console.log('Result:', double());
console.log('Result again:', double());
```

**Answer:**
```text
Step 1
Step 2
Computing double...
Result: 6
Result again: 6
```
**Why:**
1. `double` is lazy. It does not compute when `count.set()` is called during Step 1 and Step 2.
2. It only computes when `double()` is read in `console.log('Result:', double())`.
3. The second read `double()` returns the memoized `6` without printing `'Computing double...'` again!
