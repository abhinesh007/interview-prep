# 04 — Performance at Scale

> Re-render prevention hierarchy, virtualization, bundle optimization, React Compiler (React 19+), Web Vitals, and profiling strategies for large-scale React applications.

---

## 📑 Table of Contents
1. [Re-Render Prevention Hierarchy](#1-re-render-prevention-hierarchy)
2. [Virtualization & Windowing](#2-virtualization--windowing)
3. [Bundle Optimization](#3-bundle-optimization)
4. [React Compiler & React 19+](#4-react-compiler--react-19)
5. [Web Vitals & Profiling](#5-web-vitals--profiling)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Re-Render Prevention Hierarchy

### Q1: What is the re-render prevention hierarchy, and why is structural optimization more effective than memoization?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `Re-renders` `Performance` `Composition` `Memoization`

**Answer:**

The hierarchy of re-render prevention techniques, ordered from **most to least effective**:

```text
┌─────────────────────────────────────────────────────────┐
│  1. STATE COLOCATION (Move state down)                   │
│     Most effective — zero overhead, just better design   │
├─────────────────────────────────────────────────────────┤
│  2. COMPONENT COMPOSITION (children pattern)             │
│     Structural — prevents re-renders by design           │
├─────────────────────────────────────────────────────────┤
│  3. React.memo (Component-level memoization)             │
│     Opt-in — adds comparison cost per render             │
├─────────────────────────────────────────────────────────┤
│  4. useMemo / useCallback (Value-level memoization)      │
│     Granular — prevents expensive recomputations         │
├─────────────────────────────────────────────────────────┤
│  5. External store with selectors (Zustand)              │
│     For cross-cutting state with fine-grained subscriptions│
└─────────────────────────────────────────────────────────┘
```

**1. State Colocation:**
```tsx
// ❌ State too high — entire page re-renders on every tooltip toggle
const ProductPage = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  return (
    <div>
      <ExpensiveProductGallery />          {/* Re-renders unnecessarily! */}
      <ExpensiveRecommendations />         {/* Re-renders unnecessarily! */}
      <PriceTag onHover={() => setIsTooltipOpen(true)} />
      {isTooltipOpen && <Tooltip />}
    </div>
  );
};

// ✅ State colocated — only PriceSection re-renders
const ProductPage = () => (
  <div>
    <ExpensiveProductGallery />            {/* Never re-renders */}
    <ExpensiveRecommendations />           {/* Never re-renders */}
    <PriceSection />                       {/* Self-contained state */}
  </div>
);

const PriceSection = () => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  return (
    <>
      <PriceTag onHover={() => setIsTooltipOpen(true)} />
      {isTooltipOpen && <Tooltip />}
    </>
  );
};
```

**2. Component Composition (children pattern):**
```tsx
// ❌ Parent state change re-renders the heavy child
const ScrollTracker = () => {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div>
      <header style={{ opacity: 1 - scrollY / 300 }}>Header</header>
      <ExpensiveDataGrid />  {/* Re-renders 60x/sec during scroll! */}
    </div>
  );
};

// ✅ Children pattern — ExpensiveDataGrid is passed as children
// It was created BEFORE ScrollTracker rendered, so it's unaffected
const ScrollTracker = ({ children }: { children: ReactNode }) => {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div>
      <header style={{ opacity: 1 - scrollY / 300 }}>Header</header>
      {children}  {/* Pre-created — NOT affected by scrollY changes */}
    </div>
  );
};

// Usage
<ScrollTracker>
  <ExpensiveDataGrid />  {/* Only created once, never re-renders from scroll */}
</ScrollTracker>
```

**Why this works:** `children` is a prop passed from the parent of `ScrollTracker`. When `scrollY` changes, React re-renders `ScrollTracker`, but `children` is a prop reference that hasn't changed — so React skips re-rendering it.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If the children pattern is so effective, why do we still need `React.memo`?"  
*Senior Answer:* The children pattern only works when the state-changing component and the expensive component have a **parent-child composition relationship**. If the expensive component receives **props that come from the state-changing component**, the children pattern doesn't help — you need `React.memo` to prevent re-renders when the relevant props haven't changed. Example: a list item component that receives `isSelected` from a parent store — `React.memo` is needed to prevent all 1000 items from re-rendering when one item is selected.

---

### Q2: Demonstrate a real-world scenario where `React.memo` fails silently and how to fix it.

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `React.memo` `Reference Equality` `Performance`

**Answer:**

```tsx
// ❌ React.memo is USELESS here — re-renders every time
const MemoizedItem = React.memo(({ item, onSelect, style }: ItemProps) => {
  console.log(`Rendering item ${item.id}`);
  return (
    <div style={style} onClick={() => onSelect(item)}>
      {item.name}
    </div>
  );
});

const ItemList = ({ items }: { items: Item[] }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return items.map((item) => (
    <MemoizedItem
      key={item.id}
      item={item}
      onSelect={(item) => setSelectedId(item.id)}  // ❌ NEW FUNCTION every render
      style={{ color: selectedId === item.id ? 'blue' : 'black' }}  // ❌ NEW OBJECT every render
    />
  ));
};

// ✅ FIXED: Stable references
const ItemList = ({ items }: { items: Item[] }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback((item: Item) => {
    setSelectedId(item.id);
  }, []);

  return items.map((item) => (
    <MemoizedItem
      key={item.id}
      item={item}
      onSelect={handleSelect}                       // ✅ Stable reference
      isSelected={selectedId === item.id}            // ✅ Primitive value, not object
    />
  ));
};

// MemoizedItem uses isSelected boolean instead of style object
const MemoizedItem = React.memo(({ item, onSelect, isSelected }: ItemProps) => (
  <div
    className={isSelected ? 'item-selected' : 'item'}  // CSS class, not style object
    onClick={() => onSelect(item)}
  >
    {item.name}
  </div>
));
```

**The three `React.memo` killers:**
1. **Inline functions:** `onClick={() => ...}` creates a new function reference every render
2. **Inline objects/arrays:** `style={{ ... }}` or `data={[1, 2, 3]}` creates new references
3. **Unstable children:** `<MemoizedComponent><span>text</span></MemoizedComponent>` — the JSX `<span>` is a new object each render

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When does `useMemo` actually HURT performance?"  
*Senior Answer:* When the memoized computation is trivially cheap (e.g., string concatenation, adding two numbers, checking a boolean). `useMemo` has overhead: it stores the previous value, stores the dependency array, and runs a shallow comparison on every render. If the comparison cost exceeds the computation cost, `useMemo` is a net negative. Profile first — only memoize computations that show up in the React Profiler.

---

## 2. Virtualization & Windowing

### Q3: When should you virtualize a list, and how do you implement it with dynamic row heights?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Virtualization` `react-virtual` `Performance`

**Answer:**

**When to virtualize:**
- More than ~100 items in a scrollable list
- Each item has significant DOM complexity (images, nested elements)
- Users report scroll jank or high memory usage

**When NOT to virtualize:**
- Less than ~50 simple items
- Items need to be fully in the DOM for SEO (SSR/SSG instead)
- Print-friendly pages

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps {
  items: ChatMessage[];
}

const VirtualChatList = ({ items }: VirtualListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,  // Estimated row height in pixels
    overscan: 5,              // Render 5 extra items above/below viewport
    measureElement: (el) => el.getBoundingClientRect().height,  // Dynamic measurement
  });

  return (
    <div
      ref={parentRef}
      style={{ height: '600px', overflow: 'auto' }}
    >
      {/* Total scrollable height (spacer div) */}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}  // Measure actual height
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ChatBubble message={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

```text
Without virtualization (1000 chat messages):
├── DOM nodes: ~15,000 (complex message components)
├── Memory: ~200MB
├── Scroll FPS: 20-30fps (janky)

With virtualization (1000 messages, viewport shows ~8):
├── DOM nodes: ~130 (8 visible + 5 overscan above + 5 below)
├── Memory: ~30MB
├── Scroll FPS: 60fps (smooth)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you handle virtualization when items can change height (e.g., expanding/collapsing accordion in a list)?"  
*Senior Answer:* Use `measureElement` callback from `@tanstack/react-virtual` — it re-measures the element when its content changes. For accordion toggles, call `virtualizer.measure()` after the expansion animation completes. Key detail: the `estimateSize` function should return a reasonable average height. If estimates are wildly off, the scrollbar will "jump" as items are measured. For chat apps where messages vary from 40px to 400px, use the average message height from your analytics data.

---

## 3. Bundle Optimization

### Q4: Walk me through how you'd reduce a 2.5MB JavaScript bundle to under 500KB.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `Bundle Size` `Code Splitting` `Tree Shaking`

**Answer:**

**Step 1: Analyze the current bundle**
```bash
# For Vite
npx vite-bundle-visualizer

# For Webpack
npx webpack-bundle-analyzer stats.json
```

**Step 2: Systematic reduction strategy:**

```text
┌───────────────────────────────────────────────────────────┐
│  BUNDLE REDUCTION CHECKLIST                               │
│                                                           │
│  1. Route-based code splitting     (~40% reduction)       │
│  2. Import optimization            (~20% reduction)       │
│  3. Tree shaking audit             (~10% reduction)       │
│  4. Dependency audit & replacement (~15% reduction)       │
│  5. Dynamic imports for heavy libs (~10% reduction)       │
│  6. Dead code elimination          (~5% reduction)        │
└───────────────────────────────────────────────────────────┘
```

**1. Route-based code splitting:**
```tsx
// ❌ Everything loaded upfront
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { AnalyticsPage } from './pages/Analytics';

// ✅ Lazy-loaded per route
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));

<Routes>
  <Route path="/dashboard" element={
    <Suspense fallback={<PageSkeleton />}>
      <DashboardPage />
    </Suspense>
  } />
  <Route path="/settings" element={
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage />
    </Suspense>
  } />
</Routes>
```

**2. Import optimization:**
```tsx
// ❌ Imports entire lodash (140KB)
import { debounce } from 'lodash';

// ✅ Cherry-pick import (4KB)
import debounce from 'lodash/debounce';

// ❌ Imports all icons (300KB+)
import { FaHome, FaUser } from 'react-icons/fa';

// ✅ Individual icon import (~1KB each)
import FaHome from 'react-icons/fa/FaHome';

// ❌ Imports all of date-fns (75KB)
import { format, parseISO } from 'date-fns';

// ✅ Already tree-shakeable, but verify bundler config
```

**3. Dependency audit:**
```bash
# Find large dependencies
npx depcheck
npx bundlephobia-cli <package-name>
```

| Heavy Library | Size | Lightweight Alternative | Size |
|---|---|---|---|
| `moment.js` | 72KB | `dayjs` | 2KB |
| `lodash` (full) | 140KB | `lodash-es` (tree-shakeable) | ~4KB used |
| `axios` | 14KB | `ky` or native `fetch` | 0-3KB |
| `chart.js` | 65KB | `recharts` (modular) | ~25KB used |

**4. Dynamic imports for conditional features:**
```tsx
// Only load PDF library when user clicks "Export"
const handleExport = async () => {
  const { jsPDF } = await import('jspdf');  // 200KB loaded on-demand
  const doc = new jsPDF();
  doc.text('Report', 10, 10);
  doc.save('report.pdf');
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you prevent bundle size regressions in CI/CD?"  
*Senior Answer:* Add **bundle size budgets** to CI: (1) Use `bundlesize` or `size-limit` npm packages that fail the build if any chunk exceeds a threshold. (2) Add a GitHub Action that comments on PRs with a bundle size diff. (3) Configure Lighthouse CI with a performance budget. Example `size-limit` config:
```json
[
  { "path": "dist/assets/index-*.js", "limit": "200 KB" },
  { "path": "dist/assets/*.js", "limit": "500 KB" }
]
```

---

## 4. React Compiler & React 19+

### Q5: How does the React Compiler (React 19+) change your optimization strategy?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `React Compiler` `React 19` `Memoization` `Performance`

**Answer:**

The React Compiler automatically applies memoization at compile time, eliminating the need for most manual `useMemo`, `useCallback`, and `React.memo` calls.

```text
┌─────────────────────────────────────────────────────────┐
│  BEFORE React Compiler (Manual Memoization)              │
│                                                          │
│  Developer must:                                         │
│  • Wrap components in React.memo()                       │
│  • Wrap callbacks in useCallback()                       │
│  • Wrap computations in useMemo()                        │
│  • Get dependency arrays right (or cause bugs)           │
│                                                          │
│  Common mistakes:                                        │
│  • Missing dependencies → stale closures                 │
│  • Over-memoization → wasted memory                      │
│  • Forgetting memo → unnecessary re-renders              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  AFTER React Compiler (Automatic Memoization)            │
│                                                          │
│  Compiler automatically:                                 │
│  • Determines which values need memoization              │
│  • Inserts fine-grained caching at the expression level  │
│  • Handles dependency tracking without arrays            │
│  • Never has stale closure bugs (compiler-generated)     │
│                                                          │
│  Developer focuses on:                                   │
│  • Clean component architecture                          │
│  • State colocation                                      │
│  • Structural optimization (children pattern)            │
└─────────────────────────────────────────────────────────┘
```

**What the compiler handles automatically:**
```tsx
// Developer writes (no manual memo):
const ProductCard = ({ product, onSelect }: Props) => {
  const formattedPrice = formatCurrency(product.price);
  const discountLabel = product.discount > 0 
    ? `${product.discount}% off` 
    : null;

  return (
    <div onClick={() => onSelect(product.id)}>
      <h3>{product.name}</h3>
      <span>{formattedPrice}</span>
      {discountLabel && <Badge>{discountLabel}</Badge>}
    </div>
  );
};

// Compiler transforms to (conceptually):
const ProductCard = ({ product, onSelect }: Props) => {
  const formattedPrice = $cache(formatCurrency, [product.price]);
  const discountLabel = $cache(
    () => product.discount > 0 ? `${product.discount}% off` : null,
    [product.discount]
  );
  const handleClick = $cache(() => onSelect(product.id), [onSelect, product.id]);

  return $cache(
    () => (
      <div onClick={handleClick}>
        <h3>{product.name}</h3>
        <span>{formattedPrice}</span>
        {discountLabel && <Badge>{discountLabel}</Badge>}
      </div>
    ),
    [handleClick, product.name, formattedPrice, discountLabel]
  );
};
```

**What you still need to do manually:**
1. **State colocation** — the compiler can't move state to a better location
2. **Component composition** — the children pattern is still valuable
3. **Virtualization** — can't auto-virtualize long lists
4. **Code splitting** — can't auto-split bundles
5. **Web Workers** — can't auto-offload heavy computation

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Should you remove all existing `useMemo` and `useCallback` calls when adopting the React Compiler?"  
*Senior Answer:* The compiler is designed to **coexist** with manual memoization. If the compiler detects that a value is already memoized, it won't add redundant caching. You can gradually adopt the compiler without removing existing hooks. However, new code should skip manual memoization and let the compiler handle it. Over time, you can remove manual memos during cleanup passes. The React team provides an ESLint plugin (`eslint-plugin-react-compiler`) that surfaces components the compiler can't optimize, requiring manual attention.

---

## 5. Web Vitals & Profiling

### Q6: How do you systematically diagnose and fix Core Web Vitals issues in a React application?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Web Vitals` `LCP` `INP` `CLS` `Performance`

**Answer:**

```text
┌─────────────────────────────────────────────────────────────┐
│  CORE WEB VITALS — THE THREE PILLARS                         │
│                                                              │
│  LCP (Largest Contentful Paint) — Loading performance        │
│  Target: < 2.5 seconds                                      │
│  What: Time until the largest visible element renders         │
│                                                              │
│  INP (Interaction to Next Paint) — Responsiveness            │
│  Target: < 200 milliseconds                                  │
│  What: Time from user input to visual response               │
│                                                              │
│  CLS (Cumulative Layout Shift) — Visual stability            │
│  Target: < 0.1                                               │
│  What: How much the page layout shifts unexpectedly          │
└─────────────────────────────────────────────────────────────┘
```

**LCP Diagnosis & Fixes:**
```text
Common LCP killers in React apps:

1. Hero image without priority loading
   Fix: <img fetchPriority="high" loading="eager" />

2. Heavy JavaScript blocking rendering
   Fix: Code splitting, defer non-critical scripts

3. Font loading causing invisible text (FOIT)
   Fix: font-display: swap in @font-face

4. Client-side rendering (CSR) waterfall
   Fix: SSR/SSG with streaming (Next.js/Remix)

5. Render-blocking CSS from large design system imports
   Fix: Critical CSS inlining, lazy-load non-critical styles
```

**INP Diagnosis & Fixes:**
```tsx
// ❌ Heavy computation blocks the main thread during click
const handleFilter = (query: string) => {
  const filtered = products        // 50,000 products
    .filter(p => p.name.includes(query))
    .sort((a, b) => a.price - b.price)
    .map(p => ({ ...p, formatted: formatProduct(p) }));
  setFilteredProducts(filtered);   // Blocks for 200ms+
};

// ✅ Offload to Web Worker
const filterWorker = new Worker(new URL('./filterWorker.ts', import.meta.url));

const handleFilter = (query: string) => {
  startTransition(() => {  // Mark as non-urgent
    filterWorker.postMessage({ query, products });
  });
};

filterWorker.onmessage = (event) => {
  setFilteredProducts(event.data);
};
```

**CLS Diagnosis & Fixes:**
```tsx
// ❌ CLS: Image loads and shifts content
<img src={product.image} alt={product.name} />

// ✅ No CLS: Explicit dimensions reserve space
<img
  src={product.image}
  alt={product.name}
  width={400}
  height={300}
  style={{ aspectRatio: '4/3' }}
/>

// ❌ CLS: Dynamic banner insertion pushes content down
{showBanner && <PromoBanner />}

// ✅ No CLS: Reserved space or absolute positioning
<div style={{ minHeight: showBanner ? 'auto' : 0 }}>
  {showBanner && <PromoBanner />}
</div>
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What's the difference between lab metrics (Lighthouse) and field metrics (CrUX)?"  
*Senior Answer:* Lab metrics (Lighthouse) run on a controlled machine with simulated throttling — they show the **potential** performance. Field metrics (Chrome User Experience Report / CrUX) show **actual user experience** across real devices and networks. A page might score 95 in Lighthouse but have poor CrUX data because real users have slower devices or flaky connections. Always optimize for field metrics — they're what Google uses for search ranking.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: When does `useMemo` actually HURT performance?

**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `QuickFire` `useMemo` `Performance`

**Answer:**
When the memoized computation is cheaper than the comparison check. `useMemo` stores the previous result and dependency array, then runs `Object.is` comparison on every render. For trivial computations (boolean checks, string concatenation, simple arithmetic), the overhead of storing, comparing, and garbage-collecting cached values exceeds the computation cost itself.

---

### Q8: Why does an inline `style={{}}` object break `React.memo`?

**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `QuickFire` `React.memo` `Gotcha`

**Answer:**
`style={{ color: 'red' }}` creates a new object on every render. `React.memo` uses `Object.is` for shallow comparison, which checks reference equality. Since the new object has a different reference, memo considers props changed and re-renders. Fix: use CSS classes, extract the style to a `useMemo`, or define it as a module-level constant.

---

### Q9: You see 500ms of "blank screen" before your React app renders. What's happening?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `CSR` `First Paint`

**Answer:**
Classic Client-Side Rendering (CSR) bottleneck. The browser receives an empty HTML shell, downloads the JS bundle, parses and executes it, then React renders the first component. The entire time is blank. Solutions: (1) SSR/SSG for instant HTML. (2) Add a static loading skeleton directly in `index.html` (before React mounts). (3) Reduce JS bundle size with code splitting. (4) Use `<link rel="preload">` for critical JS chunks.

---

### Q10: How do you profile React re-renders in production without the React DevTools?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `Profiling` `Production`

**Answer:**
Use the **React Profiler API** (programmatic):
```tsx
import { Profiler } from 'react';

const onRender = (id, phase, actualDuration) => {
  if (actualDuration > 16) {  // Longer than one frame (16ms)
    analytics.track('slow_render', { id, phase, duration: actualDuration });
  }
};

<Profiler id="ProductGrid" onRender={onRender}>
  <ProductGrid />
</Profiler>
```

Also: Chrome Performance tab → record → look for long "Render" tasks. The `?react_perf` query param (in development builds) adds User Timing marks visible in the Performance timeline.

---

### Q11: What's the performance difference between `key={index}` and `key={item.id}` in a list?

**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Keys` `Reconciliation`

**Answer:**
- `key={index}` — if items are reordered, added, or removed, React thinks existing components moved and may reuse stale state/DOM. A text input in row 2 would keep row 2's text even if the data at index 2 changed.
- `key={item.id}` — React correctly identifies which items moved, were added, or removed. Each component maintains its own state and the DOM is efficiently patched.

**Rule:** Always use a stable, unique identifier as the key. Only use `index` for static, non-reorderable lists (like rendering a fixed menu).

---

### Q12: How does `startTransition` help with performance?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Concurrent React` `startTransition`

**Answer:**
`startTransition` marks a state update as **non-urgent**. React can interrupt the rendering of transition updates to handle more urgent updates (like typing in an input). Without it, a heavy re-render (like filtering 10,000 items) blocks the input from updating, causing "input lag."

```tsx
const [query, setQuery] = useState('');
const [filteredResults, setFilteredResults] = useState(allItems);

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setQuery(e.target.value);           // Urgent — update input immediately
  startTransition(() => {
    setFilteredResults(              // Non-urgent — can be interrupted
      allItems.filter(i => i.name.includes(e.target.value))
    );
  });
};
```

The input stays responsive even if filtering 50,000 items takes 300ms.
