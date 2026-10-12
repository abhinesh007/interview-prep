# 13 — Metrics, Health Probes & Production Diagnostics

> Prometheus Metrics (`prom-client`), RED & USE Methods, Kubernetes Health Probes, Zero-Downtime Graceful Shutdown, and Core Dump Post-Mortems.

---

## 📑 Table of Contents
1. [Prometheus Metrics & The RED / USE Methods](#1-prometheus-metrics--the-red--use-methods)
2. [The Kubernetes Liveness vs Readiness Cascade Trap](#2-the-kubernetes-liveness-vs-readiness-cascade-trap)
3. [Zero-Downtime Graceful Shutdown Architecture](#3-zero-downtime-graceful-shutdown-architecture)
4. [Post-Mortem Diagnostics, Core Dumps & llnode](#4-post-mortem-diagnostics-core-dumps--llnode)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Prometheus Metrics & The RED / USE Methods

### Q1: Explain the 4 Prometheus metric types in `prom-client` and how to implement the RED Method for an API.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Metrics]` `[Prometheus]` `[REDMethod]`

**Answer:**

```text
The 4 Prometheus Metric Types:
├── 1. Counter:   Monotonically increasing number (Total HTTP requests, Errors)
├── 2. Gauge:     Value that can go up and down (Active connections, Memory usage)
├── 3. Histogram: Samples observations in configurable buckets (Request duration)
└── 4. Summary:   Calculates configurable percentiles on client side (p50, p95, p99)
```

#### Implementing the RED Method (Rate, Errors, Duration):
```typescript
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const register = new Registry();

// Collect Node.js engine metrics (event loop lag, GC pauses, memory)
collectDefaultMetrics({ register });

// Rate & Errors Counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Duration Histogram (Latency in seconds)
export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5], // Buckets in seconds
  registers: [register],
});

// Express Metrics Middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode.toString() };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSec);
  });

  next();
}
```

---

## 2. The Kubernetes Liveness vs Readiness Cascade Trap

### Q2: Why is checking database or downstream service health inside a Kubernetes Liveness probe a fatal architectural blunder?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[Kubernetes]` `[HealthProbes]` `[Reliability]` `[Gotcha]`

**Answer:**

#### Kubernetes Probes Defined:
- **Liveness Probe:** "Is the process healthy or deadlocked?" If it fails, Kubernetes **kills the pod and restarts the container**.
- **Readiness Probe:** "Is the pod ready to accept user traffic?" If it fails, Kubernetes **removes the pod from the Load Balancer Service pool**, but does NOT kill it.

```text
┌────────────────────────────────────────────────────────┐
│         THE CATASTROPHIC CASCADE OUTAGE SCENARIO       │
└────────────────────────────────────────────────────────┘
1. PostgreSQL Database experiences temporary connection spike / load.
2. Node.js Liveness probe queries PostgreSQL. Query times out.
3. Kubernetes declares Liveness FAILED on Pod 1 ──► KILLS AND RESTARTS POD 1!
4. Pods 2, 3, 4, 5 also fail Liveness ──────────► KUBERNETES KILLS ENTIRE CLUSTER!
5. 50 pods reboot simultaneously and bombard the database with initial startup connections!
6. Database crashes completely. The entire enterprise goes down!
```

#### Senior Architectural Rule:
- **Liveness Probe (`/healthz`):** Must check **internal process liveness ONLY** (e.g. is the event loop responsive, are we out of heap space). It must **NEVER** depend on third-party databases, caches, or external APIs.
- **Readiness Probe (`/ready`):** Checks external dependencies (PostgreSQL connection alive). If the DB slows down, the pod stops taking traffic gracefully while staying alive to finish in-flight requests.

---

## 3. Zero-Downtime Graceful Shutdown Architecture

### Q3: Implement a production-grade graceful shutdown manager in Node.js handling `SIGTERM` and in-flight requests.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[GracefulShutdown]` `[SIGTERM]` `[Kubernetes]`

**Answer:**

```typescript
import http from 'node:http';
import { Pool } from 'pg';

export class GracefulShutdownManager {
  private isShuttingDown = false;

  constructor(
    private readonly server: http.Server,
    private readonly dbPool: Pool,
    private readonly shutdownTimeoutMs = 15000 // 15-second hard timeout
  ) {
    process.on('SIGTERM', () => this.handleSignal('SIGTERM'));
    process.on('SIGINT', () => this.handleSignal('SIGINT'));
  }

  public isHealthy(): boolean {
    // Fails readiness probe immediately once shutdown commences
    return !this.isShuttingDown;
  }

  private async handleSignal(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    console.log(`Received ${signal}. Initiating graceful shutdown...`);

    // Hard timeout: Force exit if graceful drain hangs!
    const forceExitTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing process exit (1).');
      process.exit(1);
    }, this.shutdownTimeoutMs);
    forceExitTimer.unref();

    try {
      // Step 1: Wait 2-5 seconds for Kubernetes kube-proxy to remove pod from endpoints
      await new Promise(r => setTimeout(r, 3000));

      // Step 2: Stop accepting new HTTP connections; wait for in-flight requests to complete
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('HTTP server closed. In-flight requests drained.');

      // Step 3: Close database connection pools
      await this.dbPool.end();
      console.log('Database connection pool drained and closed.');

      console.log('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}
```

---

## 4. Post-Mortem Diagnostics, Core Dumps & llnode

### Q4: How do you inspect a production crash using Linux Core Dumps and `llnode`?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual  
**Tags:** `[CoreDumps]` `[Diagnostics]` `[Debugging]`

**Answer:**
When a Node.js process crashes due to a native segmentation fault or fatal OOM, it terminates instantly without printing a JavaScript stack trace.

A **Core Dump** captures the exact state of physical memory and CPU registers at the millisecond of the crash:
1. Enable core dumps on Linux: `ulimit -c unlimited`.
2. Launch Node with crash flag: `node --abort-on-uncaught-exception server.js`.
3. When the process crashes, the OS writes a `core.<pid>` dump file.

#### Inspecting with `llnode` (LLDB plugin for V8):
```bash
# Launch LLDB with Node binary and core file
lldb /usr/bin/node -c core.12345

# Load llnode plugin
(lldb) plugin load /usr/lib/llnode.so

# Print JavaScript stack trace from the crashed C++ core dump!
(lldb) v8 bt

# Inspect memory objects and find what caused the crash
(lldb) v8 findjsinstances Object
```
*Value:* Allows post-mortem inspection of actual variables and call stacks of a crashed server hours after the incident occurred.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: How do you measure event loop lag in Node.js with high precision?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[EventLoop]` `[perf_hooks]`

**Answer:**
Use the native `node:perf_hooks` module's **`monitorEventLoopDelay`**:
```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

// Inspect percentiles (values in nanoseconds):
console.log('p50 lag (ms):', histogram.percentile(50) / 1e6);
console.log('p99 lag (ms):', histogram.percentile(99) / 1e6);
```

---

### Q6: What is the difference between Active Handles and Active Requests in Node.js internals?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Internals]` `[Libuv]`

**Answer:**
- **Active Handles (`process._getActiveHandles()`):** Long-lived Libuv resources that keep the event loop alive (e.g., active TCP sockets, servers, timers).
- **Active Requests (`process._getActiveRequests()`):** Short-lived asynchronous operations currently in flight (e.g., an active file write or DNS resolution).
*Tip:* You can use `why-is-node-running` in test suites to inspect active handles preventing tests from exiting.
