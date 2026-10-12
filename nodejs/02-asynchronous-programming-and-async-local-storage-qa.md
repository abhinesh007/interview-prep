# 02 — Asynchronous Programming & AsyncLocalStorage

> Promises, `async`/`await` Microtask Chains, `AsyncLocalStorage` Context Tracking, Context Loss Gotchas, and `AbortSignal` Cancellation.

---

## 📑 Table of Contents
1. [Asynchronous Mechanics & Evolution](#1-asynchronous-mechanics--evolution)
2. [Promise Concurrency Patterns & Rate-Limiting](#2-promise-concurrency-patterns--rate-limiting)
3. [AsyncLocalStorage (ALS) & Request Context](#3-asynclocalstorage-als--request-context)
4. [Cancellation with AbortController & AbortSignal](#4-cancellation-with-abortcontroller--abortsignal)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Asynchronous Mechanics & Evolution

### Q1: How does `async`/`await` execute under the hood in V8, and how does it map to the microtask queue?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[AsyncAwait]` `[V8]` `[Microtasks]`

**Answer:**
`async`/`await` is syntactic sugar built on top of ECMAScript Promises and Generators. An `async` function always returns a Promise. When the V8 engine encounters an `await` expression:

1. It evaluates the expression to the right of `await`.
2. It wraps the result in `Promise.resolve(result)`.
3. It pauses the execution of the async function and attaches the remainder of the function as a `.then()` continuation callback to the Promise microtask queue.
4. It yields execution control back to the caller (or back to the event loop if the caller was top-level).
5. When the awaited Promise settles, the continuation callback is scheduled in V8's microtask queue.

```text
async function processOrder() {
  console.log('A: Before await');
  await validateStock();
  console.log('B: After await'); // Resumes as a Promise microtask!
}

console.log('1: Start');
processOrder();
console.log('2: End');
```

**Output:**
```text
1: Start
A: Before await
2: End
B: After await
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does `await` introduce an event loop tick or just a microtask tick?"  
*Senior Answer:* It only introduces a **microtask tick**, not an event loop tick. The event loop does not need to cycle through Timers, Poll, or Check phases. As soon as the synchronous call stack empties, V8 drains the microtask queue, immediately resuming execution of the post-await block.

---

### Q2: Why is using `Array.prototype.forEach` with an `async` callback considered a critical bug in Node.js?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[AsyncAwait]` `[Arrays]` `[Gotcha]`

**Answer:**
`Array.prototype.forEach` expects a synchronous callback function and ignores the returned value. When you pass an `async` function to `forEach`, it returns a Promise on every iteration, but `forEach` does not `await` it.

#### The Buggy Code:
```javascript
// BUG: Fire-and-forget concurrency with unhandled ordering
async function sendBatchEmails(users) {
  users.forEach(async (user) => {
    await emailClient.send(user.email); // Executes concurrently, unawaited!
  });
  console.log('All emails sent!'); // Prints IMMEDIATELY before any email finishes!
}
```

#### The Consequences:
1. **Broken Control Flow:** `console.log('All emails sent!')` runs before any emails are actually dispatched.
2. **Unhandled Promise Rejections:** If `emailClient.send()` throws an error, it cannot be caught by a `try/catch` block wrapping `forEach`, causing an unhandled rejection that crashes the process in Node 15+.
3. **Thundering Herd:** If the array contains 1,000 users, 1,000 requests fire simultaneously, overwhelming downstream services.

#### The Mitigations:
```typescript
// Pattern 1: Sequential processing (one by one)
for (const user of users) {
  await emailClient.send(user.email);
}

// Pattern 2: Parallel execution (all at once with error aggregation)
await Promise.all(users.map(user => emailClient.send(user.email)));
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if you need to run tasks concurrently, but with a concurrency limit of 5 at a time?"  
*Senior Answer:* Neither `for...of` (concurrency 1) nor `Promise.all` (concurrency $N$) works. You must use a concurrency pool pattern (`p-limit` or worker pool queue) to throttle active asynchronous promises.

---

## 2. Promise Concurrency Patterns & Rate-Limiting

### Q3: Compare `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`. When does each fail, and what are their memory implications?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Promises]` `[Concurrency]`

**Answer:**

| Method | Resolution Condition | Rejection Condition | Fail-Fast? | Primary Use Case |
|---|---|---|---|---|
| `Promise.all()` | All promises fulfill | Any single promise rejects | ✅ Yes | Dependent tasks where all must succeed |
| `Promise.allSettled()` | All promises settle (fulfill or reject) | Never rejects | ❌ No | Independent batch jobs; reporting status |
| `Promise.race()` | First promise to settle (fulfill or reject) | First promise to reject (if rejection is first) | ✅ Yes | Network timeouts; fastest responder |
| `Promise.any()` | First promise to fulfill | All promises reject (`AggregateError`) | ❌ Waits for first success | Redundant fallback mirrors; multi-region read |

#### Memory Retention Gotcha in `Promise.all()`:
If one promise rejects early in `Promise.all([p1, p2, p3])`, `Promise.all` rejects **immediately**. However, the remaining promises (`p2`, `p3`) **continue running in the background**; they are not cancelled! If those operations hold large memory buffers, that memory cannot be garbage-collected until those promises finish.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you actually cancel the pending sibling promises when one fails in `Promise.all()`?"  
*Senior Answer:* Combine `Promise.all` with an `AbortController`. When an error is caught, invoke `controller.abort()`, passing the `signal` to the remaining async operations (e.g., `fetch(url, { signal })`).

---

### Q4: Implement a production-ready asynchronous concurrency pool (`pLimit`) from scratch in TypeScript.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Concurrency]` `[TypeScript]` `[Algorithms]`

**Answer:**

```typescript
export function pLimit(concurrency: number) {
  if (concurrency < 1) {
    throw new TypeError('Concurrency must be at least 1');
  }

  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const runNextTask = queue.shift();
      runNextTask?.();
    }
  };

  const run = async <T>(
    fn: () => Promise<T>,
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void
  ) => {
    activeCount++;
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      next();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const task = () => run(fn, resolve, reject);

      if (activeCount < concurrency) {
        task();
      } else {
        queue.push(task);
      }
    });
  };
}

// Usage:
const limit = pLimit(2);
const urls = ['/api/1', '/api/2', '/api/3', '/api/4'];
const results = await Promise.all(
  urls.map(url => limit(() => fetch(url).then(r => r.json())))
);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a task in the queue throws a synchronous exception before returning a promise?"  
*Senior Answer:* In the implementation above, `task` invokes `run`, which wraps `fn()` inside a `try/catch` block. Even if `fn()` throws synchronously, `reject(error)` is called, and the `finally` block guarantees `next()` executes, preventing deadlock in the concurrency counter.

---

## 3. AsyncLocalStorage (ALS) & Request Context

### Q5: What problem does `AsyncLocalStorage` solve, and why do ThreadLocal patterns from other languages fail in Node.js?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[AsyncLocalStorage]` `[Architecture]` `[Context]`

**Answer:**
In multi-threaded languages (like Java or C#), a thread processes a single HTTP request from start to finish. You can attach user identity and trace IDs to a **ThreadLocal variable**.

In Node.js, a single thread handles thousands of concurrent requests interleaved across asynchronous ticks:

```text
Request 1: [ Receive HTTP ] ──► (Awaits Database) ───────► [ Send Response ]
                                         ▲
Request 2:              [ Receive HTTP ] ┼──► (Awaits Redis) ─► [ Send Response ]
```
If you store `currentUserId` in a global or module-scoped variable, Request 2 will overwrite Request 1's value while Request 1 is waiting for its database query!

**`AsyncLocalStorage`** (`node:async_hooks`) provides an asynchronous execution context store. It hooks into V8's promise execution graph to preserve context references across `await`, callbacks, and timers.

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
  userId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// Fastify / Express Middleware
export function contextMiddleware(req, res, next) {
  const context: RequestContext = {
    requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    userId: req.headers['x-user-id']
  };

  // Run the rest of the request within this isolated asynchronous context
  requestContextStorage.run(context, () => {
    next();
  });
}

// Anywhere deep in the application stack (Service, ORM, Logger):
export function logWithContext(message: string) {
  const ctx = requestContextStorage.getStore();
  console.log(`[Req: ${ctx?.requestId ?? 'NONE'}] ${message}`);
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does the performance of `AsyncLocalStorage` in Node 20 and 22 compare to older Node versions?"  
*Senior Answer:* In Node 12–14, `async_hooks` carried a 15–30% performance penalty on promise resolution throughput due to V8 tracking hooks. In Node 20/22, V8 integrated native C++ promise execution context hooks, dropping ALS overhead to negligible levels (<1–2%), making it production-standard for OpenTelemetry and structured logging.

---

### Q6: What is the dangerous difference between `als.run()` and `als.enterWith()`, and how does `enterWith()` cause cross-request context leaks?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[AsyncLocalStorage]` `[ContextLeak]` `[Gotcha]`

**Answer:**

- **`als.run(store, callback)`:** Scopes the store **strictly to the callback** and any asynchronous operations initiated inside it. Once the callback completes, the previous context is restored.
- **`als.enterWith(store)`:** Transitions the current synchronous execution context to the new store for the rest of the current turn and future asynchronous turns.

#### The Catastrophic `enterWith()` Bug:
```javascript
// DANGEROUS PATTERN in Express middleware:
app.use((req, res, next) => {
  // Sets the store for the current execution turn
  asyncLocalStorage.enterWith({ userId: req.headers['x-user-id'] });
  next();
});
```

**Why this causes production data leaks:**
If `next()` calls a synchronous middleware that encounters an unhandled error, or if an event listener triggers in the same event loop tick, the store entered via `enterWith` leaks into completely unrelated HTTP requests processed on that same tick. Users will suddenly see other users' tenant IDs or audit logs!

**Senior Rule:** Never use `enterWith()` in web server middleware. Always use `als.run()`.

---

### Q7: When does `AsyncLocalStorage` lose its context, and how do you fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[AsyncLocalStorage]` `[ContextLoss]`

**Answer:**
`AsyncLocalStorage` loses context when code bridges into APIs that do not properly propagate V8 async resources.

#### Common Causes of Context Loss:
1. **Unwrapped Event Listeners:** Long-lived `EventEmitter` instances (like a shared Kafka or Redis client). The listener callback executes in the context where the event was emitted, NOT where `.on()` was registered.
2. **Old C++ Addons or Native Callback Libraries:** Libraries bypassing Libuv's `AsyncResource` APIs.
3. **Userland Queues / In-memory Schedulers:** If task scheduling disassociates callback invocation from the submitting context.

#### The Fix: `AsyncResource.bind()`
```typescript
import { AsyncResource } from 'node:async_hooks';

// Bind callback to current async context
const boundCallback = AsyncResource.bind((data) => {
  // Context is guaranteed to be preserved here
  const store = asyncLocalStorage.getStore();
  console.log('TraceId inside event:', store?.traceId);
});

eventEmitter.on('external_event', boundCallback);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does OpenTelemetry propagate trace context across network calls?"  
*Senior Answer:* ALS preserves context *within* the single Node.js process. When making outbound HTTP or gRPC calls, OpenTelemetry injects the active trace context into outbound network headers (W3C `traceparent` header). The downstream service reads the header and initializes its own local ALS store.

---

## 4. Cancellation with AbortController & AbortSignal

### Q8: How do you implement distributed request timeout cancellation across downstream calls using `AbortSignal` in modern Node.js?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[AbortSignal]` `[Timeouts]` `[Resilience]`

**Answer:**

```typescript
export async function fetchUserDashboard(
  userId: string,
  clientTimeoutMs = 3000
): Promise<DashboardData> {
  // Node 18+ native timeout signal
  const timeoutSignal = AbortSignal.timeout(clientTimeoutMs);

  try {
    // Both downstream calls share the same cancellation signal
    const [profile, orders] = await Promise.all([
      fetchUserProfile(userId, timeoutSignal),
      fetchUserOrders(userId, timeoutSignal),
    ]);

    return { profile, orders };
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new Error(`Dashboard request timed out after ${clientTimeoutMs}ms`);
    }
    throw error;
  }
}

async function fetchUserProfile(userId: string, signal: AbortSignal) {
  const response = await fetch(`https://api.internal/users/${userId}`, { signal });
  return response.json();
}

async function fetchUserOrders(userId: string, signal: AbortSignal) {
  const response = await fetch(`https://api.internal/orders/${userId}`, { signal });
  return response.json();
}
```

#### Composing Multiple Abort Signals (`AbortSignal.any` in Node 20+):
```typescript
// Cancel if user disconnects OR if server timeout expires
const controller = new AbortController();
req.on('close', () => controller.abort());

const combinedSignal = AbortSignal.any([
  controller.signal,
  AbortSignal.timeout(5000),
]);

await fetch('https://payment-gateway.internal/charge', { signal: combinedSignal });
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a TCP connection is mid-flight when `AbortSignal` triggers?"  
*Senior Answer:* The underlying socket is destroyed, and the client aborts reading from the network stream immediately, freeing the file descriptor and preventing bandwidth consumption. However, the remote server might still execute the request if it hasn't implemented client disconnection detection.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q9: What happens if an error is thrown synchronously inside a `new Promise((resolve, reject) => ...)` constructor?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Promises]` `[ErrorHandling]`

**Answer:**
The Promise constructor automatically catches synchronous exceptions and transitions to the **rejected** state, passing the thrown error to `reject`. It does NOT crash the process synchronously.
```javascript
const p = new Promise((resolve, reject) => {
  throw new Error('Immediate boom');
});
p.catch(err => console.log('Caught:', err.message)); // Caught: Immediate boom
```

---

### Q10: What is the difference between `Promise.resolve(val)` and `new Promise(r => r(val))` when `val` is already a Promise?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Promises]` `[V8]`

**Answer:**
- `Promise.resolve(existingPromise)` returns `existingPromise` directly by reference (no extra allocation, no extra microtask).
- `new Promise(resolve => resolve(existingPromise))` creates a new Promise instance and requires **two extra microtask ticks** to unwrap the nested Promise under the ECMAScript specification.

---

### Q11: How do you listen for an `AbortSignal` event cleanly without creating a memory leak?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[AbortSignal]` `[MemoryLeak]`

**Answer:**
Always use `{ once: true }` when listening to the `'abort'` event on a signal:
```javascript
signal.addEventListener('abort', () => cleanupResources(), { once: true });
```
If you do not remove the listener or use `{ once: true }`, long-lived signals retain references to short-lived callbacks and their closure scopes, leading to memory leaks.
