# 12 — TypeScript with React Interview Questions & Answers

> Component typing, `interface` vs `type`, typing `children` (`ReactNode` vs `ReactElement`), typing hooks & events, Generic components (`<List<T>>`), Polymorphic `as` prop, and Discriminated Unions.

---

## 📑 Table of Contents
1. [Component Props: `interface` vs `type` & Typing `children`](#1-component-props-interface-vs-type--typing-children)
2. [Why `React.FC` is Discouraged in Modern React](#2-why-reactfc-is-discouraged-in-modern-react)
3. [Typing React Hooks & Discriminated Reducers](#3-typing-react-hooks--discriminated-reducers)
4. [Typing Synthetic Events Cheat Sheet](#4-typing-synthetic-events-cheat-sheet)
5. [Advanced Patterns: Generic Components & Polymorphic `as` Prop](#5-advanced-patterns-generic-components--polymorphic-as-prop)
6. [Discriminated Union Props & Exhaustive Checks](#6-discriminated-union-props--exhaustive-checks)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Component Props: `interface` vs `type` & Typing `children`

### Q1: `interface` vs `type` for React Component Props: Which should you choose?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Best Practices

**Answer:**
Both can define props, but each has specific advantages:
- **`interface`:** Supports declaration merging (`interface Props extends ...`), slightly faster TypeScript compiler caching. Best for public component libraries where users might extend props.
- **`type`:** Supports **Unions (`|`)**, intersections (`&`), mapped types, and tuple types.

```typescript
// Union cannot be represented with interface:
type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  variant: ButtonVariant;
  onClick: () => void;
};
```
**Industry Convention:** Many modern teams use `type` for internal application props (due to union flexibility) and `interface` for library definitions. Be consistent within the codebase.

---

### Q2: Typing `children`: `ReactNode` vs `ReactElement` vs `JSX.Element`
**Difficulty:** 🟡 Mid  
**Type:** 📖 Core TypeScript

**Answer:**
- **`React.ReactNode` (Most Common & Recommended):** Anything that can be rendered inside a component. Includes: `ReactElement`, `string`, `number`, `boolean`, `null`, `undefined`, and arrays of these.
  ```typescript
  type CardProps = { children: React.ReactNode };
  ```
- **`React.ReactElement`:** An actual instantiated JSX element object (e.g., `<div />` or `<Custom />`). Excludes raw strings, numbers, or booleans.
  ```typescript
  // Use when a parent ONLY accepts an actual React element:
  type ModalProps = { trigger: React.ReactElement };
  ```
- **`PropsWithChildren<P>`:** A utility type that injects `children?: ReactNode` into your prop type:
  ```typescript
  type CardProps = PropsWithChildren<{ title: string }>;
  ```

---

## 2. Why `React.FC` is Discouraged in Modern React

### Q3: What is the difference between `React.FC<Props>` and standard function components? Why did `React.FC` fall out of favor?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
```typescript
// Style 1: React.FC (Legacy/Discouraged)
const Button: React.FC<ButtonProps> = ({ label }) => <button>{label}</button>;

// Style 2: Standard Function Signature (Modern Standard)
function Button({ label }: ButtonProps) {
  return <button>{label}</button>;
}
```

**Why `React.FC` is discouraged:**
1. **Implicit `children` (React < 18):** `React.FC` used to implicitly add `children?: ReactNode` to all components, even components that should never accept children (e.g., `<Avatar />`).
2. **Generics syntax nightmare:** Writing generic components with `React.FC` is awkward: `const List: React.FC<ListProps<T>>` does not work smoothly.
3. **Verbose:** Standard function syntax is cleaner, supports generics naturally, and works well with standard TypeScript inference.

---

## 3. Typing React Hooks & Discriminated Reducers

### Q4: Coding Challenge: Typing `useState`, `useRef`, and `useReducer`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

#### 1. `useState` with Nullable Complex Type
```typescript
interface UserProfile {
  id: string;
  name: string;
}

// Explicit generic parameter needed when starting with null!
const [user, setUser] = useState<UserProfile | null>(null);
```

#### 2. `useRef` (DOM Ref vs Mutable Value)
```typescript
// DOM Ref: Must initialize with `null`!
const inputRef = useRef<HTMLInputElement>(null);

// Mutable instance variable:
const timerIdRef = useRef<number | null>(null);
```

#### 3. `useReducer` with Discriminated Unions
```typescript
type State = { count: number; error: string | null };

type Action =
  | { type: 'INCREMENT'; step: number }
  | { type: 'DECREMENT'; step: number }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + action.step };
    case 'DECREMENT':
      return { ...state, count: state.count - action.step };
    case 'RESET':
      return { count: 0, error: null };
  }
}
```

---

## 4. Typing Synthetic Events Cheat Sheet

### Q5: React Event Types Cheat Sheet
**Difficulty:** 🟢 Junior  
**Type:** 📖 Reference Guide

**Answer:**

```typescript
// 1. Text input change
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};

// 2. Select dropdown change
const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  console.log(e.target.value);
};

// 3. Form submit
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

// 4. Button click
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.clientX);
};

// 5. Keydown / Keyup
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') submit();
};
```

**Pro Tip:** If an event handler is declared **inline** in JSX, TypeScript infers event types automatically!
```jsx
// `e` is automatically typed as React.ChangeEvent<HTMLInputElement>
<input onChange={(e) => console.log(e.target.value)} />
```

---

## 5. Advanced Patterns: Generic Components & Polymorphic `as` Prop

### Q6: Coding Challenge: Generic List Component `<List<T>>`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import React, { ReactNode } from 'react';

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, idx) => (
        <li key={keyExtractor(item)}>{renderItem(item, idx)}</li>
      ))}
    </ul>
  );
}

// Type-safe usage:
interface Product { id: number; title: string; price: number; }

<List<Product>
  items={products}
  keyExtractor={(p) => p.id}
  renderItem={(p) => <span>{p.title} - ${p.price}</span>}
/>
```

---

### Q7: Coding Challenge: Polymorphic `as` Prop Component
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding / Senior Pattern

**Goal:** Create a `<Text>` component that defaults to rendering a `<p>`, but can render as `<h1>`, `<span>`, or `<a>` while preserving HTML attributes for that specific tag (e.g., `href` only valid when `as="a"`).

```tsx
import React, { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type TextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
} & ComponentPropsWithoutRef<T>;

export function Text<T extends ElementType = 'p'>({
  as,
  children,
  ...props
}: TextProps<T>) {
  const Component = as || 'p';
  return <Component {...props}>{children}</Component>;
}

// Usage with full type safety:
<Text as="a" href="https://example.com" target="_blank">Clickable Link</Text>
<Text as="h1" className="text-xl">Heading</Text>
// <Text as="p" href="..." /> // ❌ Compile error: 'href' does not exist on 'p'!
```

---

## 6. Discriminated Union Props & Exhaustive Checks

### Q8: Coding Challenge: Discriminated Union Props for a Alert Component
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

**Scenario:** If `variant === 'actionable'`, require an `onAction` callback and `actionLabel`. If `variant === 'info'`, forbid them!

```tsx
type BaseProps = {
  message: string;
};

type InfoAlertProps = BaseProps & {
  variant: 'info';
};

type ActionableAlertProps = BaseProps & {
  variant: 'actionable';
  actionLabel: string;
  onAction: () => void;
};

type AlertProps = InfoAlertProps | ActionableAlertProps;

export function Alert(props: AlertProps) {
  if (props.variant === 'actionable') {
    // TypeScript knows props has actionLabel and onAction here!
    return (
      <div className="alert-action">
        <p>{props.message}</p>
        <button onClick={props.onAction}>{props.actionLabel}</button>
      </div>
    );
  }

  return <div className="alert-info"><p>{props.message}</p></div>;
}
```

---

### Q9: Exhaustive Type Checking with `never`
**Difficulty:** 🟡 Mid  
**Type:** 📖 Best Practices

```typescript
type Status = 'loading' | 'success' | 'error';

function getStatusBadge(status: Status) {
  switch (status) {
    case 'loading': return '⏳';
    case 'success': return '✅';
    case 'error': return '❌';
    default: {
      // If someone adds 'idle' to Status union, TypeScript will fail to compile here!
      const _exhaustiveCheck: never = status;
      return _exhaustiveCheck;
    }
  }
}
```

---

## 🎯 Quick-Fire Round

1. **What is `ComponentPropsWithoutRef<'button'>`?**  
   *A utility extracting all standard HTML button attributes without the `ref` prop.*
2. **What does `Omit<T, K>` do?**  
   *Constructs a type by picking all properties from `T` and removing `K`.*
3. **How do you type a function that takes no args and returns nothing?**  
   *`() => void`.*
4. **Is `any` acceptable in React component props?**  
   *Never in production code; use `unknown` if the type is truly dynamic, or generic parameters.*
5. **How do you type CSS inline styles in props?**  
   *`style?: React.CSSProperties`.*
6. **Can you type `ref` directly as a prop in React 19?**  
   *Yes, `ref?: React.Ref<HTMLInputElement>` is a regular prop in React 19 without `forwardRef`.*
7. **What is the difference between `React.JSX.Element` and `React.ReactNode`?**  
   *`JSX.Element` represents the return type of a component; `ReactNode` includes primitives like strings and numbers.*
8. **Why does `useRef<HTMLInputElement>(null)` create a read-only ref?**  
   *Because initializing with `null` assigns the `RefObject` overload (DOM nodes); omit `null` or type as `useRef<number>()` for mutable refs.*
9. **Can TypeScript catch missing required props in JSX?**  
   *Yes, at compile time with zero runtime cost.*
10. **How do you type a forwardRef component in TypeScript pre-React 19?**  
    *`React.forwardRef<HTMLInputElement, Props>((props, ref) => ...)`.*

---

> **Next:** [13 — Real-World Production Architecture Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/13-real-world-patterns-qa.md)
