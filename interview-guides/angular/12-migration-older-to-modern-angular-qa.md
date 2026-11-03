# 12 — Angular Migration Roadmap: Angular 10/11 to Modern (18–22)

> The Complete Enterprise Migration Guide from Angular 10/11 through Modern Versions (18–22). Version-by-Version Ladder, Compiler & `ngcc` Cliff, Strict Mode & Typed Forms, Material MDC Overhaul, Automated Schematics, Zoneless Transition, and Enterprise Rollout Playbooks.

---

## 📑 Table of Contents
1. [The Incremental Upgrade Ladder & Strategy](#1-the-incremental-upgrade-ladder--strategy)
2. [Compiler & Packaging: The Ivy & `ngcc` Cliff (v11 ➔ v16)](#2-compiler--packaging-the-ivy--ngcc-cliff-v11--v16)
3. [Strict Mode, TypeScript & RxJS 7/8 Modernization](#3-strict-mode-typescript--rxjs-78-modernization)
4. [Angular Material MDC Overhaul & CSS Breakages (v15)](#4-angular-material-mdc-overhaul--css-breakages-v15)
5. [Standalone Components & Automated Migration Schematics](#5-standalone-components--automated-migration-schematics)
6. [Modern Control Flow, Router & HTTP Client APIs](#6-modern-control-flow-router--http-client-apis)
7. [Signals Modernization & Zoneless Architecture (v18 ➔ v22)](#7-signals-modernization--zoneless-architecture-v18--v22)
8. [🎯 Enterprise Migration Traps & War Stories](#8--enterprise-migration-traps--war-stories)

---

## 1. The Incremental Upgrade Ladder & Strategy

### Q1: Why is jumping major versions directly (e.g. Angular 10 directly to Angular 18+) fatal? What is the correct step-by-step ladder?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[Migration]` `[Strategy]`

**Answer:**
Attempting to jump directly from Angular 10/11 to 18+ via `npm install @angular/core@latest` is guaranteed to fail due to:
1. **Chained CLI Schematics:** Angular's automated migration scripts (`ng update`) are programmed to execute transformations incrementally version-by-version. Jumping skips these transformation AST transforms.
2. **Node.js & TypeScript Version Lock:** Angular 10 requires Node.js 10/12 and TypeScript 3.9/4.0. Angular 18+ requires Node.js 18/20+ and TypeScript 5.4+. Jumping immediately creates an unresolvable build environment deadlock.
3. **Peer Dependency Matrix Deadlock:** Package managers will abort due to incompatible peer dependencies across RxJS, Zone.js, and third-party libraries.

```text
The Mandatory Version Ladder:
Angular 10/11 (Node 12/14, TS 4.0, View Engine compat)
      │
      ▼ ng update @angular/core@12 @angular/cli@12
Angular 12    (Webpack 5 default, View Engine deprecated, IE11 deprecated)
      │
      ▼ ng update @angular/core@13 @angular/cli@13
Angular 13    (View Engine dropped, APF ESM, ComponentFactoryResolver deprecated)
      │
      ▼ ng update @angular/core@14 @angular/cli@14
Angular 14    (Typed Forms, Standalone preview)
      │
      ▼ ng update @angular/core@15 @angular/cli@15
Angular 15    (Material MDC overhaul, Functional Guards & Interceptors)
      │
      ▼ ng update @angular/core@16 @angular/cli@16
Angular 16    (ngcc completely REMOVED, Signals preview, Hydration)
      │
      ▼ ng update @angular/core@17 @angular/cli@17
Angular 17    (Control Flow @if/@for, esbuild Application Builder)
      │
      ▼ ng update @angular/core@18 @angular/cli@18
Angular 18+   (Zoneless Change Detection, Signal inputs/outputs, model)
      │
      ▼ ng update @angular/core@19/20/21/22
Modern / Next (linkedSignal, resource, pure Zoneless architecture)
```

**Golden Rule:** Always upgrade **one major version at a time**, commit the changes, verify the test suite, and ensure CI passes before advancing to the next major version.

---

### Q2: What is the Node.js and TypeScript compatibility matrix from Angular 10 to Modern?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Tooling]` `[Environment]`

**Answer:**

| Angular Version | Supported Node.js Versions | Supported TypeScript Versions |
|---|---|---|
| **v10** | 10.13, 12.11 | 3.9, 4.0 |
| **v11** | 10.13, 12.11 | 4.0, 4.1 |
| **v12** | 12.14, 14.15 | 4.2, 4.3 |
| **v13** | 12.20, 14.15, 16.10 | 4.4, 4.5 |
| **v14** | 14.15, 16.10 | 4.6, 4.7 |
| **v15** | 14.20, 16.13, 18.10 | 4.8, 4.9 |
| **v16** | 16.14, 18.10 | 5.0, 5.1 |
| **v17** | 18.13, 20.9 | 5.2, 5.3, 5.4 |
| **v18** | 18.19, 20.9, 22.0 | 5.4, 5.5 |
| **v19–22** | 20.x, 22.x+ | 5.5, 5.6+ |

**Enterprise Migration Tip:** Use **NVM (Node Version Manager)** to switch Node runtimes during the intermediate upgrade milestones.

---

## 2. Compiler & Packaging: The Ivy & `ngcc` Cliff (v11 ➔ v16)

### Q3: What is the "v16 `ngcc` Cliff", and why do unmaintained third-party libraries break when upgrading from v15 to v16?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[ngcc]` `[Ivy]`

**Answer:**
- **Background:** Angular v9 introduced the Ivy compiler, but hundreds of npm packages were published under the legacy **View Engine** format.
- To maintain backward compatibility from v9 to v15, Angular provided **`ngcc` (Angular Compatibility Compiler)**, which ran as a `postinstall` script to transpile legacy View Engine npm packages into Ivy-compatible bytecode.
- **The v16 Cliff:** In Angular 16, **`ngcc` was completely removed from the Angular codebase**.

#### What happens if you have an unmaintained library in v16:
The build fails with fatal compilation errors:
`Error: The target entry-point "my-legacy-lib" has missing dependencies or cannot be compiled with Ivy.`

#### The Remediation Playbook:
1. **Audit dependencies:** Run `npx @angular/cli@15 update` and inspect which packages rely on View Engine.
2. **Upgrade to an Ivy-native release:** Check if the package published an updated version built with APF v13+ (Angular Package Format).
3. **Replace abandoned packages:** Common examples:
   - Replace unmaintained legacy date pickers with `@angular/material/datepicker`.
   - Replace old Bootstrap wrappers with modern CSS frameworks or ng-bootstrap v15+.
4. **Local Fork / Patch:** If a mission-critical private or open-source library has no update, use `patch-package` or copy source into an internal Nx library.

---

### Q4: How do you migrate dynamic component creation away from the deprecated `ComponentFactoryResolver` (v13)?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[DynamicComponents]` `[v13]`

**Answer:**

```typescript
// ❌ Legacy Angular 10/11 (Verbose ComponentFactoryResolver)
@Component({...})
export class LegacyHostComponent {
  @ViewChild('container', { read: ViewContainerRef }) vcr!: ViewContainerRef;

  constructor(private cfr: ComponentFactoryResolver) {}

  loadModal() {
    this.vcr.clear();
    const factory = this.cfr.resolveComponentFactory(AlertModalComponent);
    const componentRef = this.vcr.createComponent(factory);
    componentRef.instance.message = 'Notice';
  }
}

// ✅ Modern Angular 13+ (Direct createComponent)
@Component({...})
export class ModernHostComponent {
  private vcr = inject(ViewContainerRef);

  loadModal() {
    this.vcr.clear();
    // Pass component class directly — No factory required!
    const componentRef = this.vcr.createComponent(AlertModalComponent);
    componentRef.instance.message = 'Notice';
  }
}
```

---

## 3. Strict Mode, TypeScript & RxJS 7/8 Modernization

### Q5: How do you systematically tame hundreds of TypeScript strict errors when enabling `--strict` (v10/v11 ➔ v14)?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[StrictMode]` `[TypeScript]`

**Answer:**
Enabling strict mode in a large enterprise app often causes 1,000+ compiler errors, primarily from:
1. `strictNullChecks`: Missing null/undefined checks.
2. `strictPropertyInitialization`: Class properties without initializers.
3. `noImplicitAny`: Untyped function arguments and variables.

#### Enterprise Rollout Strategy:
1. **Phase 1: Do NOT enable all strict flags at once.** Keep the global `tsconfig.json` lenient during the version bump.
2. **Phase 2: Enable strict flags incrementally per project / library:**
   ```json
   // tsconfig.json
   "compilerOptions": {
     "noImplicitAny": true,           // Step 1: Enforce types
     "strictNullChecks": true,        // Step 2: Fix nullable variables
     "strictPropertyInitialization": true // Step 3: Enforce constructor init
   }
   ```
3. **Use the Definite Assignment Assertion (`!`) pragmatically:**
   ```typescript
   // For @Input() properties initialized by Angular lifecycle:
   @Input() userId!: string;
   ```
4. **Leverage modern Nullish Coalescing (`??`) and Optional Chaining (`?.`)** to replace verbose `&&` checks.

---

### Q6: How do you migrate RxJS 6 `toPromise()` to RxJS 7/8 in Angular?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[RxJS]` `[toPromise]`

**Answer:**
In RxJS 7, `.toPromise()` was deprecated, and in RxJS 8 it is completely removed.

```typescript
// ❌ Legacy RxJS 6:
const user = await this.http.get<User>('/api/user').toPromise();

// ✅ Modern RxJS 7/8:
import { firstValueFrom, lastValueFrom } from 'rxjs';

// Use firstValueFrom when you want the FIRST emission (standard HTTP calls)
const user = await firstValueFrom(this.http.get<User>('/api/user'));

// Use lastValueFrom when you want the LAST emission upon stream completion
const finalState = await lastValueFrom(stream$);
```

**⚠️ Gotcha:** Unlike `toPromise()` which resolved to `undefined` if the observable completed without emitting, `firstValueFrom` throws an `EmptyError`. If an empty stream is possible, provide a `defaultValue`:
`firstValueFrom(stream$, { defaultValue: null })`.

---

## 4. Angular Material MDC Overhaul & CSS Breakages (v15)

### Q7: Why was the Angular Material v15 MDC Migration notoriously difficult, and what is the remediation playbook?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture  
**Tags:** `[AngularMaterial]` `[MDC]`

**Answer:**
In Angular 15, `@angular/material` completely refactored its component suite to align with Google's official **Material Design Components for Web (MDC)**.

#### What broke:
1. **Internal DOM structures completely changed:** `mat-button`, `mat-card`, `mat-form-field`, `mat-table`, and `mat-dialog` replaced custom Angular HTML tags with standard native HTML elements wrapped with complex MDC classes.
2. **CSS Overrides shattered:** Enterprise codebases with custom CSS or `::ng-deep` selectors targeting internal Material classes (e.g., `.mat-form-field-wrapper`, `.mat-tab-label`) failed silently. Visual regression was severe.

#### The 3-Step Migration Playbook:
1. **Step 1: Automated Legacy Renaming via CLI:**
   Running `ng update @angular/material@15` automatically updates imports to legacy compatibility modules:
   ```typescript
   // Automated fallback preserves legacy styling!
   import { MatLegacyButtonModule } from '@angular/material/legacy-button';
   import { MatLegacyTableModule } from '@angular/material/legacy-table';
   ```
   *Benefit:* The app compiles and looks identical in v15 without visual regressions!
2. **Step 2: Incremental Component-by-Component Migration:**
   Use the official migration schematic feature-by-feature:
   ```bash
   ng generate @angular/material:mdc-migration --components=button
   ng generate @angular/material:mdc-migration --components=card
   ```
3. **Step 3: Remove custom CSS overrides in favor of Material Design Tokens:**
   Replace brittle `::ng-deep` hacks with modern Material Design tokens using CSS variables or `@use '@angular/material' as mat; @include mat.theme(...)`.

---

## 5. Standalone Components & Automated Migration Schematics

### Q8: How does the 3-step automated Standalone Migration schematic work?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Standalone]` `[Schematics]`

**Answer:**
Angular provides a built-in automated migration schematic to convert an existing `NgModule`-based codebase to standalone components:

```bash
ng generate @angular/core:standalone
```

The schematic executes in 3 sequential interactive steps:

```text
Step 1: Convert all Components, Directives, and Pipes
        Adds `standalone: true` and populates `imports: [...]` arrays.
           │
Step 2: Prune NgModules
        Removes declarations that are now standalone; deletes empty modules.
           │
Step 3: Switch App Bootstrap
        Replaces `AppModule` and `platformBrowserDynamic().bootstrapModule(AppModule)`
        with `bootstrapApplication(AppComponent, appConfig)`.
```

**⚠️ Enterprise Tip:** Run Step 1 and Step 2 first. Keep `AppModule` intact temporarily while verifying that feature components render cleanly before running Step 3.

---

## 6. Modern Control Flow, Router & HTTP Client APIs

### Q9: How do you migrate from `*ngIf`/`*ngFor` to Built-in Control Flow, and what is the `@for` `track` hazard during migration?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Fix  
**Tags:** `[ControlFlow]` `[Schematics]`

**Answer:**

#### Run the Automated Schematic:
```bash
ng generate @angular/core:control-flow
```
This AST schematic automatically rewrites:
- `*ngIf="expr"` ➔ `@if (expr)`
- `*ngSwitch` ➔ `@switch`
- `*ngFor="let item of items; trackBy: trackFn"` ➔ `@for (item of items; track trackFn(item))`

#### ⚠️ The Major Migration Hazard:
If legacy code wrote `*ngFor="let item of items"` **without a `trackBy` function**, the schematic defaults to:
`@for (item of items; track $index)`

**The Bug:** As covered in Section 01, `track $index` binds DOM nodes to list indices rather than object identity. If your migrated list allows users to insert, reorder, or delete rows containing text inputs, checkboxes, or child state, the input contents will detach and desynchronize!

**Remediation:** After running the schematic, perform a project-wide search for `track $index` and replace them with unique identity keys: `track item.id`.

---

### Q10: How do you migrate Class-Based Route Guards and HTTP Interceptors to modern Functional APIs?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Routing]` `[HTTP]`

**Answer:**

#### 1. Route Guards:
```typescript
// ❌ Legacy Class Guard
@Injectable({ providedIn: 'root' })
export class OldAuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(): boolean { return this.auth.isLoggedIn(); }
}

// ✅ Modern Functional Guard
export const authGuard: CanActivateFn = () => {
  return inject(AuthService).isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};
```

#### 2. HTTP Interceptors:
Replace class `HTTP_INTERCEPTORS` with `HttpInterceptorFn`:
```typescript
// app.config.ts
provideHttpClient(
  withInterceptors([authInterceptor, errorInterceptor])
)
```

---

## 7. Signals Modernization & Zoneless Architecture (v18 ➔ v22)

### Q11: How do you transition a legacy Angular 10/11 codebase from Zone.js to Zoneless Change Detection (`provideZonelessChangeDetection`)?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture  
**Tags:** `[Zoneless]` `[Angular18+]`

**Answer:**
You cannot flip the zoneless switch overnight on a legacy codebase. Follow this 4-phase transition roadmap:

```text
Phase 1: Migrate Inputs & Outputs
         Run `ng generate @angular/core:signal-input`
         Convert `@Input()` to `input()` and `@Output()` to `output()`.
           │
Phase 2: Eliminate Imperative ChangeDetectorRef calls
         Audit codebase for `cd.detectChanges()` and `cd.markForCheck()`.
         Convert underlying state variables into Signals (`signal()`, `computed()`).
           │
Phase 3: Audit Third-Party & Async DOM Callbacks
         Ensure asynchronous callbacks from external non-Angular SDKs
         (e.g., Google Maps, WebSocket listeners) update a Signal.
           │
Phase 4: Enable Zoneless in appConfig
         Add `provideZonelessChangeDetection()`, remove `zone.js` from polyfills.
```

---

## 8. 🎯 Enterprise Migration Traps & War Stories

### Q12: 🐛 Trap: Deep imports into Angular internal packages (`@angular/core/src/...`) fail compilation after upgrade.
**Answer:**
In legacy versions, developers sometimes imported private utilities directly from internal paths:
`import { ViewEngine } from '@angular/core/src/render3/...'`  
Modern Angular packages strictly enforce package `exports` in `package.json`. Node and TypeScript will reject deep sub-path imports.  
*Fix:* Always import strictly from public top-level entry points (`@angular/core`, `@angular/common`).

---

### Q13: In an Nx Monorepo, should you use `ng update` or `nx migrate`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Nx]` `[Migration]`

**Answer:**
In an Nx workspace, **NEVER run `ng update`**!  
Always use **`nx migrate`**:
```bash
# 1. Calculate dependency changes & generate migrations.json
nx migrate @nx/angular@latest

# 2. Install updated dependencies
npm install

# 3. Run all automated code migrations across all apps & libs
nx migrate --run-migrations
```
`nx migrate` orchestrates Angular schematics alongside Nx plugins, TypeScript, ESLint, Jest, and Cypress migrations in a unified, conflict-free pass.
