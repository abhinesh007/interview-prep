# 08 — React UI Libraries & Polyglot MFE Interoperability (Angular ↔ React)

> Cross-Framework Integration, The Adapter Wrapper Pattern (`ReactDOM.createRoot` & `root.unmount()`), Web Components (`@angular/elements`), Buildable vs Non-Buildable UI Libraries in Nx, and Storybook Design System Unification.

---

## 📑 Table of Contents
1. [Polyglot Architecture & Cross-Framework Foundations](#1-polyglot-architecture--cross-framework-foundations)
2. [The Adapter Pattern: Mounting React Inside Angular](#2-the-adapter-pattern-mounting-react-inside-angular)
3. [The Memory Leak Trap: React Fiber & DOM Retainment](#3-the-memory-leak-trap-react-fiber--dom-retainment)
4. [Web Components & Custom Elements Interoperability](#4-web-components--custom-elements-interoperability)
5. [Buildable vs Non-Buildable UI Component Libraries in Nx](#5-buildable-vs-non-buildable-ui-component-libraries-in-nx)
6. [🧩 Output Prediction & 🐛 Debug Scenarios](#6--output-prediction---debug-scenarios)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. Polyglot Architecture & Cross-Framework Foundations

### Q1: Why do enterprise monorepos adopt a Polyglot MFE architecture (Angular Shell + React Remotes), and what are the core technical hurdles?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Polyglot]` `[Architecture]` `[React]` `[Angular]`

**Answer:**
Enterprise organizations rarely have homogenous codebases. Mergers, acquisitions, and specialized team skill sets often require **Angular Host Shells to seamlessly render React Remotes** (or React shells to embed Angular widgets).

```text
┌────────────────────────────────────────────────────────┐
│                   Angular Host Shell                   │
│  ├── Global Navigation & Shell Layout (Angular)       │
│  ├── Routing Engine (Angular Router)                  │
│  └── Active Zone / Zoneless Scheduler                  │
└───────────────────────────┬────────────────────────────┘
                            │
               loadChildren / loadRemoteModule
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│              Angular Adapter Wrapper Component         │
│  ├── Template: <div #reactContainer></div>             │
│  ├── ngAfterViewInit: ReactDOM.createRoot()            │
│  └── ngOnDestroy: root.unmount() [CRITICAL]            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Federated React 19 Remote                │
│  ├── React Virtual DOM & Fiber Tree                    │
│  ├── Hooks (useState, useEffect, useActionState)       │
│  └── Synthetic Event System                            │
└────────────────────────────────────────────────────────┘
```

### Core Technical Hurdles:
1. **Divergent Lifecycle Paradigms:** Angular relies on explicit lifecycle hooks (`ngOnInit`, `ngOnDestroy`, `ngOnChanges`), while React uses continuous functional rendering and hook effects (`useEffect`).
2. **Reconciliation vs Change Detection:** Angular uses Signals/Zone ticks to update the real DOM, while React maintains an in-memory Virtual DOM Fiber tree and schedules reconciliation asynchronously.
3. **Event Propagation Mismatches:** React uses its own **Synthetic Event System** attached to the React root node, whereas Angular components listen to native browser DOM events.

---

## 2. The Adapter Pattern: Mounting React Inside Angular

### Q2: Author a production-grade Angular Standalone Component that acts as an adapter to dynamically mount a React Remote.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Adapter-Pattern]` `[React-in-Angular]` `[TypeScript]`

**Answer:**

```typescript
// libs/shared/mfe-adapters/src/react-mfe-wrapper.component.ts
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { loadRemoteModule } from '@nx/angular/dynamic-module-federation';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

@Component({
  selector: 'mfe-react-wrapper',
  standalone: true,
  template: '<div #reactMountNode class="mfe-react-container"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReactMfeWrapperComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild('reactMountNode', { static: true })
  mountNodeRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) remoteName!: string;
  @Input({ required: true }) exposedModule!: string;
  @Input() props: Record<string, unknown> = {};

  private reactRoot?: ReactDOM.Root;
  private ReactComponent?: React.ComponentType<any>;

  async ngOnInit(): Promise<void> {
    try {
      // 1. Dynamically load the federated React module
      const module = await loadRemoteModule({
        type: 'manifest',
        remoteName: this.remoteName,
        exposedModule: this.exposedModule,
      });

      // Remotes typically expose default export or named component
      this.ReactComponent = module.default || module[Object.keys(module)[0]];

      // 2. Initialize React 18/19 Root
      this.reactRoot = ReactDOM.createRoot(this.mountNodeRef.nativeElement);

      // 3. Render the React component with current props
      this.renderReact();
    } catch (err) {
      console.error(`[MFE Error] Failed to mount React remote: ${this.remoteName}`, err);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If input props update in Angular, re-render the mounted React tree
    if (changes['props'] && !changes['props'].firstChange && this.reactRoot) {
      this.renderReact();
    }
  }

  private renderReact(): void {
    if (this.reactRoot && this.ReactComponent) {
      this.reactRoot.render(
        React.createElement(this.ReactComponent, { ...this.props })
      );
    }
  }

  ngOnDestroy(): void {
    // CRITICAL: Unmount React Root to prevent catastrophic memory leaks!
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = undefined;
    }
  }
}
```

---

## 3. The Memory Leak Trap: React Fiber & DOM Retainment

### Q3: What happens to browser memory if `root.unmount()` is omitted when an Angular host navigates away from a React remote?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Memory-Leak]` `[Garbage-Collection]` `[React-Fiber]`

**Answer:**
When Angular destroys a component during router navigation, it deletes the container `<div>` from the active document DOM tree.

However, if `reactRoot.unmount()` was **not executed**:

```text
DETACHED DOM LEAK CASCADE:
Angular destroys view:
  Removes <div #reactMountNode> from live DOM.

BUT in JavaScript Memory Heap:
  ReactDOM root reference retains:
  ├── React Fiber Root Node
  │   └── Child Fiber nodes (Hundreds of component instances)
  │       ├── Closures retaining props, state, and API responses
  │       └── Synthetic Event Listeners attached to container
  └── Detached DOM Tree (Kept alive by Fiber references!)
```

### The Impact:
1. Every navigation to and from the React remote retains an entire duplicate copy of the React Fiber tree and detached DOM in the JavaScript heap.
2. After 15–20 navigations, heap memory expands by **100MB–500MB**, leading to mobile browser tab crashes (OOM: Out Of Memory).
3. Any interval timers (`setInterval`) or subscription effects (`useEffect`) inside the React remote **continue running in the background**, triggering memory leak warnings.

Executing `reactRoot.unmount()` cleanly dismantles the Fiber tree, triggers all `useEffect` cleanup return functions, detaches event listeners, and frees all memory for Garbage Collection.

---

## 4. Web Components & Custom Elements Interoperability

### Q4: When should you wrap cross-framework remotes in Web Components / Custom Elements instead of using an Adapter Component?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Web-Components]` `[Custom-Elements]` `[Shadow-DOM]`

**Answer:**

```text
ADAPTER WRAPPER (Direct React.render):
- Faster to execute (no Custom Elements registry overhead).
- Prop synchronization occurs directly in JS memory.
- No Shadow DOM by default (styles can leak or share tokens).

WEB COMPONENTS (createCustomElement / @r2wc):
- 100% Framework Agnostic (can be mounted in Vue, Svelte, Angular, plain HTML).
- Native DOM lifecycle hooks (connectedCallback, disconnectedCallback).
- True style isolation via Shadow DOM.
```

### When to choose Web Components:
1. **Universal Design Systems:** Shared UI component libraries (Buttons, Sliders, DatePickers) consumed across Angular, React, and legacy jQuery portals.
2. **Strict CSS Sandboxing:** When an acquired legacy third-party application uses aggressive global CSS overrides that cannot be cleaned up without Shadow DOM containment.

---

## 5. Buildable vs Non-Buildable UI Component Libraries in Nx

### Q5: What is the architectural difference between a Buildable library and a Non-Buildable (source) library in an Nx monorepo?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Nx-Libraries]` `[Buildable-vs-Non-Buildable]` `[Caching]`

**Answer:**

| Dimension | Non-Buildable Library (Source Code) | Buildable Library (Pre-compiled) |
|---|---|---|
| **Compilation** | Zero build step. Raw TypeScript files consumed directly by app bundler. | Compiled into `dist/libs/my-lib` via Rollup, Vite, or `tsc`. |
| **Path Mapping** | Maps directly to `src/index.ts`. | Maps to compiled `dist/` or built package. |
| **Cache Granularity**| App build caches whole bundle. | Library build produces its own independent computation cache hit. |
| **Tree-Shaking** | Exceptional (bundled directly by app's bundler). | Requires proper package export configuration (`sideEffects: false`). |
| **CI Build Speed** | Fast in small repos; scales linearly with apps. | **Fastest in massive repos** (DTE caches compiled lib artifacts). |
| **Publishable** | No (cannot publish raw monorepo TS). | **Yes** (ready for npm publishing). |

### The Enterprise Strategy:
- **Default Recommendation:** Start with **Non-Buildable Libraries**. They offer the best developer experience, instant TypeScript refactoring, and zero compile lag during local development.
- **Switch to Buildable Libraries** only when:
  1. The monorepo exceeds 100+ projects and CI times demand distributed artifact caching for shared libraries.
  2. The library needs to be published to an external npm registry or shared across different monorepos.

---

## 6. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🐛 Debug Scenario: "Invalid Hook Call / Multiple Reacts" in Angular Host
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[React-Hooks]` `[Dispatcher]`

**Scenario:**
An Angular Host loads a federated React remote. The remote component mounts successfully on the screen, but as soon as the user clicks a button that calls `useState`:
```text
Uncaught Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
```
The developer inspects `package.json` and confirms only React 19 is installed. Why did this occur?

**Answer:**
**Root Cause:** Reason #3 — **Duplicate copies of React loaded in the browser heap!**
1. The Angular Host had a shared UI library that imported React internally.
2. The Federated React Remote also imported React.
3. Because `react` was **not properly declared as a singleton in `module-federation.config.ts`**, Webpack loaded two distinct instances of the `react` package into memory:
   - Instance 1 (`React_Host`): Initialized by Host.
   - Instance 2 (`React_Remote`): Initialized by Remote.
4. When the component executed `useState`, it called React's global dispatcher singleton (`ReactCurrentDispatcher`). Because the renderer (`react-dom`) was bound to Instance 1 while the hook was imported from Instance 2, the dispatcher was `null`, throwing the panic!

**Fix:** Configure strict singleton resolution in both Host and Remote federation configs:
```typescript
shared: {
  'react': { singleton: true, strictVersion: true, requiredVersion: '^19.0.0' },
  'react-dom': { singleton: true, strictVersion: true, requiredVersion: '^19.0.0' },
}
```

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q7: Can React 19 Server Components (RSC) run inside an Angular client-side MFE host?
**Answer:** No. React Server Components require a React-aware server streaming runtime (like Next.js or a specialized Node.js streaming handler). Inside a client-side Angular shell, only client-side React components can be mounted.

### Q8: How do React Portals (`createPortal`) behave when mounted inside an Angular component container?
**Answer:** React Portals render DOM elements outside the Angular container (typically appending to `document.body`). While visual rendering works, scoped CSS styles and Angular component styles will **not** apply to the portal unless styles are globally available or injected into the portal root.

### Q9: Can an Angular component consume React Context (`useContext`)?
**Answer:** Not directly. React Context is an internal React Fiber tree feature. Cross-framework state must be passed through the Adapter wrapper component via Inputs/Props or shared via an external framework-agnostic Event Bus.

### Q10: Why should you avoid using `<iframe>` for cross-framework component integration if an Adapter component is viable?
**Answer:** Iframes incur massive DOM and memory overhead, cannot share browser singletons (forcing full framework re-downloads), break responsive container sizing, and complicate accessibility (a11y) and keyboard focus traps.
