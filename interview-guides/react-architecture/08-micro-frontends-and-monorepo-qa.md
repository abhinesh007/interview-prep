# 08 — Micro-Frontends & Monorepo Architecture (System Design)

> Deep dive into Enterprise Micro-Frontends (MFE) and Monorepo architecture — Webpack 5 & Vite Module Federation, Host-Remote contract design, monorepo orchestration (Turborepo vs Nx), cross-MFE communication, version mismatch management, and resilient error boundaries.

---

## 📑 Table of Contents
1. [System Design: Architect an Enterprise Micro-Frontend Platform](#1-system-design-architect-an-enterprise-micro-frontend-platform)
2. [Module Federation Mechanics & Configuration](#2-module-federation-mechanics--configuration)
3. [Monorepo Architecture (Turborepo vs Nx)](#3-monorepo-architecture-turborepo-vs-nx)
4. [Cross-MFE Communication & State Sharing](#4-cross-mfe-communication--state-sharing)
5. [Resilience, Fault Tolerance & Error Boundaries](#5-resilience-fault-tolerance--error-boundaries)
6. [CI/CD & Independent Deployments](#6-cicd--independent-deployments)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. System Design: Architect an Enterprise Micro-Frontend Platform

### Q1: System Design: Architect an enterprise-scale frontend platform using Micro-Frontends for an organization with 12 distributed engineering teams. Cover Host/Remote architecture, shared dependency management, routing, and deployment.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `Micro-Frontends` `Module-Federation` `Monorepo` `Enterprise`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)

**Organizational & Functional Requirements:**
- **Team Autonomy:** 12 squads must build, test, and deploy their domain features (Checkout, Catalog, User Account, Analytics, Billing) independently without cross-team deployment locks.
- **Unified User Experience:** The end user perceives a single coherent application with consistent navigation, global notifications, and shared design system tokens.
- **Dynamic Routing:** Centralized shell (Host) coordinates top-level routes and mounts remote micro-apps on-demand.
- **Shared Dependencies:** Guarantee a single runtime instance of `react`, `react-dom`, and `@tanstack/react-query` to eliminate multi-megabyte bundle bloat and hook context bugs.

**Non-Functional Requirements:**
- **Fault Isolation:** If the "Recommendations" remote crashes or fails network fetch, the rest of the application (Catalog, Header, Cart) must remain fully interactive.
- **Independent Versioning:** Remotes deploy to CDNs without triggering a rebuild or redeployment of the Host shell.
- **Initial Shell Load Budget:** Shell entry bundle < 80KB gzipped.
- **Zero CSS Pollution:** Scoped styling or CSS module isolation preventing rules in one micro-app from bleeding into another.

---

#### 2. Architecture & Topology (A)

```text
                                  ┌────────────────────────┐
                                  │      Client Browser    │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │   Host Shell Container │
                                  │  (Auth, Nav, Layout)   │
                                  └───────────┬────────────┘
                                              │
               ┌──────────────────────────────┼──────────────────────────────┐
               │                              │                              │
               ▼                              ▼                              ▼
      ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
      │  Catalog Remote │            │   Cart Remote   │            │  Account Remote │
      │  Team Alpha     │            │   Team Beta     │            │  Team Gamma     │
      │  (Port 3001)    │            │   (Port 3002)   │            │  (Port 3003)    │
      └────────┬────────┘            └────────┬────────┘            └────────┬────────┘
               │                              │                              │
               └──────────────────────────────┼──────────────────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │       Shared Design System      │
                             │   (Tokens, Primitives, Theme)   │
                             └─────────────────────────────────┘
```

**Monorepo Directory Layout (Turborepo / pnpm):**

```text
enterprise-platform/
├── apps/
│   ├── shell/                       ← Host Container (Routes, Auth, Global Nav)
│   │   ├── src/
│   │   │   ├── bootstrap.tsx        ← Async boundary for shared module federation
│   │   │   ├── index.ts             ← Dynamic import of bootstrap
│   │   │   ├── remotes.d.ts         ← Ambient TS declarations for remote modules
│   │   │   └── App.tsx
│   │   └── vite.config.ts / webpack.config.js
│   ├── remote-catalog/              ← Product Catalog Micro-App (Port 3001)
│   ├── remote-cart/                 ← Cart & Checkout Micro-App (Port 3002)
│   └── remote-account/              ← Profile & Settings Micro-App (Port 3003)
├── packages/
│   ├── design-system/               ← Shared UI components, tokens, themes
│   ├── event-bus/                   ← Type-safe Cross-MFE communication bus
│   ├── tsconfig/                    ← Shared TypeScript compiler options
│   └── eslint-config/               ← Shared lint rules
├── pnpm-workspace.yaml
└── turbo.json
```

---

#### 3. Data Model & Remote Contract (D)

Each Remote exports a well-defined public contract via TypeScript declarations:

```typescript
// packages/event-bus/src/types.ts
export interface GlobalEventMap {
  'cart:item_added': { productId: string; quantity: number; price: number };
  'auth:session_expired': { reason: string };
  'notification:show': { type: 'success' | 'error' | 'info'; message: string };
}

// apps/shell/src/remotes.d.ts
declare module 'remoteCatalog/ProductCatalog' {
  import React from 'react';
  export interface CatalogProps {
    onProductSelect?: (productId: string) => void;
    basePath?: string;
  }
  const ProductCatalog: React.ComponentType<CatalogProps>;
  export default ProductCatalog;
}

declare module 'remoteCart/MiniCart' {
  import React from 'react';
  const MiniCart: React.ComponentType;
  export default MiniCart;
}
```

---

#### 4. Interface & Implementation (I)

**Host Async Boundary (`index.ts` & `bootstrap.tsx`):**
To allow Module Federation to negotiate shared dependencies before running any application code, the entry point must be an asynchronous `import('./bootstrap')`:

```typescript
// apps/shell/src/index.ts
import('./bootstrap');
```

```tsx
// apps/shell/src/bootstrap.tsx
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { RemoteErrorBoundary } from './components/RemoteErrorBoundary';

// Dynamic lazy imports from federated remotes
const RemoteCatalog = lazy(() => import('remoteCatalog/ProductCatalog'));
const RemoteCart = lazy(() => import('remoteCart/CartPage'));
const RemoteAccount = lazy(() => import('remoteAccount/AccountPage'));

const ShellApp: React.FC = () => {
  return (
    <BrowserRouter>
      <header style={{ display: 'flex', gap: '16px', padding: '16px', background: '#0f172a', color: '#fff' }}>
        <h2>Acme Portal</h2>
        <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#fff' }}>Catalog</Link>
          <Link to="/cart" style={{ color: '#fff' }}>Cart</Link>
          <Link to="/account" style={{ color: '#fff' }}>Account</Link>
        </nav>
      </header>

      <main style={{ padding: '24px' }}>
        <Routes>
          <Route
            path="/*"
            element={
              <RemoteErrorBoundary remoteName="Catalog">
                <Suspense fallback={<div>Loading Catalog Module...</div>}>
                  <RemoteCatalog basePath="/" />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
          <Route
            path="/cart/*"
            element={
              <RemoteErrorBoundary remoteName="Cart">
                <Suspense fallback={<div>Loading Cart Module...</div>}>
                  <RemoteCart />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
          <Route
            path="/account/*"
            element={
              <RemoteErrorBoundary remoteName="Account">
                <Suspense fallback={<div>Loading Account Module...</div>}>
                  <RemoteAccount />
                </Suspense>
              </RemoteErrorBoundary>
            }
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<ShellApp />);
```

---

#### 5. Optimizations & Edge Cases (O)

1. **Shared Dependency Singleton Locking:** Ensure React is configured with `singleton: true, strictVersion: true` to prevent disastrous multiple React reconciler instances running on the same DOM page.
2. **Dynamic Remote Manifests:** Hardcoding remote URLs (`http://localhost:3001/remoteEntry.js`) into build configs violates 12-factor principles. Instead, load a runtime manifest (`/api/manifest.json`) mapping remote names to their versioned S3/CloudFront URLs.

---

## 2. Module Federation Mechanics & Configuration

### Q2: How does Webpack 5 Module Federation work under the hood? Explain `remotes`, `exposes`, and `shared` configuration with singleton constraints.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Module-Federation` `Webpack` `Bundling`

**Answer:**

Module Federation enables a JavaScript application to dynamically load code from another application at runtime without npm publishing.

#### Configuration Example (Host & Remote):

```javascript
// apps/remote-catalog/webpack.config.js (The Remote)
const { ModuleFederationPlugin } = require('webpack').container;
const deps = require('./package.json').dependencies;

module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      name: 'remoteCatalog',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCatalog': './src/components/ProductCatalog.tsx',
        './ProductDetail': './src/components/ProductDetail.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
          strictVersion: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
          strictVersion: true,
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: deps['@tanstack/react-query'],
        },
      },
    }),
  ],
};
```

```javascript
// apps/shell/webpack.config.js (The Host)
const { ModuleFederationPlugin } = require('webpack').container;
const deps = require('./package.json').dependencies;

module.exports = {
  // ...
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        remoteCatalog: 'remoteCatalog@http://localhost:3001/remoteEntry.js',
        remoteCart: 'remoteCart@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react, strictVersion: true },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'], strictVersion: true },
        '@tanstack/react-query': { singleton: true, requiredVersion: deps['@tanstack/react-query'] },
      },
    }),
  ],
};
```

#### Under the Hood Mechanics:
1. **`remoteEntry.js` Generation:** Webpack creates a manifest containing a global container object (`window.remoteCatalog`). It exposes `get(module)` and `init(sharedScope)`.
2. **Shared Scope Negotiation:** Before mounting, Host and Remotes share a global table called `__webpack_share_scopes__.default`.
3. **Version Resolution:**
   - If both Host and Remote declare `react: "^18.2.0"`, they share the highest compatible version loaded first.
   - If `singleton: true` is set, only ONE instance is ever loaded into memory.
   - If `strictVersion: true` is violated (e.g. Remote requires `^19.0.0` but Host provided `18.2.0`), Webpack throws a runtime console warning/error rather than silently booting a broken app.

---

### Q3: How do you implement Module Federation in Vite projects? What are the key differences compared to Webpack?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Vite` `Module-Federation` `Rollup` `ES-Modules`

**Answer:**

Vite uses native browser ES Modules (ESM) in development and Rollup for production. Since Webpack's Module Federation is built on Webpack internal runtime chunking, Vite relies on `@originjs/vite-plugin-federation`:

```typescript
// apps/remote-catalog/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remoteCatalog',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCatalog': './src/components/ProductCatalog.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
});
```

**Key Differences:**
1. **ESM vs Webpack Runtime:** Webpack wraps federated chunks in its own global runtime closures (`__webpack_require__`). Vite produces standard native browser ESM imports.
2. **Dev Mode Caveat:** Vite's dev server (`vite dev`) serves unbundled ESM files. `@originjs/vite-plugin-federation` runs primarily against production builds (`vite build && vite preview`). For full dev HMR across federated apps, teams often use Docker or development proxy servers.

---

## 3. Monorepo Architecture (Turborepo vs Nx)

### Q4: Compare Turborepo vs Nx vs pnpm workspaces for managing enterprise React micro-frontends. How does task orchestration and computation caching work?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `Turborepo` `Nx` `Monorepo` `Build-Tools`

**Answer:**

| Feature | Turborepo | Nx | pnpm Workspaces Alone |
|---|---|---|---|
| **Philosophy** | Lightweight, configuration-over-convention, fast adoption | Comprehensive, deep enterprise tooling, code generators | Package linking only, no build orchestration |
| **Computation Cache** | Content-hash based, local & remote (Vercel Cache / self-hosted) | Advanced graph hashing, distributed task execution (DTE) | None (re-runs every time) |
| **Dependency Graph** | File-based topological ordering via `turbo.json` | Deep AST-level dependency analysis | Workspace symlinks |
| **Affected Builds** | Git SHA comparison (`--filter=...[origin/main]`) | Native `nx affected` command with project graph | `pnpm --filter ...[HEAD~1]` |
| **Learning Curve** | Low (30 minutes to configure) | Medium-High (specialized CLI, plugins, schemas) | Very Low |
| **Best Suited For** | Fast React/Next.js multi-app setups | Massive multi-framework enterprise repos (50+ apps) | Simple libraries without complex CI build chains |

#### Turborepo Pipeline Configuration (`turbo.json`):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "env": ["VITE_API_BASE_URL", "NODE_ENV"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**How Computation Caching Works:**
Turborepo creates a cryptographic hash of:
1. The git commit/file contents of the package.
2. The transitive hashes of all internal dependencies.
3. Specified environment variables (`env`).
4. Lockfile state (`pnpm-lock.yaml`).

If this hash matches a previous build stored in local disk or S3/Vercel Remote Cache, Turborepo **replays the cached stdout logs and unpacks the `dist/` directory instantly (0ms build time)**.

---

## 4. Cross-MFE Communication & State Sharing

### Q5: Why is sharing a single global state store (e.g. Redux or Zustand) across micro-frontends considered an anti-pattern? What are the modern decoupled alternatives?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `State-Architecture` `Decoupling` `Event-Bus` `BroadcastChannel`

**Answer:**

#### Why a Shared Global Store Fails in MFEs:
1. **Tight Coupling:** If Remote A and Remote B both import from a single shared Redux store, they can no longer be deployed independently. A change to an action or reducer shape in Remote A can crash Remote B in production.
2. **State Contract Governance:** Who owns the store? If Team Alpha refactors their slice, they must coordinate across all other teams—destroying team autonomy.
3. **Bundle Bloat:** Every remote must import the same store bindings and action creators.

#### The Modern Decoupled Alternatives:

```
┌─────────────────────────┐               ┌─────────────────────────┐
│     Remote Catalog      │               │       Remote Cart       │
│  (Fires Custom Event)   │               │   (Listens for Event)   │
└────────────┬────────────┘               └────────────▲────────────┘
             │                                         │
             │   window.dispatchEvent('cart:add')      │
             └────────────────────┬────────────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │    Type-Safe Window Event   │
                   │    or Custom Event Bus      │
                   └─────────────────────────────┘
```

#### Production Type-Safe Event Bus Implementation:

```typescript
// packages/event-bus/src/index.ts
export interface MfeEventMap {
  'CART_UPDATED': { itemCount: number; totalAmount: number };
  'USER_LOGGED_OUT': { timestamp: number };
  'TOAST_TRIGGERED': { message: string; severity: 'info' | 'error' };
}

export class MfeEventBus {
  static dispatch<K extends keyof MfeEventMap>(eventName: K, detail: MfeEventMap[K]): void {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true, // Crosses Shadow DOM boundaries if used
    });
    window.dispatchEvent(event);
  }

  static subscribe<K extends keyof MfeEventMap>(
    eventName: K,
    callback: (detail: MfeEventMap[K]) => void
  ): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<MfeEventMap[K]>;
      callback(customEvent.detail);
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
}
```

**Consumer in React Hook:**

```tsx
// apps/remote-cart/src/hooks/useCartEventListener.ts
import { useEffect } from 'react';
import { MfeEventBus } from '@enterprise/event-bus';

export function useCartEventListener(onUpdate: (count: number) => void) {
  useEffect(() => {
    const unsubscribe = MfeEventBus.subscribe('CART_UPDATED', (payload) => {
      onUpdate(payload.itemCount);
    });
    return unsubscribe;
  }, [onUpdate]);
}
```

---

## 5. Resilience, Fault Tolerance & Error Boundaries

### Q6: How do you build an enterprise `RemoteErrorBoundary` with circuit breaking and fallback UI so one crashed micro-app never takes down the entire application?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Error-Boundary` `Resilience` `Circuit-Breaker`

**Answer:**

```tsx
// apps/shell/src/components/RemoteErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  remoteName: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  failureCount: number;
}

export class RemoteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
    failureCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error.message || 'Remote module crashed or failed to load',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[MFE Error] Remote "${this.props.remoteName}" threw an unhandled error:`, error, errorInfo);
    
    // Log to Datadog / Sentry with explicit MFE tag
    if (window.reportErrorToTelemetry) {
      window.reportErrorToTelemetry({
        type: 'MFE_CRASH',
        remote: this.props.remoteName,
        message: error.message,
        stack: errorInfo.componentStack,
      });
    }
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      failureCount: prev.failureCount + 1,
    }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '24px',
          margin: '16px 0',
          border: '1px solid #fee2e2',
          backgroundColor: '#fef2f2',
          borderRadius: '8px',
          color: '#991b1b',
          fontFamily: 'sans-serif'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Widget Temporarily Unavailable</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            The <strong>{this.props.remoteName}</strong> component failed to load. The rest of your session is unaffected.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '6px 12px',
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry Loading
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 6. CI/CD & Independent Deployments

### Q7: How do you architect a CI/CD pipeline allowing micro-frontends to deploy independently without rebuilding the Host application? Explain runtime manifest resolution.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `CI-CD` `Deployment` `S3` `CloudFront` `Manifest`

**Answer:**

#### The Anti-Pattern: Static Host URLs
If the Host build configuration contains hardcoded URLs like:
`remoteCatalog@https://cdn.platform.com/remotes/catalog/v1.0.0/remoteEntry.js`
Then every time the Catalog team ships a patch, someone MUST rebuild and redeploy the Host container. This destroys independent deployments.

#### The Solution: Dynamic Runtime Remote Manifest

```
1. Catalog Team pushes commit
               │
               ▼
2. CI builds catalog remote to S3:
   s3://cdn/remotes/catalog/commit_abc123/remoteEntry.js
               │
               ▼
3. CI updates central DynamoDB / KV / Redis manifest:
   {
     "catalog": "https://cdn.platform.com/remotes/catalog/commit_abc123/remoteEntry.js"
   }
               │
               ▼
4. Host Shell fetches /manifest.json at runtime
               │
               ▼
5. Webpack dynamically initializes remotes from manifest URLs
```

#### Dynamic Remote Loader Hook:

```typescript
// apps/shell/src/utils/dynamicRemoteLoader.ts

declare const __webpack_init_sharing__: (scope: string) => Promise<void>;
declare const __webpack_share_scopes__: { default: any };

export async function loadDynamicRemote(remoteName: string, remoteUrl: string) {
  // 1. Inject remote script tag dynamically if not present
  if (!document.querySelector(`script[src="${remoteUrl}"]`)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = remoteUrl;
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load remote script: ${remoteUrl}`));
      document.head.appendChild(script);
    });
  }

  // 2. Initialize sharing scope
  await __webpack_init_sharing__('default');
  
  // 3. Initialize container
  const container = (window as any)[remoteName];
  if (!container) throw new Error(`Container ${remoteName} not found on window`);
  
  await container.init(__webpack_share_scopes__.default);
  return container;
}
```

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q8: "What happens if Remote A is compiled with React 18 and Host Shell is compiled with React 19?"

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `React-Version` `Singleton` `Peer-Dependencies`

**Answer:**
If `singleton: true` is configured:
- Module Federation detects incompatible major semver versions (`^18.0.0` vs `^19.0.0`).
- Webpack issues a console warning: `Unsatisfied version 18.x.x from remote while host requires 19.x.x`.
- If `strictVersion: true` is enabled, the remote execution **fails immediately to prevent undefined hook runtime crashes**.
- If `strictVersion: false` is set, Webpack will force both to share whichever copy was loaded first. This will cause catastrophic bugs: React 19 features (like `useActionState`, Actions, ref-as-prop) will crash when executed inside the React 18 reconciler.

**Architectural Prevention:**
Platform teams must enforce an enterprise policy: All remotes share standard peer dependencies via a single monorepo `tsconfig` and package version matrix.

---

### Q9: "How do you prevent CSS style pollution between different micro-frontends?"

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `CSS` `Isolation` `Shadow-DOM` `CSS-Modules`

**Answer:**
Global CSS classes like `.btn` or `.card` from Remote A will override classes in Remote B if loaded into the same DOM `<head>`.

**Solutions:**
1. **CSS Modules or Vanilla Extract (Recommended):** Generates scoped class hashes at build time (e.g. `.CatalogCard__btn_a8f9d`).
2. **PostCSS Prefixing:** Automatically prefix all classes inside Remote A with a unique namespace: `.mfe-catalog .btn`.
3. **Shadow DOM:** Encapsulate remote mounting inside a Shadow Root (`element.attachShadow({ mode: 'open' })`). This provides 100% style isolation, but breaks global CSS variable inheritance and causes modals/tooltips to get clipped inside shadow containers.
