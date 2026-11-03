# 📋 React Architect — Interview Prep Master Plan

> **Goal:** Create an exhaustive, production-grade React Architecture interview preparation guide covering UI design, data flow patterns, and real-world system architectures for common website patterns — BI Dashboards, E-commerce, SaaS Multi-Tenant, and Micro-Frontend platforms.
> Aligned with React 18/19+, Server Components, modern bundling (Vite/Turbopack), and enterprise-scale patterns.

---

## 🎯 Design Principles & Structure

This guide goes **beyond basic React knowledge** and focuses on what separates a **React Architect** from a senior developer:

1. **Trade-off Analysis** — Every pattern discussion includes when to use it AND when NOT to.
2. **Real-World Architecture** — Each module includes full system designs for actual product categories.
3. **Code + Diagrams** — Every answer includes production-grade TypeScript and ASCII architecture diagrams.
4. **RADIO Framework** — System design answers follow Requirements → Architecture → Data Model → Interface → Optimizations.
5. **Gotchas & Anti-Patterns** — Every question surfaces real production bugs and interviewer traps.

### Question Format Standard

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative explanation with code blocks, ASCII diagrams, and trade-off analysis]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Edge-case or trap probe]"  
*Senior Answer:* [Nuanced answer explaining runtime behavior and mitigations]
```

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|---|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation, Study Paths & Difficulty Matrix | Index |
| `01` | [`01-component-design-patterns-qa.md`](01-component-design-patterns-qa.md) | Compound, Render Props, HOC, Headless UI, Polymorphic Components | 15–18 |
| `02` | [`02-state-architecture-qa.md`](02-state-architecture-qa.md) | State decision tree, Context splitting, Zustand vs Redux, Server vs Client state | 15–18 |
| `03` | [`03-data-flow-and-fetching-qa.md`](03-data-flow-and-fetching-qa.md) | TanStack Query, SWR, RSC data flow, waterfall elimination, optimistic updates | 14–16 |
| `04` | [`04-performance-at-scale-qa.md`](04-performance-at-scale-qa.md) | Re-render prevention, virtualization, React Compiler, bundle optimization, profiling | 14–16 |
| `05` | [`05-bi-dashboard-architecture-qa.md`](05-bi-dashboard-architecture-qa.md) | BI Dashboard system design: real-time charts, widget grids, drill-downs, WebGL vs SVG | 12–15 |
| `06` | [`06-ecommerce-architecture-qa.md`](06-ecommerce-architecture-qa.md) | E-commerce system design: PLP, cart, checkout, payment, inventory sync | 12–15 |
| `07` | [`07-saas-multi-tenant-architecture-qa.md`](07-saas-multi-tenant-architecture-qa.md) | SaaS/Multi-tenant: RBAC, tenant isolation, org switching, white-labeling | 12–15 |
| `08` | [`08-micro-frontends-and-monorepo-qa.md`](08-micro-frontends-and-monorepo-qa.md) | Module Federation, Host-Remote, Nx/Turborepo, cross-MFE communication | 12–15 |
| `09` | [`09-anti-patterns-and-gotchas-qa.md`](09-anti-patterns-and-gotchas-qa.md) | God Context, prop drilling, re-render hell, monolithic bundles, race conditions | 14–16 |
| `10` | [`10-architect-decision-scenarios-qa.md`](10-architect-decision-scenarios-qa.md) | Real-world "what would you choose" scenarios, migration strategies, RFC writing | 12–15 |

---

## 📑 Detailed Section Specifications

### 📄 `01-component-design-patterns-qa.md` — Component Design Patterns
1. **Compound Components:**
   - When to choose over traditional props configuration
   - Real-world examples: Select, Accordion, Tabs, Modal
   - Context-based vs `cloneElement` approach trade-offs
2. **Render Props & HOCs (Are They Dead?):**
   - Modern use cases where hooks can't replace them
   - Cross-platform rendering, analytics injection, legacy boundaries
3. **Headless UI / Renderless Components:**
   - Separating logic from presentation for design system flexibility
   - Building `useCombobox`, `useTable`, `useVirtualizer` abstractions
4. **Polymorphic Components (`as` Prop):**
   - Type-safe `as` prop pattern with TypeScript generics
   - When to use vs when it adds unnecessary complexity
5. **Provider Pattern & Dependency Injection:**
   - Service injection patterns in React vs Angular DI
   - Module boundaries and barrel exports as public API contracts
6. **🎯 Quick-Fire Gotchas:**
   - "What breaks when you nest two Compound Component providers?"
   - "Why does `React.memo` fail with inline callbacks?"

### 📄 `02-state-architecture-qa.md` — State Architecture & Management
1. **The State Decision Tree (Cost Ladder):**
   - `useState` → `useReducer` → Context → Zustand/Jotai → Redux Toolkit
   - When each level is appropriate with real scenarios
2. **Server State vs Client State (The Split):**
   - Why server data should NEVER live in Redux
   - TanStack Query / RTK Query as the canonical server-state layer
3. **Context Performance Traps:**
   - Why a single "God Context" destroys performance
   - Context splitting by update frequency
   - The `useSyncExternalStore` escape hatch
4. **Derived State Anti-Pattern:**
   - Why `useState + useEffect` for computed values is always wrong
   - Computing during render vs caching in `useMemo`
5. **URL as State (Often Overlooked):**
   - Filters, pagination, sort order → search params
   - `useSearchParams` as the canonical source of truth
6. **🎯 Quick-Fire Gotchas:**
   - "What happens when you put scroll position in Context?"
   - "Why does Zustand re-render differently than Context?"

### 📄 `03-data-flow-and-fetching-qa.md` — Data Flow & Fetching Architecture
1. **React Server Components (RSC) Data Flow:**
   - How RSC changes the traditional client-side data flow
   - Server → Client serialization protocol
   - "Server Components can render Client Components, but not vice versa"
2. **Fetch-on-Render Waterfall Problem:**
   - Why `useEffect` fetch chains destroy UX
   - Solutions: Parallel fetching, Suspense, loader patterns
3. **TanStack Query Architecture:**
   - Query keys as cache identity, stale-while-revalidate, deduplication
   - Optimistic mutations with rollback
   - Infinite queries and cursor-based pagination
4. **GraphQL vs REST at Scale:**
   - Over-fetching vs under-fetching trade-offs
   - Fragment colocation, normalized caching (Apollo/Relay)
5. **Race Conditions & Cancellation:**
   - AbortController in useEffect cleanup
   - Why rapid typing in search causes stale data
6. **🎯 Quick-Fire Gotchas:**
   - "What happens if you forget the AbortController cleanup?"
   - "When does staleTime: Infinity make sense?"

### 📄 `04-performance-at-scale-qa.md` — Performance at Scale
1. **Re-Render Prevention Hierarchy:**
   - Component composition (`children` pattern) > `React.memo` > `useMemo`
   - Why structural optimization beats memoization
2. **Virtualization & Windowing:**
   - When to use `@tanstack/react-virtual` vs `react-window`
   - Dynamic row heights, variable-size grids, infinite scroll
3. **Bundle Optimization:**
   - Route-based code splitting with `React.lazy` + Suspense
   - Tree-shaking: `lodash/debounce` vs `lodash` (140KB difference)
   - Bundle analyzer integration in CI/CD
4. **React Compiler (React 19+):**
   - How automatic memoization changes optimization strategy
   - What it handles vs what you still need to do manually
5. **Web Vitals & Core Performance Metrics:**
   - LCP, FID/INP, CLS optimization strategies
   - Measuring real user performance vs lab metrics
6. **🎯 Quick-Fire Gotchas:**
   - "When does `useMemo` actually HURT performance?"
   - "Why does an inline `style={{}}` object break `React.memo`?"

### 📄 `05-bi-dashboard-architecture-qa.md` — BI Dashboard Architecture
Full RADIO-framework system design:
1. **Requirements:** Real-time KPIs, configurable widget grids, drill-down, export
2. **Architecture:** Data layer (REST + WebSocket), caching, semantic aggregation
3. **Visualization Engine Selection:** SVG vs Canvas vs WebGL trade-offs table
4. **Component Patterns:** Container/Presentational, Compound Widget, Headless filters
5. **Real-Time Streaming:** Bypassing React state for high-frequency feeds, FIFO buffering
6. **Layout:** react-grid-layout, CSS Grid named areas, Container Queries

### 📄 `06-ecommerce-architecture-qa.md` — E-Commerce Architecture
Full RADIO-framework system design:
1. **Requirements:** Product listing, cart, checkout, inventory, payments
2. **Architecture:** Feature-based folder structure, API client layer
3. **Product Listing:** URL-as-state for filters, virtualized grids, image optimization
4. **Cart State:** Context + useReducer vs Zustand, optimistic updates, localStorage sync
5. **Checkout:** Multi-step forms (React Hook Form + Zod), Stripe Elements, idempotency
6. **Cross-Cutting:** TypeScript entities, a11y, analytics hooks, route protection

### 📄 `07-saas-multi-tenant-architecture-qa.md` — SaaS Multi-Tenant Architecture
Full RADIO-framework system design:
1. **Tenant Resolution:** Subdomain vs path-based vs switcher patterns
2. **Authentication:** JWT + OIDC, Clerk/Auth0 Organizations integration
3. **RBAC Implementation:** Permission-based `<Protect>` component, route guards
4. **Tenant Context Provider:** API header injection, cache isolation on org switch
5. **White-Labeling:** Dynamic CSS variables, logo/branding from tenant config
6. **Data Isolation:** Query key scoping with `tenantId`, cache invalidation on switch

### 📄 `08-micro-frontends-and-monorepo-qa.md` — Micro-Frontends & Monorepo
Full architecture deep-dive:
1. **When MFEs Make Sense (And When They Don't):**
   - Team autonomy, independent deploys, polyglot stacks
   - Why small teams should avoid MFEs
2. **Module Federation Deep-Dive:**
   - Host/Remote configuration (Webpack 5 + Vite)
   - `singleton: true` and version mismatch handling
3. **Monorepo Tooling:** Nx vs Turborepo, affected commands, shared packages
4. **Cross-MFE Communication:** Custom events, URL params, scoped state
5. **Error Boundaries & Fallbacks:** Graceful degradation when remotes fail
6. **CI/CD & Deployment:** Independent pipelines, CDN versioning, rollback

### 📄 `09-anti-patterns-and-gotchas-qa.md` — Anti-Patterns & Gotchas Encyclopedia
The most common traps that burn production React apps:
1. **State Anti-Patterns:** God Context, prop drilling, derived state in useState
2. **Rendering Anti-Patterns:** Re-render cascades, inline objects breaking memo, unvirtualized lists
3. **Fetching Anti-Patterns:** Fetch-on-render waterfalls, race conditions, missing cancellation
4. **Architecture Anti-Patterns:** Type-based folders, God components, tightly coupled UI + business logic
5. **Bundle Anti-Patterns:** Monolithic entry bundles, unaudited imports, missing code splitting
6. **Security Anti-Patterns:** XSS via `dangerouslySetInnerHTML`, token storage in localStorage

### 📄 `10-architect-decision-scenarios-qa.md` — Architect Decision Scenarios
Real-world "what would you choose" interview scenarios:
1. **"We have a 3-year-old CRA app. Should we migrate to Next.js or Vite?"**
2. **"Product wants real-time collaborative editing. How do you architect it?"**
3. **"We need to support 50,000 concurrent dashboard users. What changes?"**
4. **"Two teams are fighting over Redux vs Zustand. How do you resolve this?"**
5. **"The bundle is 2.5MB. Walk me through how you'd cut it in half."**
6. **"Write an RFC for migrating from REST to GraphQL incrementally."**

---

## 🚦 Recommended Learning Tracks

### 🟡 Mid-Level → Senior Track
- `01-component-design-patterns-qa.md`
- `02-state-architecture-qa.md`
- `03-data-flow-and-fetching-qa.md`
- `09-anti-patterns-and-gotchas-qa.md`

### 🔴 Senior → Staff/Architect Track
- `04-performance-at-scale-qa.md`
- `05-bi-dashboard-architecture-qa.md`
- `06-ecommerce-architecture-qa.md`
- `07-saas-multi-tenant-architecture-qa.md`

### 🟣 Principal / Distinguished Track
- `08-micro-frontends-and-monorepo-qa.md`
- `10-architect-decision-scenarios-qa.md`
- All system design modules combined

---

## 📊 Coverage Matrix

| Domain | Modules | Question Archetypes |
|---|---|---|
| **Component Patterns** | 01 | 📖 Conceptual, 💻 Practical, 🧩 Output |
| **State & Data** | 02, 03 | 📖 Conceptual, 💻 Practical, 🐛 Debug |
| **Performance** | 04, 09 | 🐛 Debug, 💻 Practical, 🏗️ Architecture |
| **System Design (BI)** | 05 | 🏗️ Architecture, 📖 Conceptual |
| **System Design (E-Commerce)** | 06 | 🏗️ Architecture, 💻 Practical |
| **System Design (SaaS)** | 07 | 🏗️ Architecture, 💻 Practical |
| **System Design (MFE)** | 08 | 🏗️ Architecture, 📖 Conceptual |
| **Decision Making** | 10 | 🏗️ Architecture, 📖 Conceptual |
