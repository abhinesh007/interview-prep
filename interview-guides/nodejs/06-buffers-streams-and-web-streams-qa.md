# 06 — Buffers, Streams & Web Streams

> Buffer Allocations & Security Hazards, Stream Backpressure Mechanics, `pipeline()` vs `.pipe()`, and Modern Web Streams (`node:stream/web`).

---

## 📑 Table of Contents
1. [Buffer Internals & Security Hazards](#1-buffer-internals--security-hazards)
2. [Node.js Streams Architecture & Types](#2-nodejs-streams-architecture--types)
3. [Stream Backpressure & The Memory Sink Bug](#3-stream-backpressure--the-memory-sink-bug)
4. [Modern Web Streams API (WHATWG)](#4-modern-web-streams-api-whatwg)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Buffer Internals & Security Hazards

### Q1: What is a Node.js `Buffer`, where is its memory allocated, and how does the internal 8KB Buffer Pool work?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Buffer]` `[V8]` `[Memory]`

**Answer:**
A `Buffer` is a fixed-length sequence of bytes designed to handle raw binary data (TCP streams, file I/O).

- **Memory Location:** Buffer memory is allocated **outside the V8 heap in C++ memory** (managed via `ArrayBuffer` in modern V8). The JavaScript `Buffer` object is merely a small JavaScript reference wrapper that points to the underlying raw C++ memory address.
- **The 8KB Buffer Pool (Slab Allocation):**
  To avoid the overhead of requesting many small memory allocations from the OS kernel, Node.js pre-allocates an 8192-byte (8KB) C++ memory slab (`Buffer.poolSize`). When you create buffers with `Buffer.from()` or `Buffer.allocUnsafe()` smaller than 4KB, Node slices them from this shared pre-allocated slab.

```text
┌────────────────────────────────────────────────────────┐
│             Shared 8KB Buffer Memory Slab              │
├─────────────┬─────────────────┬────────────────────────┤
│ Slice A (32B)│ Slice B (128B)  │ Available Free Space   │
└─────────────┴─────────────────┴────────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What memory leak hazard is created by slicing a tiny 10-byte buffer from a large 10MB buffer or shared slab?"  
*Senior Answer:* In V8, `buf.subarray(0, 10)` creates a view into the parent `ArrayBuffer`. The entire 10MB parent buffer will remain pinned in memory and **cannot be garbage collected** as long as that single 10-byte sliced reference remains reachable! To avoid this, copy the bytes into a new buffer: `Buffer.from(buf.subarray(0, 10))`.

---

### Q2: Why is `Buffer.allocUnsafe()` a critical security vulnerability if not handled properly?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Buffer]` `[Security]` `[Vulnerability]`

**Answer:**

- **`Buffer.alloc(size)`:** Requests memory and **initializes every byte to `0`** (zero-fills). Safe, but incurs a minor CPU zeroing cost.
- **`Buffer.allocUnsafe(size)`:** Allocates memory **without zero-filling**. It returns uninitialized memory immediately for maximum speed.

#### The Security Incident:
The memory segment returned by `allocUnsafe` contains whatever stale data previously resided in that RAM address (e.g., plaintext database passwords, private encryption keys, session cookies, credit card numbers).

```javascript
// CRITICAL SECURITY LEAK:
app.get('/download-template', (req, res) => {
  // Allocates 1000 bytes of UNINITIALIZED RAM
  const buf = Buffer.allocUnsafe(1000); 
  
  // Developer only wrote 50 bytes of actual data:
  buf.write('Header: Report Data');

  // Sends the entire 1000 bytes back to client!
  // The remaining 950 bytes leak raw memory from previous server requests!
  res.send(buf); 
});
```

**Senior Rule:** Never send a buffer created with `Buffer.allocUnsafe` over the network unless you have completely overwritten every byte or sliced it to the exact length of the written data. When in doubt, always use `Buffer.alloc()`.

---

## 2. Node.js Streams Architecture & Types

### Q3: What are the four core stream types in Node.js, and how do "Flowing" vs "Paused" modes work on Readable streams?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Streams]` `[Architecture]`

**Answer:**

```text
The 4 Core Stream Types:
├── 1. Readable:  Source of data you read from (fs.createReadStream, req)
├── 2. Writable:  Destination you write to (fs.createWriteStream, res)
├── 3. Duplex:    Both Readable and Writable independently (net.Socket)
└── 4. Transform: Duplex stream where output is computed from input (zlib, crypto)
```

#### Readable Stream Modes:
A `Readable` stream operates in one of two modes:
1. **Paused Mode (Default):** Data does not flow automatically. You must explicitly call `stream.read()` to pull chunks, or listen for the `'readable'` event.
2. **Flowing Mode:** Data is actively pushed by the underlying system and delivered as fast as possible via `'data'` events.

#### Mode Switching:
- To switch to Flowing mode: Attach an `.on('data', ...)` listener or call `.resume()` or `.pipe()`.
- To switch back to Paused mode: Call `.pause()` or remove all `'data'` listeners.

---

### Q4: Implement a custom `Transform` stream in TypeScript that processes a newline-delimited stream of JSON logs.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Streams]` `[Transform]` `[TypeScript]`

**Answer:**

```typescript
import { Transform, TransformCallback } from 'node:stream';

export class NdjsonSanitizerTransform extends Transform {
  private buffer: string = '';

  constructor() {
    super({ objectMode: false });
  }

  public _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split('\n');

    // Keep incomplete trailing line in the buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim().length === 0) continue;
      try {
        const record = JSON.parse(line);
        // Redact sensitive password property
        if (record.password) record.password = '***REDACTED***';
        this.push(JSON.stringify(record) + '\n');
      } catch (err) {
        // Skip malformed records or emit error
      }
    }

    callback();
  }

  public _flush(callback: TransformCallback): void {
    // Process final lingering chunk if present
    if (this.buffer.trim().length > 0) {
      try {
        const record = JSON.parse(this.buffer);
        if (record.password) record.password = '***REDACTED***';
        this.push(JSON.stringify(record) + '\n');
      } catch {}
    }
    callback();
  }
}
```

---

## 3. Stream Backpressure & The Memory Sink Bug

### Q5: What is stream backpressure, and how does manual handling of `.on('data')` cause silent Out-Of-Memory (OOM) crashes?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Streams]` `[Backpressure]` `[OOM]`

**Answer:**
**Backpressure** occurs when data is read from a fast producer (e.g., local NVMe SSD reading at 500MB/s) faster than a slow consumer can write it (e.g., a slow remote TCP socket or cloud storage writing at 2MB/s).

Both `Readable` and `Writable` streams maintain an internal buffer capped by **`highWaterMark`** (default 16KB for byte streams, 16 objects for object streams).

```text
[ Fast Reader: 500MB/s ] ──► [ Writable Buffer: highWaterMark (16KB) ] ──► [ Slow Writer: 2MB/s ]
                                         │
                   Buffer Fills Up! ─────┴─────► Unhandled = RAM SPIKES TO GIGABYTES (OOM CRASH!)
```

#### The Classic OOM Bug:
```javascript
// BUG: Ignoring backpressure causes unlimited RAM consumption!
readStream.on('data', (chunk) => {
  // writable.write() returns FALSE when the internal buffer is full!
  // Ignoring the return value forces Node to buffer all chunks in RAM
  writeStream.write(chunk); 
});
```

#### The Fix with Native Backpressure Handling:
```javascript
readStream.on('data', (chunk) => {
  const canContinue = writeStream.write(chunk);
  if (!canContinue) {
    // Pause reading when destination buffer is saturated!
    readStream.pause();
    // Wait for the destination to drain its buffer
    writeStream.once('drain', () => {
      readStream.resume();
    });
  }
});
```

---

### Q6: Why is `.pipe()` dangerous in production, and why is `stream.pipeline()` or `stream/promises` mandatory?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Streams]` `[pipeline]` `[Leaks]`

**Answer:**
When you chain streams using `.pipe()`:
```javascript
// DANGEROUS: Leaks memory and file descriptors on errors!
readable.pipe(transform).pipe(writable);
```

#### Why `.pipe()` Fails:
1. **Unforwarded Errors:** Errors do **not** propagate through the `.pipe()` chain. If `transform` emits an `'error'`, `readable` and `writable` are **not destroyed**. They remain hanging open in memory, leaking file descriptors and sockets.
2. **Manual Cleanup Burden:** You would need to attach individual `.on('error')` listeners to every single stream in the pipeline.

#### The Modern Standard: `stream.pipeline()`
`pipeline()` handles backpressure, forwards errors across all streams, and **guarantees that all streams in the chain are destroyed immediately** if any one of them emits an error or closes.

```typescript
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';

async function compressFile(source: string, destination: string): Promise<void> {
  await pipeline(
    fs.createReadStream(source),
    zlib.createGzip(),
    fs.createWriteStream(destination)
  );
  console.log('Compression pipeline finished successfully.');
}
```

---

## 4. Modern Web Streams API (WHATWG)

### Q7: What are WHATWG Web Streams (`node:stream/web`), and how do they differ from legacy Node.js Streams?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[WebStreams]` `[WHATWG]` `[Modern]`

**Answer:**
Node.js 18+ provides full global support for **WHATWG Web Streams** (`ReadableStream`, `WritableStream`, `TransformStream`), identical to the streams in browser environments, Deno, and Cloudflare Workers.

| Feature | Legacy Node.js Streams (`node:stream`) | Modern Web Streams (`node:stream/web`) |
|---|---|---|
| **Ecosystem** | Node.js exclusive | Universal Web Standard (Browser, Edge, Deno) |
| **Foundation** | `EventEmitter` based | `Promise` and Async Iterator based |
| **Piping Syntax** | `readable.pipe(writable)` or `pipeline()` | `readable.pipeThrough(transform).pipeTo(writable)` |
| **Locking Model** | Multiple listeners can attach to `'data'` | **Reader Locking:** Exclusive lock via `readable.getReader()` |

#### Converting Between Node and Web Streams:
```typescript
import { Readable, Writable } from 'node:stream';

// Node Stream ➔ Web Stream
const nodeReadable = Readable.from(['hello', ' ', 'world']);
const webStream: ReadableStream = Readable.toWeb(nodeReadable);

// Web Stream ➔ Node Stream
const nodeBackAgain: Readable = Readable.fromWeb(webStream);
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q8: How can you consume a Node.js Readable stream using modern `for await...of` syntax?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical / Coding  
**Tags:** `[AsyncIterators]` `[Streams]`

**Answer:**
In modern Node.js, all `Readable` streams implement the asynchronous iterable protocol:
```typescript
async function processStream(readStream: NodeJS.ReadableStream) {
  for await (const chunk of readStream) {
    console.log(`Received ${chunk.length} bytes`);
  }
  console.log('Stream finished reading cleanly.');
}
```

---

### Q9: What happens if you do not attach an `'error'` event listener to a stream before it fails?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Streams]` `[ErrorHandling]`

**Answer:**
Because streams inherit from `EventEmitter`, emitting an `'error'` event with no registered listeners throws an **uncaught exception**, which will crash the Node.js process immediately if unhandled.
