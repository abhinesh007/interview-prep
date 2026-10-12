# 06 — Routing in React Interview Questions & Answers

> Client-Side Routing mechanics, HTML5 History API, React Router v6 & v7 Data APIs (Loaders, Actions), Nested Routes, Outlets, Route Protection, and Search Params.

---

## 📑 Table of Contents
1. [Core Routing Concepts & History API](#1-core-routing-concepts--history-api)
2. [Dynamic & Nested Routes with Outlets](#2-dynamic--nested-routes-with-outlets)
3. [Route Guards & Authentication Patterns](#3-route-guards--authentication-patterns)
4. [React Router v6.4+ Data APIs (Loaders & Actions)](#4-react-router-v64-data-apis-loaders--actions)
5. [Advanced Routing: Search Params & Code Splitting](#5-advanced-routing-search-params--code-splitting)
6. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Core Routing Concepts & History API

### Q1: How does Client-Side Routing work under the hood? (HTML5 History API)
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Browser Internals

**Answer:**
Traditional Multi-Page Applications (MPAs) send a fresh HTTP request to the server on every link click, returning full HTML pages.

Single-Page Applications (SPAs) intercept link clicks to prevent browser reloads using the **HTML5 History API**:
1. **`history.pushState(state, title, url)`:** Appends a new entry to the browser session history stack and updates the address bar URL **without** triggering a browser page refresh.
2. **`history.replaceState(state, title, url)`:** Replaces the current URL entry in history without pushing a new history item.
3. **`window.addEventListener('popstate', callback)`:** Listens for browser "Back" and "Forward" button navigation.

The React Router library attaches a `popstate` listener. When the URL changes:
- It matches the new pathname against its configured route table.
- It unmounts the old view and mounts the matching route component in the DOM, maintaining seamless transitions without screen flashes.

---

### Q2: `<Link>` vs `<NavLink>` vs `<a>`: What are the differences?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
- **`<a>` tag:** Standard HTML anchor. Causes a **full browser page reload**, discarding all client-side React state, re-downloading JavaScript bundles and CSS.
- **`<Link to="/path">`:** Prevents the browser's default reload via `e.preventDefault()`, invokes `history.pushState`, and updates the view purely in client JavaScript.
- **`<NavLink to="/path">`:** A specialized wrapper over `<Link>` that knows whether the route it points to is currently **active**. Automatically applies an `.active` class or accepts a callback for dynamic styling:

```jsx
<NavLink
  to="/dashboard"
  className={({ isActive, isPending }) =>
    isActive ? 'nav-link active' : 'nav-link'
  }
>
  Dashboard
</NavLink>
```

---

### Q3: Output Prediction: `navigate('/login')` vs `navigate('/login', { replace: true })`
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction / UX

**Answer:**
- `navigate('/login')` calls `history.pushState()`. It pushes `/login` onto the history stack. If the user clicks the browser "Back" button, they go back to the page they were previously viewing.
- `navigate('/login', { replace: true })` calls `history.replaceState()`. It **replaces** the current history entry.
  - *When to use `replace: true`:*
    1. After a successful login (to prevent the user from clicking "Back" and landing back on the login form).
    2. During redirects on protected routes (if unauthorized, replace the private route so hitting Back doesn't redirect loop).

---

## 2. Dynamic & Nested Routes with Outlets

### Q4: How does `<Outlet>` work in Nested Route Layouts?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Coding

**Answer:**
An `<Outlet>` acts as a placeholder inside a parent route component that renders the matched child route element. This enables persistent layout shells (sidebars, navbars, headers) without re-rendering or unmounting the layout when moving between nested sub-pages.

```tsx
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';

// 1. Shared Layout Shell
function DashboardLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/dashboard/analytics">Analytics</Link>
        <Link to="/dashboard/settings">Settings</Link>
      </aside>
      <main className="content">
        {/* Child route renders right here! */}
        <Outlet />
      </main>
    </div>
  );
}

// 2. Router Configuration
const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <h2>Welcome to Dashboard</h2> },
      { path: 'analytics', element: <AnalyticsView /> },
      { path: 'settings', element: <SettingsView /> },
    ],
  },
]);
```

---

### Q5: What is an Index Route?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual

**Answer:**
An **Index Route** (`index: true`) is the default child route rendered into the parent's `<Outlet>` when the user visits the exact parent URL path (`/dashboard`) without any child segments.

---

## 3. Route Guards & Authentication Patterns

### Q6: Coding Challenge: Implement a Protected Route with Redirect-Back Pattern
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding / Senior Pattern

```tsx
import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth(); // Custom auth hook
  const location = useLocation();

  if (isLoading) {
    return <div className="loader">Verifying session...</div>;
  }

  // 1. Not logged in: Redirect to login, storing current path in location.state
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role-based check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

**Consuming the redirect back inside `LoginPage`:**
```tsx
function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Read where the user was trying to go, default to dashboard
  const destination = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async () => {
    await authApi.login();
    navigate(destination, { replace: true });
  };

  return <button onClick={handleLogin}>Log In</button>;
}
```

---

## 4. React Router v6.4+ Data APIs (Loaders & Actions)

### Q7: What are Route Loaders and Actions? How do they eliminate the "Fetch-on-Render" waterfall?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture

**Answer:**
Prior to React Router 6.4, apps followed **Fetch-on-Render**:
1. Download JS chunk.
2. Render `<Parent />`.
3. `Parent` runs `useEffect` and fetches data (1s wait).
4. `Parent` finishes and renders `<Child />`.
5. `Child` runs `useEffect` and fetches data (1s wait).
*(Total: 2 seconds wait!)*

**Data APIs (Render-as-You-Fetch):**
Routes define a `loader` function. When the user navigates to `/users/123`, React Router fetches data **in parallel while the component is loading/rendering**, completely eliminating the waterfall!

```tsx
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';

// 1. Loader runs BEFORE the component renders
export async function userLoader({ params }: LoaderFunctionArgs) {
  const res = await fetch(`/api/users/${params.userId}`);
  if (!res.ok) throw new Response('User Not Found', { status: 404 });
  return res.json();
}

// 2. Component reads data synchronously
export function UserProfile() {
  const user = useLoaderData() as { id: string; name: string };
  return <h1>{user.name}</h1>;
}
```

---

### Q8: How does `useNavigation()` coordinate Global Loading Indicators?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import { useNavigation } from 'react-router-dom';

export function RootLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';

  return (
    <div>
      {isNavigating && <div className="top-progress-bar" />}
      <header>My App</header>
      <Outlet />
    </div>
  );
}
```
`navigation.state` has three values: `'idle'`, `'loading'` (loader running), or `'submitting'` (action running). This enables smooth top progress bars like YouTube and GitHub without manual state!

---

## 5. Advanced Routing: Search Params & Code Splitting

### Q9: URL Search Params as State (`useSearchParams`)
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import { useSearchParams } from 'react-router-dom';

export function ProductCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCategory = searchParams.get('category') || 'all';
  const page = Number(searchParams.get('page') || '1');

  const updateCategory = (newCat: string) => {
    // Preserve existing query params while updating category
    setSearchParams((prev) => {
      prev.set('category', newCat);
      prev.set('page', '1'); // Reset to page 1 on filter change
      return prev;
    });
  };

  return (
    <div>
      <p>Category: {currentCategory} | Page: {page}</p>
      <button onClick={() => updateCategory('electronics')}>Electronics</button>
    </div>
  );
}
```

---

### Q10: How do you handle Route-based Code Splitting with Suspense?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding

```tsx
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
]);
```

---

## 🎯 Quick-Fire Round

1. **What happens on a page refresh in an SPA on an unconfigured static server?**  
   *It returns a 404 error because the static server tries to locate a physical file matching `/dashboard` instead of serving `index.html`.*
2. **How do you fix SPA 404s on static hosts (Netlify, Vercel, S3)?**  
   *Add a rewrite rule mapping `/*` to `/index.html`.*
3. **What is the difference between `useParams` and `useSearchParams`?**  
   *`useParams` extracts URL path tokens (`/users/:id`), while `useSearchParams` extracts query strings (`?category=books`).*
4. **How do you create a 404 catch-all route in React Router?**  
   *Add `{ path: '*', element: <NotFoundPage /> }` as the last child route.*
5. **Does `navigate(-1)` go back in history?**  
   *Yes, it is equivalent to the browser Back button.*
6. **Can loaders throw responses to trigger error elements?**  
   *Yes, throwing `new Response('Forbidden', { status: 403 })` activates the route's `errorElement`.*
7. **What is `<ScrollRestoration />` in React Router?**  
   *A component that automatically restores scroll position on Back/Forward navigation.*
8. **Can you read `location.state` across browser sessions?**  
   *It survives page refreshes in the current tab, but is lost if the URL is copied to a new window.*
9. **What is React Router v7?**  
   *The unification of React Router and Remix into a single unified framework.*
10. **Why should you pass a function to `setSearchParams`?**  
    *To safely read and mutate the previous search parameters without wiping out unrelated query keys.*

---

> **Next:** [07 — Forms & Validation Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/07-forms-qa.md)
