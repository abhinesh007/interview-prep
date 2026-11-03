# 📋 Interview Prep Master Templates

> **Purpose:** Ready-to-use, standardized Markdown templates for authoring curriculum plans, tables of contents, standard Q&A modules, and system design scenarios.

---

## 1. `PLAN.md` Template

Use this template when planning a new technology guide:

```markdown
# 📋 [Technology Name] Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise [Technology] interview Question & Answer guide in `interview-prep/[technology-folder]`.
> Aligned with modern standards ([Modern Versions]), runtime mechanics, architectural patterns, state management, testing, and system design.

---

## 🎯 Design Principles & Structure

Every question in the guide adheres to the standardized interview format:

\`\`\`markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** \`[Tag1]\` \`[Tag2]\`

**Answer:**
[Authoritative explanation accompanied by idiomatic code blocks or ASCII diagrams]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Edge-case or trap probe]"  
*Senior Answer:* [Nuanced answer explaining runtime behavior and mitigations]
\`\`\`

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|---|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation, Indexing, Study Paths & Difficulty Matrix | Index |
| `01` | [`01-fundamentals-qa.md`](01-fundamentals-qa.md) | Runtime engine, core execution model, primitives | 18–22 |
| `02` | [`02-intermediate-topic-qa.md`](02-intermediate-topic-qa.md) | Component architecture / Service layer / Data flow | 15–18 |
| ... | ... | ... | ... |
| `[N]` | [`[N]-system-design-qa.md`]([N]-system-design-qa.md) | Enterprise architectures, scale, disaster recovery | 12–15 |

---

## 📑 Detailed Section Specifications

### 📄 `01-fundamentals-qa.md` — Core Architecture
1. **Runtime & Engine Primitives:**
   - Topic A: Mechanics and compilation model.
   - Topic B: Memory lifecycle and garbage collection.
2. **Execution & Event Loop:**
   - 🧩 Output: Prediction of execution ordering.
   - 🐛 Bug: Common initialization pitfalls.
```

---

## 2. `00-table-of-contents.md` Template

Use this template for the navigation index of a technology directory:

```markdown
# 🎯 [Technology Name] Interview Master Index & Table of Contents

> Complete section-wise [Technology Name] interview preparation guide covering core fundamentals, advanced paradigms, enterprise patterns, performance profiling, and system design.

---

## 📚 Study Modules

| Module | Title | Topics Covered | Link | Status |
| :---: | :--- | :--- | :---: | :---: |
| **00** | **Table of Contents** | Guide Index, Study Paths & Navigation | [Read Index →](00-table-of-contents.md) | 🎯 Ready |
| **01** | **Core Fundamentals** | Engine internals, memory model, compilation | [Read Guide →](01-fundamentals-qa.md) | ✅ Ready |
| **02** | **Deep Dive Domain** | Communication, dependency lifecycles, APIs | [Read Guide →](02-topic-qa.md) | ✅ Ready |
| ... | ... | ... | ... | ... |
| **[N]** | **System Design & Scenarios** | Scalability, resilience, enterprise architecture | [Read Guide →]([N]-system-design-qa.md) | ✅ Ready |

---

## 🎯 Question Format Standard

Each question in every document follows this standardized format:

\`\`\`markdown
### Q[N]: [Title of the Question]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** \`[Tag1]\` \`[Tag2]\`

**Answer:**
[Technical explanation with idiomatic code examples and ASCII diagrams]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Interviewer challenge or edge-case trap]"  
*Senior Answer:* [Senior engineer response with trade-off analysis]
\`\`\`

---

## 🚦 Recommended Learning Tracks

### 🟢 Junior Track (Foundations)
- `01-fundamentals-qa.md`
- `02-intermediate-topic-qa.md`

### 🟡 Mid-Level Track (Production Engineering)
- `03-async-patterns-qa.md`
- `05-state-management-qa.md`
- `08-networking-caching-qa.md`

### 🔴 Senior & Architect Track (Scale & Internals)
- `04-engine-internals-qa.md`
- `10-performance-profiling-qa.md`
- `[N]-system-design-qa.md`
```

---

## 3. `NN-<topic-slug>-qa.md` Standard Module Template

Use this template when authoring numbered module files:

```markdown
# [NN] — [Module Title]

> [Concise 1-2 sentence subtitle highlighting key topics covered in this module].

---

## 📑 Table of Contents
1. [First Sub-Topic Theme](#1-first-sub-topic-theme)
2. [Second Sub-Topic Theme](#2-second-sub-topic-theme)
3. [Third Sub-Topic Theme](#3-third-sub-topic-theme)
4. [Fourth Sub-Topic Theme](#4-fourth-sub-topic-theme)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. First Sub-Topic Theme

### Q1: [Realistic, Clear Question Title]
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Core]` `[Architecture]`

**Answer:**
[Clear, authoritative explanation of how this works under the hood.]

Key architectural pillars:
- **Concept 1:** Deep explanation.
- **Concept 2:** Deep explanation.

```text
┌─────────────────┐       ┌─────────────────┐
│   Component A   │ ────► │   Component B   │
└─────────────────┘       └─────────────────┘
```

```typescript
// Idiomatic, production-grade code example
export class UserService {
  private readonly apiUrl = '/api/v1/users';
  
  async fetchUserProfile(id: string): Promise<User> {
    const response = await fetch(`${this.apiUrl}/${id}`);
    if (!response.ok) throw new Error('User fetch failed');
    return response.json();
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if this operation is called multiple times concurrently?"  
*Senior Answer:* [Explain race conditions, cancellation mechanisms, or idempotency techniques.]

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q[X]: [Rapid-Fire Trap Question]
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[Gotcha]`

**Answer:**
[Direct, punchy explanation in 2-3 sentences with immediate fix.]
```

---

## 4. System Design Question Template (RADIO Framework)

Use this template for senior/staff architecture questions:

```markdown
### Q[N]: System Design: Architect [Feature / Application Name]
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[Architecture]` `[Scale]` `[Resilience]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Functional Requirements:**
  - Real-time updates with sub-second latency.
  - Infinite scroll / windowed feeds.
  - Offline view capability with synchronization on reconnect.
- **Non-Functional Requirements:**
  - Initial JS bundle impact < 150KB gzipped.
  - Smooth 60fps frame budget during interaction.
  - Zero memory leaks during prolonged sessions (>2 hours).

#### 2. High-Level Architecture & Topology (A)

```text
┌──────────────┐         WebSocket / SSE         ┌─────────────────┐
│              │ ◄─────────────────────────────► │ Real-Time Push  │
│  Client App  │                                 └─────────────────┘
│  (UI / State)│         HTTP REST / GraphQL     ┌─────────────────┐
│              │ ◄─────────────────────────────► │ API Gateway     │
└──────────────┘                                 └─────────────────┘
```

#### 3. Data Model & State Strategy (D)
- **Normalized Client Cache:**
  - Entities stored by ID to prevent duplicated records across UI widgets.
- **Pagination Strategy:**
  - Cursor-based pagination (`cursor = timestamp_id`) to prevent duplicate items when new records arrive.

#### 4. Interface & Component Hierarchy (I)
- `FeedContainer` (Smart container managing subscriptions and viewport observers).
  - `VirtualList` (Windowed renderer managing DOM recycling).
    - `FeedItemCard` (Pure presentational component with memoized bindings).

#### 5. Optimizations, Resiliency & Disaster Scenarios (O)
- **DOM Virtualization:** Only rendering items within `viewport ± 500px` buffer to cap DOM node count below 100 elements.
- **Thundering Herd Mitigation:** When the backend reconnects, clients jitter their reconnection interval (`reconnectTime = min(30s, 2^attempt * 1000 + random(0, 1000))`).
- **Memory Management:** Purging off-screen cached media and detached event listeners on unmount.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you preserve scroll position when the user navigates away to a detail page and clicks 'Back'?"  
*Senior Answer:* [Explain session storage scroll cache keyed by route URL combined with restoring cached state prior to render paint.]
```
