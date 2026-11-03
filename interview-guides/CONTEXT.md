# 🧠 Interview Prep Repository Context

> **Mission:** This repository houses exhaustive, production-grade technical interview preparation guides. It is designed to prepare engineers for modern technical interviews ranging from **🟢 Junior** to **🟣 Principal / Staff / Architect** levels, with heavy emphasis on runtime mechanics, performance trade-offs, bug-hunting traps, and frontend/full-stack system design.

---

## 📁 Repository Structure & Anatomy

Each technology domain is encapsulated in its own directory at the root of `interview-prep/`.

```text
interview-prep/
├── CONTEXT.md                    # Core repository context, architecture & standards (this file)
├── SKILL.md                      # AI & mentor skill playbook (executable workflows)
├── TEMPLATES.md                  # Copy-paste blueprints for plans, TOCs, and Q&A modules
├── README.md                     # Human-friendly directory index and study navigation
├── angular/                      # Complete 15-module Angular guide (Angular 14–22, Signals, Zoneless)
│   ├── PLAN.md                   # Master plan with roadmap, objectives & archetype targets
│   ├── 00-table-of-contents.md   # Index table with links, difficulty matrix & study tracks
│   ├── 01-core-fundamentals-qa.md
│   ├── 02-dependency-injection-qa.md
│   ├── ...
│   └── 15-system-design-and-senior-scenarios-qa.md
├── react/                        # Complete 15-module React guide (React 18–19, Fiber, Hooks, Next)
│   ├── PLAN.md                   # Master curriculum blueprint
│   ├── 00-table-of-contents.md   # Topic index and study pathways
│   ├── 01-fundamentals-qa.md
│   ├── 02-state-and-lifecycle-qa.md
│   ├── ...
│   └── 15-behavioral-and-system-design-qa.md
└── <future-topic>/               # e.g., node, java-spring, typescript, nextjs, system-design
    ├── PLAN.md
    ├── 00-table-of-contents.md
    └── NN-<topic-slug>-qa.md
```

---

## 🏛️ Directory Artifact Standards

Every technology folder (`angular/`, `react/`, etc.) must strictly contain the following three tiers of artifacts:

### 1. `PLAN.md` (Curriculum Blueprint)
- Contains the overarching vision, target versions, design principles, and comprehensive breakdown of every planned module.
- Specifies target question counts per module (typically 12–25 questions per file).
- Outlines the sub-sections, conceptual traps, coding refactors, and output-prediction exercises.

### 2. `00-table-of-contents.md` (Master Navigation & Tracks)
- A clean, Markdown-formatted table linking to all module files using clickable links (`[Title](01-...-qa.md)`).
- Maps each module to difficulty levels and readiness status.
- Defines **Role-Based Learning Tracks** (e.g., *Junior Track*, *Senior Architect Track*, *Modern Migration Track*).

### 3. `NN-<topic-slug>-qa.md` (Numbered Deep-Dive Modules)
- Zero-padded two-digit prefix: `01`, `02`, ..., `15`.
- Contains 12 to 25 deeply detailed questions grouped into 4 to 6 logical thematic sub-sections.
- Concludes with a dedicated **🎯 Quick-Fire & Trap Questions** section.

---

## 🎯 Question Schema & Anatomy

Every question in this repository adheres to this standardized structure:

```markdown
### Q[N]: [Clear, Realistic Question Title]
**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation. Explains how things work under the hood rather than reciting surface definitions. Accompanied by ASCII/Unicode mental model diagrams, tables, and idiomatic production-quality code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[How the interviewer probes deeper, edge-case questions, runtime pitfalls, or trap scenarios]"  
*Senior Answer:* [How a top-tier engineer addresses the trap with nuance, trade-offs, and mitigation strategies.]
```

### Difficulty Taxonomy:
- 🟢 **Junior:** Core syntax, foundational concepts, basic lifecycle, fundamental APIs, distinguishing libraries vs frameworks.
- 🟡 **Mid:** Component communication, reactive patterns, asynchronous data flow, forms, caching, standard performance optimizations.
- 🔴 **Senior:** Runtime engine internals (Fiber reconciliation, Zone.js patching vs Zoneless scheduling, Injection Contexts), memory leak profiling, custom compiler hooks, concurrency.
- 🟣 **Principal / Lead:** Monorepo architecture, microfrontends, cross-cutting enterprise security, hydration/SSR pipelines, large-scale refactoring and multi-version migration strategies.

### Five Mandatory Question Archetypes:
1. 📖 **Conceptual & Deep-Dive:** Explains runtime mechanics, memory lifecycles, and architectural trade-offs.
2. 💻 **Practical Coding & Refactoring:** Real-world implementations (custom hooks, functional interceptors, signal stores) with clean TypeScript/JavaScript.
3. 🧩 **Output & Behavior Prediction:** Execution ordering, microtask/macrotask queues, reactivity glitches, closure staleness, batching semantics.
4. 🐛 **Debug & Bug Hunting:** Finding subtle production bugs (memory leaks, injection errors, de-synchronization, race conditions).
5. 🏗️ **System Design & Enterprise Architecture:** Component hierarchies, state topology, data contracts, pagination strategies, resilience, and offline caching.

---

## 🏗️ System Design & Architecture Standards

When authoring system design modules (e.g., Module 15 in React/Angular or dedicated System Design tracks), adhere to the **RADIO Framework**:

```text
┌────────────────────────────────────────────────────────┐
│ R - Requirements Clarification (Functional & Non-Func) │
│ A - Architecture & High-Level Component Diagram        │
│ D - Data Model & API Contract Design                   │
│ I - Interface / Component Hierarchy & State Strategy   │
│ O - Optimizations, Edge Cases, Resiliency, Security    │
└────────────────────────────────────────────────────────┘
```

### Crucial Topics Covered in Architecture Modules:
- **Scalable Client Topologies:** Independent widget communication, event buses vs centralized stores, broadcast channels.
- **Data Streaming & Real-Time:** WebSockets vs Server-Sent Events (SSE) vs polling with exponential backoff and jitter.
- **DOM Scale & Virtualization:** Windowing high-volume feeds, dynamic height calculations, preserving scroll restoration.
- **Resilience & Fault Tolerance:** Circuit breakers, retry storms prevention, offline queues (`IndexedDB`), graceful degradation.
- **Enterprise Migrations:** Breaking changes, deprecation ladders (e.g., Angular 10 to 22 Ivy/MDC/Control Flow/Zoneless, React 16 to 19 Fiber/Concurrent/Server Components).

---

## 🎨 Visual & Formatting Philosophy

1. **ASCII / Unicode Architecture Diagrams:** Use clean box-drawing diagrams (`┌`, `─`, `│`, `└`, `───►`) to visualize workflows, injectors, render pipelines, and state flows.
2. **Production-Realistic Code:** Use meaningful domain models (`User`, `CartItem`, `AuthInterceptor`, `OrderService`) rather than placeholder variables (`foo`, `bar`).
3. **Comparative Analysis Tables:** Always compare alternatives (e.g., AOT vs JIT, Signals vs Observables, Redux vs Zustand, SSR vs SSG vs ISR) using structured markdown tables.
4. **Tone:** Authoritative, direct, practical, and interview-tailored. Emphasize *why* an architectural choice was made, what trade-offs exist, and what can go wrong in production.
