# 11 — Real-Time, Event Queues & Distributed Communication

> WebSockets (`ws`, Socket.io) & Zombie Socket Pruning, Server-Sent Events (SSE), GraphQL Security & Mercurius, gRPC Streaming, and BullMQ Distributed Task Queues.

---

## 📑 Table of Contents
1. [WebSockets Internals & Zombie Connection Pruning](#1-websockets-internals--zombie-connection-pruning)
2. [Server-Sent Events (SSE) Architecture](#2-server-sent-events-sse-architecture)
3. [GraphQL Security & Mercurius High-Speed Engine](#3-graphql-security--mercurius-high-speed-engine)
4. [gRPC & Protocol Buffers in Microservices](#4-grpc--protocol-buffers-in-microservices)
5. [Distributed Background Jobs with BullMQ & Redis](#5-distributed-background-jobs-with-bullmq--redis)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. WebSockets Internals & Zombie Connection Pruning

### Q1: How does the HTTP Upgrade handshake transition a TCP socket to a WebSocket, and why is `ws` preferred over Socket.io in high-scale architectures?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[WebSockets]` `[Networking]` `[Protocols]`

**Answer:**

#### The HTTP Upgrade Handshake:
A WebSocket starts as a standard HTTP/1.1 request:
1. Client sends `GET /chat` with headers:
   `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`.
2. Server validates key, returns HTTP status **`101 Switching Protocols`** with `Sec-WebSocket-Accept`.
3. From that exact instant, **HTTP parser is detached**. The underlying TCP socket remains open, and data is transmitted using minimal 2-to-10 byte binary **WebSocket Frames**.

```text
HTTP Handshake (:80/:443) ──► HTTP 101 Switching Protocols ──► Full-Duplex Binary Framing
```

#### Raw `ws` vs Socket.io:
| Feature | Raw `ws` Library | Socket.io |
|---|---|---|
| **Protocol** | RFC 6455 Pure WebSocket Standard | Proprietary Engine.IO protocol layered over WebSocket |
| **Fallback** | None (pure WebSocket) | HTTP Long-Polling fallback (significant overhead) |
| **Packet Overhead** | Minimal (standard frame header) | High (JSON string wrappers, event names, acks) |
| **Memory Footprint** | Extremely low (~20KB per socket) | Moderate (~80–120KB per socket) |
| **Best For** | High-scale, real-time trading/gaming, microservices | Rapid prototyping, automatic reconnection fallback |

---

### Q2: What is a "Zombie Connection" in WebSockets, and how do you implement heartbeat ping/pong pruning in Node.js?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[WebSockets]` `[Heartbeats]` `[Memory]`

**Answer:**
If a mobile client enters an elevator or tunnel, its network connection drops abruptly without sending a TCP `FIN` packet.
- The Node.js server believes the socket is still open and connected!
- Thousands of "Zombie Connections" accumulate, leaking memory, file descriptors, and consuming broadcast CPU cycles.

#### Implementing Ping/Pong Pruning with `ws`:
```typescript
import { WebSocketServer, WebSocket } from 'ws';

interface HeartbeatWebSocket extends WebSocket {
  isAlive: boolean;
}

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: HeartbeatWebSocket) => {
  ws.isAlive = true;

  // Pong received from client resets alive state
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Periodic Heartbeat Sweep (Every 30 seconds)
const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as HeartbeatWebSocket;

    if (!ws.isAlive) {
      console.log('Terminating dead zombie socket...');
      return ws.terminate(); // Closes socket immediately without graceful handshake
    }

    // Mark as unverified and issue ping frame
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));
```

---

## 2. Server-Sent Events (SSE) Architecture

### Q3: When should you choose Server-Sent Events (SSE) over WebSockets, and how do you build an SSE endpoint in Fastify/Express?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[SSE]` `[HTTP2]` `[RealTime]`

**Answer:**

#### When to Choose SSE:
- **Unidirectional Data Flow:** Data travels strictly from server to client (e.g., live stock tickers, LLM AI completions, dashboard notifications).
- **Native Browser Reconnection:** Browsers natively auto-reconnect via `EventSource` with built-in last-event ID tracking (`Last-Event-ID`).
- **HTTP/2 Multiplexing:** Operates over standard HTTP/2, multiplexing multiple SSE streams over a single TCP connection through proxies and firewalls without custom protocol routing.

#### Production SSE Implementation:
```typescript
import { Request, Response } from 'express';

export function sseHandler(req: Request, res: Response) {
  // 1. Mandatory SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx proxy buffering!
  });

  // Send initial connected confirmation
  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Stream events to client
  const interval = setInterval(() => {
    const payload = { time: new Date().toISOString(), memory: process.memoryUsage().heapUsed };
    res.write(`event: metrics\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 2000);

  // Clean up interval when client disconnects
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
```

---

## 3. GraphQL Security & Mercurius High-Speed Engine

### Q4: What are the primary Denial of Service vulnerabilities unique to GraphQL in Node.js, and how do you mitigate them?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[GraphQL]` `[Security]` `[DoS]`

**Answer:**

#### 1. Malicious Deeply Nested Queries (Query Depth Attack)
An attacker sends a recursively nested query that creates exponential database and memory lookups:
```graphql
query MaliciousQuery {
  author(id: "1") {
    posts {
      author {
        posts {
          author { ... }
        }
      }
    }
  }
}
```
*Mitigation:* Use `graphql-depth-limit` to reject any query deeper than 5–7 levels.

#### 2. Query Complexity Analysis
Calculate a numeric cost for each requested field before execution (e.g., scalar = 1 point, list = 10 points). Reject queries with a total cost exceeding a maximum budget (e.g., max 500 points).

#### 3. Why Mercurius is Preferred over Apollo Server on Fastify:
Mercurius compiles query validation and resolution via Fastify's JIT infrastructure, eliminating Apollo Server's internal schema-walking latency and caching compiled query execution plans for maximum speed.

---

## 4. gRPC & Protocol Buffers in Microservices

### Q5: Why is gRPC with Protocol Buffers superior to REST/JSON for high-throughput internal microservice communication?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[gRPC]` `[Protobuf]` `[Microservices]`

**Answer:**

```text
REST over HTTP/1.1: [ String Headers + Verbose Plaintext JSON ] ──► Parsing CPU Overhead
gRPC over HTTP/2:   [ Compressed Binary Framing + Binary Protobuf ] ──► Fast Memory Deserialization
```

1. **Compact Binary Encoding:** Protocol Buffers serialize data into binary bit-level tags and varints, reducing network payload size by 60–80% compared to verbose JSON strings.
2. **Strict Contract Enforced at Compile Time:** `.proto` definitions auto-generate strictly typed TypeScript interfaces.
3. **HTTP/2 Transport:** Built on HTTP/2 by default, supporting bidirectional streaming, multiplexing, and header compression.
4. **Faster Deserialization:** Protobuf deserialization in Node.js consumes significantly fewer V8 CPU cycles than `JSON.parse()`.

---

## 5. Distributed Background Jobs with BullMQ & Redis

### Q6: How does BullMQ ensure that exactly one worker claims a job from Redis, and how does it handle worker crashes mid-job?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[BullMQ]` `[Redis]` `[DistributedSystems]`

**Answer:**

#### Atomic Job Acquisition via Redis Lua Scripts:
In distributed environments, multiple Node.js workers poll Redis concurrently. To avoid race conditions where two workers claim the same job:
- BullMQ executes **atomic Redis Lua scripts** (`EVALSHA`).
- The Lua script transitions the job atomically from the `'wait'` queue to the `'active'` hash and moves its ID into a worker-specific lock list in a single, uninterrupted atomic operation inside Redis.

```text
[ Redis 'wait' Queue ]
          │
      Atomic Lua Script (evalsha)
          ▼
[ Redis 'active' Hash ] ──► Locked exclusively to Worker A (with TTL Lock)
```

#### Handling Worker Crashes (Lock Renewal & Stalled Jobs):
- While processing, Worker A periodically extends a **Job Lock** (default: every 15–30 seconds).
- If Worker A crashes (OOM or power cut):
  1. The lock in Redis expires.
  2. A background BullMQ **Stalled Job Checker** on surviving workers detects that the lock expired while still in `'active'`.
  3. BullMQ moves the job back to the `'wait'` queue or increments the retry count and moves it to the **Dead Letter Queue (DLQ)** if maximum attempts are exhausted.

```typescript
import { Worker, Queue } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

// Worker with Concurrency Limit and Auto-Retries
const emailWorker = new Worker('email-queue', async (job) => {
  console.log(`Processing job ${job.id}: Sending email to ${job.data.email}`);
  await emailService.send(job.data);
}, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently on this node
  limiter: {
    max: 100,      // Rate limiting: Max 100 jobs
    duration: 1000 // per second
  }
});
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What happens to pending WebSocket connections when a Node.js process receives a `SIGTERM` signal?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[WebSockets]` `[GracefulShutdown]`

**Answer:**
If the process exits immediately (`process.exit(0)`), TCP sockets close with an unexpected reset packet (`RST`), dropping messages.
*Graceful Pattern:* Intercept `SIGTERM`, broadcast a WebSocket close frame (`code 1001: Going Away`) to all clients, wait 5 seconds for clients to initiate reconnects to another instance, and then close the server (`wss.close()`).

---

### Q8: What is the purpose of a Dead Letter Queue (DLQ) in BullMQ?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Queues]` `[Reliability]`

**Answer:**
When a job fails after exhausting its maximum configured retry attempts (e.g. 3 attempts with exponential backoff), it is placed in the **Failed / Dead Letter Queue**. This isolates poison-pill jobs, prevents infinite retry loops, and preserves the payload and error stack trace for manual engineer inspection.
