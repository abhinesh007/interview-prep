# 03 — Angular Change Detection & Zoneless Architecture

> Zone.js Mechanics, Default vs `OnPush` Strategy, `ChangeDetectorRef` APIs, `NgZone.runOutsideAngular()`, Zoneless Architecture (`provideZonelessChangeDetection`), and Change Detection Traps.

---

## 📑 Table of Contents
1. [Zone.js & Change Detection Internals](#1-zonejs--change-detection-internals)
2. [Default vs `OnPush` Strategy](#2-default-vs-onpush-strategy)
3. [`ChangeDetectorRef` Mastery](#3-changedetectorref-mastery)
4. [`NgZone` Performance Optimizations](#4-ngzone-performance-optimizations)
5. [Zoneless Architecture (Angular 18+)](#5-zoneless-architecture-angular-18)
6. [🎯 Output Challenges & Senior Traps](#6--output-challenges--senior-traps)

---

## 1. Zone.js & Change Detection Internals

### Q1: What is Zone.js, and how does it enable Angular's automatic Change Detection?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ZoneJS]` `[ChangeDetection]`

**Answer:**
**Zone.js** is an execution context library that patches (monkey-patches) standard asynchronous browser APIs at runtime so that Angular knows when an asynchronous operation has started and finished.

Zone.js wraps:
- **DOM Events:** `addEventListener` (click, keydown, change)
- **Timers:** `setTimeout`, `setInterval`, `requestAnimationFrame`
- **Network Requests:** `XMLHttpRequest`, `fetch`
- **Microtasks:** Native `Promise.then`, `queueMicrotask`

```text
[User clicks button] ──► Patched addEventListener runs
                              │
                      [Component event handler completes]
                              │
                      [Zone.js onMicrotaskEmpty hook triggers]
                              │
                      [Angular ApplicationRef.tick() invoked]
                              │
                      [Top-down Change Detection checks component tree]
                              │
                      [DOM updated with new values]
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does Zone.js know *which specific component* changed its data?"  
*Senior Answer:* **NO!** Zone.js has zero awareness of Angular's component hierarchy or specific data changes. It only knows that *an* async task finished somewhere in the browser. It notifies Angular via `onMicrotaskEmpty`, which forces Angular to traverse the component tree from root to leaf to find what changed.

---

### Q2: What is Event Coalescing, and why should you enable it in Zone.js applications?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Performance]` `[ZoneJS]`

**Answer:**
By default, if multiple asynchronous events fire in rapid succession (e.g. rapid keypresses or nested click events), Zone.js may schedule a separate change detection cycle for each individual event.

**Event Coalescing** batches multiple microtasks and DOM events within the same macrotask or frame into a single change detection run.

```typescript
// app.config.ts (Angular 14+)
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true,      // Batches multiple events in same turn
      runCoalescing: true         // Batches multiple NgZone.run invocations
    })
  ]
};
```
This dramatically boosts frame rate and responsiveness during complex user interactions (e.g. typing into inputs or interacting with virtualized grids).

---

## 2. Default vs `OnPush` Strategy

### Q3: Contrast `ChangeDetectionStrategy.Default` with `ChangeDetectionStrategy.OnPush`.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[OnPush]` `[Performance]`

**Answer:**

```typescript
@Component({
  selector: 'app-user-row',
  changeDetection: ChangeDetectionStrategy.OnPush, // Opt-in
  template: `...`
})
```

| Strategy | When Component Is Checked | Mental Model |
|---|---|---|
| **Default** | On **every** async event anywhere in the entire app, regardless of whether this component was involved. | Top-down brute-force check |
| **OnPush** | Skipped **unless** explicitly marked as dirty. | Skip unless inputs change or internal events fire |

#### An `OnPush` component is marked dirty ONLY when:
1. One of its `@Input()` properties changes by **referential equality** (`prevValue !== nextValue`).
2. A DOM event originates from the component's **own template** (e.g. `(click)="onSelect()"`).
3. An `async` pipe in the component template emits a new value.
4. A **Signal** read inside the template changes.
5. `ChangeDetectorRef.markForCheck()` is explicitly called.

---

### Q4: 🐛 Bug: Child component with `OnPush` does not update when parent mutates an object property. Why?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix  
**Tags:** `[OnPush]` `[Immutability]`

**Answer:**
#### The Buggy Code:
```typescript
// parent.component.ts
@Component({
  template: `
    <app-user-badge [user]="currentUser" />
    <button (click)="rename()">Rename</button>
  `
})
export class ParentComponent {
  currentUser = { id: 1, name: 'Alice' };

  rename() {
    // ❌ In-place mutation! Same object memory reference!
    this.currentUser.name = 'Bob';
  }
}
```

```typescript
// user-badge.component.ts
@Component({
  selector: 'app-user-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span>{{ user.name }}</span>`
})
export class UserBadgeComponent {
  @Input() user!: { id: number; name: string };
}
```

#### Why it fails:
`OnPush` compares input changes using **shallow reference equality** (`===`). Because `this.currentUser` references the same memory address, Angular determines that the input did not change and **skips checking `UserBadgeComponent`**.

#### The Fix: Treat data immutably:
```typescript
rename() {
  // ✅ Create a new object reference!
  this.currentUser = { ...this.currentUser, name: 'Bob' };
}
```

---

## 3. `ChangeDetectorRef` Mastery

### Q5: Compare `markForCheck()`, `detectChanges()`, `detach()`, and `reattach()` in `ChangeDetectorRef`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ChangeDetectorRef]` `[Core]`

**Answer:**

```text
markForCheck():   Marks path from this component up to ROOT as dirty.
                  Evaluated in the NEXT regular change detection pass.

detectChanges():  IMMEDIATELY runs change detection from this component DOWN
                  through its children right now (synchronously).

detach():         Completely disconnects this component view from the CD tree.
                  Angular will NEVER automatically check it.

reattach():       Re-connects a detached view back into the CD tree.
```

```typescript
@Component({...})
export class StockTickerComponent implements OnInit, OnDestroy {
  private cd = inject(ChangeDetectorRef);
  private subscription!: Subscription;

  ngOnInit() {
    this.cd.detach(); // Disconnect for high-frequency stream

    this.subscription = this.stockFeed$.subscribe(data => {
      this.latestPrice = data.price;
      // Manually trigger CD only once per second or when threshold met
      if (data.isCriticalUpdate) {
        this.cd.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why should you generally avoid calling `cd.detectChanges()` inside component lifecycle hooks?"  
*Senior Answer:* Because `detectChanges()` executes change detection synchronously on demand. If child bindings mutate properties in parent components during that synchronous run, it frequently causes `ExpressionChangedAfterItHasBeenCheckedError`. `markForCheck()` is much safer because it schedules evaluation on the next coordinated pass.

---

## 4. `NgZone` Performance Optimizations

### Q6: When and why should you use `NgZone.runOutsideAngular()`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[NgZone]` `[Performance]`

**Answer:**
When attaching listeners to high-frequency events (e.g. `window.onscroll`, `mousemove`, `touchmove`, WebGL render loops, or high-frequency WebSocket updates), Zone.js intercepts every single event tick, triggering hundreds of change detection cycles per second and causing severe UI stutter.

`NgZone.runOutsideAngular()` runs the provided callback in the outer parent zone, bypassing Angular's change detection triggers completely.

```typescript
@Component({
  selector: 'app-scroll-tracker',
  standalone: true,
  template: `<div>Scrolled: {{ scrollY }}px</div>`
})
export class ScrollTrackerComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  private cd = inject(ChangeDetectorRef);
  scrollY = 0;
  private unlisten!: () => void;

  ngOnInit() {
    // Run outside Angular to prevent CD firing 60+ times per second on scroll
    this.ngZone.runOutsideAngular(() => {
      const handler = () => {
        const top = window.scrollY;

        // Only bring back into Angular when a significant threshold is crossed
        if (Math.abs(top - this.scrollY) > 100) {
          this.ngZone.run(() => {
            this.scrollY = top;
            this.cd.markForCheck();
          });
        }
      };

      window.addEventListener('scroll', handler, { passive: true });
      this.unlisten = () => window.removeEventListener('scroll', handler);
    });
  }

  ngOnDestroy() {
    this.unlisten?.();
  }
}
```

---

## 5. Zoneless Architecture (Angular 18+)

### Q7: What is Zoneless Angular, and how do you enable it?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[Zoneless]` `[Modern]`

**Answer:**
**Zoneless Angular** removes `zone.js` completely from the runtime. Instead of relying on global monkey-patching of browser APIs, Angular switches to an **explicit, notification-based scheduling model**.

#### How to enable (Angular 18+):
1. In `app.config.ts`, replace `provideZoneChangeDetection` with `provideZonelessChangeDetection()`:
```typescript
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};
```
2. In `angular.json`, remove `zone.js` from the `polyfills` array:
```json
"polyfills": [
  // Removed "zone.js"
]
```

### Benefits:
- **Smaller bundle size:** Eliminates ~30KB gzipped of Zone.js.
- **Faster startup & execution:** No monkey-patching overhead across hundreds of browser APIs.
- **Cleaner Stack Traces:** Errors show real application call stacks instead of deep `ZoneAwarePromise` and `Task.invokeTask` wrappers.
- **Ecosystem Interop:** Seamless integration with `async/await`, Web Workers, and Web Components.

---

### Q8: In a Zoneless application, what actually notifies Angular to schedule a render?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Zoneless]` `[Architecture]`

**Answer:**
Without Zone.js listening to the browser, Angular relies on explicit notification channels via the `ChangeDetectionScheduler`:

1. **Signals:** Any Signal read inside a template or `computed()` notifies the consumer graph when updated via `.set()` or `.update()`.
2. **Template Event Handlers:** Direct bindings like `(click)="handleClick()"` automatically schedule a render when invoked.
3. **Async Pipe (`| async`):** The `AsyncPipe` calls `ChangeDetectorRef.markForCheck()` internally upon each observable emission.
4. **Manual Calls:** Explicit calls to `ChangeDetectorRef.markForCheck()`.
5. **Component Creation / Destruction:** Routing transitions and dynamic views.

```text
[Signal .set()] OR [Template (click)] OR [Async Pipe emission]
                    │
            Notifies Scheduler
                    │
            [ChangeDetectionScheduler schedules microtask]
                    │
            [Targeted Views Checked & Rendered]
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What will break if you enable Zoneless on a legacy Angular app without auditing?"  
*Senior Answer:*
1. **Third-party scripts:** Libraries (like Google Maps, Stripe, Chart.js) that update component properties inside asynchronous callbacks without updating a Signal or calling `markForCheck()` will NOT update the UI.
2. **Plain class fields with `setTimeout`:**
   ```typescript
   // In Zoneless mode, this WILL NOT update the UI:
   setTimeout(() => { this.title = 'Updated'; }, 1000);
   ```
   *Fix:* Convert `title` to a Signal (`title = signal('Initial')`) or call `this.cd.markForCheck()`.

---

## 6. 🎯 Output Challenges & Senior Traps

### Q9: 🧩 Output Prediction: What happens in Zoneless mode?
```typescript
@Component({
  selector: 'app-counter',
  standalone: true,
  template: `<p>Count: {{ count }}</p>`
})
export class CounterComponent implements OnInit {
  count = 0;

  ngOnInit() {
    setInterval(() => {
      this.count++;
      console.log('Count is:', this.count);
    }, 1000);
  }
}
```
**Question:** In Zoneless mode, what is printed to the console, and what is rendered in the HTML?  
**Answer:**
- **Console:** Prints `Count is: 1`, `Count is: 2`, `Count is: 3`, etc. every second.
- **HTML DOM:** Remains permanently stuck at `Count: 0`!  
**Why:** In Zoneless mode, plain JavaScript property mutations inside `setInterval` do not notify Angular's scheduler. To fix this, change `count` to a Signal:
```typescript
count = signal(0);
ngOnInit() {
  setInterval(() => this.count.update(c => c + 1), 1000); // UI updates instantly!
}
```

---

### Q10: Why does Angular run Change Detection twice in development mode, and how does it detect errors?
**Answer:**
In development mode, `ApplicationRef.tick()` runs a second pass called `checkNoChanges()`.
It re-evaluates all template expressions and compares them to the values captured at the end of the first pass.
If `oldValue !== newValue`, it throws:
`ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked.`
This pass is stripped in production builds (`ng build --configuration production`) for peak performance.
