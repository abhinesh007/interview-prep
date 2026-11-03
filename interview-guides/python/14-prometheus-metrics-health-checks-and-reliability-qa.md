# 14 — Prometheus Metrics, Health Checks & Reliability

> Prometheus Metric Types (Counter, Gauge, Histogram), The Gunicorn/Uvicorn Multiprocess Gotcha (`PROMETHEUS_MULTIPROC_DIR`), Kubernetes Health Probes (Liveness vs Readiness Pitfalls), Graceful Shutdown Sequences, and Production Profiling with `py-spy` and `tracemalloc`.

---

## 📑 Table of Contents
1. [Prometheus Metrics Fundamentals & The RED Method](#1-prometheus-metrics-fundamentals--the-red-method)
2. [The #1 Prometheus Trap in Python: Multiprocess Mode (`PROMETHEUS_MULTIPROC_DIR`)](#2-the-1-prometheus-trap-in-python-multiprocess-mode-prometheus_multiproc_dir)
3. [Kubernetes Health Probes & Cascading Outages](#3-kubernetes-health-probes--cascading-outages)
4. [Production Graceful Shutdown Implementation](#4-production-graceful-shutdown-implementation)
5. [Production Profiling: `py-spy` & `tracemalloc`](#5-production-profiling-py-spy--tracemalloc)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Prometheus Metrics Fundamentals & The RED Method

### Q1: What are the 4 core Prometheus metric types? How do you implement the RED Method for an API?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Prometheus]` `[Metrics]` `[REDMethod]`

**Answer:**
Prometheus monitors services via numeric time-series data:
1. **Counter:** Monotonically increasing value (only goes up or resets to 0 on restart). Used for request counts, error counts.
2. **Gauge:** A value that can arbitrarily go up or down. Used for active connections, memory usage, CPU load.
3. **Histogram:** Samples observations (usually durations or request sizes) and counts them into configurable discrete buckets. Allows calculating percentiles (p50, p95, p99) on the Prometheus server via `histogram_quantile()`.
4. **Summary:** Samples observations and calculates configurable quantiles directly on the client side.

#### Implementing the RED Method (Rate, Errors, Duration):
```python
from prometheus_client import Counter, Histogram
import time

# 1. Rate & Errors:
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests partitioned by method, endpoint, and status code.",
    ["method", "endpoint", "status_code"],
)

# 2. Duration (Latency Distribution):
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds.",
    ["method", "endpoint"],
    buckets=(
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1.0,
        2.5,
        5.0,
    ),  # Tailored buckets!
)


# Middleware tracking:
async def metrics_middleware(request, call_next):
  start = time.perf_counter()
  response = await call_next(request)
  duration = time.perf_counter() - start

  endpoint = request.url.path
  HTTP_REQUESTS_TOTAL.labels(
      method=request.method,
      endpoint=endpoint,
      status_code=response.status_code,
  ).inc()
  HTTP_REQUEST_DURATION_SECONDS.labels(
      method=request.method, endpoint=endpoint
  ).observe(duration)

  return response
```

**⚠️ High-Cardinality Trap:** Never put dynamic identifiers (such as `user_id`, UUIDs, or raw error messages) into Prometheus metric labels. Each unique label combination creates a brand new time-series in Prometheus TSDB, quickly crashing the monitoring cluster with an Out-of-Memory error!

---

## 2. The #1 Prometheus Trap in Python: Multiprocess Mode (`PROMETHEUS_MULTIPROC_DIR`)

### Q2: 🐛 The Multi-Worker Outage: Why do Prometheus metrics fail under Gunicorn/Uvicorn multi-worker mode? How does `PROMETHEUS_MULTIPROC_DIR` solve it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Prometheus]` `[Gunicorn]` `[Multiprocess]`

**Answer:**
In a production deployment, Gunicorn runs **multiple worker processes** (e.g., 4 or 8 Uvicorn worker processes) to utilize all CPU cores.

#### The Metric Fragmentation Bug:
By default, `prometheus-client` stores metric counters in Python process memory. Because processes have **isolated memory spaces**:
- Worker 1 handles Request 1 (its internal counter is 1).
- Worker 2 handles Request 2 (its internal counter is 1).
- When the Prometheus server scrapes `/metrics`, the request hits **one random worker**. The scraped metrics jump erratically up and down depending on which worker process received the scrape request!

```text
Incoming Scrapes ──► Random Worker A (Returns Count: 42)
Incoming Scrapes ──► Random Worker B (Returns Count: 19)
Result: Jagged, nonsensical metrics graphs!
```

#### The Production Solution: Multiprocess Mode
You must configure `prometheus-client` to write metrics into memory-mapped files in a shared disk directory (`PROMETHEUS_MULTIPROC_DIR`), and aggregate them using `MultiProcessCollector`:

```text
Worker 1 (PID 101) ──┐
Worker 2 (PID 102) ──┼──► /tmp/prometheus_multiproc/*.db (Memory-Mapped Files)
Worker 3 (PID 103) ──┘                       │
                                             ▼
                     Scrape /metrics ──► MultiProcessCollector Aggregates All!
```

#### Critical Operational Gotchas:
1. **Startup Wipe:** The directory `/tmp/prometheus_multiproc` must be wiped *before* Gunicorn starts (`rm -rf /tmp/prometheus_multiproc && mkdir /tmp/prometheus_multiproc`).
2. **Dead Worker PID Cleanup:** When Gunicorn workers restart or recycle, their metric files remain behind. You **must** configure Gunicorn's `child_exit` hook in `gunicorn.conf.py`:

```python
# gunicorn.conf.py
from prometheus_client import multiprocess


def child_exit(server, worker):
  """Cleans up memory-mapped metric files when a worker process terminates."""
  multiprocess.mark_process_dead(worker.pid)
```

```python
# main.py: Exposing aggregated multiprocess metrics
import os
from fastapi import FastAPI, Response
from prometheus_client import (
    CollectorRegistry,
    generate_latest,
    multiprocess,
    CONTENT_TYPE_LATEST,
)

app = FastAPI()


@app.get("/metrics")
def metrics():
  registry = CollectorRegistry()
  multiprocess.MultiProcessCollector(registry)
  data = generate_latest(registry)
  return Response(content=data, media_type=CONTENT_TYPE_LATEST)
```

---

## 3. Kubernetes Health Probes & Cascading Outages

### Q3: What is the architectural difference between Kubernetes Liveness, Readiness, and Startup probes? What critical mistake triggers catastrophic cascading cluster collapse?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Kubernetes]` `[Reliability]` `[DevOps]`

**Answer:**

```text
┌─────────────────┐
│  Startup Probe  │ ──► Checks if slow initialization (loading ML models, DB warmups) finished.
└────────┬────────┘     Container is not killed during slow cold starts.
         ▼
┌─────────────────┐
│ Readiness Probe │ ──► Checks if pod can ACCEPT TRAFFIC.
└────────┬────────┘     If FAILS: Ingress / Service stops routing traffic to this pod. Pod remains ALIVE.
         ▼
┌─────────────────┐
│ Liveness Probe  │ ──► Checks if application is DEADLOCKED / UNRESPONSIVE.
└─────────────────┘     If FAILS: Kubelet KILLS AND RESTARTS the pod immediately!
```

#### ⚠️ The Catastrophic Mistake: Database Pings in Liveness Probe
A developer configures the Liveness probe to check the database:
```python
@app.get("/healthz/liveness")
async def liveness(db=Depends(get_db)):
  await db.execute("SELECT 1")  # 💥 CATASTROPHIC ANTI-PATTERN!
  return {"status": "ok"}
```

#### The Cascading Outage Scenario:
1. The database experiences a temporary latency spike (e.g., 5-second lock during backup).
2. All 50 application pods query `SELECT 1` during their liveness check and time out.
3. Kubernetes assumes all 50 application pods are dead and **kills all 50 pods at once**!
4. 50 new pods spin up simultaneously, creating a **thundering herd** of new database connection spikes, crashing the database permanently!

#### The Golden Rule:
- **Liveness Probe (`/healthz/live`):** Checks **only local process health** (e.g., is the event loop responsive? Are internal threads alive?). Never check external dependencies here!
- **Readiness Probe (`/healthz/ready`):** Checks external dependencies (database, Redis). If the database slows down, the pod is removed from the load balancer without being killed.

---

## 4. Production Graceful Shutdown Implementation

### Q4: 💻 Coding: Implement a production-grade graceful shutdown handler for a Python async service upon receiving `SIGTERM`.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[GracefulShutdown]` `[Signals]` `[AsyncIO]`

**Answer:**
When Kubernetes terminates a pod, it sends `SIGTERM`, waits a grace period (default 30 seconds), and sends `SIGKILL`.

```python
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
import signal


@asynccontextmanager
async def lifespan(app: FastAPI):
  loop = asyncio.get_running_loop()
  shutdown_event = asyncio.Event()

  def signal_handler():
    print("Received termination signal (SIGTERM/SIGINT). Initiating drain...")
    shutdown_event.set()

  # Register OS signal handlers:
  for sig in (signal.SIGTERM, signal.SIGINT):
    loop.add_signal_handler(sig, signal_handler)

  yield  # Serving traffic...

  # 1. Mark readiness probe as unhealthy immediately (stop receiving new ingress traffic)
  app.state.is_ready = False

  # 2. Wait drain interval for in-flight requests to complete:
  print("Waiting 5s for in-flight requests to complete...")
  await asyncio.sleep(5.0)

  # 3. Close database connection pools and background workers cleanly:
  print("Flushing OpenTelemetry buffers and closing database pools...")
  await app.state.db_engine.dispose()
  await app.state.redis_client.close()
  print("Graceful shutdown finished cleanly.")


app = FastAPI(lifespan=lifespan)
```

---

## 5. Production Profiling: `py-spy` & `tracemalloc`

### Q5: How do you profile CPU bottlenecks and diagnose memory leaks in a live running Python production container without restarting it?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[py-spy]` `[tracemalloc]` `[Profiling]`

**Answer:**

#### 1. Zero-Overhead Live CPU Profiling with `py-spy`:
Traditional profilers (`cProfile`) slow down Python code by 2x–5x and require modifying source code.
**`py-spy`** is a sampling profiler written in Rust that inspects CPython memory structures directly from outside the process using `process_vm_readv`:
```bash
# Generate a real-time flamegraph of a running production process (PID 1042):
py-spy record -o profile.svg --pid 1042 --duration 30 --rate 100

# View real-time top CPU functions in the terminal (like Linux 'top'):
py-spy top --pid 1042
```
Zero impact on active user traffic!

#### 2. Diagnosing Memory Leaks with `tracemalloc`:
```python
import linecache
import tracemalloc

# Start tracking memory allocations:
tracemalloc.start(25)  # Store up to 25 frames


def print_top_memory_allocations():
  snapshot = tracemalloc.take_snapshot()
  top_stats = snapshot.statistics("lineno")

  print("[ Top 5 Memory Allocations ]")
  for stat in top_stats[:5]:
    print(f"{stat.traceback.format()}: {stat.size / 1024 / 1024:.2f} MB")
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What is the difference between a Prometheus Histogram and a Summary regarding server CPU load?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Prometheus]`

**Answer:**
- **Histogram:** Client increments bucket counters ($O(1)$ cheap operations). Quantiles (p95, p99) are computed on the Prometheus server via PromQL. Histograms can be aggregated across multiple server instances.
- **Summary:** Client calculates sliding-window percentiles in memory, which is computationally expensive for the Python app. **Summaries cannot be aggregated** across multiple instances.

---

### Q7: How can you detect Python garbage collection pauses in production?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[GC]`

**Answer:**
You can attach callback hooks to the garbage collector using `gc.callbacks.append(callback)`. The callback is called before and after each collection phase with `"start"` and `"stop"` flags and generation numbers, allowing you to measure GC pause duration and export it as an OpenTelemetry event or Prometheus histogram.
