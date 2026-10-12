# 15 — Behavioral & System Design in React Interview Questions & Answers

> Frontend System Design frameworks (Infinite Scroll Feed, Real-time Chat, 15-Widget Independent Dashboard, Multi-tenant RBAC), debugging disaster scenarios, code review patterns, and senior behavioral STAR responses.

---

## 📑 Table of Contents
1. [Frontend System Design Framework (RADIO Method)](#1-frontend-system-design-framework-radio-method)
2. [System Design: Infinite Scroll Feed (Twitter/Instagram)](#2-system-design-infinite-scroll-feed-twitterinstagram)
3. [System Design: Real-Time Chat Application](#3-system-design-real-time-chat-application)
4. [System Design: Dashboard with 15 Independent Widgets](#4-system-design-dashboard-with-15-independent-widgets)
5. [Disaster Debugging Scenarios](#5-disaster-debugging-scenarios)
6. [Code Review Scenarios](#6-code-review-scenarios)
7. [Senior Behavioral Questions (STAR Method)](#7-senior-behavioral-questions-star-method)
8. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Frontend System Design Framework (RADIO Method)

### Q1: What structured framework should you use for Frontend System Design interviews?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design Methodology

**Answer:**
Never jump straight into writing code. Follow the **RADIO framework** (or similar structured approach):

```text
┌────────────────────────────────────────────────────────┐
│ R - Requirements Clarification (Functional & Non-Func) │
│ A - Architecture & High-Level Component Diagram        │
│ D - Data Model & API Contract Design                   │
│ I - Interface / Component Hierarchy & State Strategy   │
│ O - Optimizations, Edge Cases, Accessibility, Security │
└────────────────────────────────────────────────────────┘
```

1. **Requirements (5 min):** Clarify scope. Mobile vs Desktop? Offline support? Real-time or polling? Target latency budget?
2. **Architecture (5 min):** High-level data flow (Client <-> API Gateway <-> WebSockets/CDN).
3. **Data Model (5 min):** Shape of entities, caching keys, normalizations.
4. **Interface (15 min):** Component breakdown, state ownership (UI vs Server state), custom hooks.
5. **Optimizations (10 min):** Virtualization, race condition prevention, optimistic UI, bundle splitting, error recovery.

---

## 2. System Design: Infinite Scroll Feed (Twitter/Instagram)

### Q2: System Design: Architect an Infinite Scroll Feed
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Frontend System Design

**Answer Breakdown:**

#### 1. Requirements & Bottlenecks
- Infinite pagination as user scrolls down.
- Maintain smooth 60fps scrolling without DOM node explosion (thousands of tweets).
- Preserve scroll position if user navigates away and clicks "Back".

#### 2. Architecture & Data Fetching
- **Cursor-based Pagination:** Using `cursor` timestamps/IDs instead of `page` numbers (avoids duplicate/missing posts when new tweets are inserted at the top).
- **Tool:** TanStack Query `useInfiniteQuery`.

#### 3. DOM Optimization: Virtualization
- Use `@tanstack/react-virtual` with dynamic row height measurement (`measureElement`).
- Only ~15 feed items rendered in DOM simultaneously. Unmounted items above and below are replaced with CSS spacer heights.

#### 4. Component Hierarchy
```text
<FeedContainer>
  ├── <FeedHeader />
  ├── <NewTweetsFloatingBanner /> (Shows "12 new tweets", clicks to scroll top)
  └── <VirtualFeedList>
        ├── <FeedItem key={tweet.id}>
        │     ├── <UserAvatar />
        │     ├── <TweetContent />
        │     └── <LikeButton optimistic />
        └── <InfiniteScrollSentinel ref={observerRef} />
```

#### 5. Scroll Restoration & Caching
- Cache feed pages in memory using TanStack Query `staleTime: Infinity`.
- Store scroll position via browser `history.state` or `sessionStorage` on navigation.

---

## 3. System Design: Real-Time Chat Application

### Q3: System Design: Build a Real-Time Slack/WhatsApp Chat Interface in React
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Frontend System Design

**Key Architectural Pillars:**

#### 1. Protocol Architecture
- **WebSockets (`wss://`)** for bidirectional instant messaging, typing indicators, and presence status (online/offline).
- **REST API** for initial historical message fetch and file attachments (images/videos).

#### 2. Local State & Store Management (Zustand + IndexedDB)
- Store messages in an in-memory Zustand store indexed by channel ID: `Record<ChannelId, Message[]>`.
- Persist messages locally to **IndexedDB** (via Dexie.js) for instant offline startup and message history search.

#### 3. Resilience & Reconnection
- Heartbeat / Ping-Pong mechanism every 30 seconds.
- **Exponential Backoff Reconnect:** If connection drops, retry at 1s, 2s, 4s, 8s intervals with jitter.
- **Message Queuing:** If the user sends a message while offline, assign a temporary UUID, queue it in `outboxQueue`, render it in the chat with a "pending ⏳" clock icon, and drain the queue upon socket reconnect.

#### 4. Auto-Scroll & Viewport Mechanics
- Standard chat anchors to the bottom. If the user has scrolled up to read older messages, **do NOT auto-scroll down** on new incoming messages! Display a "New messages below ↓" floating chip instead.

---

## 4. System Design: Dashboard with 15 Independent Widgets

### Q4: System Design: "Architect a complex analytics dashboard with 15 widgets that independently fetch data."
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design & Resilience

**Core Challenges:**
1. Slow widget must not block fast widgets.
2. One failing widget must not crash the entire dashboard.
3. Network congestion: 15 simultaneous HTTP requests overload the browser HTTP/1.1 connection limit (max 6 parallel requests per domain).

**The Architectural Solution:**

```text
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD SHELL (Layout, DatePicker Filter, Refresh Control)│
└─────────────────────────────────────────────────────────────┘
  ├── <WidgetContainer (Widget 1)> ──► <ErrorBoundary> + <Suspense>
  ├── <WidgetContainer (Widget 2)> ──► <ErrorBoundary> + <Suspense>
  └── ...
```

1. **HTTP/2 or HTTP/3 Multiplexing:** Ensure backend supports HTTP/2 so all 15 requests stream concurrently over a single TCP connection without head-of-line blocking.
2. **Layered Error Boundaries per Widget:** Wrap **each individual widget** in its own `<ErrorBoundary>` with a retry button. If Widget 7 throws a chart rendering error, Widgets 1-6 and 8-15 remain fully interactive.
3. **Decoupled Data Fetching:** Each widget calls its own custom hook (`useWidgetAnalytics({ dateRange })`) using TanStack Query.
4. **Shared Filter Synchronization:** Place global date pickers and workspace IDs in URL search params (`useSearchParams`), causing all widgets to automatically react to filter changes independently.

---

## 5. Disaster Debugging Scenarios

### Q5: "The app works locally in development, but renders a completely blank white screen in production after deployment. Walk me through how you troubleshoot."
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Production Troubleshooting

**Troubleshooting Steps:**
1. **Open Browser DevTools Console:** Check for unhandled runtime errors. Production React throws minified error codes (e.g., `Error: Minified React error #130; visit https://reactjs.org/...`). Paste the URL to decode the error message.
2. **Inspect the Network Tab:**
   - Are JavaScript/CSS bundles returning `404 Not Found`? (Mismatched base public path or incorrect CDN asset configuration).
   - Are bundle files returning `index.html`? (Common SPA misconfiguration where JS files are rewritten to HTML).
3. **Check Environment Variables:** Did code try to read `process.env.API_URL` directly instead of `import.meta.env.VITE_API_URL`? If unconfigured, reading properties on `undefined` causes a fatal top-level script crash before React mounts.
4. **Inspect Route Rewrites:** If navigating directly to `/dashboard`, did the hosting provider (Vercel/Netlify/S3) return a 404 because SPA fallback rules were missing?
5. **CORS / Content Security Policy (CSP):** Check if a strict CSP header blocked execution of external chunks or inline scripts.

---

### Q6: "A component re-renders 30 times per second, freezing the browser. How do you find the root cause?"
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debugging Methodology

**Diagnosis:**
1. **React DevTools Profiler:** Record a snapshot. Turn on *"Record why each component rendered while profiling"*.
2. **Check for state updates during render:**
   - Look for an accidental inline function execution in JSX: `onClick={handleClick()}` instead of `onClick={handleClick}`!
3. **Check for `useEffect` without proper dependencies:**
   - An effect that updates a state variable (`setCount`) while depending on that same state variable without a condition or functional updater.
4. **Check for unstable object/array references:**
   - An effect depending on an inline object `[ { filter } ]` or an unmemoized callback created fresh on every render.
5. **Console Log Tracker:**
   ```jsx
   useEffect(() => {
     console.count('Rendered MyComponent');
   });
   ```

---

## 6. Code Review Scenarios

### Q7: Code Review Challenge: What is wrong with this PR?
**Difficulty:** 🟡 Mid  
**Type:** 🧐 Code Review

```jsx
// PR Submitted by Junior Developer:
function ProductDetail({ product }) {
  const [discountedPrice, setDiscountedPrice] = useState(0);

  useEffect(() => {
    if (product.hasDiscount) {
      setDiscountedPrice(product.price * 0.8);
    } else {
      setDiscountedPrice(product.price);
    }
  }, [product]);

  return (
    <div>
      <h2>{product.name}</h2>
      <p>Price: ${discountedPrice}</p>
    </div>
  );
}
```

**Senior Code Review Feedback:**
> *"Hi! We should avoid using `useState` and `useEffect` for **derived state** here.*
>
> **Problems:**
> 1. **Redundant Re-render:** The component renders with `discountedPrice = 0`, paints to the screen, then immediately triggers `useEffect`, calling `setDiscountedPrice`, which forces an unnecessary second re-render.
> 2. **Stale/Flickering UI:** For a split second, the user sees `Price: $0`.
>
> **The Fix:**
> Compute it directly during the render pass as a pure constant. It's cleaner, faster, and zero boilerplate:
> ```jsx
> function ProductDetail({ product }) {
>   const discountedPrice = product.hasDiscount ? product.price * 0.8 : product.price;
>   return (
>     <div>
>       <h2>{product.name}</h2>
>       <p>Price: ${discountedPrice}</p>
>     </div>
>   );
> }
> ```

---

## 7. Senior Behavioral Questions (STAR Method)

### Q8: "Tell me about a challenging React performance issue you diagnosed and fixed."
**Difficulty:** 🔴 Senior  
**Type:** 🗣️ Behavioral (STAR Method)

**Model Answer:**
- **Situation:** *"In my previous SaaS dashboard, customers reported significant typing latency in a critical search and filtering grid containing 8,000 inventory items on mobile tablets."*
- **Task:** *"My objective was to reduce keystroke response latency to under 16ms (60fps) without compromising data freshness."*
- **Action:** *"I profiled the interaction using Chrome Performance and the React Profiler. I identified two primary bottlenecks: first, the table rendered all 8,000 DOM nodes at once. Second, the search text input state was located in the parent container, re-rendering all rows on every keystroke. I implemented `@tanstack/react-virtual` to window the table to only 25 visible rows, and used React 18's `useTransition` to decouple the urgent typing update from the non-urgent filtered dataset calculation."*
- **Result:** *"Input latency dropped from 320ms down to 8ms. Frame rate remained locked at 60fps, and CPU utilization decreased by 85%."*

---

### Q9: "How do you decide when to adopt a new library versus building an in-house solution?"
**Difficulty:** 🔴 Senior  
**Type:** 🗣️ Behavioral / Engineering Judgment

**Model Answer:**
*"I use a structured 4-part evaluation matrix:*
1. **Core Competency vs Commodity:** Is this unique to our core business value? (If we are building an e-commerce platform, writing our own datepicker or table virtualization library is a waste of engineering time; using Radix or TanStack Table is optimal).
2. **Maintenance & Total Cost of Ownership (TCO):** Writing an accessible modal or dropdown from scratch requires managing ARIA tags, focus trapping, screen readers, keyboard navigation, and browser quirks. A battle-tested headless primitive has solved edge cases we haven't even thought of.
3. **Bundle Size & Health:** I inspect weekly downloads, commit activity, open issue triage velocity, and bundle impact via Bundlephobia.
4. **Exit Strategy:** If a library is chosen, we wrap it behind an internal adapter interface so our codebase depends on our contract, making future migration trivial.*"

---

## 🎯 Quick-Fire Round

1. **What is the STAR method?**  
   *Situation, Task, Action, Result—the standard structure for answering behavioral interview questions.*
2. **What is Head-of-Line (HoL) blocking?**  
   *When a slow HTTP/1.1 request delays all subsequent requests queued on the same TCP connection.*
3. **What is Web Vitals LCP?**  
   *Largest Contentful Paint: measures perceived loading speed (target < 2.5s).*
4. **What is Web Vitals INP?**  
   *Interaction to Next Paint: measures page responsiveness to user actions (target < 200ms).*
5. **What is Web Vitals CLS?**  
   *Cumulative Layout Shift: measures visual stability of page elements during load (target < 0.1).*
6. **How do you prevent CLS for dynamic images?**  
   *Always specify explicit `width` and `height` aspect ratio placeholders on image wrappers.*
7. **What is Graceful Degradation?**  
   *Ensuring core features function on older browsers or poor network conditions even if advanced animations fail.*
8. **What is Rollback strategy in deployments?**  
   *The ability to instantly revert to the previous production container/bundle within seconds if error rates spike.*
9. **Why are feature flags useful in frontend development?**  
   *They decouple code deployment from feature release, enabling canary rollouts and instant kills if bugs arise.*
10. **What is the most important skill for a Senior Frontend Engineer?**  
    *Balancing user experience, engineering maintainability, and business delivery timelines while mentoring the team.*

---

## 🏁 Summary Checklist

| # | File | Core Focus |
|---|---|---|
| 01 | [`01-fundamentals-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/01-fundamentals-qa.md) | VDOM, JSX, Synthetic Events, Keys, Lists |
| 02 | [`02-state-and-lifecycle-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/02-state-and-lifecycle-qa.md) | Batching, Immutability, Fiber Phases, Effects |
| 03 | [`03-hooks-deep-dive-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/03-hooks-deep-dive-qa.md) | Hook Internals, Reducers, Concurrency, React 19 Hooks |
| 04 | [`04-advanced-patterns-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/04-advanced-patterns-qa.md) | HOCs, Compound Components, Portals, Error Boundaries |
| 05 | [`05-state-management-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/05-state-management-qa.md) | State Categorization, Context, RTK, Zustand, Jotai |
| 06 | [`06-routing-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/06-routing-qa.md) | History API, Outlets, Guards, Route Loaders |
| 07 | [`07-forms-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/07-forms-qa.md) | Performance, React Hook Form, Zod, Accessibility |
| 08 | [`08-data-fetching-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/08-data-fetching-qa.md) | Fetch Gotchas, Axios Interceptors, TanStack Query |
| 09 | [`09-styling-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/09-styling-qa.md) | CSS Modules, Tailwind JIT, `cn()`, CVA, Dark Mode |
| 10 | [`10-testing-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/10-testing-qa.md) | Testing Trophy, RTL Queries, MSW, Playwright |
| 11 | [`11-performance-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/11-performance-qa.md) | Render Pipeline, Memoization, Virtualization, Profiling |
| 12 | [`12-typescript-react-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/12-typescript-react-qa.md) | Typing Props, Generics, Polymorphic `as`, Unions |
| 13 | [`13-real-world-patterns-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/13-real-world-patterns-qa.md) | Folder Architecture, Security, Docker, Vite Env |
| 14 | [`14-ecosystem-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/14-ecosystem-qa.md) | Vite vs Webpack, Next.js, shadcn/ui, Framer Motion |
| 15 | [`15-behavioral-and-system-design-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/15-behavioral-and-system-design-qa.md) | Frontend System Design, Scenarios, Code Reviews, STAR |
| 16 | [`16-react-17-18-19-features-qa.md`](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/16-react-17-18-19-features-qa.md) | React 17-19 Features, Concurrency, Actions, RSC, Compiler |

---

> **Next:** [16. React 17, 18 & 19 Evolution →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/16-react-17-18-19-features-qa.md)

