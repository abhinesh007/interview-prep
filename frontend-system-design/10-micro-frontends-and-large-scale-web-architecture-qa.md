# 10 — Micro-Frontends & Large-Scale Web Architecture

> Micro-Frontend Composition Patterns, Webpack 5 Module Federation Internals, Shared Scope Singletons, Vertical Business Slices vs The Horizontal Trap, Cross-MFE Event Buses, CSS Isolation, and Dependency Collision Debugging.

---

## 📑 Table of Contents
1. [Micro-Frontend Architectural Patterns](#1-micro-frontend-architectural-patterns)
2. [Webpack 5 Module Federation Internals](#2-webpack-5-module-federation-internals)
3. [Domain Boundaries: Vertical Slices vs The Horizontal Anti-Pattern](#3-domain-boundaries-vertical-slices-vs-the-horizontal-anti-pattern)
4. [Cross-Micro-Frontend Communication & CSS Isolation](#4-cross-micro-frontend-communication--css-isolation)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Micro-Frontend Architectural Patterns

### Q1: What problem do Micro-Frontends solve, and what are the 4 primary composition patterns? When should an engineering team avoid Micro-Frontends?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[MicroFrontends]` `[Architecture]` `[ModuleFederation]` `[OrganizationalScaling]`

**Answer:**
#### The Core Problem:
Micro-Frontends are an **organizational architecture** designed to solve team scaling bottlenecks, not a raw technical performance optimization. When a monolithic frontend repo exceeds 50+ engineers, pull request contention, CI/CD pipeline bottlenecks, and cross-team deployment coordination grind development velocity to a halt.

```text
The 4 Micro-Frontend Composition Patterns:

1. Build-Time Composition (NPM Packages):
   Team A (Cart) ──► Publishes npm package @store/cart ──► Host App builds monolithic bundle.
   (Cons: Host must be rebuilt & redeployed for every bugfix; dependency bloat).

2. Server-Side Composition (Edge Fragments / ESI / Podium):
   Edge Server (Nginx / Cloudflare) fetches HTML fragments from independent microservices
   and stitches them together into a single HTML stream. (Pros: Fast initial paint).

3. Run-Time Composition via Iframes:
   Host embeds child apps in <iframe> tags.
   (Pros: Perfect sandboxing. Cons: Janky styling, impossible shared modals, terrible memory).

4. Run-Time Composition via Module Federation (Modern Standard):
   Host dynamically downloads remote JavaScript chunks from other domains over HTTP
   at runtime, sharing singleton dependencies (React, libraries) in memory!
```

#### When to AVOID Micro-Frontends:
If your engineering team is under 30 developers, implementing Micro-Frontends is an **architectural anti-pattern**. It introduces distributed systems complexity to the browser: network waterfalls, duplicate library downloads, CSS collisions, and complex end-to-end integration testing. Monorepos (Nx, Turborepo) with modular boundaries are strictly superior for smaller teams.

---

## 2. Webpack 5 Module Federation Internals

### Q2: How does Webpack 5 Module Federation work under the hood? Detail the `Host`, `Remote`, and `shared` scope mechanisms.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[ModuleFederation]` `[Webpack5]` `[Singletons]`

**Answer:**
Module Federation enables a JavaScript application to dynamically execute code loaded from another build over the network, while sharing common dependencies.

```text
Module Federation Topology:

Host Container (port 3000)                          Remote Application (port 3001)
┌──────────────────────────────────────┐            ┌──────────────────────────────────────┐
│ Host Webpack Runtime                 │            │ remoteEntry.js (Manifest of exports) │
│ - In-Memory Shared Scope Container   │ ◄───────── │ - Exports: './CartWidget'            │
│   { react: v18.2.0, zustand: v4.3 }  │  (HTTP GET)│ - Declares dependency requirements   │
├──────────────────────────────────────┤            └──────────────────────────────────────┘
│ Dynamic Component Mount:             │                               ▲
│ const RemoteCart = React.lazy(() =>  │                               │
│   import('cart_remote/CartWidget')   │ ──────────────────────────────┘
│ );                                   │
└──────────────────────────────────────┘
```

#### Production Webpack Configuration:

```javascript
// Remote App (Cart MFE) webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'cart_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './CartWidget': './src/components/CartWidget',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0', eager: false },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: false },
        zustand: { singleton: true },
      },
    }),
  ],
};

// Host App (Shell) webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host_shell',
      remotes: {
        cart_remote: 'cart_remote@https://cart.cdn.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
};
```

#### How `shared` Scope Resolves Singletons:
1. When the host initializes, it creates an internal registry: `window.__webpack_share_scopes__.default`.
2. When the remote chunk loads, it inspects this registry. Because `react` is marked `singleton: true`, the remote **does not download its own copy of React**. It links against the host's running React instance in memory.

---

## 3. Domain Boundaries: Vertical Slices vs The Horizontal Anti-Pattern

### Q3: Why is horizontal micro-frontend slicing (the "Header team" anti-pattern) catastrophic? How do you define vertical domain boundaries?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[DomainDrivenDesign]` `[VerticalSlices]` `[Architecture]`

**Answer:**

```text
Horizontal vs Vertical Micro-Frontend Architectures:

Horizontal Slicing (DISASTER ANTI-PATTERN):
┌────────────────────────────────────────────────────────┐
│ Header Micro-Frontend (Team Header)                    │
├──────────────────┬─────────────────────────────────────┤
│ Sidebar MFE      │ Main Content MFE (Team Body)        │
│ (Team Nav)       ├─────────────────────────────────────┤
│                  │ Footer MFE (Team Footer)            │
└──────────────────┴─────────────────────────────────────┘
Result: 4 independent apps fighting on a single page!
- Massive network waterfall (4 remoteEntry.js downloads).
- Constant cross-app state synchronization nightmares.
- Deploying a button in the header breaks the body.

Vertical Slicing (PRODUCTION STANDARD):
┌───────────────────────┬───────────────────────┬───────────────────────┐
│ Catalog Domain MFE    │ Checkout Domain MFE   │ User Account MFE      │
│ (Route: /products/*)  │ (Route: /cart, /pay)  │ (Route: /settings/*)  │
│ Owned by Catalog Team │ Owned by Payment Team │ Owned by Auth Team    │
└───────────────────────┴───────────────────────┴───────────────────────┘
Result: Independent full-stack teams owning autonomous user journeys from edge to DB.
```

---

## 4. Cross-Micro-Frontend Communication & CSS Isolation

### Q4: How should decoupled micro-frontends communicate without creating tight runtime coupling? How do you prevent CSS style leaks?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[EventBus]` `[CSSIsolation]` `[CustomEvents]`

**Answer:**
#### Cross-MFE Communication Hierarchy:
1. **URL / Query Parameters (Preferred):** Deep-linkable and decoupled. App A updates `?productId=99`, App B reads query parameter.
2. **Native Custom DOM Events (`CustomEvent` on `window`):**
   ```typescript
   // Publisher (Catalog MFE)
   export function dispatchAddToCart(item: CartItem) {
     window.dispatchEvent(new CustomEvent('app:cart:add', { detail: item }));
   }

   // Subscriber (Header MFE)
   window.addEventListener('app:cart:add', ((event: CustomEvent<CartItem>) => {
     updateCartBadge(event.detail);
   }) as EventListener);
   ```
3. **`BroadcastChannel`:** For cross-tab or worker communication.

#### CSS Style Isolation Strategies:
1. **CSS Modules & Scoped CSS:** Appends deterministic hashes to class names (`.button_cart_8d492`), preventing name collisions.
2. **Tailwind Prefix Directives:** Configure unique prefixes per MFE in `tailwind.config.js`:
   ```javascript
   module.exports = {
     prefix: 'mfe-cart-', // Generates .mfe-cart-flex, .mfe-cart-p-4
   };
   ```
3. **Shadow DOM:** Encapsulates styles inside a Web Component boundary. (Caveat: breaks global font inheritance and complicates shared modal dialogs).

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug: The "Invalid Hook Call" Disaster in Module Federation.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ModuleFederation]` `[ReactHooks]` `[Debugging]`

**Scenario:**
You load a remote component in your host app. Immediately upon rendering, the console explodes:
```text
Uncaught Error: Invalid hook call. Hooks can only be called inside the body of a function component.
1. You might have mismatching versions of React and the renderer (such as React DOM).
2. You might be breaking the Rules of Hooks.
3. You might have more than one copy of React in the same app.
```
Why does this happen, and what is the fix?

#### Root Cause:
**Multiple copies of React loaded in memory.**
If the host and remote do not configure `singleton: true` on React, the remote loads its own bundled copy of React over the network. When a hook (`useState`, `useEffect`) executes inside the remote component, it queries the remote's React dispatcher, but the component is mounted inside the host's React DOM renderer tree. Having two distinct React runtimes in memory violates React's internal fiber singleton constraint.

#### The Fix:
Configure `singleton: true` and `strictVersion: true` in **both** host and remote `webpack.config.js`:
```javascript
shared: {
  react: {
    singleton: true,
    requiredVersion: '^18.2.0',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.2.0',
  },
}
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Can a Micro-Frontend built in Angular be embedded inside a Host built in React?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** Yes, via **Web Components (Custom Elements)**. The Angular team compiles their feature into an autonomous Custom Element (`@angular/elements` emitting `<custom-angular-widget>`). The React host mounts it as a native HTML tag: `<custom-angular-widget [data]="..."></custom-angular-widget>`. However, this incurs the performance penalty of loading two framework runtimes simultaneously.

### Q7: What is the "Zombie Dependency" problem in Module Federation?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Answer:** If Remote A relies on a shared library (e.g., `lodash`) provided by the Host, and the Host team removes `lodash` during a refactoring without realizing Remote A depends on it, Remote A will crash with a runtime module resolution error when deployed independently. Shared dependencies must specify `fallback` or local bundling fallbacks.
