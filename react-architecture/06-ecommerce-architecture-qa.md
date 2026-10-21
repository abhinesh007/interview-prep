# 06 — E-Commerce Architecture (System Design)

> Full RADIO-framework system design for an E-Commerce platform — Product Listing Pages, shopping cart state, multi-step checkout with payments, inventory synchronization, optimistic updates, and conversion-focused performance optimization.

---

## 📑 Table of Contents
1. [System Design: Architect an E-Commerce Platform](#1-system-design-architect-an-e-commerce-platform)
2. [Product Listing Architecture](#2-product-listing-architecture)
3. [Shopping Cart State Management](#3-shopping-cart-state-management)
4. [Checkout Architecture](#4-checkout-architecture)
5. [Cross-Cutting Concerns](#5-cross-cutting-concerns)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. System Design: Architect an E-Commerce Platform

### Q1: System Design: Architect the frontend for an E-Commerce platform supporting product browsing, filtering, cart management, and checkout with payment processing.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `Architecture` `E-Commerce` `Scale` `Conversion`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)

**Functional Requirements:**
- Product Listing Page (PLP) with category filtering, price range, sort, and search
- Product Detail Page (PDP) with image gallery, variant selection (size/color), reviews
- Shopping cart (add/remove/update quantity) accessible from anywhere via a slide-out drawer
- Multi-step checkout: Shipping → Payment → Review → Confirmation
- Guest checkout support (no login required)
- Real-time inventory availability display

**Non-Functional Requirements:**
- LCP < 2.5s on product listing pages (critical for SEO and conversion)
- Time to Interactive < 3s on mobile 4G connections
- Cart interactions feel instant (< 100ms perceived latency via optimistic updates)
- Bundle budget: < 200KB gzipped for initial route
- CLS < 0.1 (no layout shift from lazy-loaded images or dynamic content)
- Checkout form validation feedback < 50ms

#### 2. Architecture & Project Structure (A)

```text
src/
├── features/
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductCatalogPage.tsx    ← Page component (layout + URL params)
│   │   │   ├── ProductGrid.tsx           ← Responsive grid wrapper
│   │   │   ├── ProductCard.tsx           ← Presentational (thumbnail, price, badge)
│   │   │   ├── ProductFilterSidebar.tsx  ← Category, price, brand facets
│   │   │   ├── ProductSortSelector.tsx   ← Sort dropdown
│   │   │   └── ProductDetailPage.tsx     ← PDP with gallery + variant picker
│   │   ├── hooks/
│   │   │   ├── useProducts.ts            ← TanStack Query + URL filters
│   │   │   ├── useProductDetail.ts       ← Single product fetch
│   │   │   └── useProductFilters.ts      ← URL search params wrapper
│   │   ├── api/
│   │   │   └── productsApi.ts            ← API client functions
│   │   └── types.ts
│   │
│   ├── cart/
│   │   ├── components/
│   │   │   ├── CartDrawer.tsx            ← Slide-out panel
│   │   │   ├── CartItem.tsx              ← Row with quantity controls
│   │   │   ├── CartSummary.tsx           ← Subtotal, shipping, discount
│   │   │   └── CartBadge.tsx             ← Navbar item count
│   │   ├── hooks/
│   │   │   └── useCart.ts                ← Cart mutations + optimistic updates
│   │   ├── store/
│   │   │   └── cartStore.ts              ← Zustand store (or Context + useReducer)
│   │   └── types.ts
│   │
│   └── checkout/
│       ├── components/
│       │   ├── CheckoutPage.tsx           ← Multi-step container
│       │   ├── ShippingForm.tsx           ← Address + shipping method
│       │   ├── PaymentForm.tsx            ← Stripe Elements wrapper
│       │   ├── OrderReview.tsx            ← Final review before payment
│       │   └── OrderConfirmation.tsx      ← Success page
│       ├── hooks/
│       │   ├── useCheckout.ts             ← Checkout state machine
│       │   └── usePayment.ts             ← Stripe integration
│       └── types.ts
│
├── shared/
│   ├── ui/                               ← Design system (Button, Input, Modal)
│   ├── hooks/
│   │   └── useDebounce.ts
│   └── lib/
│       ├── apiClient.ts                  ← Axios/Fetch setup with interceptors
│       └── analytics.ts                  ← Tracking hooks
│
└── app/
    ├── routes.tsx                         ← React Router configuration
    └── providers.tsx                      ← QueryClient, CartProvider, AuthProvider
```

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLIENT ARCHITECTURE                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ROUTING LAYER                                  │  │
│  │  /products → ProductCatalogPage   (code-split)                   │  │
│  │  /products/:id → ProductDetailPage (code-split)                  │  │
│  │  /checkout → CheckoutPage          (code-split, auth-gated)      │  │
│  │  /confirmation → OrderConfirmation (code-split)                  │  │
│  └────────┬─────────────────────────────────────────────────────────┘  │
│           │                                                             │
│  ┌────────▼─────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER                                     │  │
│  │                                                                   │  │
│  │  Server State (TanStack Query)        Client State (Zustand)     │  │
│  │  ├── Products / search results        ├── Cart items             │  │
│  │  ├── Product details                  ├── Cart drawer open/close │  │
│  │  ├── Inventory availability           └── UI preferences         │  │
│  │  ├── Order history                                                │  │
│  │  └── User profile                    URL State (React Router)    │  │
│  │                                       ├── Filters, sort, page    │  │
│  │                                       └── Search query           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why Zustand for cart instead of TanStack Query?"  
*Senior Answer:* The cart has **dual citizenship** — it's partly client state (guest users, instant interactions) and partly server state (logged-in users with persistent carts). For guest users, the cart exists only in memory + localStorage — there's no server to query. Zustand handles this cleanly with middleware for localStorage persistence. For logged-in users, cart mutations go through TanStack Query mutations, but the optimistic local state is still managed by Zustand for instant UI feedback. The hybrid pattern: Zustand as the UI source of truth, TanStack Query for server synchronization.

---

## 2. Product Listing Architecture

### Q2: How do you architect a Product Listing Page where URL search params are the single source of truth for filters?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Product Listing` `URL State` `Filters` `TanStack Query`

**Answer:**

```tsx
// --- Custom hook: URL as the canonical filter source ---
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '../shared/hooks/useDebounce';

interface ProductFilters {
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  brands: string[];
  sort: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  page: number;
  query: string;
}

export const useProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: ProductFilters = {
    category: searchParams.get('category') || 'all',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null,
    brands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    sort: (searchParams.get('sort') as ProductFilters['sort']) || 'popular',
    page: Number(searchParams.get('page')) || 1,
    query: searchParams.get('q') || '',
  };

  const updateFilters = (updates: Partial<ProductFilters>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      Object.entries(updates).forEach(([key, value]) => {
        const paramKey = key === 'query' ? 'q' : key;

        if (value === null || value === undefined || value === '' ||
            value === 'all' || (Array.isArray(value) && value.length === 0)) {
          next.delete(paramKey);
        } else if (Array.isArray(value)) {
          next.set(paramKey, value.join(','));
        } else {
          next.set(paramKey, String(value));
        }
      });

      // Reset pagination when filters change (not when page changes)
      if (!('page' in updates)) {
        next.delete('page');
      }

      return next;
    }, { replace: true });  // Replace to avoid flooding browser history
  };

  return { filters, updateFilters };
};

// --- Products query hook ---
export const useProducts = () => {
  const { filters } = useProductFilters();

  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,  // Keep old data while loading new
  });
};

// --- Product Catalog Page ---
const ProductCatalogPage = () => {
  const { filters, updateFilters } = useProductFilters();
  const { data, isLoading, isPlaceholderData } = useProducts();

  return (
    <div className="catalog-layout">
      <aside className="filter-sidebar">
        <ProductFilterSidebar
          filters={filters}
          onChange={updateFilters}
          availableFacets={data?.facets}
        />
      </aside>

      <main className={isPlaceholderData ? 'opacity-60' : ''}>
        <header className="catalog-header">
          <SearchBar
            value={filters.query}
            onChange={(q) => updateFilters({ query: q })}
          />
          <ProductSortSelector
            value={filters.sort}
            onChange={(sort) => updateFilters({ sort })}
          />
          <span>{data?.totalCount} products</span>
        </header>

        {isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : (
          <ProductGrid products={data?.items || []} />
        )}

        <Pagination
          currentPage={filters.page}
          totalPages={data?.totalPages || 1}
          onChange={(page) => updateFilters({ page })}
        />
      </main>
    </div>
  );
};
```

**Key architectural decisions:**
1. **`placeholderData: previousData`** — keeps the old product grid visible (slightly faded) while new filtered results load, avoiding layout shift
2. **`replace: true` in `setSearchParams`** — prevents 20 history entries when rapidly changing filters
3. **Page reset on filter change** — changing category should always start from page 1

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "The search bar triggers a new API call on every keystroke. How do you fix that?"  
*Senior Answer:* Debounce the URL update, not the input display. Keep the input value in local state for instant visual feedback, and debounce the `updateFilters({ query })` call by 300ms:
```tsx
const SearchBar = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebouncedValue(localValue, 300);

  useEffect(() => {
    if (debouncedValue !== value) onChange(debouncedValue);
  }, [debouncedValue]);

  return <input value={localValue} onChange={(e) => setLocalValue(e.target.value)} />;
};
```

---

## 3. Shopping Cart State Management

### Q3: Architect the shopping cart state management with optimistic updates and localStorage persistence for guest users.

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Cart` `State Management` `Optimistic Updates` `Persistence`

**Answer:**

```tsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// --- Types ---
interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
}

interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;

  // Derived (computed in selectors, not stored)
  // totalItems, subtotal, etc.

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      immer((set) => ({
        items: [],
        isDrawerOpen: false,

        addItem: (newItem, quantity = 1) =>
          set((state) => {
            const existing = state.items.find(
              (item) => item.variantId === newItem.variantId
            );
            if (existing) {
              existing.quantity = Math.min(
                existing.quantity + quantity,
                existing.maxStock
              );
            } else {
              state.items.push({ ...newItem, quantity });
            }
            state.isDrawerOpen = true;  // Auto-open drawer on add
          }),

        removeItem: (variantId) =>
          set((state) => {
            state.items = state.items.filter(
              (item) => item.variantId !== variantId
            );
          }),

        updateQuantity: (variantId, quantity) =>
          set((state) => {
            const item = state.items.find((i) => i.variantId === variantId);
            if (item) {
              item.quantity = Math.max(0, Math.min(quantity, item.maxStock));
              if (item.quantity === 0) {
                state.items = state.items.filter(
                  (i) => i.variantId !== variantId
                );
              }
            }
          }),

        clearCart: () => set({ items: [] }),
        toggleDrawer: () =>
          set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
      })),
      {
        name: 'shopping-cart',  // localStorage key
        partialize: (state) => ({ items: state.items }),  // Only persist items, not UI state
      }
    ),
    { name: 'CartStore' }
  )
);

// --- Derived selectors (computed, not stored) ---
export const useCartItemCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

export const useCartSubtotal = () =>
  useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
```

**Optimistic server sync for logged-in users:**
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useAddToCart = () => {
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);

  return useMutation({
    mutationFn: (item: CartItem) => api.post('/cart/items', item),

    onMutate: async (newItem) => {
      // 1. Optimistically update the Zustand store (instant UI feedback)
      addItem(newItem);

      // 2. Cancel any outgoing server cart queries
      await queryClient.cancelQueries({ queryKey: ['server-cart'] });
    },

    onError: (error, newItem) => {
      // 3. Rollback on server error
      useCartStore.getState().removeItem(newItem.variantId);

      toast.error('Failed to add item. Please try again.');
    },

    onSettled: () => {
      // 4. Refetch server cart to reconcile
      queryClient.invalidateQueries({ queryKey: ['server-cart'] });
    },
  });
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "A user adds items as a guest, then logs in. How do you merge the guest cart with their server-side cart?"  
*Senior Answer:* On successful login: (1) Read the guest cart from Zustand/localStorage. (2) Fetch the user's server-side cart. (3) Call a backend `/cart/merge` endpoint that combines both, resolving conflicts (e.g., same product in both carts → sum quantities up to max stock). (4) Replace the local Zustand state with the merged server response. (5) Clear the localStorage guest cart. Edge case: the backend must handle items that are now out of stock since the guest added them — return a list of "removed items" so the UI can show a notification.

---

### Q4: How do you handle real-time inventory availability to prevent users from adding out-of-stock items?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Inventory` `Real-Time` `E-Commerce`

**Answer:**

```tsx
// Hook: Real-time inventory check
const useInventory = (productId: string, variantId: string) => {
  return useQuery({
    queryKey: ['inventory', productId, variantId],
    queryFn: () => fetchInventory(productId, variantId),
    staleTime: 30_000,           // 30 seconds — inventory changes fast
    refetchInterval: 60_000,     // Poll every 60 seconds
    refetchOnWindowFocus: true,  // Recheck when user returns to tab
  });
};

// ProductCard using inventory
const AddToCartButton = ({ product, variant }: Props) => {
  const { data: inventory, isLoading } = useInventory(product.id, variant.id);
  const addToCart = useCartStore((s) => s.addItem);
  const cartQuantity = useCartStore(
    (s) => s.items.find((i) => i.variantId === variant.id)?.quantity ?? 0
  );

  const availableToAdd = (inventory?.available ?? 0) - cartQuantity;
  const isOutOfStock = availableToAdd <= 0;

  return (
    <button
      disabled={isOutOfStock || isLoading}
      onClick={() => {
        if (availableToAdd > 0) {
          addToCart({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            price: variant.price,
            imageUrl: product.thumbnailUrl,
            maxStock: inventory?.available ?? 0,
          });
        }
      }}
    >
      {isLoading ? 'Checking...' :
       isOutOfStock ? 'Out of Stock' :
       inventory?.available <= 3 ? `Add to Cart (Only ${inventory.available} left!)` :
       'Add to Cart'}
    </button>
  );
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Two users are both looking at the last item in stock. Both click 'Add to Cart.' What happens?"  
*Senior Answer:* The client can't prevent this — inventory checks are eventually consistent. The real protection is on the **backend**: the `/cart/add` endpoint must perform an **atomic inventory decrement** (e.g., `UPDATE inventory SET stock = stock - 1 WHERE product_id = ? AND stock > 0`). If the atomic update returns 0 affected rows, the item is out of stock. The frontend shows an error toast: "Sorry, this item just sold out" and invalidates the inventory query. Never trust the client-side inventory count for the final decision.

---

## 4. Checkout Architecture

### Q5: How do you architect a multi-step checkout flow with form validation, payment integration, and idempotency protection?

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Checkout` `Forms` `Payment` `Stripe` `Idempotency`

**Answer:**

**Component Architecture:**
```text
<CheckoutPage>
  ├── <CheckoutProgress currentStep={step} />     ← Visual stepper
  │
  ├── Step 1: <ShippingForm>
  │     ├── <AddressAutocomplete />                ← Google Places API
  │     ├── <AddressFormFields />                  ← Name, street, city, zip, country
  │     └── <ShippingMethodSelector />             ← Standard vs Express
  │
  ├── Step 2: <PaymentForm>
  │     ├── <StripeCardElement />                  ← Stripe.js hosted fields (PCI compliant)
  │     ├── <BillingAddressToggle />               ← "Same as shipping" checkbox
  │     └── <PromoCodeInput />
  │
  ├── Step 3: <OrderReview>
  │     ├── <OrderItemsList />
  │     ├── <PricingBreakdown />                   ← Subtotal, tax, shipping, discount, total
  │     └── <PlaceOrderButton />                   ← Submits payment
  │
  └── <OrderSummarySidebar>                        ← Persistent on all steps
        ├── <CartItemsMini />
        └── <PriceTotal />
```

**Form Management with React Hook Form + Zod:**
```tsx
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema validation
const shippingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  address1: z.string().min(5, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(2, 'Country is required'),
  shippingMethod: z.enum(['standard', 'express', 'overnight']),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

const ShippingForm = ({ onNext }: { onNext: (data: ShippingFormData) => void }) => {
  const methods = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingMethod: 'standard',
      country: 'US',
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onNext)}>
        <FormField name="firstName" label="First Name" />
        <FormField name="lastName" label="Last Name" />
        <FormField name="address1" label="Address" />
        <FormField name="city" label="City" />
        <FormField name="state" label="State" />
        <FormField name="zipCode" label="ZIP Code" />

        <ShippingMethodSelector
          selected={methods.watch('shippingMethod')}
          onChange={(method) => methods.setValue('shippingMethod', method)}
        />

        <button type="submit" disabled={methods.formState.isSubmitting}>
          Continue to Payment
        </button>
      </form>
    </FormProvider>
  );
};
```

**Idempotency Protection (Preventing Double-Charges):**
```tsx
const usePlaceOrder = () => {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [isProcessing, setIsProcessing] = useState(false);

  const placeOrder = useMutation({
    mutationFn: async (orderData: OrderPayload) => {
      return api.post('/orders', orderData, {
        headers: {
          'Idempotency-Key': idempotencyKey,  // Server deduplicates by this key
        },
      });
    },
    onMutate: () => setIsProcessing(true),
    onError: () => setIsProcessing(false),
    // Note: do NOT reset isProcessing on success — prevent re-submission
  });

  return {
    placeOrder: placeOrder.mutateAsync,
    isProcessing,
    isSuccess: placeOrder.isSuccess,
    error: placeOrder.error,
  };
};

// In the UI:
<button
  onClick={() => placeOrder(orderData)}
  disabled={isProcessing}  // Immediately disable on first click
>
  {isProcessing ? <Spinner /> : 'Place Order'}
</button>
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "The user clicks 'Place Order', payment succeeds, but the confirmation page request fails due to a network error. What happens?"  
*Senior Answer:* This is the classic "double-charge fear" scenario. The idempotency key ensures the server won't process the same order twice even if the client retries. For the UX: (1) Show an inline error: "Your order was placed successfully, but we couldn't load the confirmation. Check your email for details." (2) Store the order ID in localStorage/sessionStorage before the API call so you can redirect to `/confirmation/:orderId` on retry. (3) Wrap the confirmation page in an Error Boundary that shows order status from the server rather than relying on the mutation response.

---

## 5. Cross-Cutting Concerns

### Q6: How do you implement analytics event tracking without polluting component code?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Analytics` `Tracking` `Clean Architecture`

**Answer:**

Abstract tracking into custom hooks and middleware layers so components stay clean of analytics noise:

```tsx
// --- Analytics abstraction layer ---
type EcommerceEvent =
  | { event: 'view_item'; data: { productId: string; price: number; category: string } }
  | { event: 'add_to_cart'; data: { productId: string; quantity: number; value: number } }
  | { event: 'begin_checkout'; data: { value: number; itemCount: number } }
  | { event: 'purchase'; data: { orderId: string; value: number; currency: string } };

const trackEvent = (event: EcommerceEvent) => {
  // Google Analytics 4
  window.gtag?.('event', event.event, event.data);

  // Segment / Mixpanel
  window.analytics?.track(event.event, event.data);

  // Internal analytics API
  navigator.sendBeacon('/api/analytics', JSON.stringify(event));
};

// --- Custom hook for automatic impression tracking ---
const useTrackImpression = (event: EcommerceEvent) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!ref.current || hasTracked.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTracked.current) {
          trackEvent(event);
          hasTracked.current = true;
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [event]);

  return ref;
};

// --- Clean component usage ---
const ProductCard = ({ product }: { product: Product }) => {
  const trackRef = useTrackImpression({
    event: 'view_item',
    data: { productId: product.id, price: product.price, category: product.category },
  });

  return (
    <div ref={trackRef} className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <span>${product.price}</span>
    </div>
  );
};
```

**Zustand middleware for cart analytics:**
```tsx
// Middleware that automatically tracks cart events
const analyticsMiddleware = (config) => (set, get, api) =>
  config(
    (args) => {
      const prevItems = get().items;
      set(args);
      const nextItems = get().items;

      // Detect adds
      const newItems = nextItems.filter(
        (item) => !prevItems.find((p) => p.variantId === item.variantId)
      );
      newItems.forEach((item) =>
        trackEvent({
          event: 'add_to_cart',
          data: { productId: item.productId, quantity: item.quantity, value: item.price * item.quantity },
        })
      );
    },
    get,
    api
  );
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you test components that have analytics tracking without actually sending events?"  
*Senior Answer:* Three approaches: (1) **Dependency injection** — pass the `trackEvent` function as a prop or via context, and inject a mock in tests. (2) **Module mocking** — mock the analytics module in test setup (`vi.mock('./analytics')`). (3) **Event bus pattern** — dispatch analytics as custom events, and have a separate listener module that forwards them to GA/Segment. In tests, you can assert on the dispatched events without any network calls.

---

### Q7: How do you handle image optimization for product grids to ensure fast LCP and zero CLS?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical  
**Tags:** `Images` `Performance` `LCP` `CLS`

**Answer:**

```tsx
// Optimized product image component
const ProductImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}) => (
  <div
    className="product-image-wrapper"
    style={{ aspectRatio: `${width} / ${height}` }}  // Prevents CLS
  >
    <img
      src={`${src}?w=400&q=80&f=webp`}             // CDN image optimization
      srcSet={`
        ${src}?w=200&q=80&f=webp 200w,
        ${src}?w=400&q=80&f=webp 400w,
        ${src}?w=600&q=80&f=webp 600w
      `}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}          // Above-fold images load eagerly
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  </div>
);

// Usage in ProductGrid
const ProductGrid = ({ products }: { products: Product[] }) => (
  <div className="product-grid">
    {products.map((product, index) => (
      <ProductCard key={product.id} product={product}>
        <ProductImage
          src={product.thumbnailUrl}
          alt={product.name}
          width={400}
          height={400}
          priority={index < 4}  // First row loads eagerly (above the fold)
        />
      </ProductCard>
    ))}
  </div>
);
```

**Key techniques:**
1. **`aspectRatio` CSS** — reserves space before image loads, preventing CLS
2. **`srcSet` + `sizes`** — browser picks the optimal resolution for the device
3. **`loading="lazy"`** — defers off-screen images
4. **`fetchPriority="high"`** — tells the browser to prioritize above-fold images
5. **CDN query params** — request WebP format and specific dimensions

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why not use `loading='lazy'` for all images?"  
*Senior Answer:* Lazy loading the first visible row of product images hurts LCP. The browser delays fetching them until they enter the viewport, adding ~200-500ms to LCP. Above-the-fold images (typically the first 4-8 products) should use `loading="eager"` with `fetchPriority="high"` to start loading immediately during HTML parsing.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q8: Why should checkout routes be protected even for guest checkout?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Route Protection`

**Answer:**
Even without authentication, the checkout route should verify that the cart is not empty. Redirecting to the cart page when someone navigates to `/checkout` with an empty cart prevents confusing empty states and potential form submission errors. For authenticated checkout, also verify the session hasn't expired before showing payment forms.

---

### Q9: A customer reports that their cart was empty after refreshing the page. What went wrong?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Persistence` `Cart`

**Answer:**
The cart state wasn't persisted. If using Zustand without the `persist` middleware, or React Context without `localStorage` sync, all state is lost on page refresh. Fix: use Zustand's `persist` middleware with `localStorage`. Gotcha: the `persist` middleware hydrates asynchronously — wrap the cart UI in a check for hydration completion to prevent a brief flash of empty cart:
```tsx
const { items, _hasHydrated } = useCartStore();
if (!_hasHydrated) return <CartSkeleton />;
```

---

### Q10: What's the difference between controlled and uncontrolled inputs, and why does React Hook Form prefer uncontrolled?

**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Forms` `Performance`

**Answer:**
- **Controlled:** React state drives the input value (`value={state}` + `onChange`). Each keystroke triggers a state update → re-render of the component.
- **Uncontrolled:** The DOM owns the value. React reads it via `ref` when needed (on submit or validation).
- **React Hook Form** uses uncontrolled inputs by default because checkout forms with 15+ fields would trigger 15+ re-renders per keystroke with controlled inputs. Uncontrolled inputs only trigger re-renders when validation states change (error messages appearing/clearing).

---

### Q11: How do you prevent layout shift (CLS) when a "Sale" badge appears on some product cards but not others?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `CLS` `CSS`

**Answer:**
Reserve space for the badge in all cards, even when it's not shown. Use `visibility: hidden` or a transparent placeholder instead of conditional rendering (`{isSale && <Badge />}`). Alternatively, use absolute positioning so the badge overlays the card without affecting layout flow:
```css
.product-card {
  position: relative;
}
.sale-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  /* Does not affect card layout */
}
```

---

### Q12: You need to display "Only 3 left!" urgency text. Should this come from the client cache or a real-time API?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Inventory` `UX`

**Answer:**
**Real-time API**, but with nuance. The exact stock count for urgency messaging (showing "Only X left!") should be fetched fresh with a short `staleTime` (30s). However, don't show exact counts for high-stock items — only show urgency when stock < 5. For the "Add to Cart" button's disabled state, use a slightly longer cache (60s) since the definitive stock check happens server-side during the actual add-to-cart mutation. Never show live-updating stock counters that change while the user is looking — it creates anxiety and reduces conversion.
