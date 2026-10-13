# 16 — Enterprise System Design Case Studies & Monolith Migration (RADIO Framework)

> Senior System Design Case Studies Evaluated Through the **RADIO Framework**: High-Scale Polyglot E-Commerce, Multi-Tenant SaaS Platform, and Monolith-to-MFE Migration via the Strangler Fig Pattern in an Nx Monorepo.

---

## 📑 Table of Contents
1. [The RADIO System Design Framework for MFEs](#1-the-radio-system-design-framework-for-mfes)
2. [Case Study 1: High-Scale Polyglot E-Commerce Architecture](#2-case-study-1-high-scale-polyglot-e-commerce-architecture)
3. [Case Study 2: Multi-Tenant Enterprise SaaS Suite with Dynamic Discovery](#3-case-study-2-multi-tenant-enterprise-saas-suite-with-dynamic-discovery)
4. [Case Study 3: Monolith to Micro-Frontends Migration (The Strangler Fig Pattern)](#4-case-study-3-monolith-to-micro-frontends-migration-the-strangler-fig-pattern)
5. [Architectural Governance: Monorepo Library vs Federated Remote Decision Matrix](#5-architectural-governance-monorepo-library-vs-federated-remote-decision-matrix)
6. [🎯 Senior Architecture & Principal Interview Traps](#6--senior-architecture--principal-interview-traps)

---

## 1. The RADIO System Design Framework for MFEs

Every system design question in this module follows the standardized **RADIO Framework**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   THE RADIO SYSTEM DESIGN FRAMEWORK                    │
├────────────────────────────────────────────────────────────────────────┤
│ R — Requirements Clarification (Functional, Non-Functional, Budgets)   │
│ A — Architecture & High-Level Client Topology (Host, Remotes, CDN, BFF)│
│ D — Data Model & API Contracts (Shared DTOs, Zod, REST/WS, Tokens)     │
│ I — Interface & Component Hierarchy (Shell Layout, Adapters, State)    │
│ O — Optimizations, Resilience, Edge Cases, Security & Observability    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Case Study 1: High-Scale Polyglot E-Commerce Architecture

### Scenario Prompt:
> *"Architect a high-scale e-commerce platform processing 50,000 orders/minute. The Shell is built with Angular 19 Zoneless, the Product Catalog is maintained by a React 19 team, and the Checkout & Payment flow is handled by an Angular team. Backend microservices are fronted by NestJS BFFs inside an Nx monorepo."*

---

### Phase R — Requirements Clarification
- **Functional Scope:**
  - Unified Shell Layout with header, live cart count badge, and tenant localization.
  - Browse Catalog, search, facet filtering (React Remote).
  - Add to Cart, view cart drawer, and complete checkout payment (Angular Remote).
- **Non-Functional Budgets:**
  - Initial Shell JS payload budget: **< 120 KB**.
  - Largest Contentful Paint (LCP): **< 1.8 seconds**.
  - Interaction to Next Paint (INP): **< 100 milliseconds**.
  - Availability SLA: 99.99%. Checkout **must remain functional** even if Recommendations or Reviews fail.
  - Independent Deployment: Catalog, Checkout, and Shell deploy independently with zero downtime.

---

### Phase A — Architecture & High-Level Topology

```text
                                CLIENT BROWSER
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ANGULAR 19 ZONELESS HOST SHELL                        │
│  ┌───────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Global Header & Cart Count Signal │  │ Dynamic Manifest Router        │  │
│  └─────────────────▲─────────────────┘  └───────────────┬────────────────┘  │
│                    │                                    │                   │
│         Event Bus: CART_UPDATED                         │                   │
│                    │                                    │                   │
│  ┌─────────────────┴─────────────────┐  ┌───────────────▼────────────────┐  │
│  │ React 19 Catalog Remote (Adapter) │  │ Angular 19 Checkout Remote     │  │
│  │ (Mounted via ReactMfeWrapper)     │  │ (Routed Standalone Sub-Tree)   │  │
│  └─────────────────▲─────────────────┘  └───────────────▲────────────────┘  │
└────────────────────┼────────────────────────────────────┼───────────────────┘
                     │ HTTPS Fetch                        │ HTTPS Fetch
                     ▼                                    ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│        NestJS Catalog BFF            │  │        NestJS Checkout BFF        │
│  (Aggregates Product DB & Search)    │  │  (Stripe Integration, Orders DB)  │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

### Phase D — Data Model & API Contracts
1. **Shared Event Contracts (`libs/shared/contracts`):**
   ```typescript
   export interface CartItem {
     sku: string;
     title: string;
     price: number;
     quantity: number;
   }
   ```
2. **Decoupled Cart Synchronization:**
   - The React Catalog remote **does not import** the Checkout store.
   - When a user clicks "Add to Cart", the Catalog emits `mfeEventBus.emit('CART_UPDATED', { delta: 1 })`.
   - The Angular Host Shell listens and increments its reactive `cartCount = signal(0)` Signal, instantly updating the header icon.

---

### Phase I — Interface & Component Hierarchy
- **Shell Layout:** Top navbar (Angular Standalone), persistent Cart Drawer slot, and `<router-outlet>`.
- **Catalog Route (`/products/*`):** Maps to `ReactMfeWrapperComponent`, which fetches `catalog/remoteEntry.js` and mounts the React root.
- **Checkout Route (`/checkout/*`):** Directly lazy-loads `CHECKOUT_ROUTES` from `checkout/remoteEntry.js` into the Angular Router.

---

### Phase O — Optimizations & Resilience
- **Single Version Policy:** `react`, `react-dom`, `@angular/core`, and `rxjs` configured as strict singletons in `module-federation.config.ts`.
- **Fault Tolerance:** React Catalog remote is wrapped with `MfeErrorBoundary`. If the catalog chunk fails, the user is presented with a retry button and cached local items from `IndexedDB`.
- **CSS Isolation:** React Catalog styles are encapsulated using CSS `@scope (.catalog-root)` with zero `@tailwind base` resets.

---

## 3. Case Study 2: Multi-Tenant Enterprise SaaS Suite with Dynamic Discovery

### Scenario Prompt:
> *"Design a multi-tenant B2B SaaS dashboard where 50 enterprise clients access different sets of federated feature remotes (CRM, Invoicing, HR, Analytics) depending on their subscription tier and custom white-label branding."*

---

### Phase R — Requirements Clarification
- **Multi-Tenancy:** Each customer accesses via custom subdomain (`acme.saas.com`, `globex.saas.com`).
- **Dynamic Feature Provisioning:** Remotes are loaded dynamically from a database manifest based on tenant entitlement permissions.
- **Zero Shell Recompilation:** Onboarding a new customer or rolling out a feature remote requires zero changes to the Host Shell bundle.

---

### Phase A — Architecture & Topology

```text
1. User visits: https://acme.saas.com
2. Host main.ts extracts tenant identifier: 'acme'
3. Calls Tenant Entitlement Service:
   GET /api/v1/tenants/acme/manifest
4. Returns Manifest Payload:
   {
     "tenantId": "acme",
     "brand": { "primaryColor": "#6366f1", "logoUrl": "..." },
     "remotes": {
       "crm": "https://cdn.saas.com/remotes/crm/v2/remoteEntry.js",
       "invoicing": "https://cdn.saas.com/remotes/invoicing/v1/remoteEntry.js"
     }
   }
5. Host injects brand theme into :root CSS variables.
6. Angular Router dynamically builds routing table based on provided remotes.
```

---

### Phase D & I — Data Modeling & Interface
- **Router Configuration:**
  ```typescript
  // Dynamically constructed from manifest
  const dynamicRoutes = Object.entries(tenantManifest.remotes).map(([key, url]) => ({
    path: key,
    loadChildren: () =>
      loadRemoteModule({
        type: 'script',
        remoteEntry: url,
        remoteName: key,
        exposedModule: './Routes',
      }).then((m) => m.ROUTES),
  }));
  ```

---

### Phase O — Security & Resilience
- **Token Security:** Authentication tokens stored in `HttpOnly` cookies scoped to `.saas.com`.
- **CSP Hardening:** Web server injects dynamic `script-src` headers allowlisting only the specific CDN endpoints returned by the tenant entitlement manifest.
- **Tenant Data Isolation:** Backend BFF enforces tenant row-level security (RLS) on all database queries using tenant claims extracted from the verified session.

---

## 4. Case Study 3: Monolith to Micro-Frontends Migration (The Strangler Fig Pattern)

### Scenario Prompt:
> *"You are the Principal Architect tasked with migrating a 7-year-old, 500,000-line legacy Angular 10 monolith to modern Angular 19 Micro-Frontends in an Nx monorepo. How do you execute this migration with zero downtime and continuous feature delivery?"*

---

### The 5-Phase Strangler Fig Architecture:

```text
PHASE 1: MONOREPO INGESTION
Move legacy monolith into apps/legacy-monolith inside new Nx workspace.
All existing teams continue daily deployments from the legacy app.

PHASE 2: INTRODUCE THE NX HOST SHELL
Deploy new apps/shell-host.
Configure catch-all wildcard routing:
  / (Shell Nav)
  ├── /checkout ──► (New modern federated remote)
  └── /**       ──► (Proxied to Legacy Monolith)

PHASE 3: VERTICAL SLICE STRANGLING
Team Checkout extracts Checkout into libs/checkout/feature & apps/checkout-remote.
Shell routes /checkout to new remote. Legacy checkout route is deleted.

PHASE 4: INCREMENTAL RETIREMENT
Repeat for Catalog, Accounts, Admin, and Reports.

PHASE 5: MONOLITH DECOMMISSIONING
When legacy monolith handles 0% of traffic, decommission apps/legacy-monolith!
```

```text
┌────────────────────────────────────────────────────────┐
│                   NEW NX HOST SHELL                    │
│                                                        │
│  User visits /checkout ──────► Modern Remote (Angular 19)
│  User visits /dashboard ─────► Modern Remote (React 19)│
│  User visits /legacy-reports ─► Legacy Monolith (Old)  │
└────────────────────────────────────────────────────────┘
```

### Risk Mitigations:
- **Session Continuity:** Share authentication session state between the Host Shell and the legacy monolith via top-level domain cookies.
- **Unified Design Tokens:** Distribute brand CSS variables from `libs/shared/ui-theme` so the visual transition between old and new views is unnoticeable to end users.

---

## 5. Architectural Governance: Monorepo Library vs Federated Remote Decision Matrix

### When should a feature be an Nx Monorepo Library vs a Federated Micro-Frontend?

```text
┌────────────────────────────────────────────────────────────────────────┐
│               THE MFE VS MONOREPO LIBRARY DECISION TREE                │
├────────────────────────────────────────────────────────────────────────┤
│ Do multiple independent teams own deployment schedules?               │
│   ├── NO  ──► KEEP AS AN NX MONOREPO LIBRARY (Simpler, Zero Latency)  │
│   └── YES ──► Does it require independent production deployments?      │
│                 ├── NO  ──► NX MONOREPO LIBRARY                        │
│                 └── YES ──► MODULE FEDERATION MICRO-FRONTEND          │
└────────────────────────────────────────────────────────────────────────┘
```

| Decision Factor | Keep as Nx Monorepo Library | Build as Federated Micro-Frontend |
|---|---|---|
| **Deployment Cadence** | Deployed atomically with the main app | Must deploy independently multiple times a day |
| **Team Size** | Small-to-Mid (<20 engineers) | Large Enterprise (50–500+ engineers across squads) |
| **Runtime Overhead** | Zero (Standard JS chunking) | Network latency for `remoteEntry.js` handshake |
| **Complexity & Failure Modes**| Single-process runtime, simple debugging | Distributed network failures, version negotiation |
| **Technology Stack** | Standardized framework | Polyglot (Mixing Angular, React, Vue) |

---

## 6. 🎯 Senior Architecture & Principal Interview Traps

### Q1: What is the Conway's Law trap in Micro-Frontends?
**Answer:** Conway's Law states that systems mirror organizational communication structures. The trap occurs when an organization creates a separate micro-frontend for every tiny scrum team (e.g. creating 40 tiny MFEs with 2 buttons each). This leads to **micro-frontend fragmentation hell**: massive bundle bloat, extreme network latency, and continuous cross-MFE communication bugs. Micro-frontends should be mapped strictly to **major bounded contexts (domains)**, never to individual sprint teams!

### Q2: How do you handle End-to-End transactions that span multiple micro-frontends when one remote fails halfway through?
**Answer:** Apply the **Saga Pattern / Compensating Transaction**: If a user submits an order in Checkout, but the federated Payment Remote fails, the system must emit an event (`PAYMENT_FAILED`) that prompts the Checkout remote to release the reserved inventory, roll back optimistic state, and present an actionable retry interface.

### Q3: Why is an Nx monorepo the ideal foundation for Micro-Frontends compared to multi-repo MFEs?
**Answer:** It provides the best of both worlds: **runtime deployment autonomy** via Module Federation combined with **build-time governance, atomic refactoring, single-version dependency policy, and computation caching** via Nx.
