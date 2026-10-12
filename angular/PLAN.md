# 📋 Angular Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise Angular interview Question & Answer guide in `/Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular`.
> Aligned with modern Angular standards (Angular 14–19+ through 20–22), legacy-to-modern transitions (Angular 10/11 to 18–22), reactive paradigms (RxJS & Signals), state management (NgRx Store, ComponentStore, SignalStore), Monorepos (Nx), Zoneless architecture, and performance optimization.

---

## 🎯 Design Principles & Structure

Every question in the guide adheres to the battle-tested, structured interview format:

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Tags:** `[Core | Modern | Gotcha | Performance | Architecture]`

**Answer:**
[Concise, authoritative explanation accompanied by idiomatic TypeScript/HTML code blocks]

**⚠️ Gotcha / Interviewer Follow-up:**
[Real-world edge cases, runtime bugs, trap questions, performance pitfalls, and how an interviewer probes deeper]
```

### Question Archetypes Included:
- 📖 **Conceptual & Deep-Dive:** Architecture, memory lifecycles, change detection internals.
- 💻 **Practical Coding & Refactoring:** Converting RxJS to Signals, custom directives, interceptors, signal stores.
- 🧩 **Output & Behavior Prediction:** Execution ordering, zone ticks, effect scheduling, subscription leaks.
- 🐛 **Debug & Bug Hunting:** Finding race conditions, memory leaks, zoneless de-synchronizations, tracking bugs.
- 🏗️ **System Design & Architecture:** Monorepo boundary enforcement, state topology, SSR/hydration pipelines.

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|---|
| `00` | [`00-table-of-contents.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/00-table-of-contents.md) | Navigation, Indexing, Study Paths & Difficulty Matrix | Index |
| `01` | [`01-core-fundamentals-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/01-core-fundamentals-qa.md) | Architecture, Modules vs Standalone, Components, Lifecycle, Templates | 18–22 |
| `02` | [`02-dependency-injection-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/02-dependency-injection-qa.md) | Hierarchical DI, Resolution Modifiers, Injection Context, `inject()` | 15–18 |
| `03` | [`03-change-detection-and-zoneless-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/03-change-detection-and-zoneless-qa.md) | Zone.js, Default vs OnPush, CD Tree, Zoneless Scheduler, CD Traps | 16–20 |
| `04` | [`04-signals-and-reactivity-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/04-signals-and-reactivity-qa.md) | Modern Signals (`signal`, `computed`, `effect`, `input`, `output`, `model`) | 18–22 |
| `05` | [`05-rxjs-and-reactive-patterns-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/05-rxjs-and-reactive-patterns-qa.md) | Observables, Higher-Order Operators, Memory Leaks, RxJS ↔ Signals Interop | 20–25 |
| `06` | [`06-routing-and-navigation-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/06-routing-and-navigation-qa.md) | Functional Guards, Resolvers, Lazy Loading, Component Input Binding | 15–18 |
| `07` | [`07-forms-reactive-and-template-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/07-forms-reactive-and-template-qa.md) | Strictly Typed Forms, Custom ControlValueAccessor, Async Validation | 15–18 |
| `08` | [`08-directives-pipes-and-dom-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/08-directives-pipes-and-dom-qa.md) | Directive Composition API, HostDirectives, Structural Directives, Pure Pipes | 14–16 |
| `09` | [`09-http-interceptors-and-networking-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/09-http-interceptors-and-networking-qa.md) | Functional Interceptors, HttpContext, Retries, Cancellation, Caching | 14–16 |
| `10` | [`10-state-management-ngrx-and-stores-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/10-state-management-ngrx-and-stores-qa.md) | NgRx Global Store, ComponentStore, NgRx SignalStore, Custom Features | 18–22 |
| `11` | [`11-nx-monorepo-and-enterprise-architecture-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/11-nx-monorepo-and-enterprise-architecture-qa.md) | Nx Workspace, Module Boundaries, Affected Graph, App/Lib Taxonomy | 15–18 |
| `12` | [`12-migration-older-to-modern-angular-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/12-migration-older-to-modern-angular-qa.md) | Migrating Angular 10/11 to 18–22: Incremental Ladder, Ivy/ngcc Cliff, MDC Overhaul, Typed Forms, Standalone & Control Flow Schematics, Zoneless Transition, Gotchas | 20–25 |
| `13` | [`13-performance-ssr-and-hydration-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/13-performance-ssr-and-hydration-qa.md) | Non-destructive Hydration, `@defer` block, Bundle Budget, Web Workers | 15–18 |
| `14` | [`14-testing-unit-and-integration-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/14-testing-unit-and-integration-qa.md) | Karma/Jasmine to Jest/Vitest, Component Harnesses, Signal Testing, Mocking | 14–16 |
| `15` | [`15-system-design-and-senior-scenarios-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/15-system-design-and-senior-scenarios-qa.md) | Enterprise Design Scenarios, Microfrontends (Module Federation), Security | 12–15 |

---

## 📑 Detailed Section Specifications

### 📄 `01-core-fundamentals-qa.md` — Core Architecture & Standalone
1. **Framework Philosophy & Architecture:**
   - Angular vs React/Vue: Opinionated framework benefits, batteries-included philosophy.
   - Compilation model: Just-in-Time (JIT) vs Ahead-of-Time (AOT).
2. **Standalone Components Revolution:**
   - Standalone components vs `NgModule`: Why were `NgModules` eliminated?
   - How `bootstrapApplication(AppComponent, appConfig)` works under the hood.
   - 🐛 Bug: Mixing standalone and NgModule components in legacy projects.
3. **Component Lifecycle & Hooks:**
   - Full lifecycle execution order: `constructor` → `ngOnChanges` → `ngOnInit` → `ngDoCheck` → `ngAfterContentInit` → `ngAfterContentChecked` → `ngAfterViewInit` → `ngAfterViewChecked` → `ngOnDestroy`.
   - Modern lifecycle alternatives: `afterNextRender` and `afterRender` vs `ngAfterViewInit`.
   - ⚠️ Gotcha: Why DOM operations fail inside `ngOnInit` and must be placed in `afterNextRender`.
4. **Built-in Control Flow (`@if`, `@for`, `@switch`):**
   - Why was structural directive syntax (`*ngIf`, `*ngFor`) replaced?
   - The `@for` `track` mandatory expression: Why `track $index` causes catastrophic state misalignment bugs in editable lists.
   - 🧩 Output: `@empty` block behavior with null vs empty array.

---

### 📄 `02-dependency-injection-qa.md` — Hierarchical DI & Modern `inject()`
1. **Hierarchical Injector Tree:**
   - Environment Injector (Root, Platform) vs Element Injector (Component, Directive).
   - What happens when a service is provided in `@Component({ providers: [...] })` vs `@Injectable({ providedIn: 'root' })`?
2. **Modern `inject()` Function:**
   - Constructor-based DI vs `inject()` function: Benefits, typing, and composability.
   - ⚠️ Gotcha: "NG0203: inject() must be called from an injection context" — causes and fixes (`runInInjectionContext`).
3. **Resolution Modifiers & Multi Providers:**
   - `@Self()`, `@SkipSelf()`, `@Optional()`, and `@Host()` resolution modifiers explained with diagrams.
   - Multi-providers (`multi: true`): Use cases (HTTP interceptors, APP_INITIALIZER).
   - Value, Class, Existing, and Factory providers (`useValue`, `useClass`, `useExisting`, `useFactory`).

---

### 📄 `03-change-detection-and-zoneless-qa.md` — Change Detection & Zoneless
1. **Zone.js Mechanics:**
   - How does Zone.js patch browser APIs (`addEventListener`, `setTimeout`, `fetch`, Promises)?
   - `NgZone.runOutsideAngular()`: Performance scenarios for high-frequency events (scroll, canvas, mousemove).
2. **Default vs `OnPush` Strategy:**
   - How does `ChangeDetectionStrategy.OnPush` evaluate dirtiness? (Input reference comparison, template events, async pipe).
   - 🐛 Debug: Mutating an object property in parent does not re-render child component in `OnPush`.
   - `ChangeDetectorRef`: `markForCheck()`, `detectChanges()`, `detach()`, and `reattach()`.
3. **Zoneless Angular (Angular 18+):**
   - `provideZonelessChangeDetection()`: How does Angular know when to render without Zone.js monkey-patching?
   - What triggers a UI update in zoneless mode? (Signals, Template events, Async pipe, markForCheck).
   - ⚠️ Gotcha: Why older third-party libraries (jQuery plugins, charts) fail silently in Zoneless mode.

---

### 📄 `04-signals-and-reactivity-qa.md` — Angular Signals Deep Dive
1. **Signal Primitives:**
   - Writable signals: `signal()`, `.set()`, `.update()`, `.asReadonly()`.
   - Computed signals: `computed()` — pure, lazy, and memoized dependency graph.
   - 🧩 Output: Evaluation timing when a signal changes multiple times before read (Glitch-free execution).
2. **`effect()` & Reactive Context:**
   - When to use `effect()` vs `computed()`.
   - ⚠️ Gotcha: Infinite loop risk and why mutating a signal inside `effect()` requires `allowSignalWrites: true` (and why that's usually a code smell).
   - Cleanup in effects: `onCleanup` callback.
3. **Signal Inputs, Outputs & Queries:**
   - `input()` and `input.required()` vs legacy `@Input()`.
   - `output()` and `outputFromObservable()` vs `@Output() EventEmitter`.
   - Two-way binding with `model()` signals.
   - `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()` signal queries.

---

### 📄 `05-rxjs-and-reactive-patterns-qa.md` — RxJS & Signals Interop
1. **Core RxJS Operators in Angular:**
   - Flattening operators battle: `switchMap` vs `mergeMap` vs `concatMap` vs `exhaustMap`.
   - Real-world autocomplete implementation: `debounceTime`, `distinctUntilChanged`, `switchMap`.
   - Preventing double form submits: `exhaustMap`.
2. **Memory Leaks & Unsubscription Strategies:**
   - Subscription leak gotchas: Which Observables complete automatically (`HttpClient`, `router.events`, `take(1)`) and which leak?
   - Modern cleanups: `takeUntilDestroyed()` operator vs `DestroyRef` vs `async` pipe.
3. **RxJS ↔ Signals Interoperability (`@angular/core/rxjs-interop`):**
   - `toSignal(observable$, options)`: Handling initial values, `requireSync`, and injection contexts.
   - `toObservable(signal)`: Conversion nuances and microtask batching delays.
   - When to use RxJS (async streams, cancellation, time manipulation) vs Signals (synchronous UI state).

---

### 📄 `06-routing-and-navigation-qa.md` — Modern Routing & Guards
1. **Modern Router Setup:**
   - `provideRouter()` with standalone configuration vs `RouterModule.forRoot()`.
   - Functional route guards (`CanActivateFn`, `CanMatchFn`, `CanDeactivateFn`) vs class-based guards.
   - Why `CanMatch` is preferred over `CanLoad` and `CanActivate` for feature-flagged or role-based route switching.
2. **Route Parameter Binding:**
   - `withComponentInputBinding()`: Binding route params, query params, and route data directly to component `input()`.
3. **Lazy Loading & Resolvers:**
   - Lazy loading standalone components: `loadComponent: () => import(...)`.
   - Lazy loading child routing configurations: `loadChildren: () => import(...)`.
   - Functional resolvers vs fetching data inside component lifecycle.

---

### 📄 `07-forms-reactive-and-template-qa.md` — Typed Forms & Custom Controls
1. **Strictly Typed Reactive Forms (Angular 14+):**
   - `FormGroup`, `FormControl`, `FormArray`, `FormRecord` with strict generic types.
   - Difference between `form.getRawValue()` (includes disabled fields) vs `form.value`.
2. **Custom Form Controls (`ControlValueAccessor`):**
   - Implementing `ControlValueAccessor`: `writeValue`, `registerOnChange`, `registerOnTouched`, `setDisabledState`.
   - ⚠️ Gotcha: Avoiding infinite change event feedback loops inside `registerOnChange`.
3. **Validation & Async Validation:**
   - Custom sync validators vs Async validators with debouncing.
   - Cross-field validation (e.g., password and confirmPassword).

---

### 📄 `08-directives-pipes-and-dom-qa.md` — Directives & Pipe Performance
1. **Directive Composition API (Angular 15+):**
   - `hostDirectives`: Applying behavior without inheritance. Exposing inputs/outputs.
2. **Custom Directives & Host Binding:**
   - Modern `host` property in decorator vs legacy `@HostBinding` and `@HostListener`.
   - Custom structural directives using `TemplateRef` and `ViewContainerRef`.
3. **Pipes & Performance:**
   - Pure vs Impure pipes: Why impure pipes destroy performance.
   - 🐛 Bug: Passing mutated arrays to a pure pipe fails to re-execute.

---

### 📄 `09-http-interceptors-and-networking-qa.md` — Http & Interceptors
1. **Modern Functional Interceptors:**
   - `provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))` vs class-based `HTTP_INTERCEPTORS`.
   - Chaining and execution order of interceptors (request phase vs response phase).
2. **Advanced HTTP Patterns:**
   - `HttpContext` and `HttpContextToken`: Bypassing auth or loader on specific requests.
   - Handling 401 token refresh queues: `switchMap` with `BehaviorSubject` refresh locking.
   - Automatic retries with exponential backoff and jitter (`retry({ delay: ... })`).

---

### 📄 `10-state-management-ngrx-and-stores-qa.md` — NgRx & SignalStore
1. **State Management Spectrum:**
   - When to use: Component Local State vs Services with Signals vs NgRx ComponentStore vs NgRx SignalStore vs NgRx Global Store.
2. **NgRx Global Store (Redux):**
   - Actions, Reducers, Selectors, Effects (`createActionGroup`, `createFeature`).
   - Memoized selectors with `createSelector`: Why selector projection functions fail memoization if references mutate.
3. **NgRx SignalStore (`@ngrx/signals`):**
   - Architectural anatomy: `signalStore()`, `withState()`, `withComputed()`, `withMethods()`.
   - `patchState()` mechanics and immutability.
   - Managing side effects with `rxMethod` from `@ngrx/signals/rxjs-interop`.
   - Custom reusable features (`signalStoreFeature`).

---

### 📄 `11-nx-monorepo-and-enterprise-architecture-qa.md` — Nx Monorepos
1. **Nx Monorepo Fundamentals:**
   - Why Monorepo? Polyrepo vs Monorepo trade-offs.
   - Apps vs Libs separation: Library taxonomy (`feature`, `ui`, `data-access`, `util`).
2. **Boundary Enforcement & Linting:**
   - Enforcing architectural boundaries with `@nx/enforce-module-boundaries` and tags (`scope:auth`, `type:ui`).
   - ⚠️ Gotcha: Circular dependencies and illegal deep imports (`../../libs/...`).
3. **Build Optimization & CI/CD:**
   - Nx Computation Caching (Local & Nx Cloud).
   - `nx affected`: How Git SHA diffs determine targeted test and build runs.

---

### 📄 `12-migration-older-to-modern-angular-qa.md` — Migrating Angular 10/11 to Modern (18–22)

1. **The Incremental Upgrade Ladder & Strategy (v10/11 ➔ Modern):**
   - Why jumping major versions directly is fatal (`ng update` schematics chain execution, peer dependency traps).
   - The version-by-version ladder: `10 ➔ 11 ➔ 12 ➔ 13 ➔ 14 ➔ 15 ➔ 16 ➔ 17 ➔ 18 ➔ 19 ➔ 20–22`.
   - Node.js, npm/yarn/pnpm, and TypeScript version compatibility matrix across the entire journey.
   - Pre-upgrade auditing: Identifying abandoned dependencies, checking `update.angular.io`, and managing peer dependency flags (`--legacy-peer-deps` vs lockfile integrity).

2. **Compiler & Packaging Evolution: The Ivy & `ngcc` Cliff (v11 ➔ v16):**
   - From View Engine opt-out (v10/11) to mandatory Ivy (v12/13) to complete removal of `ngcc` (Angular Compatibility Compiler) in v16.
   - The "v16 Cliff": What happens when a legacy library only published View Engine metadata? How to replace or wrap unmaintained libraries.
   - Elimination of `ComponentFactoryResolver` (v13): Migrating dynamic component creation to `ViewContainerRef.createComponent(Component)`.
   - Modern Angular Package Format (APF): Dropping UMD, CommonJS, and ES5 bundles in favor of pure ESM.

3. **Strict Mode, TypeScript & RxJS 7/8 Modernization (v10 ➔ v14+):**
   - Enabling `--strict` mode: Systematic strategies to resolve hundreds of `strictNullChecks` and `noImplicitAny` errors across enterprise codebases.
   - Strictly Typed Reactive Forms (v14): Migrating untyped forms to `FormGroup<{ name: FormControl<string> }>`. Difference between `UntypedFormGroup` (temporary fallback) and full type safety with `getRawValue()`.
   - RxJS 6 to 7 and 8 migration: Deprecation and removal of `.toPromise()` in favor of `firstValueFrom` and `lastValueFrom`. Handling operators rename (`pluck` removed, nested operators cleanup).

4. **Angular Material MDC Overhaul & Styling Breakages (v15):**
   - The Angular Material v15 migration to Material Design Components (MDC): Why this was one of the most painful breaking changes in Angular history.
   - Legacy modules temporary migration: `@angular/material/legacy-button` vs `@angular/material/button`.
   - The MDC Migration Schematic: `ng generate @angular/material:mdc-migration` and its limitations.
   - Dealing with broken custom CSS, deep selectors (`::ng-deep`), changed DOM element hierarchies, and visual regression test strategies.

5. **Standalone Components & Automated Migration Schematics (v14 ➔ v17+):**
   - The 3-phase automated standalone schematic (`ng generate @angular/core:standalone`):
     - Step 1: Convert components, directives, and pipes to `standalone: true`.
     - Step 2: Prune unnecessary `NgModule` declarations and exports.
     - Step 3: Switch application bootstrap from `AppModule` to `bootstrapApplication(AppComponent, appConfig)`.
   - Managing hybrid applications: Safely consuming standalone components inside legacy `NgModules` and vice versa.

6. **Built-in Control Flow & Deprecated API Migrations (v15 ➔ v18+):**
   - The Control Flow migration schematic: `ng generate @angular/core:control-flow` converting `*ngIf`, `*ngFor`, `*ngSwitch` to `@if`, `@for`, `@switch`.
   - ⚠️ Major Gotcha: The automated `@for` track conversion choosing `track $index` instead of entity IDs, leading to state misalignments in editable lists.
   - Routing modernize: Class-based guards (`CanActivate`, `CanDeactivate`) deprecated ➔ Functional guards (`CanActivateFn`, `CanMatchFn`).
   - Router configuration: `RouterModule.forRoot()` ➔ `provideRouter()` with `withComponentInputBinding()`.
   - HTTP modernize: `HttpClientModule` & class-based `HTTP_INTERCEPTORS` ➔ `provideHttpClient(withInterceptors([...]))`.
   - Build system upgrade: Migrating from Webpack builder (`@angular-devkit/build-angular:browser`) to the esbuild Application Builder (`@angular-devkit/build-angular:application`).

7. **Signals Modernization & Zoneless Transition (v18 ➔ v22):**
   - Automated signal migration: `ng generate @angular/core:signal-input` converting `@Input()` to `input()`.
   - Replacing legacy `@Output()` EventEmitter with `output()` and `@ViewChild()` with `viewChild()`.
   - Phased Zoneless migration: Turning on `provideZonelessChangeDetection()`.
   - Fixing silent UI freeze bugs: Identifying legacy `BehaviorSubject` + `markForCheck()` patterns that fail in Zoneless mode, and refactoring to Signals.
   - Next-Gen Angular paradigms (v19–v22): `linkedSignal()`, `resource()`, `rxResource()`, and zoneless as default architecture.

8. **Enterprise Migration War Stories, Gotchas & Rescue Patterns:**
   - Deep imports violation: Fixing illegal imports into internal Angular packages (`@angular/core/src/...`).
   - Tooling shift: Deprecating Protractor and Karma/Jasmine in favor of Playwright/Cypress and Jest/Vitest.
   - Monorepo upgrade orchestration: `nx migrate` vs `ng update` in large Nx workspaces.
   - Enterprise rollout playbook: Feature-flagging, canary deployments, branch slicing, and preventing regression during 6+ month multi-version migration projects.

---

### 📄 `13-performance-ssr-and-hydration-qa.md` — Performance & SSR
1. **Modern SSR & Non-destructive Hydration:**
   - Traditional SSR DOM flicker vs Non-destructive Hydration (Angular 16/17+).
   - Common hydration errors: DOM mismatch, accessing `window`/`document` without `isPlatformBrowser`.
2. **Deferrable Views (`@defer`):**
   - `@defer`, `@placeholder`, `@loading`, `@error` blocks.
   - Triggers: `on idle`, `on viewport`, `on interaction`, `on hover`, `when condition`.
   - Impact on Core Web Vitals (INP, LCP, TBT).
3. **Bundle Optimization:**
   - Tree shaking, build optimizer, modern ES target builds.
   - Detecting and fixing memory leaks in dev tools (detached DOM nodes).

---

### 📄 `14-testing-unit-and-integration-qa.md` — Modern Testing
1. **Test Runners Evolution:**
   - Karma + Jasmine deprecation and migration to Jest or Vitest.
2. **Component Testing:**
   - `TestBed` configuration for standalone components.
   - Angular Component Test Harnesses (`@angular/cdk/testing`): Why they make tests resilient to DOM refactoring.
3. **Testing Reactivity:**
   - Testing signals and `computed()` values synchronously.
   - Testing `effect()`: Handling `TestBed.flushEffects()`.
   - Mocking HTTP with `HttpTestingController`.

---

### 📄 `15-system-design-and-senior-scenarios-qa.md` — Senior Scenarios
1. **Enterprise Frontend Architecture:**
   - Designing an enterprise design system in an Angular monorepo.
   - Micro-frontend architectures using Native Federation / Module Federation.
2. **Security & Governance:**
   - Cross-Site Scripting (XSS) prevention: `DomSanitizer`, `SecurityContext`, `bypassSecurityTrust*` risks.
   - Content Security Policy (CSP) compatibility in Angular.
3. **Real-world Senior Scenarios:**
   - Diagnosing a memory leak in an app running for 8 hours on a trading terminal.
   - Architecting real-time WebSocket state distribution with high message frequency.

---

## 🚀 Execution Strategy

1. **Phase 1: Table of Contents & Plan Initialization**
   - Commit [`PLAN.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/PLAN.md) and [`00-table-of-contents.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/angular/00-table-of-contents.md).
2. **Phase 2: Core, Architecture & DI Files (`01`–`03`)**
   - Fundamentals, Dependency Injection, Change Detection & Zoneless.
3. **Phase 3: Modern Reactivity, RxJS & Navigation (`04`–`06`)**
   - Signals, RxJS Interop, Modern Routing & Functional Guards.
4. **Phase 4: Forms, Directives & HTTP (`07`–`09`)**
   - Typed Forms, Directives/Pipes, Functional Interceptors.
5. **Phase 5: State Management & Nx Monorepo (`10`–`11`)**
   - NgRx Store & SignalStore, Nx Module Boundaries.
6. **Phase 6: Migration & Production Performance (`12`–`13`)**
   - Legacy Migration (8–10 to modern), SSR, `@defer` Hydration.
7. **Phase 7: Testing & System Design Scenarios (`14`–`15`)**
   - Modern Testing (Vitest/Harnesses), Senior/Lead System Design.
