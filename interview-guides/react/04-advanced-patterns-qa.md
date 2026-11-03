# 04 — Advanced React Patterns Interview Questions & Answers

> Higher-Order Components (HOCs), Render Props, Compound Components, Controlled vs Uncontrolled, Portals & Event Bubbling, Error Boundaries, Suspense & Lazy loading waterfalls.

---

## 📑 Table of Contents
1. [Higher-Order Components (HOCs)](#1-higher-order-components-hocs)
2. [Render Props vs Custom Hooks](#2-render-props-vs-custom-hooks)
3. [Compound Components Pattern](#3-compound-components-pattern)
4. [Controlled vs Uncontrolled Components](#4-controlled-vs-uncontrolled-components)
5. [Portals & Event Bubbling](#5-portals--event-bubbling)
6. [Error Boundaries](#6-error-boundaries)
7. [Suspense, Lazy Loading & Waterfall Problems](#7-suspense-lazy-loading--waterfall-problems)
8. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Higher-Order Components (HOCs)

### Q1: What is a Higher-Order Component (HOC)? Explain the pattern and its issues.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
A **Higher-Order Component** is a pure JavaScript function that takes a component as an argument and returns a new enhanced component.
```javascript
const EnhancedComponent = higherOrderComponent(WrappedComponent);
```

**Common use cases historically:**
- Authentication guards (`withAuth`)
- Analytics tracking (`withTracking`)
- Injected props / theme (`withTheme`)

**Drawbacks of HOCs:**
1. **Prop Collision / Shadowing:** If an HOC injects a prop with the same name as an existing prop on `WrappedComponent`, it overwrites it silently.
2. **Wrapper Hell:** Inspecting the React DevTools reveals 8 levels of nested `<WithAuth(WithTheme(WithRouter(Dashboard)))>` wrappers.
3. **Ref forwarding issues:** `ref` points to the outer wrapper component instead of the underlying DOM element unless `forwardRef` is manually chained.
4. **Static methods loss:** Static methods on the wrapped component must be manually copied using packages like `hoist-non-react-statified`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Are HOCs dead in modern React?"  
*Answer:* Custom Hooks have largely replaced HOCs for sharing stateful logic. However, HOCs remain useful when you need to **intercept rendering itself** (e.g., conditionally suppressing the entire component render or injecting JSX wrappers like layout shells).

---

## 2. Render Props vs Custom Hooks

### Q2: What is the Render Props pattern? When would you use it over a Custom Hook?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Comparison

**Answer:**
A **Render Prop** is a technique for sharing code between React components using a prop whose value is a function returning JSX.
```jsx
<DataProvider render={(data) => <Display data={data} />} />
```

**Render Prop vs Custom Hook:**
- **Custom Hook:** Shares stateful **logic** without altering component hierarchy.
- **Render Prop:** Dictates **both logic and visual rendering composition**.

```jsx
// Render Prop pattern: Virtualized list or Dropdown Menu
<VirtualList
  itemCount={1000}
  itemHeight={50}
  renderItem={({ index, style }) => (
    <div style={style}>Row #{index}</div>
  )}
/>
```
*Why hooks can't easily replace this:* The `<VirtualList>` component owns the scrolling container DOM calculations and must control how and when each item slot is mounted. A custom hook cannot directly orchestrate child rendering slots without exposing cumbersome refs and coordination logic.

---

## 3. Compound Components Pattern

### Q3: Coding Challenge: Implement a Compound `<Tabs>` component with Context
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding / Design Pattern

**Answer:**
The **Compound Component** pattern allows multiple components to work together seamlessly to manage shared state implicitly (like `<select>` and `<option>`), providing clean, expressive JSX without prop drilling.

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// 1. Create Context for communication
interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}
const TabsContext = createContext<TabsContextType | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs compound components must be used within <Tabs>');
  return context;
}

// 2. Root Component
export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs-container">{children}</div>
    </TabsContext.Provider>
  );
}

// 3. Sub-component: Tab Button
export function TabTrigger({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`tab-btn ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// 4. Sub-component: Tab Panel
export function TabContent({ value, children }: { value: string; children: ReactNode }) {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Attach sub-components to parent for dot-notation export
Tabs.Trigger = TabTrigger;
Tabs.Content = TabContent;
```

**Usage (Declarative & Flexible):**
```jsx
<Tabs defaultTab="account">
  <div className="tab-bar">
    <Tabs.Trigger value="account">Account</Tabs.Trigger>
    <Tabs.Trigger value="password">Password</Tabs.Trigger>
  </div>

  <Tabs.Content value="account">Account Settings UI</Tabs.Content>
  <Tabs.Content value="password">Password Reset UI</Tabs.Content>
</Tabs>
```

**Why this is superior:** Consumers have full control over layout and placement (e.g., placing triggers anywhere) without modifying configuration objects. This pattern powers modern component libraries like **Radix UI** and **shadcn/ui**.

---

## 4. Controlled vs Uncontrolled Components

### Q4: Controlled vs Uncontrolled: Decision Matrix and React Warning Fix
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Fix / Conceptual

**Answer:**

| Characteristic | Controlled Component | Uncontrolled Component |
| :--- | :--- | :--- |
| **Source of Truth** | React Component State (`useState`) | DOM itself (`useRef` or native form) |
| **Performance** | Re-renders on every keystroke | Zero re-renders during typing |
| **Validation** | Instant / Per-character validation | On submit / On blur |
| **Complexity** | High boilerplate | Low boilerplate |
| **Best suited for** | Complex dynamic forms, conditional inputs | Simple static forms, large forms, File inputs |

**Bug: "A component is changing an uncontrolled input to be controlled"**
```jsx
// ❌ BUGGY CODE
function UserForm({ user }) {
  // If user.name is undefined on initial render:
  const [name, setName] = useState(user?.name); // name evaluates to undefined!

  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

**Why it throws:**
When an `<input>` receives `value={undefined}`, React treats it as an **uncontrolled** input. When `name` later updates to a string, React detects that the input has switched to **controlled**, issuing a console warning.

**The Fix:**
Provide an empty string fallback:
```jsx
const [name, setName] = useState(user?.name ?? '');
```

---

## 5. Portals & Event Bubbling

### Q5: What problem do Portals solve? Does Event Bubbling follow the DOM tree or the React Virtual DOM tree?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
`createPortal(children, domNode)` renders children into a different DOM subtree outside of the parent component's DOM hierarchy (typically `document.body` or a dedicated `#modal-root`).

**Problems Solved:**
- Escaping parent CSS constraints: `overflow: hidden`, `z-index`, `transform`, `filter` that would otherwise clip modals, tooltips, or dropdowns.

**Critical Event Bubbling Trap:**
Even though a portal renders into an entirely different location in the physical DOM, **event bubbling follows the React component tree (Virtual DOM tree), NOT the physical HTML DOM tree!**

```jsx
function Parent() {
  return (
    <div onClick={() => console.log('Parent caught click!')}>
      <Modal />
    </div>
  );
}

function Modal() {
  return createPortal(
    <button>Inside Portal attached to document.body</button>,
    document.body
  );
}
```
*Output:* Clicking the `<button>` logs `"Parent caught click!"` because React's Synthetic Event system delegates and bubbles events according to the React Virtual DOM hierarchy!

---

## 6. Error Boundaries

### Q7: What are Error Boundaries? Why can't Functional Components be Error Boundaries? What errors do they NOT catch?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Coding

**Answer:**
An **Error Boundary** is a React component that catches JavaScript errors anywhere in its child component tree, logs the error, and displays a fallback UI instead of crashing the entire application into a blank white screen.

**Why functional components cannot be Error Boundaries:**
React relies on the class lifecycle methods `static getDerivedStateFromError(error)` and `componentDidCatch(error, info)`. As of React 19, the React team has not implemented functional hook equivalents for these methods because catching exceptions during rendering requires special Fiber unwind mechanics that are coupled to class instances.

**Errors Error Boundaries do NOT catch:**
1. **Event Handlers:** (e.g., `onClick={() => { throw new Error(); }}`) — Handlers run *outside* the render cycle. Use standard `try/catch` in event handlers.
2. **Asynchronous Code:** `setTimeout`, `requestAnimationFrame`, raw `fetch()` promises.
3. **Server-Side Rendering (SSR).**
4. **Errors thrown inside the Error Boundary component itself** (rather than its children).

---

### Q8: Coding Challenge: Build a Reusable Error Boundary with Reset Functionality
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Send to Sentry / Datadog here
  }

  public handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      return (
        <div role="alert" className="error-fallback">
          <h2>Something went wrong.</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={this.handleReset}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 7. Suspense, Lazy Loading & Waterfall Problems

### Q9: How does `React.lazy()` work under the hood? What is the Network Waterfall trap?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Gotcha

**Answer:**
`React.lazy()` accepts a callback returning a dynamic import `import('./Component')`. When rendered:
1. `React.lazy` fires the dynamic import promise.
2. While the promise is pending, the lazy component throws the Promise.
3. The nearest ancestor `<Suspense fallback={<Spinner />}>` catches the thrown Promise and renders its fallback UI.
4. When the Promise resolves (JavaScript chunk downloaded and evaluated), React re-renders the component tree with the resolved module.

```jsx
const UserProfile = React.lazy(() => import('./UserProfile'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UserProfile />
    </Suspense>
  );
}
```

**The Network Waterfall Anti-Pattern:**
If components and data fetching are split across nested lazy boundaries:
```text
Download Chunk A (500ms)
    └── Render Component A
            └── Fetch Data for A (400ms)
                    └── Trigger Lazy Chunk B (500ms)
                            └── Render Component B
                                    └── Fetch Data for B (400ms)
Total Latency: 1800ms! (Sequential Waterfall)
```

**How to eliminate waterfalls:**
1. **Parallel Preloading on Hover / Route Matching:** Start downloading code and data immediately when the user hovers over a navigation link or when the router matches the URL, rather than waiting for the component to mount.
2. **Colocated Route Loaders:** Use React Router / Remix / Next.js loaders to fetch data and script assets in parallel.

---

## 🎯 Quick-Fire Round

1. **Can an Error Boundary catch errors in its own render method?**  
   *No. It only catches errors in its children components.*
2. **What happens to component state when a child throws an unhandled error without an Error Boundary?**  
   *React unmounts the entire component tree and leaves a blank white screen.*
3. **Can you attach event listeners to a Portal container?**  
   *Yes, both native DOM listeners and React synthetic events bubble normally.*
4. **Is `forwardRef` needed in React 19?**  
   *No! In React 19, `ref` can be received as a regular prop in function components.*
5. **Can an HOC pass additional props down to the wrapped component?**  
   *Yes, that is the primary intent of enhancer HOCs.*
6. **Can `Suspense` catch errors?**  
   *No. Suspense only coordinates loading states for pending Promises; use `ErrorBoundary` for errors.*
7. **Can you nest Error Boundaries?**  
   *Yes! You should wrap independent widgets (e.g., chat sidebar, feed, navbar) in separate boundaries so one widget failure does not crash the entire app.*
8. **Does uncontrolled input require an `onChange` handler?**  
   *No. You can read its value on submit using a `ref` or `FormData`.*
9. **What is the difference between `defaultValue` and `value` on inputs?**  
   *`defaultValue` sets initial state for uncontrolled inputs; `value` enforces controlled state.*
10. **Can compound components be composed across multiple files?**  
    *Yes, by exporting child subcomponents and coordinating via a shared Context.*

---

> **Next:** [05 — State Management Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/05-state-management-qa.md)
