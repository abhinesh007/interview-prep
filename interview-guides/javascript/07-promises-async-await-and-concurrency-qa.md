# 07 — Asynchronous JavaScript, Promises & Concurrency Control

> Deep dive into the Promises/A+ state machine, reaction records, the four combinators (`all`, `allSettled`, `race`, `any`), `async`/`await` coroutine desugaring, request cancellation with `AbortController`, and practical concurrency limiters.

---

## 📑 Table of Contents
1. [Promise Architecture Under the Hood](#1-promise-architecture-under-the-hood)
2. [Promise Combinators: The Core Four](#2-promise-combinators-the-core-four)
3. [`async` / `await` Mechanics & Anti-Patterns](#3-async--await-mechanics--anti-patterns)
4. [Cancellation & Concurrency Control](#4-cancellation--concurrency-control)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Promise Architecture Under the Hood

### Q1: What is a Promise under the hood according to the Promises/A+ specification?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[Promises]` `[Promises/A+]` `[State-Machine]` `[Microtasks]`

**Answer:**
A **Promise** is a state machine representing the eventual completion (or failure) of an asynchronous operation.
Internally in V8, a Promise object contains three primary internal slots:
1. **`[[PromiseState]]`:** Starts in `"pending"`. Transitions irrevocably to `"fulfilled"` or `"rejected"`. Once settled, it cannot change state again.
2. **`[[PromiseResult]]`:** Holds the resolved value or rejection reason. Initialized to `undefined`.
3. **`[[PromiseFulfillReactions]]` / `[[PromiseRejectReactions]]`:** Lists of reaction records containing callbacks registered via `.then()`, `.catch()`, or `.finally()`.

```text
┌────────────────────────────────────────────────────────┐
│               Promise Internal State Machine           │
├────────────────────────────────────────────────────────┤
│                      [[PromiseState]]                  │
│                         "pending"                      │
│                             │                          │
│            ┌────────────────┴────────────────┐         │
│            ▼ resolve(value)                  ▼ reject  │
│       "fulfilled"                       "rejected"     │
│   [[PromiseResult]] = val           [[PromiseResult]] = err
│            │                                 │         │
│            ▼                                 ▼         │
│   [Schedule Microtask]              [Schedule Microtask]
│   Fulfill Reaction Callbacks        Reject Reaction Callbacks
└────────────────────────────────────────────────────────┘
```

When `.then(onFulfilled, onRejected)` is called:
- If the promise is still `pending`, the callbacks are pushed onto the internal reaction lists.
- If the promise is already settled, a microtask is queued immediately via `EnqueueJob` to execute the callback on the next turn.
- `.then()` always returns a **brand-new Promise**, enabling chaining.

---

## 2. Promise Combinators: The Core Four

### Q2: Compare `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`. When would you choose each?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Comparison  
**Tags:** `[Promise-Combinators]` `[Promise.all]` `[Promise.allSettled]` `[Promise.any]`

**Answer:**

| Combinator | Settlement Condition | Rejection Condition | Failure Handling | Best Use Case |
|---|---|---|---|---|
| **`Promise.all`** | Fulfilled when **ALL** fulfill. | Rejects immediately if **ANY** single promise rejects. | **Fail-fast:** Aborts waiting on others. | Critical parallel dependencies where missing one invalidates all (e.g., loading user profile + auth tokens). |
| **`Promise.allSettled`** | Settles when **ALL** have either fulfilled or rejected. | **Never rejects.** | Returns array of `{ status, value/reason }`. | Non-critical widgets or batch operations where partial success is acceptable. |
| **`Promise.race`** | Settles as soon as the **FIRST** promise settles (fulfilled OR rejected). | Rejects if first settled promise rejects. | Follows first settled outcome. | Network timeout race (`Promise.race([fetchData(), timeout(5000)])`). |
| **`Promise.any`** | Fulfilled as soon as the **FIRST** promise fulfills. | Rejects only if **ALL** promises reject. | Throws `AggregateError` if all fail. | Multi-mirror CDN fetching (first successful mirror wins; ignore failures unless all fail). |

```javascript
// Example: Safe Dashboard Loading using Promise.allSettled
const [profile, stats, notifications] = await Promise.allSettled([
  fetchProfile(),
  fetchStats(),
  fetchNotifications()
]);

const userProfile = profile.status === "fulfilled" ? profile.value : defaultProfile;
```

---

## 3. `async` / `await` Mechanics & Anti-Patterns

### Q3: What is `async/await` under the hood, and what is the "Async Waterfall" anti-pattern?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Architecture  
**Tags:** `[Async-Await]` `[Generators]` `[Async-Waterfall]` `[Performance]`

**Answer:**
`async/await` is syntactic sugar built on top of **Generator functions (`function*`) and Promises**.
When the engine encounters `await expr`:
1. It pauses execution of the `async` function.
2. It wraps `expr` in `Promise.resolve(expr)`.
3. It attaches a `.then()` handler to resume the function generator when the promise settles.
4. It yields execution back to the caller / event loop.

### The Async Waterfall Anti-Pattern:
Serializing independent network requests by using `await` inside sequential loops:

```javascript
// ❌ ANTI-PATTERN: Async Waterfall (Sequential Execution)
// Total latency = Time(A) + Time(B) + Time(C) = 1500ms
async function fetchDashboardData(userIds) {
  const users = [];
  for (const id of userIds) {
    users.push(await api.fetchUser(id)); // Waits for each request before starting next!
  }
  return users;
}

// ✅ HIGH-PERFORMANCE: Concurrent Execution
// Total latency = Max(Time(A), Time(B), Time(C)) = 500ms
async function fetchDashboardDataConcurrent(userIds) {
  const promises = userIds.map(id => api.fetchUser(id));
  return await Promise.all(promises);
}
```

---

## 4. Cancellation & Concurrency Control

### Q4: How does `AbortController` enable asynchronous cancellation in modern JavaScript?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[AbortController]` `[AbortSignal]` `[Cancellation]` `[Fetch]`

**Answer:**
Native JavaScript Promises are not cancelable once started. The standard web platform mechanism for cancellation is **`AbortController`** and its companion **`AbortSignal`**.

```javascript
// 1. Cancelling a Fetch Request on User Action or Timeout
const controller = new AbortController();

const timeoutId = setTimeout(() => {
  controller.abort(new Error("Request timed out after 5000ms"));
}, 5000);

try {
  const response = await fetch("/api/heavy-report", {
    signal: controller.signal // Informs fetch to abort if signal triggers
  });
  clearTimeout(timeoutId);
  return await response.json();
} catch (err) {
  if (err.name === "AbortError") {
    console.warn("Request was aborted:", err.message);
  } else {
    throw err;
  }
}
```

```javascript
// 2. Automatic Event Listener Cleanup using AbortSignal
const controller = new AbortController();

// Both listeners will be automatically detached when controller.abort() is called!
window.addEventListener("resize", onResize, { signal: controller.signal });
window.addEventListener("scroll", onScroll, { signal: controller.signal });

// Later, on component unmount:
controller.abort();
```

---

### Q5: Implement an Asynchronous Concurrency Limiter (`pLimit(concurrency)`) from scratch.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Concurrency-Limiter]` `[pLimit]` `[Queue]` `[Promises]`

**Answer:**
```javascript
function pLimit(concurrency) {
  const queue = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const nextTask = queue.shift();
      nextTask();
    }
  };

  const run = async (fn, resolve, reject, args) => {
    activeCount++;
    try {
      const result = await fn(...args);
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      next();
    }
  };

  return function enqueue(fn, ...args) {
    return new Promise((resolve, reject) => {
      const task = () => run(fn, resolve, reject, args);
      if (activeCount < concurrency) {
        task();
      } else {
        queue.push(task);
      }
    });
  };
}

// Usage Example:
const limit = pLimit(3); // Max 3 network requests at once
const urls = Array.from({ length: 20 }, (_, i) => `/api/item/${i}`);

const results = await Promise.all(
  urls.map(url => limit(() => fetch(url).then(r => r.json())))
);
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What happens if you resolve a Promise with another Promise?
**Difficulty:** 🟡 Mid | **Type:** 📖 Specifications  
**Answer:** The outer Promise does not resolve immediately with the inner promise object; it **adopts the state** of the passed Promise. The outer promise remains pending until the inner promise settles, unwrapping recursively.

### Q7: When is `return await myPromise` useful instead of just `return myPromise`?
**Difficulty:** 🟡 Mid | **Type:** 🐛 Debug & Bug Hunting  
**Answer:** Inside a `try/catch` block, you **must** use `return await myPromise` if you want the local `catch` block to intercept potential rejections. If you write `return myPromise`, the function returns the pending promise immediately to its caller, bypassing the local `catch` block!

### Q8: What triggers an `unhandledrejection` event?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:** An `unhandledrejection` event is dispatched on `window` (or `process.on('unhandledRejection')` in Node.js) whenever a Promise rejects and there is no `.catch()` or rejection handler attached within that event loop turn.
