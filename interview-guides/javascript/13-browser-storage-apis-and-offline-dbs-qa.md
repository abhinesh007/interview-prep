# 13 — Browser Storage APIs & Offline Databases

> Deep dive into browser storage mechanisms: Cookies, `localStorage`, `sessionStorage`, `IndexedDB`, Cache Storage, and the Origin Private File System (OPFS). Storage quotas, ACID transactions, and the IndexedDB auto-commit trap.

---

## 📑 Table of Contents
1. [The Browser Storage Comparison Matrix](#1-the-browser-storage-comparison-matrix)
2. [Cookies & Web Security Flags](#2-cookies--web-security-flags)
3. [LocalStorage & SessionStorage Pitfalls](#3-localstorage--sessionstorage-pitfalls)
4. [IndexedDB Deep Dive & The Auto-Commit Trap](#4-indexeddb-deep-dive--the-auto-commit-trap)
5. [Cache Storage, OPFS & Quota Management](#5-cache-storage-opfs--quota-management)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Browser Storage Comparison Matrix

### Q1: Compare Cookies, `localStorage`, `sessionStorage`, `IndexedDB`, Cache Storage, and OPFS across capacity, access model, thread impact, and persistence.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Browser-Storage]` `[IndexedDB]` `[OPFS]` `[LocalStorage]` `[Cookies]`

**Answer:**

| Storage Mechanism | Typical Capacity | Access Model | Thread / Latency Impact | Stored Data Types | Persistence & Scope |
|---|---|---|---|---|---|
| **Cookies** | ~4 KB | Synchronous (Client & Server HTTP headers) | Main thread blocking; sent on **every** HTTP request | Strings only | Configurable expiry date; origin/path scoped |
| **LocalStorage** | ~5–10 MB | Synchronous | **Main thread blocking**; causes UI jank on large reads/writes | Strings only (requires JSON serialization) | Persistent across sessions and tabs; same-origin |
| **SessionStorage** | ~5 MB | Synchronous | **Main thread blocking** | Strings only | Cleared when browser tab/window is closed; single tab scope |
| **IndexedDB** | Up to 80% of free disk space | Asynchronous (Events & Promises) | **Non-blocking**; runs off the main thread; accessible in Workers | Structured Clones, Objects, Blobs, Files, ArrayBuffers | Persistent (or best-effort); origin-scoped |
| **Cache Storage** | Up to 80% of free disk space | Asynchronous (Promises) | **Non-blocking**; accessible in Service Workers | `Request` and `Response` object pairs | Managed by application / Service Worker cache |
| **OPFS (Origin Private FS)** | Huge disk space | Sync in Dedicated Workers, Async on Main | **Ultra-fast native OS file speeds** | Raw binary files, ArrayBuffers, SQLite DB files | Managed by application file handles |

---

## 2. Cookies & Web Security Flags

### Q2: What are the critical cookie security flags, and why should sensitive authentication tokens not be stored in `localStorage`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Web Security  
**Tags:** `[Cookies]` `[HttpOnly]` `[SameSite]` `[XSS]` `[CSRF]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│                   Cookie Security Anatomy              │
├────────────────┬───────────────────────────────────────┤
│ Flag           │ Security Guarantee                    │
├────────────────┼───────────────────────────────────────┤
│ HttpOnly       │ Forbids JavaScript (document.cookie)  │
│                │ access; completely prevents XSS token │
│                │ theft!                                │
│ Secure         │ Cookie is transmitted ONLY over HTTPS │
│ SameSite=Strict│ Cookie is never sent on cross-site    │
│                │ requests (prevents CSRF attacks!)     │
│ SameSite=Lax   │ Sent on top-level cross-site GET navs │
│ SameSite=None  │ Requires 'Secure'; sent everywhere    │
└────────────────┴───────────────────────────────────────┘
```

### The Token Storage Debate: `HttpOnly` Cookies vs `localStorage`
- **Why `localStorage` is dangerous for tokens:** Any Cross-Site Scripting (XSS) vulnerability (even in a 3rd party analytics script or npm dependency) can execute `localStorage.getItem('jwt')` and exfiltrate credentials to an attacker's server.
- **Why `HttpOnly` Cookies are superior:** Even if an attacker achieves full XSS script execution on your page, JavaScript **cannot read** an `HttpOnly` cookie.
- *Caveat:* Using cookies introduces Cross-Site Request Forgery (CSRF) risk, which must be mitigated using `SameSite=Lax` or `SameSite=Strict` and Anti-CSRF verification tokens.

---

## 3. LocalStorage & SessionStorage Pitfalls

### Q3: Why is `localStorage` considered a severe performance anti-pattern in modern Single Page Applications (SPAs)?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Performance  
**Tags:** `[LocalStorage]` `[Main-Thread]` `[Synchronous-IO]` `[Performance]`

**Answer:**
`localStorage` has two critical architectural flaws:
1. **Synchronous Disk I/O on the Main Thread:**
   - Every `localStorage.getItem()` and `localStorage.setItem()` blocks the JavaScript main thread while reading from or writing to the physical hard drive.
   - If writing a 2MB JSON state tree, this synchronous disk access can freeze the main thread for 10ms to 50ms, causing dropped frames and degrading Interaction to Next Paint (INP).
2. **String-Only Serialization Overhead:**
   - Requires continuous `JSON.stringify()` on write and `JSON.parse()` on read, generating heavy CPU overhead and garbage collection churn.

```javascript
// Cross-Tab Synchronization using the 'storage' Event:
// Note: This event fires ONLY in other open tabs on the same origin, NOT in the tab that made the change!
window.addEventListener("storage", (event) => {
  if (event.key === "authToken") {
    console.log("Token updated in another tab:", event.newValue);
    if (!event.newValue) {
      // User logged out in another tab -> Log out locally!
      handleLogout();
    }
  }
});
```

---

## 4. IndexedDB Deep Dive & The Auto-Commit Trap

### Q4: How does IndexedDB work under the hood, and what is the infamous "Auto-Commit Transaction Trap"?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Practical Coding  
**Tags:** `[IndexedDB]` `[Transactions]` `[Auto-Commit]` `[TransactionInactiveError]`

**Answer:**
**IndexedDB** is an asynchronous, transactional, object-oriented client-side database. It stores structured JavaScript objects indexed by primary keys.

### The Infamous Auto-Commit Trap:
IndexedDB transactions guarantee ACID compliance. To ensure locks are not held indefinitely, **an IndexedDB transaction automatically commits as soon as the microtask queue empties and no further requests are pending on that transaction**.

```javascript
// ❌ THE AUTO-COMMIT TRAP:
const tx = db.transaction("users", "readwrite");
const store = tx.objectStore("users");

// 1. First DB request (Pending)
store.put({ id: 1, name: "Alice" });

// 2. We introduce an asynchronous boundary (Network Fetch):
const serverResponse = await fetch("/api/validate"); // ◄── MICROTASK QUEUE DRAINS!

// 3. Second DB request:
store.put({ id: 2, name: "Bob" });
// 💥 FATAL ERROR: DOMException: Failed to execute 'put' on 'IDBObjectStore':
// The transaction has been closed (TransactionInactiveError).
```

**Why This Crashes:**
When `await fetch()` pauses execution, the current turn of the event loop finishes and the microtask queue empties. The browser sees no pending IndexedDB operations on `tx` and **immediately auto-commits the transaction**. When `fetch` returns seconds later, `tx` is already closed!

**Rule of Thumb:** Never perform non-IndexedDB asynchronous operations (`fetch`, `setTimeout`) midway through an active IndexedDB transaction. Complete all external async work *before* opening the transaction.

```javascript
// Production-Ready IndexedDB Helper Module
function openDatabase(dbName, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offline_queue")) {
        const store = db.createObjectStore("offline_queue", { keyPath: "id", autoIncrement: true });
        store.createIndex("by_timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

---

## 5. Cache Storage, OPFS & Quota Management

### Q5: What is the Origin Private File System (OPFS), and how does it enable running SQLite in the browser at near-native speeds?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture & Modern Web Platform  
**Tags:** `[OPFS]` `[WebAssembly]` `[SQLite]` `[File-System]`

**Answer:**
The **Origin Private File System (OPFS)** is a private, highly optimized virtual file system isolated to the website's origin:
- Unlike the traditional File System Access API (which prompts the user with permissions dialogs), OPFS is completely invisible to the operating system's file manager and requires zero user prompts.
- **In Dedicated Web Workers**, OPFS exposes a **`createSyncAccessHandle()`** method:
  - This provides **synchronous, direct in-place binary reads and writes** (`read()`, `write()`, `truncate()`, `flush()`).
  - Because it runs off the main thread in a Worker, synchronous binary disk I/O does not block the UI.

```text
Web App Main Thread (UI at 60fps)
       │
       │ postMessage(query)
       ▼
Web Worker Thread (Wasm SQLite Engine)
       │
       │ createSyncAccessHandle() [Direct binary byte offsets]
       ▼
Origin Private File System (OPFS) ──> Physical Disk (Near-Native C Speeds!)
```

*Industry Impact:* This architecture powers modern web applications like **Figma**, **Adobe Photoshop Web**, and **Wasm SQLite (official SQLite team distribution)**, allowing massive databases and graphic documents to be queried in milliseconds directly in client storage.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Can Web Workers access `localStorage`?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:** **No.** `localStorage` and `sessionStorage` are strictly forbidden inside Web Workers and Service Workers because their synchronous API design would violate the non-blocking nature of worker threads. Workers must use `IndexedDB`, Cache Storage, or OPFS.

### Q7: How can an application check its storage quota and request persistent storage?
**Difficulty:** 🟡 Mid | **Type:** 💻 Practical APIs  
**Answer:** Using the **StorageManager API**:
```javascript
// Check storage quota:
if (navigator.storage && navigator.storage.estimate) {
  const { quota, usage } = await navigator.storage.estimate();
  console.log(`Using ${(usage / 1e6).toFixed(2)} MB of ${(quota / 1e6).toFixed(2)} MB`);
}

// Request persistent storage (prevents automatic browser eviction under disk pressure):
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persist();
  console.log("Storage is persisted:", isPersisted);
}
```
