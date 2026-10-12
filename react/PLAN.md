# 📋 React Interview Prep — Master Plan

> **Goal:** Create a comprehensive, section-wise React interview Q&A guide aligned with the [study guide](file:///Users/abhineshgour/learning-space/abhi-agy/react-learning/doc-guide/00-table-of-contents.md). Each file covers the most asked questions, practical coding traps, output-prediction challenges, and senior-level gotchas sourced from real interview patterns.

---

## 🎯 Design Principles

Every file follows this format for each question:

```
### Q: [Question]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior

**Answer:**
[Concise explanation with code examples]

**⚠️ Gotcha / Follow-up:**
[What the interviewer might probe deeper on]
```

**Question types included per section:**
- 📖 **Conceptual** — "Explain X", "Compare X vs Y"
- 💻 **Coding** — "Write a hook that...", "Refactor this to..."
- 🧩 **Output Prediction** — "What does this print? Why?"
- 🐛 **Debug & Fix** — "This code has a bug. Find it."
- 🏗️ **Architecture / System Design** — "How would you structure..."

---

## ✅ Files To Create

---

### 📄 `01-fundamentals-qa.md` — React Fundamentals (15-18 Questions)

**Sections:**
1. **React Core Concepts**
   - What is React? Library vs Framework distinction
   - What is the Virtual DOM and how does reconciliation work? (Diffing algorithm complexity)
   - What is JSX? What does it compile to under the hood?
   - 🧩 Output: What happens if you return `undefined` vs `null` from a component?

2. **Components & Rendering**
   - Functional vs Class components — differences & when classes are still needed
   - What triggers a re-render? (State change, parent re-render, context change)
   - 🐛 Debug: Component renders but DOM doesn't update — why?
   - What is React Fiber? Why was it introduced?

3. **Props**
   - Props are read-only — what happens if you mutate them?
   - 🧩 Output: What is `children` prop? What types can it accept?
   - Explain prop drilling and why it's problematic
   - How does `defaultProps` work? Is it deprecated?

4. **Events**
   - How does React's Synthetic Event system work vs native DOM events?
   - Why does React use event delegation? Where does it attach listeners?
   - 🧩 Output: `event.target` vs `event.currentTarget` — what's the difference?

5. **Conditional Rendering & Lists**
   - Why does React need `key` props on list items? What's the reconciliation impact?
   - 🐛 Bug: Using array index as key — when does this break and why?
   - 🧩 Output: What happens if two sibling elements have the same key?
   - Short-circuit rendering gotchas: `{count && <Component />}` when count is 0

6. **Fragments & Strict Mode**
   - Why does `<React.Fragment>` exist? When would you use `<>` vs `<Fragment key={...}>`?
   - What does StrictMode do? Why do effects run twice in development?

---

### 📄 `02-state-and-lifecycle-qa.md` — State & Lifecycle (18-22 Questions)

**Sections:**
1. **useState Deep Dive**
   - Is `setState` synchronous or asynchronous? Explain React's batching.
   - 🧩 Output: What does `console.log(count)` show immediately after `setCount(count + 1)`? Why?
   - 🧩 Output: Triple `setCount(count + 1)` vs triple `setCount(prev => prev + 1)` — final value?
   - What is lazy initialization? When MUST you use it? (localStorage example)
   - 🐛 Bug: State update not reflecting — mutating object in place

2. **Immutability & State Updates**
   - Why must state be treated immutably? How does React detect changes?
   - 🐛 Debug: `setState({...obj})` works but `obj.name = 'new'; setState(obj)` doesn't
   - Deep nested state updates — spread operator pain vs Immer
   - 🧩 Output: `const [arr, setArr] = useState([1,2,3]); arr.push(4); setArr(arr);` — what happens?
   - Array mutation table: which methods are safe (`map`, `filter`) vs dangerous (`push`, `splice`)

3. **Component Lifecycle Model**
   - Mount → Update → Unmount — map to hooks
   - When does React "commit" to the DOM vs just "render"?
   - What are "render" and "commit" phases in React Fiber?

4. **useEffect Mastery**
   - What is useEffect's mental model? (Synchronization, NOT lifecycle)
   - 🧩 Output: Dependency array `[]` vs `[dep]` vs no array — execution order?
   - 🐛 Bug: Infinite loop — `useEffect` with object dependency
   - Race condition fix — AbortController vs boolean flag pattern
   - 🧩 Output: In what order do effects, cleanup, and renders execute?
   - When should you NOT use useEffect? (Derived state anti-pattern)

5. **useEffect vs useLayoutEffect**
   - When does each run relative to browser paint?
   - 🐛 Bug: Tooltip position flickers on mount — which hook fixes it?
   - Performance implications of blocking the paint with useLayoutEffect

---

### 📄 `03-hooks-deep-dive-qa.md` — All Hooks (20-25 Questions)

**Sections:**
1. **Rules of Hooks**
   - Why can't you call hooks inside conditions, loops, or nested functions?
   - 🧩 Output: What error occurs if you conditionally call useState?
   - How does React internally track which useState call maps to which state value?

2. **useReducer**
   - When should you use useReducer over useState?
   - 💻 Code: Implement a shopping cart reducer with ADD, REMOVE, UPDATE_QTY, CLEAR actions
   - How do you test a reducer function in isolation (without React)?

3. **useRef**
   - Two use cases: DOM reference vs mutable instance variable
   - 🧩 Output: Does updating `ref.current` trigger a re-render?
   - 🐛 Bug: `ref.current` is null inside useEffect — why? (Timing issue)
   - When would you use useRef instead of useState for a timer ID?

4. **useContext**
   - Performance trap: Why does changing context re-render ALL consumers?
   - 🏗️ Architecture: How to split contexts to optimize re-renders
   - 💻 Code: Build a type-safe useAuth hook with context

5. **Performance Hooks (useMemo, useCallback)**
   - 🧩 Output: Is `useCallback(fn, deps)` the same as `useMemo(() => fn, deps)`?
   - When does useMemo make performance WORSE?
   - 🐛 Bug: useCallback with stale closure — dependency on `count` but empty deps

6. **Concurrency Hooks (useTransition, useDeferredValue)**
   - What problem do these solve that debouncing doesn't?
   - 💻 Scenario: Search input filtering 10,000 items — how to keep input responsive?

7. **React 19 Hooks**
   - What is `useActionState`? How does it differ from manual form state management?
   - What is `useOptimistic`? Walk through a "Like" button example
   - What does the `use()` API do? How does it interact with Suspense?

8. **Custom Hooks**
   - 💻 Code: Implement `useDebounce`, `useLocalStorage`, `usePrevious`
   - What's the naming convention? Why must it start with `use`?
   - Can a custom hook return JSX? Should it?

---

### 📄 `04-advanced-patterns-qa.md` — Advanced Patterns (15-18 Questions)

**Sections:**
1. **Higher-Order Components (HOCs)**
   - What is a HOC? Explain the "enhancer" pattern
   - What are common problems? (Prop collision, wrapper hell, ref forwarding)
   - Are HOCs still relevant? When would you use one over a custom hook?

2. **Render Props**
   - What problem do render props solve?
   - 🧩 Output: Is children-as-a-function a render prop pattern?
   - Render props vs hooks — when does each shine?

3. **Compound Components**
   - 💻 Code: Build a compound `<Tabs>` component with Context
   - Why is this pattern superior to passing config arrays as props?
   - How does `shadcn/ui` use compound component patterns?

4. **Controlled vs Uncontrolled**
   - Decision matrix: when to use each
   - 🐛 Bug: Switching from uncontrolled to controlled input — React warning

5. **Portals**
   - What problem do portals solve? (CSS overflow, z-index)
   - 🧩 Gotcha: Event bubbling through portals — does it follow DOM tree or React tree?

6. **Error Boundaries**
   - Why can't functional components be error boundaries (as of React 19)?
   - What errors do error boundaries NOT catch? (Event handlers, async code, SSR)
   - 💻 Code: Implement a reusable error boundary with reset functionality

7. **Suspense & Lazy Loading**
   - How does `React.lazy()` work under the hood? (Dynamic `import()`)
   - What is the waterfall problem with over-splitting?
   - How does Suspense work with data fetching? (React 19 `use()` API)

---

### 📄 `05-state-management-qa.md` — State Management (15-18 Questions)

**Sections:**
1. **Architecture & Decision Making**
   - The 4 categories of state: UI, Server, URL, Global Client
   - 🏗️ Architecture: "I have a shopping cart, user session, API data, and filter state. Where does each live?"
   - When is global state actually needed? Decision tree
   - Why storing server data in Redux/Zustand is an anti-pattern

2. **Context API**
   - Performance traps: every consumer re-renders on any provider value change
   - 💻 Code: Split state context from dispatch context pattern
   - Is Context a "state management" solution? (Debate)

3. **Redux Toolkit**
   - Core flow: Store → Slice → Action → Reducer → Selector
   - How does Immer work inside RTK? Can you "mutate" state directly?
   - 💻 Code: Write a `createAsyncThunk` for user login with loading/error states
   - What is RTK Query? When would you use it over TanStack Query?
   - Redux DevTools: time-travel debugging explained

4. **Zustand**
   - How does Zustand avoid the Provider/wrapper pattern?
   - How do selectors prevent unnecessary re-renders?
   - 💻 Code: Create a cart store with persist middleware
   - Zustand vs Redux: when to pick each (team size, complexity, debugging needs)

5. **Jotai / Atomic State**
   - What is the atomic model? How do derived atoms work?
   - When would you choose Jotai over Zustand?

6. **Comparison & Trade-offs**
   - 📊 Table: Context vs Redux vs Zustand vs Jotai — bundle size, boilerplate, performance, use case
   - "Which state management library would you recommend for a new project and why?"

---

### 📄 `06-routing-qa.md` — Routing (12-15 Questions)

**Sections:**
1. **Core Routing Concepts**
   - How does client-side routing work under the hood? (History API)
   - `<Link>` vs `<NavLink>` — when to use each?
   - 🧩 Output: What is the difference between `navigate('/path')` and `navigate('/path', { replace: true })`?

2. **Dynamic & Nested Routes**
   - How does `<Outlet>` work in nested route layouts?
   - 🧩 Output: What is an index route?
   - How do you pass data between routes? (URL params vs state vs search params)

3. **Route Protection**
   - 💻 Code: Implement a `ProtectedRoute` wrapper
   - 💻 Code: Role-based route guard (admin vs user)
   - Redirect-after-login pattern using `location.state.from`

4. **React Router v6.4+ Data APIs**
   - What are loaders and actions? How do they change data fetching patterns?
   - How does `useNavigation()` help with global loading states?
   - 💻 Code: Route configuration with `createBrowserRouter`

5. **Advanced Patterns**
   - Route-based code splitting with `React.lazy` + `Suspense`
   - Catch-all 404 routes
   - URL search params as state (`useSearchParams`)

---

### 📄 `07-forms-qa.md` — Forms & Validation (15-18 Questions)

**Sections:**
1. **Controlled vs Uncontrolled**
   - Performance implications of controlled inputs on large forms
   - 🐛 Bug: "A component is changing an uncontrolled input to be controlled" warning
   - When must inputs be uncontrolled? (File inputs)

2. **Validation Strategies**
   - On-submit vs on-blur vs on-change — trade-offs for each
   - 💻 Code: Manual validation with error state and accessible error messages
   - Why is `aria-invalid` and `aria-describedby` important?

3. **React Hook Form**
   - Why is RHF faster than native controlled forms? (Uncontrolled refs under the hood)
   - 💻 Code: Registration form with `register`, `handleSubmit`, `formState`
   - How does `watch` work? When would you use it vs `getValues`?
   - 💻 Code: Multi-step wizard form with per-step validation using `trigger()`

4. **Schema Validation (Zod + RHF)**
   - Why schema-based validation? (Single source of truth, TypeScript inference)
   - 💻 Code: Zod schema with password confirmation `.refine()`
   - Can you share the same Zod schema between frontend and backend?

5. **Formik vs RHF**
   - Key differences: controlled (Formik) vs uncontrolled (RHF)
   - Performance comparison on a 50-field form
   - Which should you use for new projects?

---

### 📄 `08-data-fetching-qa.md` — Data Fetching (15-18 Questions)

**Sections:**
1. **Fetch API Gotchas**
   - 🐛 Bug: `fetch()` does NOT reject on 404/500! How do you handle HTTP errors?
   - What is AbortController? Why is it critical for cleanup?
   - 🧩 Output: What happens if you `setState` after a component unmounts?

2. **Axios vs Fetch**
   - Comparison table: JSON handling, error handling, interceptors, timeout
   - 💻 Code: Axios instance with request/response interceptors for JWT token refresh

3. **TanStack Query (React Query)**
   - What problems does it solve that manual useEffect+fetch doesn't?
   - Explain: caching, deduplication, background refetching, stale-while-revalidate
   - What are query keys? How does cache invalidation work?
   - 💻 Code: Optimistic update with rollback on error
   - 💻 Code: Infinite scroll with `useInfiniteQuery`
   - `staleTime` vs `gcTime` (formerly `cacheTime`) — what's the difference?
   - When would you use `enabled: false` in useQuery?

4. **SWR vs TanStack Query**
   - Feature comparison: mutations, DevTools, offline support
   - When is SWR the better choice? (Next.js ecosystem)

5. **API Architecture**
   - 🏗️ Architecture: Service module pattern (apiClient → domainApi → custom hook)
   - Why separate data fetching logic from component rendering logic?

---

### 📄 `09-styling-qa.md` — Styling (10-12 Questions)

**Sections:**
1. **CSS Modules vs CSS-in-JS vs Utility-First**
   - Trade-off comparison table: scoping, performance, DX, bundle impact
   - Why is CSS-in-JS (Styled Components, Emotion) declining in popularity?
   - What is zero-runtime CSS? (CSS Modules, Tailwind, StyleX)

2. **Tailwind CSS in React**
   - How do you handle conditional classes? (`clsx`, `tailwind-merge`, `cn()` helper)
   - How does PurgeCSS / JIT mode keep the bundle tiny?
   - 💻 Code: Build a variant-driven Button component with `cn()` utility

3. **Theming & Dark Mode**
   - CSS Variables approach vs ThemeProvider approach — which is better?
   - 💻 Code: Dark mode toggle with system preference detection

---

### 📄 `10-testing-qa.md` — Testing (12-15 Questions)

**Sections:**
1. **Testing Philosophy**
   - Testing Trophy vs Testing Pyramid — which suits React?
   - "Test user behavior, not implementation details" — explain with examples
   - What should you NOT test in React?

2. **React Testing Library**
   - Query priority: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
   - `getBy` vs `queryBy` vs `findBy` — when to use each
   - `userEvent` vs `fireEvent` — why userEvent is always preferred
   - 💻 Code: Test a login form submission with mocked callback

3. **Mocking**
   - 💻 Code: Setup MSW (Mock Service Worker) handlers for API mocking
   - How do you test components that depend on React Router? (MemoryRouter)
   - How do you test components wrapped in Context providers? (Custom render utility)
   - 💻 Code: Test a custom hook using `renderHook`

4. **E2E & Playwright**
   - When do you write E2E tests vs integration tests?
   - 💻 Code: Write a Playwright test for login → dashboard → logout flow

---

### 📄 `11-performance-qa.md` — Performance Optimization (15-18 Questions)

**Sections:**
1. **React Rendering Model**
   - Trigger → Render → Commit pipeline — explain each phase
   - Does a re-render always mean a DOM update? (No! Diffing still applies)
   - 🧩 Output: Parent re-renders — do ALL children re-render? (Yes, by default!)

2. **Memoization Deep Dive**
   - `React.memo` — when it works vs when it's useless
   - 🐛 Bug: `React.memo` child still re-renders — because parent passes inline `onClick={() => ...}`
   - When does `useMemo` make performance WORSE? (Trivial calculations, GC pressure)
   - `useCallback` stale closure trap — dependency on changing state
   - 💻 Scenario: "Your dashboard has 200 cards. Clicking one triggers re-render of all 200. Fix it."

3. **Concurrent Features**
   - useTransition vs useDeferredValue vs debouncing — comparison table
   - 💻 Scenario: Search input + heavy filtered list — systematic optimization steps

4. **Virtualization**
   - Why does the DOM choke on 10,000+ items?
   - `@tanstack/react-virtual` vs `react-window` — when to use each
   - Dynamic height rows — the hard problem of virtualization

5. **Code Splitting & Bundle Optimization**
   - Route-level vs component-level splitting — when to use each
   - The waterfall anti-pattern: over-splitting into micro-chunks
   - Bundle analysis with `rollup-plugin-visualizer`
   - Tree-shaking: named imports vs default imports for lodash

6. **Debugging Methodology**
   - Step-by-step: "The page is slow. Walk me through how you diagnose and fix it."
   - React DevTools Profiler: flamegraph, ranked chart, "why did this render?"

---

### 📄 `12-typescript-react-qa.md` — TypeScript + React (12-15 Questions)

**Sections:**
1. **Typing Components**
   - `interface` vs `type` for props — when to use each
   - Typing `children`: `ReactNode` vs `ReactElement` vs `PropsWithChildren`
   - 🧩 Output: What's the difference between `React.FC<Props>` and `function Component(props: Props)`?

2. **Typing Hooks**
   - 💻 Code: Type a `useState` that starts as `null` but becomes a `User` object
   - 💻 Code: Type a `useRef` for an HTML input element
   - 💻 Code: Type a `useReducer` with discriminated union actions

3. **Typing Events**
   - Event types cheat sheet: `ChangeEvent`, `FormEvent`, `MouseEvent`, `KeyboardEvent`
   - Why do inline handlers auto-infer types but standalone handlers need explicit typing?

4. **Advanced Patterns**
   - 💻 Code: Generic component `<List<T>>` that renders any typed array
   - 💻 Code: Polymorphic `as` prop (render as `<div>`, `<button>`, or `<a>`)
   - 💻 Code: Discriminated union props — different required props based on variant
   - Exhaustive switch with `never` — why it catches missing union branches at compile time

5. **Utility Types**
   - `ComponentPropsWithoutRef<'button'>` — extending native HTML attributes
   - `Omit<Props, 'children'>`, `Pick`, `Partial`, `Required`

---

### 📄 `13-real-world-patterns-qa.md` — Production Architecture (12-15 Questions)

**Sections:**
1. **Project Structure**
   - Feature-based vs type-based folder structure — pros/cons
   - 🏗️ Architecture: "Structure a React app with auth, dashboard, billing, and shared UI"
   - Barrel exports (`index.ts`) — benefits and pitfalls (circular dependency trap)

2. **Authentication**
   - 💻 Code: JWT access + refresh token flow with Axios interceptors
   - Where should you store tokens? (localStorage vs httpOnly cookie — security trade-offs)
   - Auto-logout on idle / token expiry pattern
   - "How do you prevent the flash of unauthenticated content on protected routes?"

3. **Error Handling**
   - Layered error boundaries strategy (per-widget, not just root)
   - Global API error interception with toast notifications
   - 🏗️ Architecture: Centralized error handling across the entire app

4. **Environment & Deployment**
   - Vite `VITE_` prefix rule — why non-prefixed vars are hidden from client code
   - SPA routing on Netlify/Vercel — the `_redirects` / `vercel.json` rewrite rule
   - Docker multi-stage build for React production apps

5. **Code Quality**
   - ESLint + Prettier + Husky + lint-staged pipeline
   - Why pre-commit hooks matter in team environments

---

### 📄 `14-ecosystem-qa.md` — Ecosystem & Tooling (10-12 Questions)

**Sections:**
1. **Build Tools**
   - Why is Vite faster than Webpack/CRA? (Native ESM, esbuild, HMR)
   - When would you use Next.js instead of plain Vite React?
   - CRA is deprecated — what do you recommend for new projects?

2. **UI Libraries**
   - shadcn/ui: Why copy-paste > node_modules for design systems?
   - MUI vs Ant Design vs Mantine — decision framework
   - "If starting a new SaaS product, which UI library would you choose and why?"

3. **Animation**
   - Framer Motion: `AnimatePresence` for exit animations — why is this hard without a library?
   - `@formkit/auto-animate` — zero-config list transitions

4. **Essential Libraries**
   - TanStack Table: headless vs full UI table libraries — trade-offs
   - `date-fns` vs `dayjs` vs `moment` — why moment is dead
   - `@dnd-kit` vs `react-beautiful-dnd` — why the latter is deprecated

---

### 📄 `15-behavioral-and-system-design-qa.md` — Scenario & Design Questions (10-15 Questions)

**Sections:**
1. **Debugging Scenarios**
   - "The page is blank after deployment but works locally" — troubleshoot steps
   - "A component re-renders 30 times per second" — systematic diagnosis
   - "Users report stale data after mutations" — cache invalidation debugging

2. **System Design (Frontend)**
   - 🏗️ Design: "Build a real-time chat application with React"
   - 🏗️ Design: "Architect a dashboard with 15 widgets that independently fetch data"
   - 🏗️ Design: "Design an infinite scroll feed like Twitter/X"
   - 🏗️ Design: "Build a multi-tenant SaaS app with role-based permissions"

3. **Code Review Scenarios**
   - "Review this PR that uses useEffect for derived state — what's wrong?"
   - "This component has 500 lines. How would you refactor it?"
   - "The team is debating Redux vs Zustand. How do you make the decision?"

4. **Behavioral / Soft Skill Questions**
   - "Tell me about a performance bug you found and fixed in a React app"
   - "How do you decide when to use a library vs build your own?"
   - "How do you introduce new patterns to a team resistant to change?"

---

## 📐 Standards for Each File

```
# Title

> One-line description

---

## Table of Contents (linked)

## Section 1
  ### Q: [Question text]
  **Difficulty:** 🟢 | 🟡 | 🔴
  **Answer:** [Explanation with code]
  **⚠️ Follow-up / Gotcha:** [Deeper probe]

## 🎯 Quick-Fire Round
  - Rapid yes/no or short-answer questions (10-15 per file)

---

> **Next:** [Link to next file →]
```

**Formatting conventions:**
- 🟢 Junior (0-1 years) — foundational knowledge
- 🟡 Mid-level (2-4 years) — practical patterns & trade-offs
- 🔴 Senior (5+ years) — architecture, debugging methodology, teaching ability
- 💻 Coding questions with copy-paste solutions
- 🧩 Output prediction traps
- 🐛 Bug-finding / debug challenges
- 🏗️ System design / architecture questions
- ⚠️ Gotchas and interviewer follow-up traps

---

## 📊 Estimated Output

| Metric | Estimate |
|--------|----------|
| Total files | 16 (including this plan) |
| Total questions | ~220-250 |
| Coding exercises | ~50+ |
| Output prediction traps | ~30+ |
| System design scenarios | ~10-15 |
| Estimated study time | 6-8 hours (full guide) |

---

## 🚀 Execution Order

1. `01-fundamentals-qa.md`
2. `02-state-and-lifecycle-qa.md`
3. `03-hooks-deep-dive-qa.md`
4. `04-advanced-patterns-qa.md`
5. `05-state-management-qa.md`
6. `06-routing-qa.md`
7. `07-forms-qa.md`
8. `08-data-fetching-qa.md`
9. `09-styling-qa.md`
10. `10-testing-qa.md`
11. `11-performance-qa.md`
12. `12-typescript-react-qa.md`
13. `13-real-world-patterns-qa.md`
14. `14-ecosystem-qa.md`
15. `15-behavioral-and-system-design-qa.md`

---

> **Ready?** Review this plan, suggest any changes, and say **"Proceed"** to start generating all files.
