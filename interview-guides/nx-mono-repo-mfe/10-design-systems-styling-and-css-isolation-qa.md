# 10 — Design Systems, Styling & CSS Isolation in Federated Frontends

> CSS Bleeding & Reset Collisions, Shadow DOM vs CSS Modules vs Native `@scope`, Tailwind CSS v3/v4 in Nx Monorepos, Token Sharing with Design Systems, and the Modal / Overlay Portal Trap (`document.body`).

---

## 📑 Table of Contents
1. [Style Leaking & Specificity Wars in MFEs](#1-style-leaking--specificity-wars-in-mfes)
2. [CSS Isolation Mechanisms: Shadow DOM vs Scoped vs `@scope`](#2-css-isolation-mechanisms-shadow-dom-vs-scoped-vs-scope)
3. [Tailwind CSS v3 & v4 in an Nx Monorepo](#3-tailwind-css-v3--v4-in-an-nx-monorepo)
4. [The Modal & Overlay Portal Trap (`document.body` Escapes)](#4-the-modal--overlay-portal-trap-documentbody-escapes)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Style Leaking & Specificity Wars in MFEs

### Q1: How does CSS bleeding manifest in a federated micro-frontend architecture, and why is `@tailwind base` or a global reset dangerous?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[CSS]` `[Style-Bleed]` `[Tailwind]`

**Answer:**
By default, the browser's CSSOM (CSS Object Model) is **global to the entire window document**. When an MFE Remote loads its stylesheets into `document.head`, those styles apply globally to every element on the page, including the Host Shell and sibling remotes!

```text
Host Shell mounts:
<button class="btn">Host Button</button> (Styled with font-size: 16px, background: blue)

User navigates to Orders Remote:
Orders Remote injects its styles into <head>:
  .btn { font-size: 12px; background: red; margin: 0; }
  * { box-sizing: content-box; } /* Aggressive Reset! */

RESULT:
The Host Shell's navigation bar, buttons, and layout instantly shift and break!
```

### The `@tailwind base` Trap:
Tailwind CSS includes **Preflight** inside `@tailwind base`, which applies aggressive global CSS resets:
- Sets `margin: 0` on headings, lists, and paragraphs.
- Sets `border-color: currentColor`.
- Strips default styling from buttons and inputs.

If Remote B loads `@tailwind base` on top of an Angular Material or Bootstrap Host Shell, it will silently strip all borders, paddings, and heading margins from the Host Shell!

---

## 2. CSS Isolation Mechanisms: Shadow DOM vs Scoped vs `@scope`

### Q2: Compare Shadow DOM, CSS Modules, BEM / PostCSS Prefixing, and Native CSS `@scope` for Micro-Frontends.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[CSS-Isolation]` `[Shadow-DOM]` `[CSS-Scope]`

**Answer:**

| Isolation Mechanism | Implementation Complexity | Encapsulation Strength | Design System Token Penetration | Portal / Modal Compatibility |
|---|---|---|---|---|
| **Shadow DOM** | 🟡 Medium | 🟣 Impenetrable | 🟡 Challenging (CSS variables only)| 🔴 Difficult (Breaks body modals) |
| **CSS Modules** | 🟢 Low | 🟢 High (Hashed classes) | 🟢 Natural | 🟢 Full |
| **PostCSS Namespace Prefix**| 🟢 Low | 🟢 High (e.g. `.mfe-orders__*`)| 🟢 Natural | 🟢 Full |
| **Native CSS `@scope`** | 🟣 Lowest (Native browser)| 🟣 High (Boundary-scoped) | 🟢 Natural inheritance | 🟢 Full |

### 1. Modern Native CSS `@scope` (The Modern Standard):
Modern CSS supports native scoping without Shadow DOM overhead:
```css
/* apps/orders/src/styles.css */
@scope (.mfe-orders-root) {
  button {
    background-color: var(--brand-primary);
  }
  .card {
    border-radius: 8px;
  }
}
```
All styles apply exclusively to elements inside `<div class="mfe-orders-root">`, completely preventing style bleeding into the Host or sibling remotes.

### 2. Shadow DOM Caveats:
While Shadow DOM provides 100% style isolation, it introduces serious drawbacks:
- Global fonts and font-face declarations must be re-injected into each shadow root.
- Modals, tooltips, and popovers appended to `document.body` cannot access styles defined inside the shadow root.

---

## 3. Tailwind CSS v3 & v4 in an Nx Monorepo

### Q3: How do you configure a shared Tailwind CSS design system preset across multiple apps and remotes in an Nx monorepo?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Tailwind]` `[Design-System]` `[Nx-Monorepo]`

**Answer:**

### Step 1: Create Shared Preset Library (`libs/shared/ui-theme`)
```javascript
// libs/shared/ui-theme/tailwind.preset.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### Step 2: Consume Preset in Remote with Scoped Prefix
To prevent utility collisions with sibling remotes, assign a unique `prefix` or container selector:

```javascript
// apps/orders/tailwind.config.js
const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const sharedPreset = require('../../libs/shared/ui-theme/tailwind.preset.js');
const { join } = require('path');

module.exports = {
  presets: [sharedPreset],
  prefix: 'ord-', // Generates 'ord-flex', 'ord-bg-brand-500'
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  corePlugins: {
    preflight: false, // CRITICAL: Disable global reset to prevent breaking host!
  },
};
```

---

## 4. The Modal & Overlay Portal Trap (`document.body` Escapes)

### Q4: Explain the "Modal / Overlay Portal Trap" when using Angular CDK Overlay or React `createPortal` in an MFE.
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[CDK-Overlay]` `[createPortal]` `[Z-Index]` `[Styles]`

**Answer:**
### The Problem:
UI components like Modals, Tooltips, Dropdowns, and Datepickers typically render using **Portals** (e.g. React `createPortal` or Angular CDK `OverlayContainer`).

Instead of rendering inside the component's parent DOM element, the portal dynamically appends the modal element to the end of **`document.body`**:

```text
DOM STRUCTURE:
<body>
  <div id="host-shell">
    <div id="mfe-orders-container" class="mfe-orders-scoped-theme">
      <!-- Orders Remote Components live here -->
      <button (click)="openModal()">Open Invoice</button>
    </div>
  </div>

  <!-- PORTAL APPENDS DIRECTLY TO BODY: -->
  <div class="cdk-overlay-container">
    <div class="invoice-modal"> ... </div>
  </div>
</body>
```

### The Disasters That Occur:
1. **Unstyled Modals:** The modal lives outside `<div id="mfe-orders-container">`. Any scoped CSS, Tailwind container prefixes, or Shadow DOM theme variables are completely bypassed, rendering an unstyled white box!
2. **Z-Index Wars:** The Host shell defines a header with `z-index: 1000`. The modal renders with `z-index: 500`. The modal is partially hidden beneath the host header.

### The Solutions:
1. **Configure Custom Overlay Container:** In Angular, provide a custom `OverlayContainer` that appends overlays into the remote's scoped container rather than `document.body`:
   ```typescript
   @Injectable()
   export class ScopedOverlayContainer extends OverlayContainer {
     override _createContainer(): void {
       const container = document.createElement('div');
       container.classList.add('cdk-overlay-container', 'mfe-orders-scoped-theme');
       document.querySelector('#mfe-orders-container')?.appendChild(container);
       this._containerElement = container;
     }
   }
   ```
2. **Pass Portal Container Root in React:** Pass the remote's root element ref as the second argument to `createPortal(children, remoteRootRef.current)`.

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug Scenario: Unstyled Angular Material Modal in Federated Shell
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Angular-Material]` `[Overlay]` `[Styles]`

**Scenario:**
An Angular Host loads a federated Remote that uses Angular Material dialogs. The Remote developer tests the dialog locally (`nx serve remote`), and it looks beautiful.
When loaded inside the Host shell, clicking "Open Dialog" renders the dialog contents as raw text with no background, no backdrop shadow, and all action buttons stacked vertically without styling.
Why did the modal lose its styles when federated?

**Answer:**
**Root Cause:** The Angular Material core theme and CDK Overlay styles (`@angular/cdk/overlay-prebuilt.css` and `@angular/material/prebuilt-themes/indigo-pink.css`) were only imported in the Remote's local `styles.scss`.
When the Host dynamically lazy-loaded the Remote's routed component via `loadRemoteModule`, **the Remote's `styles.scss` was never injected into the document**, and because the dialog overlay attaches to `document.body`, it lacked the required global CDK overlay CSS rules.

**Fix:**
Ensure core design system global utility styles and CDK overlay structural styles are included once at the **Host Shell level** in `apps/shell/src/styles.scss`, or use Module Federation 2.0's manifest asset preloader to dynamically inject the remote's CSS bundles before mounting.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: How can CSS Custom Properties (CSS Variables) penetrate Shadow DOM boundaries?
**Answer:** Unlike CSS class selectors, **CSS Custom Properties naturally inherit down through Shadow DOM boundaries**. Defining `--brand-color: #0070f3;` on `:root` in the Host shell allows child elements inside a remote's Shadow DOM to read `var(--brand-color)` directly.

### Q7: Why is setting `preflight: false` critical in Tailwind configurations for federated remotes?
**Answer:** It prevents Tailwind from injecting its aggressive browser reset (`@tailwind base`), which would otherwise overwrite and corrupt the font sizes, headings, and margins of the Host application.

### Q8: What does CSS Specificity War mean in an MFE context?
**Answer:** A scenario where two remotes define conflicting CSS rules with the same specificity (e.g. `.card { padding: 16px }` vs `.card { padding: 8px }`). The winner is determined arbitrarily by which remote's stylesheet was injected into `<head>` last.

### Q9: Can an Angular Remote use ViewEncapsulation.Emulated to prevent styles from leaking?
**Answer:** Yes. Angular's default `ViewEncapsulation.Emulated` generates unique attribute selectors (e.g. `_ngcontent-c123`) on component HTML elements, effectively scoping component styles to their own DOM tags without Shadow DOM overhead.
