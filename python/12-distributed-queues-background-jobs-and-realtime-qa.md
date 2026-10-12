# 12 — Distributed Queues, Background Jobs & Real-Time

> Celery Distributed Architecture, Worker Pools (`prefork` vs `gevent`), At-Least-Once Delivery & Idempotency Keys, Modern Async Queues (`Arq`), WebSockets in FastAPI with Redis Pub/Sub, and Server-Sent Events (SSE).

---

## 📑 Table of Contents
1. [Celery Architecture & Critical Production Tuning](#1-celery-architecture--critical-production-tuning)
2. [Task Idempotency & Retry Strategies with Jitter](#2-task-idempotency--retry-strategies-with-jitter)
3. [Next-Gen Async Queues: `Arq` vs Celery](#3-next-gen-async-queues-arq-vs-celery)
4. [Real-Time WebSockets in FastAPI & Horizontal Scaling](#4-real-time-websockets-in-fastapi--horizontal-scaling)
5. [Server-Sent Events (SSE) Streaming with `StreamingResponse`](#5-server-sent-events-sse-streaming-with-streamingresponse)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Celery Architecture & Critical Production Tuning

### Q1: How does Celery work under the hood? What are the three essential worker settings required to prevent lost tasks and unfair load balancing?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Celery]` `[DistributedSystems]` `[RabbitMQ]` `[Redis]`

**Answer:**
Celery is a distributed asynchronous task queue based on distributed message passing:

```text
┌─────────────────┐      Publish Task Message       ┌─────────────────┐
│ FastAPI Producer│ ──────────────────────────────► │  Message Broker │
└─────────────────┘                                 │(RabbitMQ / Redis)
                                                    └────────┬────────┘
                                                             │ Prefetches Tasks
                                                    ┌────────▼────────┐
                                                    │  Celery Worker  │
                                                    │  (Worker Pool)  │
                                                    └────────┬────────┘
                                                             │ Writes Task Result
                                                    ┌────────▼────────┐
                                                    │ Result Backend  │
                                                    │ (Redis / Postgres)
                                                    └─────────────────┘
```

#### The Three Essential Production Configurations:

1. **`task_acks_late = True`**:
   - *Default behavior (`False`):* The worker acknowledges the message **before** executing the task. If the worker process is killed by OS OOM killer or host hardware failure midway through, **the task is lost forever**.
   - *Production setting (`True`):* The task is acknowledged only **after** the function executes successfully. If the worker crashes, the unacknowledged message returns to the broker for other workers to re-process.

2. **`worker_prefetch_multiplier = 1`**:
   - *Default behavior (`4`):* Each worker thread reserves up to $4 \times \text{concurrency}$ tasks from the queue upfront.
   - *The Problem:* If Worker A claims 4 long-running tasks (e.g., 60-second video encoding) and Worker B finishes quickly, Worker B sits completely idle while tasks sit stuck in Worker A's local queue!
   - *Production setting (`1`):* Workers fetch tasks one-by-one as soon as a worker thread becomes available.

3. **`task_reject_on_worker_lost = True`**:
   - When combined with `task_acks_late`, ensures that if a child worker process terminates abnormally (e.g., segmentation fault or `SIGKILL`), the broker immediately re-queues the message.

---

## 2. Task Idempotency & Retry Strategies with Jitter

### Q2: Why does "At-Least-Once" message delivery require task idempotency? Implement an idempotent task with Redis locks.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Idempotency]` `[Redis]` `[Celery]`

**Answer:**
Because network glitches, worker crashes, or broker acknowledgments can fail, distributed systems guarantee **At-Least-Once delivery**, meaning a task message **will occasionally be delivered multiple times**. If a task charges a credit card, executing it twice charges the user twice!

#### Implementing Idempotency via Redis:
```python
import functools
import redis
from myapp.celery import celery_app

redis_client = redis.Redis(host="localhost", port=6379, db=0)


def idempotent_task(expire_seconds: int = 86400):
  """Decorator ensuring a task executes only once for a given idempotency key."""

  def decorator(func):
    @functools.wraps(func)
    def wrapper(idempotency_key: str, *args, **kwargs):
      lock_key = f"idempotency:{idempotency_key}"

      # SET NX EX: Only sets if key does NOT exist; atomic operation!
      acquired = redis_client.set(lock_key, "PROCESSING", nx=True, ex=300)
      if not acquired:
        status = redis_client.get(lock_key)
        print(
            f"Duplicate task call detected for {idempotency_key}."
            f" Current status: {status}"
        )
        return {"status": "duplicate_skipped"}

      try:
        result = func(idempotency_key, *args, **kwargs)
        # Mark as completed:
        redis_client.set(lock_key, "COMPLETED", ex=expire_seconds)
        return result
      except Exception:
        # Release key on failure to allow retry:
        redis_client.delete(lock_key)
        raise

    return wrapper

  return decorator


@celery_app.task(
    bind=True,
    autoretry_for=(ConnectionError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
)
@idempotent_task(expire_seconds=86400)
def process_stripe_charge(self, idempotency_key: str, amount_cents: int):
  # Network call to payment gateway:
  return stripe_client.charge(
      amount=amount_cents, idempotency_key=idempotency_key
  )
```

---

## 3. Next-Gen Async Queues: `Arq` vs Celery

### Q3: Why are modern asynchronous Python teams replacing Celery with `Arq` for background task processing?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Arq]` `[Celery]` `[AsyncIO]`

**Answer:**

```text
Celery Architecture (Sync Multi-Process):
┌────────────────────────────────────────────────────────┐
│  Prefork Worker 1     Prefork Worker 2                 │
│  (Isolated OS Process) (Isolated OS Process)           │
│  Separate memory, duplicate DB connection pools,       │
│  heavy IPC pickling overhead                           │
└────────────────────────────────────────────────────────┘

Arq Architecture (Native AsyncIO):
┌────────────────────────────────────────────────────────┐
│  Single OS Process / Async Event Loop                  │
│                                                        │
│  Task Coroutine 1   Task Coroutine 2   Task Coroutine 3│
│  All coroutines share a single asyncpg connection pool │
│  Lightweight, sub-millisecond dispatch, ~30MB RAM      │
└────────────────────────────────────────────────────────┘
```

#### Key Differences:
1. **Native `async`/`await`:** In Celery, running async coroutines requires either running synchronous wrappers or monkey-patching event loops. `Arq` is built natively on `asyncio`.
2. **Resource Efficiency:** Celery workers use prefork multi-processing (~150MB RAM per worker process). An Arq worker can handle hundreds of concurrent I/O-bound jobs within a single process consuming 35MB of RAM.
3. **Database Connection Sharing:** In Arq, all concurrent jobs share a single `asyncpg` or `SQLAlchemy` connection pool without greenlet hacks.

---

## 4. Real-Time WebSockets in FastAPI & Horizontal Scaling

### Q4: How do you build a real-time WebSocket server in FastAPI and scale it horizontally across multiple server nodes using Redis Pub/Sub?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[WebSockets]` `[FastAPI]` `[Redis]` `[Scale]`

**Answer:**

```text
Browser Client A ────────► Node 1 (FastAPI) ────┐
                                                ▼
                                         Redis Pub/Sub
                                         Channel: "chat"
                                                ▲
Browser Client B ────────► Node 2 (FastAPI) ────┘
```

#### Clustered WebSocket Manager Implementation:
```python
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

app = FastAPI()
redis_client = aioredis.from_url(
    "redis://localhost:6379", decode_responses=True
)


class ClusteredConnectionManager:

  def __init__(self):
    self.active_connections: set[WebSocket] = set()

  async def connect(self, websocket: WebSocket):
    await websocket.accept()
    self.active_connections.add(websocket)

  def disconnect(self, websocket: WebSocket):
    self.active_connections.discard(websocket)

  async def broadcast_local(self, message: str):
    """Sends message to all sockets connected to THIS node."""
    for connection in list(self.active_connections):
      try:
        await connection.send_text(message)
      except Exception:
        self.disconnect(connection)

  async def listen_to_redis_channel(self):
    """Listens for messages broadcasted by OTHER nodes."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("global_chat")
    async for message in pubsub.listen():
      if message["type"] == "message":
        await self.broadcast_local(message["data"])


manager = ClusteredConnectionManager()


@app.on_event("startup")
async def startup_event():
  asyncio.create_task(manager.listen_to_redis_channel())


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
  await manager.connect(websocket)
  try:
    while True:
      data = await websocket.receive_text()
      # Publish to Redis so all cluster nodes receive and forward it!
      await redis_client.publish("global_chat", data)
  except WebSocketDisconnect:
    manager.disconnect(websocket)
```

---

## 5. Server-Sent Events (SSE) Streaming with `StreamingResponse`

### Q5: When is Server-Sent Events (SSE) superior to WebSockets? How do you implement an SSE streaming endpoint in FastAPI?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[SSE]` `[FastAPI]` `[Streaming]`

**Answer:**
#### WebSockets vs Server-Sent Events (SSE):
- **WebSockets:** Full-duplex (two-way). High protocol complexity, custom framing, firewall blocking, requires custom reconnection logic.
- **SSE:** Unidirectional (server $\rightarrow$ client only). Runs over standard **HTTP/2 or HTTP/1.1**, supports native browser auto-reconnection via `EventSource`, works through enterprise firewalls, and enables seamless load-balancer caching.
- **Best Use Case for SSE:** LLM AI token streaming (ChatGPT-style), stock price tickers, live notifications, build progress logs.

#### FastAPI Implementation:
```python
import asyncio
import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()


async def event_generator():
  """Async generator yielding chunks in text/event-stream format."""
  for i in range(1, 11):
    await asyncio.sleep(1.0)
    data = json.dumps({"step": i, "status": "processing"})
    # SSE requires format: "data: <content>\n\n"
    yield f"data: {data}\n\n"

  yield 'data: {"step": "done", "status": "completed"}\n\n'


@app.get("/stream-events")
async def stream_events():
  return StreamingResponse(
      event_generator(),
      media_type="text/event-stream",
      headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
  )
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why is passing large database objects or models into Celery task arguments a critical anti-pattern?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Celery]`

**Answer:**
Passing models serializes the entire entity state into the message broker. By the time the worker executes the task minutes later, the data in the database may have changed, leading to **stale data overwrites**. Furthermore, SQLAlchemy sessions cannot be pickled across processes. **Rule:** Always pass primitive entity IDs (`user_id: int`) and re-query the fresh database state inside the task execution block.

---

### Q7: What happens to pending Celery tasks when a worker process receives `SIGTERM` vs `SIGKILL`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Signals]`

**Answer:**
- `SIGTERM`: Celery initiates a **warm shutdown**. The worker stops accepting new tasks from the broker, allows the currently running task to finish within `worker_shutdown_timeout`, and cleanly exits.
- `SIGKILL`: The process terminates immediately. If `task_acks_late=False`, the task is lost. If `task_acks_late=True` and `task_reject_on_worker_lost=True`, the broker re-queues the message.
