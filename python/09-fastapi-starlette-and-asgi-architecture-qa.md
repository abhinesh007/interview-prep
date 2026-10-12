# 09 — FastAPI, Starlette & ASGI Architecture

> The ASGI Specification (`scope`, `receive`, `send`), FastAPI Execution Mechanics (`async def` vs `def` Threadpool Offloading), Dependency Injection (`Depends`) with Generator Lifecycles, Modern Lifespan Context Managers, and Middleware Pipelines.

---

## 📑 Table of Contents
1. [The ASGI Specification Under the Hood](#1-the-asgi-specification-under-the-hood)
2. [The Core FastAPI Execution Trap: `async def` vs `def`](#2-the-core-fastapi-execution-trap-async-def-vs-def)
3. [Dependency Injection (`Depends`) & Generator Teardown](#3-dependency-injection-depends--generator-teardown)
4. [Modern ASGI Lifespans vs Deprecated Startup Events](#4-modern-asgi-lifespans-vs-deprecated-startup-events)
5. [Exception Handlers & BackgroundTasks vs Distributed Queues](#5-exception-handlers--backgroundtasks-vs-distributed-queues)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The ASGI Specification Under the Hood

### Q1: What is the Asynchronous Server Gateway Interface (ASGI 3.0)? Build a raw ASGI application from scratch.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[ASGI]` `[Starlette]` `[Architecture]`

**Answer:**
ASGI (the successor to WSGI) standardizes asynchronous communication between Python web servers (Uvicorn, Hypercorn, Granian) and async applications (FastAPI, Starlette, Quart). Unlike WSGI, ASGI natively supports **HTTP/2, WebSockets, and long-lived streaming**.

```text
┌─────────────────┐      HTTP / WebSocket   ┌─────────────────┐
│   Web Client    │ ──────────────────────► │     Uvicorn     │
└─────────────────┘                         │  (ASGI Server)  │
                                            └────────┬────────┘
                                                     │ scope, receive, send
                                            ┌────────▼────────┐
                                            │ FastAPI / App   │
                                            │ (ASGI Callable) │
                                            └─────────────────┘
```

#### The ASGI Contract:
An ASGI 3.0 application is an `async def` callable taking three arguments:
```python
async def app(scope: dict, receive: callable, send: callable) -> None:
  ...
```
1. **`scope`**: A dictionary containing connection metadata (`type: "http" | "websocket" | "lifespan"`, HTTP headers, client IP, path).
2. **`receive`**: An async function called to receive incoming client messages (e.g., `{"type": "http.request", "body": b"..."}`).
3. **`send`**: An async function called to send server events back to the client (e.g., `{"type": "http.response.start"}` and `{"type": "http.response.body"}`).

#### Raw ASGI Implementation:
```python
async def raw_asgi_app(scope: dict, receive: callable, send: callable) -> None:
  if scope["type"] == "http":
    # Wait for the HTTP request body
    request_event = await receive()

    # Send response status and headers
    await send({
        "type": "http.response.start",
        "status": 200,
        "headers": [[b"content-type", b"application/json"]],
    })

    # Send response body payload
    await send({
        "type": "http.response.body",
        "body": b'{"status": "healthy", "server": "raw-asgi"}',
        "more_body": False,
    })
```

---

## 2. The Core FastAPI Execution Trap: `async def` vs `def`

### Q2: 🐛 The Senior Interview Trap: In FastAPI, how does the runtime execute `async def` routes differently from standard `def` routes?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[FastAPI]` `[EventLoop]` `[Starlette]` `[Threadpool]`

**Answer:**
This is one of the most critical architecture questions in Python backend interviews. Developers often assume: *"FastAPI is async, so every route should be `async def`."* This assumption causes severe production outages!

```text
FastAPI Route Defined as 'async def':
┌────────────────────────────────────────────────────────┐
│  Runs DIRECTLY on the Main Event Loop Thread           │
│                                                        │
│  If it contains blocking sync I/O (e.g. time.sleep(5)) │
│  ──► ENTIRE SERVER EVENT LOOP FREEZES! ZERO TRAFFIC!   │
└────────────────────────────────────────────────────────┘

FastAPI Route Defined as standard 'def':
┌────────────────────────────────────────────────────────┐
│  FastAPI offloads it to Starlette's Worker Threadpool  │
│  (anyio.to_thread.run_sync)                            │
│                                                        │
│  Event Loop remains free to serve other requests!      │
└────────────────────────────────────────────────────────┘
```

#### Under the Hood:
- When a route is defined as **`async def`**, FastAPI calls `await route_func(*args)` directly on the main event loop thread. If this coroutine executes synchronous blocking I/O (e.g., synchronous database query, `requests.get()`, or `boto3`), the single thread is blocked.
- When a route is defined as standard **`def`**, FastAPI detects that it is not a coroutine and automatically executes it inside a separate thread pool (`starlette.concurrency.run_in_threadpool`, backed by AnyIO).

#### Decision Rule:
- Use **`async def`** if and only if your route awaits native async calls (`httpx.AsyncClient`, `asyncpg`, async SQLAlchemy).
- Use standard **`def`** if your route calls synchronous blocking libraries (legacy database drivers, standard `requests`, file system operations) to allow FastAPI to manage threadpool offloading automatically.

---

## 3. Dependency Injection (`Depends`) & Generator Teardown

### Q3: How does FastAPI's Dependency Injection (`Depends`) resolve dependencies, and how do generator dependencies manage resource lifecycles?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[FastAPI]` `[DependencyInjection]` `[SQLAlchemy]`

**Answer:**
FastAPI analyzes function parameter signatures using reflection and builds a **Directed Acyclic Graph (DAG)** of dependencies. When a request arrives, it resolves sub-dependencies before invoking the main route.

#### Resource Lifecycles with Generators (`yield`):
Dependencies using `yield` allow defining setup and teardown logic around the request:

```python
from collections.abc import AsyncGenerator
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from myproject.database import async_session_factory

app = FastAPI()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
  """Dependency providing a transactional async database session."""
  async with async_session_factory() as session:
    try:
      # 1. SETUP: Provide session to route
      yield session
      # 2. TEARDOWN (Success): Commit transaction
      await session.commit()
    except Exception:
      # 2. TEARDOWN (Failure): Rollback on error
      await session.rollback()
      raise
    finally:
      # 3. CLEANUP: Return connection to pool
      await session.close()


@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db_session)):
  user = await db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  return user
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What does `Depends(get_db_session, use_cache=True)` mean?"  
*Senior Answer:* By default, `use_cache=True`. If multiple sub-dependencies or routes in the same HTTP request depend on `get_db_session`, FastAPI invokes the generator **only once per request** and shares the same `AsyncSession` instance across the entire dependency graph, preventing multiple redundant database connections.

---

## 4. Modern ASGI Lifespans vs Deprecated Startup Events

### Q4: Why were `@app.on_event("startup")` and `@app.on_event("shutdown")` deprecated, and how do you write an ASGI Lifespan context manager?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[FastAPI]` `[Lifespan]` `[ASGI]`

**Answer:**
The legacy `@app.on_event("startup")` and `"shutdown"` hooks had severe drawbacks:
- Handlers were decoupled; sharing state (e.g., closing a connection pool created at startup) required global variables.
- Error handling was fragile: if startup threw an exception, shutdown hooks were not guaranteed to clean up half-initialized resources.

#### The Modern ASGI Lifespan Protocol (Starlette / FastAPI):
The Lifespan protocol uses a single `@asynccontextmanager` wrapping the entire application lifecycle:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import httpx
import redis.asyncio as aioredis


@asynccontextmanager
async def lifespan(app: FastAPI):
  # ---------------- STARTUP LOGIC ----------------
  print("Initializing application resources...")
  app.state.redis_client = aioredis.from_url(
      "redis://localhost:6379", decode_responses=True
  )
  app.state.http_client = httpx.AsyncClient(timeout=10.0)

  yield  # ◄── APPLICATION SERVES INCOMING REQUESTS HERE

  # ---------------- SHUTDOWN LOGIC ----------------
  print("Draining and closing connections...")
  await app.state.http_client.aclose()
  await app.state.redis_client.close()
  print("Application shutdown complete.")


app = FastAPI(lifespan=lifespan)
```

---

## 5. Exception Handlers & BackgroundTasks vs Distributed Queues

### Q5: When should you use FastAPI's built-in `BackgroundTasks` versus an external distributed queue (Celery or Arq)?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[FastAPI]` `[BackgroundTasks]` `[Celery]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│               Task Offloading Decision                 │
└───────────────────────────┬────────────────────────────┘
                            │
              Is the task mission-critical?
              (Must survive process crash/restart?)
                           /              \
                        YES                NO
                         │                  │
                   Distributed Queue   Is task duration > 2s
                   (Celery / Arq)      or CPU-heavy?
                   backed by Redis       /          \
                                       YES           NO
                                        │             │
                                   Celery / Arq   FastAPI BackgroundTasks
                                                  (Simple email, audit log)
```

#### FastAPI `BackgroundTasks`:
- Executes on the **same process/server** immediately after the HTTP response has been sent to the client.
- **Vulnerability:** In-memory queue. If the container or server crashes, scales down, or is redeployed while a background task is running, **the task is lost permanently**.
- **Best For:** Non-critical fire-and-forget tasks (e.g., incrementing an analytics counter, sending a non-critical webhook).

#### Distributed Task Queues (Celery / Arq):
- Persists task definitions to an external broker (Redis / RabbitMQ).
- Tasks are acknowledged only after execution (`task_acks_late=True`), surviving server crashes with automatic retries and dead-letter queues (DLQ).
- **Best For:** Payment processing, video transcoding, PDF generation, customer emails.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why should you avoid instantiating `httpx.AsyncClient()` inside route functions?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[httpx]` `[ConnectionPooling]`

**Answer:**
Creating a new `httpx.AsyncClient()` on every request creates and destroys a TCP connection and TLS handshake every time, wasting CPU and causing **TCP socket exhaustion** (`TIME_WAIT` socket buildup). Always manage a shared client singleton inside the application `lifespan` or dependency injection system to reuse connection pools.

---

### Q7: How does FastAPI automatically generate OpenAPI documentation?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[OpenAPI]`

**Answer:**
FastAPI introspects route type annotations and Pydantic models using reflection. It compiles these schemas into a compliant JSON object matching the **OpenAPI 3.1 specification**, which is served dynamically at `/openapi.json` and rendered by Swagger UI at `/docs` or ReDoc at `/redoc`.
