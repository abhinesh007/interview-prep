# 10 — Architect Decision Scenarios (Staff/Lead Level)

> Real-world "what would you choose and why" architectural dilemmas, migration strategies, technology disputes, bundle remediation audits, and production RFCs (Requests for Comments).

---

## 📑 Table of Contents
1. [Migration: Create React App (CRA) to Vite vs Next.js](#1-migration-create-react-app-cra-to-vite-vs-nextjs)
2. [Real-Time Collaboration: Architecting Multi-User Canvas / Document Editing](#2-real-time-collaboration-architecting-multi-user-canvas--document-editing)
3. [The Great State Debate: Resolving Redux vs Zustand vs TanStack Query](#3-the-great-state-debate-resolving-redux-vs-zustand-vs-tanstack-query)
4. [Bundle Remediation: Slashing a 2.5MB Bundle Down to Under 200KB](#4-bundle-remediation-slashing-a-25mb-bundle-down-to-under-200kb)
5. [Build vs Buy: Enterprise Design Systems (Radix/Shadcn vs In-House)](#5-build-vs-buy-enterprise-design-systems-radixshadcn-vs-in-house)
6. [Micro-Frontends vs Monolith: When to Explicitly Reject MFEs](#6-micro-frontends-vs-monolith-when-to-explicitly-reject-mfes)
7. [Enterprise RFC: Incremental REST to GraphQL/tRPC Migration](#7-enterprise-rfc-incremental-rest-to-graphqltrpc-migration)
8. [🎯 Staff/Principal Interview Traps](#8--staffprincipal-interview-traps)

---

## 1. Migration: Create React App (CRA) to Vite vs Next.js

### Q1: "We have a 4-year-old, 150,000-line Create React App (CRA) codebase with slow builds (4 minutes) and poor cold starts. The VP of Engineering wants to migrate. Would you choose Vite or Next.js (App Router), and what is your rollout plan?"

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Migration` `Vite` `Next.js` `CRA` `Technical-Leadership`

**Answer Breakdown:**

#### 1. Decision Matrix & Trade-Off Analysis

| Dimension | Option A: Migrate to Vite (SPA) | Option B: Migrate to Next.js (App Router) |
|---|---|---|
| **Architecture Shift** | Minimal: Retains pure client-side SPA model | Massive: Requires adopting Server Components, SSR/SSG, edge runtimes |
| **Effort & Risk** | Low-Medium (1–2 sprints): Change scripts, replace `react-scripts`, swap env vars (`VITE_`) | Very High (1–2 quarters): Rewrite routing, handle `window` SSR crashes, re-architect state |
| **SEO & Marketing Value** | Zero improvement (still client-side rendered) | Maximum: Full SSR/SSG metadata, LCP improvements |
| **Build Time** | Instant (HMR < 100ms via native ESM, Rollup for prod) | Fast via Turbopack, but SSR builds introduce server bundling overhead |
| **Hosting Complexity** | Trivial: Static S3 bucket + CloudFront CDN ($10/mo) | Moderate: Requires Node.js server, Vercel, or AWS ECS/Amplify containers |

#### 2. The Architect's Recommendation

> **"Unless the application is public-facing and requires public SEO (e.g. an e-commerce catalog or marketing site), migrating an authenticated B2B portal or enterprise SaaS to Next.js is an expensive over-engineering trap. I recommend a two-phase strategy: Migrate to Vite first (fast win, 1 sprint), then selectively adopt Next.js only if SSR requirements emerge."**

#### 3. Step-by-Step Vite Migration Playbook:
1. **Dependency Removal:** Eject or remove `react-scripts`. Install `vite` and `@vitejs/plugin-react`.
2. **Move `index.html`:** Move `public/index.html` to root and add `<script type="module" src="/src/index.tsx"></script>`.
3. **Environment Variables:** Search & replace `process.env.REACT_APP_*` with `import.meta.env.VITE_*`.
4. **Polyfills:** Provide Node polyfills (`buffer`, `crypto`) if legacy libraries rely on Webpack 4 shims.
5. **CI/CD Validation:** Run dual pipelines on staging before cutting over DNS.

---

## 2. Real-Time Collaboration: Architecting Multi-User Canvas / Document Editing

### Q2: "Product wants to add real-time collaborative editing (like Figma or Google Docs) with live cursors, presence awareness, and conflict resolution. Walk through your frontend architecture."

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `CRDT` `Yjs` `WebSockets` `WebRTC` `Real-Time`

**Answer Breakdown:**

#### 1. Concurrency Model: Operational Transformation (OT) vs CRDTs
For modern web applications, **Conflict-Free Replicated Data Types (CRDTs)** have superseded OT:
- **OT (Google Docs):** Requires a centralized, authoritative server to sequence and transform operation indices. High server complexity.
- **CRDT (Yjs / Automerge):** Mathematically guarantees that any two peers receiving the same operations in ANY order converge to identical state without a central lock manager. Enables offline-first peer-to-peer sync via WebRTC or WebSockets.

#### 2. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                    React Client UI                     │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │   Canvas / Rich Text    │  │  Cursor Overlay Layer│ │
│  │     (Local State)       │  │ (Unrendered in React)│ │
│  └────────────▲────────────┘  └──────────▲───────────┘ │
│               │                          │             │
│               ▼                          ▼             │
│       ┌───────────────┐          ┌───────────────┐     │
│       │  Yjs Document │          │   Yjs Awareness│     │
│       │ (Shared CRDT) │          │(Presence/Mouse│     │
│       └───────┬───────┘          └───────┬───────┘     │
└───────────────┼──────────────────────────┼─────────────┘
                │                          │
                ▼                          ▼
┌────────────────────────────────────────────────────────┐
│                   y-websocket Provider                 │
│         (Encodes binary updates via Uint8Array)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │      WebSocket Gateway    │
              │   (Node.js / Cloudflare   │
              │      Durable Objects)     │
              └───────────────────────────┘
```

#### 3. Critical Performance Strategy (Bypassing React Reconciler for Cursors):
Broadcasting cursor movements at 60fps across 20 connected users causes **1,200 events/second**. If cursor coordinates are stored in React state (`useState`), the component tree will choke in an endless re-render cycle.

**The Fix: Direct DOM / Canvas Layer Mutation:**
```typescript
// Bypass React: Update cursor coordinates via direct transform translation
awareness.on('change', () => {
  const states = awareness.getStates();
  states.forEach((state, clientID) => {
    if (clientID === doc.clientID) return;
    let cursorEl = document.getElementById(`cursor-${clientID}`);
    if (!cursorEl) {
      cursorEl = createCursorElement(clientID, state.user.color);
    }
    cursorEl.style.transform = `translate3d(${state.cursor.x}px, ${state.cursor.y}px, 0)`;
  });
});
```

---

## 3. The Great State Debate: Resolving Redux vs Zustand vs TanStack Query

### Q3: "Two senior engineers are in a bitter architectural dispute: one wants to use Redux Toolkit for everything; the other wants Zustand. As Lead Architect, how do you evaluate the dispute and establish an enterprise standard?"

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Leadership  
**Tags:** `State-Management` `Redux` `Zustand` `TanStack-Query` `Consensus`

**Answer:**

#### 1. The Root Cause of the Conflict
Both engineers are likely committing the **Unified State Fallacy**: treating all application data as a single generic "client state" pool. In modern React (2024+), 80% of what used to live in Redux was actually **cached server state**.

#### 2. The Architectural Framework (The State Trichotomy)

```
                       ┌───────────────────────────────┐
                       │ What type of data is this?    │
                       └───────────────┬───────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│   Server State   │          │ Global UI State  │          │   Local State    │
│ (Users, Orders,  │          │(Sidebar open,    │          │(Dropdown toggle, │
│  Invoices, Feed) │          │ Theme, Cart, Org)│          │ Form input value)│
└────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  TanStack Query  │          │     Zustand      │          │     useState     │
│  (or SWR / RTKQ) │          │ (or Redux Lite)  │          │    useReducer    │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

#### 3. Objective Evaluation: Redux Toolkit (RTK) vs Zustand for Client State

| Criteria | Redux Toolkit (RTK) | Zustand |
|---|---|---|
| **Boilerplate** | Medium (Slices, action creators, store configure) | Extremely Low (Single function call `create()`) |
| **Bundle Size** | ~11KB gzipped | ~1.1KB gzipped (10x smaller) |
| **Provider Requirement** | Requires `<Provider store={...}>` root | Zero Provider nesting required |
| **Selector Performance** | Good with `useSelector` + Reselect | Native selector subscriptions via `useSyncExternalStore` |
| **Learning Curve** | High (Flux architecture, dispatch, reducers) | Low (Plain JavaScript functions and objects) |
| **DevTools** | First-class Redux DevTools extension support | First-class Redux DevTools middleware support |

#### 4. The Architect's Decision & Policy:
1. **Server State:** Mandate **TanStack Query** for all server caching, pagination, deduplication, and optimistic mutations. No raw fetch or thunk logic.
2. **Global Client State:** Standardize on **Zustand** for shared UI flags, client-side drafts, and layout states due to its zero-boilerplate, micro-footprint, and absence of Provider nesting.
3. **Legacy Redux:** If an existing RTK code-base already exists, do NOT perform a vanity rewrite; leverage RTK Query for server state and retain slices until natural refactoring milestones.

---

## 4. Bundle Remediation: Slashing a 2.5MB Bundle Down to Under 200KB

### Q4: "Production monitoring alerts show our initial JavaScript bundle has ballooned to 2.5MB gzipped. LCP is 5.4 seconds. Walk me through your step-by-step audit, diagnostic tools, and remediation plan."

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug / Performance  
**Tags:** `Bundle-Optimization` `Web-Vitals` `Tree-Shaking` `Code-Splitting`

**Answer Breakdown:**

#### Step 1: Diagnostic Profiling (Identify the Culprits)
1. **Generate Source Maps & Visual Bundle Analysis:**
   - Run `vite-bundle-visualizer` or `@next/bundle-analyzer` / `webpack-bundle-analyzer`.
   - Inspect the interactive treemap to locate top 5 heavyweight packages.
2. **Analyze Duplicated Packages:**
   - Run `npx duplicate-package-checker-webpack-plugin` or `pnpm why <package>`. Look for multiple versions of `date-fns`, `lodash`, or `core-js` coexisting in `node_modules`.

#### Step 2: The Top 5 Architectural Culprits & Fixes

```text
Before Audit (2.5MB Gzipped):
├── moment.js (with all 150+ locales): 280KB ────> Swap with Day.js / date-fns (2KB): Save 278KB
├── lodash (un-treeshaken import): 72KB ─────────> Swap import { get } with lodash-es: Save 68KB
├── Heavy Charting (Recharts/ChartJS in main): 450KB ─> Lazy load route/modal: Save 450KB
├── Unsplit Routes (Entire app in entry chunk): 1.2MB ─> React.lazy route splitting: Save 1.1MB
└── PDF / Excel Export Engine (jspdf / xlsx): 400KB ──> Dynamic import() on button click: Save 400KB
```

#### Step 3: Implementation of Remediation Code

1. **Route-Based Code Splitting:**
```tsx
// Before: synchronous import pulling all features into main chunk
// import { AdminDashboard } from './features/admin/AdminDashboard';

// After: lazy loaded on-demand
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));

<Routes>
  <Route 
    path="/admin" 
    element={
      <Suspense fallback={<PageSpinner />}>
        <AdminDashboard />
      </Suspense>
    } 
  />
</Routes>
```

2. **Action-Triggered Dynamic Import:**
Never include heavy export libraries (e.g., `xlsx`, `jspdf`) in the initial bundle:
```tsx
const handleExportReport = async () => {
  setIsExporting(true);
  // Download library only when user explicitly clicks "Export"
  const { exportToExcel } = await import('./utils/excelExporter');
  await exportToExcel(reportData);
  setIsExporting(false);
};
```

#### Step 4: Continuous Regression Guardrails
Add a bundle budget enforcement in CI/CD (`bundlesize` or GitHub Action):
```json
// package.json
"bundlesize": [
  {
    "path": "./dist/assets/index-*.js",
    "maxSize": "180 kB"
  }
]
```

---

## 5. Build vs Buy: Enterprise Design Systems (Radix/Shadcn vs In-House)

### Q5: "The leadership team wants a modern design system. Junior developers want to code everything from scratch using pure CSS and HTML divs. A senior wants Material UI. What do you recommend and why?"

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Design Systems  
**Tags:** `Design-Systems` `Headless-UI` `Radix` `Accessibility` `Shadcn`

**Answer:**

#### 1. Why Building from Scratch (Pure Divs) Fails:
Writing complex accessible primitives (Combobox, Multi-Select, Dialog, Date Picker, Popover) from scratch requires solving:
- Keyboard navigation (Arrow keys, Escape, Home/End, Tab traps).
- Screen reader accessibility (ARIA attributes: `aria-expanded`, `aria-activedescendant`, `role="listbox"`).
- Focus management and collision detection (popover viewport repositioning).
- Estimated cost: **6–12 months of senior engineering time** just to replicate basic standard WCAG 2.1 compliance.

#### 2. Why Heavy Component Libraries (MUI / Ant Design) Struggle at Scale:
- **Style Bleed & Theming Walls:** Overriding MUI's opinionated styles via emotion/styled-components is notoriously painful and degrades runtime performance.
- **Bundle Weight:** Heavy runtime CSS-in-JS engines add significant overhead to initial load.

#### 3. The Architect's Recommendation: Headless UI Primitives (Radix UI / Shadcn / React Aria)

```text
┌────────────────────────────────────────────────────────┐
│                   Your Design System                   │
│   ┌────────────────────────────────────────────────┐   │
│   │ Custom Brand Styles & Tokens                   │   │
│   │ (Tailwind / Vanilla CSS / CSS Modules)         │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │ Headless Accessibility Primitives              │   │
│   │ (Radix UI / React Aria Components)             │   │
│   │ - Keyboard traps, Focus management, ARIA roles │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

**Why Headless Wins:**
- **Zero Opinionated Styles:** Your designers have 100% aesthetic freedom.
- **100% WCAG Compliance Out of the Box:** Keyboard and ARIA contracts are maintained by dedicated open-source accessibility teams.
- **Copy-Paste Ownership (Shadcn pattern):** The components live directly in your codebase (`src/components/ui`), allowing full customization without fighting library node_module abstractions.

---

## 6. Micro-Frontends vs Monolith: When to Explicitly Reject MFEs

### Q6: "A newly hired Director of Engineering proposes breaking our single React application into 6 Micro-Frontends to 'speed up delivery'. When should you as a Principal Architect explicitly push back and reject this proposal?"

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / Governance  
**Tags:** `Micro-Frontends` `Organizational-Design` `Conways-Law`

**Answer:**

Micro-Frontends are **not a performance or architectural optimization**—they are an **organizational scaling pattern** designed to solve Conway's Law for organizations with 50–100+ engineers where cross-team coordination bottlenecks deployment pipelines.

#### The "Reject MFE" Checklist (When to Say NO):

1. **Team Size is < 30 Engineers:**
   - If 15 engineers split into 6 MFEs, teams will spend more time managing Module Federation configurations, cross-app version bumps, and shared CI/CD pipelines than shipping product features.
2. **Features are Highly Interdependent:**
   - If a user action in Feature A frequently requires synchronous state synchronization with Feature B (e.g. video editor, complex form builder), decoupling into MFEs creates painful, brittle custom event meshes.
3. **Primary Motivation is "Slow Builds":**
   - Slow builds should be solved with **Turborepo / Nx computation caching, esbuild, and Vite**, not by introducing distributed system complexity to the frontend.
4. **No Dedicated Platform/Infra Squad:**
   - Without a centralized platform team to maintain the Host container, deployment manifests, shared design systems, and cross-remote telemetry, MFEs will inevitably diverge into a chaotic mess of incompatible versions.

**The Counter-Proposal:**
Propose a **Modular Monolith in a Monorepo (Turborepo/pnpm)** with strict feature boundary linting (`eslint-plugin-boundaries` or Nx tags) preventing cross-feature internal imports. This delivers 90% of the architectural isolation benefits with 0% of the operational and runtime overhead.

---

## 7. Enterprise RFC: Incremental REST to GraphQL/tRPC Migration

### Q7: "Draft an architectural RFC (Request for Comments) outlining an incremental, zero-downtime migration strategy from legacy REST APIs to GraphQL / tRPC for a high-traffic production application."

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / RFC Writing  
**Tags:** `RFC` `GraphQL` `tRPC` `Migration` `Enterprise`

**Answer:**

```markdown
# RFC 042: Incremental Migration from REST to Typed Query Layer (tRPC/GraphQL)

## Status: PROPOSED
**Author:** Lead Frontend Architect  
**Stakeholders:** Frontend Guild, Backend Core Team, DevOps

---

### 1. Context & Problem Statement
Our current frontend relies on 85+ disparate REST endpoints. We face three severe production bottlenecks:
1. **Over-fetching:** The `/api/v1/orders` endpoint returns 45 fields (12KB/record) when the mobile view only requires 4 fields.
2. **Contract Desynchronization:** Backend field renames silently break frontend views because TypeScript types are manually maintained.
3. **Waterfall Cascades:** Loading a customer workspace requires 4 serial REST calls.

---

### 2. Proposed Architecture: The Strangler Fig Pattern
We will NOT rewrite the application. We will introduce a **BFF (Backend-For-Frontend) Typed Gateway** using the Strangler Fig pattern.

```
┌────────────────────────────────────────────────────────┐
│                   React Client App                     │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │ Legacy REST Consumers │   │  New Typed Consumers  │ │
│  │  (apiClient.get)      │   │  (trpc.useQuery)      │ │
│  └───────────┬───────────┘   └───────────┬───────────┘ │
└──────────────┼───────────────────────────┼─────────────┘
               │                           │
               ▼                           ▼
      ┌─────────────────┐         ┌─────────────────┐
      │  Legacy REST    │         │  Typed BFF Hub  │
      │   Endpoints     │         │ (tRPC / GraphQL)│
      └─────────────────┘         └────────┬────────┘
                                           │ (Internal High-Speed RPC)
                                           ▼
                                  ┌─────────────────┐
                                  │ Core Services   │
                                  └─────────────────┘
```

---

### 3. Execution Phases

#### Phase 1: Contract Automation (Weeks 1–3)
- Retain existing REST endpoints.
- Integrate `openapi-typescript` in CI: auto-generate TypeScript definitions directly from backend OpenAPI/Swagger schemas on every backend pull request.
- Zero runtime overhead; eliminates manual type drift.

#### Phase 2: Gateway Deployment (Weeks 4–8)
- Deploy lightweight Node.js BFF proxy.
- Migrate the highest-impact screen (Order Management Dashboard) to the new typed query layer.
- Measure and record Web Vitals and payload size reductions in Datadog.

#### Phase 3: Incremental Deprecation (Weeks 9–20)
- Enforce ESLint rule `no-restricted-syntax` prohibiting direct calls to legacy REST endpoints in newly created feature directories.
- All new features must consume the typed query layer.
- Decommission legacy REST endpoints as corresponding legacy views are refactored.

---

### 4. Rollback & Disaster Recovery
- Every migrated hook retains a feature flag fallback (`useFeatureFlag('enable_typed_orders')`).
- If the typed gateway experiences latency spikes > 200ms, the client switches traffic back to legacy REST endpoints dynamically.
```

---

## 8. 🎯 Staff/Principal Interview Traps

### Q8: "How do you evaluate and establish an architectural 'Bundle Budget' and enforce it in a team of 40 developers without slowing down velocity?"

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Governance  
**Tags:** `Governance` `Bundle-Budget` `CI-CD`

**Answer:**
1. **Establish Tiered Budgets by Route Type:**
   - Critical Entry Routes (Login, Landing): `< 120KB` gzipped.
   - Core App Shell: `< 200KB` gzipped.
   - Heavy Analytic Sub-routes: `< 450KB` gzipped.
2. **Automate PR Feedback via Bot (Not Failing Builds Abruptly):**
   - Don't block urgent hotfixes with hard build failures.
   - Use PR bots (like `compressed-size-action`) that post a diff table:
     *`⚠️ Warning: This PR increases the checkout chunk by +45KB (+22%) due to new import: xlsx.`*
3. **Architectural Exception Process:**
   - Any pull request exceeding the budget must include an RFC snippet in the PR description justifying the dependency and explaining why it cannot be dynamically loaded on demand.
