# 05 — Angular RxJS Mastery & Signals Interoperability

> Observables vs Subjects, Flattening Operators (`switchMap`, `mergeMap`, `concatMap`, `exhaustMap`), Memory Leaks & `takeUntilDestroyed()`, RxJS ↔ Signals Interoperability (`toSignal`, `toObservable`), and Resilient Reactive Patterns.

---

## 📑 Table of Contents
1. [Core Observables & Subject Variants](#1-core-observables--subject-variants)
2. [Flattening Operators Battle](#2-flattening-operators-battle)
3. [Memory Leaks & Modern Unsubscription Strategies](#3-memory-leaks--modern-unsubscription-strategies)
4. [RxJS ↔ Signals Interop (`@angular/core/rxjs-interop`)](#4-rxjs--signals-interop-angularcorerxjs-interop)
5. [Real-World Reactive Patterns](#5-real-world-reactive-patterns)
6. [🎯 Output Challenges & Trap Questions](#6--output-challenges--trap-questions)

---

## 1. Core Observables & Subject Variants

### Q1: What is the fundamental difference between Cold and Hot Observables in Angular?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RxJS]` `[Observables]`

**Answer:**
- **Cold Observables:** Data producer is created *inside* the observable execution. It does **not** emit items until an observer subscribes. Each subscriber receives its own independent execution.
  - *Example in Angular:* `HttpClient.get('/api/users')`. Subscribing 3 times triggers 3 independent HTTP requests.
- **Hot Observables:** Data producer exists *outside* the observable. It emits values regardless of whether subscribers exist. Multiple subscribers share the same execution.
  - *Example in Angular:* `Router.events`, DOM events (`fromEvent(button, 'click')`), and `Subject` instances.

```text
Cold:  Producer created on subscribe()  ──► [Sub 1: Gets own stream]
                                        ──► [Sub 2: Gets own stream]

Hot:   [External Producer emits] ──► Broadcasts to all active subscribers simultaneously
```

---

### Q2: Compare Subject, BehaviorSubject, ReplaySubject, and AsyncSubject.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RxJS]` `[Subjects]`

**Answer:**

```typescript
// 1. Subject: No initial value; late subscribers miss past emissions
const subject = new Subject<number>();

// 2. BehaviorSubject: Requires initial value; late subscribers get the LATEST value
const behavior = new BehaviorSubject<number>(0);
behavior.getValue(); // Synchronous read of current value

// 3. ReplaySubject: Buffers N past values for late subscribers
const replay = new ReplaySubject<number>(2); // Replays last 2 values

// 4. AsyncSubject: Emits ONLY the final value upon completion
const asyncSub = new AsyncSubject<number>();
```

| Subject Type | Requires Initial Value? | Late Subscriber Receives | Common Angular Use Case |
|---|---|---|---|
| **`Subject`** | ❌ No | Nothing from past | Event buses, button click streams, destroy signals |
| **`BehaviorSubject`** | ✅ Yes | Current/latest value | Classic service-based state management |
| **`ReplaySubject`** | ❌ No | Last `N` values | Caching API responses, token broadcast |
| **`AsyncSubject`** | ❌ No | Last value upon `.complete()` | Single calculation operations |

---

## 2. Flattening Operators Battle

### Q3: Explain the 4 flattening operators: `switchMap`, `mergeMap`, `concatMap`, and `exhaustMap`. When MUST you choose each?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[RxJS]` `[Operators]`

**Answer:**
When an observable emits inner observables (higher-order observable), flattening operators dictate how concurrent inner streams are handled:

```text
switchMap:  Cancels current inner request when a new one arrives (Switch to new)
mergeMap:   Runs all inner requests concurrently in parallel (No waiting, no cancellation)
concatMap:  Queues inner requests in sequence, executing one after another (Preserves order)
exhaustMap: Ignores new incoming requests while an inner request is currently running (Drops new)
```

| Operator | Concurrency Strategy | Real-World Production Scenario |
|---|---|---|
| **`switchMap`** | Cancels in-flight requests | **Search Autocomplete / Typeahead**: Cancel outdated search queries as user types. |
| **`mergeMap`** | Concurrent parallel execution | **Batch deletion / Uploading multiple files**: Fire 10 parallel upload calls simultaneously. |
| **`concatMap`** | Sequential queued execution | **Ordered Transactions / Drag-and-Drop save**: Database writes that must preserve strict chronological sequence. |
| **`exhaustMap`** | Ignores/drops until complete | **Submit Buttons / Payment Processing**: Prevent double-clicks from submitting multiple duplicate orders. |

#### Real-World Code Comparison:
```typescript
// 1. Autocomplete Search (switchMap cancels prior queries)
this.searchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.api.search(term))
);

// 2. Submit Payment (exhaustMap prevents double click charges)
this.submitClick$.pipe(
  exhaustMap(() => this.paymentApi.charge(this.cart))
);
```

---

## 3. Memory Leaks & Modern Unsubscription Strategies

### Q4: Which Observables in Angular leak memory if not unsubscribed, and which complete automatically?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RxJS]` `[MemoryLeaks]`

**Answer:**

#### ✅ Completes Automatically (No leak if unfinished, but good practice):
1. **`HttpClient` calls** (`http.get()`, `http.post()`): Emit once and complete immediately upon HTTP response.
2. **Operators with completion limits**: `take(n)`, `first()`, `takeWhile()`.
3. **`from([1, 2, 3])` / `of(val)`**: Emits synchronous values and immediately completes.

#### ❌ NEVER Complete (Will LEAK memory if not unsubscribed):
1. **`Router.events`**: Lives for the entire duration of the app.
2. **Infinite event streams**: `fromEvent(window, 'resize')`, `interval(1000)`.
3. **NgRx Store selectors**: `store.select(selectUser)`.
4. **Custom service Subjects**: `cartService.items$`.

**⚠️ The Danger:** An unclosed subscription keeps a reference to the component instance in its closure, preventing JavaScript garbage collection (Detached DOM Tree memory leak).

---

### Q5: Compare unsubscription techniques: `takeUntilDestroyed()`, `takeUntil(destroy$)`, and the `async` pipe.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[takeUntilDestroyed]` `[Cleanups]`

**Answer:**

```typescript
// 1. The Modern Gold Standard: takeUntilDestroyed() (Angular 16+)
@Component({...})
export class ModernComponent {
  private userService = inject(UserService);

  user$ = this.userService.userStream$.pipe(
    takeUntilDestroyed() // Automatically cleans up when component destroyed!
  ).subscribe(user => console.log(user));
}

// 2. Classic Pre-v16 Pattern: takeUntil with Subject
@Component({...})
export class LegacyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.stream$.pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// 3. Declarative Template Pattern: async pipe
// In Component:
data$ = this.api.getData();
// In Template:
// <div>{{ (data$ | async)?.name }}</div>
// (AsyncPipe handles subscribe and unsubscribe automatically)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you call `takeUntilDestroyed()` inside `ngOnInit` instead of the constructor?"  
*Senior Answer:* `takeUntilDestroyed()` requires an active Injection Context to locate `DestroyRef`. In `ngOnInit`, you must pass the injected `DestroyRef` explicitly:
```typescript
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.stream$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
}
```

---

## 4. RxJS ↔ Signals Interop (`@angular/core/rxjs-interop`)

### Q6: How does `toSignal()` work, and what are the options for handling initial values?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[toSignal]` `[Interop]`

**Answer:**
`toSignal()` converts an RxJS Observable into an Angular Signal. Because Observables are asynchronous and Signals must **always** hold a synchronous value, you must manage the initial emission:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

// Approach 1: Default undefined (returns Signal<User | undefined>)
user = toSignal(this.userService.user$);

// Approach 2: Explicit initial value (returns Signal<User>)
userWithDefault = toSignal(this.userService.user$, {
  initialValue: { id: 0, name: 'Anonymous' }
});

// Approach 3: requireSync: true (Asserts stream emits synchronously on subscribe)
// Throws error if observable does NOT emit synchronously!
counter = toSignal(of(10), { requireSync: true }); // Signal<number>
```

### Lifecycle & Unsubscription:
`toSignal()` automatically unsubscribes from the source observable when the surrounding injection context (component, service) is destroyed.

---

### Q7: How does `toObservable()` work, and what is the timing trap with Signal-to-Observable conversion?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[toObservable]` `[Microtasks]`

**Answer:**
`toObservable()` creates an Observable tracking a Signal using an internal `effect()`:

```typescript
const count = signal(0);
const count$ = toObservable(count);

count$.subscribe(val => console.log('Observable emitted:', val));

count.set(1);
count.set(2);
count.set(3);
```

#### ⚠️ The Critical Timing Trap:
**What is printed?**
```text
Observable emitted: 0
Observable emitted: 3
```
Values `1` and `2` are **skipped**!  
**Why:** `toObservable()` runs via Angular's Signal `effect()`, which schedules emission asynchronously on the browser's **microtask queue**. Rapid synchronous updates before the microtask fires are coalesced, and only the latest state is emitted. **Signals represent state, not individual events.**

---

### Q8: When should you use RxJS vs when should you use Signals?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[RxJSvsSignals]` `[Architecture]`

**Answer:**

```text
           ┌──────────────────────────────────────────────┐
           │                When to use?                  │
           └──────────────────────┬───────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
     [ Signals ]                                       [ RxJS ]
  - Synchronous UI state                            - Asynchronous event streams
  - Derived values (computed)                       - Time manipulation (debounce, delay)
  - Template bindings                               - Cancellation & race handling (switchMap)
  - Component inputs / models                       - WebSockets & real-time feeds
  - Local UI toggles & forms                        - Multi-event orchestration (combineLatest)
```

**Golden Architectural Rule:**  
*"Use RxJS to process asynchronous pipelines and event streams; convert to Signals (`toSignal()`) at the consumption boundary for clean template consumption."*

---

## 5. Real-World Reactive Patterns

### Q9: Write a production-grade Autocomplete Search pattern handling debounce, cancellation, and error recovery.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Autocomplete]` `[Patterns]`

**Answer:**

```typescript
@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <input (input)="onSearch($event)" placeholder="Search products..." />
    @for (product of products(); track product.id) {
      <div>{{ product.name }}</div>
    }
  `
})
export class SearchComponent {
  private api = inject(ProductApiService);
  private searchSubject$ = new Subject<string>();

  // RxJS stream converted to Signal for template consumption
  products = toSignal(
    this.searchSubject$.pipe(
      debounceTime(300),              // Wait 300ms pause in typing
      distinctUntilChanged(),         // Avoid duplicate searches
      filter(term => term.length >= 2),// Min length check
      switchMap(term =>
        this.api.search(term).pipe(
          catchError(err => {
            console.error('Search failed:', err);
            return of([]);            // Keep outer stream alive!
          })
        )
      )
    ),
    { initialValue: [] }
  );

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchSubject$.next(input.value);
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if `catchError` is placed on the outer stream instead of inside the `switchMap`?"  
*Senior Answer:* If placed on the outer stream, when a search request fails, the outer `searchSubject$` completes and permanently dies. Subsequent keystrokes will never trigger searches again. Always isolate `catchError` inside the inner observable!

---

## 6. 🎯 Output Challenges & Trap Questions

### Q10: 🧩 Output Prediction: `combineLatest` vs `forkJoin`
```typescript
const a$ = of(1, 2);
const b$ = of(10, 20);

// Scenario 1: forkJoin
forkJoin([a$, b$]).subscribe(val => console.log('forkJoin:', val));

// Scenario 2: combineLatest
combineLatest([a$, b$]).subscribe(val => console.log('combineLatest:', val));
```

**Answer:**
```text
forkJoin: [2, 20]
combineLatest: [2, 10]
combineLatest: [2, 20]
```
**Why:**
- `forkJoin` waits for **all** streams to complete, and emits only the **last** emitted value from each stream as a single tuple.
- `combineLatest` waits until every stream has emitted at least once, then emits a new tuple **every time** any stream emits a value.
