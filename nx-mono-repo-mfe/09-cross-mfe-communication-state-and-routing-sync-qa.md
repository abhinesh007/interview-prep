# 09 — Cross-MFE Communication, State Topology & Routing Synchronization

> State Topology & The Global Store Anti-Pattern, Decoupled Event Buses (CustomEvents, RxJS Contracts), Multi-Tab Sync (`BroadcastChannel`), The Dual-Router Problem, and Deep-Linking Race Conditions.

---

## 📑 Table of Contents
1. [State Topology & The Global Store Anti-Pattern](#1-state-topology--the-global-store-anti-pattern)
2. [Decoupled Communication: CustomEvents & Typed Event Buses](#2-decoupled-communication-customevents--typed-event-buses)
3. [Multi-Tab & Cross-Window State Sync (`BroadcastChannel`)](#3-multi-tab--cross-window-state-sync-broadcastchannel)
4. [Routing Synchronization: The Dual-Router Problem](#4-routing-synchronization-the-dual-router-problem)
5. [Deep Linking Traps & Async Route Resolution](#5-deep-linking-traps--async-route-resolution)
6. [🧩 Output Prediction & 🐛 Debug Scenarios](#6--output-prediction---debug-scenarios)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. State Topology & The Global Store Anti-Pattern

### Q1: Why is sharing a single monolithic global store (Redux / NgRx) across Micro-Frontends considered an enterprise anti-pattern?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[State-Topology]` `[Anti-Pattern]` `[Architecture]`

**Answer:**
A recurring mistake made by teams transitioning from a monolith to micro-frontends is attempting to share a single global store (Redux, NgRx, or Pinia) across all remotes:

```text
THE MONOLITHIC STORE ANTI-PATTERN (Tight Coupling):
┌────────────────────────────────────────────────────────┐
│               Global Monolithic Store                  │
│       { auth: {...}, cart: {...}, orders: {...} }      │
└───────▲──────────────────────▲──────────────────▲──────┘
        │                      │                  │
   Remote A               Remote B           Host Shell
[FAILS INDEPENDENT DEPLOYABILITY:
 - All remotes must align on the exact same Redux/NgRx version.
 - Action type naming collisions occur easily across teams.
 - State schema changes require coordinated releases across 5 teams.]
```

### The Recommended 3-Tier State Topology:
Instead of a shared global store, enterprise architectures decouple state into three strict layers:

```text
1. LOCAL COMPONENT STATE (Transient)
   - Component-level Signals, useState, UI toggle flags.
   - Destroyed when component unmounts.

2. MFE DOMAIN STATE (Private to MFE)
   - Stored in the remote's private store (NgRx SignalStore, Zustand, Pinia).
   - Never directly accessed or mutated by other remotes.

3. GLOBAL AMBIENT STATE (Contract-Driven, Minimal)
   - Strictly limited to: Current User Identity, Auth Token, Active Theme, Tenant ID.
   - Shared via read-only contracts or decoupled event messages.
```

---

## 2. Decoupled Communication: CustomEvents & Typed Event Buses

### Q2: Author a type-safe, framework-agnostic Event Bus library in an Nx monorepo with zero runtime dependencies.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Event-Bus]` `[TypeScript]` `[Contracts]`

**Answer:**

```typescript
// libs/shared/event-bus/src/lib/event-bus.ts

/**
 * 1. Define explicit payload contracts for all cross-MFE events.
 */
export interface MfeEventMap {
  'USER_AUTHENTICATED': { userId: string; token: string; roles: string[] };
  'USER_LOGGED_OUT': void;
  'CART_ITEM_ADDED': { itemId: string; quantity: number; price: number };
  'CART_COUNT_UPDATED': { count: number };
  'THEME_CHANGED': { theme: 'light' | 'dark' };
}

type EventKey = keyof MfeEventMap;

/**
 * 2. Framework-Agnostic, Type-Safe Event Bus using Native EventTarget.
 */
class TypeSafeEventBus {
  private target: EventTarget;

  constructor() {
    // Attach to global window or create isolated EventTarget instance
    this.target = typeof window !== 'undefined' ? window : new EventTarget();
  }

  emit<K extends EventKey>(event: K, payload: MfeEventMap[K]): void {
    const customEvent = new CustomEvent(event, {
      detail: payload,
      bubbles: true,
      composed: true, // Allows event to cross Shadow DOM boundaries!
    });
    this.target.dispatchEvent(customEvent);
  }

  on<K extends EventKey>(
    event: K,
    handler: (payload: MfeEventMap[K]) => void
  ): () => void {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<MfeEventMap[K]>;
      handler(customEvent.detail);
    };

    this.target.addEventListener(event, listener);

    // Return teardown function for easy cleanup in ngOnDestroy / useEffect
    return () => {
      this.target.removeEventListener(event, listener);
    };
  }
}

// Export singleton instance
export const mfeEventBus = new TypeSafeEventBus();
```

### Consumption in Angular Remote:
```typescript
@Component({ ... })
export class CartButtonComponent implements OnInit, OnDestroy {
  private unsubscribe?: () => void;

  ngOnInit() {
    this.unsubscribe = mfeEventBus.on('CART_COUNT_UPDATED', (payload) => {
      this.cartCount.set(payload.count);
    });
  }

  ngOnDestroy() {
    this.unsubscribe?.(); // Prevent memory leak!
  }
}
```

### Consumption in React Remote:
```tsx
export function CheckoutButton() {
  const handleClick = () => {
    mfeEventBus.emit('CART_ITEM_ADDED', { itemId: 'sku-1', quantity: 1, price: 99 });
  };
  return <button onClick={handleClick}>Add to Cart</button>;
}
```

---

## 3. Multi-Tab & Cross-Window State Sync (`BroadcastChannel`)

### Q3: How do you synchronize session state (such as logout or cart updates) across multiple browser tabs using `BroadcastChannel`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[BroadcastChannel]` `[Multi-Tab]` `[State]`

**Answer:**
The **`BroadcastChannel` API** enables simple, bidirectional message passing between different browsing contexts (tabs, windows, iframes) on the same origin:

```typescript
// libs/shared/event-bus/src/lib/broadcast-sync.ts
const channel = new BroadcastChannel('mfe_cross_tab_sync');

export function notifySessionTerminated(): void {
  // Broadcasts event to all other open tabs on this origin
  channel.postMessage({ type: 'AUTH_LOGOUT', timestamp: Date.now() });
}

export function initializeCrossTabSync(onLogout: () => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'AUTH_LOGOUT') {
      console.warn('Session terminated in another tab. Logging out...');
      onLogout();
    }
  };

  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}
```

**Why `BroadcastChannel` is superior to `localStorage` events:**
- `localStorage` storage events only trigger if the key's value actually changes, cannot send non-stringifiable data cleanly, and write unnecessarily to physical disk storage. `BroadcastChannel` operates directly in browser RAM with zero disk I/O.

---

## 4. Routing Synchronization: The Dual-Router Problem

### Q4: Explain the "Dual-Router Problem" in Micro-Frontends and how to synchronize navigation between Host and Remote routers.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Routing]` `[Dual-Router]` `[popstate]`

**Answer:**
### The Dual-Router Problem:
When an Angular Shell Host (using Angular Router) mounts a React Remote (using React Router or TanStack Router), **two independent routing engines are listening to and manipulating the browser URL bar**:

```text
THE DUAL-ROUTER CLASH:
1. User clicks link inside React Remote: "/checkout/payment"
2. React Router pushes state to window.history.
3. Angular Router intercepts the URL change.
4. Angular Router does not recognize "/checkout/payment" in its root table.
5. Angular Router redirects user to 404 or "/home"!
```

### The Synchronization Architecture:

```text
┌────────────────────────────────────────────────────────┐
│                   Angular Host Router                  │
│  - Owns the primary URL bar and root prefix            │
│  - Route: path: 'checkout/**', component: Wrapper      │
└───────────────────────────┬────────────────────────────┘
                            │
               Delegates navigation updates
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Remote React Router                    │
│  - Operates with a configured basename: '/checkout'    │
│  - Uses MemoryRouter OR synchronized Browser History   │
└────────────────────────────────────────────────────────┘
```

### The Solution:
1. **Host Owns Root Routing:** The Host Router defines wildcards for remotes: `{ path: 'checkout/**', ... }`.
2. **Basename Scoping:** The Remote router is configured with `basename="/checkout"`.
3. **Synchronize via Custom History Adapter:** The Host notifies the Remote of path updates; the Remote notifies the Host when it navigates internally, using `history.pushState` without re-triggering whole-app reload.

---

## 5. Deep Linking Traps & Async Route Resolution

### Q5: How do you prevent layout flashes or 404 errors when a user deep-links directly to a nested route inside a federated remote?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Deep-Linking]` `[Routing]` `[Race-Condition]`

**Answer:**
### The Scenario:
A user bookmarks `https://app.com/orders/details/48192` and opens it directly in a new tab.

### The Race Condition:
1. The Host Shell boots and parses `/orders/details/48192`.
2. The route `/orders` requires fetching `orders/remoteEntry.js` over the network (150ms).
3. If the Host Router evaluates route matching synchronously before the remote entry chunk has finished downloading and registering child routes, it fails route matching and displays a **Flash of 404**!

### The Mitigation:
1. **Asynchronous Lazy Routes (`loadChildren`):**
   Angular Router pauses route transition and holds the navigation event until the `loadChildren` Promise resolves:
   ```typescript
   {
     path: 'orders',
     loadChildren: () =>
       loadRemoteModule({
         type: 'manifest',
         remoteName: 'orders',
         exposedModule: './Routes',
       }).then((m) => m.ORDERS_ROUTES),
   }
   ```
2. **Global Navigation Preloader / Skeleton:**
   While the remote entry resolves, the Host shell renders a top-level route loading indicator or skeleton screen to prevent blank screens or visual layout jumps.

---

## 6. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🐛 Debug Scenario: Infinite Back-Button Redirect Loop
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Back-Button]` `[History-API]`

**Scenario:**
An Angular Host embeds a React remote. The user navigates:
`/home` $\rightarrow$ `/checkout/step-1` $\rightarrow$ `/checkout/step-2`.
When the user clicks the browser's native **Back button**, the URL flashes `/checkout/step-1` and immediately bounces back to `/checkout/step-2`! The user is permanently trapped in an infinite back-button loop.
What is the cause and architectural fix?

**Answer:**
**Root Cause:** Both the Host Router and Remote Router were independently listening to the window `popstate` event and executing `history.pushState()` in response!
1. User clicks Back $\rightarrow$ Browser emits `popstate` to `/checkout/step-1`.
2. Host Router updates its internal path.
3. Remote Router also intercepts `popstate`, detects that its internal state was at `step-2`, and calls `history.pushState('/checkout/step-2')` to synchronize its view.
4. The push creates a new history entry, trapping the user.

**The Fix:**
Only **one router may manipulate the browser history API directly**. The Remote must use a **`MemoryRouter`** (an in-memory router that does not touch `window.history`), controlled exclusively by the Host passing the active URL down via props.

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q7: Why should URL Query Parameters always be preferred over global store state for filters and pagination?
**Answer:** URL state is naturally bookmarkable, shareable between users, survives page refreshes, and can be read by any federated remote without cross-MFE state synchronization libraries.

### Q8: What is the risk of using `window.postMessage()` for communication between remotes on the same page?
**Answer:** `window.postMessage()` is asynchronous (scheduled on the macrotask queue) and string-serializes data via the structured clone algorithm, introducing serialization latency compared to synchronous `CustomEvent` or in-memory Observable dispatches.

### Q9: Can two remotes share an RxJS `BehaviorSubject` directly?
**Answer:** Yes, provided the library exporting the `BehaviorSubject` is shared as a strict singleton in `module-federation.config.ts`. If it is not a singleton, each remote will receive a different memory reference.

### Q10: What does `composed: true` do on a `CustomEvent`?
**Answer:** It allows the event to bubble up through the **Shadow DOM boundary** into the regular DOM tree, ensuring that components inside Shadow DOM can communicate with outer host shells.
