# 07 — Concurrency, Asynchrony & Race Conditions

> **Comprehensive, production-grade guide** on diagnosing and resolving asynchronous concurrency defects in AI-generated code: Check-Then-Act (TOCTOU) race conditions, Node.js event loop starvation, unhandled promise rejections, distributed locking (Redis Redlock vs PostgreSQL advisory locks), `AbortSignal` cancellation propagation, and the unbounded `Promise.all` socket exhaustion cascade.

---

## 📑 Table of Contents
- [🧠 Part I: Conceptual Primer & Systems Architecture](#-part-i-conceptual-primer--systems-architecture)
  - [1. Systems Metaphor: The Single-Lane Highway with Interleaving Tollbooths](#1-systems-metaphor-the-single-lane-highway-with-interleaving-tollbooths)
  - [2. Event Loop Execution Queues & Concurrency Topology Diagram](#2-event-loop-execution-queues--concurrency-topology-diagram)
  - [3. The Mechanics of the Check-Then-Act (TOCTOU) Gap](#3-the-mechanics-of-the-check-then-act-toctou-gap)
  - [4. Core Concurrency & Asynchrony Primitives Glossary](#4-core-concurrency--asynchrony-primitives-glossary)
- [🧩 Part II: Progressive Technical Interview Questions & Answers](#-part-ii-progressive-technical-interview-questions--answers)
  - [1. Event Loop Mechanics & Asynchronous Microtasks (Q1–Q4)](#1-event-loop-mechanics--asynchronous-microtasks-q1q4)
  - [2. Race Conditions, TOCTOU & Atomic Locking (Q5–Q8)](#2-race-conditions-toctou--atomic-locking-q5q8)
  - [3. Asynchronous Traps, `forEach` & Cascade Failures (Q9–Q12)](#3-asynchronous-traps-foreach--cascade-failures-q9q12)
  - [4. Distributed Concurrency & Optimistic Locking (Q13–Q16)](#4-distributed-concurrency--optimistic-locking-q13q16)
- [⚠️ Part III: Production Gotchas, Traps & Failure Modes](#️-part-iii-production-gotchas-traps--failure-modes)
- [🏭 Part IV: Real-World Enterprise Use Cases & Case Studies](#-part-iv-real-world-enterprise-use-cases--case-studies)
- [🎯 Part V: Quick-Fire & Trap Questions](#-part-v-quick-fire--trap-questions)
- [📚 Part VI: Curated References & Further Learning](#-part-vi-curated-references--further-learning)

---

## 🧠 Part I: Conceptual Primer & Systems Architecture

### 1. Systems Metaphor: The Single-Lane Highway with Interleaving Tollbooths

When an LLM writes asynchronous code in Node.js or Python (AsyncIO), it operates under the illusion of sequential time: *Line 1 finishes, then Line 2 finishes, then Line 3 finishes.*

> **Mental Model:**  
> The single-threaded Event Loop is like a **Single-Lane Highway with Interleaving Tollbooths**.  
> As long as a car is driving (executing synchronous CPU instructions), no other car can pass. The moment a car stops at an `await` tollbooth (waiting for database I/O or network packets), **the tollbooth worker immediately waves through 50 other waiting cars to execute on the same highway!**

```
The AI Sequential Mental Model (Flawed):
[Request A: Check Balance] ──► [Request A: Deduct Balance] ──► [Request A: Commit]

The Production Multi-Request Reality (Interleaving):
Time ──►
[Req A: Check Balance ($100)] ──► [await DB I/O] ──────────────────────► [Req A: Deduct $100]
                                        ▲
                                        │ Interleaving Slot!
                                        ▼
                                  [Req B: Check Balance ($100)] ──► [Req B: Deduct $100]
                                  
Result: Both requests see $100 balance! Both deduct $100! 
Account balance becomes -$100 (Double-Spend Overdraft Bug).
```

1. **The Check-Then-Act (TOCTOU) Trap:** Time-of-Check to Time-of-Use bugs are the #1 vulnerability in AI-generated transactional code. Checking a condition in memory (`if (stock > 0)`) and then updating the database later in an asynchronous flow is fundamentally non-atomic.
2. **The In-Memory Mutex Myth:** When prompted to "prevent race conditions", AI frequently creates an in-memory lock: `const locked = new Set<string>()`. This works in local single-process tests, but completely fails in production when Kubernetes scales the service to 10 independent pods.
3. **Event Loop Starvation:** Placing synchronous CPU-bound operations (e.g., parsing a 50MB JSON payload, generating a bcrypt hash with 16 rounds, or regex pattern matching on large files) directly inside an asynchronous request handler freezes the entire server, blocking all incoming health checks and network traffic.

---

### 2. Event Loop Execution Queues & Concurrency Topology Diagram

```
                 NODE.JS / LIBUV EVENT LOOP PHASES
                 
     ┌────────────────────────────────────────────────────────┐
     │ 1. Timers Phase (`setTimeout`, `setInterval`)          │
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │ 2. Pending I/O Callbacks (OS system operations)        │
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │ 3. Idle / Prepare Phase (Internal runtime mechanics)   │
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │ 4. Poll Phase (Retrieves new I/O events, executes reqs)│
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │ 5. Check Phase (`setImmediate` callbacks)              │
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │ 6. Close Callbacks (`socket.on('close')`)              │
     └────────────────────────────────────────────────────────┘
                                ▲
                                │ Interleaved after EVERY phase:
     ┌──────────────────────────┴─────────────────────────────┐
     │ ⚡ MICROTASK QUEUE (process.nextTick, Promise.then)     │
     │ Runs to completion before next event loop tick!        │
     └────────────────────────────────────────────────────────┘
```

---

### 3. The Mechanics of the Check-Then-Act (TOCTOU) Gap

Whenever execution yields via `await`, atomicity is surrendered:

$$\text{Atomicity Window} = t_{\text{Update}} - t_{\text{Check}}$$

If $\text{Atomicity Window} > 0\text{ ms}$, concurrent requests can interleave state modifications. In an enterprise system under 2,000 requests/sec, an atomicity window of just 15 milliseconds guarantees daily race condition data corruption.

---

### 4. Core Concurrency & Asynchrony Primitives Glossary

| Primitive | Mechanism | Production Purpose |
|---|---|---|
| **Optimistic Concurrency Control (OCC)** | Version column / ETag comparison during update (`WHERE version = :expected`). | High-throughput, low-contention updates with automatic retry on conflict. |
| **Pessimistic Concurrency (Row Lock)** | `SELECT ... FOR UPDATE` in SQL transaction. | Guarantees absolute isolation on high-contention accounts/inventory. |
| **Distributed Lock (Redlock / Advisory)** | Distributed lease coordination across Kubernetes pods. | Ensures only one worker across an entire cluster executes a critical section. |
| **`AbortController` / `AbortSignal`** | Standardized asynchronous cancellation token. | Aborts hanging outbound HTTP requests, queries, and background timers. |
| **Concurrency Limiter (`p-limit`)** | Bounded promise pool queue. | Prevents socket pool exhaustion and downstream rate-limiting cascades. |

---

## 🧩 Part II: Progressive Technical Interview Questions & Answers

### 1. Event Loop Mechanics & Asynchronous Microtasks (Q1–Q4)

---

#### Q1: Predict the exact execution output and explain the queue scheduling mechanics of this asynchronous snippet.
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Event-Loop]` `[Microtasks]` `[Macrotasks]` `[JavaScript]`

**Code Snippet:**
```javascript
console.log('1: Mainline Start');

setTimeout(() => {
  console.log('2: Timeout Callback');
}, 0);

Promise.resolve().then(() => {
  console.log('3: Promise Microtask 1');
}).then(() => {
  console.log('4: Promise Microtask 2');
});

process.nextTick(() => {
  console.log('5: nextTick Callback');
});

console.log('6: Mainline End');
```

**Answer:**
##### Exact Output:
```text
1: Mainline Start
6: Mainline End
5: nextTick Callback
3: Promise Microtask 1
4: Promise Microtask 2
2: Timeout Callback
```

##### Deep Under-the-Hood Explanation:
1. **Synchronous Execution:** Lines 1 and 6 execute immediately in the main execution thread.
2. **`process.nextTick` Priority:** Node.js maintains a dedicated `nextTickQueue`. This queue has strict priority over the standard microtask queue (`Promise.then`). It drains immediately after the current synchronous tick concludes, before any promises execute (`5: nextTick Callback`).
3. **Promise Microtask Queue:** Next, the standard Promise microtask queue is drained. When Microtask 1 finishes, its chained `.then()` is immediately enqueued and executed before the event loop advances (`3`, then `4`).
4. **Macrotask Timers Phase:** Only after all microtasks are completely exhausted does the event loop enter the **Timers Phase**, executing the `setTimeout` callback (`2: Timeout Callback`).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a recursive function continuously schedules `process.nextTick` calls?"  
*Senior Answer:* "It causes **Microtask Starvation**. The event loop never advances to the I/O or Timers phase because the `nextTickQueue` is continuously replenished, completely freezing all network I/O, database responses, and HTTP servers."

---

#### Q2: How does an AI assistant introduce Event Loop Starvation, and how do you diagnose it in production?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Event-Loop-Lag]` `[Performance]` `[NodeJS]` `[Worker-Threads]`

**Answer:**
##### The AI Anti-Pattern:
AI coding assistants routinely place heavy, synchronous CPU operations inside async endpoints:
```typescript
// AI-generated data report exporter:
app.post('/export-csv', async (req, res) => {
  const largeDataset = await db.fetchMillionRecords();
  
  // EVENT LOOP STARVATION: Synchronously transforms 1,000,000 rows in memory!
  // Takes 3.5 seconds of continuous synchronous CPU execution.
  const csvString = transformLargeDatasetToCsvSync(largeDataset);
  
  res.send(csvString);
});
```

##### Production Catastrophe:
While `transformLargeDatasetToCsvSync` executes, **Node.js is completely unresponsive**:
1. All other concurrent HTTP requests across all users hang.
2. Kubernetes liveness probes (`/healthz`) time out.
3. Kubernetes marks the pod unhealthy and restarts it, terminating the export and triggering a cascading failure across the cluster.

##### Diagnosis & Telemetry:
Measure **Event Loop Lag** using `perf_hooks`:
```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval(() => {
  const lagMs = histogram.mean / 1e6;
  if (lagMs > 100) {
    console.warn(`CRITICAL: Event Loop Lag detected: ${lagMs.toFixed(2)}ms`);
  }
  histogram.reset();
}, 5000);
```

##### Enterprise Resolution:
Offload synchronous CPU-bound operations to **Worker Threads** or dedicated background worker processes (e.g., BullMQ / Celery).

---

#### Q3: Contrast `setImmediate()` vs `setTimeout(fn, 0)` in Node.js. When should you use which when correcting AI code?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Event-Loop]` `[Timers]` `[setImmediate]`

**Answer:**
- `setTimeout(fn, 0)` schedules execution in the **Timers phase** (with an OS-enforced minimum delay of 1ms).
- `setImmediate(fn)` schedules execution in the **Check phase**, immediately following the I/O polling phase.

##### In an I/O Cycle:
Within any I/O callback (e.g., inside an `fs.readFile` or HTTP handler), **`setImmediate` is guaranteed to execute before any `setTimeout(fn, 0)`**.
```typescript
// Enterprise Rule:
// When yielding execution back to the event loop to prevent starvation,
// ALWAYS use setImmediate() rather than setTimeout(..., 0).
export const yieldToEventLoop = () => new Promise(resolve => setImmediate(resolve));
```

---

#### Q4: Why is an Unhandled Promise Rejection fatal in Node.js, and how do you safeguard enterprise servers?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Reliability  
**Tags:** `[Promises]` `[Error-Handling]` `[NodeJS]`

**Answer:**
Since Node.js v15, **unhandled promise rejections terminate the Node.js process by default** with a non-zero exit code (`Exit Code 1`).

##### How AI Introduces This:
AI assistants frequently fire-and-forget promises without attaching `.catch()` handlers:
```typescript
app.post('/order', async (req, res) => {
  const order = await orderService.create(req.body);
  res.status(201).json(order);

  // AI FIRE-AND-FORGET TRAP: AI omitted await and omitted .catch()!
  analyticsService.trackPurchase(order); // If this throws 10 seconds later: SERVER CRASHES!
});
```

##### Enterprise Safeguard:
1. Wrap fire-and-forget promises in a robust error boundary utility:
   ```typescript
   export function fireAndForget(promise: Promise<unknown>, context: string) {
     promise.catch(error => {
       logger.error(`Background task failed in context [${context}]`, { error });
     });
   }
   ```
2. Attach a process-level safety net in `server.ts`:
   ```typescript
   process.on('unhandledRejection', (reason, promise) => {
     logger.error('CRITICAL: Unhandled Promise Rejection detected', { reason });
     // In enterprise SRE: Log to telemetry, flush logs, and perform graceful shutdown
   });
   ```

---

### 2. Race Conditions, TOCTOU & Atomic Locking (Q5–Q8)

---

#### Q5: Identify the Check-Then-Act race condition in this AI-generated inventory decrement endpoint and refactor it with atomic SQL.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Race-Condition]` `[TOCTOU]` `[SQL]` `[PostgreSQL]`

**Flawed AI-Generated Scaffold:**
```typescript
export async function purchaseItem(productId: string, quantityToBuy: number) {
  // Step 1: Check available stock
  const product = await db.query(
    'SELECT stock FROM products WHERE id = $1', 
    [productId]
  );

  if (product.rows[0].stock < quantityToBuy) {
    throw new Error('Insufficient inventory');
  }

  // Step 2: Act (Decrement stock)
  // THE TOCTOU GAP: Another concurrent request can decrement stock right here!
  await db.query(
    'UPDATE products SET stock = stock - $1 WHERE id = $2',
    [quantityToBuy, productId]
  );

  return { success: true };
}
```

**Answer:**
##### The Failure Scenario:
Item stock is `1`. Two customers attempt to buy `1` unit simultaneously:
1. Customer A checks stock: reads `1`. Condition `1 < 1` is false.
2. Customer B checks stock: reads `1`. Condition `1 < 1` is false.
3. Customer A decrements: stock becomes `0`.
4. Customer B decrements: stock becomes `-1` (Oversell bug!).

##### Enterprise Refactor: Atomic Database-Level Invariant
Eliminate the separate `SELECT` check. Enforce atomicity directly in the `UPDATE` query:
```typescript
export async function purchaseItem(productId: string, quantityToBuy: number) {
  if (quantityToBuy <= 0 || !Number.isInteger(quantityToBuy)) {
    throw new Error('Quantity must be a positive integer');
  }

  // Atomic Conditional Update: Only updates if stock is sufficient
  const result = await db.query(
    `UPDATE products 
     SET stock = stock - $1 
     WHERE id = $2 AND stock >= $1 
     RETURNING id, stock;`,
    [quantityToBuy, productId]
  );

  // If rowCount === 0, either product does not exist or stock was insufficient!
  if (result.rowCount === 0) {
    // Probe product existence to provide accurate domain error
    const exists = await db.query('SELECT 1 FROM products WHERE id = $1', [productId]);
    if (exists.rowCount === 0) {
      throw new ProductNotFoundError(`Product ${productId} not found`);
    }
    throw new InsufficientInventoryError(`Insufficient inventory for product ${productId}`);
  }

  return { success: true, remainingStock: result.rows[0].stock };
}
```

---

#### Q6: How do PostgreSQL Advisory Locks prevent race conditions across distributed microservices?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Databases  
**Tags:** `[PostgreSQL]` `[Advisory-Locks]` `[Distributed-Systems]`

**Answer:**
PostgreSQL provides **Application-Level Advisory Locks** (`pg_advisory_xact_lock`), which lock arbitrary application integers/hashes rather than table rows:

```typescript
export async function executeExclusiveUserOperation(
  userId: string,
  operation: (client: PoolClient) => Promise<void>
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');

    // 1. Acquire transaction-scoped advisory lock based on 64-bit user hash
    // The lock is automatically released when the transaction ends (COMMIT or ROLLBACK)
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [userId]);

    // 2. Critical Section: Guaranteed exactly one thread/pod executes per userId
    await operation(client);

    await client.query('COMMIT;');
  } catch (error) {
    await client.query('ROLLBACK;');
    throw error;
  } finally {
    client.release();
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why use Postgres Advisory Locks instead of Redis Redlock?"  
*Senior Answer:* "If the application state already resides in PostgreSQL, advisory locks eliminate an external infrastructure dependency (Redis), share the exact transaction lifecycle (automatically releasing on crash or rollback), and guarantee ACID consistency without clock-drift lease expiration risks."

---

#### Q7: Implement Optimistic Concurrency Control (OCC) with entity versioning.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Architecture  
**Tags:** `[OCC]` `[Concurrency]` `[Versioning]`

**Answer:**
```typescript
interface DocumentEntity {
  id: string;
  content: string;
  version: number; // Monotonically increasing version counter
}

export async function updateDocumentWithOCC(
  docId: string,
  newContent: string,
  expectedVersion: number
): Promise<DocumentEntity> {
  const result = await db.query<DocumentEntity>(
    `UPDATE documents 
     SET content = $1, version = version + 1 
     WHERE id = $2 AND version = $3 
     RETURNING id, content, version;`,
    [newContent, docId, expectedVersion]
  );

  // If rowCount === 0, someone else updated the document concurrently!
  if (result.rowCount === 0) {
    throw new ConcurrencyConflictError(
      `Update conflict: Document ${docId} has been modified by another process.`
    );
  }

  return result.rows[0];
}
```

---

#### Q8: What is the "Lost Update" anomaly and how does Pessimistic Locking (`SELECT ... FOR UPDATE`) solve it?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / SQL  
**Tags:** `[ACID]` `[Pessimistic-Locking]` `[PostgreSQL]`

**Answer:**
In a **Lost Update** anomaly:
1. Transaction 1 reads row $R$ ($V = 10$).
2. Transaction 2 reads row $R$ ($V = 10$).
3. Transaction 1 updates row $R$ ($V = 15$) and commits.
4. Transaction 2 updates row $R$ ($V = 20$) and commits.
Transaction 1's update is completely overwritten and lost.

##### Pessimistic Locking Resolution:
```sql
BEGIN;
-- Takes exclusive row-level lock on the target row:
SELECT balance FROM accounts WHERE id = 'acc_100' FOR UPDATE;

-- Concurrent transactions attempting to SELECT ... FOR UPDATE on acc_100
-- will block and wait until this transaction commits or rolls back!
UPDATE accounts SET balance = balance + 50 WHERE id = 'acc_100';
COMMIT;
```

---

### 3. Asynchronous Traps, `forEach` & Cascade Failures (Q9–Q12)

---

#### Q9: Explain why `array.forEach(async (item) => ...)` is an anti-pattern and predict its runtime execution behavior.
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[JavaScript]` `[forEach]` `[Async-Traps]`

**Code Snippet:**
```javascript
async function syncData(items) {
  console.log('Start Sync');

  items.forEach(async (item) => {
    await new Promise(res => setTimeout(res, 100));
    console.log('Processed:', item);
  });

  console.log('End Sync');
}

syncData(['A', 'B', 'C']);
```

**Answer:**
##### Output:
```text
Start Sync
End Sync
Processed: A
Processed: B
Processed: C
```

##### Deep Explanation:
`Array.prototype.forEach` does **not await promises returned by its callback**. It treats the callback as a standard synchronous function.
1. The loop fires all 3 async callbacks concurrently into the background.
2. `forEach` returns immediately.
3. `'End Sync'` logs **before any of the items are processed!**
4. If this function is an Express request handler, the response is sent back to the client while background tasks are still running. If an error occurs inside the callback, it becomes an unhandled promise rejection.

##### Enterprise Correction:
- For sequential processing: use a `for...of` loop (`for (const item of items) { await process(item); }`).
- For bounded concurrent processing: use `Promise.all` with a concurrency limiter (`p-limit`).

---

#### Q10: Refactor an AI-generated unbounded `Promise.all()` to prevent socket exhaustion using `p-limit`.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[p-limit]` `[Concurrency-Limiting]` `[Performance]`

**Flawed AI-Generated Scaffold:**
```typescript
// AI processes 10,000 webhook dispatches with unbounded Promise.all:
export async function broadcastNotifications(userIds: string[], message: string) {
  // CRASH: Spawns 10,000 concurrent network sockets simultaneously!
  await Promise.all(
    userIds.map(id => sendPushNotification(id, message))
  );
}
```

**Answer:**
##### Enterprise-Hardened Implementation with `p-limit`:
```typescript
import pLimit from 'p-limit';

export async function broadcastNotifications(
  userIds: string[], 
  message: string,
  maxConcurrency = 25
) {
  // Limit concurrent in-flight HTTP requests to 25
  const limit = pLimit(maxConcurrency);

  const tasks = userIds.map(id => {
    return limit(async () => {
      try {
        await sendPushNotification(id, message);
      } catch (error) {
        logger.error(`Failed to dispatch push notification to user ${id}`, { error });
      }
    });
  });

  // Bounded execution: Exactly 25 promises in-flight at any millisecond
  await Promise.all(tasks);
}
```

---

#### Q11: Contrast `Promise.all()` vs `Promise.allSettled()`. When does AI code introduce bugs by using `Promise.all()`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Promises]` `[Resilience]` `[JavaScript]`

**Answer:**
- `Promise.all()` implements **fail-fast**: if any single promise rejects, the entire `Promise.all` rejects immediately, ignoring all other pending operations.
- `Promise.allSettled()` waits for **every single promise to complete** (either fulfilled or rejected) and returns an array of outcome objects `{ status: 'fulfilled', value } | { status: 'rejected', reason }`.

##### The AI Bug:
When generating batch operations (e.g., sending emails to 50 recipients):
If recipient 3 has an invalid email, `Promise.all()` rejects immediately. The remaining 47 emails may have already been dispatched or remain in limbo, but the caller receives an error and assumes *zero* emails were sent.

---

#### Q12: How do you propagate `AbortSignal` across a multi-tier asynchronous call chain?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[AbortController]` `[Cancellation]` `[NodeJS]`

**Answer:**
```typescript
export async function fetchUserDashboardData(
  userId: string,
  parentSignal?: AbortSignal
): Promise<DashboardData> {
  // 1. Create a timeout controller (enforcing 5-second total deadline)
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), 5000);

  // 2. Link parent signal (e.g. client disconnect) with timeout signal
  const compositeSignal = parentSignal 
    ? anySignal([parentSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    // 3. Pass composite signal to all downstream asynchronous dependencies
    const [profile, billing, notifications] = await Promise.all([
      userApiClient.getProfile(userId, { signal: compositeSignal }),
      billingApiClient.getInvoices(userId, { signal: compositeSignal }),
      notificationDb.getUnread(userId, { signal: compositeSignal }),
    ]);

    return { profile, billing, notifications };
  } finally {
    clearTimeout(timer); // Free timer handle to prevent memory leaks
  }
}

// Utility to combine multiple signals
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      return sig;
    }
    sig.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
```

---

### 4. Distributed Concurrency & Optimistic Locking (Q13–Q16)

---

#### Q13: How does the Redis Redlock algorithm work, and why do in-memory locks fail in Kubernetes?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / Distributed-Systems  
**Tags:** `[Redlock]` `[Redis]` `[Distributed-Locks]` `[Kubernetes]`

**Answer:**
In Kubernetes, an application runs across multiple independent container pods. An in-process lock (`new Set()`, local mutex) only synchronizes threads within **that specific OS process**. Pod A has zero knowledge of Pod B's in-memory locks.

##### Redlock Algorithm Mechanics:
To acquire a distributed lock across an independent $N$-node Redis cluster (typically 5 nodes):
1. **Timestamp Recording:** Client records current time $T_1$.
2. **Sequential Acquisition:** Client attempts to acquire the lock in all $N$ instances sequentially using a unique random value and an auto-release lease time (TTL, e.g., 10,000ms):
   `SET resource_name my_random_value NX PX 10000`
3. **Quorum Verification:** Client checks if it acquired the lock in **at least $\lfloor N/2 \rfloor + 1$ instances** (majority quorum) within a timeout significantly shorter than the lock validity time.
4. **Validity Calculation:** Valid lock time = $\text{TTL} - (T_{\text{current}} - T_1) - \text{Drift}$.
5. **Release:** Release is executed via a Lua script that verifies the token matches before deleting:
   ```lua
   if redis.call("get", KEYS[1]) == ARGV[1] then
       return redis.call("del", KEYS[1])
   else
       return 0
   end
   ```

---

#### Q14: Write a production-grade Redis distributed lock utility in TypeScript with automatic heartbeat renewal.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Redis]` `[Distributed-Lock]` `[Heartbeat]`

**Answer:**
```typescript
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

export class RedisDistributedLock {
  constructor(private redis: Redis) {}

  public async withLock<T>(
    lockKey: string,
    ttlMs: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockValue = randomUUID();
    const key = `lock:${lockKey}`;

    // 1. Acquire lock using atomic NX (only if not exists) and PX (millisecond TTL)
    const acquired = await this.redis.set(key, lockValue, 'PX', ttlMs, 'NX');
    if (!acquired) {
      throw new Error(`Failed to acquire distributed lock for resource: ${lockKey}`);
    }

    // 2. Heartbeat Timer (Lock Extension): Renews TTL periodically if operation runs long
    const heartbeatInterval = setInterval(async () => {
      const extendLua = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      try {
        await this.redis.eval(extendLua, 1, key, lockValue, ttlMs);
      } catch (err) {
        console.error('Failed to extend lock heartbeat:', err);
      }
    }, Math.floor(ttlMs / 2));

    try {
      // 3. Execute protected critical section
      return await operation();
    } finally {
      clearInterval(heartbeatInterval);

      // 4. Atomic Safe Release: Only delete if the lock still belongs to this worker instance
      const releaseLua = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await this.redis.eval(releaseLua, 1, key, lockValue);
    }
  }
}
```

---

#### Q15: What is Martin Kleppmann's critique of Redlock, and how does Fencing Tokens solve it?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual / Distributed-Systems  
**Tags:** `[Distributed-Systems]` `[Fencing-Tokens]` `[Redlock]`

**Answer:**
In 2016, distributed systems researcher Martin Kleppmann published a seminal critique of Redlock:
1. **The GC Pause / Clock Drift Flaw:** A client acquires a Redlock with a 10s TTL. The client immediately enters a **Stop-The-World Garbage Collection pause** lasting 12 seconds.
2. The lock TTL expires in Redis.
3. Another client acquires the lock.
4. The first client wakes up from GC, unaware that 12 seconds have elapsed, and executes its write to storage, corrupting concurrent state.

##### The Solution: Fencing Tokens
Every time a lock is granted, the lock service returns a **monotonically increasing integer token** (e.g., Token 42).
When the client writes to the shared database or storage, it includes the token:
`UPDATE storage SET data = $1 WHERE fencing_token < 42;`
If client 2 acquired Token 43 during client 1's GC pause, client 1's late write is rejected by the storage layer because $42 < 43$.

---

#### Q16: How do you test for race conditions using concurrent load generation in Vitest?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Testing  
**Tags:** `[Concurrency-Testing]` `[Vitest]` `[Load-Testing]`

**Answer:**
```typescript
it('guarantees that 50 concurrent requests cannot oversell a limited inventory of 5 items', async () => {
  const productId = 'prod_limited_drop';
  await inventoryRepo.setStock(productId, 5);

  // Generate 50 concurrent purchase requests simultaneously
  const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
    return purchaseService.purchaseItem(productId, 1).catch(err => err);
  });

  const results = await Promise.all(concurrentRequests);

  // Count successes vs failures
  const successfulPurchases = results.filter(r => r.success === true);
  const rejectedPurchases = results.filter(r => r instanceof InsufficientInventoryError);

  // Invariant 1: Exactly 5 purchases must succeed
  expect(successfulPurchases).toHaveLength(5);

  // Invariant 2: Exactly 45 purchases must be rejected
  expect(rejectedPurchases).toHaveLength(45);

  // Invariant 3: Final inventory balance must be exactly 0 (never negative!)
  const finalStock = await inventoryRepo.getStock(productId);
  expect(finalStock).toBe(0);
});
```

---

## ⚠️ Part III: Production Gotchas, Traps & Failure Modes

1. **The Hanging Transaction Connection:** AI opens a database transaction (`BEGIN`), initiates an external HTTP call (`await fetch(...)`), but forgets to set an HTTP timeout. The HTTP call hangs for 15 minutes, holding the database connection and locks open, exhausting the entire PostgreSQL connection pool.
2. **Async in Constructors:** AI writes `constructor() { this.init(); }` where `init()` is asynchronous. Constructors in JavaScript cannot be asynchronous. The instance is returned before initialization finishes, causing null pointer exceptions. Use a static async factory method (`static async create()`) instead.
3. **Deadlock from Inconsistent Lock Ordering:** Service A locks Account 1, then Account 2. Service B locks Account 2, then Account 1. Concurrent execution deadlocks. Always sort resource IDs lexicographically before acquiring multi-resource locks!

---

## 🏭 Part IV: Real-World Enterprise Use Cases & Case Studies

### Postmortem: The $650,000 Double-Refund Concurrency Leak

**The Incident:** An online retailer used an AI assistant to generate an automated refund workflow for customer returns.
```typescript
// AI-generated refund endpoint:
app.post('/refund', async (req, res) => {
  const returnRequest = await db.returns.find(req.body.id);
  if (returnRequest.status === 'REFUNDED') {
    return res.status(400).send('Already refunded');
  }

  await paymentGateway.refund(returnRequest.chargeId);
  await db.returns.update(req.body.id, { status: 'REFUNDED' });
  res.send('Refunded');
});
```

**The Exploitation:** Fraudsters noticed that double-clicking the "Submit Return" button on the UI fired two identical HTTP requests within 10 milliseconds. Both requests passed the `status === 'REFUNDED'` check simultaneously before the database status update committed.
The payment gateway processed two separate \$500 refunds for a single returned item. Over 4 months, automated bot scripts systematically exploited this gap, draining \$650,000.

**The Fix:** Enforced atomic database row locks with PostgreSQL advisory locks, combined with an `Idempotency-Key` header passed to the payment gateway.

---

## 🎯 Part V: Quick-Fire & Trap Questions

1. **Q:** What is the difference between concurrency and parallelism?  
   **A:** Concurrency is dealing with lots of things at once (structure, interleaving). Parallelism is doing lots of things at once (physical simultaneous multi-core execution).

2. **Q:** Can Node.js execute JavaScript in parallel?  
   **A:** Yes, via the `worker_threads` module, which spawns independent V8 isolates with separate memory heaps.

3. **Q:** What is a TOCTOU bug?  
   **A:** Time-of-Check to Time-of-Use: a race condition where state changes between the moment a condition is checked and the moment the resulting action is executed.

4. **Q:** Why is `async` in `Array.prototype.map()` safe with `Promise.all()`, but broken in `Array.prototype.forEach()`?  
   **A:** `map` collects the returned promises into an array that can be awaited by `Promise.all`. `forEach` ignores the return value completely.

---

## 📚 Part VI: Curated References & Further Learning

### 🌐 High-Quality Engineering Blogs
- [Node.js Official Documentation: The Event Loop, Timers, and nextTick](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) — Authoritative guide.
- [Martin Kleppmann: How to Do Distributed Locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) — Critique of Redlock and analysis of fencing tokens.
- [Redis Official Documentation: Distributed Locks with Redis (Redlock)](https://redis.io/docs/manual/patterns/distributed-locks/) — Official algorithm specification.

### 📖 Specifications & Cookbooks
- [PostgreSQL Documentation: Explicit Locking & Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html) — Database concurrency guide.
- [p-limit GitHub Repository](https://github.com/sindresorhus/p-limit) — Promise concurrency limiting cookbook.

### 📺 Visual Deep Dives & Lectures
- **Philip Roberts:** *What the heck is the event loop anyway?* (JSConf / YouTube) — The definitive visual walkthrough of the JavaScript event loop.
