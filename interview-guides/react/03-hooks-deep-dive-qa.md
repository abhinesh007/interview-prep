# 03 — React Hooks Deep Dive Interview Questions & Answers

> Rules of hooks, linked-list mechanics, useReducer, useRef, useContext, useMemo, useCallback, useTransition, useDeferredValue, React 19 hooks (`useActionState`, `useOptimistic`, `use`), and custom hooks.

---

## 📑 Table of Contents
1. [Rules of Hooks & Internal Implementation](#1-rules-of-hooks--internal-implementation)
2. [useReducer Deep Dive](#2-usereducer-deep-dive)
3. [useRef Mastery](#3-useref-mastery)
4. [useContext & Re-render Optimization](#4-usecontext--re-render-optimization)
5. [Performance Hooks: useMemo vs useCallback](#5-performance-hooks-usememo-vs-usecallback)
6. [Concurrent Hooks: useTransition & useDeferredValue](#6-concurrent-hooks-usetransition--usedeferredvalue)
7. [React 19 Modern Hooks](#7-react-19-modern-hooks)
8. [Custom Hooks Best Practices](#8-custom-hooks-best-practices)
9. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Rules of Hooks & Internal Implementation

### Q1: Why can't you call Hooks inside conditions, loops, or nested functions?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Internals

**Answer:**
Hooks rely on **strict, predictable invocation order** between renders. 

Under the hood, a component's state is stored on its **Fiber node** as a singly linked list of hook records (`fiber.memoizedState`):
```text
Fiber.memoizedState ──> [ Hook 1: useState ] 
                             │ next
                             ▼
                        [ Hook 2: useEffect ]
                             │ next
                             ▼
                        [ Hook 3: useRef ]
```

On every render:
1. React resets an internal pointer `workInProgressHook = fiber.memoizedState`.
2. As each hook executes, React advances the pointer to `workInProgressHook.next`.
3. React matches the running hook call to its corresponding slot in the linked list.

If a hook is placed inside an `if` condition:
```jsx
// ❌ WRONG
if (isLoggedIn) {
  useState('user'); // Skipped when logged out!
}
const [theme, setTheme] = useState('dark');
```
When `isLoggedIn` switches from `true` to `false`, the first hook is skipped. The pointer now assigns the second hook's slot (the user data) to `theme`! The entire internal linked list gets shifted by one, causing corrupted state and runtime crashes.

---

### Q2: What error occurs if you conditionally call a Hook?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction

**Answer:**
React detects the mismatch between renders and throws:
```text
Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```
Or:
```text
Error: Rendered more hooks than during the previous render.
```

---

## 2. useReducer Deep Dive

### Q3: When should you use `useReducer` over `useState`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
Use `useReducer` when:
1. **Complex state shape:** State is an object with multiple independent or interdependent sub-values.
2. **Next state depends on previous state across multiple properties:** E.g., changing `status: 'failed'` must simultaneously clear `data`, set `error`, and increment `retryCount`.
3. **Decoupling business logic from UI:** Reducer logic is a pure JavaScript function that can be exported, unit-tested without rendering React components, and reused.
4. **Passing `dispatch` down instead of callbacks:** `dispatch` identity is guaranteed stable across renders, eliminating the need to wrap callbacks in `useCallback` when passing through multiple component levels.

---

### Q4: Coding Challenge: Implement a complete Shopping Cart Reducer
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```typescript
type CartItem = { id: string; name: string; price: number; quantity: number };

type CartState = {
  items: CartItem[];
  totalAmount: number;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      const updatedItems = existing
        ? state.items.map(i =>
            i.id === action.payload.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...state.items, { ...action.payload, quantity: 1 }];

      return {
        items: updatedItems,
        totalAmount: updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
      };
    }

    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(i => i.id !== action.payload.id);
      return {
        items: updatedItems,
        totalAmount: updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
      };
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: { id: action.payload.id } });
      }
      const updatedItems = state.items.map(i =>
        i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i
      );
      return {
        items: updatedItems,
        totalAmount: updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
      };
    }

    case 'CLEAR_CART':
      return { items: [], totalAmount: 0 };

    default:
      return state;
  }
}
```

---

## 3. useRef Mastery

### Q5: What are the two primary use cases of `useRef`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
1. **Accessing Real DOM Elements:** Attaching directly to a JSX element (`<input ref={inputRef} />`) to read dimensions, trigger focus, play video, or bind third-party non-React libraries (e.g., D3, Chart.js, Leaflet).
2. **Mutable Instance Variable (Preserving Values Across Renders Without Triggering Re-renders):** Storing values that persist across the entire component lifecycle without triggering a UI re-render when mutated (e.g., `timerId`, previous prop values, render counts, flags like `isMounted`).

```jsx
// Example: Storing a timer ID
function Timer() {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const start = () => {
    if (timerRef.current !== null) return;
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  return (
    <div>
      <p>{seconds}s</p>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does modifying `ref.current` trigger a re-render?"  
*Answer:* **No.** Mutating `.current` is a direct JavaScript object mutation; React has no knowledge of it and schedules no re-render.

---

## 4. useContext & Re-render Optimization

### Q6: Performance Trap: Why does updating Context re-render all consuming components? How do you fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Optimization

**Answer:**
Whenever a Context Provider's `value` changes (by reference identity), **every single component** that calls `useContext(MyContext)` will forcefully re-render, **bypassing `React.memo`**.

**Solutions:**

#### 1. Split Contexts (State vs Dispatch)
Functions created with `useReducer` dispatch or static callbacks rarely change. Separate dynamic values from invariant functions:

```jsx
const UserStateContext = createContext(null);
const UserDispatchContext = createContext(null);

export function UserProvider({ children }) {
  const [user, dispatch] = useReducer(userReducer, null);

  return (
    <UserStateContext.Provider value={user}>
      <UserDispatchContext.Provider value={dispatch}>
        {children}
      </UserDispatchContext.Provider>
    </UserStateContext.Provider>
  );
}

// Components that only dispatch actions never re-render when user updates!
export function useUserDispatch() {
  return useContext(UserDispatchContext);
}
```

#### 2. Memoize the Provider Value
```jsx
const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
```

#### 3. Component Composition
Wrap children in memoized sub-components or use external atomic stores (Zustand, Jotai) when state changes at high frequency (e.g., text inputs, mouse coordinates, audio scrubbing).

---

## 5. Performance Hooks: useMemo vs useCallback

### Q7: Output Prediction: Is `useCallback(fn, deps)` identical to `useMemo(() => fn, deps)`?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction

**Answer:**
**Yes, mathematically and functionally identical.**
Under the hood in React source code:
```javascript
function useCallback(fn, deps) {
  return useMemo(() => fn, deps);
}
```
- `useMemo(() => result, deps)` memoizes the **returned value** of the function.
- `useCallback(fn, deps)` memoizes the **function reference itself**.

---

### Q8: When does `useMemo` make performance WORSE?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Trap

**Answer:**
`useMemo` has an inherent overhead:
1. Memory allocation for dependency array and cache slot in the Fiber node.
2. Iteration and `Object.is()` comparison over all dependencies on **every single render**.
3. Garbage collector pressure.

```jsx
// ❌ ANTI-PATTERN: useMemo on cheap operations is SLOWER than recalculating
const doubled = useMemo(() => count * 2, [count]);
const uppercaseName = useMemo(() => name.toUpperCase(), [name]);
```

**When to use `useMemo`:**
1. Computation is demonstrably heavy (e.g., sorting/filtering 5,000 items, complex regex parsing, matrix calculations).
2. The returned object/array reference is passed as a prop to a child wrapped in `React.memo()`.
3. The returned reference is used in the dependency array of another hook (`useEffect`, `useCallback`).

---

### Q9: Bug: Stale closure in `useCallback`
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix

```jsx
// ❌ BUGGY CODE: Stale closure
function Counter() {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount(count + 1); // Captures `count = 0` forever!
  }, []); // Empty dependency array!

  return <button onClick={increment}>Clicked {count}</button>;
}
```

**Bug:** When the button is clicked, `increment` was created with `count = 0` in its lexical scope. No matter how many times clicked, it executes `setCount(0 + 1)`, remaining stuck at `1`.

**The Fix:**
```jsx
// ✅ Use functional update: No dependency on count needed!
const increment = useCallback(() => {
  setCount(prev => prev + 1);
}, []);
```

---

## 6. Concurrent Hooks: useTransition & useDeferredValue

### Q10: What problem do `useTransition` and `useDeferredValue` solve that debouncing cannot?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Comparison

**Answer:**
**Debouncing** merely delays execution until the user stops typing for $N$ milliseconds. Once triggered, the heavy render still executes synchronously, completely freezing the main thread and dropping frames.

**Concurrent Hooks (`useTransition`, `useDeferredValue`)**:
1. **Interruptible Rendering:** They mark state updates as non-urgent transitions. If React is busy rendering 10,000 filtered items and the user types another letter, React **aborts** the low-priority render, processes the keystroke immediately with zero input lag, and restarts the heavy render in the background.
2. **Instant UI feedback:** No artificial timeout delay (unlike debounce's 300ms wait).

```jsx
function FilterList({ items }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [filteredItems, setFilteredItems] = useState(items);

  const handleChange = (e) => {
    // 1. High priority: update input field immediately
    setQuery(e.target.value);

    // 2. Low priority: interruptible background calculation
    startTransition(() => {
      setFilteredItems(items.filter(item => item.name.includes(e.target.value)));
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <List items={filteredItems} />
    </div>
  );
}
```

---

## 7. React 19 Modern Hooks

### Q11: What is `useActionState`, and how does it revolutionize form handling?
**Difficulty:** 🟡 Mid  
**Type:** 📖 React 19 Feature

**Answer:**
In React 18, handling asynchronous form submission required manual state management for `loading`, `error`, and `data`:
```jsx
// React 18: 3 separate states + try/catch
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);
```

In React 19, `useActionState` manages the pending state, error response, and optimistic flows natively:
```jsx
import { useActionState } from 'react';

async function updateNameAction(previousState, formData) {
  try {
    const newName = formData.get('name');
    const updated = await api.updateName(newName);
    return { name: updated, error: null };
  } catch (err) {
    return { name: previousState.name, error: err.message };
  }
}

function UserForm() {
  const [state, formAction, isPending] = useActionState(updateNameAction, {
    name: 'Anonymous',
    error: null,
  });

  return (
    <form action={formAction}>
      <input name="name" defaultValue={state.name} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

---

### Q12: How does `useOptimistic` work in React 19? Walk through a "Like" button.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding / React 19

**Answer:**
`useOptimistic` allows you to immediately render the expected UI change while an async action is in-flight, automatically rolling back if the request fails.

```jsx
import { useOptimistic } from 'react';

function LikeButton({ likes, onLikeAction }) {
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    likes,
    (current, update) => current + update
  );

  const handleLike = async () => {
    // 1. Instantly updates UI
    setOptimisticLikes(1);
    // 2. Triggers async server action
    await onLikeAction();
  };

  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

---

### Q13: What does the React 19 `use()` API do, and how does it differ from standard hooks?
**Difficulty:** 🔴 Senior  
**Type:** 📖 React 19

**Answer:**
`use()` is a new primitive that can unwrap **Promises** and **Contexts** inside component renders.

Key differences from standard hooks:
1. **Can be called conditionally:** Unlike `useContext` or other hooks, `use()` can be called inside `if` statements and loops!
2. **Suspense integration:** When passed a Promise, `use(promise)` automatically suspends the component until the Promise resolves, rendering the nearest `<Suspense fallback={<Spinner/>}>`.

```jsx
import { use } from 'react';

function UserCard({ userPromise, shouldLoadComments, commentsPromise }) {
  // Unwraps promise with Suspense
  const user = use(userPromise);

  // ✅ Conditional hook call! Perfectly valid with use()
  let comments = null;
  if (shouldLoadComments) {
    comments = use(commentsPromise);
  }

  return (
    <div>
      <h2>{user.name}</h2>
      {comments && <CommentList comments={comments} />}
    </div>
  );
}
```

---

## 8. Custom Hooks Best Practices

### Q14: Coding Challenge: Implement `useDebounce`, `useLocalStorage`, and `usePrevious`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

#### 1. `useDebounce`
```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

#### 2. `useLocalStorage`
```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
```

#### 3. `usePrevious`
```typescript
import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value; // Updates AFTER render phase
  }, [value]);

  return ref.current; // Returns value from PREVIOUS render
}
```

---

## 🎯 Quick-Fire Round

1. **Why must custom hooks start with `use`?**  
   *So ESLint's `eslint-plugin-react-hooks` can enforce the Rules of Hooks automatically.*
2. **Can a custom hook return JSX?**  
   *Yes, but it is considered an anti-pattern; custom hooks should return state and logic, while components should return JSX.*
3. **Does `useId()` generate cryptographically secure IDs?**  
   *No. It generates deterministic strings for accessibility HTML IDs across SSR hydration.*
4. **Is `dispatch` from `useReducer` guaranteed to have a stable identity?**  
   *Yes. React guarantees `dispatch` never changes reference across renders.*
5. **Can you read a ref during render?**  
   *Never read or write `ref.current` during rendering, as it produces unpredictable bugs in concurrent mode.*
6. **Can `useMemo` be used to replace a build-time compiler?**  
   *React 19 introduces React Compiler (Forget), which auto-memoizes components and values without manual `useMemo`.*
7. **What happens if you pass an async function to `useMemo`?**  
   *It memoizes the returned Promise object, not the resolved value.*
8. **What is `useImperativeHandle` used for?**  
   *Customizing the imperative instance/methods exposed to a parent component when using `ref`.*
9. **Can you pass a `ref` as a normal prop in React 19?**  
   *Yes! React 19 eliminates the need for `forwardRef`; `ref` is now a standard prop on function components.*
10. **Does `useDeferredValue` cause an initial extra render?**  
    *Yes, React first renders with the old value, then immediately triggers an interruptible re-render with the new deferred value.*

---

> **Next:** [04 — Advanced Patterns Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/04-advanced-patterns-qa.md)
