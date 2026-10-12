# 16 — Enterprise System Design & Production Architecture

> Enterprise System Design using the **RADIO Framework**, High-Throughput Webhook Ingestion Engine (100k req/s), Distributed Async Worker Pipelines with Idempotency & DLQ, Microservice Circuit Breaking, and Production Docker Hardening.

---

## 📑 Table of Contents
1. [System Design Framework: The RADIO Methodology](#1-system-design-framework-the-radio-methodology)
2. [Scenario 1: High-Throughput Event Ingestion API (100k req/s)](#2-scenario-1-high-throughput-event-ingestion-api-100k-reqs)
3. [Scenario 2: Distributed Resilient Worker Pipeline with Idempotency & DLQ](#3-scenario-2-distributed-resilient-worker-pipeline-with-idempotency--dlq)
4. [Scenario 3: Resilient Microservice Client with Circuit Breakers & Bulkheads](#4-scenario-3-resilient-microservice-client-with-circuit-breakers--bulkheads)
5. [Production Containerization & Hardening (Docker & PID 1 Traps)](#5-production-containerization--hardening-docker--pid-1-traps)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. System Design Framework: The RADIO Methodology

Every architecture scenario in this guide adheres strictly to the **RADIO Framework**:
- **R — Requirements Clarification:** Functional & non-functional constraints (throughput, latency, durability).
- **A — Architecture & High-Level Topology:** Distributed system diagrams, messaging tiers, and data flow.
- **D — Data Model & API Contracts:** Schemas, serialization protocols, and idempotency ledgers.
- **I — Interface & Implementation Details:** Asynchronous route handlers, connection pool configurations, and worker logic.
- **O — Optimizations, Resiliency & Edge Cases:** Backpressure handling, circuit breaking, and zero-loss disaster recovery.

---

## 2. Scenario 1: High-Throughput Event Ingestion API (100k req/s)

### Q1: System Design: Architect a high-throughput event ingestion API capable of ingesting 100,000 events/second in Python.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[SystemDesign]` `[FastAPI]` `[Kafka]` `[Redis]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Functional:** Ingest JSON telemetry/analytics payloads, validate HMAC-SHA256 signatures, authenticate API keys, and acknowledge receipt within 20ms.
- **Non-Functional:**
  - Peak throughput: 100,000 requests/second.
  - p99 Latency $< 20\text{ms}$.
  - 99.999% Durability: Zero event loss during database maintenance.

#### 2. High-Level Architecture (A)

```text
Clients (100k req/s)
         │
┌────────▼───────────────────────────────────────────────┐
│               Global Cloud Load Balancer               │
└────────┬───────────────────────────────────────────────┘
         │ SSL Termination / Round-Robin
┌────────▼───────────────────────────────────────────────┐
│         FastAPI Ingestion Tier (16 Pods x 4 Workers)   │
│  - uvloop + Pydantic v2 Rust Validation                │
│  - In-Memory Non-Blocking Signature Verification       │
└────────┬───────────────────────────────────────────────┘
         │ Direct Batch Producer (aiokafka / Redis Streams)
┌────────▼───────────────────────────────────────────────┐
│       Distributed Buffer Queue (Kafka / Redis Streams) │
│  - Partitioned across 32 topics                        │
│  - Decouples ingestion from database disk write limits │
└────────┬───────────────────────────────────────────────┘
         │ Consumer Groups (Batch Prefetch)
┌────────▼───────────────────────────────────────────────┐
│          Async Consumer Workers Tier (Arq / Python)    │
│  - Batch inserts 2,000 records per SQL transaction     │
└────────┬───────────────────────────────────────────────┘
         │ COPY FROM STDIN / Multi-Row Inserts
┌────────▼───────────────────────────────────────────────┐
│         Storage Tier (PostgreSQL TimescaleDB / ClickHouse)
└────────────────────────────────────────────────────────┘
```

#### 3. Data Model & Contract Design (D)
- **Endpoint:** `POST /v1/events`
- **Headers:** `X-Signature: <hmac-sha256>`, `X-Client-ID: <uuid>`, `Idempotency-Key: <uuid>`
- **Payload Schema:**
  ```python
  from pydantic import BaseModel, ConfigDict, Field


  class IngestionEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: str = Field(..., max_length=36)
    timestamp: int
    event_type: str = Field(..., max_length=64)
    payload: dict
```

#### 4. Implementation Strategy (I)
- The ingestion tier does **zero database writing**. Writing to a relational database synchronously at 100k req/s would instantly exhaust connection pools and lock table rows.
- The API validates the signature in-memory using `hmac.compare_digest()`, validates the schema via Pydantic v2's Rust parser, pushes the raw bytes to **Kafka** asynchronously via `AIOKafkaProducer`, and immediately returns HTTP `202 Accepted`.

#### 5. Optimizations & Resiliency (O)
- **Buffer Shedding & Backpressure:** If Kafka lags, the FastAPI tier drops non-critical analytics payloads and returns `429 Too Many Requests` before container RAM exhausts.
- **Batch Ingestion:** Consumers write data in bulk using PostgreSQL `COPY FROM STDIN` or ClickHouse batches, cutting database I/O operations by 99%.

---

## 3. Scenario 2: Distributed Resilient Worker Pipeline with Idempotency & DLQ

### Q2: System Design: Architect a mission-critical financial payout processing pipeline in Python with guaranteed idempotency and Dead Letter Queues (DLQ).
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[SystemDesign]` `[Celery]` `[Idempotency]` `[Finance]`

**Answer Breakdown:**

#### 1. Requirements (R)
- Process bank transfer payouts asynchronously.
- **Zero double-payouts** under any network failure, worker crash, or broker re-delivery.
- Automatically handle temporary downstream banking partner downtime with exponential backoff and jitter.

#### 2. Architecture & State Machine (A & D)

```text
Message Arrives
      │
┌─────▼──────────────────────────────────────────────┐
│ Check Redis Distributed Lock (SET NX EX)           │
└─────┬──────────────────────────────────────────────┘
      │ Acquired?
     / \
   YES  NO ──► Duplicate message discarded immediately!
    │
┌───▼────────────────────────────────────────────────┐
│ Read DB Transaction Record (Status: PENDING)       │
└───┬────────────────────────────────────────────────┘
    │ Execute Bank Transfer API
   / \
SUCCESS FAILURE
  │     │
  │    Check Retry Count < Max Retries (5)?
  │       /                               \
  │     YES                                NO
  │      │                                  │
  │  Calculate Exponential Backoff    Move to Dead Letter Queue (DLQ)
  │  with Full Jitter; Re-queue       Alert On-Call Engineer via PagerDuty
  │                                   Mark Transaction: MANUAL_REVIEW
┌─▼──────────────────────────────────────────────────┐
│ Update DB: COMPLETED; Release Redis Lock           │
└────────────────────────────────────────────────────┘
```

#### 3. Idempotency Implementation (I)
- Every transaction contains an `idempotency_key` generated by the checkout client.
- The worker executes an atomic Redis Lua script before processing:
  ```lua
  if redis.call('get', KEYS[1]) then
      return 0
  else
      redis.call('set', KEYS[1], 'LOCKED', 'EX', ARGV[1])
      return 1
  end
  ```
- If the key exists, the task aborts immediately.

---

## 4. Scenario 3: Resilient Microservice Client with Circuit Breakers & Bulkheads

### Q3: 💻 Coding: Implement a resilient HTTP microservice client in Python using `httpx`, Tenacity, and a Circuit Breaker pattern.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Resilience]` `[CircuitBreaker]` `[HTTPX]`

**Answer:**
Calling unreliable downstream microservices without circuit breaking causes **cascading failures**: slow downstream calls hold caller threads/sockets open until the entire upstream API pool exhausts.

```text
Normal Operation (Closed) ──► Failures > Threshold (50%) ──► Tripped (Open)
        ▲                                                          │
        │                                                     Wait Timeout
   Successes Reset                                                 │
        │                                                          ▼
        └──────────────────── Probe Success ◄────────────── Test Mode (Half-Open)
```

```python
from enum import Enum
import time
from typing import Any
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter


class CircuitState(Enum):
  CLOSED = "CLOSED"
  OPEN = "OPEN"
  HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenException(Exception):
  pass


class ResilientHttpClient:

  def __init__(
      self,
      base_url: str,
      failure_threshold: int = 5,
      recovery_timeout: float = 30.0,
  ):
    self.base_url = base_url
    self.failure_threshold = failure_threshold
    self.recovery_timeout = recovery_timeout

    self.state = CircuitState.CLOSED
    self.failure_count = 0
    self.last_state_change = time.time()

    # Reusable pooled client:
    self.client = httpx.AsyncClient(
        base_url=base_url,
        limits=httpx.Limits(max_keepalive_connections=50, max_connections=100),
        timeout=httpx.Timeout(connect=2.0, read=5.0, write=5.0, pool=2.0),
    )

  async def get(self, endpoint: str) -> dict[str, Any]:
    # 1. Inspect Circuit State
    now = time.time()
    if self.state == CircuitState.OPEN:
      if now - self.last_state_change > self.recovery_timeout:
        self.state = CircuitState.HALF_OPEN
        print("Circuit entering HALF_OPEN probe state...")
      else:
        raise CircuitBreakerOpenException(
            f"Downstream service {self.base_url} is currently unavailable"
        )

    # 2. Execute Request with Retries:
    try:
      response = await self._execute_with_retry(endpoint)
      # On success in half-open, reset to closed:
      if self.state == CircuitState.HALF_OPEN:
        self.state = CircuitState.CLOSED
        self.failure_count = 0
      return response.json()
    except Exception as exc:
      self.failure_count += 1
      if self.failure_count >= self.failure_threshold:
        self.state = CircuitState.OPEN
        self.last_state_change = time.time()
        print(f"Failure threshold breached! Tripping circuit to OPEN: {exc}")
      raise

  @retry(
      stop=stop_after_attempt(3),
      wait=wait_exponential_jitter(initial=0.2, max=2.0),
      retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
      reraise=True,
  )
  async def _execute_with_retry(self, endpoint: str) -> httpx.Response:
    response = await self.client.get(endpoint)
    response.raise_for_status()
    return response
```

---

## 5. Production Containerization & Hardening (Docker & PID 1 Traps)

### Q4: Why is running a Python process as PID 1 inside a Docker container dangerous? How do you write a secure multi-stage Dockerfile?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Docker]` `[DevOps]` `[Security]` `[PID1]`

**Answer:**

#### The PID 1 Zombie Process & Signal Trap:
In Unix systems, the process with **PID 1** (traditionally `init` or `systemd`) has two unique kernel duties:
1. **Reaping Zombie Processes:** When child processes (spawned via `subprocess` or `multiprocessing`) terminate, they become "zombies" until reaped by their parent. If the parent exits or abandons them, PID 1 inherits them. Standard Python interpreters do **not** reap abandoned child processes, causing container memory tables to slowly exhaust with dead zombie processes!
2. **Signal Handling (`SIGTERM`):** The Linux kernel treats PID 1 specially: default signal handlers are disabled. If Python runs as PID 1, it will **silently ignore `SIGTERM`** signals sent by Kubernetes or Docker, preventing graceful shutdown until Kubernetes forcibly terminates the container with `SIGKILL` after 30 seconds!

#### The Solution: Use `tini` / `dumb-init` as PID 1
`tini` acts as a lightweight C-level init wrapper that forwards OS signals directly to Python and automatically reaps dead child processes.

#### Production Multi-Stage Hardened Dockerfile:
```dockerfile
# ==========================================
# STAGE 1: Builder (Compiles wheels)
# ==========================================
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

# Install build dependencies for C-extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for ultra-fast wheel compilation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --output requirements.txt \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ==========================================
# STAGE 2: Minimal Secure Runtime
# ==========================================
FROM python:3.12-slim-bookworm AS runtime

# Install tini init and runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root user and group
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /sbin/nologin -d /app appuser

WORKDIR /app

# Install pre-compiled wheels from builder
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

# Copy application source code
COPY --chown=appuser:appgroup ./src /app/src

# Switch to unprivileged non-root user!
USER appuser

EXPOSE 8000

# Use tini as PID 1 init process:
ENTRYPOINT ["/usr/bin/tini", "--"]

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "src.main:app"]
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q5: How do you calculate the optimal number of Gunicorn workers for an API?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Gunicorn]`

**Answer:**
The standard formula recommended by Gunicorn documentation is:
$$\text{Workers} = (2 \times \text{CPU Cores}) + 1$$
For asynchronous ASGI workers (like Uvicorn workers handling I/O-bound requests), each worker can handle thousands of concurrent connections on its event loop, so **1 to 2 workers per CPU core** is typically sufficient to avoid unnecessary memory overhead.

---

### Q6: What is the Thundering Herd problem, and how do you mitigate it when multiple Python workers access a shared cache?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Caching]`

**Answer:**
The Thundering Herd problem occurs when a heavily requested cache key (e.g., home page feed) expires: hundreds of concurrent worker processes all find a cache miss simultaneously and hit the database at the exact same millisecond, crashing the database.
**Mitigations:**
1. **Cache Stampede Mutex:** Use a distributed lock in Redis so only one worker queries the database while other requests wait.
2. **Probabilistic Early Expiration (XFetch algorithm):** Re-compute and refresh the cache in the background *before* the key officially expires based on read probability.
