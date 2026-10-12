# 08 — Networking, HTTP, DNS & Protocols

> HTTP/HTTPS Request Lifecycles, The `dns.lookup` vs `dns.resolve` Thread Pool Trap, Socket Pooling (`http.Agent`), HTTP/2 Multiplexing, and Low-Level TCP.

---

## 📑 Table of Contents
1. [HTTP/HTTPS Internals & Socket Lifecycles](#1-httphttps-internals--socket-lifecycles)
2. [The DNS Resolution Trap: dns.lookup vs dns.resolve](#2-the-dns-resolution-trap-dnslookup-vs-dnsresolve)
3. [Connection Keep-Alive & http.Agent Pooling](#3-connection-keep-alive--httpagent-pooling)
4. [HTTP/2 Architecture & Multiplexing](#4-http2-architecture--multiplexing)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. HTTP/HTTPS Internals & Socket Lifecycles

### Q1: What is the lifecycle of an incoming HTTP request in Node.js, and why are `req` and `res` streams?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[HTTP]` `[Streams]` `[Networking]`

**Answer:**
Under the hood, `node:http` parses incoming network data using V8 and the high-performance C HTTP parser (llhttp):

```text
Client TCP Packet ──► Kernel Socket Buffer ──► Libuv Poll Phase
                                                     │
                                            llhttp C Parser
                                                     │
                                    Emits 'request' event
                                    ┌──────────────────────┐
                                    │ req: Readable Stream │
                                    │ res: Writable Stream │
                                    └──────────────────────┘
```

- **`req` (`http.IncomingMessage`):** A **`Readable` Stream**. Node does not buffer the entire request body into memory before emitting the `'request'` event. It parses the headers, instantiates the stream, and streams the body payload in chunks as TCP packets arrive.
- **`res` (`http.ServerResponse`):** A **`Writable` Stream**. Calling `res.write()` writes directly to the underlying TCP socket buffer, enabling high-performance streaming responses (like video feeds or SSE).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a client disconnects midway through sending a large file upload?"  
*Senior Answer:* The underlying socket emits a `'close'` event. The `req` stream terminates prematurely with an `'aborted'` event. If the server does not handle `req.on('close')` or use modern `stream.pipeline()`, resources (like database transactions or cloud upload streams) remain dangling.

---

## 2. The DNS Resolution Trap: dns.lookup vs dns.resolve

### Q2: Why is `dns.lookup()` considered one of the biggest hidden performance traps in Node.js microservices?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[DNS]` `[Libuv]` `[ThreadPool]` `[Gotcha]`

**Answer:**
Node.js provides two completely different DNS mechanisms in the `node:dns` module:

```text
1. dns.lookup('example.com')
   └──► Uses OS system call: getaddrinfo(3)
        └──► SYNCHRONOUS C CALL! Must run inside Libuv's 4-thread pool!
        └──► Respects /etc/hosts and OS config.

2. dns.resolve('example.com')
   └──► Uses c-ares library over network socket
        └──► PURE ASYNCHRONOUS NETWORK I/O! Does NOT touch the thread pool!
        └──► Ignores /etc/hosts; queries DNS nameservers directly.
```

#### The Production Outage:
By default, **every outbound HTTP request made via `http.get()`, `fetch()`, or `axios` uses `dns.lookup()` under the hood!**

If your microservice makes 10 concurrent outbound requests to external APIs or databases:
- The first 4 requests occupy the 4 Libuv worker threads to run `getaddrinfo(3)`.
- The remaining 6 requests are **stalled in the thread pool queue**.
- Worse: All local disk operations (`fs.readFile`) and crypto operations (`crypto.pbkdf2`) in your application are **completely blocked** waiting for DNS resolution!

#### The Fix:
1. Increase `UV_THREADPOOL_SIZE=64` before startup.
2. In high-throughput HTTP clients, use an in-memory DNS cache (like `cacheable-lookup`) that resolves hostnames asynchronously via `dns.resolve()` and caches IPs with TTL.

---

## 3. Connection Keep-Alive & http.Agent Pooling

### Q3: How does `http.Agent` work, and why does disabling Keep-Alive cause severe TCP socket exhaustion (`EADDRNOTAVAIL`) under high load?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[Networking]` `[httpAgent]` `[Sockets]`

**Answer:**

#### The Cost of Opening New TCP Connections:
Every new HTTPS connection requires:
1. DNS resolution.
2. TCP 3-Way Handshake (SYN ➔ SYN-ACK ➔ ACK) = 1 Round-Trip Time (RTT).
3. TLS 1.3 Handshake = 1–2 RTTs.
Total latency cost: ~50–150ms *per request* just to establish the connection!

When a connection closes, the OS puts the local port into the **`TIME_WAIT`** state for 60–120 seconds to catch delayed packets. If you make 1,000 req/s without Keep-Alive, the OS exhausts all 65,535 ephemeral ports, throwing `EADDRNOTAVAIL`.

#### The Solution: Reusing Sockets via `http.Agent`:
```typescript
import http from 'node:http';
import https from 'node:https';

export const persistentAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000, // Send TCP keep-alive probes every 30s
  maxSockets: 100,       // Max concurrent open sockets per host (Default was 4 in older Node!)
  maxFreeSockets: 20,    // Max idle sockets kept open in the pool
  timeout: 60000,        // Socket timeout
});

// Pass agent to outbound HTTP requests:
// fetch('https://api.internal', { dispatcher: ... }) or axios.get(url, { httpsAgent: persistentAgent })
```

---

## 4. HTTP/2 Architecture & Multiplexing

### Q4: How does HTTP/2 solve Head-of-Line (HoL) blocking, and how do you implement an HTTP/2 server in Node.js?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[HTTP2]` `[Protocols]` `[Performance]`

**Answer:**
- **HTTP/1.1 Head-of-Line Blocking:** A TCP connection can only handle one HTTP request/response exchange at a time. If Request 1 is slow, Requests 2 and 3 must wait behind it.
- **HTTP/2 Multiplexing:** Divides data into binary frames assigned to logical **Streams**. Multiple request/response streams interleave concurrently over a **single shared TCP connection**.

```text
HTTP/1.1: [ Request 1 ] ──────► [ Response 1 ] ──────► [ Request 2 ] (Serial)

HTTP/2:   ───[ Stream 1: Chunk A ]──[ Stream 2: Chunk A ]──[ Stream 1: Chunk B ]──► (Multiplexed)
```

#### Node.js HTTP/2 Server Implementation:
```typescript
import http2 from 'node:http2';
import fs from 'node:fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
});

server.on('stream', (stream, headers) => {
  const method = headers[':method'];
  const path = headers[':path'];

  if (method === 'GET' && path === '/api/data') {
    stream.respond({
      ':status': 200,
      'content-type': 'application/json; charset=utf-8',
    });

    stream.end(JSON.stringify({ status: 'ok', protocol: 'HTTP/2' }));
  } else {
    stream.respond({ ':status': 404 });
    stream.end('Not Found');
  }
});

server.listen(8443, () => console.log('HTTP/2 server active on https://localhost:8443'));
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What do `ECONNRESET`, `ETIMEDOUT`, and `EADDRINUSE` mean in Node.js?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Networking]` `[Errors]`

**Answer:**
- **`ECONNRESET`:** The remote peer closed or abruptly terminated the TCP connection (sent a `RST` TCP packet) while data was being transmitted.
- **`ETIMEDOUT`:** The client sent a TCP SYN packet, but received no response within the OS TCP timeout window (network dropped or firewall silently dropped packet).
- **`EADDRINUSE`:** A local server tried to bind to an IP/port already bound by another process.

---

### Q6: How does native `fetch()` in Node.js 18+ differ from external packages like `axios`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[fetch]` `[Undici]`

**Answer:**
Native `fetch()` is implemented directly on **Undici**, Node's rewritten C++/JS HTTP/1.1 client. It does not use `node:http` or `http.Agent`. Instead, it uses Undici connection pools (`undici.Agent`), supports WHATWG standard `Request`/`Response`/`Headers` objects, and works natively with `AbortSignal`.
