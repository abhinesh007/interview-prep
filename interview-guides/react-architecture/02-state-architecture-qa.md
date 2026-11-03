# 02 — State Architecture & Management

> The state decision tree, Context performance traps, Server vs Client state boundaries, derived state anti-patterns, URL as state, and choosing between Zustand, Redux Toolkit, Jotai, and React Context.

---

## 📑 Table of Contents
1. [The State Decision Tree](#1-the-state-decision-tree)
2. [Server State vs Client State](#2-server-state-vs-client-state)
3. [Context Performance Traps](#3-context-performance-traps)
4. [Derived State Anti-Pattern](#4-derived-state-anti-pattern)
5. [URL as State](#5-url-as-state)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The State Decision Tree

### Q1: Walk me through your decision tree for choosing a state management strategy in a React application.

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `State Management` `Architecture` `Trade-offs`

**Answer:**

The key mental model is a **cost ladder** — start at the simplest, cheapest option and only escalate when the simpler option creates real pain. Never start with Redux.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     THE STATE DECISION TREE                              │
│                                                                          │
│  "Where does this state originate, and who needs it?"                   │
│                                                                          │
│  ┌─────────────────────────────┐                                        │
│  │ Does it come from a server? │──YES──► USE SERVER STATE LIBRARY       │
│  │ (API, DB, external source)  │         TanStack Query / RTK Query     │
│  └──────────┬──────────────────┘         SWR / Apollo                   │
│             NO                                                           │
│             ▼                                                            │
│  ┌─────────────────────────────┐                                        │
│  │ Is it used by only 1-2     │──YES──► useState / useReducer           │
│  │ nearby components?          │         (Local state, lift if needed)   │
│  └──────────┬──────────────────┘                                        │
│             NO                                                           │
│             ▼                                                            │
│  ┌─────────────────────────────┐                                        │
│  │ Should it survive in the   │──YES──► URL Search Params               │
│  │ URL? (filters, pagination)  │         useSearchParams()              │
│  └──────────┬──────────────────┘                                        │
│             NO                                                           │
│             ▼                                                            │
│  ┌─────────────────────────────┐                                        │
│  │ Is it low-frequency, read- │──YES──► React Context                   │
│  │ heavy? (theme, auth, locale)│         (Split by concern)             │
│  └──────────┬──────────────────┘                                        │
│             NO                                                           │
│             ▼                                                            │
│  ┌─────────────────────────────┐                                        │
│  │ Is it cross-cutting UI      │──YES──► Zustand / Jotai               │
│  │ state? (sidebar, modals,   │         (Minimal boilerplate,           │
│  │ workspace, multi-step form) │          selective subscriptions)       │
│  └──────────┬──────────────────┘                                        │
│             NO                                                           │
│             ▼                                                            │
│  ┌─────────────────────────────┐                                        │
│  │ Complex domain with strict  │──YES──► Redux Toolkit                  │
│  │ action tracing, middleware, │         (Structured conventions,        │
│  │ large team standardization? │          DevTools, time-travel debug)   │
│  └─────────────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Real-World Mapping:**

| State Category | Example | Recommended Tool |
|---|---|---|
| **Server/Remote** | User profile, product list, order history | TanStack Query, RTK Query |
| **Local Component** | Form input, toggle, dropdown open | `useState`, `useReducer` |
| **URL State** | Filters, sort order, pagination, tab selection | `useSearchParams` |
| **App-Wide Infrequent** | Auth session, theme, locale, feature flags | React Context (split) |
| **App-Wide Frequent** | Sidebar state, active workspace, notification queue | Zustand, Jotai |
| **Complex Domain** | Financial trading platform state, collaborative editor | Redux Toolkit |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "A teammate argues that putting everything in Redux makes the app 'predictable.' How do you respond?"  
*Senior Answer:* Predictability comes from **clear state ownership**, not from centralizing everything. Putting server data in Redux means you're manually reimplementing caching, deduplication, background refetching, and optimistic updates that TanStack Query handles out of the box. You end up with thousands of lines of reducer code that's essentially a broken HTTP cache. The "single store" argument conflates "single source of truth" with "single location for all data" — they're not the same thing.

---

### Q2: Compare Zustand vs Redux Toolkit vs Jotai — when would you choose each?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `Zustand` `Redux` `Jotai` `Comparison`

**Answer:**

| Criteria | **Zustand** | **Redux Toolkit** | **Jotai** |
|---|---|---|---|
| **Bundle Size** | ~1KB | ~11KB (+ immer) | ~3KB |
| **Boilerplate** | Minimal (single `create` call) | Moderate (slices, actions, store setup) | Minimal (atoms) |
| **DevTools** | Via middleware | Built-in (time travel) | Via devtools atom |
| **Async** | Direct (mutate in async functions) | Via `createAsyncThunk` or RTK Query | Via async atoms |
| **Re-render Behavior** | Selector-based (only re-render on slice change) | Selector-based (`useSelector`) | Atom-based (only subscribing components) |
| **Learning Curve** | Very low | Moderate-high | Low |
| **Team Size Sweet Spot** | 1–15 developers | 15–100+ developers | 1–10 developers |
| **Best For** | Mid-size apps, rapid prototyping | Enterprise apps, strict conventions | Fine-grained reactivity, derived atoms |

**Zustand — The pragmatic choice:**
```tsx
import { create } from 'zustand';

interface SidebarStore {
  isCollapsed: boolean;
  activePanel: string | null;
  toggle: () => void;
  setActivePanel: (panel: string | null) => void;
}

const useSidebarStore = create<SidebarStore>((set) => ({
  isCollapsed: false,
  activePanel: null,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setActivePanel: (panel) => set({ activePanel: panel }),
}));

// Usage — component only re-renders when `isCollapsed` changes
const SidebarToggle = () => {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const toggle = useSidebarStore((state) => state.toggle);
  return <button onClick={toggle}>{isCollapsed ? '→' : '←'}</button>;
};
```

**Jotai — The atomic choice:**
```tsx
import { atom, useAtom, useAtomValue } from 'jotai';

// Primitive atoms
const filterAtom = atom<string>('');
const categoryAtom = atom<string>('all');

// Derived atom — automatically recomputes when dependencies change
const filteredProductsAtom = atom((get) => {
  const filter = get(filterAtom);
  const category = get(categoryAtom);
  return products.filter(
    (p) => p.name.includes(filter) && (category === 'all' || p.category === category)
  );
});

// Components subscribe to exactly what they need
const SearchBox = () => {
  const [filter, setFilter] = useAtom(filterAtom);
  return <input value={filter} onChange={(e) => setFilter(e.target.value)} />;
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why does Zustand re-render differently than React Context?"  
*Senior Answer:* React Context triggers re-renders for **all consumers** when the provider value changes — there's no built-in selector mechanism. Zustand uses `useSyncExternalStore` under the hood with a **selector function**. It only triggers a re-render if the selector's return value has changed (using `Object.is` comparison by default). This means 100 components can subscribe to a Zustand store, but if only one selector's output changes, only that one component re-renders.

---

## 2. Server State vs Client State

### Q3: Why should server data NEVER live in Redux? Explain the Server State vs Client State boundary.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `Server State` `Client State` `TanStack Query` `Architecture`

**Answer:**

Server state and client state have **fundamentally different characteristics** and require different management strategies:

```text
┌────────────────────────────┐    ┌──────────────────────────────┐
│      SERVER STATE          │    │       CLIENT STATE            │
│                            │    │                              │
│  • Persisted remotely      │    │  • Local to the browser      │
│  • Potentially stale       │    │  • Always up-to-date         │
│  • Shared across users     │    │  • Owned by this session     │
│  • Async (network latency) │    │  • Synchronous               │
│  • Needs caching strategy  │    │  • No caching needed         │
│  • Needs deduplication     │    │  • No deduplication needed   │
│                            │    │                              │
│  Examples:                 │    │  Examples:                   │
│  - User profiles           │    │  - Sidebar open/closed       │
│  - Product listings        │    │  - Modal visibility          │
│  - Order history           │    │  - Form input values         │
│  - Notifications           │    │  - Active tab                │
│  - Search results          │    │  - Theme preference          │
└────────────────────────────┘    └──────────────────────────────┘
```

**What happens when you put server data in Redux:**

```tsx
// ❌ Redux approach — you're building a broken HTTP cache
const productsSlice = createSlice({
  name: 'products',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.error = action.error.message;
        state.loading = false;
      });
  },
});

// Now you need to MANUALLY handle:
// ❌ Cache invalidation — when is this data stale?
// ❌ Background refetching — what if the data changed on the server?
// ❌ Request deduplication — 5 components requesting same data = 5 API calls?
// ❌ Optimistic updates — instant UI feedback with rollback on failure?
// ❌ Pagination / infinite scroll state
// ❌ Window focus refetching
// ❌ Retry logic with exponential backoff
```

**TanStack Query approach — all of the above is handled:**
```tsx
// ✅ TanStack Query — purpose-built for server state
const useProducts = (category: string) =>
  useQuery({
    queryKey: ['products', category],
    queryFn: () => fetchProducts(category),
    staleTime: 5 * 60 * 1000,        // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000,           // Keep in cache for 30 minutes
    refetchOnWindowFocus: true,       // Refetch when user returns to tab
    retry: 3,                         // Auto-retry failed requests
    refetchOnReconnect: true,         // Refetch after network recovery
  });

// Mutation with optimistic update
const useAddToCart = () =>
  useMutation({
    mutationFn: addToCartApi,
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']);

      // Optimistic update — instantly show the item in cart
      queryClient.setQueryData(['cart'], (old: CartItem[]) => [...old, newItem]);

      return { previousCart };  // Rollback context
    },
    onError: (err, newItem, context) => {
      // Rollback on failure
      queryClient.setQueryData(['cart'], context?.previousCart);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is there any scenario where you'd still put server data in Redux?"  
*Senior Answer:* Yes — when you need **offline-first architecture** with complex conflict resolution. Apps like collaborative document editors or field service apps (no network in remote areas) need to queue mutations locally, apply them optimistically, and reconcile with the server later. Redux with a persistence middleware (like `redux-offline`) combined with CRDT data structures can handle this. But even then, RTK Query with custom persistence middleware is often a better starting point than raw Redux.

---

### Q4: How do you architect the data layer when you have BOTH server state (TanStack Query) and global client state (Zustand) in the same app?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Data Layer` `TanStack Query` `Zustand` `Coexistence`

**Answer:**

The key principle: **Never duplicate server data into client stores.** Keep strict boundaries.

```text
┌───────────────────────────────────────────────────────────────┐
│                    REACT APPLICATION                          │
│                                                               │
│  ┌─────────────────────────────────────────────┐             │
│  │           SERVER STATE LAYER                 │             │
│  │        (TanStack Query / RTK Query)          │             │
│  │                                              │             │
│  │  • Products, Users, Orders, Notifications    │             │
│  │  • Auto-caching, dedup, background refresh   │             │
│  │  • Query keys: ['products', filters]         │             │
│  └─────────────────────────────────────────────┘             │
│                         │                                     │
│            Components consume via useQuery()                  │
│                         │                                     │
│  ┌─────────────────────────────────────────────┐             │
│  │           CLIENT STATE LAYER                 │             │
│  │           (Zustand / Jotai)                  │             │
│  │                                              │             │
│  │  • Sidebar collapsed, active workspace       │             │
│  │  • Modal stack, toast notifications          │             │
│  │  • UI preferences (grid vs list view)        │             │
│  └─────────────────────────────────────────────┘             │
│                         │                                     │
│            Components consume via useStore()                  │
│                         │                                     │
│  ┌─────────────────────────────────────────────┐             │
│  │           URL STATE                          │             │
│  │           (React Router)                     │             │
│  │                                              │             │
│  │  • Filters, pagination, sort, active tab     │             │
│  │  • Shareable, bookmarkable state             │             │
│  └─────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────┘
```

**Practical integration pattern:**
```tsx
// ✅ Clean separation: Zustand for UI state, TanStack Query for data

// Client state (Zustand)
const useUIStore = create<UIState>((set) => ({
  viewMode: 'grid' as 'grid' | 'list',
  sidebarCollapsed: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

// Server state (TanStack Query) — uses URL params for filters
const useProductList = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';

  return useQuery({
    queryKey: ['products', { category, sort }],
    queryFn: () => fetchProducts({ category, sort }),
  });
};

// Component consumes BOTH — clean separation
const ProductCatalog = () => {
  const { data: products, isLoading } = useProductList();  // Server state
  const viewMode = useUIStore((s) => s.viewMode);           // Client state

  if (isLoading) return <ProductGridSkeleton />;

  return viewMode === 'grid'
    ? <ProductGrid items={products} />
    : <ProductTable items={products} />;
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if a Zustand action needs to invalidate a TanStack Query cache? How do you bridge the two?"  
*Senior Answer:* Access the `queryClient` outside React using `const queryClient = new QueryClient()` at the module level, then pass it to both `<QueryClientProvider>` and use it inside Zustand actions: `queryClient.invalidateQueries({ queryKey: ['products'] })`. This keeps the stores decoupled — Zustand doesn't import from React Query directly, it just tells the query cache "this data is stale, refetch if anyone needs it."

---

## 3. Context Performance Traps

### Q5: Why does a single "God Context" destroy performance, and how do you fix it?

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Context` `Performance` `Re-renders`

**Answer:**

React Context has **no built-in selective subscription mechanism**. When the context value changes, **every single consumer re-renders**, even if they only use one property from the value object.

```tsx
// ❌ THE "GOD CONTEXT" — performance disaster
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  scrollPosition: number;       // ← Changes on EVERY scroll event!
  searchQuery: string;          // ← Changes on EVERY keystroke!
  locale: string;
}

const AppContext = createContext<AppState>(/* ... */);

// PROBLEM: Component only needs `theme`, but re-renders when
// scrollPosition changes (60+ times per second during scrolling!)
const ThemeToggle = () => {
  const { theme } = useContext(AppContext);  // ← Re-renders on ANY change
  return <button>{theme === 'dark' ? '☀️' : '🌙'}</button>;
};
```

**The Fix — Split by Update Frequency:**
```tsx
// ✅ SPLIT CONTEXTS by update frequency and concern

// Rarely changes — auth session, locale
const AuthContext = createContext<AuthState | null>(null);

// Rarely changes — theme preference
const ThemeContext = createContext<ThemeState>({ theme: 'light' });

// Changes moderately — sidebar, modal state
const UIContext = createContext<UIState>({ sidebarOpen: false });

// Changes frequently — SHOULD NOT BE IN CONTEXT AT ALL
// Use Zustand, Jotai, or refs for high-frequency state
const useScrollPosition = () => {
  const posRef = useRef(0);
  useEffect(() => {
    const handler = () => { posRef.current = window.scrollY; };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return posRef;
};

// Now ThemeToggle only re-renders when theme actually changes
const ThemeToggle = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>;
};
```

**Context Splitting Rules of Thumb:**

| Update Frequency | Examples | Storage |
|---|---|---|
| **Once per session** | Auth token, user profile, feature flags | AuthContext |
| **Rarely (user action)** | Theme, locale, accessibility settings | ThemeContext |
| **Occasionally** | Sidebar state, notification read status | UIContext or Zustand |
| **Frequently (typing, scroll)** | Search input, scroll position, mouse coords | Zustand, refs, or dedicated hooks |
| **Per-frame (animation)** | Animation progress, draggable position | Refs + requestAnimationFrame |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can you use `useMemo` on the context value to prevent re-renders?"  
*Senior Answer:* `useMemo` on the provider's value prevents **unnecessary provider re-renders due to parent re-renders** (when the value hasn't actually changed). But it does NOT prevent consumer re-renders when the value has genuinely changed. The common mistake is:
```tsx
// This memoizes the VALUE OBJECT reference, but if ANY property inside changes,
// ALL consumers still re-render. This only helps prevent re-renders when
// the PROVIDER's parent re-renders without changing context data.
const value = useMemo(() => ({ user, theme, sidebar }), [user, theme, sidebar]);
return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```
The real solution remains context splitting or using `useSyncExternalStore` for fine-grained subscriptions.

---

### Q6: Explain `useSyncExternalStore` and when it's the escape hatch for Context performance problems.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `useSyncExternalStore` `Performance` `External Store`

**Answer:**

`useSyncExternalStore` is a React 18 hook that safely subscribes to external stores (stores not managed by React) with **selector-based re-rendering** — something Context cannot do natively.

**When to use it:**
- You need Context-like global state but with **selector-based subscriptions** (only re-render when selected slice changes)
- You're integrating with browser APIs (`localStorage`, `matchMedia`, `navigator.onLine`)
- You're building a state library (this is how Zustand works internally)

```tsx
import { useSyncExternalStore } from 'react';

// External store with subscription model
function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    setState: (partial: Partial<T>) => {
      state = { ...state, ...partial };
      listeners.forEach((l) => l());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const appStore = createStore({
  user: null as User | null,
  theme: 'light' as 'light' | 'dark',
  sidebarOpen: false,
  notificationCount: 0,
});

// Hook with SELECTOR — only re-renders when selected value changes
function useStore<S>(selector: (state: ReturnType<typeof appStore.getState>) => S): S {
  return useSyncExternalStore(
    appStore.subscribe,
    () => selector(appStore.getState()),
    () => selector(appStore.getState()), // Server snapshot (SSR)
  );
}

// ✅ ThemeToggle ONLY re-renders when theme changes — NOT when notifications update
const ThemeToggle = () => {
  const theme = useStore((s) => s.theme);
  return <button onClick={() => appStore.setState({ theme: theme === 'dark' ? 'light' : 'dark' })}>
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>;
};

// ✅ NotificationBadge ONLY re-renders when count changes — NOT when theme updates
const NotificationBadge = () => {
  const count = useStore((s) => s.notificationCount);
  return count > 0 ? <span className="badge">{count}</span> : null;
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if your selector returns a new object reference every time?"  
*Senior Answer:* If the selector returns a new object/array reference on every call (e.g., `(s) => ({ name: s.user.name })` creates a new object each time), `useSyncExternalStore` will trigger a re-render on **every** store update because `Object.is` comparison fails for different object references. Fix: either return primitive values from selectors, or pass a custom `isEqual` function (Zustand's `useStore(selector, shallow)` does this).

---

## 4. Derived State Anti-Pattern

### Q7: What is "Derived State" and why is storing it in `useState` considered an anti-pattern?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Derived State` `Anti-Pattern` `useState`

**Answer:**

Derived state is any value that can be **entirely computed** from existing props or state. Storing it in `useState` creates synchronization bugs and unnecessary render cycles.

```tsx
// ❌ ANTI-PATTERN: Derived state in useState
const UserProfile = ({ firstName, lastName }: Props) => {
  const [fullName, setFullName] = useState(`${firstName} ${lastName}`);

  // Now you need this useEffect to keep it in sync...
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);
  // Problem 1: Extra render cycle (first render with stale value, then re-render)
  // Problem 2: Brief flash of stale data between renders
  // Problem 3: Unnecessary complexity

  return <h1>{fullName}</h1>;
};

// ✅ CORRECT: Compute during render
const UserProfile = ({ firstName, lastName }: Props) => {
  // Zero extra state, zero useEffect, zero sync bugs
  const fullName = `${firstName} ${lastName}`;
  return <h1>{fullName}</h1>;
};
```

**Common derived state traps:**
```tsx
// ❌ Filtering a list in state
const [filteredItems, setFilteredItems] = useState(items);
useEffect(() => {
  setFilteredItems(items.filter(i => i.category === selectedCategory));
}, [items, selectedCategory]);

// ✅ Compute during render (add useMemo if computation is expensive)
const filteredItems = useMemo(
  () => items.filter(i => i.category === selectedCategory),
  [items, selectedCategory]
);

// ❌ Counting items in state
const [itemCount, setItemCount] = useState(cart.length);
useEffect(() => setItemCount(cart.length), [cart]);

// ✅ Just compute it
const itemCount = cart.length;

// ❌ Transforming API response into display format in state
const [displayData, setDisplayData] = useState<ChartData[]>([]);
useEffect(() => {
  setDisplayData(apiResponse.map(transformToChartFormat));
}, [apiResponse]);

// ✅ Compute during render
const displayData = useMemo(
  () => apiResponse?.map(transformToChartFormat) ?? [],
  [apiResponse]
);
```

**When to use `useMemo` vs bare computation:**
- **Bare computation:** If the calculation is trivial (string concatenation, array length, simple conditionals)
- **`useMemo`:** If the calculation is expensive (filtering thousands of items, complex data transformations, rendering charts)

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is there any legitimate case for initializing state from props?"  
*Senior Answer:* Yes — when the prop is a **seed value** for independently mutable state. For example, a text editor initialized with `initialContent` prop: `const [content, setContent] = useState(initialContent)`. After initialization, the component owns and mutates the content independently. The key distinction: if the state should update when the prop changes, it's derived state (compute it). If the state should only be initialized once and then diverge, `useState(prop)` is correct — but name the prop `initialX` or `defaultX` to signal the intent.

---

## 5. URL as State

### Q8: When should state live in the URL instead of React state, and how do you architect URL-driven components?

**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture  
**Tags:** `URL State` `useSearchParams` `Filters` `Pagination`

**Answer:**

**URL state is for anything the user should be able to share, bookmark, or navigate back to.** If a colleague sends you a filtered product listing link, you expect to see the same filters applied.

```text
State belongs in the URL when:
✅ Filters (category, price range, brand)
✅ Pagination (page number, cursor)
✅ Sort order (newest, price-asc, price-desc)
✅ Search query
✅ Active tab or view mode
✅ Selected date range
✅ Map coordinates / zoom level

State does NOT belong in the URL:
❌ Modal open/closed (transient UI)
❌ Dropdown expanded/collapsed
❌ Form input values (before submission)
❌ Hover state, scroll position
❌ Auth tokens (SECURITY RISK!)
```

**Architecture Pattern — URL as the Single Source of Truth:**
```tsx
import { useSearchParams } from 'react-router-dom';

// Custom hook wrapping search params with type safety
interface ProductFilters {
  category: string;
  sort: 'newest' | 'price-asc' | 'price-desc';
  page: number;
  query: string;
}

const useProductFilters = (): [ProductFilters, (updates: Partial<ProductFilters>) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductFilters = {
    category: searchParams.get('category') || 'all',
    sort: (searchParams.get('sort') as ProductFilters['sort']) || 'newest',
    page: Number(searchParams.get('page')) || 1,
    query: searchParams.get('q') || '',
  };

  const updateFilters = (updates: Partial<ProductFilters>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'all') {
          next.delete(key === 'query' ? 'q' : key);  // Clean URLs
        } else {
          next.set(key === 'query' ? 'q' : key, String(value));
        }
      });
      // Reset page when filters change
      if ('category' in updates || 'sort' in updates || 'query' in updates) {
        next.delete('page');
      }
      return next;
    });
  };

  return [filters, updateFilters];
};

// Usage — URL is the single source of truth
const ProductCatalog = () => {
  const [filters, updateFilters] = useProductFilters();

  // TanStack Query uses URL-derived filters as cache key
  const { data: products } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  });

  return (
    <>
      <CategoryFilter
        value={filters.category}
        onChange={(category) => updateFilters({ category })}
      />
      <SortSelector
        value={filters.sort}
        onChange={(sort) => updateFilters({ sort })}
      />
      <SearchBar
        value={filters.query}
        onChange={(query) => updateFilters({ query })}
      />
      <ProductGrid items={products?.items} />
      <Pagination
        page={filters.page}
        totalPages={products?.totalPages}
        onChange={(page) => updateFilters({ page })}
      />
    </>
  );
};
```

**Benefits:**
1. **Shareable** — `/products?category=electronics&sort=price-asc` can be shared
2. **Back/Forward navigation** — Browser history "just works"
3. **SSR/SSG compatible** — Server can pre-render based on URL params
4. **No hydration mismatch** — URL is available on both server and client

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you handle the case where a user types rapidly in the search box and each keystroke triggers a URL update?"  
*Senior Answer:* Debounce the URL update, not the input state. Keep the input value in local `useState` for instant UI response, but debounce the `updateFilters({ query })` call by 300-500ms. This prevents flooding the browser history with intermediate states. Use `replace: true` in `setSearchParams` to replace the current history entry instead of pushing new ones during rapid input.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: What happens when you put scroll position in React Context?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Performance` `Context`

**Answer:**
**Catastrophic re-rendering.** Scroll events fire 60+ times per second. If scroll position is in Context, every consumer re-renders at 60fps — most of which don't care about scroll position at all. This causes jank, dropped frames, and high CPU usage. Use a `ref` or Zustand (external store with selector subscriptions) for scroll position.

---

### Q10: Why does this code have a subtle bug?
```tsx
const [items, setItems] = useState(props.items);
```

**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `QuickFire` `useState` `Props`

**Answer:**
`useState(initialValue)` only uses the argument for the **first render**. If `props.items` changes (e.g., new data fetched), the state won't update — it's frozen at the initial value. This is one of the most common React bugs. If `items` should always reflect the prop, compute it directly: `const items = props.items`. If it should be independently mutable after initialization, use a `key` prop on the component to force re-initialization when the source changes.

---

### Q11: You're using Redux Toolkit in a large app. A junior developer asks, "Should we put the user's shopping cart in Redux?" What's your answer?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `State Architecture` `Decision`

**Answer:**
**It depends on whether the cart is server-persisted or client-only.** If the cart is synced with a backend API (most production e-commerce), it's **server state** — use TanStack Query with optimistic mutations. If it's purely client-side (guest checkout, no persistence), you could use Redux since it's already in the app, but Zustand or `useReducer` + Context would be simpler. The key question is: "Does this data originate from a server?" If yes, it should be managed by a server-state library, not Redux.

---

### Q12: What is "state colocation" and why is it the #1 performance optimization in React?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Performance` `Colocation`

**Answer:**
State colocation means placing state **as close as possible to where it's consumed** in the component tree. If a boolean only controls a tooltip in a deeply nested component, keep the state IN that component — not in a global store or high-level layout. When state lives higher than necessary, state changes cause re-renders of the entire subtree below the stateful component. Moving state down to where it's used limits the re-render blast radius. This is free performance — no memoization, no libraries, just better architecture.

---

### Q13: Can you use Zustand stores outside of React components? Why would you want to?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `Zustand` `Non-React`

**Answer:**
Yes — Zustand stores are plain JavaScript objects, not React-specific. You can call `useStore.getState()` and `useStore.setState()` anywhere: in API interceptors, event handlers, WebSocket callbacks, or service workers.

**Use cases:**
- Setting auth state from an Axios interceptor when a 401 is received
- Updating notification state from a WebSocket `onmessage` handler
- Logging state snapshots from error reporting middleware (Sentry)

```tsx
// In an Axios interceptor (NOT a React component)
api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    useAuthStore.getState().logout(); // Works outside React!
  }
  return Promise.reject(error);
});
```

---

### Q14: What's wrong with this Context provider setup?
```tsx
const App = () => (
  <ThemeProvider value={{ theme: 'dark', toggle: () => setTheme(/*...*/) }}>
    {children}
  </ThemeProvider>
);
```

**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Context` `Reference Stability`

**Answer:**
The `value` prop creates a **new object reference on every render** of `App`, which forces **all consumers** to re-render even if `theme` hasn't changed. Fix: wrap the value in `useMemo`:
```tsx
const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
return <ThemeProvider value={value}>{children}</ThemeProvider>;
```
Or better: store the `toggle` function in a `useCallback` and destructure the value into separate contexts (one for the value, one for the dispatch/actions).
