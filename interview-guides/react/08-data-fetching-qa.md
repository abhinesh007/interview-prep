# 08 — Data Fetching in React Interview Questions & Answers

> Native Fetch gotchas, Axios interceptors, TanStack Query (React Query) deep dive, optimistic updates, infinite scroll, SWR, and service module architecture.

---

## 📑 Table of Contents
1. [Native Fetch Gotchas & Cancellation](#1-native-fetch-gotchas--cancellation)
2. [Axios vs Fetch: Enterprise Interceptor Patterns](#2-axios-vs-fetch-enterprise-interceptor-patterns)
3. [TanStack Query (React Query) Mastery](#3-tanstack-query-react-query-mastery)
4. [Advanced Query Patterns (Optimistic Updates & Infinite Scroll)](#4-advanced-query-patterns-optimistic-updates--infinite-scroll)
5. [TanStack Query vs SWR](#5-tanstack-query-vs-swr)
6. [API Architecture & Service Module Pattern](#6-api-architecture--service-module-pattern)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Native Fetch Gotchas & Cancellation

### Q1: The Native Fetch Trap: Why does `fetch()` NOT reject on HTTP 404 or 500 errors?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Fix / Web APIs

**Answer:**
A native `fetch()` Promise only rejects on **network failure** (e.g., DNS lookup failure, loss of internet connection, CORS violation). If the server responds with HTTP `404 Not Found`, `401 Unauthorized`, or `500 Internal Server Error`, the Promise still **resolves successfully**!

```javascript
// ❌ WRONG: Catch block will NEVER run on a 404 or 500!
try {
  const res = await fetch('/api/user/999');
  const data = await res.json();
  setUser(data);
} catch (err) {
  // Only runs if the computer is offline!
  showToast('Network error');
}

// ✅ CORRECT: Must manually check res.ok
try {
  const res = await fetch('/api/user/999');
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  setUser(data);
} catch (err) {
  showToast(err.message);
}
```

---

### Q2: What happens if a component calls `setState` after it has unmounted?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
- In React 17 and earlier: React printed a famous red warning in the console:
  *"Can't perform a React state update on an unmounted component. This is a no-op, but it indicates a memory leak in your application."*
- In React 18+: The warning was removed because it was often a benign no-op, but uncancelled requests still consume browser bandwidth and CPU cycles.

**How to cancel cleanly with `AbortController`:**
```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/heavy-data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort(); // Cancels network request on unmount!
}, []);
```

---

## 2. Axios vs Fetch: Enterprise Interceptor Patterns

### Q3: Comparison: Native Fetch vs Axios
**Difficulty:** 🟢 Junior  
**Type:** 📖 Comparison

| Feature | `fetch` (Browser Native) | `axios` (Library) |
| :--- | :--- | :--- |
| **Installation** | Built-in (0 kB) | ~11 kB external dependency |
| **JSON Transformation** | Manual (`res.json()`) | Automatic (`res.data`) |
| **HTTP Error Handling** | Resolves on 4xx/5xx | Rejects automatically on 4xx/5xx |
| **Request Cancellation** | `AbortController` | `AbortController` or cancel token |
| **Interceptors** | None (must wrap manually) | Built-in request/response interceptors |
| **Timeout Support** | Manual via `AbortSignal.timeout()` | Built-in `timeout: 5000` option |

---

### Q4: Coding Challenge: Axios Instance with Automatic JWT Token Refresh Interceptor
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding / Senior Architecture

```typescript
import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://api.example.com/v1',
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Attach Access Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Auto-Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Detect 401 and avoid infinite refresh loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue parallel requests until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const res = await axios.post('https://api.example.com/v1/auth/refresh', { refreshToken });
        const { newAccessToken } = res.data;

        localStorage.setItem('access_token', newAccessToken);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 3. TanStack Query (React Query) Mastery

### Q5: What problems does TanStack Query solve that manual `useEffect` + `fetch` does not?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
Writing raw `useEffect` for data fetching leads to:
- No automatic caching or deduplication (2 components fetching `/user` fire 2 separate HTTP calls).
- No background re-fetching on window focus or network reconnect.
- Boilerplate: requires 3 state variables (`isLoading`, `error`, `data`) in every component.
- Race conditions when search queries change rapidly.
- Complex garbage collection and pagination handling.

**TanStack Query introduces:**
1. **Cache deduplication:** Identical queries share a single in-flight promise.
2. **Stale-While-Revalidate:** Serves immediate cached data while refreshing in background.
3. **Automatic polling & reconnect:** Automatically updates data when user re-focuses tab.

---

### Q6: `staleTime` vs `gcTime` (formerly `cacheTime`): What is the difference?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Core Concept / Gotcha

**Answer:**
- **`staleTime` (Freshness duration):** How long fetched data is considered "fresh". While fresh, TanStack Query will return cached data without firing background network requests. Defaults to `0` (data becomes stale immediately).
- **`gcTime` (Garbage Collection duration):** How long inactive/unmounted query cache is kept in memory before being permanently wiped. Defaults to `5 minutes` (`1000 * 60 * 5`).

```text
Component mounts ──> Data fetched (staleTime = 10s, gcTime = 5m)
     │
     ├── At 5s: Component re-renders -> reads cache, NO network call (fresh)
     ├── At 12s: User switches tabs back -> reads cache, FIRES background refetch (stale)
     └── At 15s: Component unmounts -> gcTime countdown begins. If not remounted in 5m, wiped.
```

---

## 4. Advanced Query Patterns (Optimistic Updates & Infinite Scroll)

### Q7: Coding Challenge: Optimistic Update with Automatic Rollback in TanStack Query
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo { id: string; text: string; completed: boolean; }

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todoId: string) => {
      const res = await fetch(`/api/todos/${todoId}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle');
      return res.json();
    },

    // 1. Before network call fires:
    onMutate: async (todoId) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot previous value for rollback
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update cache
      queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
        old.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t))
      );

      // Return context with snapshot
      return { previousTodos };
    },

    // 2. On error: Roll back to previous snapshot!
    onError: (err, todoId, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },

    // 3. Always refetch to sync with server truth:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

---

### Q8: Coding Challenge: Infinite Scroll with `useInfiniteQuery`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

interface Post { id: number; title: string; }
interface PostPage { posts: Post[]; nextPage: number | null; }

async function fetchPosts({ pageParam = 1 }): Promise<PostPage> {
  const res = await fetch(`/api/posts?page=${pageParam}`);
  return res.json();
}

export function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  if (status === 'pending') return <p>Loading posts...</p>;

  return (
    <div>
      {data?.pages.map((page, i) => (
        <React.Fragment key={i}>
          {page.posts.map((post) => (
            <div key={post.id} className="post-card">{post.title}</div>
          ))}
        </React.Fragment>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading more...' : hasNextPage ? 'Load More' : 'No more posts'}
      </button>
    </div>
  );
}
```

---

## 5. TanStack Query vs SWR

### Q9: TanStack Query vs SWR Comparison
**Difficulty:** 🟡 Mid  
**Type:** 📊 Architecture Decision

| Criteria | TanStack Query | SWR (by Vercel) |
| :--- | :--- | :--- |
| **Origin** | Tanner Linsley | Vercel (Next.js team) |
| **Bundle Size** | ~13 kB | ~4.5 kB |
| **Mutations** | First-class `useMutation` with rollbacks | `mutate()` function |
| **DevTools** | Dedicated standalone floating DevTools | Community third-party |
| **Frameworks** | Framework agnostic (React, Vue, Svelte, Solid) | Primarily React |
| **Best For** | Heavy CRUD, complex dashboards, offline sync | Next.js apps, lightweight caching |

---

## 6. API Architecture & Service Module Pattern

### Q10: Why should you separate data fetching logic from component rendering logic?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Clean Code Architecture

**Answer:**
Directly embedding `axios.get('/api/users/...')` inside React components causes:
1. **Tight coupling:** If API endpoints or auth headers change, you must search and edit 20 UI files.
2. **Untestable components:** You cannot easily test UI mock behavior without mocking network layers.

**The 3-Layer Service Module Pattern:**
```text
[ React UI Component ]
        │ calls
        ▼
[ Custom Hook: useUserProfile(id) ]  <-- handles caching / query keys
        │ calls
        ▼
[ Domain Service: userService.getById(id) ] <-- business logic
        │ calls
        ▼
[ Base HTTP Client: apiClient (Axios instance) ] <-- baseURL, auth headers
```

---

## 🎯 Quick-Fire Round

1. **What is query key serialization in TanStack Query?**  
   *Query keys are hashed deterministically; `['user', { id: 1, tab: 'info' }]` matches `['user', { tab: 'info', id: 1 }]`.*
2. **How do you disable automatic query execution?**  
   *Set `enabled: false` in `useQuery` options (useful for search buttons or dependent queries).*
3. **What is query prefetching?**  
   *Calling `queryClient.prefetchQuery()` on link hover so data is cached before the user clicks.*
4. **Does SWR stand for?**  
   *Stale-While-Revalidate (from HTTP RFC 5861).*
5. **How do you invalidate all queries matching a prefix?**  
   *`queryClient.invalidateQueries({ queryKey: ['users'] })` invalidates `['users']`, `['users', 1]`, and all children keys.*
6. **Can TanStack Query work offline?**  
   *Yes, it supports offline caching and retrying mutations when reconnecting via persisters.*
7. **What is `AbortSignal.timeout(5000)`?**  
   *A native browser utility that auto-cancels fetch after 5000ms.*
8. **Why does `json()` method on `Response` return a Promise?**  
   *Because response bodies are streaming data read in chunks.*
9. **Can TanStack Query manage WebSockets?**  
   *Yes, by updating query cache directly via `queryClient.setQueryData()` inside WebSocket message events.*
10. **What is the difference between `refetch` and `invalidateQueries`?**  
    *`refetch` immediately executes the query; `invalidateQueries` marks it stale and only refetches active observers.*

---

> **Next:** [09 — Styling in React Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/09-styling-qa.md)
