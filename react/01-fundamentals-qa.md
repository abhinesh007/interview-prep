# 01 — React Fundamentals Interview Questions & Answers

> Core concepts, Virtual DOM, JSX, Components, Props, Events, Conditional Rendering, Lists, Keys, and Strict Mode.

---

## 📑 Table of Contents
1. [React Core Concepts](#1-react-core-concepts)
2. [Components & Rendering](#2-components--rendering)
3. [Props & Prop Drilling](#3-props--prop-drilling)
4. [Events & Synthetic Events](#4-events--synthetic-events)
5. [Conditional Rendering & Lists](#5-conditional-rendering--lists)
6. [Fragments & Strict Mode](#6-fragments--strict-mode)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. React Core Concepts

### Q1: What is React, and what is the difference between a Library and a Framework?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
React is an open-source, component-based JavaScript **library** for building user interfaces, primarily maintained by Meta.

The key distinction lies in **Inversion of Control (IoC)**:
- **Framework (e.g., Angular, Next.js, NestJS):** The framework calls *your* code. It prescribes project architecture, routing, build configuration, and data fetching conventions. You follow its rigid lifecycle.
- **Library (e.g., React):** *You* call the library. React only dictates how UIs are rendered from state (`UI = f(state)`). You are free to choose your own router (React Router, TanStack Router), state store (Zustand, Redux), styling mechanism (Tailwind, CSS Modules), and build system (Vite).

```text
Framework:  [ Framework Core ] ---> Calls ---> [ Your Code ]
Library:    [ Your Code ]      ---> Calls ---> [ React API ]
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If React is just a library, why do the new React official docs recommend using a framework like Next.js or Remix?"  
*Senior Answer:* Because modern React relies on full-stack capabilities (Server Components, streaming SSR, asset loading, server actions) that require tight integration with the bundler and server runtime. React itself remains the UI primitive library, but meta-frameworks provide the production runtime.

---

### Q2: What is the Virtual DOM, and how does Reconciliation work?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
The **Virtual DOM (VDOM)** is an in-memory, lightweight JavaScript object representation of the real DOM tree created by `React.createElement()` calls.

When state changes in a component:
1. **Render phase:** React generates a new Virtual DOM tree.
2. **Reconciliation (Diffing):** React compares the new VDOM tree with the previous snapshot using heuristic diffing algorithms ($O(n)$ complexity instead of standard tree comparison $O(n^3)$).
3. **Commit phase:** React computes the minimal set of real DOM operations and applies them in a batch via `react-dom`.

```javascript
// A JSX element <button className="btn">Click</button> compiles to:
const vnode = {
  type: 'button',
  props: {
    className: 'btn',
    children: 'Click'
  }
};
```

React's heuristic diffing relies on two key assumptions:
1. Two elements of different types will produce different trees (React tears down the old subtree and builds a new one from scratch).
2. Elements with a persistent `key` prop remain identical across renders.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is the Virtual DOM faster than direct DOM manipulation?"  
*Answer:* Not inherently. Svelte and solid direct compilers demonstrate that direct granular DOM updates are faster. The VDOM is an *abstraction* providing declarative programming and "fast enough" updates without manual DOM coordination.

---

### Q3: What is JSX, and what does it compile to under the hood?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
JSX (JavaScript XML) is a syntax extension for JavaScript that allows you to write HTML-like syntax inside JavaScript files. Browsers cannot execute JSX directly; it is compiled by Babel or SWC/esbuild.

- **Classic runtime (prior to React 17):**
  ```jsx
  // Input JSX
  <h1 className="title">Hello World</h1>

  // Transpiles to
  React.createElement('h1', { className: 'title' }, 'Hello World');
  ```
  *Required `import React from 'react'` in every file.*

- **Automatic runtime (React 17+):**
  ```jsx
  // Transpiles automatically to
  import { jsx as _jsx } from 'react/jsx-runtime';
  _jsx('h1', { className: 'title', children: 'Hello World' });
  ```
  *No longer requires importing `React` into scope for JSX alone.*

**⚠️ Gotcha / Follow-up:**
JSX expressions must always have a single parent element because `React.createElement` / `_jsx` is a JavaScript function call that returns a single JavaScript object. Returning two sibling roots without a wrapper is equivalent to returning two values from a single function call without an array or tuple.

---

### Q4: What happens if a component returns `undefined` vs `null` vs `false`?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

**Answer:**
```jsx
function ReturnsUndefined() {
  return undefined; // ❌ THROWS RUNTIME ERROR in React < 18, renders nothing in React 18+
}

function ReturnsNull() {
  return null; // ✅ Valid: renders nothing (DOM node removed)
}

function ReturnsFalse() {
  return false; // ✅ Valid: renders nothing
}
```

- In React 17 and below, returning `undefined` threw an invariant runtime error: *"Nothing was returned from render. This usually means a return statement was missing."*
- React 18+ permits returning `undefined` (treated as returning nothing), but returning `null` remains the canonical idiom for explicitly rendering empty output.
- Booleans (`true`, `false`) and `null` / `undefined` inside JSX children expressions (e.g. `<div>{false}</div>`) render **nothing** to the DOM.

**⚠️ Gotcha / Follow-up:**
What about `{0}` or `{NaN}`?
```jsx
const count = 0;
return <div>{count && <span>Items: {count}</span>}</div>;
// Output in DOM: <div>0</div>
```
`0` is a falsy value, but it is a **number**, so JavaScript evaluates `0 && <span/>` to `0`, and React renders literal `0` into the DOM! Fix by writing `{count > 0 && <span/>}` or `{Boolean(count) && <span/>}`.

---

## 2. Components & Rendering

### Q5: Functional Components vs Class Components — What are the key differences?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**

| Feature | Functional Component | Class Component |
| :--- | :--- | :--- |
| **Syntax** | Pure JS function returning JSX | ES6 class extending `React.Component` |
| **State** | `useState`, `useReducer` hooks | `this.state` and `this.setState()` |
| **Lifecycle** | `useEffect`, `useLayoutEffect` | `componentDidMount`, `componentDidUpdate`, etc. |
| **`this` Keyword** | No `this` binding issues | Requires binding handlers or arrow methods |
| **Closures** | Captures props/state at render time | Reads latest props via mutable `this.props` |
| **Code Size** | Significantly smaller minified bundle | Larger boilerplate |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is there ANY scenario where a class component is still strictly required in modern React 19?"  
*Senior Answer:* **Error Boundaries**. `componentDidCatch` and `static getDerivedStateFromError` have no functional hook equivalents in standard React. You must write an ES6 class or use the `react-error-boundary` package.

---

### Q6: What triggers a component re-render in React?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
A component re-renders when:
1. **Local State updates:** Calling `setState` with a value that fails `Object.is(oldState, newState)` comparison.
2. **Parent component re-renders:** By default, when a parent renders, **all** its child components re-render recursively, regardless of whether props changed.
3. **Context value changes:** Any component consuming a context via `useContext` re-renders when the Provider's `value` prop identity changes.
4. **Hooks update:** A custom hook called by the component triggers an internal state change.
5. **`forceUpdate()`:** Direct imperative forced render in class components.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does changing props trigger a re-render?"  
*Accurate Answer:* Props themselves don't trigger re-renders magically; rather, props only change *because* the parent component re-rendered and passed new values down!

---

### Q7: Component renders, but the DOM doesn't update. Why?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// Buggy Code
function UserList() {
  const [users, setUsers] = useState(['Alice', 'Bob']);

  const addUser = () => {
    users.push('Charlie'); // Mutating state array in place
    setUsers(users);       // Same reference passed!
  };

  return (
    <div>
      <button onClick={addUser}>Add</button>
      <ul>{users.map(u => <li key={u}>{u}</li>)}</ul>
    </div>
  );
}
```

**Answer:**
React uses `Object.is()` for reference equality check before scheduling reconciliation. Because `users.push('Charlie')` mutated the array in place, `setUsers(users)` receives the **same reference**. React bailed out of rendering because `Object.is(prevUsers, nextUsers)` returned `true`.

**The Fix:**
```jsx
const addUser = () => {
  setUsers(prevUsers => [...prevUsers, 'Charlie']);
};
```

---

### Q8: What is React Fiber, and why was it introduced?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Architecture

**Answer:**
Prior to React 16, React used the **Stack Reconciler**. It processed component tree updates recursively and synchronously. If a large component tree took 50ms to diff, it blocked the main browser thread, dropping frames (60fps budget is ~16.6ms per frame) and freezing user inputs.

**React Fiber** is a ground-up rewrite of React's reconciliation engine. Key architectural innovations:
1. **Incremental Rendering:** Work is broken into small execution units called **Fiber nodes** (a doubly-linked list data structure).
2. **Interruptibility:** React can pause low-priority work (e.g., rendering an off-screen list) when a high-priority user event (e.g., typing in a text input) arrives.
3. **Two-phase processing:**
   - **Render Phase (Asynchronous / Interruptible):** Traverses the fiber tree, runs component functions, computes diffs. Can be paused, restarted, or discarded.
   - **Commit Phase (Synchronous):** Mutates the actual DOM and fires layout effects. Cannot be interrupted to ensure visual consistency.

---

## 3. Props & Prop Drilling

### Q9: Props are read-only. What happens if you mutate them?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
React components must act like **pure functions** with respect to their props. If you mutate a prop object or array directly:
1. In strict mode / dev mode with linters, warnings or runtime freezing may occur.
2. Parent components and other sibling components reading that object will observe uncoordinated, unexpected side effects.
3. React's shallow comparison in `React.memo` or optimizations will fail to detect changes properly.

```jsx
// ❌ ANTI-PATTERN: Mutating props directly
function Profile({ user }) {
  user.name = user.name.toUpperCase(); // Dangerous side effect!
  return <h1>{user.name}</h1>;
}

// ✅ CORRECT: Create a local copy or derived variable
function Profile({ user }) {
  const formattedName = user.name.toUpperCase();
  return <h1>{formattedName}</h1>;
}
```

---

### Q10: What is the `children` prop, and what types can it accept?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction / Coding

**Answer:**
The `children` prop represents the content passed between the opening and closing tags of a component (`<Card>{children}</Card>`).

It can accept **any valid ReactNode**:
- Primitive values: `string`, `number`
- Elements / JSX: `<div>Hello</div>`
- Arrays or fragments: `[<span key="1"/>, <span key="2"/>]`
- Booleans, `null`, `undefined` (render nothing)
- **Functions** (The *Render Prop / Function as Child* pattern):

```jsx
function MouseTracker({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
      {typeof children === 'function' ? children(pos) : children}
    </div>
  );
}

// Usage:
<MouseTracker>
  {({ x, y }) => <p>Cursor at {x}, {y}</p>}
</MouseTracker>
```

**⚠️ Gotcha / Follow-up:**
`React.Children.map()` or `React.Children.toArray()` should be used when inspecting or mapping `children`, because `children` can be a single object, an array, or `undefined`. Direct `children.map()` will throw if only a single child is passed.

---

### Q11: Explain Prop Drilling, why it is problematic, and how to solve it.
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
**Prop Drilling** is the process of passing props down through multiple layers of nested components where intermediate components do not need the data themselves, merely acting as conduits.

**Why it's problematic:**
- Coupling: Intermediate components become tightly coupled to data they don't consume.
- Refactoring friction: Renaming or changing prop types requires updating every layer.
- Maintenance overhead: High cognitive load.

**Solutions:**
1. **Component Composition (Slots pattern):** Pass the instantiated element directly to the container instead of passing raw data down.
   ```jsx
   // Instead of <Page user={user} /> -> <Layout user={user} /> -> <Header user={user} />
   <Layout header={<Header user={user} />} />
   ```
2. **Context API:** For truly global ambient state (theme, authenticated user, locale).
3. **State Management Stores:** Zustand, Redux Toolkit, Jotai.

---

## 4. Events & Synthetic Events

### Q12: How does React's Synthetic Event system work compared to native DOM events?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
React wraps native browser events in a cross-browser wrapper called `SyntheticEvent`.
- **Cross-browser normalization:** Ensures event properties like `e.key`, `e.target`, and `e.preventDefault()` behave identically across Chrome, Safari, Firefox, and Edge.
- **Event Delegation:** Rather than attaching event listeners to each individual DOM node, React attaches root listeners at the root of the React app container (`#root` in React 17+, `document` in React 16).
- **Native access:** You can always access the underlying browser event via `e.nativeEvent`.

**⚠️ Gotcha / Follow-up:**
In React 16, synthetic events were **pooled** (reused across events for memory efficiency), requiring `e.persist()` if accessed asynchronously in `setTimeout`. React 17 **removed event pooling completely** due to modern JS engine optimizations.

---

### Q13: What is the difference between `event.target` and `event.currentTarget`?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

**Answer:**
```jsx
function ButtonContainer() {
  const handleClick = (e) => {
    console.log('target:', e.target.tagName);
    console.log('currentTarget:', e.currentTarget.tagName);
  };

  return (
    <button onClick={handleClick} className="btn">
      <span className="icon">🔥</span>
      <span className="label">Click Me</span>
    </button>
  );
}
```

If the user clicks directly on the icon emoji `🔥`:
- `e.target` is the **innermost element that received the click** (`<SPAN>`).
- `e.currentTarget` is the **element to which the event handler is attached** (`<BUTTON>`).

Always use `e.currentTarget` when you need attributes from the element defining the handler (e.g., `e.currentTarget.dataset.id`).

---

## 5. Conditional Rendering & Lists

### Q14: Why does React need a `key` prop on list items, and what is the reconciliation impact?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
During reconciliation, React diffs children lists. Without keys, React diffs by array index.
If you insert an item at the beginning of an unkeyed list of 100 items:
- React compares item 0 with new item 0 (mutates DOM).
- Compares item 1 with old item 0 (mutates DOM).
- React ends up mutating all 100 DOM nodes!

With stable keys:
- React matches keys across renders (`prevKey === nextKey`).
- React sees keys `A`, `B`, `C` still exist, and only prepends `NEW_ITEM` to the DOM.
- Complexity reduces from $O(N)$ re-renders to a single DOM insertion.

---

### Q15: Why is using array index as a `key` a severe bug?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// ❌ BUGGY LIST
function TodoList() {
  const [todos, setTodos] = useState(['Clean room', 'Buy groceries']);

  const deleteFirst = () => setTodos(todos.slice(1));

  return (
    <div>
      <button onClick={deleteFirst}>Delete Top</button>
      <ul>
        {todos.map((todo, index) => (
          <li key={index}>
            <input type="text" defaultValue={todo} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**What goes wrong:**
When you click "Delete Top":
1. The first item ('Clean room') is removed from state.
2. The remaining item ('Buy groceries') moves to index `0`.
3. React checks key `0`: key `0` already exists in DOM with an `<input>` holding uncontrolled state.
4. React keeps the existing DOM node for key `0`! The user sees the old input value ('Clean room') still on screen while the last DOM node is destroyed.

**Rule of thumb:**
Use array index as key ONLY when:
1. The list is static and will never be reordered, filtered, or mutated.
2. List items have no uncontrolled state (inputs, animations, open accordions).

---

### Q16: What happens if two sibling elements have duplicate keys?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

**Answer:**
```jsx
const items = [
  { id: 1, name: 'Apple' },
  { id: 1, name: 'Banana' } // Duplicate key!
];

return (
  <ul>
    {items.map(item => <li key={item.id}>{item.name}</li>)}
  </ul>
);
```

1. **Console Warning:** React emits a warning: *"Encountered two children with the same key, `1`. Keys should be unique so that components maintain their identity across updates."*
2. **Reconciliation Bugs:** React's internal diffing algorithm maps keys to Fiber nodes. Duplicate keys corrupt the node lookup, leading to erratic DOM updates, skipped items, or focus jumping.

---

## 6. Fragments & Strict Mode

### Q17: Why does `<React.Fragment>` exist, and when would you use `<>` vs `<Fragment key={id}>`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
React components must return a single root node. Wrapping siblings in extra `<div>` elements causes **"div soup"**, invalid HTML (e.g. `<div>` inside `<table>` or `<ul>`), and broken CSS flexbox/grid layouts.

`<React.Fragment>` lets you group elements without adding extra nodes to the DOM.

**Syntax differences:**
- `<> ... </>` — Shorthand syntax. Cannot accept attributes or `key`.
- `<React.Fragment key={item.id}> ... </React.Fragment>` — Full syntax. **Required** when mapping collections of fragments where each fragment must have a unique key:

```jsx
{items.map(item => (
  <React.Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.description}</dd>
  </React.Fragment>
))}
```

---

### Q18: What does `<React.StrictMode>` do, and why do effects run twice in development?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
`StrictMode` is a development-only tool that highlights potential problems without rendering visible UI or affecting production builds.

Key behaviors in development:
1. **Double invokes lifecycle & effects:** Mounts -> Unmounts -> Re-mounts components and effects.
2. **Warns about deprecated APIs:** Legacy string refs, `findDOMNode`, deprecated lifecycle methods (`UNSAFE_componentWillMount`).
3. **Detects unexpected side effects:** Invokes render functions, reducers, and state initializers twice to verify they are pure functions.

**Why effects run twice:**
In React 18+, React introduced Concurrent features like off-screen caching and Fast Refresh. React simulates a component being unmounted and re-mounted with preserved state. If your `useEffect` creates a WebSocket connection or event listener without a cleanup function, running it twice exposes memory leaks immediately!

---

## 🎯 Quick-Fire Round

1. **Can JSX tag names start with a lowercase letter?**  
   *Yes, but React treats lowercase tags as native HTML tags (`<div>`, `<span>`). Custom components must start with an uppercase letter (`<MyButton />`).*
2. **Does React support custom HTML attributes?**  
   *Yes, standard custom attributes require the `data-*` or `aria-*` prefix.*
3. **What is the return type of `React.createElement()`?**  
   *A plain JavaScript object representing a virtual DOM node.*
4. **Is `style` prop in React passed as a string or an object?**  
   *An object with camelCased CSS property names (e.g., `style={{ backgroundColor: 'red', marginTop: '10px' }}`).*
5. **Does updating props trigger `componentDidMount` or mount effects?**  
   *No. Only update effects run; mount effects only fire on initial insertion.*
6. **Can you return an array of elements directly from a component?**  
   *Yes (as of React 16+), but each top-level element in that array must have a `key` prop.*
7. **What happens if you omit the `key` prop on a mapped list?**  
   *React issues a warning and defaults to using array indices as keys.*
8. **Does React capture phase events exist?**  
   *Yes, append `Capture` to the event name (e.g., `onClickCapture`).*
9. **Can a component render a portal directly in JSX?**  
   *Yes, by calling `createPortal(children, domNode)` in the return statement.*
10. **Does Strict Mode impact production performance?**  
    *No. Strict Mode checks are stripped out of production builds.*

---

> **Next:** [02 — State & Lifecycle Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/02-state-and-lifecycle-qa.md)
