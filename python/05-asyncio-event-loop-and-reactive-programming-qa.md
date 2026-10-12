# 05 — AsyncIO, Event Loop & Reactive Programming

> Cooperative Multitasking Internals, Event Loop Scheduling, Coroutines vs Tasks vs Futures, `asyncio.TaskGroup`, Event Loop Starvation Traps (Sync Blocking in `async def`), Offloading with `asyncio.to_thread`, and `uvloop`.

---

## 📑 Table of Contents
1. [Cooperative Multitasking & The Event Loop Mechanics](#1-cooperative-multitasking--the-event-loop-mechanics)
2. [Coroutines, Tasks & Futures Deep Dive](#2-coroutines-tasks--futures-deep-dive)
3. [Task Lifecycles & The Garbage Collection Trap](#3-task-lifecycles--the-garbage-collection-trap)
4. [Event Loop Starvation & Blocking Execution Traps](#4-event-loop-starvation--blocking-execution-traps)
5. [Structured Concurrency (`asyncio.TaskGroup`) vs `gather`](#5-structured-concurrency-asynciotaskgroup-vs-gather)
6. [High-Performance Event Loops (`uvloop`) & Quick-Fire Traps](#6-high-performance-event-loops-uvloop--quick-fire-traps)

---

## 1. Cooperative Multitasking & The Event Loop Mechanics

### Q1: How does `asyncio` achieve high concurrency without multiple OS threads? Explain the Event Loop under the hood.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[AsyncIO]` `[EventLoop]` `[IOMultiplexing]`

**Answer:**
`asyncio` operates on **cooperative multitasking** running on a **single OS thread**. Instead of the operating system preemptively interrupting execution (like thread time-slicing), coroutines explicitly yield control back to the **Event Loop** whenever they wait for an I/O operation via `await`.

```text
┌────────────────────────────────────────────────────────┐
│                   Single Python Thread                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    Event Loop                    │  │
│  │  1. Check Scheduled Timers (call_later heap)     │  │
│  │  2. Poll OS Selector (epoll / kqueue / IOCP)     │  │
│  │  3. Execute Ready Queue Callbacks (call_soon)    │  │
│  └─────────────────────────┬────────────────────────┘  │
│                            │                           │
│        ┌───────────────────┼───────────────────┐       │
│        ▼                   ▼                   ▼       │
│   Coroutine A         Coroutine B         Coroutine C  │
│  (Yields on DB)     (Yields on HTTP)     (Active CPU)  │
└────────────────────────────────────────────────────────┘
```

#### Event Loop Lifecycle Phases:
The loop executes a continuous cycle:
1. **Timer Evaluation:** Checks the min-heap of delayed callbacks (`call_later`, `call_at`) and moves any expired timers into the ready queue.
2. **I/O Demultiplexing:** Queries the OS kernel's non-blocking I/O multiplexer (`selectors.DefaultSelector` -> `epoll` on Linux, `kqueue` on macOS) for socket file descriptors that have incoming bytes ready to read or buffer space ready to write.
3. **Task Advancement:** Steps through the ready queue, resuming each pending coroutine by calling `coroutine.send(None)` until it reaches the next `await` expression and yields control back.

#### Why `await asyncio.sleep(0)` Matters:
When a long-running coroutine executes several computational steps, calling `await asyncio.sleep(0)` explicitly schedules the continuation at the end of the ready queue, yielding control back to the loop so pending network packets and other coroutines can process immediately.

---

## 2. Coroutines, Tasks & Futures Deep Dive

### Q2: What is the exact difference between a Coroutine, a Future, and a Task in `asyncio`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Coroutines]` `[Tasks]` `[Futures]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│  Coroutine (async def): Pure code recipe; NOT running  │
└───────────────────────────┬────────────────────────────┘
                            │ Wrapped via asyncio.create_task()
┌───────────────────────────▼────────────────────────────┐
│  Task: Scheduled coroutine managed by the Event Loop   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Future: Low-level result placeholder            │  │
│  │  (Pending ──► Done with Result / Exception)      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### 1. Coroutine (`async def` function):
- Invoking an `async def` function (e.g., `coro = fetch_data()`) does **not execute any code**!
- It merely returns a **coroutine object** that implements `send()`, `throw()`, and `close()`.
- It only executes when explicitly `await`ed or scheduled inside a Task.

#### 2. Future (`asyncio.Future`):
- A low-level object that represents an **eventual result** of an asynchronous operation.
- Has 3 states: `PENDING`, `CANCELLED`, or `FINISHED`.
- Exposes callbacks via `add_done_callback()`. You can manually resolve it using `future.set_result(val)` or `future.set_exception(err)`.

#### 3. Task (`asyncio.Task`):
- A concrete subclass of `Future` that **wraps a coroutine and schedules it immediately** onto the event loop.
- It drives the coroutine forward by repeatedly invoking `send()` every time an awaited future resolves.

```python
import asyncio


async def compute() -> int:
  await asyncio.sleep(0.1)
  return 42


async def main():
  # Coroutine: Does nothing yet
  c = compute()

  # Task: Immediately scheduled on the loop!
  t = asyncio.create_task(compute())

  result = await t
  print(result)  # 42
```

---

## 3. Task Lifecycles & The Garbage Collection Trap

### Q3: 🐛 Bug Hunt: Why does `asyncio.create_task()` sometimes silently fail with "Task was destroyed but it is pending!"?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[AsyncIO]` `[GarbageCollection]` `[Bugs]`

**Problem Scenario:**
In a production FastAPI background notification service, tasks created to send Slack alerts intermittently disappear without sending messages, logging:
`Task was destroyed but it is pending!`

```python
# VULNERABLE CODE IN PRODUCTION:
@app.post("/events")
async def handle_event(event: EventPayload):
  # Fire-and-forget background task
  asyncio.create_task(send_slack_alert(event))
  return {"status": "accepted"}
```

#### Diagnosis:
`asyncio.create_task()` returns a `Task` instance, but **the Event Loop only holds a WEAK reference to running tasks** (`_PyAsyncGenASend` / weakref sets).
- If your application code does not maintain a strong reference to the returned `Task` object, Python's generational garbage collector can collect and destroy the `Task` object mid-execution during any GC sweep!
- When the garbage collector frees the pending task, its C-level deallocator raises the warning and cancels the coroutine permanently.

#### Production Solution (Retaining Strong References):
```python
background_tasks = set()


@app.post("/events")
async def handle_event(event: EventPayload):
  task = asyncio.create_task(send_slack_alert(event))

  # Add strong reference to prevent GC:
  background_tasks.add(task)

  # Remove strong reference upon completion:
  task.add_done_callback(background_tasks.discard)

  return {"status": "accepted"}
```

---

## 4. Event Loop Starvation & Blocking Execution Traps

### Q4: 🐛 The #1 Production Outage in Async Python: What happens when a synchronous blocking function runs inside an `async def` route? How do you fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[EventLoopStarvation]` `[ProductionBugs]` `[FastAPI]`

**Answer:**
Because `asyncio` runs on a **single OS thread**, running synchronous blocking I/O (e.g., `time.sleep()`, synchronous `requests.get()`, or a heavy CPU calculation) halts the **entire event loop**.

```python
# VULNERABLE FASTAPI ROUTE:
@app.get("/compute")
async def blocking_route():
  time.sleep(5)  # ⚠️ FREEZES THE ENTIRE SERVER FOR 5 SECONDS!
  return {"status": "done"}
```

During those 5 seconds:
- Zero incoming HTTP connections are accepted.
- No other coroutines make progress.
- Health checks (`/health`) fail, causing Kubernetes to assume the pod is dead and terminate it!

#### Production Fix 1: Non-blocking native async equivalents
Always use native asynchronous libraries:
- Replace `time.sleep()` with `await asyncio.sleep()`.
- Replace `requests.get()` with `await httpx.AsyncClient().get()`.
- Replace synchronous database drivers with `asyncpg` or async SQLAlchemy.

#### Production Fix 2: Offloading to Thread Pool with `asyncio.to_thread()`
If a legacy third-party library is strictly synchronous (e.g., Stripe SDK, Boto3, OpenCV), offload it using **`asyncio.to_thread()`** (Python 3.9+), which runs the blocking callable inside a worker thread in the loop's `ThreadPoolExecutor`:

```python
import asyncio


def blocking_image_processing(img_bytes: bytes) -> bytes:
  # Heavy synchronous CPU/IO processing
  time.sleep(2)
  return img_bytes


@app.post("/process-image")
async def process_image_route(file: UploadFile):
  content = await file.read()
  # Offloads safely to worker thread; event loop continues serving traffic!
  processed = await asyncio.to_thread(blocking_image_processing, content)
  return Response(content=processed, media_type="image/png")
```

---

## 5. Structured Concurrency (`asyncio.TaskGroup`) vs `gather`

### Q5: Why did Python 3.11 introduce `asyncio.TaskGroup`? How does Structured Concurrency solve resource leaks present in `asyncio.gather`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[TaskGroup]` `[StructuredConcurrency]` `[Python3.11]`

**Answer:**
`asyncio.gather(*tasks)` has a severe architectural flaw: **uncoordinated cancellation**.
If one child task raises an exception in `asyncio.gather()`, the remaining tasks continue running in the background as **orphaned zombie tasks**, consuming database connections, memory, and CPU without any caller awaiting their results.

#### The Structured Concurrency Solution: `asyncio.TaskGroup` (PEP 654)
`TaskGroup` guarantees that **all child tasks are scoped within an async context manager**:
- If any child task raises an exception, `TaskGroup` **automatically cancels all remaining sibling tasks**!
- It waits for all cancelled tasks to cleanly exit before bubbling exceptions wrapped inside an `ExceptionGroup`.

```python
import asyncio


async def call_payment_gateway():
  await asyncio.sleep(0.5)
  raise ConnectionError("Payment gateway down")


async def reserve_warehouse_stock():
  try:
    await asyncio.sleep(5.0)
    print("Warehouse stock reserved!")
  except asyncio.CancelledError:
    print("Warehouse reservation cancelled cleanly due to sibling failure!")
    raise


async def checkout():
  try:
    async with asyncio.TaskGroup() as tg:
      # If payment fails, warehouse reservation is automatically cancelled!
      t1 = tg.create_task(call_payment_gateway())
      t2 = tg.create_task(reserve_warehouse_stock())
  except* ConnectionError as eg:
    print(f"Checkout aborted: {eg.exceptions}")


asyncio.run(checkout())
```

---

## 6. High-Performance Event Loops (`uvloop`) & Quick-Fire Traps

### Q6: What is `uvloop`, and how does it achieve 2x–4x throughput improvements over standard CPython asyncio?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[uvloop]` `[Performance]` `[Libuv]`

**Answer:**
`uvloop` is a drop-in replacement for the standard CPython asyncio event loop implemented in **Cython on top of Node.js's Libuv library**.

```python
import asyncio
import uvloop

# Enable uvloop globally:
uvloop.install()
asyncio.run(main())
```

#### Why `uvloop` is drastically faster:
1. **Direct C-Level Epoll/Kqueue Binding:** Standard CPython asyncio uses Python-level wrappers around `select`/`epoll`. `uvloop` manages socket file descriptors directly in C via Libuv callbacks, eliminating Python runtime call overhead.
2. **Optimized Memory Allocation:** Buffer handling for network read/write operations is managed directly in C memory slabs rather than creating new Python `bytes` objects on every socket tick.
3. **Used by Default:** Production ASGI servers like **Uvicorn** automatically detect and utilize `uvloop` if installed in the environment.

---

### Q7: 🎯 Quick-Fire: Can a single asyncio event loop utilize all CPU cores on a 32-core machine?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[AsyncIO]`

**Answer:**
No. A single `asyncio` event loop runs on **one OS thread** and can only utilize a maximum of **1 CPU core**. To utilize all CPU cores in production (e.g., running FastAPI), you run multiple worker processes (e.g., `gunicorn -w 8 -k uvicorn.workers.UvicornWorker main:app`), where each process runs its own independent event loop on its own core.
