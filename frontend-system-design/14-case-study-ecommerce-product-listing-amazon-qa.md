# 14 — Case Study: E-Commerce Product Listing (Amazon)

> End-to-End System Design of an E-Commerce Product Catalog evaluated via the **RADIO Framework**: Faceted Multi-Attribute Search, Two-Way URL State Synchronization, Cross-Tab Cart Synchronization (`BroadcastChannel`), and Micro-Frontend Boundaries.

---

## 📑 Table of Contents
1. [Requirements & Scoping (R)](#1-requirements--scoping-r)
2. [High-Level Architecture & URL State Syncing (A)](#2-high-level-architecture--url-state-syncing-a)
3. [Data Model & Facet Filter Math (D)](#3-data-model--facet-filter-math-d)
4. [Component Hierarchy & Cross-Tab Cart Sync (I)](#4-component-hierarchy--cross-tab-cart-sync-i)
5. [Micro-Frontend Boundaries & Optimizations (O)](#5-micro-frontend-boundaries--optimizations-o)
6. [🎯 Interviewer Probes & Senior Follow-ups](#6--interviewer-probes--senior-follow-ups)

---

## 1. Requirements & Scoping (R)

### Functional Requirements:
- **Faceted Search & Multi-Attribute Filtering:** Filter products by brand, price slider, customer review ratings, and availability status.
- **Deep-Linkable & Shareable URLs:** All applied filters, sorting options, and pagination cursors must reflect in the URL query string.
- **Cross-Tab Cart Synchronization:** Adding an item to the shopping cart in Tab A updates the cart badge and subtotal in Tab B instantly.
- **Guest-to-Authenticated Cart Reconciliation:** Items added anonymously merge seamlessly with the user's permanent cart upon login.
- **SEO Crawlability:** Search engines must be able to index product listings and crawl category paths.

### Non-Functional Requirements & Budgets:
- **Filter Latency:** Cached filter transitions render in **<100ms**; network round-trips resolve under **<300ms**.
- **SEO Architecture:** SSR or Edge-rendered HTML shell for category landings with full schema markup (`Product`, `Offer`).
- **Core Web Vitals:** LCP $\le 2.0\text{s}$, CLS $\le 0.05$.

---

## 2. High-Level Architecture & URL State Syncing (A)

```text
E-Commerce Faceted Search Architecture:

User Toggles Filter: [✓] Sony  [✓] $100-$300
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ URL State Sync Engine                                  │
│ - Serializes state: ?brand=sony&minPrice=100&maxPrice=300
│ - Updates history: history.pushState() (debounced)     │
└─────────────────────┬──────────────────────────────────┘
                      │ URL Change Event
                      ▼
┌────────────────────────────────────────────────────────┐
│ Client Query Cache (TanStack Query / SWR)              │
│ - Cache Key: ['products', { brand: 'sony', ... }]      │
│ - Hits in-memory cache? ──► Instant UI render!         │
│ - Miss? ──► GET /api/v1/products?brand=sony...         │
└─────────────────────┬──────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ UI Layout Engine                                       │
│ - Updates Filter Chips, Results Count, Product Grid    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Data Model & Facet Filter Math (D)

### Disjunctive vs Conjunctive Filtering:
A major challenge in faceted search is handling boolean logic correctly across multiple attributes:
- **Disjunctive Filtering ($OR$):** Selecting multiple values within the **same** facet group (e.g., Brand: Sony $OR$ Apple). A product matching either brand is included ($A \cup B$).
- **Conjunctive Filtering ($AND$):** Combining values across **different** facet groups (e.g., Brand: Sony $AND$ Price $< \$300$). A product must satisfy both conditions ($A \cap B$).

```typescript
export interface FacetFilterState {
  category: string;
  brands: string[]; // OR within group
  priceRange: { min: number; max: number }; // AND across group
  minRating?: number;
  inStockOnly: boolean;
  sortBy: 'price_asc' | 'price_desc' | 'popularity' | 'rating';
  page: number;
}

export interface ProductSummaryEntity {
  id: string;
  title: string;
  brand: string;
  price: number;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  isAvailable: boolean;
}
```

---

## 4. Component Hierarchy & Cross-Tab Cart Sync (I)

### Real-Time Cross-Tab Cart Synchronization (`BroadcastChannel`):
When a user has multiple tabs open (e.g., comparing products), adding an item to the cart in Tab 1 must update Tab 2 immediately without refreshing the page.

```typescript
// Cross-Tab Cart Communication Manager
export class CrossTabCartSync {
  private channel: BroadcastChannel;

  constructor(private onCartUpdated: (cart: CartState) => void) {
    this.channel = new BroadcastChannel('ecommerce_cart_bus');

    this.channel.onmessage = (event) => {
      if (event.data?.type === 'CART_UPDATED') {
        this.onCartUpdated(event.data.payload);
      }
    };

    // Fallback for older browsers: listen to localStorage 'storage' event
    window.addEventListener('storage', (e) => {
      if (e.key === 'cart_cache' && e.newValue) {
        this.onCartUpdated(JSON.parse(e.newValue));
      }
    });
  }

  public notifyCartChange(newCart: CartState): void {
    // 1. Broadcast to all other open tabs on this origin
    this.channel.postMessage({ type: 'CART_UPDATED', payload: newCart });
    // 2. Persist to localStorage for fallback
    localStorage.setItem('cart_cache', JSON.stringify(newCart));
  }
}
```

---

## 5. Micro-Frontend Boundaries & Optimizations (O)

### Defining Autonomous Domain Boundaries:
An enterprise e-commerce platform should be split vertically across business capabilities:
1. **Catalog & Search MFE (Team A):** Owns `/products/*`, search autocompletion, facet sidebar, and product detail view.
2. **Cart & Checkout MFE (Team B):** Owns cart drawer, checkout funnel (`/checkout`), payment gateway integration, and shipping address forms.
3. **Account & Orders MFE (Team C):** Owns user authentication, order history (`/orders`), and payment method management.

#### Guest Cart to Authenticated Cart Merge:
1. Guest user adds Item A to cart (stored in `IndexedDB`).
2. User clicks "Sign In" and logs into account.
3. The auth callback fires:
   ```typescript
   async function mergeGuestCartOnLogin(userToken: string) {
     const guestItems = await getGuestCartFromIndexedDB();
     if (guestItems.length > 0) {
       await fetch('/api/cart/merge', {
         method: 'POST',
         headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ items: guestItems }),
       });
       await clearGuestCart();
     }
   }
   ```

---

## 6. 🎯 Interviewer Probes & Senior Follow-ups

### *Interviewer:* "What happens if a user adjusts the price slider rapidly back and forth 20 times? How do you prevent flooding the backend and spamming the browser history?"
*Senior Answer:* "We implement a **two-phase update**: (1) Update local slider UI state immediately on `pointermove` for smooth 60fps rendering. (2) Debounce the URL update and API request by **350ms**. (3) Crucially, we use `history.replaceState()` rather than `pushState()` while sliding, so that sliding does not generate 20 consecutive history entries. Only when the user releases the slider pointer do we push a single history record."

### *Interviewer:* "How do you ensure search engines crawl all facet combinations without generating duplicate content penalties?"
*Senior Answer:* "We configure canonical URL tags (`<link rel="canonical" href="https://store.com/laptops">`) pointing to the base category landing page, stripping filter query parameters from canonical indexing. Furthermore, we instruct bots via `robots.txt` or `<meta name="robots" content="noindex, follow">` on hyper-specific facet combinations (e.g., sorting variations) to conserve crawl budget while allowing link discovery."
