# 12 — Case Study: Collaborative Kanban (Trello / Jira)

> End-to-End System Design of a Collaborative Kanban Board evaluated via the **RADIO Framework**: Drag-and-Drop Physics, Fractional Indexing (Lexorank Math), Multi-User State Synchronization (CRDTs vs OT), and Undo/Redo Stacks.

---

## 📑 Table of Contents
1. [Requirements & Scoping (R)](#1-requirements--scoping-r)
2. [High-Level Architecture & Multi-User Synchronization (A)](#2-high-level-architecture--multi-user-synchronization-a)
3. [Data Model & Fractional Indexing Math (Lexorank) (D)](#3-data-model--fractional-indexing-math-lexorank-d)
4. [Component Hierarchy & Drag-and-Drop Mechanics (I)](#4-component-hierarchy--drag-and-drop-mechanics-i)
5. [Optimizations, Resiliency & Disaster Scenarios (O)](#5-optimizations-resiliency--disaster-scenarios-o)
6. [🎯 Interviewer Probes & Senior Follow-ups](#6--interviewer-probes--senior-follow-ups)

---

## 1. Requirements & Scoping (R)

### Functional Requirements:
- **Interactive Multi-Column Board:** Dragging cards freely within a column and across columns.
- **Real-Time Multi-User Collaboration:** Card moves, title edits, and column reordering made by other users reflect instantly on screen.
- **Fractional Card Ordering:** Reordering cards must be an $O(1)$ database mutation without rewriting indices of subsequent cards.
- **Undo / Redo Stack:** Users can press `Cmd+Z` to revert their recent card movement without reverting actions taken by remote collaborators.
- **Auto-Scrolling Viewport:** Dragging a card near the viewport boundary auto-scrolls the board smoothly.

### Non-Functional Requirements & Budgets:
- **Drag Interaction Budget:** 60fps locked ($16.6\text{ms}$ frame time); zero jank during drag operations.
- **Conflict Free:** Deterministic convergence when two users move the same card concurrently.
- **Payload Footprint:** Delta state broadcasts over WebSockets under **<500 bytes** per mutation.

---

## 2. High-Level Architecture & Multi-User Synchronization (A)

```text
Collaborative Kanban Board Architecture:

Client 1 (Moving Card A)                       Client 2 (Viewing Board)
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│ Pointer Move Event                   │        │ Remote Socket Listener               │
│ - Instant CSS GPU transform          │        │ - Receives CardMoveDelta             │
│ - Compute collision with column drop │        │ - Reconciles CRDT vector             │
│ - Optimistic local state update      │        │ - Animates Card A smoothly into place│
└──────────────────┬───────────────────┘        └──────────────────▲───────────────────┘
                   │ WSS Mutation                                  │ WSS Broadcast
                   ▼                                               │
┌──────────────────────────────────────────────────────────────────┴───────────────────┐
│ Real-Time Collaboration Gateway (CRDT Engine: Yjs / Automerge or Centralized Server)  │
│ - Verifies Lexorank validity                                                         │
│ - Resolves concurrent moves via Last-Write-Wins (LWW) or Lamport Timestamps          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model & Fractional Indexing Math (Lexorank) (D)

### The $O(N)$ Reordering Disaster vs Fractional Indexing:
- **Naive Integer Approach:** If cards have indices `[1, 2, 3, 4, 5]` and you move Card 5 to the top (position 1), you must update the indices of Cards 1, 2, 3, 4 to `[2, 3, 4, 5]`. In a column with 5,000 cards, one drag operation forces **5,000 database row updates**!

#### The Solution: Fractional Indexing (Lexorank)
Assign fractional float or lexicographical string ranks. Inserting between two cards is an **$O(1)$ operation**:

```text
Fractional Indexing Insertion:

Position 1: Rank = 1000.0
                              ◄── Insert new card here! Rank = (1000 + 2000) / 2 = 1500.0!
Position 2: Rank = 2000.0         (Zero updates needed for any other cards!)
Position 3: Rank = 3000.0
```

#### Lexicographical String Math (Lexorank):
Because floating-point numbers eventually suffer from 64-bit precision exhaustion ($1.0000000000000002$), production systems (Jira, Trello) use string midpoints:
- Between `"a"` and `"c"` $\implies$ `"b"`
- Between `"a"` and `"b"` $\implies$ `"an"`
- Between `"an"` and `"b"` $\implies$ `"ao"`

```typescript
// Production Normalized Kanban State
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  rank: string; // Lexorank string token e.g., "0|hzzzzz:"
  version: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cardIds: string[]; // Sorted by card.rank
}

export interface BoardState {
  columns: Record<string, KanbanColumn>;
  cards: Record<string, KanbanCard>;
  columnOrder: string[];
}
```

---

## 4. Component Hierarchy & Drag-and-Drop Mechanics (I)

### Why HTML5 Drag & Drop API Fails for Production Boards:
1. Cannot customize the drag ghost image across mobile touch browsers.
2. Janky animations; no physics or spring velocity.
3. Completely unsupported on mobile Safari/Chrome touch events without heavy polyfills.

#### Production Standard: Pointer Events (`pointerdown`, `pointermove`, `pointerup`)
```typescript
export function useDraggableCard(cardId: string) {
  const cardRef = useRef<HTMLDivElement>(null);
  let startX = 0, startY = 0;

  const onPointerDown = (e: React.PointerEvent) => {
    // 1. Capture pointer to ensure tracking outside element bounds
    cardRef.current?.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current?.hasPointerCapture(e.pointerId)) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // 2. Hardware-accelerated GPU translation for 60fps drag
    cardRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    cardRef.current?.releasePointerCapture(e.pointerId);
    cardRef.current.style.transform = '';
    // 3. Calculate target drop column & dispatch optimistic move
    dispatchCardDrop(cardId, e.clientX, e.clientY);
  };

  return { cardRef, onPointerDown, onPointerMove, onPointerUp };
}
```

---

## 5. Optimizations, Resiliency & Disaster Scenarios (O)

### 1. Viewport Auto-Scrolling:
When dragging a card within **50px** of the screen edge, initiate a continuous `requestAnimationFrame` loop that increments container `scrollLeft` or `scrollTop` proportionally to edge proximity.

### 2. The Undo/Redo Strategy:
Implement the **Command Pattern**:
```typescript
interface Command {
  execute: () => void;
  undo: () => void;
}
```
When moving Card X from Column 1 to Column 2, push an undo command:
`undo: () => moveCard(cardX, column1, originalRank)`.
If a remote user edited the card's description in the meantime, the undo action only reverts its position, preserving the description edit!

---

## 6. 🎯 Interviewer Probes & Senior Follow-ups

### *Interviewer:* "What happens if Lexorank string precision grows to 200 characters long after 50 consecutive card drops between the same two items?"
*Senior Answer:* "This is the **Lexorank Precision Exhaustion problem**. We mitigate this by configuring an automated background **Rebalancing Job**. When any card's rank length exceeds 30 characters, the server enqueues a rebalance mutation for that column. During idle hours (or lazily in a background transaction), the server recalculates evenly spaced ranks (`1000`, `2000`, `3000`) across all cards in that column."

### *Interviewer:* "What if User A moves Card X to Column 'In Progress' while User B simultaneously moves Card X to Column 'Done'?"
*Senior Answer:* "In centralized architectures, we enforce **Optimistic Concurrency Control (OCC)** using entity version tokens. The server accepts the mutation with the earlier server-arrived timestamp and rejects the second with a conflict payload, prompting the second client to animate the card back with a toast message: *'Card was moved to Done by Alice'*. In decentralized architectures, we model card location as a Last-Write-Wins Register (LWW-Element-Set) indexed by Lamport Timestamps."
