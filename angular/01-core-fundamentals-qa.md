# 01 — Angular Core Fundamentals & Standalone Components

> Architecture, Framework Philosophy, Standalone Components, Bootstrapping, Component Lifecycle Hooks, Built-in Control Flow (`@if`, `@for`, `@switch`), and Template Syntax.

---

## 📑 Table of Contents
1. [Framework Philosophy & Architecture](#1-framework-philosophy--architecture)
2. [Standalone Components Revolution](#2-standalone-components-revolution)
3. [Component Lifecycle & Modern Hooks](#3-component-lifecycle--modern-hooks)
4. [Built-in Control Flow & Templates](#4-built-in-control-flow--templates)
5. [View Encapsulation & DOM Projection](#5-view-encapsulation--dom-projection)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Framework Philosophy & Architecture

### Q1: What is Angular's architectural philosophy, and how does it fundamentally differ from React and Vue?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Architecture]` `[Core]`

**Answer:**
Angular is a full-featured, batteries-included **application platform and framework**, whereas React is a minimalist UI rendering library, and Vue is a progressive framework.

Key architectural pillars:
- **Opinionated Structure:** Angular prescribes a standardized modular design (components, services, pipes, directives, guards, interceptors).
- **TypeScript First:** Built with and optimized for strict TypeScript with compile-time template verification.
- **Dependency Injection (DI):** Angular features a built-in, hierarchical dependency injection container baked into the framework runtime.
- **Ahead-of-Time (AOT) Compilation:** Angular compiles HTML templates and TypeScript code into highly optimized JavaScript during build time via the Angular Ivy compiler (`ngtsc`), validating bindings, property types, and dependency graphs before runtime.

```text
React:   [ React Core ] + (Your Choice of Router + Store + Query + Lint + Build)
Angular: [ Angular Platform ] ─── Built-in:
         ├── Compiler (Ivy/ngtsc)
         ├── Hierarchical Dependency Injection
         ├── Reactive Forms & Validation
         ├── Modern Router & Guards
         ├── HTTP Client & Interceptors
         └── Signals & Change Detection Engine
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the runtime performance cost of an opinionated framework vs a minimal library?"  
*Senior Answer:* While Angular bundles historical runtime overhead (like `zone.js`, though now optional in zoneless Angular 18+), AOT compilation eliminates runtime template parsing overhead completely. Templates compile directly into static JavaScript instructions (Ivy bytecode), allowing aggressive dead-code elimination (tree-shaking) at build time.

---

### Q2: What is Ahead-of-Time (AOT) compilation vs Just-in-Time (JIT) compilation in Angular?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Compiler]` `[Ivy]`

**Answer:**
- **JIT (Just-in-Time):** The browser downloads the Angular compiler (`@angular/compiler`) along with application code. The browser compiles TypeScript/templates into machine instructions at runtime in the client's browser. Historically used only in legacy local development.
- **AOT (Ahead-of-Time):** The Angular compiler compiles HTML templates and TypeScript metadata into executable JavaScript instructions during the build process on the server/CI before deployment.

| Feature | JIT (Legacy Dev) | AOT (Production & Modern Default) |
|---|---|---|
| **Compilation Phase** | In client browser | In build pipeline (`ng build`) |
| **Bundle Size** | Larger (includes `@angular/compiler` ~1MB) | Much smaller (compiler omitted) |
| **Error Discovery** | Runtime upon rendering template | Build time (type-checking errors) |
| **Security** | Evaluates template strings (higher XSS risk) | Pre-compiled static JS instructions |
| **Startup Speed** | Slower (client parsing delay) | Instant bootstrap |

Modern Angular (v12+) has fully deprecated and removed View Engine JIT builds from standard CLI workflows; all builds run Ivy AOT by default.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why do private component properties accessed in an Angular HTML template fail AOT compilation, but work under standard JavaScript runtime?"  
*Senior Answer:* Because during AOT compilation, Angular generates a companion TypeScript definition/render file for each component's template. Because this generated code is external to the component class, accessing `private` fields causes a TypeScript access violation (`Property 'x' is private and only accessible within class 'Y'`). Template-accessed properties must be `public` or `protected`.

---

## 2. Standalone Components Revolution

### Q3: What problem did Standalone Components solve, and why was `NgModule` eliminated?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture  
**Tags:** `[Standalone]` `[Modern]`

**Answer:**
Prior to Angular 14/15, every component, directive, and pipe had to be declared within an `@NgModule`. This created:
1. **Indirection & Boilerplate:** Developers had to maintain separate `declarations`, `imports`, and `exports` arrays across `SharedModule`, `CoreModule`, and feature modules.
2. **Mental Overhead & Traceability:** Finding where a component dependency was imported required navigating complex module import graphs.
3. **Suboptimal Tree-Shaking:** Large shared modules frequently bundled unused components and pipes into lazy bundles.

**Standalone Components** (`standalone: true`, default in Angular 19+) make components self-contained units of composition. Components directly import the dependencies (other components, pipes, directives) they consume.

```typescript
// Modern Standalone Component (Angular 14+)
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCardComponent } from './user-card.component';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true, // Default in modern Angular 19+
  imports: [CommonModule, UserCardComponent, CurrencyPipe],
  template: `
    <h2>Dashboard</h2>
    <app-user-card [user]="activeUser" />
    <p>Balance: {{ balance | currency }}</p>
  `
})
export class DashboardComponent {
  activeUser = { name: 'Alice' };
  balance = 1450.50;
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can standalone components be imported inside legacy `NgModule`s, and vice versa?"  
*Senior Answer:* Yes.
1. Standalone inside `NgModule`: Place the standalone component in the `imports: [...]` array of the `NgModule` (NOT in `declarations`!).
2. `NgModule` inside Standalone: Import the `NgModule` directly inside the standalone component's `imports: [...]` array.

---

### Q4: How does application bootstrapping work in modern standalone Angular vs legacy `AppModule`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Standalone]` `[Bootstrap]`

**Answer:**
Legacy Angular bootstrapped via `platformBrowserDynamic().bootstrapModule(AppModule)`.  
Modern Angular uses `bootstrapApplication` from `@angular/platform-browser` with an `ApplicationConfig` object containing global providers.

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

```typescript
// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you provide an `APP_INITIALIZER` or third-party module providers (e.g. legacy NgRx or translate modules) without an `NgModule`?"  
*Senior Answer:* Use `importProvidersFrom(LegacyModule.forRoot())` in `appConfig.providers`, or use modern function-based providers like `provideAppInitializer(() => inject(ConfigService).load())`.

---

## 3. Component Lifecycle & Modern Hooks

### Q5: List the Angular component lifecycle execution order from birth to destruction.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Lifecycle]` `[Core]`

**Answer:**
When Angular instantiates and renders a component, hooks execute in the following exact sequence:

```text
[constructor]                Class instantiation (DI happens here)
      │
[ngOnChanges]                Called whenever an @Input() reference changes
      │
[ngOnInit]                   Component inputs initialized; initial data fetch
      │
[ngDoCheck]                  Custom change detection run (every CD cycle)
      │
  ├── [ngAfterContentInit]     Projected content (<ng-content>) initialized (once)
  └── [ngAfterContentChecked]  Projected content checked (every CD cycle)
      │
  ├── [ngAfterViewInit]        Component template view & child views initialized (once)
  └── [ngAfterViewChecked]     Component template view checked (every CD cycle)
      │
[ngOnDestroy]                Cleanup (unsubscriptions, event listeners, timers)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why should you never perform HTTP calls or heavy logic in the `constructor`?"  
*Senior Answer:* The constructor is for dependency injection wiring only. During `constructor` execution:
1. Inputs (`@Input()` or `input()`) have not yet resolved.
2. The component's DOM has not been initialized.
3. Placing side effects in constructors impairs unit testability and SSR execution.

---

### Q6: What are `afterRender` and `afterNextRender`, and how do they replace `ngAfterViewInit` for DOM operations?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Modern]` `[Lifecycle]` `[SSR]`

**Answer:**
Introduced in Angular 16+, `afterRender` and `afterNextRender` are lifecycle utility functions designed for DOM manipulation, sizing measurements, and third-party DOM library initialization (e.g., Chart.js, D3, Leaflet).

Unlike `ngAfterViewInit`:
1. They **never execute on the server** during Server-Side Rendering (SSR), eliminating `if (isPlatformBrowser(platformId))` boilerplate.
2. They run *after* Angular has completed DOM writing and change detection.

```typescript
import { Component, ElementRef, viewChild, afterNextRender } from '@angular/core';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<canvas #chartCanvas></canvas>`
})
export class ChartComponent {
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  constructor() {
    // Executes once after the NEXT browser render cycle
    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      if (canvas) {
        this.initializeThirdPartyChart(canvas);
      }
    });
  }

  private initializeThirdPartyChart(canvas: HTMLCanvasElement) {
    // Safe DOM access - guaranteed client-side
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the difference between `afterRender` and `afterNextRender`?"  
*Senior Answer:* `afterNextRender` runs **once** after the immediately following render cycle (ideal for one-time initialization). `afterRender` runs after **every single change detection cycle** that modifies the DOM (ideal for continuous canvas synchronization or resize calculations).

---

### Q7: What causes the infamous `ExpressionChangedAfterItHasBeenCheckedError` (NG0100)? How do you prevent and fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[ChangeDetection]` `[Gotchas]`

**Answer:**
In development mode, Angular runs change detection **twice** on every cycle:
1. First pass: Updates bindings and paints DOM.
2. Verification pass: Re-evaluates every template binding to verify that the value did not mutate during the first pass.

If a binding expression changed between pass 1 and pass 2, Angular throws **`NG0100: ExpressionChangedAfterItHasBeenCheckedError`**. This enforces unidirectional data flow.

#### The Bug Pattern:
```typescript
@Component({
  selector: 'app-child',
  template: `<span>Child ready</span>`
})
export class ChildComponent implements AfterViewInit {
  @Output() ready = new EventEmitter<boolean>();

  ngAfterViewInit() {
    // ❌ Mutating parent state after parent view was already checked!
    this.ready.emit(true);
  }
}
```

#### How to Fix:
1. **Change the design:** Push data flow down (Inputs/Signals) rather than updating parent bindings in child view lifecycle hooks.
2. **Move to `ngOnInit`:** If initialization doesn't require child DOM, execute in `ngOnInit`.
3. **Use asynchronous scheduling (Microtask queue):**
```typescript
ngAfterViewInit() {
  queueMicrotask(() => {
    this.parentService.setStatus(true);
  });
}
```
4. **Use Signals:** Signals decouple evaluation from Zone.js verification passes and schedule fine-grained notifications cleanly.

---

## 4. Built-in Control Flow & Templates

### Q8: Compare Angular's modern built-in control flow (`@if`, `@for`, `@switch`) with legacy structural directives (`*ngIf`, `*ngFor`).
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ControlFlow]` `[Modern]`

**Answer:**
Starting in Angular 17, Angular introduced native template control flow syntax directly into the template compiler:

```html
<!-- Modern Built-in Control Flow -->
@if (user.isLoggedIn) {
  <app-profile [user]="user" />
} @else if (user.isPending) {
  <p>Verification pending...</p>
} @else {
  <app-login />
}

@for (item of items; track item.id; let idx = $index; let total = $count) {
  <div class="row">#{{ idx + 1 }} of {{ total }}: {{ item.title }}</div>
} @empty {
  <p class="empty-msg">No items found.</p>
}

@switch (order.status) {
  @case ('shipped') { <span>Order Shipped</span> }
  @case ('delivered') { <span>Delivered</span> }
  @default { <span>Processing</span> }
}
```

### Key Advantages:
1. **Zero Imports Needed:** Native syntax requires no `CommonModule` or `NgIf`/`NgFor` imports.
2. **Superior Type Narrowing:** `@if` automatically narrows nullable TypeScript types cleanly in template branches.
3. **Built-in `@empty` Block:** Replaces cumbersome `*ngIf="items.length === 0"` fallbacks.
4. **Faster Compilation:** Ivy compiler optimizes block tokens directly without creating structural directive host view instances (`TemplateRef` / `ViewContainerRef`).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why does `@for` make `track` mandatory, whereas `*ngFor` allowed omitting `trackBy`?"  
*Senior Answer:* Because forgetting `trackBy` in `*ngFor` was the #1 cause of DOM recreation, memory thrashing, and lost input focus in Angular applications. By making `track` mandatory in `@for`, the compiler guarantees that every loop preserves DOM nodes by identity.

---

### Q9: 🐛 Debug: Why is `track $index` dangerous in `@for` when items can be inserted or reordered?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[ControlFlow]` `[Gotchas]`

**Answer:**
Using `track $index` tells Angular: *"The DOM node at index `i` is bound permanently to position `i`, not to the underlying entity."*

#### The Trap:
```html
@for (item of todos; track $index) {
  <app-todo-item [todo]="item" />
}
```

If `todos = [A, B, C]` and you **prepend** item `Z` to become `[Z, A, B, C]`:
1. Angular compares by key:
   - Index 0: old `A` ➔ new `Z` (Angular keeps the existing DOM node at index 0 and simply passes new input `Z`).
   - Index 1: old `B` ➔ new `A`.
   - Index 2: old `C` ➔ new `B`.
   - Index 3: new DOM node created for `C`.
2. **The Disaster:** Any internal component state (unsubmitted form inputs, local toggles, CSS animations, canvas state) remains stuck on the DOM node at index 0. The user's typed input into `A` now appears inside item `Z`!

#### The Fix:
Always track by a unique identity field:
```html
@for (item of todos; track item.id) {
  <app-todo-item [todo]="item" />
}
```

---

## 5. View Encapsulation & DOM Projection

### Q10: Explain ViewEncapsulation modes in Angular (`Emulated`, `None`, `ShadowDom`).
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[CSS]` `[Encapsulation]`

**Answer:**

```typescript
@Component({
  selector: 'app-card',
  encapsulation: ViewEncapsulation.Emulated // Default
})
```

1. **`ViewEncapsulation.Emulated` (Default):**
   - Angular scopes styles by appending generated unique attributes to host and child elements (e.g. `_nghost-a-c14`, `_ngcontent-a-c14`).
   - CSS rules are rewritten at compile time: `.btn` becomes `.btn[_ngcontent-a-c14]`.
   - Styles inside the component do not leak out; global styles leak in.
2. **`ViewEncapsulation.None`:**
   - No attribute selectors generated.
   - Component styles are injected directly into `<head>` as global CSS rules. They can affect the entire application.
3. **`ViewEncapsulation.ShadowDom`:**
   - Angular creates a true native browser Shadow Root (`attachShadow({ mode: 'open' })`).
   - Strict CSS isolation enforced by the browser engine. Global styles do NOT penetrate the shadow root (except CSS variables / inheritable font styles).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is `::ng-deep` deprecated, and what is the modern alternative to styling child components under `Emulated`?"  
*Senior Answer:* `::ng-deep` disables style scoping for descendant selectors, often causing global CSS specificity collisions.  
Modern alternatives:
1. Define **CSS Custom Properties (CSS variables)** in the child component (e.g., `background: var(--card-bg, #fff)`) and override the variable in the parent.
2. Use the **Directive Composition API** to bind styling utility directives directly to the host.

---

### Q11: How does `<ng-content>` multi-slot projection work, and what is the difference between content and view children?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Projection]` `[Templates]`

**Answer:**
Multi-slot content projection allows a parent component to inject arbitrary HTML into named insertion slots using the `select` attribute.

```typescript
// modal.component.ts
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="modal">
      <header>
        <ng-content select="[modal-header]" />
      </header>
      <section>
        <!-- Default catch-all slot -->
        <ng-content />
      </section>
      <footer>
        <ng-content select="[modal-footer]">
          <!-- Fallback content (Angular 18+) -->
          <button>Default Close</button>
        </ng-content>
      </footer>
    </div>
  `
})
export class ModalComponent {}
```

#### Content Child vs View Child:
- **`ContentChild` / `contentChild()`:** Queries elements projected into the component from the parent via `<ng-content>`. Evaluated during `ngAfterContentInit`.
- **`ViewChild` / `viewChild()`:** Queries elements declared directly inside the component's own template. Evaluated during `ngAfterViewInit`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If projected content inside `<ng-content>` is wrapped with an `@if (false)` inside the child, is the projected component instantiated?"  
*Senior Answer:* **YES!** Projected content is instantiated in the parent's context *before* projection. Even if the child hides `<ng-content>`, the projected component's constructor and `ngOnInit` will still execute in the parent. To lazily render projected components, use an `<ng-template>` projection pattern instead.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q12: 🧩 Output Prediction: What will the console output and in what order?
```typescript
@Component({
  selector: 'app-test',
  standalone: true,
  template: `<div>Test</div>`
})
export class TestComponent implements OnInit, AfterViewInit {
  constructor() { console.log('1: Constructor'); }
  ngOnInit() { console.log('2: OnInit'); }
  ngAfterViewInit() { console.log('3: AfterViewInit'); }
}
```
**Answer:**
```text
1: Constructor
2: OnInit
3: AfterViewInit
```
*Gotcha:* If child components exist inside `app-test`'s template, the child's `ngOnInit` and `ngAfterViewInit` will complete *before* the parent's `ngAfterViewInit` executes!

---

### Q13: What is `<ng-container>` vs `<ng-template>`?
**Answer:**
- **`<ng-container>`:** A logical wrapper element that does **not** render a DOM element. Used to apply directives (`@if`, `@for`, `ngTemplateOutlet`) without bloating the DOM with unnecessary `<div>` tags.
- **`<ng-template>`:** A template definition that is **never rendered directly**. It holds a chunk of HTML that can be rendered dynamically on demand via `*ngIf`, `*ngTemplateOutlet`, or `ViewContainerRef.createEmbeddedView()`.

---

### Q14: How does `ng-template` with `ngTemplateOutletContext` pass strongly-typed data?
**Answer:**
```html
<ng-container *ngTemplateOutlet="cardTmpl; context: { $implicit: user, role: 'admin' }"></ng-container>

<ng-template #cardTmpl let-item let-userRole="role">
  <div>User: {{ item.name }}, Role: {{ userRole }}</div>
</ng-template>
```
`$implicit` maps to whatever variable name is written in `let-item`. Named context properties map to `let-alias="prop"`.
