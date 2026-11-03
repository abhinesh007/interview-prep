# The Enterprise React Architect's Guide: Modern Client-Side Architecture (Vite + React)

> **Document Classification:** Architect-Level Handbook & Technical Blueprint  
> **Target Runtime & Tooling:** React 18/19, TypeScript (Strict), Vite, Modern SPA Ecosystem  
> **Focus:** High-Level Design (HLD), Low-Level Design (LLD), Component Patterns, State Machines, React Engine Internals, Performance Engineering, and Production Hardening.

---

## Table of Contents

1. [Architectural Tenets & Decision Framework](#1-architectural-tenets--decision-framework)
   - 1.1 Guiding Principles (Clean Architecture, Screaming Architecture, Immutability)
   - 1.2 Technology Stack Selection Matrix
2. [Phase 1: Project Scaffolding & Tooling Infrastructure](#2-phase-1-project-scaffolding--tooling-infrastructure)
   - 2.1 Enterprise Vite Configuration (Chunking, Aliasing, Compression)
   - 2.2 Ultra-Strict TypeScript Configuration (`tsconfig.json`)
   - 2.3 Static Analysis, Linting & Git Hooks
3. [Phase 2: High-Level Design (HLD) & Structural Architecture](#3-phase-2-high-level-design-hld--structural-architecture)
   - 3.1 Feature-Sliced & Domain-Driven Modular Layout
   - 3.2 Architectural Boundary Enforcement & Dependency Rules
   - 3.3 Clean Architecture Layering in Frontend
4. [Phase 3: Low-Level Design (LLD) & Component Design Patterns](#4-phase-3-low-level-design-lld--component-design-patterns)
   - 4.1 Compound Component Pattern (Accessible, Decoupled)
   - 4.2 Headless Component & Custom Hook Separation
   - 4.3 Polymorphic Components with Strict Generic Typings
   - 4.4 Higher-Order Components (HOC) vs. Composition
   - 4.5 Inversion of Control via Slot & Render Prop Patterns
5. [Phase 4: State Architecture & State Engine Taxonomy](#5-phase-4-state-architecture--state-engine-taxonomy)
   - 5.1 The Four Spheres of State (Server, Global, URL, Local)
   - 5.2 Server State Architecture (TanStack Query Factory Pattern & Invalidation)
   - 5.3 Global Client State Architecture (Zustand Slice Pattern & Atomic Selectors)
   - 5.4 URL as Single Source of Truth
   - 5.5 State Machine Architecture for Complex UI Flows
6. [Phase 5: Deep Dive into React Runtime, Methods & Hooks](#6-phase-5-deep-dive-into-react-runtime-methods--hooks)
   - 6.1 React Fiber, Reconciliation, & Concurrent Mode Mechanics
   - 6.2 Hooks Lifecycle, Stale Closures & Memory Leak Prevention
   - 6.3 State & Synchronization: `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useInsertionEffect`
   - 6.4 Referential Integrity & Computation: `useMemo`, `useCallback`, `useRef`, `useImperativeHandle`
   - 6.5 Concurrent Transitions: `useTransition`, `useDeferredValue`
   - 6.6 External Subscription Engine: `useSyncExternalStore`
   - 6.7 Modern React 19 Additions: `useActionState`, `useOptimistic`, `use` API
7. [Phase 6: Client-Side Routing & Navigation Architecture](#7-phase-6-client-side-routing--navigation-architecture)
   - 7.1 Route Hierarchy & Code Splitting
   - 7.2 Route Loaders & Data Prefetching
   - 7.3 Multi-Tier Route Guarding & Role-Based Access Control (RBAC)
   - 7.4 Stale Chunk Recovery & Resilient Navigation
8. [Phase 7: Network & Resilient Data Layer](#8-phase-7-network--resilient-data-layer)
   - 8.1 Typed HTTP Client Adapter
   - 8.2 Token Refresh Lock & Concurrency Mutex
   - 8.3 Request Deduplication & Exponential Backoff Retry Policy
   - 8.4 Runtime Schema Validation with Zod
9. [Phase 8: Performance Engineering, Profiling & Core Web Vitals](#9-phase-8-performance-engineering-profiling--core-web-vitals)
   - 9.1 Core Web Vitals in Single-Page Applications (INP, LCP, CLS)
   - 9.2 Virtualization of Massive Datasets
   - 9.3 Profiling Renders, Flamegraphs & Re-render Elimination
   - 9.4 Memory Leak Mitigation
10. [Phase 9: Enterprise Quality, Testing & Security](#10-phase-9-enterprise-quality-testing--security)
    - 10.1 Testing Pyramid: Unit, Hook, Component & Integration Testing (Vitest + RTL + MSW)
    - 10.2 Frontend Security (XSS, CSRF, CSP, Secure Storage)
11. [Phase 10: Production Deployment & Observability](#11-phase-10-production-deployment--observability)
    - 11.1 High-Performance Nginx SPA Configuration & Cache Invalidation
    - 11.2 Error Boundary Hierarchy & Telemetry Logging
    - 11.3 Architectural Readiness Checklist for Production Gatekeeping

---

## 1. Architectural Tenets & Decision Framework

### 1.1 Guiding Principles

When architecting an enterprise-grade client-side application, software architects must prevent architectural drift, manage cognitive load, and optimize for long-term maintainability.

```
+-------------------------------------------------------------------------+
|                         CLEAN ARCHITECTURE                             |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   | Presentation (React Components, Hooks, Layouts)                |   |
|   |   +---------------------------------------------------------+   |   |
|   |   | Application (State Stores, Controllers, Use Cases)       |   |   |
|   |   |   +-------------------------------------------------+   |   |   |
|   |   |   | Domain (Entities, Pure Business Logic, Models)  |   |   |   |
|   |   |   +-------------------------------------------------+   |   |   |
|   |   | Infrastructure (HTTP Client, Storage, WebSockets)       |   |   |
|   |   +---------------------------------------------------------+   |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

1. **Screaming Architecture**: The directory structure should immediately communicate the business domain (e.g., `features/billing`, `features/analytics`), not the underlying technical framework (not simply `components/`, `reducers/`).
2. **Separation of Concerns (SoC)**:
   - **Presentation Layer**: How things look. Pure UI, decoupled from domain storage protocols.
   - **Domain Layer**: Core business rules, data schemas, calculations. Framework-agnostic pure TypeScript.
   - **Infrastructure Layer**: Third-party APIs, HTTP adapters, storage drivers.
3. **Unidirectional & Predictable Data Flow**: State always flows down via props or targeted selectors; events always flow up via callbacks, actions, or dispatchers.
4. **Referential & Immutable Predictability**: State updates must never mutate existing memory references directly; structural sharing guarantees deterministic shallow-equality checks across React's reconciliation engine.
5. **Fail-Closed & Defensive Resilience**: Missing data, network drops, or corrupt payloads must trigger controlled error boundaries and fallback states rather than unhandled White-Screen-of-Death crashes.

---

### 1.2 Technology Stack Selection Matrix

| Architectural Capability | Selected Standard | Alternatives Evaluated | Architectural Trade-Off Rationale |
| :--- | :--- | :--- | :--- |
| **Bundler & Dev Server** | **Vite (Rollup/esbuild)** | Webpack 5, Rspack, Turbopack | Sub-second HMR via native ESM; battle-tested Rollup production ecosystem; extensive plugin ecosystem; zero cold-start lag. |
| **Language System** | **TypeScript (Strict Mode)** | Vanilla JavaScript, JSDoc | Eliminates whole classes of runtime type errors; mandatory for self-documenting architectural contracts across large teams. |
| **Server State Management** | **TanStack Query (v5)** | SWR, RTK Query | Superior cache synchronization, fine-grained garbage collection (`gcTime`), query key factories, structural sharing, and suspense integrations. |
| **Global Client State** | **Zustand** | Redux Toolkit, MobX, Recoil, Jotai | Microscopic footprint (~1.2kB), zero boilerplate, avoids Context API re-render cascades, un-opinionated slice patterns, clean outside-of-React access. |
| **Client Routing** | **React Router v6/v7 (Data APIs)** | TanStack Router, Wouter | Industry standard, robust nested routing, native loader/action data-lifecycle APIs, battle-tested ecosystem support. |
| **UI Component Primitives** | **Radix UI / Headless UI + Tailwind** | Material UI (MUI), Ant Design | Eliminates CSS runtime overhead, provides 100% accessible WAI-ARIA compliant foundations, full style autonomy without design lock-in. |
| **Testing Harness** | **Vitest + RTL + MSW** | Jest + Enzyme / Cypress Component | Vitest shares the identical transform pipeline as Vite (zero config duplication); MSW enables network-level interception without mocking fetch/axios implementations. |

---

## 2. Phase 1: Project Scaffolding & Tooling Infrastructure

### 2.1 Enterprise Vite Configuration

An enterprise Vite configuration must handle build optimization, chunk splitting, path aliasing, bundle analysis, and strict environment variable sanitation.

```typescript
// vite.config.ts
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        // Enables React 19 / Fast Refresh optimizations
        babel: {
          plugins: mode === 'production' ? ['transform-react-remove-prop-types'] : [],
        },
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
      }),
      mode === 'analyze' &&
        (visualizer({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
        }) as PluginOption),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@app': path.resolve(__dirname, './src/app'),
        '@features': path.resolve(__dirname, './src/features'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },

    build: {
      target: 'es2022',
      outDir: 'dist',
      assetsDir: 'assets',
      cssCodeSplit: true,
      sourcemap: mode !== 'production',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Deterministic manual chunking strategy to maximize CDN cache hit ratios
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'vendor-react-core';
              }
              if (id.includes('react-router') || id.includes('@remix-run')) {
                return 'vendor-router';
              }
              if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
                return 'vendor-state';
              }
              if (id.includes('lucide-react') || id.includes('@radix-ui')) {
                return 'vendor-ui-primitives';
              }
              return 'vendor-libs'; // General third-party dependencies
            }
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
    },

    server: {
      port: 3000,
      strictPort: true,
      host: true,
    },
  };
});
```

#### Environment Variable Validation (`src/shared/config/env.ts`)
Avoid referencing `import.meta.env` dynamically across features. Parse and validate environment configurations at startup using Zod:

```typescript
// src/shared/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url('VITE_API_BASE_URL must be a valid HTTP(S) URL'),
  VITE_APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VITE_ENABLE_MOCKING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables detected:', parsedEnv.error.format());
  throw new Error('Application bootstrap terminated due to invalid environment configuration.');
}

export const ENV = parsedEnv.data;
```

---

### 2.2 Ultra-Strict TypeScript Configuration

The TypeScript compiler configuration must eliminate implicit casts, missing index checks, and unsafe property access.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolvePackageJsonExports": true,
    "resolvePackageJsonImports": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Ultra-Strict Type-Checking Options */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,

    /* Path Aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app/*": ["src/app/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 3. Phase 2: High-Level Design (HLD) & Structural Architecture

### 3.1 Feature-Sliced & Domain-Driven Modular Layout

Traditional horizontal grouping (all components together, all hooks together) fails at scale. Instead, adopt a **Feature-Driven Modular Architecture**:

```
src/
├── app/                        # Application Composition Layer
│   ├── providers/              # Global Providers (Query, Theme, Auth, Router)
│   ├── routes/                 # Route declarations & route boundaries
│   ├── styles/                 # Global styles, variables, reset
│   └── App.tsx                 # Root application entry
│
├── features/                   # Self-contained business domains
│   ├── authentication/
│   │   ├── api/                # Feature-specific API endpoints & queries
│   │   ├── components/         # Feature-specific UI components
│   │   ├── hooks/              # Feature-specific custom hooks
│   │   ├── stores/             # Feature-specific Zustand store slices
│   │   ├── types/              # Feature-specific data contracts
│   │   ├── utils/              # Feature-specific helper logic
│   │   └── index.ts            # Public API (Strict boundary encapsulation)
│   ├── billing/
│   │   ├── ...
│   │   └── index.ts
│   └── project-management/
│       ├── ...
│       └── index.ts
│
├── shared/                     # Reusable, domain-agnostic building blocks
│   ├── api/                    # Core Axios/Fetch client, interceptors
│   ├── components/             # Design System primitives (Button, Modal, Input)
│   ├── config/                 # Env validation, global constants
│   ├── hooks/                  # Generic utilities (useDebounce, useMediaQuery)
│   ├── types/                  # Common primitives (Result, PaginatedResult)
│   └── utils/                  # Pure utility functions (formatting, dates)
│
└── main.tsx                    # React root instantiation (createRoot)
```

### 3.2 Architectural Boundary Enforcement

To prevent spaghetti dependencies across feature modules:

```
[features/billing] ----------> [features/auth (PUBLIC API via index.ts)]
        |                                        |
        v                                        v
[shared/components] <-------------------- [shared/api]
```

#### Boundary Rules:
1. **Public API Contract**: Modules within `features/` must only expose functionality via their root `index.ts`. Deep imports into internal files (e.g., `@features/billing/components/InternalCard.tsx`) are forbidden.
2. **Directional Dependency**:
   - `app/` can import from `features/` and `shared/`.
   - `features/` can import from `shared/` and other `features/` **only** via their public `index.ts`.
   - `shared/` must **never** import from `features/` or `app/`.
3. **No Circular Feature Dependencies**: If `billing` needs `projects` and `projects` needs `billing`, the shared logic must be extracted to a separate domain or coordinated via the `app/` layer.

---

### 3.3 Clean Architecture Layering in Frontend

```
+--------------------------------------------------------------------+
| 1. DOMAIN LAYER (Zero Framework Dependency)                        |
|    - Pure TS entities, schemas, state machine definitions          |
|    - E.g., User, Invoice, calculateTax(amount, region)             |
+--------------------------------------------------------------------+
                                 |
                                 v
+--------------------------------------------------------------------+
| 2. APPLICATION / INFRASTRUCTURE LAYER                              |
|    - HTTP adapters, WebSockets, Storage engines, TanStack queries  |
|    - E.g., useInvoiceQuery(), AuthApiClient, TokenStorage          |
+--------------------------------------------------------------------+
                                 |
                                 v
+--------------------------------------------------------------------+
| 3. PRESENTATION LAYER (React Framework Engine)                     |
|    - Smart (Container) Components & Dumb (Presentational) Views    |
|    - E.g., InvoiceTableContainer -> InvoiceTablePresentational     |
+--------------------------------------------------------------------+
```

---

## 4. Phase 3: Low-Level Design (LLD) & Component Design Patterns

### 4.1 Compound Component Pattern (Accessible & Decoupled)

The Compound Component pattern shares implicit state between a parent container and child sub-components, providing flexibility in UI composition while avoiding prop drilling.

```tsx
// src/shared/components/Tabs/Tabs.tsx
import React, { createContext, useContext, useState, useId, type ReactNode } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`${componentName} must be rendered within a <Tabs> container.`);
  }
  return context;
}

export interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onTabChange?: (tabId: string) => void;
}

export function Tabs({ defaultTab, children, onTabChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultTab);
  const baseId = useId();

  const setActiveTab = (tabId: string) => {
    setActiveTabState(tabId);
    onTabChange?.(tabId);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className="flex flex-col w-full" data-component="tabs">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  ariaLabel: string;
}

export function TabList({ children, ariaLabel }: TabListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex border-b border-neutral-200 dark:border-neutral-800 space-x-2"
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  id: string;
  children: ReactNode;
}

export function TabTrigger({ id, children }: TabTriggerProps) {
  const { activeTab, setActiveTab, baseId } = useTabsContext('TabTrigger');
  const isSelected = activeTab === id;
  const triggerId = `${baseId}-trigger-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  return (
    <button
      id={triggerId}
      role="tab"
      type="button"
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
        isSelected
          ? 'border-primary-500 text-primary-600'
          : 'border-transparent text-neutral-500 hover:text-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  id: string;
  children: ReactNode;
}

export function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab, baseId } = useTabsContext('TabPanel');
  const isSelected = activeTab === id;
  const triggerId = `${baseId}-trigger-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  if (!isSelected) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={triggerId}
      tabIndex={0}
      className="py-4 focus:outline-none"
    >
      {children}
    </div>
  );
}

// Composition export
Tabs.List = TabList;
Tabs.Trigger = TabTrigger;
Tabs.Panel = TabPanel;
```

---

### 4.2 Headless Component & Custom Hook Separation

Isolate all stateful interaction logic and event orchestration inside a Headless Hook. The presentation component only renders DOM markup based on the hook's contract.

```typescript
// src/features/authentication/hooks/useLoginForm.ts
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useAuthMutation } from '../api/useAuthMutation';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const [values, setValues] = useState<LoginFormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const { mutate, isPending, error: serverError } = useAuthMutation();

  const handleChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear validation error on type
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = loginSchema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof LoginFormData;
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    mutate(result.data);
  };

  return {
    values,
    errors,
    isSubmitting: isPending,
    serverError: serverError ? serverError.message : null,
    handleChange,
    handleSubmit,
  };
}
```

```tsx
// src/features/authentication/components/LoginForm.tsx
import { useLoginForm } from '../hooks/useLoginForm';

export function LoginForm() {
  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-md w-full">
      {serverError && (
        <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email Address</label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input
          id="password"
          type="password"
          value={values.password}
          onChange={handleChange('password')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-red-600">{errors.password}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-primary-600 text-white rounded font-medium disabled:opacity-50"
      >
        {isSubmitting ? 'Authenticating...' : 'Sign In'}
      </button>
    </form>
  );
}
```

---

### 4.3 Polymorphic Components with Strict Generic Typings

A polymorphic component allows consumers to control the underlying HTML element or React Component via an `as` prop, preserving complete type safety and matching HTML attributes.

```tsx
// src/shared/components/Button/Button.tsx
import React, { forwardRef, type ComponentPropsWithRef, type ElementType } from 'react';

type AsProp<C extends ElementType> = {
  as?: C;
};

type PropsToOmit<C extends ElementType, P> = keyof (AsProp<C> & P);

export type PolymorphicComponentProp<C extends ElementType, Props = {}> = React.PropsWithChildren<
  Props & AsProp<C>
> &
  Omit<ComponentPropsWithRef<C>, PropsToOmit<C, Props>>;

export interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

type ButtonComponent = <C extends ElementType = 'button'>(
  props: PolymorphicComponentProp<C, BaseButtonProps>
) => React.ReactNode;

export const Button: ButtonComponent = forwardRef(
  <C extends ElementType = 'button'>(
    { as, children, variant = 'primary', size = 'md', className = '', ...restProps }: PolymorphicComponentProp<C, BaseButtonProps>,
    ref?: React.ComponentPropsWithRef<C>['ref']
  ) => {
    const Component = as || 'button';

    const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-colors';
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    }[variant];

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
    }[size];

    return (
      <Component
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...restProps}
      >
        {children}
      </Component>
    );
  }
);
```

#### Usage Example:
```tsx
// Renders as HTML button
<Button variant="primary" onClick={() => console.log('clicked')}>
  Native Button
</Button>

// Polymorphic: Renders as HTML anchor with typed href attribute
<Button as="a" href="/dashboard" target="_blank" variant="secondary">
  Anchor Link
</Button>
```

---

## 5. Phase 4: State Architecture & State Engine Taxonomy

### 5.1 The Four Spheres of State

State management failures stem from treating all state identically. An enterprise architect partitions state into four distinct spheres:

```
+---------------------------------------------------------------------------------------+
|                                    SPHERES OF STATE                                   |
+--------------------------+----------------------------+-------------------------------+
| State Sphere             | Primary Owner              | Target Characteristics        |
+--------------------------+----------------------------+-------------------------------+
| 1. Server State          | TanStack Query v5          | Async, remote, cached, stale  |
| 2. Global Client State   | Zustand                    | Synchronous, shared across UI |
| 3. URL State             | React Router Search Params | Navigational, shareable, deep |
| 4. Local Ephemeral State | useState / useReducer      | Isolated to single component  |
+--------------------------+----------------------------+-------------------------------+
```

---

### 5.2 Server State Architecture: TanStack Query Factory Pattern

Never hardcode string query keys. Use a **Query Key Factory** to ensure deterministic invalidation and type safety across query configurations.

```typescript
// src/features/projects/api/projectQueries.ts
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api/apiClient';
import type { Project, CreateProjectDTO } from '../types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: { status?: string; page: number }) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export const projectQueries = {
  list: (filters: { status?: string; page: number }) =>
    queryOptions({
      queryKey: projectKeys.list(filters),
      queryFn: async ({ signal }) => {
        const response = await apiClient.get<Project[]>('/projects', {
          params: filters,
          signal,
        });
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,    // 30 minutes in memory cache
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: projectKeys.detail(id),
      queryFn: async ({ signal }) => {
        const response = await apiClient.get<Project>(`/projects/${id}`, { signal });
        return response.data;
      },
      staleTime: 1000 * 60 * 10,
    }),
};

// Optimistic Mutation Implementation
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newProject: CreateProjectDTO) => {
      const response = await apiClient.post<Project>('/projects', newProject);
      return response.data;
    },
    // Optimistic Update implementation
    onMutate: async (newProject) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(projectKeys.lists());

      // Optimistically insert
      queryClient.setQueriesData({ queryKey: projectKeys.lists() }, (old: Project[] | undefined) => {
        if (!old) return [];
        const optimisticProject: Project = {
          ...newProject,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
        };
        return [optimisticProject, ...old];
      });

      return { previousProjects };
    },
    onError: (_err, _newProject, context) => {
      // Rollback on failure
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      // Re-sync with server
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
```

---

### 5.3 Global Client State: Zustand Slice Pattern

Avoid storing server data inside Zustand. Use Zustand solely for true client-side state: UI controls, modals, user preferences, and transient multi-step wizard state.

```typescript
// src/app/stores/useAppStore.ts
import { create, type StateCreator } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

// Slice 1: UI Shell Slice
export interface UISlice {
  isSidebarOpen: boolean;
  activeTheme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const createUISlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UISlice
> = (set) => ({
  isSidebarOpen: true,
  activeTheme: 'system',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen }), false, 'ui/toggleSidebar'),
  setTheme: (theme) => set({ activeTheme: theme }, false, 'ui/setTheme'),
});

// Slice 2: Notification Center Slice
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface NotificationSlice {
  notifications: Notification[];
  pushNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

const createNotificationSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  NotificationSlice
> = (set) => ({
  notifications: [],
  pushNotification: (notification) =>
    set(
      (state) => ({
        notifications: [...state.notifications, { ...notification, id: crypto.randomUUID() }],
      }),
      false,
      'notifications/push'
    ),
  dismissNotification: (id) =>
    set(
      (state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }),
      false,
      'notifications/dismiss'
    ),
});

// Unified Store Union
export type AppStore = UISlice & NotificationSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createUISlice(...a),
        ...createNotificationSlice(...a),
      }),
      {
        name: 'app-storage',
        storage: createJSONStorage(() => localStorage),
        // Only persist UI preference, omit notifications from persistence
        partialize: (state) => ({ activeTheme: state.activeTheme, isSidebarOpen: state.isSidebarOpen }),
      }
    )
  )
);

// High-Performance Atomic Selectors (Avoids re-renders when other slices change)
export const useSidebarOpen = () => useAppStore((state) => state.isSidebarOpen);
export const useActiveTheme = () => useAppStore((state) => state.activeTheme);
export const useNotifications = () => useAppStore((state) => state.notifications);
```

---

## 6. Phase 5: Deep Dive into React Runtime, Methods & Hooks

### 6.1 React Fiber, Reconciliation & Concurrent Mode Mechanics

```
               [Fiber Root Node]
                       |
               [App Fiber Node]
               /              \
    [Sidebar Fiber]       [Main Content Fiber]
                                   |
                          [ProjectList Fiber]
                          (memoizedProps vs pendingProps)
```

1. **Fiber Architecture**: Every React element is converted into a `FiberNode` (a unit of work). A Fiber contains:
   - `tag`: Identifies component type (Function, HostComponent, ContextProvider).
   - `stateNode`: Reference to the DOM node or class instance.
   - `memoizedState`: Singly-linked list of hook states (`useState`, `useEffect`, etc.).
   - `child`, `sibling`, `return`: Pointers defining the Fiber tree structure without recursive stack limits.
2. **Double Buffering Work Pool**:
   - React maintains two trees simultaneously: **Current Tree** (what is visible on screen) and **WorkInProgress (WIP) Tree** (being constructed asynchronously during the render phase).
   - Once the WIP tree completes reconciliation without interruption, React swaps the root pointer in a synchronous commit phase.
3. **Reconciliation Heuristics (Diffing Algorithm)**:
   - Elements of different types tear down the subtree entirely.
   - Elements with stable keys are matched and reordered rather than destroyed.
   - Dynamic indexes used as keys break reconciliation during deletion/prepend, causing state leaks across siblings.

---

### 6.2 Hooks Lifecycle, Stale Closures & Memory Leaks

Hooks rely on the exact order of execution. They are stored as a singly-linked list on the Fiber's `memoizedState`.

```
FiberNode.memoizedState
   │
   ▼
[Hook 1: useState] ──next──► [Hook 2: useEffect] ──next──► [Hook 3: useMemo] ──next──► null
```

#### The Stale Closure Anti-Pattern & Solution

```typescript
// ❌ ANTI-PATTERN: Stale Closure
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // 'count' is closed over at time 0; this will forever increment 0 to 1!
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []); // Missing count dependency

  return <div>{count}</div>;
}

// ✅ ARCHITECTURAL FIX: Functional State Update OR useReducer
function CounterFixed() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // Receives current fiber state at runtime
      setCount((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []); // Safe empty dependency array

  return <div>{count}</div>;
}
```

---

### 6.3 State & Synchronization: Deep Dive

#### Execution Order of Effects

```
1. Component Renders (Pure calculation, Virtual DOM / Fiber creation)
2. React Commits changes to the Real DOM
3. useInsertionEffect runs (Synchronous - specifically for CSS-in-JS injection before style calc)
4. Layout calculations & DOM reflows
5. useLayoutEffect runs (Synchronous - before browser paint, blocks visual update)
6. Browser Paints the screen
7. useEffect runs (Asynchronous - after paint, non-blocking)
```

```tsx
import { useEffect, useLayoutEffect, useInsertionEffect, useRef, useState } from 'react';

export function VisualMeasurementComponent() {
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // 1. useInsertionEffect: Runs before any DOM mutations are read
  useInsertionEffect(() => {
    // Exclusively used for injecting dynamic <style> tags prior to layout calculation
  }, []);

  // 2. useLayoutEffect: Prevents visual flickering when measuring DOM
  useLayoutEffect(() => {
    if (boxRef.current) {
      // Synchronously measures and updates state before the screen is painted
      const measuredRect = boxRef.current.getBoundingClientRect();
      setWidth(measuredRect.width);
    }
  }, []); // Runs synchronously after DOM mutation, prior to browser paint

  // 3. useEffect: Normal asynchronous orchestration
  useEffect(() => {
    const controller = new AbortController();

    async function reportTelemetry() {
      try {
        await fetch('/api/telemetry', { signal: controller.signal });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
        }
      }
    }

    reportTelemetry();

    // Cleanup phase: mandatory for preventing memory leaks
    return () => {
      controller.abort();
    };
  }, []);

  return <div ref={boxRef}>Current Measured Width: {width}px</div>;
}
```

---

### 6.4 Referential Integrity: `useMemo`, `useCallback`, `useRef`, `useImperativeHandle`

#### Rules of Engagement for Memoization:
1. Do not wrap cheap scalar operations in `useMemo` (e.g., `useMemo(() => a + b, [a, b])`). The memory overhead of closures and dependency array comparisons exceeds the recalculation cost.
2. Use `useMemo` when:
   - Calculating computationally expensive algorithms ($O(N \log N)$ or greater over large lists).
   - Preserving **referential equality** for objects passed as dependencies to child components wrapped in `React.memo` or into custom hook dependency arrays.
3. Use `useCallback` exclusively to stabilize function references passed to optimized children.

```tsx
// src/shared/components/DataTable/DataTable.tsx
import React, { memo, useCallback, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';

export interface DataTableHandle {
  scrollToIndex: (index: number) => void;
  resetSelection: () => void;
}

interface Item {
  id: string;
  value: number;
}

interface DataTableProps {
  items: Item[];
  onItemSelect: (id: string) => void;
}

export const DataTable = memo(
  forwardRef<DataTableHandle, DataTableProps>(({ items, onItemSelect }, ref) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Expose explicit imperative handle without leaking raw DOM nodes
    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number) => {
          const target = listRef.current?.children[index] as HTMLElement | undefined;
          target?.scrollIntoView({ behavior: 'smooth' });
        },
        resetSelection: () => {
          // Perform imperative clear
        },
      }),
      []
    );

    // Expensive computation memoization
    const aggregateTotal = useMemo(() => {
      return items.reduce((acc, curr) => acc + curr.value, 0);
    }, [items]);

    return (
      <div>
        <p>Total Aggregate: {aggregateTotal}</p>
        <div ref={listRef} className="h-64 overflow-y-auto">
          {items.map((item) => (
            <Row key={item.id} item={item} onSelect={onItemSelect} />
          ))}
        </div>
      </div>
    );
  })
);

// Child row wrapped in React.memo to respect referential equality of onSelect
const Row = memo(({ item, onSelect }: { item: Item; onSelect: (id: string) => void }) => {
  return (
    <div onClick={() => onSelect(item.id)} className="p-2 cursor-pointer hover:bg-neutral-100">
      Item {item.id}: {item.value}
    </div>
  );
});
```

---

### 6.5 Concurrent Transitions: `useTransition` and `useDeferredValue`

React 18 Concurrent features differentiate between **Urgent Updates** (typing, clicking, discrete hardware input) and **Non-Urgent / Transition Updates** (filtering large lists, rendering charts, switching tab panels).

```tsx
// src/features/search/components/SearchEngine.tsx
import { useState, useTransition, useDeferredValue, useMemo } from 'react';

export function SearchEngine({ rawDataset }: { rawDataset: string[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Alternative: useDeferredValue creates a lagged copy that allows high-priority renders to interrupt
  const deferredQuery = useDeferredValue(searchQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. URGENT: Update input value immediately so user feels zero input latency
    const value = e.target.value;
    setSearchQuery(value);
  };

  // 2. NON-URGENT: Heavy list filtering uses deferred value
  const filteredResults = useMemo(() => {
    if (!deferredQuery) return [];
    return rawDataset.filter((item) =>
      item.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [rawDataset, deferredQuery]);

  const isStale = searchQuery !== deferredQuery;

  return (
    <div>
      <input
        type="search"
        value={searchQuery}
        onChange={handleInputChange}
        placeholder="Type to filter..."
        className="border p-2 rounded w-full"
      />

      {/* Visual indication that a transition render is processing in background */}
      {(isPending || isStale) && (
        <span className="text-xs text-neutral-400">Updating list...</span>
      )}

      <ul className={`transition-opacity duration-200 ${isStale ? 'opacity-50' : 'opacity-100'}`}>
        {filteredResults.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

### 6.6 External Subscription Engine: `useSyncExternalStore`

When reading from non-React state stores (browser APIs, WebSockets, custom event emitters), `useEffect` + `useState` causes **Tearing** under Concurrent Mode (different parts of the UI render with different versions of the store state). `useSyncExternalStore` guarantees atomic, tearing-free reads.

```typescript
// src/shared/hooks/useNetworkStatus.ts
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Conservative fallback for SSR / Hydration safety
}

export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

---

### 6.7 Modern React 19 Additions

React 19 introduces direct native primitives for asynchronous transitions and actions:

```tsx
// src/features/todos/components/TodoManager.tsx
import { useActionState, useOptimistic } from 'react';

interface Todo {
  id: string;
  title: string;
}

async function updateTodoAction(previousState: Todo[], formData: FormData): Promise<Todo[]> {
  const title = formData.get('title') as string;
  // Execute async persistence
  const response = await fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  const savedTodo: Todo = await response.json();
  return [...previousState, savedTodo];
}

export function TodoManager({ initialTodos }: { initialTodos: Todo[] }) {
  // 1. useActionState manages async lifecycle, pending state, and error handling natively
  const [todos, formAction, isPending] = useActionState(updateTodoAction, initialTodos);

  // 2. useOptimistic allows instant UI updates while the action runs
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (currentTodos, newTitle: string) => [
      ...currentTodos,
      { id: `optimistic-${Date.now()}`, title: newTitle },
    ]
  );

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get('title') as string;
    setOptimisticTodos(title);
    await formAction(formData);
  };

  return (
    <div>
      <form action={handleSubmit}>
        <input name="title" required disabled={isPending} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Add Task'}
        </button>
      </form>

      <ul>
        {optimisticTodos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 7. Phase 6: Client-Side Routing & Navigation Architecture

### 7.1 Route Hierarchy & Lazy Splitting

```tsx
// src/app/routes/router.tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { RootLayout } from '@app/components/RootLayout';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { FullPageLoadingSpinner } from '@shared/components/Feedback/FullPageLoadingSpinner';

// Lazy-load feature boundaries
const DashboardHome = lazy(() =>
  import('@features/dashboard').then((m) => ({ default: m.DashboardHome }))
);
const ProjectList = lazy(() =>
  import('@features/projects').then((m) => ({ default: m.ProjectList }))
);
const ProjectDetail = lazy(() =>
  import('@features/projects').then((m) => ({ default: m.ProjectDetail }))
);
const LoginView = lazy(() =>
  import('@features/authentication').then((m) => ({ default: m.LoginView }))
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<FullPageLoadingSpinner />}>
            <LoginView />
          </Suspense>
        ),
      },
      {
        element: <ProtectedRoute requiredRole={['ADMIN', 'MEMBER']} />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<FullPageLoadingSpinner />}>
                <DashboardHome />
              </Suspense>
            ),
          },
          {
            path: 'projects',
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<FullPageLoadingSpinner />}>
                    <ProjectList />
                  </Suspense>
                ),
              },
              {
                path: ':projectId',
                element: (
                  <Suspense fallback={<FullPageLoadingSpinner />}>
                    <ProjectDetail />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <div>404: Not Found</div>,
      },
    ],
  },
]);
```

---

### 7.2 Multi-Tier Route Guarding & Role-Based Access Control (RBAC)

```tsx
// src/app/routes/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '@features/authentication';
import { FullPageLoadingSpinner } from '@shared/components/Feedback/FullPageLoadingSpinner';

interface ProtectedRouteProps {
  requiredRole?: string[];
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthSession();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    // Preserve attempted destination for seamless redirection post-login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

---

## 8. Phase 7: Network & Resilient Data Layer

### 8.1 Resilient HTTP Client & Token Refresh Mutex

Handling expired JWT tokens across concurrent API calls requires a concurrency lock (mutex) to avoid triggering multiple simultaneous refresh requests.

```typescript
// src/shared/api/apiClient.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ENV } from '@shared/config/env';

export const apiClient = axios.create({
  baseURL: ENV.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Mutex & Queue management for atomic JWT refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Concurrency-Safe Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh token itself failed; force logout
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Mutex locked: Queue outgoing request until token resolution
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string }>(
          `${ENV.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.accessToken;
        localStorage.setItem('access_token', newAccessToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 9. Phase 8: Performance Engineering, Profiling & Core Web Vitals

### 9.1 Core Web Vitals in Single-Page Applications

1. **Interaction to Next Paint (INP)**: Measures responsiveness to user inputs (clicks, keypresses).
   - *Target:* `< 200ms`.
   - *Architecture Tactics:* Offload long CPU tasks into Web Workers, break up synchronous loops using `scheduler.yield()` or `startTransition`, and avoid expensive component re-renders on every keystroke.
2. **Largest Contentful Paint (LCP)**:
   - *Target:* `< 2.5s`.
   - *Architecture Tactics:* Preload hero images and critical fonts in `index.html`, inline critical CSS, and prioritize vendor chunk caching via long-lived CDN cache headers.
3. **Cumulative Layout Shift (CLS)**:
   - *Target:* `< 0.1`.
   - *Architecture Tactics:* Reserve layout dimensions for dynamic images/components via aspect ratio boxes or explicit skeleton placeholders.

---

### 9.2 Virtualization of Massive Datasets

When rendering datasets exceeding 500 items, DOM node creation becomes the primary performance bottleneck. Virtualization only renders the items currently inside the visible viewport.

```tsx
// src/shared/components/VirtualList/VirtualList.tsx
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items above and below visible viewport
  });

  return (
    <div
      ref={parentRef}
      style={{ height: `${containerHeight}px`, overflow: 'auto', position: 'relative' }}
      className="border rounded w-full"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 10. Phase 9: Enterprise Quality, Testing & Security

### 10.1 Testing Pyramid: RTL + Mock Service Worker (MSW)

Enterprise testing focuses on user behavior and accessible roles, intercepting network requests at the transport level rather than mocking internal module functions.

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/projects', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    return HttpResponse.json([
      { id: 'proj-1', title: 'Architecture Overhaul', status: status || 'ACTIVE' },
      { id: 'proj-2', title: 'Security Audit', status: 'COMPLETED' },
    ]);
  }),
];
```

```tsx
// src/features/projects/components/__tests__/ProjectList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectList } from '../ProjectList';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ProjectList Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders loading skeleton and subsequent project data from MSW', async () => {
    renderWithProviders(<ProjectList />);

    // Assert accessible loading state
    expect(screen.getByRole('progressbar', { name: /loading projects/i })).toBeInTheDocument();

    // Assert MSW response resolution
    await waitFor(() => {
      expect(screen.getByText('Architecture Overhaul')).toBeInTheDocument();
    });

    expect(screen.getByText('Security Audit')).toBeInTheDocument();
  });
});
```

---

### 10.2 Frontend Security Best Practices

| Security Attack Vector | Impact in Client SPA | Architectural Defense & Mitigation |
| :--- | :--- | :--- |
| **Cross-Site Scripting (XSS)** | Attacker executes malicious JavaScript in user's browser, hijacking sessions. | 1. Never use `dangerouslySetInnerHTML` without DOMPurify sanitization.<br>2. React's JSX automatically escapes variables by default.<br>3. Strictly avoid dynamic string evaluations (`eval`, `new Function`). |
| **Cross-Site Request Forgery (CSRF)** | Unauthorized commands transmitted from a trusted user. | 1. Use `SameSite=Strict` or `SameSite=Lax` cookies for session identifiers.<br>2. Transmit short-lived JWTs inside HTTP `Authorization: Bearer` headers rather than ambient cookies. |
| **Token Theft & Session Hijack** | Malicious script steals tokens stored in plain storage. | 1. Store Refresh Tokens in `HttpOnly`, `Secure`, `SameSite` cookies inaccessible to JavaScript.<br>2. Maintain Access Tokens in memory or short-lived session storage. |
| **Content Security Policy (CSP)** | Enforces authorized origins for scripts, styles, and connections. | Implement strict HTTP headers via Nginx/CDN:<br>`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.yourdomain.com;` |

---

## 11. Phase 10: Production Deployment & Observability

### 11.1 High-Performance Nginx SPA Configuration

Because Vite compiles to static HTML/JS/CSS, Single Page Applications require the host web server to route all non-file navigation requests back to `index.html`.

```nginx
# /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name app.enterprise.com;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;
    gzip_disable "MSIE [1-6]\.";

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.enterprise.com;" always;

    # Immutable Hashed Assets (1 Year CDN Cache)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # Root HTML: Must NEVER be cached (Always revalidate to pick up new chunk hashes)
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
```

---

### 11.2 Error Boundary Hierarchy & Global Telemetry

```tsx
// src/shared/components/ErrorBoundary/GlobalErrorBoundary.tsx
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 1. Report to Telemetry Service (Sentry, Datadog)
    console.error('Uncaught Exception caught by Global Error Boundary:', error, errorInfo);

    // If Sentry is installed:
    // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div role="alert" className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow border border-neutral-200">
            <h2 className="text-xl font-bold text-red-600 mb-2">Application Encountered an Error</h2>
            <p className="text-sm text-neutral-600 mb-4">
              An unexpected failure occurred. Our engineering telemetry has been notified.
            </p>
            <pre className="text-xs bg-neutral-100 p-2 rounded mb-4 overflow-x-auto text-neutral-800">
              {this.state.error.message}
            </pre>
            <button
              onClick={this.handleReset}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded font-medium hover:bg-primary-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 11.3 Architectural Readiness Checklist for Production Gatekeeping

Use this checklist prior to greenlighting any production launch:

```
[ ] Tooling & Compilers
    [ ] TypeScript compilation succeeds with zero errors under `strict: true` and `noUncheckedIndexedAccess: true`.
    [ ] Build succeeds with Vite output chunks verified under 500kB warning thresholds.
    [ ] Environment variables are strictly parsed at bootstrap via Zod schemas.

[ ] Architecture & Boundaries
    [ ] Feature modules communicate strictly through public APIs (`index.ts`). No cross-feature internal file imports.
    [ ] No direct circular dependencies detected by linting/dependency-cruiser.
    [ ] Presentation components are decoupled from direct Axios/Fetch invocations via Custom Hooks / Data Adapters.

[ ] State & React Lifecycle
    [ ] No Context API instances are serving as high-frequency state stores.
    [ ] All asynchronous data fetching is managed via TanStack Query (no useEffect data-fetching loops).
    [ ] All intervals, subscriptions, and DOM listeners expose verified cleanup functions.
    [ ] Memoization (`useMemo`, `useCallback`) is applied intentionally for referential stability or high-cost calculations.

[ ] Performance & Network
    [ ] HTTP Client features a concurrency-locked token refresh mutex.
    [ ] Route-level code splitting is configured via React.lazy and Suspense boundaries.
    [ ] Virtualization is implemented for lists exceeding 500 records.
    [ ] Browser bundle stats analyzed via `rollup-plugin-visualizer`.

[ ] Security & Operations
    [ ] All user-generated strings rendered via HTML are sanitized via DOMPurify.
    [ ] Zero access tokens stored in unencrypted persistent storage if refresh cookie is viable.
    [ ] Nginx configured with `Cache-Control: no-cache` for `index.html` and 1-year immutable caching for `/assets/`.
    [ ] Multi-tier Error Boundaries isolate feature crashes from taking down the entire shell.
```
