# 🏆 Tech Interview Preparation Mastery

> **Exhaustive, production-grade technical interview preparation guides** covering runtime internals, modern reactive paradigms, system design, performance profiling, and senior gotchas.

---

## 🧭 Repository Overview

This repository is built with a **senior-to-principal engineering mindset**. Rather than memorizing textbook trivia, these guides train you to explain *under-the-hood engine mechanics*, predict tricky runtime behaviors, hunt production bugs, and architect high-scale systems.

### 📚 Available Interview Tracks

| Technology | Modules | Focus Areas | Guide Link |
|---|:---:|---|:---:|
| 🅰️ **Angular** | 15 Modules | Standalone, Hierarchical DI, Zoneless Change Detection, Signals (`linkedSignal`, `resource`), RxJS Interop, Strictly Typed Forms, NgRx SignalStore, Nx Monorepos, Legacy Migration (v10 to v22), SSR Hydration & `@defer`, Vitest/Harnesses, Micro-frontends | [Explore Angular Guide →](angular/00-table-of-contents.md) |
| ⚛️ **React** | 15 Modules | Virtual DOM & Fiber Reconciliation, Automatic Batching, Hooks Deep Dive, React 19 (`useActionState`, `useOptimistic`), Compound Components, Zustand/Redux Toolkit, TanStack Query, MSW & RTL Testing, Virtualization, TypeScript Patterns, RADIO System Design Framework | [Explore React Guide →](react/00-table-of-contents.md) |
| 🚀 *Future Tracks* | Planned | *Node.js, TypeScript Deep Dive, Java & Spring Boot, Full-Stack System Design, Cloud & DevOps* | [See Skill to Generate](SKILL.md#workflow-1-new-tech-blueprint-generator) |

---

## 🤖 AI-Tool Agnostic Architecture

This folder contains universal context and skill playbooks that work across **any AI IDE or tool** (Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, or terminal LLMs):

- 🧠 [**`CONTEXT.md`**](CONTEXT.md): Repository standards, directory anatomy, question taxonomy, difficulty definitions, and design principles. Read this to understand the established style.
- 🛠️ [**`SKILL.md`**](SKILL.md): Actionable, step-by-step workflows for:
  1. *Blueprint Generator:* Scaffolding a new technology track (`PLAN.md` + `00-table-of-contents.md`).
  2. *Deep Q&A Author:* Writing 12–25 question modules with runtime diagrams, code, and interviewer gotchas.
  3. *System Design Specialist:* Breaking down senior architecture problems using the **RADIO** framework.
  4. *Mock Interviewer:* Simulating a live technical interview with probing follow-ups and scoring.
  5. *Quality Auditor:* Reviewing existing content for consistency, formatting, and depth.
- 📋 [**`TEMPLATES.md`**](TEMPLATES.md): Standardized boilerplate templates for instant authoring.

---

## 🎯 Question Schema at a Glance

Every question in every track follows this high-yield format:

```markdown
### Q[N]: [Descriptive Title]
**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[In-depth technical explanation, ASCII data-flow diagrams, and production-grade code]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Probing question, edge-case trap, or failure scenario]"  
*Senior Answer:* [How a top engineer handles the trade-offs and mitigates pitfalls]
```

---

## 💡 How to Use for Preparation

1. **Self-Study:** Follow the **Recommended Learning Tracks** inside each technology's `00-table-of-contents.md` (Junior, Mid, Senior, or Architect tracks).
2. **Interactive Mock Interviews:** Instruct your AI assistant:
   > *"Act as an interviewer following [SKILL.md](SKILL.md) Workflow 4. Give me a Senior-level question from Angular Module 04 on Signals, probe my response, and grade me."*
3. **Expand to New Topics:** Instruct your AI assistant:
   > *"Follow [SKILL.md](SKILL.md) Workflow 1 to generate a Blueprint plan and Table of Contents for Node.js backend interview prep."*
