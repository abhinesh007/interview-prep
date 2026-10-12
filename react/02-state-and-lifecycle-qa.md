# 02 — State & Lifecycle Interview Questions & Answers

> useState deep dive, automatic batching, immutability rules, Fiber render & commit phases, useEffect synchronization, cleanup order, and useLayoutEffect.

---

## 📑 Table of Contents
1. [useState Deep Dive & Batching](#1-usestate-deep-dive--batching)
2. [Immutability & State Updates](#2-immutability--state-updates)
3. [Component Lifecycle Model (Fiber Phase Architecture)](#3-component-lifecycle-model-fiber-phase-architecture)
4. [useEffect Mastery](#4-useeffect-mastery)
5. [useEffect vs useLayoutEffect](#5-useeffect-vs-uselayouteffect)
6. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. useState Deep Dive & Batching

### Q1: Is `setState` synchronous or asynchronous? Explain React's Automatic Batching.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
`setState` actions are **asynchronous from the caller's perspective**, meaning state variables are not updated immediately in the execution frame where `setState` is called. React schedules a re-render rather than mutating the value synchronously.

**Automatic Batching (React 18+):**
Batching is when React groups multiple state updates into a single re-render for performance.
- **In React 17 & earlier:** Only updates inside React event handlers (like `onClick`) were batched. State updates inside `promises`, `setTimeout`, native event handlers, or `fetch` callbacks were **not** batched and triggered separate re-renders.
- **In React 18+:** React automatically batches **all** updates by default, regardless of where they originate (`setTimeout`, promises, native events, microtasks).

```jsx
// React 18+: Only ONE re-render occurs!
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 1000);
```

If you ever need to opt out of batching and force an immediate synchronous render, React provides `flushSync()` from `react-dom`:
```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);
}); // DOM is updated synchronously right here
```

---

### Q2: What does `console.log(count)` show immediately after calling `setCount(count + 1)`?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction

**Answer:**
```jsx
function Counter() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    console.log(count); // What does this print?
  };

  return <button onClick={handleClick}>Count: {count}</button>;
}
```

**Output:**
It prints `0` (the **old** count value).

**Why:**
JavaScript functions create closures. When `Counter` renders, `count` is a constant value scoped to that particular render execution (`count = 0`). Calling `setCount(1)` requests React to re-render the component with `1` on the *next* execution, but it cannot mutate the local constant `count` within the current running function scope.

---

### Q3: Output Prediction: Triple direct update vs Triple functional update
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

```jsx
function StateUpdateMystery() {
  const [count, setCount] = useState(0);

  const handleTripleDirect = () => {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  };

  const handleTripleFunctional = () => {
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
  };

  return (
    <div>
      <button onClick={handleTripleDirect}>Direct</button>
      <button onClick={handleTripleFunctional}>Functional</button>
      <p>Current: {count}</p>
    </div>
  );
}
```

**Answer:**
- Clicking **Direct**: `count` becomes **`1`** (from `0`).
  - Because `count` is `0`, it evaluates to:
    - `setCount(0 + 1)`
    - `setCount(0 + 1)`
    - `setCount(0 + 1)`
  - React replaces the queued update with `1` each time.
- Clicking **Functional**: `count` becomes **`3`** (from `0`).
  - React queues up updater functions:
    1. `prev (0) => 0 + 1 = 1`
    2. `prev (1) => 1 + 1 = 2`
    3. `prev (2) => 2 + 1 = 3`

**Rule:** Always use the functional updater form (`setState(prev => ...)`) whenever your new state depends on the previous state.

---

### Q4: What is Lazy State Initialization, and when MUST you use it?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding / Best Practice

**Answer:**
When you pass an initial value directly to `useState(computeExpensiveValue())`, that expression executes on **every single re-render** of the component, even though React only uses the initial value on the first mount.

**Lazy Initialization** passes a callback function `useState(() => computeExpensiveValue())`. React will invoke this function **only once** during initial mount.

```jsx
// ❌ SLOW: reads from localStorage on EVERY re-render of this component
function UserProfile() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user_cache') || '{}')
  );
  // ...
}

// ✅ FAST: reads from localStorage ONLY ONCE during mount
function UserProfile() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user_cache') || '{}');
    } catch {
      return {};
    }
  });
  // ...
}
```

---

## 2. Immutability & State Updates

### Q5: Why must React state be treated immutably? How does React detect changes?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
React relies on **referential equality** (`Object.is`) to detect state changes.
1. **Performance ($O(1)$ vs $O(N)$):** If React had to perform deep equality checks on complex nested objects and arrays on every render, it would kill CPU performance. By requiring new references on mutation, React can check if state changed in a single $O(1)$ reference comparison.
2. **Predictable Time-Travel & Concurrency:** Concurrency and Fast Refresh depend on state snapshots remaining frozen in time. Mutating existing objects corrupts previous render snapshots and causes race conditions.
3. **Pure Components (`React.memo`):** Memoized components skip rendering by checking shallow prop references. Mutated objects share the same reference, so children will fail to re-render.

---

### Q6: Output Prediction: Mutating array in place
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction

```jsx
function ArrayTrap() {
  const [items, setItems] = useState([1, 2, 3]);

  const addItem = () => {
    items.push(4);
    setItems(items);
  };

  return (
    <div>
      <button onClick={addItem}>Add</button>
      <span>Length: {items.length}</span>
    </div>
  );
}
```

**Answer:**
- The button is clicked.
- `items.push(4)` appends 4 to the array in memory (`items` is now `[1, 2, 3, 4]`).
- `setItems(items)` is called with the *same object reference*.
- React executes `Object.is(prevItems, items)` which evaluates to `true`.
- React **bails out of rendering**.
- The UI **does not update**. `Length: 3` stays on screen until another unrelated state update forces a re-render, at which point the mutated array will suddenly appear.

---

### Q7: Array Mutation Safety Matrix: Safe vs Mutating methods
**Difficulty:** 🟢 Junior  
**Type:** 📖 Reference Guide

**Answer:**

| Method | Behavior | React Safe? | Safe Alternative |
| :--- | :--- | :--- | :--- |
| `push(...)` | Mutates original array | ❌ Dangerous | `[...arr, item]` |
| `unshift(...)` | Mutates original array | ❌ Dangerous | `[item, ...arr]` |
| `pop()` / `shift()` | Mutates original array | ❌ Dangerous | `arr.slice(0, -1)` / `arr.slice(1)` |
| `splice(...)` | Mutates original array | ❌ Dangerous | `arr.filter(...)` or `.toSpliced()` |
| `sort()` | Mutates original array | ❌ Dangerous | `[...arr].sort(...)` or `arr.toSorted()` |
| `reverse()` | Mutates original array | ❌ Dangerous | `[...arr].reverse()` or `arr.toReversed()` |
| `map(...)` | Returns new array | ✅ Safe | — |
| `filter(...)` | Returns new array | ✅ Safe | — |
| `concat(...)` | Returns new array | ✅ Safe | — |
| `slice(...)` | Returns new array | ✅ Safe | — |

---

### Q8: Deeply nested state updates — Spread operator vs Immer
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

**Scenario:** Update the street name of a user address 3 levels deep:
```javascript
const initialData = {
  user: {
    profile: {
      address: { street: 'Main St', zip: '10001' }
    }
  }
};
```

**Spread operator implementation:**
```jsx
// ❌ Cumbersome and error-prone
setData(prev => ({
  ...prev,
  user: {
    ...prev.user,
    profile: {
      ...prev.user.profile,
      address: {
        ...prev.user.profile.address,
        street: 'Broadway'
      }
    }
  }
}));
```

**Using Immer (`use-immer`):**
```jsx
import { useImmer } from 'use-immer';

const [data, updateData] = useImmer(initialData);

// ✅ Clean, looks like direct mutation, but produces a new immutable copy
updateData(draft => {
  draft.user.profile.address.street = 'Broadway';
});
```

---

## 3. Component Lifecycle Model (Fiber Phase Architecture)

### Q9: Map the classic lifecycle methods to Modern React Hooks.
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**

| Class Lifecycle Method | Hook Equivalent | Notes |
| :--- | :--- | :--- |
| `componentDidMount` | `useEffect(() => {}, [])` | Runs once after initial DOM paint |
| `componentDidUpdate` | `useEffect(() => {}, [deps])` | Runs when specified `deps` change |
| `componentWillUnmount` | `useEffect(() => { return () => cleanup(); }, [])` | Cleanup function runs on unmount |
| `shouldComponentUpdate` | `React.memo(Component, arePropsEqual)` | Skips re-render if props are shallow-equal |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` | Reads DOM before browser paint |
| `componentDidCatch` | *No direct hook equivalent* | Must use an Error Boundary class |

---

### Q10: What are the "Render Phase" and "Commit Phase" in React Fiber?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Architecture

**Answer:**
React Fiber processes component trees in two distinct phases:

```text
[ Trigger Update ]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 1. RENDER PHASE (Pure, No DOM mutations, Interruptible) │
│ - Executes component functions / useMemo / useState    │
│ - Calculates Virtual DOM diffs                         │
│ - Can be paused, aborted, or restarted by scheduler    │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 2. COMMIT PHASE (Impure, Mutates DOM, Synchronous)     │
│ - React writes changes to the real DOM                 │
│ - Runs useLayoutEffect synchronously BEFORE paint      │
│ - Browser paints screen (pixels appear to user)        │
│ - Runs useEffect asynchronously AFTER paint            │
└────────────────────────────────────────────────────────┘
```

**Why this matters in interviews:**
Side effects (e.g. `fetch`, DOM mutations, analytics logs) must **NEVER** be placed directly in the component body during the Render Phase because React may execute the render phase multiple times before committing.

---

## 4. useEffect Mastery

### Q11: What is the mental model of `useEffect`? (Synchronization vs Lifecycle)
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
The common pitfall is treating `useEffect` as a replacement for lifecycle methods (`componentDidMount`, `componentDidUpdate`).

The correct mental model is **Synchronization**:
> *"Given the current state and props, synchronize this component with an external system (browser APIs, subscriptions, network, DOM)."*

If you are just transforming data from props/state, **you do NOT need `useEffect`**. Compute it during render as derived state:
```jsx
// ❌ WRONG: Unnecessary effect causing extra re-render
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ RIGHT: Pure derived state during render
const fullName = `${firstName} ${lastName}`;
```

---

### Q12: Output Prediction: Execution order of Renders, Effects, and Cleanups
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

```jsx
function LifecycleProbe({ count }) {
  console.log('1. Render:', count);

  useEffect(() => {
    console.log('2. Effect:', count);

    return () => {
      console.log('3. Cleanup:', count);
    };
  }, [count]);

  return <div>{count}</div>;
}
```

**Sequence when mounted with `count = 1`, then re-rendered with `count = 2`:**
1. **Initial Mount (`count = 1`):**
   - `1. Render: 1`
   - *(DOM is painted)*
   - `2. Effect: 1`
2. **Update (`count = 2`):**
   - `1. Render: 2`
   - *(DOM is painted)*
   - `3. Cleanup: 1` *(Old effect cleanup runs with previous closure!)*
   - `2. Effect: 2` *(New effect runs with current closure)*
3. **Unmount:**
   - `3. Cleanup: 2`

---

### Q13: Debugging: Why does an object in the dependency array trigger an infinite loop?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// ❌ BUGGY CODE: Infinite Loop
function SearchWidget() {
  const [data, setData] = useState([]);
  const filter = { status: 'active', limit: 10 }; // Created fresh on every render!

  useEffect(() => {
    fetchData(filter).then(res => setData(res));
  }, [filter]); // Reference changes every single render!

  return <div>Results: {data.length}</div>;
}
```

**Why it fails:**
On every render, `const filter = { ... }` allocates a **new object in memory**. In the dependency check, React checks `Object.is(prevFilter, nextFilter)`. Because memory references differ, React triggers the effect, which calls `setData()`, which triggers a re-render, which creates a new `filter` object, causing an **infinite loop**.

**3 Ways to Fix:**
1. **Move the object outside the component** (if static):
   ```jsx
   const FILTER = { status: 'active', limit: 10 };
   ```
2. **Move the object INSIDE the `useEffect`:**
   ```jsx
   useEffect(() => {
     const filter = { status: 'active', limit: 10 };
     fetchData(filter).then(setData);
   }, []);
   ```
3. **Use primitive dependencies or `useMemo`:**
   ```jsx
   const filter = useMemo(() => ({ status: 'active', limit: 10 }), []);
   ```

---

### Q14: How do you fix Race Conditions in `useEffect` when fetching data?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding / Senior Trap

**The Bug:** The user rapidly searches for "cat", then "dog". The network response for "cat" takes 2000ms, while "dog" finishes in 200ms. The UI briefly shows "dog", and then gets overwritten by "cat"!

**Solution 1: AbortController (Standard Browser API)**
```jsx
function Search({ query }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSearch() {
      try {
        const res = await fetch(`/api/search?q=${query}`, {
          signal: controller.signal
        });
        const data = await res.json();
        setResults(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    }

    fetchSearch();

    // Cleanup cancels the in-flight HTTP request
    return () => controller.abort();
  }, [query]);

  return <ul>{results.map(r => <li key={r.id}>{r.title}</li>)}</ul>;
}
```

**Solution 2: Boolean Flag Pattern**
```jsx
useEffect(() => {
  let isCurrent = true;

  fetchData(id).then(data => {
    if (isCurrent) setResults(data);
  });

  return () => {
    isCurrent = false;
  };
}, [id]);
```

---

## 5. useEffect vs useLayoutEffect

### Q15: When does `useLayoutEffect` run relative to browser paint?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**

```text
State Change
    │
    ▼
React calls Component (Render Phase)
    │
    ▼
React mutates Real DOM nodes
    │
    ▼
⚡ useLayoutEffect runs SYNCHRONOUSLY
    │   (Can measure DOM and synchronously update state before user sees anything)
    ▼
🎨 Browser paints pixels onto the screen (Paint)
    │
    ▼
⏳ useEffect runs ASYNCHRONOUSLY
```

- **`useLayoutEffect`:** Fires synchronously **before** the browser paints the screen. It blocks visual paint.
- **`useEffect`:** Fires asynchronously **after** the browser paints the screen. It does not block UI responsiveness.

---

### Q16: Bug Fix: Tooltip flickers at position (0,0) before jumping to its target element.
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// ❌ FLICKERING CODE
function Tooltip({ targetRect }) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef();

  useEffect(() => {
    // Measures tooltip dimensions and positions it
    const { height } = tooltipRef.current.getBoundingClientRect();
    setCoords({ top: targetRect.top - height, left: targetRect.left });
  }, [targetRect]);

  return <div ref={tooltipRef} style={{ top: coords.top, left: coords.left }}>Tooltip</div>;
}
```

**Why it flickers:**
1. Component mounts with `{ top: 0, left: 0 }`.
2. Browser paints tooltip at `(0, 0)`. The user sees a split-second flash.
3. `useEffect` runs asynchronously, measures the DOM, and updates state.
4. Component re-renders and paints at the calculated coordinate.

**The Fix:**
Change `useEffect` to **`useLayoutEffect`**. React will measure the DOM and calculate coordinates *before* the browser paints the initial frame, completely eliminating the visual flicker!

---

## 🎯 Quick-Fire Round

1. **Does `useState` merge object updates like class `this.setState` did?**  
   *No! `useState` overwrites the state completely. You must manually spread (`...prev`).*
2. **Can you call `useState` conditionally?**  
   *No! It violates the Rules of Hooks and corrupts React's internal fiber hook index.*
3. **What is the default return value of `useState` if no initial value is passed?**  
   *`undefined`.*
4. **Does `useEffect` run on the server during Server-Side Rendering (SSR)?**  
   *No! Effects only run on the client.*
5. **Does `useLayoutEffect` trigger a warning on SSR?**  
   *Yes, because its layout calculations cannot execute on a headless server.*
6. **If you pass `[]` as dependency array, will the cleanup function ever run?**  
   *Yes, exactly once when the component unmounts.*
7. **Is it valid to return a Promise from `useEffect`?**  
   *No! `useEffect` must return either `undefined` or a cleanup function. Returning a Promise causes an error.*
8. **How does React compare dependencies in the dependency array?**  
   *Using `Object.is()` comparison.*
9. **Does calling `setCount(5)` when count is already `5` trigger a re-render?**  
   *React may invoke the component function once to check, but bails out before diffing or committing to DOM.*
10. **Can you read `ref.current` inside the render body safely?**  
    *No. Writing or reading `ref.current` during render is a side effect and can cause inconsistencies in concurrent mode.*

---

> **Next:** [03 — Hooks Deep Dive Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/03-hooks-deep-dive-qa.md)
