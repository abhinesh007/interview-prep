# 07 — Core Modules & Modern Built-ins

> File System Atomic Writes, EventEmitter Mechanics, Native Test Runner (`node:test`), Node.js Permission Model, and Built-in SQLite (`node:sqlite`).

---

## 📑 Table of Contents
1. [File System Internals & Atomic Operations](#1-file-system-internals--atomic-operations)
2. [EventEmitter Synchronous Mechanics & Memory Traps](#2-eventemitter-synchronous-mechanics--memory-traps)
3. [The Native Test Runner (node:test & node:assert)](#3-the-native-test-runner-nodetest--nodeassert)
4. [The Node.js Permission Model](#4-the-nodejs-permission-model)
5. [Built-in SQLite (node:sqlite) & Utilities](#5-built-in-sqlite-nodesqlite--utilities)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. File System Internals & Atomic Operations

### Q1: How do you implement atomic file writes in Node.js, and why does a simple `fs.writeFile()` cause corrupted files during sudden server crashes?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[FileSystem]` `[Resilience]` `[DataIntegrity]`

**Answer:**
`fs.writeFile()` truncates the destination file first and writes bytes in chunks. If the server crashes, runs out of disk space, or is terminated by `SIGKILL` mid-write:
- The file is left partially written and corrupted (half-written JSON or truncated config).

#### The Atomic Write Pattern:
POSIX operating systems guarantee that **renaming a file (`rename` syscall) within the same filesystem is an atomic operation**. Either the old file exists or the new file replaces it instantaneously; no intermediate corrupt state is visible.

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function writeAtomicJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  // Create unique temp file in the SAME directory (ensures same filesystem mount)
  const tempFile = path.join(dir, `.tmp-${crypto.randomUUID()}`);
  const payload = JSON.stringify(data, null, 2);

  try {
    // 1. Write data completely to temp file
    await fs.writeFile(tempFile, payload, 'utf-8');

    // 2. Force physical disk sync to guarantee persistence before rename
    const fileHandle = await fs.open(tempFile, 'r');
    await fileHandle.sync(); // fsync syscall
    await fileHandle.close();

    // 3. Atomically rename temp file over destination file
    await fs.rename(tempFile, filePath);
  } catch (error) {
    // Cleanup temporary file on failure
    await fs.unlink(tempFile).catch(() => {});
    throw error;
  }
}
```

---

## 2. EventEmitter Synchronous Mechanics & Memory Traps

### Q2: Is `EventEmitter.emit()` synchronous or asynchronous? What happens if you register 100 listeners to a single event?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[EventEmitter]` `[Internals]` `[Sync]`

**Answer:**
**`EventEmitter.emit()` is 100% synchronous!**

When you call `emitter.emit('event', payload)`:
- Node.js iterates through the internal array of registered listener functions and invokes each one sequentially **on the current call stack**.
- If listener #1 contains a synchronous CPU loop or throws an error, listeners #2 through #100 are blocked or never executed.
- The next line of code after `emitter.emit()` does **not** execute until all 100 listener functions have finished executing.

```text
Call: emitter.emit('userCreated', user)
        │
        ├──► Listener 1 executes synchronously
        ├──► Listener 2 executes synchronously
        └──► Listener 3 executes synchronously
        │
Line after emitter.emit() executes ONLY AFTER all listeners finish!
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if an EventEmitter emits an `'error'` event and there is no listener for `'error'`?"  
*Senior Answer:* Node treats `'error'` events as a special case. If an `'error'` event is emitted and has zero listeners, Node **throws an unhandled exception**, dumps the stack trace, and terminates the process immediately. Always attach an `'error'` handler or use `events.once()` with promises.

---

### Q3: How do you listen for an EventEmitter event as a Promise with a timeout using `events.once()`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[EventEmitter]` `[Promises]` `[AbortSignal]`

**Answer:**
Modern Node.js provides a built-in promise-based `events.once()` utility that accepts an `AbortSignal`:

```typescript
import { EventEmitter, once } from 'node:events';

async function waitForWorkerReady(worker: EventEmitter, timeoutMs = 5000): Promise<void> {
  try {
    // Automatically cleans up the event listener if timeout triggers!
    await once(worker, 'ready', {
      signal: AbortSignal.timeout(timeoutMs),
    });
    console.log('Worker initialized successfully.');
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error(`Worker initialization timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

---

## 3. The Native Test Runner (node:test & node:assert)

### Q4: Why are enterprises migrating to Node's built-in `node:test` runner from Jest or Mocha?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Testing]` `[node:test]` `[Modern]`

**Answer:**
Historically, every Node project required external dependencies (Jest, ts-jest, babel-jest, mocha, chai, sinon) just to run basic unit tests.

#### Advantages of Native `node:test` (Node 20 & 22 LTS):
1. **Zero External Dependencies:** Built directly into the Node binary. Zero installation time, zero supply-chain vulnerability attack surface.
2. **Superior Performance:** Runs directly on V8 with minimal boot overhead; avoids heavy Jest VM context emulation.
3. **Native ESM & TypeScript Compatibility:** Works out-of-the-box with Node's native module loader.
4. **Built-in Mocking & Coverage:** Includes `test.mock`, `describe`, `it`, and `--experimental-test-coverage` without Istanbul/c8.

#### Practical Unit & Integration Test Example:
```typescript
import test, { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('OrderService Suite', () => {
  it('should charge card and emit audit event', async (t) => {
    // Built-in mocking
    const chargeCardMock = t.mock.fn(async (amount: number) => ({ success: true, txnId: '123' }));

    const orderService = { charge: chargeCardMock };
    const result = await orderService.charge(50);

    assert.equal(result.success, true);
    assert.equal(chargeCardMock.mock.callCount(), 1);
    assert.deepEqual(chargeCardMock.mock.calls[0].arguments, [50]);
  });
});
```
*Run directly:* `node --test`

---

## 4. The Node.js Permission Model

### Q5: What is the Node.js Permission Model (Node 20/22), and what attack vectors does it defend against?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[PermissionModel]` `[Sandboxing]`

**Answer:**
Historically, any npm package installed in `node_modules` ran with the **exact same OS user permissions as the host Node process**. If a malicious package had postinstall hooks or ran in production, it could read `/etc/passwd`, read SSH keys, open outbound TCP sockets, or spawn arbitrary shell commands (`rm -rf`).

The **Permission Model** (`--permission`) restricts runtime access to host capabilities at the C++ layer.

```bash
# Start Node.js with strict capabilities:
node --permission \
     --allow-fs-read=/app/dist,/app/node_modules \
     --allow-fs-write=/app/logs \
     --allow-worker \
     dist/server.js
```

#### Capability Controls:
- `--allow-fs-read` / `--allow-fs-write`: Restricts file system paths.
- `--allow-child-process`: Controls whether `child_process` can spawn shell binaries.
- `--allow-worker`: Restricts spawning `worker_threads`.
- `--allow-addons`: Prevents loading native C++ compiled `.node` addons.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can the Node.js Permission Model safely execute untrusted multi-tenant user code like a SaaS code playground?"  
*Senior Answer:* **No.** The permission model is designed to protect your server from malicious npm supply-chain dependencies within your own codebase. It is not an OS-level hypervisor or container sandbox. For multi-tenant user code execution, you must use isolated microVMs (AWS Firecracker, Docker gVisor, or Cloudflare Workers V8 isolates).

---

## 5. Built-in SQLite (node:sqlite) & Utilities

### Q6: How does the new built-in SQLite module (`node:sqlite` in Node 22) work, and how does it compare to `better-sqlite3`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[SQLite]` `[Node22]` `[Databases]`

**Answer:**
Introduced in Node.js 22 LTS, `node:sqlite` provides a native C++ embedded SQLite database engine directly in core without needing `node-gyp` or external npm binaries.

```typescript
import { DatabaseSync } from 'node:sqlite';

// Open or create local database file
const db = new DatabaseSync('./production.db');

// Execute DDL
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER
  )
`);

// Prepared statement with typed parameter binding
const insert = db.prepare('INSERT INTO tenants (id, name, created_at) VALUES (?, ?, ?)');
insert.run('tenant-1', 'Acme Corp', Date.now());

// Query single record
const query = db.prepare('SELECT * FROM tenants WHERE id = ?');
const tenant = query.get('tenant-1');
console.log('Retrieved tenant:', tenant);
```

*Comparison with `better-sqlite3`:* `better-sqlite3` is still mature with advanced extensions, but `node:sqlite` removes all build-tool compilation headaches on Docker/Alpine containers.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: Why should you use `process.hrtime.bigint()` instead of `Date.now()` for benchmarking latency?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Performance]` `[Metrics]`

**Answer:**
- `Date.now()` is based on the system wall-clock, which has coarse resolution (1–15ms) and can jump forwards or backwards due to NTP clock synchronization.
- `process.hrtime.bigint()` reads the hardware CPU monotonic high-resolution timer in nanoseconds (`1e-9` seconds). It is guaranteed to never drift or jump backwards, making it mandatory for API duration metrics.

---

### Q8: How does `node:util` `promisify` work under the hood?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Util]` `[Promises]`

**Answer:**
It takes a function following the Node.js error-first callback convention `(err, value) => void` as its final argument, and returns a function returning a Promise. Under the hood, it appends a synthetic callback `(err, val) => err ? reject(err) : resolve(val)` and passes it to the wrapped function. Custom implementations can override this using the `util.promisify.custom` symbol.
