# 09 — Offline Support, Caching & PWAs

> Service Worker Lifecycle Execution Model, The 5 Core Caching Strategies, Client-Side Storage Matrix (IndexedDB vs Cache API vs OPFS), Offline Synchronization with the Background Sync API, Storage Quota Eviction Policies, and Persistent App Shells.

---

## 📑 Table of Contents
1. [Service Worker Execution Model & Lifecycle](#1-service-worker-execution-model--lifecycle)
2. [The 5 Core Caching Strategies](#2-the-5-core-caching-strategies)
3. [Client-Side Storage Matrix: IndexedDB vs Cache API vs OPFS](#3-client-side-storage-matrix-indexeddb-vs-cache-api-vs-opfs)
4. [Offline Mutation Queues & Background Sync API](#4-offline-mutation-queues--background-sync-api)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Service Worker Execution Model & Lifecycle

### Q1: Detail the complete Service Worker lifecycle. Why do updated Service Workers remain stuck in the "Waiting to activate" state, and how do `skipWaiting()` and `clients.claim()` resolve this?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ServiceWorkers]` `[PWA]` `[Lifecycle]` `[SkipWaiting]`

**Answer:**
A Service Worker is an event-driven programmable network proxy executing in a background thread, decoupled from any specific web page or DOM.

```text
The Service Worker Lifecycle State Machine:

Main Thread: navigator.serviceWorker.register('/sw.js')
                     │
                     ▼
             ┌───────────────┐
             │  INSTALLING   │ ◄── Precaching Static Assets (Cache.addAll)
             └───────────────┘     (If ONE asset 404s, installation FAILS!)
                     │
                     ▼
             ┌───────────────┐
             │   INSTALLED   │ (Waiting state)
             │   (WAITING)   │ ◄── Stalled here if older SW is controlling open tabs!
             └───────────────┘
                     │ self.skipWaiting() / All tabs closed
                     ▼
             ┌───────────────┐
             │   ACTIVATED   │ ◄── Purges old versioned caches (caches.delete)
             └───────────────┘
                     │ clients.claim()
                     ▼
             ┌───────────────┐
             │ RUNNING / IDLE│ ◄── Intercepts fetch events & background sync
             └───────────────┘
```

#### Why Service Workers Get Stuck in the "Waiting" State:
When you deploy an updated `sw.js`, the browser detects the byte change and installs the new version in the background. However, it enters the **Waiting** state and refuses to activate if **any active browser tabs are still being controlled by the older Service Worker**. This prevents breaking running tabs that might request older chunk hashes.

#### Activating New Service Workers Gracefully:
1. **`self.skipWaiting()`:** Forces the waiting worker to activate immediately, bypassing the wait queue.
2. **`self.clients.claim()`:** Forces the activated worker to take immediate control of all currently open browser tabs without waiting for a page reload.

```javascript
// Production sw.js Lifecycle Setup
const CACHE_NAME = 'app-v2.1.0';
const PRECACHE_ASSETS = ['/', '/index.html', '/app.js', '/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Optional: Skip waiting automatically or wait for user confirmation
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take immediate control of open clients
});
```

---

## 2. The 5 Core Caching Strategies

### Q2: Compare the 5 primary Service Worker caching strategies. Provide production code for each and explain their failure modes.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[CachingStrategies]` `[ServiceWorkers]` `[Offline]`

**Answer:**

```text
The 5 Core Caching Strategies:

1. Cache-First (Static Assets):
   Request ──► Cache Hit? ──► Return Cached
                 │ (Miss)
                 ▼
               Network ──► Populate Cache & Return

2. Network-First (Dynamic Data):
   Request ──► Network ──► Success? ──► Return & Update Cache
                 │ (Fail / Offline)
                 ▼
               Fallback to Cache

3. Stale-While-Revalidate (Avatars / Feeds):
   Request ──► Return Cached IMMEDIATELY
                 │ (Background Async)
                 ▼
               Fetch Network & Update Cache for Next Visit

4. Network-Only (Auth / Payments):
   Request ──► Network ONLY (Never cached!)

5. Cache-Only (Pre-cached App Shell):
   Request ──► Cache ONLY (Instant offline delivery)
```

#### Implementation Code Snippets:

```javascript
// 1. Stale-While-Revalidate Implementation
async function staleWhileRevalidate(request) {
  const cache = await caches.open('dynamic-cache-v1');
  const cachedResponse = await cache.match(request);

  // Background network revalidation promise
  const networkFetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  // Return cached response instantly if available; otherwise wait for network
  return cachedResponse || networkFetchPromise;
}

// 2. Network-First with Cache Fallback
async function networkFirst(request) {
  const cache = await caches.open('api-cache-v1');
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}
```

---

## 3. Client-Side Storage Matrix: IndexedDB vs Cache API vs OPFS

### Q3: Contrast modern client-side storage engines. When should you use IndexedDB, the Cache Storage API, and the Origin Private File System (OPFS)?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[IndexedDB]` `[CacheAPI]` `[OPFS]` `[ClientStorage]`

**Answer:**

```text
Client-Side Storage Hierarchy:

┌────────────────────────────────────────────────────────────────────────┐
│ 1. Cache Storage API:                                                  │
│    - Stores raw Request / Response pairs.                              │
│    - Optimized for HTTP network assets, HTML, JS, CSS, images, audio.  │
├────────────────────────────────────────────────────────────────────────┤
│ 2. IndexedDB:                                                          │
│    - Asynchronous, transactional, indexed NoSQL object store.          │
│    - Stores structured objects, Blobs, typed arrays, queryable by index│
├────────────────────────────────────────────────────────────────────────┤
│ 3. Origin Private File System (OPFS):                                  │
│    - Private filesystem sandbox accessible via Web Workers.            │
│    - Fast synchronous byte-level file I/O (reads/writes directly to OS)│
│    - Powers SQLite in WASM, Photoshop web, Figma, video editing web.  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Comparison Matrix:

| Storage Engine | Capacity Limit | Access Thread | Synchronous / Async | Search Capabilities | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`localStorage`** | ~5MB | Main Thread only | 🔴 Synchronous (Blocks UI) | Key-value string lookup only | Ephemeral UI flags |
| **Cache API** | Hundreds of MBs | Main Thread & Workers | 🟢 Async | URL / Request matching | Network assets, media chunks |
| **IndexedDB** | Up to 80% of free disk | Main Thread & Workers | 🟢 Async | Indexed searches, ranges, compound keys | Chat history, draft entities |
| **OPFS** | Gigabytes | Web Workers (Sync handle) | 🟢 Fast Synchronous in Worker | Byte offsets, file streams | Client-side SQLite databases |

---

## 4. Offline Mutation Queues & Background Sync API

### Q4: Design an offline mutation pipeline. How does the Background Sync API ensure queued actions are executed even if the user closes the browser?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[BackgroundSync]` `[OfflineQueue]` `[ServiceWorkers]`

**Answer:**
If a user submits an order, likes a post, or sends an email while offline, standard `fetch()` fails.

```text
The Offline Mutation Queue Architecture:

User Action (Offline)
        │
        ▼
1. Enqueue Mutation in IndexedDB:
   { id: 'mut_1', url: '/api/order', body: {...}, timestamp: 17100029 }
        │
        ▼
2. Register Background Sync Tag:
   navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-orders'))
        │
        ▼
User Closes Tab or Locks Smartphone!
        │
        ▼
Network Reconnects Later (e.g., 30 minutes later)
        │
        ▼
Browser wakes up Service Worker in Background!
        │
        ▼
Service Worker 'sync' Event Fires:
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(drainAndReplayQueue());
  }
});
```

#### Production Background Sync Registration:
```typescript
// Main Thread Registration
export async function queueOfflineOrder(orderData: Order) {
  // 1. Save order to IndexedDB offline store
  await idb.orders.add({
    ...orderData,
    id: crypto.randomUUID(),
    status: 'queued',
  });

  // 2. Register Background Sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-orders');
  } else {
    // Fallback for browsers without SyncManager (Safari/iOS): listen to 'online' event
    window.addEventListener('online', () => drainQueueFallback(), { once: true });
  }
}
```

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug: Why does a Service Worker fail to install, rendering the entire PWA offline experience broken?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ServiceWorkers]` `[Debugging]` `[CacheAll]`

**Scenario:**
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/missing-avatar.png', // 404 Not Found on server!
      ]);
    })
  );
});
```
The Service Worker permanently fails installation. In DevTools, status is `Redundant`. Why?

#### Root Cause:
`cache.addAll()` is an **all-or-nothing atomic operation**. If any single URL in the array fails to fetch (e.g., returns `404 Not Found` or network fails), the entire `cache.addAll()` promise rejects. This causes the `install` event to fail, discarding the Service Worker completely.

#### The Fix:
Audit pre-cached assets in your build pipeline, or catch individual failures gracefully:
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then(async (cache) => {
      const urls = ['/', '/index.html', '/styles.css', '/avatar.png'];
      await Promise.all(
        urls.map((url) =>
          cache.add(url).catch((err) => console.warn(`Failed to precache ${url}`, err))
        )
      );
    })
  );
});
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: How do you request persistent storage to prevent the browser from evicting your IndexedDB data under low disk space?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical  
**Answer:** By invoking `navigator.storage.persist()`. Browsers treat client storage as "Best Effort" by default (evicting data when disk usage exceeds thresholds). If `await navigator.storage.persist()` returns `true`, the browser marks the origin as persistent, guaranteeing data will not be evicted during low-disk sweeps.

### Q7: Can a Service Worker intercept WebSockets or WebRTC traffic?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Answer:** No. Service Workers only intercept HTTP/HTTPS `fetch` requests (HTML, JS, CSS, images, REST/GraphQL calls). They cannot intercept or cache TCP WebSockets (`ws://`, `wss://`) or WebRTC UDP streams.
