# 01 — Component Design Patterns

> Advanced component API design patterns for scalable React applications — Compound Components, Render Props, HOCs, Headless UI, Polymorphic Components, and Provider patterns with real-world examples and TypeScript implementations.

---

## 📑 Table of Contents
1. [Compound Components](#1-compound-components)
2. [HOCs & Render Props — Still Relevant?](#2-hocs--render-props--still-relevant)
3. [Headless UI & Renderless Components](#3-headless-ui--renderless-components)
4. [Polymorphic Components](#4-polymorphic-components)
5. [Provider Pattern & Module Boundaries](#5-provider-pattern--module-boundaries)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Compound Components

### Q1: When would you choose a Compound Component pattern over traditional props configuration? Give a real-world example.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `Component API` `Design Patterns` `DX`

**Answer:**

The Compound Component pattern allows a set of components to work together, sharing implicit state via React Context, to form a cohesive UI. Instead of a single component receiving a massive props object ("prop soup"), you expose composable sub-components.

**When to choose it:** When a component has **multiple interrelated sub-elements** and configuring everything through props creates a rigid, inflexible API.

**The "Prop Soup" Problem:**
```tsx
// ❌ Anti-pattern: "Prop Soup" — rigid, hard to customize
<Modal
  header="Delete Account"
  headerIcon={<TrashIcon />}
  body="Are you sure? This action cannot be undone."
  footer={<>
    <Button onClick={onCancel}>Cancel</Button>
    <Button variant="danger" onClick={onConfirm}>Delete</Button>
  </>}
  showCloseButton={true}
  closeOnOverlayClick={true}
  size="medium"
  onClose={handleClose}
/>
```

**The Compound Component Solution:**
```tsx
// ✅ Compound Components — flexible, composable, readable
<Modal onClose={handleClose}>
  <Modal.Header>
    <TrashIcon /> Delete Account
  </Modal.Header>
  <Modal.Body>
    Are you sure? This action cannot be undone.
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={onCancel}>Cancel</Button>
    <Button variant="danger" onClick={onConfirm}>Delete</Button>
  </Modal.Footer>
</Modal>
```

**Implementation (Context-Based — Preferred):**
```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Create shared context
interface ModalContextType {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Modal compound components must be used within <Modal>');
  return context;
};

// 2. Root component provides context
const Modal = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ isOpen, onClose: handleClose }}>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
};

// 3. Sub-components consume context
Modal.Header = ({ children }: { children: ReactNode }) => {
  const { onClose } = useModalContext();
  return (
    <header className="modal-header">
      {children}
      <button onClick={onClose} aria-label="Close">×</button>
    </header>
  );
};

Modal.Body = ({ children }: { children: ReactNode }) => (
  <div className="modal-body">{children}</div>
);

Modal.Footer = ({ children }: { children: ReactNode }) => (
  <footer className="modal-footer">{children}</footer>
);
```

**Trade-Off Analysis:**

| Approach | Pros | Cons |
|---|---|---|
| **Props Configuration** | Simple, easy to type, enforce strict structure | Rigid, "prop soup", hard to customize layout |
| **Compound (Context)** | Flexible, great DX, mimics HTML semantics | More verbose, harder to enforce ordering |
| **Compound (cloneElement)** | No context overhead | Breaks with wrapping elements, fragile |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a consumer wraps a sub-component in a `<div>` with the `cloneElement` approach?"  
*Senior Answer:* The `cloneElement` approach relies on direct children iteration. Wrapping a child in a `<div>` or `<Fragment>` breaks the parent's ability to inject props into it, because `cloneElement` would clone the `<div>` instead of the intended sub-component. This is exactly why the **Context-based approach is preferred** — it doesn't care about DOM hierarchy, only about provider/consumer relationships.

---

### Q2: Build a type-safe Compound Component for a multi-step wizard. Show how you'd enforce step ordering at runtime.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Compound Components` `TypeScript` `Wizard`

**Answer:**

A multi-step wizard is one of the most practical compound component applications. The pattern needs to manage current step index, navigation, and validation.

```tsx
import { createContext, useContext, useState, ReactNode, Children, isValidElement } from 'react';

// --- Types ---
interface WizardContextType {
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (step: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

// --- Context ---
const WizardContext = createContext<WizardContextType | null>(null);

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within <Wizard>');
  return ctx;
};

// --- Root Component ---
interface WizardProps {
  children: ReactNode;
  onComplete?: () => void;
}

export const Wizard = ({ children, onComplete }: WizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Filter only Wizard.Step children
  const steps = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === WizardStep
  );

  const totalSteps = steps.length;

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  const goPrev = () => setCurrentStep((prev) => Math.max(0, prev - 1));
  const goToStep = (step: number) => setCurrentStep(Math.min(Math.max(0, step), totalSteps - 1));

  return (
    <WizardContext.Provider
      value={{
        currentStep,
        totalSteps,
        goNext,
        goPrev,
        goToStep,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === totalSteps - 1,
      }}
    >
      <div className="wizard-container">
        {/* Only render the active step */}
        {steps[currentStep]}
      </div>
    </WizardContext.Provider>
  );
};

// --- Step Sub-Component ---
interface StepProps {
  title: string;
  children: ReactNode;
}

const WizardStep = ({ children }: StepProps) => (
  <div className="wizard-step">{children}</div>
);

Wizard.Step = WizardStep;

// --- Navigation Sub-Component ---
Wizard.Navigation = () => {
  const { goNext, goPrev, isFirstStep, isLastStep } = useWizard();

  return (
    <div className="wizard-nav">
      <button onClick={goPrev} disabled={isFirstStep}>Back</button>
      <button onClick={goNext}>
        {isLastStep ? 'Complete' : 'Next'}
      </button>
    </div>
  );
};

// --- Progress Bar Sub-Component ---
Wizard.Progress = () => {
  const { currentStep, totalSteps } = useWizard();
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="wizard-progress">
      <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
      <span>Step {currentStep + 1} of {totalSteps}</span>
    </div>
  );
};
```

**Usage:**
```tsx
<Wizard onComplete={() => submitOrder()}>
  <Wizard.Progress />

  <Wizard.Step title="Shipping">
    <AddressForm />
  </Wizard.Step>

  <Wizard.Step title="Payment">
    <PaymentForm />
  </Wizard.Step>

  <Wizard.Step title="Review">
    <OrderSummary />
  </Wizard.Step>

  <Wizard.Navigation />
</Wizard>
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How would you add per-step validation so the user can't proceed without completing the current step?"  
*Senior Answer:* Add a `validate` prop to each `Wizard.Step` that accepts an async function returning a boolean. The `goNext` function would call `steps[currentStep].props.validate?.()` before advancing. For form-heavy wizards, integrate with React Hook Form's `trigger()` method for field-level validation per step. You'd store a `Map<number, () => Promise<boolean>>` in context so each step can register its own validator.

---

### Q3: Context-Based vs cloneElement-Based Compound Components — When would you still choose `cloneElement`?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `cloneElement` `Context` `Trade-offs`

**Answer:**

```text
┌────────────────────────────────────────────────────────────┐
│            Context-Based (Preferred for 95% of cases)      │
│                                                            │
│  Parent provides context → any descendant can consume      │
│  ✅ Works regardless of DOM hierarchy wrapping              │
│  ✅ Clean separation of concerns                            │
│  ❌ Slightly more boilerplate (createContext + Provider)     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│            cloneElement-Based (Niche use cases)            │
│                                                            │
│  Parent iterates children → clones with injected props     │
│  ✅ No context overhead for simple, flat child lists        │
│  ✅ Good for auto-indexing (e.g., Accordion panel indices)  │
│  ❌ Breaks with wrappers (<div>, Fragment, HOCs)            │
│  ❌ TypeScript typing is awkward                            │
└────────────────────────────────────────────────────────────┘
```

**When `cloneElement` is still reasonable:**
1. **Simple flat lists** where you need to inject an `index` prop (e.g., `<Accordion>` auto-assigning panel indices).
2. **Animation containers** like `<AnimatePresence>` (Framer Motion) that need to inject animation lifecycle props to direct children.
3. **Performance-critical micro-components** where creating a Context provider per instance is excessive overhead.

```tsx
// cloneElement use case: auto-injecting index to direct children
const Accordion = ({ children }: { children: ReactNode }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div>
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            isOpen: activeIndex === index,
            onToggle: () => setActiveIndex(activeIndex === index ? null : index),
          });
        }
        return child;
      })}
    </div>
  );
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "React docs recommend against `cloneElement` in newer versions. Why?"  
*Senior Answer:* The React team considers `cloneElement` a legacy API because it obscures the data flow — the parent magically modifies props of children without the children explicitly declaring those dependencies. It creates fragile implicit contracts. The recommended replacements are: (1) **Context** for shared state, (2) **Render props / callbacks** for customization, or (3) passing components as props directly (`renderItem={...}`).

---

## 2. HOCs & Render Props — Still Relevant?

### Q4: Modern hooks largely replaced HOCs and Render Props. Are there architectural scenarios where they're still the right choice?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `HOC` `Render Props` `Hooks` `Evolution`

**Answer:**

Custom hooks are the default pattern in modern React, but HOCs and Render Props serve irreplaceable roles in specific scenarios:

**HOCs — Still Useful For:**

| Use Case | Why Hooks Can't Replace |
|---|---|
| **Cross-cutting concerns on class components** | Hooks only work in function components. Legacy codebases may have class components that need auth/logging wrapping |
| **Prop interception & transformation** | HOCs can intercept and modify incoming props before the wrapped component sees them (e.g., injecting telemetry metadata) |
| **Route protection wrappers** | `withAuth(Component)` — wraps any component with redirect logic. While a `useAuth` hook + conditional rendering works, HOC keeps the consuming component cleaner |
| **Third-party integration adapters** | Wrapping vendor components you can't modify to inject analytics, error boundaries, or performance monitoring |

```tsx
// HOC: Analytics injection for any component
function withAnalytics<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  eventCategory: string
) {
  return function AnalyticsWrapper(props: P) {
    const trackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          analytics.trackImpression(eventCategory, props);
        }
      });
      if (trackRef.current) observer.observe(trackRef.current);
      return () => observer.disconnect();
    }, []);

    return (
      <div ref={trackRef}>
        <WrappedComponent {...props} />
      </div>
    );
  };
}

// Usage: wraps any component with automatic impression tracking
const TrackedProductCard = withAnalytics(ProductCard, 'product_listing');
```

**Render Props — Still Useful For:**

| Use Case | Why Hooks Can't Replace |
|---|---|
| **Dynamic rendering delegation** | When a component engine needs to let the CONSUMER decide what to render based on internal state |
| **Cross-platform rendering** | A single data-fetching component that renders differently on web vs mobile |
| **Backward compatibility** | Libraries supporting both class and function components |

```tsx
// Render prop: Mouse position tracker (renderless component)
interface MouseTrackerProps {
  render: (position: { x: number; y: number }) => ReactNode;
}

const MouseTracker = ({ render }: MouseTrackerProps) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return <>{render(pos)}</>;
};

// But the HOOK version is almost always better:
const useMousePosition = () => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return pos;
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What's the main DX problem with HOCs that hooks solved?"  
*Senior Answer:* Three problems: (1) **Wrapper hell** — nesting `withAuth(withTheme(withAnalytics(Component)))` creates a deep Virtual DOM tree that's hard to debug in DevTools. (2) **Prop collision** — if two HOCs inject a prop with the same name (`data`, `loading`), one silently overwrites the other. (3) **Static composition** — HOCs are applied at module definition time, not dynamically at render time, limiting runtime flexibility.

---

## 3. Headless UI & Renderless Components

### Q5: What is the "Headless UI" pattern and how would you architect a headless `useCombobox` hook for a design system?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Headless UI` `Design System` `Custom Hooks`

**Answer:**

**Headless UI** separates behavior/logic from visual presentation. The hook manages state, keyboard navigation, ARIA attributes, and focus management — but returns **zero markup**. The consuming component decides all visual aspects.

**Why this pattern matters for architects:**
- **Design system teams** ship headless primitives that product teams can skin with any CSS framework
- **Accessibility baked in** — the hook handles ARIA attributes and keyboard interactions
- **Testing is trivial** — test logic independently of UI rendering

```text
┌─────────────────────────────────────────────────┐
│            Traditional Component                 │
│  ┌───────────────────────────────────────┐      │
│  │  Logic + State + ARIA + Markup + CSS  │      │
│  └───────────────────────────────────────┘      │
│              (All coupled together)              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            Headless Pattern                      │
│  ┌──────────────────────┐                       │
│  │ useCombobox() Hook   │ ← Logic + State + ARIA│
│  │ Returns: props,      │                       │
│  │ handlers, state      │                       │
│  └──────────┬───────────┘                       │
│             │ spreads props                      │
│  ┌──────────▼───────────┐                       │
│  │ <MyCustomCombobox /> │ ← Markup + CSS only   │
│  └──────────────────────┘                       │
└─────────────────────────────────────────────────┘
```

**Headless `useCombobox` Implementation:**
```tsx
import { useState, useRef, useCallback, useMemo, KeyboardEvent } from 'react';

interface UseComboboxProps<T> {
  items: T[];
  itemToString: (item: T) => string;
  onSelectedItemChange?: (item: T | null) => void;
  filterFn?: (item: T, query: string) => boolean;
}

interface UseComboboxReturn<T> {
  // State
  isOpen: boolean;
  inputValue: string;
  highlightedIndex: number;
  selectedItem: T | null;
  filteredItems: T[];

  // Prop getters (spread onto your elements)
  getInputProps: () => Record<string, unknown>;
  getMenuProps: () => Record<string, unknown>;
  getItemProps: (index: number) => Record<string, unknown>;
  getToggleButtonProps: () => Record<string, unknown>;
}

export function useCombobox<T>({
  items,
  itemToString,
  onSelectedItemChange,
  filterFn,
}: UseComboboxProps<T>): UseComboboxReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const filteredItems = useMemo(() => {
    if (!inputValue) return items;
    const defaultFilter = (item: T, query: string) =>
      itemToString(item).toLowerCase().includes(query.toLowerCase());
    return items.filter((item) => (filterFn || defaultFilter)(item, inputValue));
  }, [items, inputValue, filterFn, itemToString]);

  const selectItem = useCallback(
    (item: T) => {
      setSelectedItem(item);
      setInputValue(itemToString(item));
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectedItemChange?.(item);
    },
    [itemToString, onSelectedItemChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIsOpen(true);
          setHighlightedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
            selectItem(filteredItems[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [filteredItems, highlightedIndex, selectItem]
  );

  // Prop getters — spread these onto your custom markup
  const getInputProps = () => ({
    ref: inputRef,
    value: inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    onKeyDown: handleKeyDown,
    onFocus: () => setIsOpen(true),
    onBlur: () => setTimeout(() => setIsOpen(false), 200),
    role: 'combobox' as const,
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox' as const,
    'aria-autocomplete': 'list' as const,
  });

  const getMenuProps = () => ({
    ref: menuRef,
    role: 'listbox' as const,
    'aria-label': 'Options',
    style: { display: isOpen && filteredItems.length > 0 ? 'block' : 'none' },
  });

  const getItemProps = (index: number) => ({
    role: 'option' as const,
    'aria-selected': highlightedIndex === index,
    onClick: () => selectItem(filteredItems[index]),
    onMouseEnter: () => setHighlightedIndex(index),
    style: {
      backgroundColor: highlightedIndex === index ? '#f0f0f0' : 'transparent',
    },
  });

  const getToggleButtonProps = () => ({
    onClick: () => setIsOpen((prev) => !prev),
    'aria-label': 'toggle menu',
    tabIndex: -1,
  });

  return {
    isOpen,
    inputValue,
    highlightedIndex,
    selectedItem,
    filteredItems,
    getInputProps,
    getMenuProps,
    getItemProps,
    getToggleButtonProps,
  };
}
```

**Usage — the consumer controls ALL visuals:**
```tsx
const CountryPicker = () => {
  const {
    isOpen,
    filteredItems,
    getInputProps,
    getMenuProps,
    getItemProps,
    getToggleButtonProps,
  } = useCombobox({
    items: countries,
    itemToString: (country) => country.name,
    onSelectedItemChange: (country) => console.log('Selected:', country),
  });

  return (
    <div className="country-picker">
      <input {...getInputProps()} placeholder="Search countries..." />
      <button {...getToggleButtonProps()}>▼</button>
      <ul {...getMenuProps()}>
        {filteredItems.map((country, index) => (
          <li key={country.code} {...getItemProps(index)}>
            <span className="flag">{country.flag}</span>
            <span>{country.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What's the risk of the `onBlur` timeout in your implementation?"  
*Senior Answer:* The `setTimeout` in `onBlur` is a well-known hack to prevent the menu from closing before a click event registers on a menu item. The risk is that if the timeout is too short, fast clickers lose their selection. If too long, the menu stays open after tabbing away. Production libraries (like Downshift) use `mousedown` instead of `click` on menu items (since `mousedown` fires before `blur`), or use `event.preventDefault()` on `mousedown` to prevent the blur entirely.

---

## 4. Polymorphic Components

### Q6: What is a Polymorphic Component and how do you implement a type-safe `as` prop in TypeScript?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Polymorphic` `TypeScript` `Design System`

**Answer:**

A Polymorphic Component renders as different HTML elements or other React components while maintaining full type safety. This is essential for design systems — a `<Button>` that can render as `<a>`, `<button>`, or a `<Link>` component.

```tsx
import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

// Generic polymorphic type helper
type PolymorphicProps<E extends ElementType, Props = {}> = Props & {
  as?: E;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<E>, keyof Props | 'as' | 'children'>;

// --- Type-safe Button component ---
type ButtonOwnProps = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
};

type ButtonProps<E extends ElementType = 'button'> = PolymorphicProps<E, ButtonOwnProps>;

export const Button = <E extends ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  ...restProps
}: ButtonProps<E>) => {
  const Component = as || 'button';

  return (
    <Component
      className={`btn btn-${variant} btn-${size}`}
      disabled={isLoading}
      {...restProps}
    >
      {isLoading ? <Spinner /> : children}
    </Component>
  );
};
```

**Usage — the `as` prop changes what element is rendered AND what props are accepted:**
```tsx
// Renders as <button> — accepts onClick, disabled, type
<Button variant="primary" onClick={handleClick}>
  Submit
</Button>

// Renders as <a> — accepts href, target, rel
<Button as="a" href="/dashboard" target="_blank" variant="secondary">
  Go to Dashboard
</Button>

// Renders as React Router <Link> — accepts 'to' prop
<Button as={Link} to="/checkout" variant="primary">
  Proceed to Checkout
</Button>

// ✅ TypeScript ERROR: 'href' doesn't exist on 'button'
<Button href="/oops">Wrong</Button>

// ✅ TypeScript ERROR: 'to' doesn't exist on 'a'
<Button as="a" to="/oops">Also Wrong</Button>
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When would you avoid the `as` prop pattern?"  
*Senior Answer:* When the visual or behavioral differences between the element types are significant enough that they should be separate components. For example, `<Button>` and `<LinkButton>` might share styles, but their click handling, accessibility roles, and keyboard behaviors differ substantially. Using `as` for these creates a maintenance burden where you're constantly checking `if (isLink) { ... } else { ... }` inside the component. The rule of thumb: use `as` for **cosmetic element swaps** (div → section, span → label), not for fundamentally different interaction paradigms.

---

## 5. Provider Pattern & Module Boundaries

### Q7: How do you architect feature module boundaries in a large React application using the Provider pattern and barrel exports?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Module Boundaries` `Provider` `Barrel Exports` `Encapsulation`

**Answer:**

In large-scale React applications, feature modules must have **clear public APIs** — just like microservices have contracts. The Provider pattern combined with barrel exports (`index.ts`) creates strict module boundaries.

```text
src/
├── features/
│   ├── checkout/
│   │   ├── components/
│   │   │   ├── CheckoutForm.tsx          ← internal
│   │   │   ├── PaymentMethodSelector.tsx  ← internal
│   │   │   └── OrderSummary.tsx          ← internal
│   │   ├── hooks/
│   │   │   ├── useCheckout.ts            ← internal
│   │   │   └── usePaymentValidation.ts   ← internal
│   │   ├── context/
│   │   │   └── CheckoutProvider.tsx       ← internal
│   │   ├── api/
│   │   │   └── checkoutApi.ts            ← internal
│   │   ├── types.ts                      ← exported types
│   │   └── index.ts                      ← PUBLIC API (barrel)
│   │
│   └── cart/
│       ├── ...
│       └── index.ts                      ← PUBLIC API
│
├── shared/
│   ├── ui/                               ← Design system primitives
│   └── lib/                              ← Shared utilities
```

**The barrel export (`index.ts`) IS the module's public API:**
```tsx
// features/checkout/index.ts — ONLY these are importable from outside
export { CheckoutProvider } from './context/CheckoutProvider';
export { CheckoutPage } from './components/CheckoutPage';
export type { CheckoutConfig, PaymentMethod } from './types';

// Everything else is INTERNAL — enforced by eslint-plugin-boundaries
```

**ESLint enforcement (eslint-plugin-boundaries):**
```json
{
  "rules": {
    "boundaries/element-types": [2, {
      "default": "disallow",
      "rules": [
        {
          "from": "features",
          "allow": ["shared"],
          "disallow": ["features"],
          "message": "Features cannot import from other features directly. Use events or shared APIs."
        }
      ]
    }]
  }
}
```

**Cross-feature communication via events (not direct imports):**
```tsx
// shared/lib/eventBus.ts
type EventMap = {
  'cart:item-added': { productId: string; quantity: number };
  'checkout:completed': { orderId: string };
  'auth:session-expired': void;
};

class TypedEventBus {
  private emitter = new EventTarget();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail);
    this.emitter.addEventListener(event, listener);
    return () => this.emitter.removeEventListener(event, listener);
  }
}

export const eventBus = new TypedEventBus();
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you prevent developers from bypassing the barrel export and importing internal files directly?"  
*Senior Answer:* Three layers: (1) **ESLint rules** (`eslint-plugin-boundaries` or `eslint-plugin-import/no-internal-modules`) that error on deep imports. (2) **TypeScript `paths` configuration** that only exposes `@features/checkout` pointing to `index.ts`. (3) **CI checks** that block PRs with violations. The cultural aspect is equally important — include this in your team's Architecture Decision Record (ADR) and onboarding docs.

---

### Q8: How do you handle state initialization and cleanup for feature-level Providers to prevent memory leaks?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Provider` `Memory Leaks` `Cleanup`

**Answer:**

Feature providers often set up subscriptions, WebSocket connections, or timers on mount. Failing to clean these up causes memory leaks — especially in SPAs where route changes unmount entire feature trees.

```tsx
// ❌ LEAKY: Provider without cleanup
const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    // WebSocket connection opened on mount
    const ws = new WebSocket('wss://api.example.com/metrics');
    ws.onmessage = (event) => {
      setMetrics(JSON.parse(event.data)); // ← Still calling setState after unmount!
    };
    // ❌ Missing cleanup! Socket stays open when user navigates away
  }, []);

  return (
    <DashboardContext.Provider value={{ metrics }}>
      {children}
    </DashboardContext.Provider>
  );
};

// ✅ CLEAN: Provider with proper cleanup
const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const ws = new WebSocket('wss://api.example.com/metrics');

    ws.onmessage = (event) => {
      if (!abortController.signal.aborted) {
        setMetrics(JSON.parse(event.data));
      }
    };

    ws.onerror = (error) => {
      console.error('Dashboard WebSocket error:', error);
    };

    // ✅ Cleanup: close socket and signal abort on unmount
    return () => {
      abortController.abort();
      ws.close(1000, 'Component unmounted');
    };
  }, []);

  return (
    <DashboardContext.Provider value={{ metrics }}>
      {children}
    </DashboardContext.Provider>
  );
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "In React 18 Strict Mode, effects run twice in development. How does this affect your WebSocket setup?"  
*Senior Answer:* In Strict Mode, React intentionally mounts → unmounts → remounts components to surface cleanup issues. With WebSockets, this means two connections open, the first gets cleaned up, and the second remains. This is actually **desired behavior** — it validates that your cleanup works correctly. If your code crashes or leaks during this cycle, you have a bug. The key is that your cleanup function must be idempotent: calling `ws.close()` on an already-closed socket should not throw.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: What's the difference between "controlled" and "uncontrolled" compound components?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Compound Components`

**Answer:**
- **Uncontrolled:** The compound component manages its own state internally (e.g., `<Accordion>` tracks which panel is open). The consumer just renders children.
- **Controlled:** The consumer passes state and handlers in (e.g., `<Accordion activeIndex={2} onToggle={setActiveIndex}>`). This gives the consumer full control over behavior.
- **Best practice:** Support both via the "state reducer" pattern — internal state by default, but allow the consumer to override via props.

---

### Q10: Why does `React.memo` fail when you pass an inline callback or object literal as a prop?

**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `QuickFire` `React.memo` `Reference Equality`

**Answer:**
`React.memo` performs a shallow comparison of props. Inline arrow functions (`() => {}`) and object literals (`{{ color: 'red' }}`) create **new references** on every parent render, so the shallow comparison always returns `false`, defeating memoization entirely.

```tsx
// ❌ Breaks React.memo — new function reference every render
<MemoizedChild onClick={() => handleClick(item.id)} />

// ✅ Stable reference via useCallback
const handleItemClick = useCallback(() => handleClick(item.id), [item.id]);
<MemoizedChild onClick={handleItemClick} />

// ❌ Breaks React.memo — new object reference every render
<MemoizedChild style={{ color: 'red' }} />

// ✅ Stable reference via useMemo or module-level constant
const style = useMemo(() => ({ color: 'red' }), []);
<MemoizedChild style={style} />
```

---

### Q11: What's the "Prop Getter" pattern and why do headless UI libraries use it?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Headless UI` `Prop Getters`

**Answer:**
Prop getters are functions (like `getInputProps()`, `getMenuProps()`) that return an object of props meant to be spread onto a DOM element. They bundle together event handlers, ARIA attributes, refs, and accessibility metadata in a single call.

**Why libraries use this over direct state exposure:**
1. **Encapsulation** — the consumer doesn't need to know which 8 ARIA attributes a combobox input needs.
2. **Composability** — consumers can merge their own props: `{...getInputProps(), className: 'my-custom-input'}`.
3. **Forward compatibility** — the library can add new ARIA attributes or event handlers internally without breaking the consumer's code.

---

### Q12: You have a design system `<Card>` component. A product team wants it to sometimes render as an `<article>`, sometimes as a `<section>`, and sometimes as a `<div>`. How do you solve this?

**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `Polymorphic` `Design System`

**Answer:**
Use the Polymorphic Component pattern with the `as` prop:

```tsx
<Card as="article" className="blog-post-card">...</Card>
<Card as="section" className="dashboard-section">...</Card>
<Card>...</Card>  {/* defaults to <div> */}
```

The `as` prop accepts any valid HTML element or React component and renders accordingly, while forwarding all remaining props to the underlying element. See Q6 for the full type-safe implementation.

---

### Q13: A junior developer nests two compound component providers of the same type. What breaks?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `QuickFire` `Gotcha` `Context`

**Answer:**
The inner provider **shadows** the outer one. Any `useContext(SomeContext)` call inside the inner tree will receive the inner provider's value, completely ignoring the outer provider. This is often unintentional — for example, nesting two `<Accordion>` components where each has its own `AccordionContext` provider. The inner accordion's panels would correctly reference their own accordion, but if a developer accidentally moves a panel from the outer accordion into the inner one, it silently breaks because it now reads the wrong context.

**Fix:** Use unique context instances per compound component instance, or add a `debugId` to providers so you can trace unexpected shadowing in DevTools.

---

### Q14: What is the "Slots" pattern, and how does it compare to Compound Components?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Slots` `Component API`

**Answer:**
The Slots pattern (popularized by Vue and Radix UI) uses named props to accept React elements for specific "slots" in a layout:

```tsx
// Slots pattern
<Card
  header={<h2>Title</h2>}
  media={<img src="..." />}
  actions={<Button>Save</Button>}
/>

// vs Compound Components
<Card>
  <Card.Header><h2>Title</h2></Card.Header>
  <Card.Media><img src="..." /></Card.Media>
  <Card.Actions><Button>Save</Button></Card.Actions>
</Card>
```

**Key difference:** Slots enforce a fixed structure (the parent decides slot positions). Compound Components give consumers layout flexibility (they can reorder, omit, or repeat sub-components). Choose Slots for strict layouts, Compound Components for flexible composition.
