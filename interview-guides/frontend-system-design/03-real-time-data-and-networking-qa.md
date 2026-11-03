# 03 — Real-Time Data & Networking

> Real-Time Protocol Matrix (WebSockets, SSE, Long Polling, WebRTC), Connection Lifecycle State Machine, Exponential Backoff with Full Jitter, Thundering Herd Reconnection Storms, Message Sequencing & Deduplication, and Client Offline Mutation Queues.

---

## 📑 Table of Contents
1. [Real-Time Protocol Selection Matrix](#1-real-time-protocol-selection-matrix)
2. [WebSocket Connection Lifecycle & Resilient State Machine](#2-websocket-connection-lifecycle--resilient-state-machine)
3. [The Thundering Herd Disaster & Jitter Math](#3-the-thundering-herd-disaster--jitter-math)
4. [Message Sequencing, Deduplication & Offline Buffers](#4-message-sequencing-deduplication--offline-buffers)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Real-Time Protocol Selection Matrix

### Q1: Compare WebSockets, Server-Sent Events (SSE), Long Polling, and WebRTC DataChannels. Which protocol should you choose for different real-world workloads?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RealTime]` `[WebSockets]` `[SSE]` `[WebRTC]` `[Networking]`

**Answer:**
Frontend system design interviews frequently test your ability to defend protocol selection based on **directionality**, **connection overhead**, **firewall traversal**, and **battery/memory impact**.

```text
The Protocol Landscape:

1. Short Polling:
   Client ──► [HTTP GET] ──► Server
   Client ◄── [200 OK]   ◄── Server (Client repeats every 3 seconds: Heavy overhead!)

2. Long Polling:
   Client ──► [HTTP GET] ──► Server (Server holds connection open until event occurs)
   Client ◄── [200 OK]   ◄── Server (Connection closes; client immediately opens next request)

3. Server-Sent Events (SSE):
   Client ──► [HTTP GET text/event-stream] ──► Server
   Client ◄── Stream Chunk 1 ◄── Server (Persistent unidirectional push over HTTP/2)
   Client ◄── Stream Chunk 2 ◄── Server

4. WebSockets:
   Client ──► [HTTP 101 Switching Protocols] ──► Server
   Client ◄═════════════ Bidirectional TCP Socket ════════════► Server (2-byte frame overhead)

5. WebRTC DataChannels:
   Peer A ◄══════════════ UDP SCTP Peer-to-Peer ══════════════► Peer B (Sub-millisecond latency)
```

#### Detailed Protocol Comparison Matrix:

| Dimension | WebSockets (WSS) | Server-Sent Events (SSE) | Long Polling | WebRTC DataChannel |
| :--- | :--- | :--- | :--- | :--- |
| **Directionality** | Full-Duplex (Bidirectional) | Half-Duplex (Server ➔ Client only) | Half-Duplex (Client pull / Server hold) | Full-Duplex (Peer-to-Peer) |
| **Transport Protocol**| TCP (Custom framing) | HTTP/1.1 or HTTP/2 (`text/event-stream`) | HTTP/1.1 or HTTP/2 | UDP (via SCTP over DTLS) |
| **Framing Overhead** | 🟢 2–10 bytes per frame | 🟢 Minimal text formatting | 🔴 Full HTTP headers (1KB+ per request) | 🟢 Lowest (UDP packet headers) |
| **Auto-Reconnection**| 🔴 Manual client logic | 🟢 Native browser `EventSource` | 🟡 Manual loop | 🔴 Complex ICE restart |
| **Multiplexing** | 🟡 Needs custom app multiplexing | 🟢 Native over HTTP/2 | ❌ No | 🟢 Native independent channels |
| **Firewall / Proxy** | 🟡 Blocked by aggressive corporate proxies | 🟢 100% standard HTTP | 🟢 100% standard HTTP | 🟡 NAT/STUN/TURN required |
| **Ideal Workloads** | Interactive Chat, Multiplayer Gaming, Collaborative Docs | Stock Tickers, Live Sports Scores, AI LLM Token Streaming | Legacy fallbacks where WebSockets fail | P2P Video/Audio, low-latency gaming |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is SSE significantly better than WebSockets for streaming AI responses (like ChatGPT)?"  
*Senior Answer:* "Streaming LLM tokens is purely **unidirectional** (server-to-client). SSE operates over standard HTTP/2, giving you native connection multiplexing (multiple chats over a single TCP socket), built-in browser reconnection (`EventSource`), seamless compatibility with corporate firewalls and standard HTTP caching proxies, and zero need for custom ping-pong keepalive state machines."

---

## 2. WebSocket Connection Lifecycle & Resilient State Machine

### Q2: Design and implement a production-grade WebSocket client state machine with heartbeats and automated reconnection in TypeScript.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[WebSockets]` `[StateMachine]` `[Heartbeat]` `[TypeScript]`

**Answer:**
A naive `new WebSocket(url)` fails in production because:
1. Mobile devices frequently transition across Wi-Fi and 5G cellular networks, creating "zombie" half-open sockets where the client thinks it is connected, but the server is unreachable.
2. The native WebSocket API lacks built-in reconnection, heartbeat pings, and outbound offline queues.

#### Architectural State Machine:
```text
┌──────────────┐   connect()   ┌────────────┐   onopen   ┌───────────┐
│ DISCONNECTED │ ────────────► │ CONNECTING │ ─────────► │ CONNECTED │ (Heartbeat Active)
└──────────────┘               └────────────┘            └───────────┘
       ▲                              │                        │
       │                              │ onerror                │ onclose / ping timeout
       │                              ▼                        ▼
       │                       ┌──────────────┐         ┌─────────────┐
       └────────────────────── │ RECONNECTING │ ◄────── │ DISCONNECT  │
          max retries reached  └──────────────┘         └─────────────┘
                               (Backoff + Jitter)
```

#### Production Implementation:

```typescript
type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

interface WebSocketClientOptions {
  url: string;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
  maxReconnectAttempts?: number;
}

export class ResilientWebSocket {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private outboundQueue: string[] = [];

  constructor(private options: WebSocketClientOptions) {
    this.options.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30000;
    this.options.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 5000;
    this.options.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  public connect(): void {
    if (this.state === 'CONNECTED' || this.state === 'CONNECTING') return;

    this.state = 'CONNECTING';
    this.socket = new WebSocket(this.options.url);

    this.socket.onopen = () => {
      this.state = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushOutboundQueue();
    };

    this.socket.onmessage = (event) => {
      if (event.data === 'PONG') {
        this.clearPingTimeout();
        return;
      }
      this.handleIncomingMessage(event.data);
    };

    this.socket.onclose = () => this.handleDisconnect();
    this.socket.onerror = () => this.handleDisconnect();
  }

  public send(payload: string): void {
    if (this.state === 'CONNECTED' && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      // Buffer messages in memory while offline
      this.outboundQueue.push(payload);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('PING');
        // If server fails to reply PONG within 5s, socket is a zombie
        this.pingTimeoutTimer = setTimeout(() => {
          console.warn('Ping timeout! Terminating dead socket.');
          this.socket?.close();
        }, this.options.heartbeatTimeoutMs);
      }
    }, this.options.heartbeatIntervalMs);
  }

  private clearPingTimeout(): void {
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.clearPingTimeout();
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    if (this.state === 'DISCONNECTED') return;

    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts ?? 10)) {
      this.state = 'DISCONNECTED';
      console.error('Max reconnection attempts exhausted.');
      return;
    }

    this.state = 'RECONNECTING';
    this.reconnectAttempts++;

    // Exponential Backoff with Full Jitter Formula
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, this.reconnectAttempts));
    const jitteredDelay = Math.floor(Math.random() * exponentialDelay);

    setTimeout(() => this.connect(), jitteredDelay);
  }

  private flushOutboundQueue(): void {
    while (this.outboundQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const msg = this.outboundQueue.shift();
      if (msg) this.socket.send(msg);
    }
  }

  private handleIncomingMessage(data: string): void {
    // Dispatch to application bus
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why do we send application-level `PING`/`PONG` text strings instead of native WebSocket Ping frames (`0x9`)?"  
*Senior Answer:* "The W3C browser WebSocket API **does not expose native Ping/Pong frames to JavaScript**. Browsers handle protocol-level ping frames automatically in C++ without triggering any JS event. Therefore, to verify end-to-end application server liveness and detect stuck Node.js event loops, frontend applications must implement application-level text ping/pong payloads."

---

## 3. The Thundering Herd Disaster & Jitter Math

### Q3: What is the Thundering Herd Reconnection Storm? Walk through the mathematics of Exponential Backoff with Full Jitter.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Architecture  
**Tags:** `[ThunderingHerd]` `[JitterMath]` `[Resilience]`

**Answer:**
Consider an architecture where 100,000 active clients are connected via WebSocket to a cluster of backend socket servers. The engineering team deploys a new backend release, terminating all 100,000 connections simultaneously.

```text
The Thundering Herd Disaster:

Without Jitter (Fixed or Simple Exponential):
Time (s): 0s                1s                                 2s
Clients:  100,000 Disconnect ──► 100,000 Simultaneous Reconnects ──► CRASHES NEW SERVERS!
                                 (Massive traffic spike: 100k requests in 10ms)

With Full Jitter:
Time (s): 0s                1s       2s       3s       4s       5s       6s
Clients:  100,000 Disconnect ──► [=== Smooth, Uniformly Distributed Wave of Traffic ===]
                                 (Server CPU remains stable; all clients reconnect safely)
```

#### The Jitter Algorithms (AWS Research Model):
1. **No Jitter (Disaster):**
   $$\text{Sleep} = \min(M, B \times 2^i)$$
   Every client sleeps for the exact same duration ($1\text{s}, 2\text{s}, 4\text{s}, 8\text{s}$), creating periodic shockwaves that repeatedly take down recovering servers.
2. **Equal Jitter:**
   $$\text{Sleep} = \frac{\text{temp}}{2} + \text{random}\left(0, \frac{\text{temp}}{2}\right) \quad \text{where } \text{temp} = \min(M, B \times 2^i)$$
3. **Full Jitter (Optimal Production Standard):**
   $$\text{Sleep} = \text{random}(0, \min(M, B \times 2^i))$$
   Full Jitter distributes the reconnection attempts uniformly between 0 and the current exponential ceiling. It minimizes the total time for all clients to reconnect while completely eliminating load spikes.

---

## 4. Message Sequencing, Deduplication & Offline Buffers

### Q4: How do you guarantee message ordering and zero duplicates in an unstable network environment where packets can arrive out of order?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[Deduplication]` `[Ordering]` `[LRUCache]`

**Answer:**
Because WebSockets operate over TCP, messages within a single TCP connection arrive in order. However, across network disconnects, tab switches, and retry attempts, duplicates and race conditions inevitably occur:

```text
Out-of-Order & Duplicate Message Hazard:

Client               Network Intermediary               Server
  │                           │                           │
  │ 1. Send Msg A (id: 1)     │                           │
  ├──────────────────────────►│ (Packet delayed in route) │
  │                           │                           │
  │ [Client switches to 5G; reconnects new socket]        │
  │ 2. Send Msg B (id: 2)     │                           │
  ├──────────────────────────────────────────────────────►│
  │                           │                           │
  │                           │ Msg A finally arrives!    │
  │                           ├──────────────────────────►│
```

#### Architectural Mitigations:
1. **Client-Side UUID & Idempotency Keys:** Every message generated by the client receives an immutable `client_uuid = crypto.randomUUID()`. The server uses this key to enforce database unique constraints.
2. **Monotonic Sequence Numbers (`seq_id`):** The server assigns an auto-incrementing integer sequence per conversation channel.
3. **Sliding Window Deduplication (LRU):** The client maintains an in-memory Least-Recently-Used (LRU) cache of the last 1,000 received message IDs. If an incoming message ID already exists in the cache, it is dropped silently.
4. **Gap Detection Protocol:**
   - Client expects `seq_id = 45`.
   - Client receives `seq_id = 48`.
   - Client detects a **gap** of missing messages (46, 47). It buffers message 48 and issues an HTTP REST sync request: `GET /api/messages?channel=C1&since_seq=45&until_seq=48`.

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug: Investigating why an `EventSource` connection drops and renegotiates every 60 seconds behind an AWS ALB.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[AWS]` `[ALB]` `[SSE]` `[Debugging]`

**Scenario:**
You deploy an SSE stock ticker dashboard. Users report that their charts freeze briefly every minute, and the network tab shows:
```text
GET /api/ticker (Status: (cancelled) after 60.01s)
GET /api/ticker (Status: 200 OK text/event-stream - reconnects)
```
Why does this happen, and what is the fix?

#### Root Cause:
AWS Application Load Balancer (ALB) and NGINX have an **Idle Connection Timeout** defaulting to 60 seconds. If no bytes are transmitted across an active HTTP socket for 60 seconds, the load balancer forcibly terminates the TCP connection with a `TCP RST`.

#### The Fix:
Configure the backend server to transmit periodic SSE **heartbeat comments** every 15–20 seconds:
```text
: keep-alive heartbeat\n\n
```
In the SSE specification, any line beginning with a colon (`:`) is treated as a comment and ignored by the browser's `EventSource` parser, but keeps the underlying TCP socket active through the load balancer.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Can you send custom HTTP authorization headers with the native browser `WebSocket` or `EventSource` APIs?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** No! The browser `new WebSocket(url)` and `new EventSource(url)` constructors do **not** support setting custom HTTP headers (like `Authorization: Bearer <token>`). To authenticate, you must either: (1) Rely on secure `HttpOnly` session cookies sent automatically during the initial handshake, or (2) Pass an ephemeral short-lived ticket token in the query parameters (`wss://api.com/socket?ticket=xyz`), or (3) For WebSockets, connect unauthenticated and send an authentication payload as the very first message.

### Q7: What is the maximum number of concurrent HTTP/1.1 connections a browser can open to a single domain, and how does HTTP/2 change this?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Answer:** Browsers enforce a strict limit of **6 concurrent TCP connections per origin** under HTTP/1.1. If you open 6 SSE streams, the entire domain is blocked from loading any other images, styles, or API requests! Under HTTP/2, all streams are multiplexed over a **single TCP socket**, eliminating this limitation.

### Q8: How can 10 browser tabs share a single WebSocket connection to save memory and battery?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical  
**Answer:** By encapsulating the WebSocket connection inside a **`SharedWorker`**. All 10 browser tabs connect to the `SharedWorker` via `MessagePort`. The worker maintains exactly one physical WebSocket connection to the server, demultiplexing incoming messages across all connected tabs.
