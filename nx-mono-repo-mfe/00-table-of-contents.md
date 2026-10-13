# 🎯 Nx Monorepo & Micro-Frontends (MFEs) Interview Master Index & Table of Contents

> Complete, production-grade, section-wise **Nx Monorepo and Micro-Frontends (MFEs)** interview preparation guide covering workspace architecture, computation caching, module boundary enforcement, Webpack & Enhanced Module Federation 2.0, Angular Host/Remotes, Zoneless reactive architecture, Zone.js collision gotchas, React UI library polyglot interop, Node.js/NestJS fullstack code sharing, design systems, resilience error boundaries, authentication security, and senior enterprise system design using the **RADIO Framework**.

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Target Qs | Link | Status |
|:---:|:---|:---|:---:|:---:|:---:|
| **00** | **Table of Contents** | Master Guide Index, Difficulty Taxonomy & Role-Based Learning Tracks | Index | [Read Index →](00-table-of-contents.md) | 🎯 Ready |
| **01** | **Nx Monorepo Core & Architecture** | Project Graph DAG, Computation Hashing, Local/Remote Caching, Task Pipelines (`dependsOn`), Monorepo vs Polyrepo Trade-offs | 18–22 | [Read Guide →](01-nx-monorepo-core-and-architecture-qa.md) | ✅ Ready |
| **02** | **Workspace Governance & Boundaries** | Tags (`scope`/`type`), `@nx/enforce-module-boundaries`, App/Lib Taxonomy, Circular Dependencies & Custom Generators/Executors | 18–22 | [Read Guide →](02-nx-workspace-governance-and-boundaries-qa.md) | ✅ Ready |
| **03** | **CI/CD, Affected & Release Management** | `nx affected` Git Diffing, Distributed Task Execution (DTE), Nx Cloud, Single Version Policy vs Independent Releases (`nx release`) | 16–20 | [Read Guide →](03-nx-cicd-affected-and-release-management-qa.md) | ✅ Ready |
| **04** | **Micro-Frontends & Module Federation Core**| MFE Paradigms (Iframes, Single-SPA vs Module Federation), `remoteEntry.js` Container API (`init`/`get`), Asynchronous Bootstrap Boundary | 18–22 | [Read Guide →](04-micro-frontends-architecture-and-module-federation-core-qa.md) | ✅ Ready |
| **05** | **Module Federation 2.0 & Modern Bundlers** | `@module-federation/enhanced`, Federated Types (`dts-plugin`), Rspack in Nx (`@nx/rspack`), Vite Federation Trade-offs | 16–20 | [Read Guide →](05-module-federation-2-and-modern-bundlers-qa.md) | ✅ Ready |
| **06** | **Angular Host & Remotes Architecture** | Angular Shell (`@nx/angular:host`), Dynamic Remotes (`loadRemoteModule`), Angular Router Integration, Standalone Components & Manifests | 18–22 | [Read Guide →](06-angular-host-and-remotes-architecture-qa.md) | ✅ Ready |
| **07** | **Angular Runtime Gotchas, Zoneless & DI** | Zone.js Collision Traps, Zoneless Angular MFEs (Signals), Hierarchical DI Scope Leaks, `providedIn: 'root'` Pitfalls & SSR Hydration | 18–22 | [Read Guide →](07-angular-runtime-gotchas-zoneless-and-di-qa.md) | ✅ Ready |
| **08** | **React UI Libraries & Polyglot MFE Interop**| Cross-Framework Integration (React in Angular Host), Adapter Directive Pattern (`createRoot`/`unmount`), Web Components, Buildable Libs & Storybook | 18–22 | [Read Guide →](08-react-ui-libraries-and-polyglot-mfe-interop-qa.md) | ✅ Ready |
| **09** | **Cross-MFE State, Communication & Routing**| Decoupled State Topology, Global Store Anti-Pattern, Browser Event Bus, Routing Sync, Back-Button Desync & `BroadcastChannel` | 18–22 | [Read Guide →](09-cross-mfe-communication-state-and-routing-sync-qa.md) | ✅ Ready |
| **10** | **Design Systems, Styling & CSS Isolation** | CSS Bleeding Wars, Shadow DOM vs CSS Modules vs Scoped CSS, Tailwind CSS v3/v4 in Nx Monorepo, Token Sharing & Overlay Portal Traps | 16–20 | [Read Guide →](10-design-systems-styling-and-css-isolation-qa.md) | ✅ Ready |
| **11** | **Node.js, NestJS & Fullstack Monorepos** | NestJS/Fastify BFFs, Shared DTOs/Zod Schemas, Prisma/Drizzle ORM Sharing, OpenAPI/tRPC Contracts & End-to-End Type Safety | 16–20 | [Read Guide →](11-nodejs-nestjs-and-fullstack-monorepo-qa.md) | ✅ Ready |
| **12** | **Shared Dependencies & Version Traps** | `shared` Config (`singleton`, `strictVersion`, `requiredVersion`, `eager`), React Dispatcher Mismatch Bug, Angular Multi-Zone Crash & Tree-Shaking | 18–22 | [Read Guide →](12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md) | ✅ Ready |
| **13** | **Fault Tolerance, Error Boundaries & Offline**| Remote 404 & CDN Drops, React Error Boundaries, Angular Fallback Components, Circuit Breaker, Exponential Backoff & Service Worker Caching | 16–20 | [Read Guide →](13-resilience-fault-tolerance-and-offline-fallbacks-qa.md) | ✅ Ready |
| **14** | **Security, Authentication & Multi-Tenancy** | OAuth2/OIDC with PKCE Across MFEs, Token Storage (`HttpOnly` vs Memory), CSP Nonces, Untrusted Script Sandboxing & Multi-Tenant Routing | 16–20 | [Read Guide →](14-security-authentication-and-multi-tenant-mfe-qa.md) | ✅ Ready |
| **15** | **Testing Strategies & Local DX Orchestration**| Vitest Unit Mocks, Playwright Host+Remote E2E Tests, Nx Dev vs Static Remotes (`--devRemotes`), Local API Proxying & Mock Service Worker (MSW) | 16–20 | [Read Guide →](15-testing-strategies-and-local-dx-orchestration-qa.md) | ✅ Ready |
| **16** | **Enterprise System Design Case Studies** | Senior System Design Scenarios using the **RADIO Framework**: E-Commerce Multi-Framework Platform, SaaS Suite & Monolith-to-MFE Migration | 12–15 | [Read Guide →](16-enterprise-system-design-case-studies-and-migration-qa.md) | ✅ Ready |

---

## 🎯 Question Format Standard

Every question in this repository adheres to this standardized interview format:

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[In-depth technical explanation covering engine mechanics, runtime behavior, and architecture under the hood. Accompanied by ASCII diagrams, comparison matrices, exact configuration blocks, and idiomatic production-tested TypeScript/JavaScript code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Edge-case challenge, gotcha trap, production disaster scenario, or follow-up probe]"  
*Senior Answer:* [How a staff/principal engineer addresses the challenge with trade-offs, runtime mitigations, and architectural guardrails.]
```

---

## 🚦 Recommended Role-Based Learning Tracks

```text
┌────────────────────────────────────────────────────────────────────────┐
│               RECOMMENDED ROLE-BASED LEARNING PATHWAYS                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 🟢 Track 1: Monorepo & MFE Foundations (Junior / Mid Fast-Track)
*Core mental models, workspace fundamentals, and baseline federation setup:*
- `01-nx-monorepo-core-and-architecture-qa.md` (Project graph, caching, commands)
- `02-nx-workspace-governance-and-boundaries-qa.md` (Tags, lint boundaries, libraries)
- `04-micro-frontends-architecture-and-module-federation-core-qa.md` (MFE concepts, `remoteEntry.js`)
- `06-angular-host-and-remotes-architecture-qa.md` (Angular host, remotes, routes)
- `10-design-systems-styling-and-css-isolation-qa.md` (CSS isolation, Tailwind, styling)

### 🟡 Track 2: Enterprise Angular & Polyglot MFEs (Frontend Lead Track)
*Framework mechanics, cross-framework interop, communication, and state:*
- `06-angular-host-and-remotes-architecture-qa.md` (Dynamic federation, standalone, manifests)
- `07-angular-runtime-gotchas-zoneless-and-di-qa.md` (Zone.js collision traps, Zoneless, DI)
- `08-react-ui-libraries-and-polyglot-mfe-interop-qa.md` (React inside Angular, Web Components, adapters)
- `09-cross-mfe-communication-state-and-routing-sync-qa.md` (Decoupled state, event bus, URL sync)
- `12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md` (Singletons, strictVersion, traps)

### 🔴 Track 3: Fullstack, Shared Contracts & Bundlers (Fullstack & Node.js Track)
*Backend integration, modern build tooling, type sharing, and performance:*
- `01-nx-monorepo-core-and-architecture-qa.md` (Computation hashing, task pipelines)
- `05-module-federation-2-and-modern-bundlers-qa.md` (Module Federation 2.0, Rspack, Vite)
- `11-nodejs-nestjs-and-fullstack-monorepo-qa.md` (NestJS, Zod, OpenAPI, Prisma, DTOs)
- `14-security-authentication-and-multi-tenant-mfe-qa.md` (OIDC, HttpOnly tokens, CSP, RBAC)
- `15-testing-strategies-and-local-dx-orchestration-qa.md` (Vitest, Playwright, Dev Remotes)

### 🟣 Track 4: Principal Architect & Scale Track (Senior Architect & DevOps Track)
*High-scale CI/CD, distributed execution, resilience, disaster recovery, and system design:*
- `03-nx-cicd-affected-and-release-management-qa.md` (Affected analysis, DTE, release automation)
- `05-module-federation-2-and-modern-bundlers-qa.md` (Rspack, Federated Types)
- `12-shared-dependencies-singletons-and-version-mismatch-traps-qa.md` (Dependency negotiation)
- `13-resilience-fault-tolerance-and-offline-fallbacks-qa.md` (Circuit breakers, fallbacks, recovery)
- `14-security-authentication-and-multi-tenant-mfe-qa.md` (Enterprise security, tenant routing)
- `16-enterprise-system-design-case-studies-and-migration-qa.md` (RADIO Framework case studies)

---

## 🏛️ The System Design Frameworks for MFEs

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

## 💡 Quick Reference: High-Frequency Interview Gotchas

| Gotcha / Trap | Root Cause | Production Impact | Mitigation Strategy |
|:---|:---|:---|:---|
| **Invalid Hook Call / Multiple Reacts** | Remote loads its own React instance while Host has another instance | React crashes on `useState` / `useContext` | Configure `singleton: true`, `strictVersion: true` in federation config |
| **Zone.js Multi-Zone Pollution** | Host and Remote both load `zone.js` or run conflicting monkey-patches | Infinite change detection ticks or missed updates | Load `zone.js` once in Host only as a strict singleton, or migrate to Zoneless |
| **React Root Memory Leak in Angular** | Component unmounted by Angular router without calling `root.unmount()` | Retained DOM trees, Fiber nodes & event listeners leak memory | Enforce strict cleanup in `ngOnDestroy()` via custom adapter directive |
| **Eager Consumption Panic** | Shared module consumed before asynchronous initialization boundary | `Uncaught Error: Shared module is not available for eager consumption` | Move bootstrapping into `bootstrap.ts` loaded via `import('./bootstrap')` |
| **Host / Remote Router Clashing** | Both routers listen to `popstate` and manipulate browser history | Infinite back-button redirect loop or desynchronized views | Host owns root route; Remote uses sub-route matching or relative basename |
| **CSS Bleeding & Reset Overrides** | Global CSS reset or Tailwind rules from Remote leak into Host shell | Broken buttons, font shifts, layout destruction | Use CSS Modules, container `@scope`, or strict prefixing (`tw-remote-`) |
| **404 Remote Script Crash** | Remote CDN endpoint down or chunk name altered during new deployment | White screen of death across the entire application | Wrap lazy remotes in Error Boundaries and Angular fallback components |
| **Tree-Shaking Disablement** | Marking an entire multi-package library as shared in Module Federation | 500KB+ bloated bundles downloaded over network | Only share minimal core packages; bundle and tree-shake utility libs locally |
