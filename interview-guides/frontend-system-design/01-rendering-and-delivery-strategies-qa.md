# 01 — Rendering & Delivery Strategies

> Client-Side Rendering (CSR), Server-Side Rendering (SSR), Static Site Generation (SSG), Incremental Static Regeneration (ISR), Streaming SSR with Suspense, Partial Hydration & Islands Architecture, Resumability vs RSC, Edge Workers, HTTP/3 Multiplexing, and 103 Early Hints.

---

## 📑 Table of Contents
1. [The Rendering Spectrum: Architecture & Mechanics](#1-the-rendering-spectrum-architecture--mechanics)
2. [Hydration Mechanics, Islands & Resumability](#2-hydration-mechanics-islands--resumability)
3. [Edge Computing & Streaming Delivery Pipelines](#3-edge-computing--streaming-delivery-pipelines)
4. [Protocols & Modern Asset Delivery (HTTP/3, Early Hints)](#4-protocols--modern-asset-delivery-http3-early-hints)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Rendering Spectrum: Architecture & Mechanics

### Q1: Compare Client-Side Rendering (CSR), Server-Side Rendering (SSR), Static Site Generation (SSG), and Incremental Static Regeneration (ISR) from first principles. When do you choose each?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Rendering]` `[SSR]` `[SSG]` `[ISR]`

**Answer:**
Modern web architectures evaluate rendering strategies based on five core constraints: **Time to First Byte (TTFB)**, **First Contentful Paint (FCP)**, **Largest Contentful Paint (LCP)**, **Server Compute Overhead**, and **Content Freshness**.

```text
The Rendering Execution Continuum:

          Build Time                       Request Time                         Client Runtime
   ┌───────────────────────┐        ┌─────────────────────────┐        ┌──────────────────────────────┐
   │ SSG                   │        │ SSR                     │        │ CSR                          │
   │ Pre-baked HTML at     │ ─────► │ Node/Edge renders HTML  │ ─────► │ Browser downloads JS bundle, │
   │ build time. Zero      │        │ dynamically per request │        │ executes, builds DOM in      │
   │ runtime compute.      │        │ with live DB queries.   │        │ client memory.               │
   └───────────────────────┘        └─────────────────────────┘        └──────────────────────────────┘
               ▲                                 ▲
               └───────────────┬─────────────────┘
                               │
                    ┌──────────────────────┐
                    │ ISR                  │
                    │ Serves stale SSG     │
                    │ page, regenerates in │
                    │ background on-demand │
                    └──────────────────────┘
```

#### Detailed Trade-Off Matrix:

| Strategy | TTFB | FCP / LCP | SEO Crawlability | Server Cost | Content Dynamism | Ideal Use Cases |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CSR** | 🟢 ~50ms (Static CDN) | 🔴 1.5s–4.0s (JS waterfall) | 🟡 Inconsistent (bot JS execution limits) | 🟢 Negligible (Static hosting) | 🟢 Real-time per client | Authenticated SaaS dashboards, admin panels, games |
| **SSR** | 🔴 300ms–1500ms (DB + Node) | 🟢 Fast initial HTML paint | 🟢 100% compliant | 🔴 High (Node.js CPU/RAM scaling) | 🟢 Instantaneous per request | Social feeds, personalized e-commerce, live news |
| **SSG** | 🟢 ~20ms (Edge CDN) | 🟢 Instant (pre-rendered) | 🟢 100% compliant | 🟢 Zero dynamic server cost | 🔴 Stale until redeployment | Documentation, marketing landing pages, blogs |
| **ISR** | 🟢 ~20ms (Edge cache hit) | 🟢 Instant | 🟢 100% compliant | 🟡 Low (Edge rebuilds in background) | 🟡 Eventual consistency | E-commerce product listings, Wikipedia articles |

#### Under-the-Hood Execution Mechanics:
1. **CSR Mechanics:** The server responds with a blank `<div id="root"></div>` shell and `<script src="bundle.js">`. The browser downloads, parses, compiles, and executes JavaScript before generating DOM nodes. The user stares at a blank screen or spinner during the entire JS download-and-execution window.
2. **SSR Mechanics:** The incoming HTTP request hits an application server (e.g., Node.js / V8 isolate). The runtime fetches database records, runs the component render function (e.g., `renderToString()`), serializes initial state into `<script id="__DATA__">`, and sends full HTML. The client paints instantly, but the page is inert until the client-side JavaScript bundle downloads and attaches listeners (**Hydration**).
3. **SSG Mechanics:** The compiler invokes data fetchers (e.g., `getStaticProps`) at build time for all known routes, emitting static `.html` and `.json` files. These files are distributed across global CDN PoPs.
4. **ISR Mechanics:** The CDN serves the cached static HTML page. If the cache age exceeds the configured `revalidate` threshold (e.g., 60 seconds), the CDN still serves the stale page to the current visitor, but asynchronously triggers a headless serverless worker to re-fetch data, re-render the page, and update the CDN cache.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens in ISR if 10,000 concurrent requests hit an expired page during the exact second the revalidation trigger fires?"  
*Senior Answer:* "Without **request coalescing** (also called cache lock or thundering herd mitigation), 10,000 backend rebuild jobs would trigger simultaneously, crashing the database. Production edge CDNs (like Cloudflare Cache Reserve or Fastly) implement origin shields and stale-while-revalidate locks: exactly **one** background rebuild job is dispatched to origin, while the remaining 9,999 requests are served the stale cached HTML seamlessly."

---

### Q2: What is Streaming Server-Side Rendering (Streaming SSR), and how does it solve the "all-or-nothing" bottleneck of traditional SSR?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[StreamingSSR]` `[Suspense]` `[NodeHTTP]`

**Answer:**
Traditional SSR suffers from an **all-or-nothing** bottleneck: `renderToString()` is synchronous and blocking. If a page has 3 components, and Component C depends on a slow database query (taking 1.5 seconds), the server cannot send a single byte of HTML to the client until Component C resolves. This inflates TTFB.

```text
Traditional SSR (Blocking Waterfall):
Server:  [===== Fetch DB A =====][=== Fetch DB B ===][=========== Slow DB C (1.5s) ===========][Render HTML]
Network: ─────────────────────────────────────────────────────────────────────────────────────────────► [Send 100% HTML]
Browser:                                                                                                [FCP Paint]

Streaming SSR with Suspense (Pipelined):
Server:  [= DB A =][Render Shell] ──► Chunks streamed immediately via HTTP/1.1 chunked or HTTP/2
Network: ──► [Stream Header & Shell] ──► [Stream Comp A] ──────► [Stream Comp B] ──────► [Stream Comp C]
Browser:     [Instant Shell Paint]       [Hydrate Comp A]        [Hydrate Comp B]       [Replace Skeleton]
```

#### How Streaming SSR Operates:
1. The server utilizes `renderToPipeableStream` (React 18+) or web streams (`ReadableStream`).
2. The server immediately sends the outer HTML shell, navigation bar, and `<Suspense>` fallback skeletons:
   ```html
   <!-- First Flush (TTFB ~30ms) -->
   <div id="root">
     <nav>My Store</nav>
     <!-- Fallback placeholder injected for slow component -->
     <div id="reviews-placeholder"><div class="skeleton-loader"></div></div>
   </div>
   ```
3. When the slow database promise resolves, the server flushes a self-contained inline script chunk at the tail end of the open HTTP connection:
   ```html
   <!-- Subsequent Stream Chunk (1.5s later) -->
   <div hidden id="reviews-content">
     <div class="review">Great product! ★★★★★</div>
   </div>
   <script>
     // Browser moves content into placeholder and deletes fallback
     document.getElementById('reviews-placeholder').replaceWith(
       document.getElementById('reviews-content')
     );
   </script>
   ```
4. The client browser progressively hydrates components as they arrive without waiting for the whole page.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens to HTTP response status codes in Streaming SSR if an error occurs inside a component *after* the initial shell has already streamed?"  
*Senior Answer:* "Because the HTTP headers (`HTTP/1.1 200 OK`) and the initial HTML shell have already been flushed over the network socket, the server **cannot** change the status code to a `500 Internal Server Error`. The streaming engine catches the error inside an internal server `<ErrorBoundary>`, suppresses the server render for that subtree, and streams a client-side instruction telling the browser to fall back to Client-Side Rendering for that specific widget."

---

## 2. Hydration Mechanics, Islands & Resumability

### Q3: Explain the "Uncanny Valley" of Traditional Hydration. How do Islands Architecture and Resumability eliminate it?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Hydration]` `[IslandsArchitecture]` `[Qwik]` `[Resumability]`

**Answer:**
Traditional SSR sends complete HTML, which looks fully rendered to the human eye. However, the page is non-interactive until the browser executes the entire client JavaScript bundle to reconstruct the virtual component tree in memory, match every DOM node with its corresponding VNode, and attach event listeners. This gap between **First Contentful Paint (FCP)** and **Time to Interactive (TTI)** is known as the **Uncanny Valley** of hydration.

```text
The Uncanny Valley Timeline:
Time:     0s         0.5s                  1.2s                     3.5s
Visual:   [Blank] ──► [HTML Paints] ──────► [User Sees Button] ────► [JS Executes & Attaches Listeners]
Action:               (Looks ready!)        User clicks "Buy Now"    Click finally registers!
                      FCP                   NO EVENT FIRED!          TTI
                                            (Uncanny Valley: Rage Clicks)
```

#### Modern Solutions to the Hydration Bottleneck:

```text
1. Traditional Hydration:
   [HTML: Static Page] + [1.5MB JS Bundle] ──► Re-evaluates 100% of components on client.

2. Islands Architecture (Astro):
   ┌────────────────────────────────────────────────────────┐
   │ Static Pure HTML Shell (Zero Client JavaScript)        │
   │  ┌───────────────────────┐   ┌───────────────────────┐ │
   │  │ Interactive Island 1  │   │ Interactive Island 2  │ │
   │  │ Hydrates on Idle      │   │ Hydrates on Viewport  │ │
   │  │ (e.g., Search Bar)    │   │ (e.g., Image Gallery) │ │
   │  └───────────────────────┘   └───────────────────────┘ │
   └────────────────────────────────────────────────────────┘

3. Resumability (Qwik):
   Server serializes listeners & state directly into HTML attributes:
   <button on:click="chunk-49.js#handleBuy">Buy</button>
   ZERO JS executed on load. Code downloaded only when user clicks.
```

#### Architectural Differences:

1. **Partial Hydration / Islands Architecture (Astro, Fresh):**
   - The document is rendered as 100% static HTML by default.
   - Interactive sections are declared as isolated "Islands":
     ```html
     <!-- Hydrates only when component scrolls into viewport -->
     <ImageCarousel client:visible />
     <!-- Hydrates only when main thread is idle -->
     <CommentWidget client:idle />
     ```
   - Eliminates 80–90% of client JavaScript because static elements (headers, footers, sidebars, text) download zero client-side framework code.

2. **Resumability (Qwik):**
   - Eliminates hydration entirely ($O(1)$ startup time regardless of app size).
   - The server serializes the internal reactive state, virtual DOM tree, and closure boundaries directly into HTML text and DOM attribute hooks.
   - When the user clicks an interactive button, a tiny 1KB global event listener intercepts the event, lazy-loads only the exact micro-chunk containing the click handler via dynamic `import()`, and resumes execution.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What are the trade-offs of Resumability compared to traditional React/Next.js architectures?"  
*Senior Answer:* "While Resumability delivers unmatched Core Web Vitals (near-zero TBT/INP), it introduces two trade-offs: (1) **Interaction Network Latency:** If a user clicks a button on a flaky 3G connection, there can be a 500ms delay while the click-handler micro-chunk is fetched (mitigated by aggressive service-worker prefetching of visible interactive chunks), and (2) **Ecosystem Incompatibility:** You cannot freely reuse the massive ecosystem of standard React libraries (e.g., complex component libraries that rely on standard React lifecycles and context hooks)."

---

## 3. Edge Computing & Streaming Delivery Pipelines

### Q4: How do Edge Functions (Cloudflare Workers, Vercel Edge) differ from centralized Node.js SSR servers? Architect an edge-rendered personalized storefront.

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[EdgeComputing]` `[CloudflareWorkers]` `[V8Isolates]`

**Answer:**
Traditional SSR runs in containerized Node.js clusters in a single cloud region (e.g., AWS `us-east-1`). A user in Tokyo accessing a server in Virginia experiences a minimum 180ms speed-of-light round-trip latency before any compute begins.

**Edge Computing** runs code across hundreds of Points of Presence (PoPs) globally, executing within lightweight **V8 Isolates** rather than full Node.js processes.

```text
Centralized SSR vs Edge SSR Topology:

Centralized Architecture:
User (Tokyo) ────── 9,000 km (180ms RTT) ──────► AWS us-east-1 (Node.js Container) ──► DB
                                                (Total TTFB: ~400ms - 800ms)

Edge Architecture:
User (Tokyo) ──► Tokyo Edge PoP (V8 Isolate ~5ms) ──► Read Replica / Edge KV (~10ms)
                                                (Total TTFB: ~35ms)
```

#### Node.js Containers vs V8 Isolates:
| Metric | Node.js Container (Docker/EC2) | Edge V8 Isolate (Cloudflare / Deno) |
| :--- | :--- | :--- |
| **Cold Start Time** | 500ms – 5,000ms | 0ms – 5ms (instantaneous) |
| **Memory Footprint**| 50MB – 250MB per process | 3MB – 10MB per isolate |
| **Node.js APIs** | Full (`fs`, `child_process`, TCP) | Restricted Web Standards (`fetch`, `crypto`, `Streams`) |
| **Execution Budget**| Minutes (long-running) | 10ms – 50ms CPU time limits |

#### Edge Personalized Storefront Architecture:
```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Edge Worker (PoP: Tokyo)                        │
│                                                                        │
│ 1. Intercept Request ──► Read Cookie 'user_session'                   │
│ 2. Geolocation API   ──► Detect Currency (JPY) & Language (ja-JP)     │
│ 3. Edge KV / Cache   ──► Fetch Pre-rendered Static Product Shell (1ms) │
│ 4. Read Replica      ──► Fetch User Personalized Discount (15ms)       │
│ 5. HTML Rewriter     ──► Stream patched HTML to client                 │
└────────────────────────────────────────────────────────────────────────┘
```

```typescript
// Edge Worker Personalization using Streaming HTMLRewriter
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const country = request.headers.get('cf-ipcountry') || 'US';
    const currency = country === 'JP' ? '¥' : '$';

    // 1. Fetch cached static shell from Edge Cache (near 0ms)
    const staticShell = await fetch('https://origin.store.com/products/headphones', {
      cf: { cacheTtl: 3600 }
    });

    // 2. Stream and transform HTML tokens on the fly without buffering whole string
    return new HTMLRewriter()
      .on('span.currency-symbol', {
        element(el) {
          el.setInnerContent(currency);
        }
      })
      .on('div#geo-banner', {
        element(el) {
          if (country === 'JP') {
            el.setInnerContent('<p>Free shipping across Japan on orders over ¥5,000!</p>', { html: true });
          }
        }
      })
      .transform(staticShell);
  }
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If you execute SSR on Edge workers worldwide, where does the database live? Doesn't the Edge-to-Centralized-Database round trip ruin the latency benefit?"  
*Senior Answer:* "Yes! This is the **Edge Data Gravity Anti-Pattern**. Running SSR at the edge while querying a centralized PostgreSQL database in `us-east-1` actually increases latency. To make Edge SSR viable, you must colocate the data: (1) Use globally replicated key-value stores (Cloudflare KV, Upstash Redis), (2) Use read replicas with active-active edge databases (Cloudflare D1, Turso/libSQL, AWS Aurora Global Database), or (3) Use Edge Workers strictly for routing, A/B testing, and pre-cached HTML composition, letting client-side async requests fetch regional data."

---

## 4. Protocols & Modern Asset Delivery (HTTP/3, Early Hints)

### Q5: How does HTTP/3 (QUIC) resolve the Head-of-Line (HoL) blocking of HTTP/2? How do 103 Early Hints optimize the critical rendering path?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[HTTP3]` `[QUIC]` `[EarlyHints]` `[CriticalPath]`

**Answer:**
Both HTTP/1.1 and HTTP/2 suffer from Head-of-Line (HoL) blocking, but at different layers of the networking stack:

```text
HTTP Protocol Evolution & Head-of-Line Blocking:

HTTP/1.1 (Application Layer HoL):
TCP Connection: [Request 1 ──────►][Response 1 ◄─────][Request 2 ──────►][Response 2 ◄─────]
(Browser cannot send Request 2 until Response 1 finishes. Solved via domain sharding / 6 connections).

HTTP/2 (Transport Layer TCP HoL):
TCP Connection: ┌─ Stream 1: CSS Chunk 1 ───► [PACKET DROP!] ──► STALLS ALL STREAMS!
(Single TCP     ├─ Stream 2: JS Chunk 1 ────► Must wait for TCP retransmit of dropped packet!
 Socket)        └─ Stream 3: Image Chunk 1 ─► Entire multiplexed connection freezes.

HTTP/3 QUIC over UDP (Zero HoL Blocking):
UDP Datagrams:  ┌─ Stream 1: CSS Chunk ───► [PACKET DROP!] ──► Only Stream 1 waits!
                ├─ Stream 2: JS Chunk ────► DELIVERED INSTANTLY! Browser parses JS.
                └─ Stream 3: Image Chunk ─► DELIVERED INSTANTLY! Browser decodes image.
```

#### Why HTTP/3 (QUIC) Matters for Frontend Performance:
1. **Independent Streams over UDP:** QUIC implements multiplexing natively over UDP. If a packet belonging to Stream 1 drops over cellular Wi-Fi, Streams 2, 3, and 4 continue delivering data to the browser V8 engine without delay.
2. **0-RTT Connection Handshake:** TCP requires 3-way handshakes plus TLS 1.3 negotiation (2 RTTs). HTTP/3 combines cryptographic keys into the transport handshake, enabling **0-RTT connection resumption** for repeat mobile visitors.
3. **Connection Migration:** If a user walks out of their house and their phone switches from home Wi-Fi to 5G cellular, a standard TCP connection breaks (forcing a full renegotiation). HTTP/3 identifies connections using a 64-bit Connection ID (`CID`), allowing the active video or page stream to continue uninterrupted across IP address shifts.

---

### Q6: How do 103 Early Hints work, and how do they eliminate server processing latency on the critical rendering path?

**Answer:**
When a browser requests an SSR page, the backend server must run database queries, render templates, or authenticate sessions before returning `HTTP 200 OK`. During this 300ms–800ms "server think time," the client's network connection sits completely idle.

**HTTP 103 Early Hints** allows the server to send an informational preliminary HTTP status code containing resource preload headers **before** generating the final response:

```text
103 Early Hints Request Timeline:

Client Browser                               Edge / CDN Origin Server
      │                                                │
      │ 1. GET /dashboard                              │
      ├───────────────────────────────────────────────►│
      │                                                │ [Server begins slow DB query: 400ms]
      │ 2. HTTP 103 Early Hints                        │
      │    Link: </style.css>; rel=preload; as=style   │
      │    Link: </app.js>; rel=preload; as=script     │
      │    Link: <https://fonts.gstatic.com>; rel=preconnect
      │◄───────────────────────────────────────────────┤
      │                                                │
      │ [Browser immediately warms TLS to fonts,       │
      │  downloads style.css & app.js in parallel]     │
      │                                                │ [Server finishes DB query]
      │ 3. HTTP 200 OK (Final HTML)                    │
      │◄───────────────────────────────────────────────┤
      │                                                │
      │ [Browser parses HTML. CSS & JS are ALREADY in  │
      │  cache! Zero waterfall delay!]                 │
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the difference between sending a `103 Early Hint` with `rel=preload` and using HTTP/2 Server Push?"  
*Senior Answer:* "HTTP/2 Server Push was deprecated by the Chrome team and removed because the server pushed assets blindly without knowing if the browser's disk cache already had them, wasting massive bandwidth. **103 Early Hints** simply tells the browser: *'Here are the assets you will need'*. The browser checks its local HTTP cache first; if the asset is already cached, it ignores the hint. It respects client caching state while retaining zero-latency discovery."

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q7: 🐛 Debug: Resolving the "Text content did not match server-rendered HTML" Hydration Error.

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[HydrationMismatch]` `[Debugging]` `[SSR]`

**Scenario:**
A user reports erratic layout shifts and broken button clicks on an e-commerce dashboard. In the Chrome DevTools console, you spot:
```text
Error: Hydration failed because the initial UI does not match what was rendered on the server.
Warning: Expected server HTML to contain a matching <span> in <div>.
See more info here: https://react.dev/link/hydration-mismatch
```

Look at the offending code:
```tsx
export function UserHeader({ user }: { user: User }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const loginDate = new Date(user.lastLogin).toLocaleDateString();

  return (
    <header className="header">
      <h1>Welcome back, {user.name}</h1>
      <p>Last login: {loginDate}</p>
      {isMobile ? <MobileNavigationMenu /> : <DesktopNavigationMenu />}
    </header>
  );
}
```

**What are the two distinct bugs causing the hydration disaster, and how do you write a robust, production-grade fix?**

#### Root Cause Analysis:
1. **The Window Dimensions Check (`window.innerWidth`):**
   - On the Node.js server, `window` is `undefined`, so `isMobile` evaluates to `false`. The server emits `<DesktopNavigationMenu />`.
   - On the client browser, `window.innerWidth` is `390px` (mobile viewport), so `isMobile` evaluates to `true`. React attempts to hydrate `<MobileNavigationMenu />` into the DOM nodes rendered for desktop! React detects a DOM tag mismatch, aborts hydration, strips the server-rendered DOM nodes, and triggers a full client re-render, creating severe layout shift (CLS) and input lag.
2. **The Locale Date String (`toLocaleDateString()`):**
   - The server container runs in AWS `us-east-1` with timezone `UTC` and locale `en-US` (`10/12/2026`).
   - The client browser runs in London or Tokyo with locale `ja-JP` (`2026/10/12`). The generated text nodes do not match byte-for-byte.

#### The Senior Production Fix:
```tsx
import { useState, useEffect } from 'react';

export function UserHeader({ user }: { user: User }) {
  // 1. Defend against viewport divergence by rendering a consistent responsive layout via CSS,
  // or deferring client-specific mounts until after hydration mounts:
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Format date with an explicit, deterministic timezone & locale, or format inside useEffect
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(user.lastLogin));

  return (
    <header className="header">
      <h1>Welcome back, {user.name}</h1>
      <p>Last login: {formattedDate}</p>

      {/* Production Best Practice: Use CSS media queries for layout swapping whenever possible */}
      <div className="mobile-only-nav">
        <MobileNavigationMenu />
      </div>
      <div className="desktop-only-nav">
        <DesktopNavigationMenu />
      </div>

      {/* If JS-based conditional rendering is strictly required: */}
      {hasMounted && <ClientOnlyDynamicWidget />}
    </header>
  );
}
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q8: What is the "Critical CSS" pattern in SSR, and why does inlining it in `<style>` tags outperform an external `<link rel="stylesheet">`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** External stylesheet links block the browser's HTML parser until downloaded over the network. Inlining the minimal CSS required to render above-the-fold content directly inside `<head><style>...</style></head>` allows the browser to paint First Contentful Paint (FCP) on the very first TCP packet received, while non-critical CSS is loaded asynchronously via `<link rel="preload" as="style" onload="this.rel='stylesheet'">`.

### Q9: Can an SSG website have user-specific authenticated pages?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** Yes. This is the **Statically Generated Shell with Client SWR Hydration** pattern. The layout, navigation bar, and empty widget containers are pre-rendered statically to an edge CDN (giving 20ms TTFB). Once loaded, client-side JavaScript reads the session token from an `HttpOnly` cookie, hits an authenticated `/api/me` endpoint, and populates the user's private data dynamically.

### Q10: Why does React 19 introduce Server Actions, and how do they interact with progressive enhancement?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical  
**Answer:** Server Actions allow client components to invoke asynchronous backend functions directly via RPC without manually declaring REST endpoints. When combined with native HTML `<form action={serverAction}>`, they support **Progressive Enhancement**: the form can be submitted and processed by the server even if client-side JavaScript has not finished downloading or has failed due to network disruption.
