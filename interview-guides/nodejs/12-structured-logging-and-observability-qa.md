# 12 — Structured Logging & Distributed Observability

> Why `console.log` Blocks the Event Loop, High-Throughput Pino Logging, Asynchronous Context Propagation (`AsyncLocalStorage`), and OpenTelemetry Distributed Tracing.

---

## 📑 Table of Contents
1. [The Danger of console.log & Pino Architecture](#1-the-danger-of-consolelog--pino-architecture)
2. [Automated Context Injection with AsyncLocalStorage](#2-automated-context-injection-with-asynclocalstorage)
3. [OpenTelemetry (OTel) Distributed Tracing Architecture](#3-opentelemetry-otel-distributed-tracing-architecture)
4. [Log Redaction & 12-Factor App Observability](#4-log-redaction--12-factor-app-observability)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. The Danger of console.log & Pino Architecture

### Q1: Why is `console.log()` dangerous in high-load production Node.js applications, and how does Pino achieve extreme throughput?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Logging]` `[Pino]` `[Performance]`

**Answer:**

#### Why `console.log()` Degrades Production Performance:
1. **Synchronous File Descriptors:** In Node.js, `process.stdout` and `process.stderr` are usually **synchronous blocking streams** when redirected to files or pipes (e.g., in Docker containers and Kubernetes logging sidecars). Writing large objects blocks the V8 call stack and freezes the event loop.
2. **Runtime Formatting & Overhead:** `console.log()` executes string interpolation (`util.format`) and recursive object inspection synchronously on the main thread.

```text
console.log: [ Main Thread ] ──► Formats string ──► Synchronously blocks stdout ──► Slow!
Pino:        [ Main Thread ] ──► fast-json-stringify ──► SonicBoom (Asynchronous Buffer) ──► Fast!
```

#### Why Pino Dominates Enterprise Benchmarks:
- **`fast-json-stringify` Serialization:** Pino avoids recursive runtime reflection by formatting log entries via compiled serializers.
- **Non-blocking SonicBoom Buffering:** Pino buffers log lines in memory and flushes them to the OS file descriptor using `sonic-boom` or offloads disk writing completely to a dedicated **Worker Thread** via `pino.transport()`.

```typescript
import pino from 'pino';

// High-Performance Production Logger Configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }), // Numeric -> String label ("info")
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV === 'production' 
    ? undefined // Log raw ndjson directly to stdout for Kubernetes collectors
    : { target: 'pino-pretty' }, // Pretty print only in local development
});
```

---

## 2. Automated Context Injection with AsyncLocalStorage

### Q2: How do you automatically inject `requestId` and `userId` into every log statement across your codebase without passing a `logger` argument down function calls?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Logging]` `[AsyncLocalStorage]` `[Architecture]`

**Answer:**
By combining **Pino Child Loggers** with **`AsyncLocalStorage`**, any service or database utility can access an automatically enriched logger from anywhere in the call graph.

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import pino, { Logger } from 'pino';
import { Request, Response, NextFunction } from 'express';

const baseLogger = pino();
const storage = new AsyncLocalStorage<Logger>();

// Express / Fastify Middleware
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

  // Create scoped child logger pre-loaded with request context
  const childLogger = baseLogger.child({
    requestId,
    method: req.method,
    url: req.url,
  });

  // Scope child logger to this request's asynchronous execution chain
  storage.run(childLogger, () => {
    next();
  });
}

// Global Logger Helper (Import anywhere in controllers, repositories, services)
export const log = {
  info: (msg: string, obj?: object) => (storage.getStore() || baseLogger).info(obj, msg),
  warn: (msg: string, obj?: object) => (storage.getStore() || baseLogger).warn(obj, msg),
  error: (msg: string, obj?: object) => (storage.getStore() || baseLogger).error(obj, msg),
};

// In deep database repository:
export async function findUser(id: string) {
  log.info('Fetching user from PostgreSQL', { id });
  // Automatically outputs: {"level":"info","requestId":"c89a-...","method":"GET","url":"/users/1","id":"1","msg":"Fetching user..."}
}
```

---

## 3. OpenTelemetry (OTel) Distributed Tracing Architecture

### Q3: What is the W3C Trace Context standard, and how does OpenTelemetry trace a request across distributed microservices?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[OpenTelemetry]` `[DistributedTracing]` `[W3C]`

**Answer:**

#### The W3C `traceparent` Header:
When Service A calls Service B over HTTP, OpenTelemetry injects the **`traceparent`** HTTP header:
`traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`

```text
00               - 4bf92f3577b34da6a3ce929d0e0e4736 - 00f067aa0ba902b7 - 01
Version (2 hex)    Trace ID (32 hex characters)       Parent Span ID     Trace Flags (01 = sampled)
                   (Shared across all services!)      (Current service)
```

```text
[ Client Request ]
       │
       ▼
[ API Gateway ] ────(Span 1)────► Injects traceparent header
       │
       ▼ (HTTP Call)
[ Order Service ] ──(Span 2)────► Reads traceparent; creates child span
       │
       ▼ (gRPC Call)
[ Payment Service ] ─(Span 3)───► Reads traceparent; creates child span
```

#### Bootstrapping OpenTelemetry Node SDK:
Must be executed **before any other library is imported** (via `node --import ./tracing.js` or `node -r ./tracing.js`):

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://collector.internal:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instruments node:http, express, fastify, pg, redis, etc.
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Avoid noisy FS spans
    }),
  ],
});

sdk.start();
console.log('OpenTelemetry auto-instrumentation initialized.');
```

---

## 4. Log Redaction & 12-Factor App Observability

### Q4: How do you configure automated PII redaction (credit cards, passwords, JWTs) in structured logs without performance degradation?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Security]` `[PII]` `[Pino]`

**Answer:**
Pino includes built-in high-speed path-based redaction that masks keys during schema stringification before writing to the output stream:

```typescript
import pino from 'pino';

export const secureLogger = pino({
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.creditCard',
      'body.token',
      '*.password', // Wildcard matching on nested objects
    ],
    censor: '[REDACTED]', // Replacement text
    remove: false,        // If true, deletes the key entirely
  },
});
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What is `pino.final()`, and why is it mandatory during unexpected process crashes?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Pino]` `[GracefulShutdown]` `[Gotcha]`

**Answer:**
Because Pino buffers logs in memory asynchronously for performance, if an unhandled fatal error or `SIGTERM` triggers `process.exit(1)`, **the buffered logs in memory are lost!** You won't see the crash error in your logging system.
`pino.final()` creates an emergency synchronous flusher:
```typescript
process.on('uncaughtException', pino.final(logger, (err, finalLogger) => {
  finalLogger.fatal(err, 'Uncaught exception! Crashing synchronously.');
  process.exit(1);
}));
```

---

### Q6: How does OpenTelemetry preserve trace context across asynchronous Promise and setTimeout boundaries in Node.js?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[OpenTelemetry]` `[AsyncLocalStorage]`

**Answer:**
OpenTelemetry's Node.js SDK uses **`AsyncLocalStorage`** internally as its context manager (`AsyncLocalStorageContextManager`). When an async boundary is crossed, V8 preserves the active Span context automatically.
