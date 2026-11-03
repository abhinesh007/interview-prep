# 03 — Data Flow & Fetching Architecture

> React Server Components data flow, fetch-on-render waterfall elimination, TanStack Query architecture, GraphQL vs REST at scale, race conditions, and optimistic update patterns.

---

## 📑 Table of Contents
1. [React Server Components Data Flow](#1-react-server-components-data-flow)
2. [Fetch-on-Render Waterfall Problem](#2-fetch-on-render-waterfall-problem)
3. [TanStack Query Architecture](#3-tanstack-query-architecture)
4. [GraphQL vs REST at Scale](#4-graphql-vs-rest-at-scale)
5. [Race Conditions & Cancellation](#5-race-conditions--cancellation)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. React Server Components Data Flow

### Q1: How do React Server Components (RSCs) fundamentally change the traditional client-side data flow architecture?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `RSC` `Server Components` `Architecture` `Next.js`

**Answer:**

RSCs shift the data-fetching paradigm from **client-side imperative fetching** to **server-side declarative rendering**.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  TRADITIONAL CLIENT-SIDE FLOW (SPA)                                 │
│                                                                     │
│  Browser loads JS → React mounts → useEffect fires → fetch()       │
│  → Loading spinner → Data arrives → Re-render with data            │
│                                                                     │
│  Problems:                                                          │
│  • User sees spinner on initial load                                │
│  • Heavy libraries (markdown parser, date-fns) shipped to client   │
│  • Nested components create fetch WATERFALLS                        │
│  • Client bundle grows with every data dependency                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  RSC FLOW (Next.js App Router / Remix)                              │
│                                                                     │
│  Request hits server → Server Component executes → fetches data    │
│  directly from DB/API → Renders to RSC payload → Streams to client │
│  → Client hydrates ONLY interactive parts (Client Components)       │
│                                                                     │
│  Benefits:                                                          │
│  • Zero client-side data fetching waterfall for initial render      │
│  • Heavy libraries stay on server (0 KB client cost)                │
│  • Direct DB/API access with no REST/GraphQL boilerplate            │
│  • Streaming SSR + Suspense for progressive rendering               │
└─────────────────────────────────────────────────────────────────────┘
```

**The Architectural Rule (The "Donut Pattern"):**
```text
Server Components can render Client Components:
  ✅ <ServerComponent>
       <ClientComponent />       ← Server passes data as props
     </ServerComponent>

Client Components CANNOT import Server Components:
  ❌ import ServerComponent from './ServerComponent';  // Build error!

Client Components CAN accept Server Components as children:
  ✅ <ClientLayout>
       {children}                ← children can be Server Components
     </ClientLayout>
```

**Practical RSC Data Fetching:**
```tsx
// app/dashboard/page.tsx — Server Component (default in App Router)
// This runs ONLY on the server — never ships JS to the client

import { db } from '@/lib/database';

export default async function DashboardPage() {
  // Direct database access — no API endpoint needed!
  const metrics = await db.query('SELECT * FROM daily_metrics WHERE date = CURRENT_DATE');
  const recentOrders = await db.orders.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="dashboard">
      {/* Server Component — heavy charting library stays on server */}
      <MetricsSummary metrics={metrics} />

      {/* Client Component — needs interactivity (click handlers) */}
      <InteractiveOrderTable orders={recentOrders} />
    </div>
  );
}

// components/InteractiveOrderTable.tsx
'use client'; // ← Explicit opt-in to client rendering

import { useState } from 'react';

export function InteractiveOrderTable({ orders }: { orders: Order[] }) {
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  // Interactive — this component hydrates on the client
  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => setSortBy('date')}>Date</th>
          <th onClick={() => setSortBy('amount')}>Amount</th>
        </tr>
      </thead>
      {/* ... */}
    </table>
  );
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can you pass a function (like an event handler) as a prop from a Server Component to a Client Component?"  
*Senior Answer:* No — the RSC protocol serializes the component tree as a JSON-like payload. Functions cannot be serialized. You can only pass **serializable data** (strings, numbers, booleans, arrays, plain objects, Dates) from Server to Client Components. For actions, use **Server Actions** (`'use server'` directive) which create a serializable reference that the client can invoke as a form action or mutation.

---

### Q2: How do you handle loading states and streaming with Suspense boundaries in an RSC architecture?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Suspense` `Streaming` `Loading States`

**Answer:**

Suspense boundaries in RSC create **streaming insertion points** — the server sends the shell immediately, then streams in data-dependent sections as they resolve.

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="dashboard">
      {/* Instant — no data dependency */}
      <DashboardHeader />

      {/* Streams in when metrics query resolves (~200ms) */}
      <Suspense fallback={<KPICardSkeleton count={4} />}>
        <KPICards />  {/* Server Component with async data fetch */}
      </Suspense>

      {/* Streams in when chart data resolves (~500ms) */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />  {/* Slower query — streams independently */}
      </Suspense>

      {/* Streams in when order query resolves (~300ms) */}
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}

// Each component fetches independently — NO waterfall
async function KPICards() {
  const metrics = await fetchMetrics();  // ~200ms
  return <KPIGrid metrics={metrics} />;
}

async function RevenueChart() {
  const chartData = await fetchRevenueData();  // ~500ms
  return <Chart data={chartData} />;
}

async function RecentOrders() {
  const orders = await fetchRecentOrders();  // ~300ms
  return <OrderTable orders={orders} />;
}
```

```text
Timeline with streaming:

0ms    ──── Server sends HTML shell + DashboardHeader ──── User sees header
200ms  ──── KPICards data resolves → streamed to client ── KPIs appear
300ms  ──── RecentOrders resolves → streamed to client ─── Table appears
500ms  ──── RevenueChart resolves → streamed to client ─── Chart appears

Total perceived load time: 200ms (first meaningful content)
Without streaming: 500ms (slowest query blocks everything)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if one Suspense boundary throws an error?"  
*Senior Answer:* Wrap each Suspense in an **Error Boundary**. If `RevenueChart` throws, only that section shows the error fallback — the rest of the dashboard renders normally. Without an Error Boundary, the error propagates up to the nearest parent Error Boundary, potentially taking down the entire page. Pattern: `<ErrorBoundary><Suspense>...<Component /></Suspense></ErrorBoundary>`.

---

## 2. Fetch-on-Render Waterfall Problem

### Q3: What is the "fetch-on-render waterfall" and how do you eliminate it?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Waterfall` `Performance` `Data Fetching`

**Answer:**

A waterfall occurs when nested components trigger sequential network requests — each waiting for the parent to render before starting its own fetch.

```text
❌ WATERFALL PATTERN:

Component A mounts ──► fetch(/api/user) ─── 300ms ──► renders
                                                        │
                                                Component B mounts ──► fetch(/api/orders) ─── 400ms ──► renders
                                                                                                         │
                                                                                          Component C mounts ──► fetch(/api/details) ─── 200ms
                                                                                                                                            │
Total: 300 + 400 + 200 = 900ms sequential                                                                                                  ▼ Done


✅ PARALLEL PATTERN:

fetch(/api/user)    ─── 300ms ──► ┐
fetch(/api/orders)  ─── 400ms ──► ├── All resolve ──► Render everything
fetch(/api/details) ─── 200ms ──► ┘

Total: max(300, 400, 200) = 400ms parallel
```

**The Anti-Pattern:**
```tsx
// ❌ Each component fetches on mount — creates a waterfall
const Dashboard = () => {
  const { data: user } = useQuery({ queryKey: ['user'], queryFn: fetchUser });

  if (!user) return <Loading />;

  // Orders component only MOUNTS after user data loads
  return <UserOrders userId={user.id} />;
};

const UserOrders = ({ userId }) => {
  const { data: orders } = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
  });

  if (!orders) return <Loading />;

  // Detail only MOUNTS after orders load
  return <OrderDetails orderId={orders[0].id} />;
};
```

**Solutions:**

**1. Parallel fetching with `Promise.all`:**
```tsx
// Fetch everything upfront in a single component
const Dashboard = () => {
  const queries = useQueries({
    queries: [
      { queryKey: ['user'], queryFn: fetchUser },
      { queryKey: ['orders'], queryFn: fetchAllOrders },
      { queryKey: ['metrics'], queryFn: fetchMetrics },
    ],
  });

  const [userQuery, ordersQuery, metricsQuery] = queries;

  return (
    <>
      <Suspense fallback={<Skeleton />}>
        {userQuery.data && <UserProfile user={userQuery.data} />}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        {ordersQuery.data && <OrdersList orders={ordersQuery.data} />}
      </Suspense>
    </>
  );
};
```

**2. Prefetching on route navigation:**
```tsx
// Prefetch data BEFORE the component mounts
const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <DashboardPage />,
    loader: async () => {
      // React Router loader — fetches BEFORE component renders
      await Promise.all([
        queryClient.prefetchQuery({ queryKey: ['user'], queryFn: fetchUser }),
        queryClient.prefetchQuery({ queryKey: ['metrics'], queryFn: fetchMetrics }),
      ]);
      return null;
    },
  },
]);
```

**3. Suspense + RSC (the modern way):**
```tsx
// Server Components fetch in parallel naturally
// because they're async functions, not effect-based
async function Dashboard() {
  // These fire in parallel — no waterfall!
  const [user, orders, metrics] = await Promise.all([
    fetchUser(),
    fetchOrders(),
    fetchMetrics(),
  ]);

  return <DashboardView user={user} orders={orders} metrics={metrics} />;
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if `fetchOrders` depends on `userId` from `fetchUser`? You can't parallelize them."  
*Senior Answer:* True dependent fetches cannot be parallelized, but you can minimize the impact: (1) Fetch `user` at the route loader level so it's ready before the component mounts. (2) Use `Suspense` boundaries to show the user profile immediately while orders load. (3) Consider a backend endpoint that returns both user + orders in one call (`/api/dashboard-data`) to eliminate the client-side dependency chain entirely.

---

## 3. TanStack Query Architecture

### Q4: Explain the query key architecture in TanStack Query and how it enables automatic cache management.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `TanStack Query` `Cache` `Query Keys`

**Answer:**

Query keys are the **identity** of cached data. TanStack Query uses them for cache lookup, deduplication, automatic refetching, and invalidation.

```text
Query Key Structure:
['products']                              ← All products
['products', { category: 'electronics' }] ← Filtered products
['products', 'prod_123']                  ← Single product
['products', 'prod_123', 'reviews']       ← Product reviews

Cache Hierarchy:
┌────────────────────────────────────────────┐
│  queryClient.invalidateQueries(['products'])│
│                                            │
│  Invalidates ALL of these:                 │
│  ├── ['products']                          │
│  ├── ['products', { category: '...' }]     │
│  ├── ['products', 'prod_123']              │
│  └── ['products', 'prod_123', 'reviews']   │
└────────────────────────────────────────────┘
```

**Query Key Factory Pattern (Recommended for large apps):**
```tsx
// Centralized query key factory — prevents typos, enables autocomplete
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  reviews: (id: string) => [...productKeys.detail(id), 'reviews'] as const,
};

// Usage in hooks
const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => fetchProducts(filters),
  });

const useProduct = (id: string) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProduct(id),
  });

// Targeted invalidation after mutation
const useUpdateProduct = () =>
  useMutation({
    mutationFn: updateProduct,
    onSuccess: (data) => {
      // Invalidate the specific product AND all lists (they might show stale data)
      queryClient.invalidateQueries({ queryKey: productKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
```

**Request Deduplication:**
```tsx
// If 5 components all call useProducts({ category: 'electronics' })
// TanStack Query makes only ONE API request and shares the result

// Component A
const { data } = useProducts({ category: 'electronics' });
// Component B (same query key)
const { data } = useProducts({ category: 'electronics' });
// Component C (same query key)
const { data } = useProducts({ category: 'electronics' });

// Result: 1 API call, not 3!
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if two query keys contain the same values but in different reference order?"  
*Senior Answer:* TanStack Query performs a **deep structural comparison** of query keys, not reference equality. `['products', { a: 1, b: 2 }]` and `['products', { b: 2, a: 1 }]` are considered the **same key** and share the same cache entry. However, `['products', 1]` and `['products', '1']` are different because `1 !== '1'`. Always ensure consistent types in query keys.

---

### Q5: How do you implement optimistic updates with rollback using TanStack Query mutations?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Optimistic Updates` `Mutations` `Rollback`

**Answer:**

Optimistic updates provide instant UI feedback before the server confirms the action. If the server rejects the mutation, the UI rolls back to the previous state.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const useToggleTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todoId: string) =>
      api.patch<Todo>(`/todos/${todoId}/toggle`),

    // 1. BEFORE the API call — optimistically update the cache
    onMutate: async (todoId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous value (for rollback)
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((todo) =>
          todo.id === todoId
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      );

      // Return the snapshot as rollback context
      return { previousTodos };
    },

    // 2. ON ERROR — rollback to the snapshot
    onError: (error, todoId, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      toast.error('Failed to update todo. Changes reverted.');
    },

    // 3. ON SETTLE (success or error) — refetch to reconcile with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
};

// Usage
const TodoItem = ({ todo }: { todo: Todo }) => {
  const toggleTodo = useToggleTodo();

  return (
    <li
      onClick={() => toggleTodo.mutate(todo.id)}
      style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}
    >
      {todo.title}
      {toggleTodo.isPending && <Spinner size="sm" />}
    </li>
  );
};
```

```text
Optimistic Update Timeline:

User clicks ──► Cache updated instantly (UI reflects change)
              ──► API request sent in background
                   │
                   ├── Success ──► invalidateQueries() refetches latest data
                   │                (UI already shows correct state)
                   │
                   └── Error ──► Rollback to snapshot
                                 Show error toast
                                 invalidateQueries() refetches to reconcile
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if the user makes 3 rapid optimistic updates and the second one fails? How does rollback work?"  
*Senior Answer:* Each mutation captures its own snapshot at `onMutate` time. If mutation #2 fails, its `onError` restores the snapshot from *before* mutation #2 — but mutation #1's changes are already committed and mutation #3's optimistic update is based on the (now incorrect) state. The `onSettled` refetch resolves this by reconciling with the server's actual state. For critical flows with rapid mutations (like reordering a list), consider using **mutation queues** or debouncing the mutation to only send the latest state.

---

## 4. GraphQL vs REST at Scale

### Q6: When would you choose GraphQL over REST for a large React application, and what are the architectural trade-offs?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `GraphQL` `REST` `Architecture` `Scale`

**Answer:**

| Criteria | REST | GraphQL |
|---|---|---|
| **Over-fetching** | Common — endpoints return fixed shapes | Eliminated — client requests exactly what it needs |
| **Under-fetching** | Common — requires multiple endpoints | Eliminated — nested queries in one request |
| **Caching** | Simple (HTTP cache, CDN) | Complex (normalized client cache required) |
| **Type Safety** | Requires separate schema (OpenAPI) | Intrinsic (schema IS the contract) |
| **File Uploads** | Native multipart support | Requires separate handling (multipart spec) |
| **Real-Time** | WebSockets / SSE (separate) | Subscriptions (built-in spec) |
| **Learning Curve** | Low | Moderate-High |
| **Backend Complexity** | Low | Higher (resolver chains, N+1 problem) |
| **Best For** | Simple CRUD, public APIs, microservices | Complex UIs with varied data needs, BFF pattern |

**Choose REST when:**
- Simple CRUD operations with predictable data shapes
- Heavy reliance on HTTP caching (CDN, browser cache)
- Backend team is small or unfamiliar with GraphQL
- Public API consumed by many external clients

**Choose GraphQL when:**
- Dashboard/BI applications with complex, nested data from multiple sources
- Mobile + Web clients needing different data shapes from the same backend
- Rapid frontend iteration (frontend can query new fields without backend changes)
- Complex relational data (user → orders → items → reviews)

**Fragment Colocation Pattern (GraphQL + React best practice):**
```tsx
// Each component declares exactly what data it needs
// Fragments are colocated with the component that uses them

// UserAvatar.tsx
export const USER_AVATAR_FRAGMENT = gql`
  fragment UserAvatarFields on User {
    id
    name
    avatarUrl
  }
`;

const UserAvatar = ({ user }: { user: UserAvatarFieldsFragment }) => (
  <img src={user.avatarUrl} alt={user.name} />
);

// OrderRow.tsx
export const ORDER_ROW_FRAGMENT = gql`
  fragment OrderRowFields on Order {
    id
    total
    status
    createdAt
    customer {
      ...UserAvatarFields
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

// Page query composes fragments — fetches exactly what's needed
const DASHBOARD_QUERY = gql`
  query Dashboard {
    recentOrders {
      ...OrderRowFields
    }
  }
  ${ORDER_ROW_FRAGMENT}
`;
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What's the N+1 problem in GraphQL and how does it affect the frontend?"  
*Senior Answer:* The N+1 problem is a **backend** issue where a GraphQL resolver for a list of items makes 1 query to get the list, then N individual queries to resolve a nested field for each item. The frontend doesn't see this directly, but it manifests as slow response times. The backend fix is **DataLoader** — batching and caching resolver calls. The frontend architect should be aware of this when designing queries: deeply nested queries with many resolvers can be slow even though the GraphQL spec allows them. Monitor query performance and set complexity limits on the server.

---

## 5. Race Conditions & Cancellation

### Q7: How do you prevent race conditions in search-as-you-type implementations?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Race Conditions` `AbortController` `Search`

**Answer:**

The race condition: User types "react" quickly. API calls fire for "r", "re", "rea", "reac", "react". If "re" responds last (slow network), the UI shows results for "re" instead of "react".

```tsx
// ❌ RACE CONDITION: No cancellation
const SearchResults = ({ query }: { query: string }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then((res) => res.json())
      .then((data) => setResults(data));  // ← Stale response overwrites fresh one!
  }, [query]);

  return <ResultsList items={results} />;
};

// ✅ FIXED: AbortController cancellation
const SearchResults = ({ query }: { query: string }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setResults(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Search failed:', err);
        }
        // AbortError is expected — ignore it
      });

    // Cleanup: cancel previous request when query changes
    return () => controller.abort();
  }, [query]);

  return <ResultsList items={results} />;
};

// ✅ BEST: TanStack Query handles it automatically
const useSearch = (query: string) =>
  useQuery({
    queryKey: ['search', query],
    queryFn: ({ signal }) => fetch(`/api/search?q=${query}`, { signal }).then(r => r.json()),
    enabled: query.length >= 2,  // Don't search until 2+ characters
  });
```

**How TanStack Query prevents race conditions:**
```text
User types: r → re → rea → react

TanStack Query internally:
1. "r"     → fetch starts → query key: ['search', 'r']
2. "re"    → fetch starts → ABORTS ['search', 'r'] → query key: ['search', 're']
3. "rea"   → fetch starts → ABORTS ['search', 're'] → query key: ['search', 'rea']
4. "react" → fetch starts → ABORTS ['search', 'rea'] → query key: ['search', 'react']

Only the response for "react" is used. Previous requests are cancelled.
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if you're using Axios instead of `fetch`? Axios doesn't natively support `AbortSignal` in older versions."  
*Senior Answer:* Axios v0.22+ supports `AbortController` via the `signal` option (same as fetch). For older versions, use Axios's deprecated `CancelToken`. Regardless, TanStack Query passes the `signal` to your `queryFn` — you just need to forward it to whatever HTTP client you're using.

---

### Q8: Beyond search, what other frontend patterns are vulnerable to race conditions?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `Race Conditions` `Patterns` `Async`

**Answer:**

| Pattern | Race Condition | Fix |
|---|---|---|
| **Tab switching** | User rapidly switches tabs; older tab's data loads after newer tab's data, showing stale content | Use query key with tab identifier; AbortController in cleanup |
| **Auto-save** | Fast typing triggers multiple save requests; if they resolve out of order, older content overwrites newer | Debounce + sequential mutation queue (each save waits for previous to complete) |
| **Optimistic delete + undo** | User deletes item, presses undo, item is re-added optimistically, but the delete API resolves after the undo, removing it again | Use idempotency keys; track mutation state; cancel pending delete before undo |
| **Infinite scroll** | Fast scrolling triggers page 1, 2, 3 fetches; if page 2 arrives before page 1, items are inserted in wrong order | TanStack Query's `useInfiniteQuery` handles ordering automatically |
| **WebSocket + REST** | Initial REST fetch returns data, then a WebSocket update arrives with newer data, then the REST response resolves (stale) and overwrites the WebSocket data | Use timestamps; only apply updates if `timestamp > lastKnownTimestamp` |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How would you detect race conditions in code review?"  
*Senior Answer:* Look for the pattern: `useEffect` + `setState` + async operation without either AbortController cleanup or a "stale closure" guard (boolean ref). If you see `setData(result)` inside an async callback within `useEffect` without a `return () => controller.abort()`, it's almost certainly a race condition. In tests: use `vi.useFakeTimers()` to control timing and assert that only the latest response is applied.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: What happens if you forget the AbortController cleanup in `useEffect`?

**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `AbortController` `Memory Leak`

**Answer:**
Two problems: (1) **Race condition** — stale responses can overwrite fresh data. (2) **Memory leak** — calling `setState` on an unmounted component. React 18 doesn't throw an error for this anymore (it used to warn), but the stale closure still holds references to the component's scope, preventing garbage collection. The fix: always return `() => controller.abort()` from any `useEffect` that makes an async request.

---

### Q10: When does `staleTime: Infinity` make sense in TanStack Query?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `TanStack Query` `Caching`

**Answer:**
When data **never changes during a session**:
- User profile data (name, avatar) — rarely changes, session-scoped
- Feature flags fetched at app load
- Static reference data (country lists, currency codes, category taxonomy)
- App configuration fetched at startup

`staleTime: Infinity` means "once fetched, never refetch automatically." The data stays fresh until you manually invalidate it or the cache is garbage-collected after `gcTime` expires.

---

### Q11: You're fetching a paginated list. Should you use `offset/limit` or `cursor-based` pagination?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Pagination` `API Design`

**Answer:**

| | Offset/Limit | Cursor-Based |
|---|---|---|
| **Implementation** | `?page=3&limit=20` | `?cursor=abc123&limit=20` |
| **Random access** | ✅ Jump to any page | ❌ Must traverse sequentially |
| **Data consistency** | ❌ Inserts/deletes shift items, causing duplicates or missed items | ✅ Stable — cursor points to exact position |
| **Performance** | ❌ `OFFSET 10000` is slow in databases | ✅ `WHERE id > cursor LIMIT 20` is indexed |
| **Best for** | Admin tables with page numbers | Feeds, infinite scroll, real-time lists |

**Rule of thumb:** If new items are inserted frequently (feeds, notifications, chat) → cursor. If data is relatively static and users need page numbers (admin dashboards, reports) → offset.

---

### Q12: What is "stale-while-revalidate" and how does TanStack Query implement it?

**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `SWR` `Caching`

**Answer:**
**Stale-While-Revalidate** means: "Show cached (potentially stale) data immediately, then fetch fresh data in the background. When fresh data arrives, seamlessly replace the stale data."

TanStack Query implementation:
1. First request: fetch → cache → show data
2. Subsequent visits (within `staleTime`): show cached data, no refetch
3. After `staleTime` expires: show cached data immediately (stale), trigger background refetch
4. Background refetch completes: seamlessly update the UI with fresh data

The user never sees a loading spinner on subsequent visits — they see the last known data instantly while fresh data loads behind the scenes.

---

### Q13: Can you prefetch data before a user navigates to a page? How?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `Prefetching` `Performance`

**Answer:**
Yes — prefetch on hover or on route match:

```tsx
// Prefetch on link hover
const ProductLink = ({ productId }: { productId: string }) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => fetchProduct(productId),
      staleTime: 5 * 60 * 1000,  // Don't prefetch if recently fetched
    });
  };

  return (
    <Link to={`/products/${productId}`} onMouseEnter={handleMouseEnter}>
      View Product
    </Link>
  );
};
```

This gives the user a ~200-400ms head start (typical hover-to-click time) on the data fetch, making the next page feel instant.
