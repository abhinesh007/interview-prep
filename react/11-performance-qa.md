# 11 — React Performance Optimization Interview Questions & Answers

> React Render Pipeline (Trigger -> Render -> Commit), `React.memo` pitfalls, inline function/object traps, list virtualization (`@tanstack/react-virtual`), React DevTools Profiler, and bundle splitting.

---

## 📑 Table of Contents
1. [The React Rendering Pipeline Deep Dive](#1-the-react-rendering-pipeline-deep-dive)
2. [Memoization Mastery (`React.memo`, `useMemo`, `useCallback`)](#2-memoization-mastery-reactmemo-usememo-usecallback)
3. [The 200 Dashboard Cards Optimization Scenario](#3-the-200-dashboard-cards-optimization-scenario)
4. [Virtualization for Massive Lists](#4-virtualization-for-massive-lists)
5. [Code Splitting & Bundle Analysis](#5-code-splitting--bundle-analysis)
6. [Debugging Methodology: "The App is Slow"](#6-debugging-methodology-the-app-is-slow)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. The React Rendering Pipeline Deep Dive

### Q1: Explain the React Render Pipeline: Trigger -> Render -> Commit.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Architecture

**Answer:**

```text
1. TRIGGER             2. RENDER (Pure JS)               3. COMMIT (DOM Mutation)
State/Props change ──► React calls component functions ──► React modifies real DOM
                       Computes Virtual DOM diffs         Only updates changed nodes
```

- **Phase 1: Trigger:** A state update (`setCount`), context change, or initial mount is scheduled with the React Scheduler.
- **Phase 2: Render:** React calls component functions from top to bottom. It produces a new Virtual DOM tree and diffs it against the previous tree. **Crucial insight:** A component rendering does NOT mean the real browser DOM was modified; rendering is just JavaScript computation!
- **Phase 3: Commit:** React applies the calculated differences to the actual DOM (`node.appendChild`, `node.textContent = ...`).
- **Phase 4: Browser Paint:** The browser engine recalculates styles, recalculates layout, and paints pixels onto the screen.

---

### Q2: Output Prediction: When a parent component re-renders, do all its children re-render?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction

**Answer:**
```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <Child title="Static Title" />
    </div>
  );
}

function Child({ title }) {
  console.log('Child rendered!');
  return <h3>{title}</h3>;
}
```

**Output:**
Every time the button is clicked, `"Child rendered!"` **prints to the console!**

**Why:**
By default in React, whenever a parent component re-renders, **all child components re-render recursively**, regardless of whether their props changed! React does this because function components may depend on mutable references or ambient context that React cannot statically predict without memoization.

---

## 2. Memoization Mastery (`React.memo`, `useMemo`, `useCallback`)

### Q3: Bug: Why does a child wrapped in `React.memo` STILL re-render when the parent updates?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// ❌ BUGGY PARENT: Child still re-renders!
const MemoizedChild = React.memo(function Child({ onClick, options }) {
  console.log('Child rendered');
  return <button onClick={onClick}>{options.label}</button>;
});

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedChild
        onClick={() => console.log('clicked')} // Fresh function reference!
        options={{ label: 'Save' }}             // Fresh object reference!
      />
    </div>
  );
}
```

**Why it fails:**
`React.memo` does a **shallow equality check** on props using `Object.is(prevProp, nextProp)`.
On every render of `Parent`:
1. `() => console.log('clicked')` allocates a **brand new function in memory**.
2. `{{ label: 'Save' }}` allocates a **brand new object in memory**.
3. `Object.is()` returns `false` for both props, completely defeating `React.memo`!

**The Fix:**
```jsx
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  const options = useMemo(() => ({ label: 'Save' }), []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <MemoizedChild onClick={handleClick} options={options} />
    </div>
  );
}
```

---

## 3. The 200 Dashboard Cards Optimization Scenario

### Q4: Interview Scenario: "You have a dashboard displaying 200 interactive cards. Clicking one card toggles its selected state, but triggers a re-render of ALL 200 cards, causing lag. Walk me through the step-by-step fix."
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Senior Architecture & Optimization

**The Naive Buggy Implementation:**
```jsx
function Dashboard() {
  const [selectedId, setSelectedId] = useState(null);
  const cards = useGetCards(); // 200 items

  return (
    <div className="grid">
      {cards.map(card => (
        <Card
          key={card.id}
          card={card}
          selectedId={selectedId} // Passing global selectedId causes ALL cards' props to change!
          onSelect={() => setSelectedId(card.id)} // Inline function creates new reference!
        />
      ))}
    </div>
  );
}
```

**The 3-Step Systematic Fix:**

#### Step 1: Pass a Boolean Flag (`isSelected`) instead of the Global ID
Instead of passing `selectedId={selectedId}` to 200 cards, calculate `isSelected={card.id === selectedId}` at the parent level. When ID switches from `1` to `2`:
- Card 1: `isSelected` changes from `true` to `false` (re-renders).
- Card 2: `isSelected` changes from `false` to `true` (re-renders).
- Cards 3-200: `isSelected` remains `false` (skipped!).

#### Step 2: Memoize the Selection Handler or Pass ID via Data Attribute
Avoid creating 200 inline arrow functions:
```jsx
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);
```

#### Step 3: Wrap the Card in `React.memo`
```tsx
interface CardProps {
  card: CardData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const Card = React.memo(function Card({ card, isSelected, onSelect }: CardProps) {
  return (
    <div
      className={`card ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(card.id)}
    >
      <h3>{card.title}</h3>
    </div>
  );
});
```
*Result:* Exactly **2 cards re-render** instead of 200. Frame rate returns to a smooth 60fps!

---

## 4. Virtualization for Massive Lists

### Q5: Why does the DOM choke on 10,000 items, and how does Virtualization work?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Coding

**Answer:**
If you render 10,000 DOM elements:
- The browser allocates hundreds of megabytes of RAM for layout trees.
- Style recalculation and paint times skyrocket.
- Scrolling becomes laggy and unresponsive.

**Virtualization (Windowing):**
Virtualization only renders the slice of items currently visible within the user's viewport (e.g., 20 items) plus a small overscan buffer (5 above, 5 below). As the user scrolls, DOM nodes are recycled or dynamically translated using CSS `transform: translateY()`.

**Coding Challenge: Virtual List with `@tanstack/react-virtual`**
```tsx
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Height in px
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
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
            {items[virtualRow.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Code Splitting & Bundle Analysis

### Q6: How do you identify bundle bloat and optimize imports?
**Difficulty:** 🟡 Mid  
**Type:** 🛠️ Tooling & Production

**Answer:**

#### 1. Bundle Analysis
Use `rollup-plugin-visualizer` (for Vite) or `@next/bundle-analyzer`:
```javascript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [visualizer({ open: true, filename: 'bundle-report.html' })]
});
```

#### 2. Avoid Heavy Default Imports (Tree-Shaking)
```javascript
// ❌ BAD: Pulls in the entire 70kB lodash bundle
import _ from 'lodash';
const result = _.cloneDeep(data);

// ✅ GOOD: Pulls in only the isolated module (~2kB)
import cloneDeep from 'lodash/cloneDeep';
// Or use lodash-es with named imports:
import { cloneDeep } from 'lodash-es';
```

#### 3. Route-level Dynamic Imports
Split large routes (Admin, Analytics, Settings) using `React.lazy()` so first-time users visiting the homepage don't download admin dashboards.

---

## 6. Debugging Methodology: "The App is Slow"

### Q7: Interview Scenario: "A customer reports that a critical page in our React app feels slow and laggy. Walk me through your step-by-step diagnostic methodology."
**Difficulty:** 🔴 Senior  
**Type:** 🕵️ Systematic Debugging

**Senior Answer Framework:**

1. **Step 1: Reproduce & Measure (Never Guess!):**
   - Open Chrome DevTools under incognito (disable extensions that inject DOM).
   - Use the **Performance tab** to record an interaction profile. Check whether the bottleneck is **Scripting (JS execution)**, **Rendering (Recalculate Style / Layout)**, or **Network (slow API)**.
2. **Step 2: Profile with React DevTools:**
   - Turn on *"Highlight updates when components render"*.
   - Use the **React Profiler tab**: record user interaction.
   - Inspect the **Flamegraph**: Identify components with long render durations.
   - Check the **"Why did this render?"** tab to see which props or hooks caused the update.
3. **Step 3: Categorize the Bottleneck:**
   - *Is it excessive re-rendering?* Apply Context splitting, `React.memo`, or pass component composition slots.
   - *Is it expensive computation?* Wrap calculation in `useMemo` or offload to a Web Worker.
   - *Is it DOM node bloat?* Implement virtualization for long lists or tables.
4. **Step 4: Verify and Benchmark:**
   - Compare before/after profiles using Chrome Performance CPU throttling (4x / 6x slowdown) to guarantee low-end mobile devices run smoothly.

---

## 🎯 Quick-Fire Round

1. **What is the difference between a shallow compare and deep compare?**  
   *Shallow compares property references using `Object.is`; deep traverses the entire object tree recursively.*
2. **Does `React.memo` prevent child renders if context updates?**  
   *No! Components consuming `useContext` will always re-render when context changes.*
3. **What is the cost of memoizing every single component by default?**  
   *Memory overhead and the CPU cost of running shallow comparison checks on every render pass.*
4. **What is React Compiler (Project Forget)?**  
   *A build-time auto-memoizing compiler in React 19 that eliminates manual `useMemo` and `useCallback`.*
5. **How does `content-visibility: auto` in CSS assist React performance?**  
   *It instructs the browser to skip layout and painting for off-screen DOM elements.*
6. **Can passing `children` prevent re-renders?**  
   *Yes! Components passed via `children` maintain reference equality across parent re-renders.*
7. **What is the 60fps frame budget?**  
   *16.6ms per frame (aim for < 10ms for JS execution to leave room for browser layout and paint).*
8. **Why is `key={Math.random()}` disastrous for performance?**  
   *It forces React to completely destroy and re-create the DOM node on every single render.*
9. **What does the React Profiler "Ranked chart" show?**  
   *Components ordered by how long they took to render during a commit.*
10. **Does production mode run faster than development mode?**  
    *Significantly faster! Development builds include debug warnings, prop checking, and StrictMode double renders.*

---

> **Next:** [12 — TypeScript in React Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/12-typescript-react-qa.md)
