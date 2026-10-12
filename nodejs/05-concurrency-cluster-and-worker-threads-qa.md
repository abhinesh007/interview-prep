# 05 — Concurrency, Cluster & Worker Threads

> Libuv Thread Pool (`UV_THREADPOOL_SIZE`), Cluster Architecture, Multi-Threading with `worker_threads`, Shared Memory (`Atomics`), and `child_process`.

---

## 📑 Table of Contents
1. [The Libuv Thread Pool & Starvation](#1-the-libuv-thread-pool--starvation)
2. [Multi-Process Scaling with the Cluster Module](#2-multi-process-scaling-with-the-cluster-module)
3. [True Multi-Threading with Worker Threads](#3-true-multi-threading-with-worker-threads)
4. [Child Processes: spawn vs exec vs execFile vs fork](#4-child-processes-spawn-vs-exec-vs-execfile-vs-fork)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. The Libuv Thread Pool & Starvation

### Q1: What operations in Node.js actually use the Libuv Thread Pool, and what operations do not?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Libuv]` `[ThreadPool]` `[Internals]`

**Answer:**
A common misconception is that *all* asynchronous operations run in Libuv's thread pool. In reality, **network operations do not touch the thread pool at all**.

```text
┌─────────────────────────────────────────────────────────────────┐
│             WHAT USES THE LIBUV THREAD POOL (Default: 4)        │
├─────────────────────────────────────────────────────────────────┤
│ 1. File System Operations   │ All fs.* methods (fs.readFile)    │
│ 2. DNS Lookups              │ dns.lookup() via getaddrinfo(3)   │
│ 3. Cryptography             │ crypto.pbkdf2, crypto.randomBytes │
│ 4. Compression              │ zlib.* methods (gzip, deflate)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          WHAT DOES NOT USE THE THREAD POOL (Kernel Driven)      │
├─────────────────────────────────────────────────────────────────┤
│ 1. Network Sockets          │ http, https, net, tls, dgram      │
│ 2. Network DNS Resolution   │ dns.resolve(), dns.resolve4()     │
│ 3. Timers                   │ setTimeout, setInterval           │
│ 4. Child Processes          │ Pipes and OS signals              │
└─────────────────────────────────────────────────────────────────┘
```

Network sockets are handled directly by the operating system kernel via non-blocking multiplexers (`epoll`, `kqueue`, `IOCP`). The Libuv thread pool is reserved strictly for OS operations that lack reliable asynchronous system calls across operating systems (synchronous file APIs and POSIX `getaddrinfo`).

---

### Q2: How does Thread Pool Starvation happen, and why is `process.env.UV_THREADPOOL_SIZE = 16` inside `server.js` completely useless?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ThreadPool]` `[Starvation]` `[Gotcha]`

**Answer:**

#### The Thread Pool Starvation Incident:
Because the thread pool is **globally shared across the entire process** and has a default size of **4**, concurrent thread pool tasks block each other.
- If an application triggers 4 concurrent `crypto.pbkdf2()` password hashes, all 4 threads are 100% occupied.
- Any subsequent `fs.readFile()` or `dns.lookup()` call **must wait in the thread pool queue** until a crypto hash finishes!

```text
Incoming Calls:
[ Crypto 1 ] ──► Thread 1 (Busy)
[ Crypto 2 ] ──► Thread 2 (Busy)
[ Crypto 3 ] ──► Thread 3 (Busy)
[ Crypto 4 ] ──► Thread 4 (Busy)
────────────────────────────────────────────────────
[ fs.readFile ] ──► WAITING IN QUEUE... (High latency spike!)
[ dns.lookup  ] ──► WAITING IN QUEUE...
```

#### The `UV_THREADPOOL_SIZE` Trap:
```javascript
// USELESS CODE inside server.js:
process.env.UV_THREADPOOL_SIZE = 64; // ZERO EFFECT!
```
**Why:**
Libuv reads the `UV_THREADPOOL_SIZE` environment variable **once** when the C++ runtime initializes before your JavaScript code even loads. Setting it inside JavaScript has no effect because the C++ thread pool is already instantiated.

**The Fix:**
You must pass it as an environment variable before launching the Node process:
```bash
UV_THREADPOOL_SIZE=64 node dist/server.js
```
*(Acceptable values: 1 to 1024).*

---

## 2. Multi-Process Scaling with the Cluster Module

### Q3: How does the Node.js `cluster` module allow multiple processes to share the same HTTP server port?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Cluster]` `[Scaling]` `[Networking]`

**Answer:**
Normally in POSIX systems, two processes attempting to bind to the same IP and port (e.g., `0.0.0.0:3000`) cause the second process to crash with `EADDRINUSE`.

The `cluster` module circumvents this via **Master-Worker handle passing**:

```text
                  Incoming TCP Requests (:3000)
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Primary (Master) Process   │
               │   (Binds TCP Socket :3000)    │
               └───────────────┬───────────────┘
                               │
                Round-Robin Dispatch (Unix default)
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Worker 1 (Fork) │   │ Worker 2 (Fork) │   │ Worker 3 (Fork) │
│ (V8 + EventLoop)│   │ (V8 + EventLoop)│   │ (V8 + EventLoop)│
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

1. **The Primary Process** binds to port `3000`.
2. **Workers** call `server.listen({ port: 3000 })`. Node intercepts this call; instead of opening a port, the worker requests a handle from the Primary process via internal IPC.
3. When a new TCP connection arrives, the Primary process accepts the socket and hands the socket file descriptor over the IPC channel to an available worker using a **Round-Robin** algorithm.
4. Each worker runs its own isolated V8 isolate and event loop, utilizing a dedicated CPU core.

---

### Q4: Implement a production-grade zero-downtime rolling reload using the `cluster` module.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Cluster]` `[ZeroDowntime]` `[DevOps]`

**Answer:**

```typescript
import cluster from 'node:cluster';
import http from 'node:http';
import os from 'node:os';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running. Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Graceful Zero-Downtime Rolling Restart on SIGUSR2
  process.on('SIGUSR2', async () => {
    console.log('Received SIGUSR2: Commencing zero-downtime rolling restart...');
    const workers = Object.values(cluster.workers || {}).filter(Boolean);

    for (const worker of workers) {
      if (!worker) continue;

      console.log(`Killing worker ${worker.process.pid} gracefully...`);
      worker.disconnect(); // Stop accepting new connections

      // Wait for replacement worker before killing next old worker
      await new Promise<void>((resolve) => {
        const newWorker = cluster.fork();
        newWorker.on('listening', () => {
          worker.kill(); // Terminate old worker
          resolve();
        });
      });
    }
    console.log('Rolling restart completed with 0 downtime!');
  });

  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} died (${signal || code}). Replacing...`);
    if (!worker.exitedAfterDisconnect) {
      cluster.fork(); // Auto-heal on accidental crash
    }
  });

} else {
  // Worker Process: Run HTTP application
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Handled by worker PID: ${process.pid}\n`);
  });

  server.listen(3000, () => {
    console.log(`Worker ${process.pid} listening on :3000`);
  });
}
```

---

## 3. True Multi-Threading with Worker Threads

### Q5: When should you use `worker_threads` versus the `cluster` module, and how do they differ in memory and execution?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[WorkerThreads]` `[Cluster]` `[Comparison]`

**Answer:**

| Feature | `cluster` Module | `worker_threads` Module |
|---|---|---|
| **Architecture** | Separate Operating System Processes | Threads inside the **same** OS Process |
| **Memory Isolation** | 100% Isolated; no shared memory | Separate V8 isolates, but **can share memory** |
| **Startup Overhead** | High (new OS process initialization) | Lower (new thread inside existing process) |
| **Memory Footprint** | ~30–50MB per process baseline | ~10–15MB per thread baseline |
| **IPC Communication** | Serialized JSON strings over OS pipes | Structured Clone Algorithm or zero-copy `SharedArrayBuffer` |
| **Primary Use Case** | Scaling I/O-bound web servers over multi-core | Offloading CPU-bound tasks (crypto, images, data analysis) |

**Interviewer Rule of Thumb:**
- Use **Cluster** to scale your API across CPU cores.
- Use **Worker Threads** to run heavy CPU calculations without freezing the API's event loop.

---

### Q6: How do you achieve zero-copy thread communication using `SharedArrayBuffer` and `Atomics`?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Practical / Coding  
**Tags:** `[SharedArrayBuffer]` `[Atomics]` `[MultiThreading]`

**Answer:**
Standard `worker.postMessage(data)` clones data using the **Structured Clone Algorithm**, which incurs CPU and memory serialization overhead on large datasets.

`SharedArrayBuffer` allows multiple threads to read and mutate the **exact same physical memory buffer** concurrently without copying. To avoid race conditions, you use `Atomics`.

#### Thread Synchronization Example:
```typescript
// main.ts
import { Worker } from 'node:worker_threads';

const sharedBuffer = new SharedArrayBuffer(4); // 4-byte Int32 buffer
const sharedInt32 = new Int32Array(sharedBuffer);

sharedInt32[0] = 0; // Initial state

const worker = new Worker('./worker.js', { workerData: { sharedBuffer } });

console.log('Main thread waiting for worker notification...');
// Block main thread until worker signals (or check state)
Atomics.wait(sharedInt32, 0, 0); // Sleeps until index 0 is no longer 0
console.log('Main thread woken up! Value is:', sharedInt32[0]); // Prints 42
```

```javascript
// worker.js
import { workerData } from 'node:worker_threads';

const sharedInt32 = new Int32Array(workerData.sharedBuffer);

// Perform heavy computation...
Atomics.store(sharedInt32, 0, 42); // Thread-safe atomic write
Atomics.notify(sharedInt32, 0, 1);  // Wake up 1 waiting thread!
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can you call `Atomics.wait()` on the main event loop thread in a browser or Node?"  
*Senior Answer:* In browsers, `Atomics.wait()` is forbidden on the main thread because it would freeze the UI renderer. In Node.js, `Atomics.wait()` *is* permitted on the main thread, but it completely freezes the event loop until another thread wakes it, so it must only be used with extreme caution.

---

## 4. Child Processes: spawn vs exec vs execFile vs fork

### Q7: Compare `spawn()`, `exec()`, `execFile()`, and `fork()`. Which one creates severe Command Injection vulnerabilities?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ChildProcess]` `[Security]`

**Answer:**

```text
child_process Method Comparison:
├── spawn():    Streams data via stdio. Spawns process directly without shell.
├── exec():     Buffers output. SPAWNS A SYSTEM SHELL (bash/sh) ➔ INJECTION RISK!
├── execFile(): Buffers output. Executes binary directly WITHOUT shell (Safe).
└── fork():     Special spawn() for Node scripts with built-in IPC channel.
```

| Method | Spawns Shell? | Streams or Buffers? | Injection Risk? | Best Use Case |
|---|---|---|---|---|
| `spawn` | ❌ No (by default) | Streams (`stdout`/`stderr`) | 🟢 Minimal | Long-running tasks, streaming large files |
| `exec` | ✅ **Yes** (`/bin/sh`) | Buffers into memory | 🔴 **CRITICAL** | Quick shell commands without untrusted input |
| `execFile` | ❌ No | Buffers into memory | 🟢 Minimal | Executing an executable binary with arguments |
| `fork` | ❌ No | Streams + IPC channel | 🟢 Minimal | Spawning child Node.js scripts with message passing |

#### The Command Injection Bug in `exec`:
```javascript
// CRITICAL VULNERABILITY:
const { exec } = require('node:child_process');
app.get('/ping', (req, res) => {
  // If user passes: "8.8.8.8; rm -rf /"
  exec(`ping -c 1 ${req.query.ip}`, (err, stdout) => { ... });
});

// SAFE FIX: Use execFile or spawn with argument array
const { execFile } = require('node:child_process');
execFile('ping', ['-c', '1', req.query.ip], (err, stdout) => { ... });
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q8: What causes a "Zombie Process" in Node.js, and how do you prevent it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ChildProcess]` `[Linux]`

**Answer:**
A zombie process occurs when a child process terminates, but the parent Node.js process fails to read its exit status (`waitpid` system call), leaving its entry lingering in the OS process table.
*Fix:* Always attach a `'close'` or `'exit'` listener to spawned child processes, or make sure the parent does not abandon detached processes without unreferencing them (`child.unref()`). When running in Docker containers, use an init system like `tini` or `dumb-init` as PID 1 to reap orphaned zombies.

---

### Q9: What happens if output from `exec()` exceeds `maxBuffer`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[ChildProcess]` `[Errors]`

**Answer:**
`exec()` buffers all stdout/stderr in memory up to `maxBuffer` (default 1MB). If the child process produces more output than `maxBuffer`, Node.js immediately kills the child process with `SIGTERM` and throws `ERR_CHILD_PROCESS_STDIO_MAXBUFFER`.
*Mitigation:* Use `spawn()` for any command with unpredictable or large output volumes.
