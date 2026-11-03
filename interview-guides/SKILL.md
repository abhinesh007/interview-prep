# 🛠️ Skill Playbook: Interview Preparation Guide Generator & Mentor

> **Agnostic AI & Mentor Skill:** This playbook empowers any AI assistant, engineer, or mentor to seamlessly create, expand, audit, and practice interview preparation guides conforming strictly to the repository standards documented in [CONTEXT.md](CONTEXT.md).
> 
> **Prerequisite:** Before taking action, review [CONTEXT.md](CONTEXT.md) for architectural philosophy and [TEMPLATES.md](TEMPLATES.md) for boilerplate syntax.

---

## ⚡ Quick Workflow Selector

Choose an operational mode:

| Mode | Trigger / Goal | Primary Output |
|---|---|---|
| **Workflow 1: Blueprint Generator** | Initiating a new technology track (e.g., Node.js, Spring Boot, TypeScript) | `PLAN.md` and `00-table-of-contents.md` |
| **Workflow 2: Deep Q&A Module Author** | Generating or expanding a numbered module file | `NN-<topic-slug>-qa.md` (12–25 in-depth questions) |
| **Workflow 3: System Design Specialist** | Authoring senior frontend/fullstack system design & architecture | System design module using the RADIO framework |
| **Workflow 4: Mock Interviewer & Coach** | Conducting an interactive technical mock interview round | Step-by-step interview with probes, feedback, & scoring |
| **Workflow 5: Quality & Audit Guard** | Reviewing existing guides for depth, links, diagrams, & gotchas | Audit report with concrete improvements & fixes |

---

## 🚀 Workflow 1: New Tech Blueprint Generator

### Objective
Create a complete curriculum plan (`PLAN.md`) and navigation index (`00-table-of-contents.md`) for any new technology domain.

### Step-by-Step Procedure:
1. **Determine Module Sizing:**
   - **Large Ecosystems (12–15 modules):** Full frameworks or languages (e.g., Java & Spring Boot, Node.js & NestJS, Python & Django/FastAPI, Go, Next.js).
   - **Targeted / Specialized Domains (8–10 modules):** Specific libraries or infrastructure (e.g., Docker & Kubernetes, GraphQL, RxJS, Tailwind & Design Systems, CI/CD).
2. **Deconstruct the Technology into a Learning Journey:**
   - Modules `01–03`: Core fundamentals, memory/execution model, language primitives, compilation/runtime.
   - Modules `04–08`: Asynchronous patterns, state/data pipelines, networking, forms/validation, routing/APIs.
   - Modules `09–12`: Advanced patterns, performance profiling, memory leak prevention, security, enterprise tooling.
   - Modules `13–14`: Migration paths, ecosystem libraries, automated testing (unit, integration, mocking).
   - Module `15` (or final module): System design, architecture patterns, incident disaster recovery, and senior behavioral scenarios.
3. **Draft `PLAN.md`:**
   - Follow the structure in [TEMPLATES.md](TEMPLATES.md#1-planmd-template).
   - Enumerate every module with target question counts (12–25 questions per file).
   - List key sub-topics, gotchas to probe, and archetype requirements.
4. **Draft `00-table-of-contents.md`:**
   - Follow the structure in [TEMPLATES.md](TEMPLATES.md#2-00-table-of-contentsmd-template).
   - Include relative markdown links (`[Title](01-...-qa.md)`).
   - Group modules into distinct **Role-Based Learning Tracks** (e.g., Junior Fast-Track vs Senior Architect Track).

---

## ✍️ Workflow 2: Deep Q&A Module Author

### Objective
Author an exhaustive, production-grade module (`NN-<topic-slug>-qa.md`) matching the caliber of existing Angular and React guides.

### Quality Checklist:
- [ ] Contains 12 to 25 detailed questions.
- [ ] Structured into 4 to 6 logical thematic sub-sections plus a final **🎯 Quick-Fire & Trap Questions** section.
- [ ] Contains balanced distribution across difficulty levels (🟢 Junior, 🟡 Mid, 🔴 Senior, 🟣 Principal/Lead).
- [ ] Covers all 5 question archetypes:
  1. 📖 Conceptual & Deep-Dive
  2. 💻 Practical Coding & Refactoring
  3. 🧩 Output & Behavior Prediction
  4. 🐛 Debug & Bug Hunting
  5. 🏗️ Architecture & System Design
- [ ] Every single question includes:
  - Clear title (`### Q[N]: ...`)
  - Metadata badges (`**Difficulty:**`, `**Type:**`, `**Tags:**`)
  - Authoritative, in-depth **Answer** (with under-the-hood engine mechanics)
  - At least one code snippet with realistic variable names OR an ASCII/Unicode mental model diagram
  - A mandatory **⚠️ Gotcha / Interviewer Follow-up** block with simulated interviewer probe and senior response.

### Execution Steps:
1. **Read Existing Section Plan:** Check the module specification in that folder's `PLAN.md`.
2. **Scaffold Structure:** Begin with the `# NN — <Title>`, summary quote, and internal Table of Contents.
3. **Author Questions Iteratively:**
   - Prioritize explaining *why* something behaves the way it does at runtime (e.g., event loop ticks, GC behavior, reference vs value diffing).
   - Provide concrete code blocks with realistic names.
   - Highlight production bugs in the **⚠️ Gotcha** section.
4. **Author Quick-Fire Section:** End with 5–8 rapid-fire, high-yield interview questions targeting edge cases and common confusions.

---

## 🏗️ Workflow 3: System Design & Architecture Specialist

### Objective
Author or evaluate senior frontend and fullstack system design questions that separate senior/staff candidates from mid-level engineers.

### The RADIO Framework:
Every system design question must follow this 5-stage breakdown:

1. **R — Requirements Clarification (Functional & Non-Functional):**
   - Functional scope (e.g., real-time updates, infinite scroll, offline mode).
   - Non-functional budgets (latency < 100ms, 60fps scrolling, network payload budget < 200KB initial, memory footprint).
2. **A — Architecture & High-Level Topology:**
   - ASCII diagram of client-to-backend communication (CDN, WebSocket server, API Gateway, Cache layer).
   - Client topology (Feature modules, shared kernel, state synchronization layer).
3. **D — Data Model & API Contract:**
   - Normalized client cache schema.
   - API endpoints / WebSocket packet contracts.
   - Cursor-based pagination vs offset pagination trade-offs.
4. **I — Interface & Component Hierarchy:**
   - Component tree and separation of container (smart) vs presentational (dumb) components.
   - State ownership (Server cache vs UI state vs URL state).
5. **O — Optimizations, Resiliency & Disaster Scenarios:**
   - DOM Virtualization / windowing strategies.
   - Network resilience: exponential backoff, jitter, offline mutation queues (`IndexedDB`).
   - Security: CSP, token storage (memory vs `HttpOnly` cookie), XSS sanitization.
   - Disaster scenario: "What happens when the socket server crashes and 50,000 clients reconnect simultaneously? (Thundering herd prevention)."

---

## 🎙️ Workflow 4: Mock Interviewer & Practice Mode

### Objective
Act as a strict, senior interviewer conducting an interactive mock interview with the user.

### Rules of Engagement:
1. **Stage 1 — Question Presentation:**
   - Present ONE question at a time from a chosen module or track.
   - Display difficulty level and context, but omit the answer and gotchas.
2. **Stage 2 — Candidate Response Evaluation:**
   - Wait for the user's answer.
   - Evaluate against:
     - Conceptual accuracy
     - Completeness of edge cases
     - Performance and memory implications
     - Production readiness of any code provided
3. **Stage 3 — Probing Follow-Up (The Gotcha):**
   - Simulate a realistic senior interviewer probe:
     *"That works in standard cases, but what happens if the network drops midway?"* or
     *"How does your approach affect memory retention when this component unmounts?"*
4. **Stage 4 — Scoring & Model Answer:**
   - Provide constructive feedback (Junior / Mid / Senior rating for their answer).
   - Reveal the model answer, ASCII diagram, and best-in-class trade-off explanation.
   - Prompt the user when they are ready for the next question.

---

## 🔍 Workflow 5: Quality & Consistency Auditor

### Objective
Audit any existing technology guide or newly created module to guarantee it matches repository quality standards.

### Audit Checklist:
1. **Structural Completeness:**
   - Does `00-table-of-contents.md` exist and correctly link to every module?
   - Are file naming conventions strictly `NN-<slug>-qa.md`?
2. **Schema Adherence:**
   - Does every question have Difficulty, Type, Tags, Answer, and `⚠️ Gotcha / Follow-up`?
   - Are gotchas genuinely insightful, or just generic summaries?
3. **Technical Depth:**
   - Are answers explaining internal mechanics (e.g., compilation passes, engine internals, microtasks) or merely repeating basic documentation?
   - Are code blocks idiomatic, modern, and syntactically valid?
4. **Diagrams & Tables:**
   - Does the module contain ASCII/Unicode architecture diagrams and comparison tables?

### Remediation Action:
If deficiencies are identified, immediately report them with specific line references and propose exact replacement chunks.
