# 17 — Practical Coding, Polyfills, Gotchas & Architecture Scenarios

> The capstone module: handcrafting high-frequency polyfills from scratch (`bind`, `Promise`, `deepClone`, `flat`, `reduce`, `debounce`, `throttle`, `EventEmitter`), a 25-puzzle Output Prediction Marathon, production bug-hunting drills, and full-scale RADIO Frontend System Design scenarios.

---

## 📑 Table of Contents
1. [The Essential Polyfill Suite](#1-the-essential-polyfill-suite)
2. [The 25 Output Prediction & Gotchas Marathon](#2-the-25-output-prediction--gotchas-marathon)
3. [Production Debug & Bug-Hunting Drills](#3-production-debug--bug-hunting-drills)
4. [Frontend System Design & Architecture (RADIO Framework)](#4-frontend-system-design--architecture-radio-framework)

---

## 1. The Essential Polyfill Suite

### Q1: Implement `Function.prototype.bind()` from scratch, supporting partial application and `new` operator delegation.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Polyfill]` `[Bind]` `[Prototypes]` `[New-Operator]`

**Answer:**
```javascript
Function.prototype.myBind = function(thisArg, ...boundArgs) {
  if (typeof this !== "function") {
    throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
  }

  const originalFn = this;

  function boundFunction(...callArgs) {
    // When invoked with 'new', 'this' is an instance of boundFunction!
    // In that case, ignore thisArg and use the newly allocated 'this':
    const isNew = this instanceof boundFunction;
    const context = isNew ? this : thisArg;

    return originalFn.apply(context, [...boundArgs, ...callArgs]);
  }

  // Preserve prototype chain for 'new' instantiated objects:
  if (originalFn.prototype) {
    boundFunction.prototype = Object.create(originalFn.prototype);
  }

  return boundFunction;
};

// Verification:
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const YPoint = Point.myBind(null, 10);
const p = new YPoint(20);
console.log(p.x, p.y); // 10, 20 (instanceof Point is true!)
```

---

### Q2: Implement a production-grade `deepClone(obj)` supporting circular references, Maps, Sets, Dates, and RegEx.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Polyfill]` `[Deep-Clone]` `[WeakMap]` `[Recursion]`

**Answer:**
```javascript
function deepClone(value, hash = new WeakMap()) {
  // 1. Return primitives and functions directly
  if (typeof value !== "object" || value === null) {
    return value;
  }

  // 2. Handle Dates and RegExp
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  // 3. Prevent Infinite Loops on Circular References using WeakMap
  if (hash.has(value)) {
    return hash.get(value);
  }

  // 4. Handle Map
  if (value instanceof Map) {
    const copyMap = new Map();
    hash.set(value, copyMap);
    value.forEach((v, k) => copyMap.set(deepClone(k, hash), deepClone(v, hash)));
    return copyMap;
  }

  // 5. Handle Set
  if (value instanceof Set) {
    const copySet = new Set();
    hash.set(value, copySet);
    value.forEach(v => copySet.add(deepClone(v, hash)));
    return copySet;
  }

  // 6. Handle Arrays and Plain Objects preserving prototype
  const prototype = Object.getPrototypeOf(value);
  const result = Array.isArray(value) ? [] : Object.create(prototype);
  hash.set(value, result);

  // Reflect.ownKeys grabs both string and Symbol keys!
  for (const key of Reflect.ownKeys(value)) {
    result[key] = deepClone(value[key], hash);
  }

  return result;
}
```

---

### Q3: Implement `debounce` and `throttle` from scratch with `{ leading, trailing }` and `.cancel()`.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Debounce]` `[Throttle]` `[Timers]` `[Performance]`

**Answer:**

```javascript
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    if (trailing && lastArgs) {
      fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    const callNow = leading && !timerId;

    if (timerId) clearTimeout(timerId);

    timerId = setTimeout(() => {
      timerId = null;
      invoke();
    }, wait);

    if (callNow) {
      fn.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  }

  debounced.cancel = () => {
    if (timerId) clearTimeout(timerId);
    timerId = null;
    lastArgs = lastThis = null;
  };

  return debounced;
}

function throttle(fn, wait) {
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;

  return function throttled(...args) {
    if (!timerId) {
      fn.apply(this, args);
      timerId = setTimeout(() => {
        timerId = null;
        if (lastArgs) {
          throttled.apply(lastThis, lastArgs);
          lastArgs = lastThis = null;
        }
      }, wait);
    } else {
      lastArgs = args;
      lastThis = this;
    }
  };
}
```

---

## 2. The 25 Output Prediction & Gotchas Marathon

### Puzzles 1–5: Engine, Scope & Event Loop
```javascript
// Puzzle 1: Default Parameter Scope
let a = 1;
function f(a, b = () => a) {
  var a = 2;
  console.log(a);
  console.log(b());
}
f(10);
// Output: 2, 10 (b captured parameter 'a' before body 'var a = 2')

// Puzzle 2: Asynchronous Microtask Interleaving
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => {
  console.log('C');
  queueMicrotask(() => console.log('D'));
});
console.log('E');
// Output: A, E, C, D, B

// Puzzle 3: Destructuring Default with null vs undefined
const { x = 1, y = 2 } = { x: null, y: undefined };
console.log(x, y);
// Output: null, 2 (Default value triggers ONLY on undefined!)

// Puzzle 4: Global Regex Stateful Pointer
const r = /foo/g;
console.log(r.test("foo"), r.test("foo"));
// Output: true, false (lastIndex toggling!)

// Puzzle 5: Finally Block Return Hijack
function getVal() {
  try { throw new Error(); }
  finally { return "hijacked"; }
}
console.log(getVal());
// Output: "hijacked" (Silently suppressed error!)
```

### Puzzles 6–10: Types, Coercion & Arrays
```javascript
// Puzzle 6: Sparse Array Holes
const arr = Array(3);
arr[1] = "present";
console.log(arr.map(x => x || "missing"));
// Output: [empty, "present", empty] (Holes are skipped by map!)

// Puzzle 7: Array Sort String Coercion
console.log([10, 2, 5].sort());
// Output: [10, 2, 5] (Sorted alphabetically as '10' < '2')

// Puzzle 8: Object Key Coercion
const obj = {};
obj[{}] = "first";
obj[{}] = "second";
console.log(obj[{ binding: 1 }]);
// Output: "second" (All converted to string key "[object Object]")

// Puzzle 9: Scientific Notation ParseInt
console.log(parseInt(0.0000005));
// Output: 5 (String(0.0000005) is "5e-7")

// Puzzle 10: Math.max Empty Identity Element
console.log(Math.max() < Math.min());
// Output: true (-Infinity < Infinity)
```

---

## 3. Production Debug & Bug-Hunting Drills

### Drill 1: Typeahead Search Race Condition
**Bug Scenario:** A user rapidly types "react" into a search box. The request for `"re"` takes 800ms due to network latency, while the subsequent request for `"react"` resolves in 100ms. The UI displays results for `"re"` because it arrived last!

```javascript
// ✅ PRODUCTION FIX USING ABORTCONTROLLER & TOKEN SEQUENCE
class SearchService {
  #currentController = null;

  async search(query) {
    // 1. Abort any previous pending request!
    if (this.#currentController) {
      this.#currentController.abort();
    }

    this.#currentController = new AbortController();

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: this.#currentController.signal
      });
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Stale request ignored cleanly.");
        return null;
      }
      throw err;
    }
  }
}
```

---

## 4. Frontend System Design & Architecture (RADIO Framework)

### Scenario: Ultra-High-Performance Virtualized Windowing List (Rendering 100,000 Items at 60fps)

```text
┌────────────────────────────────────────────────────────┐
│               Virtualized Windowing Architecture       │
├────────────────────────────────────────────────────────┤
│ Total Scroll Container Height = 100,000 * 50px = 5,000,000px
│ Viewport Height = 600px (~12 visible items)            │
│ Buffer = 4 items above + 4 items below                 │
│ Total DOM Nodes Allocated: ~20 DOM Nodes! (Never 100,000!)
│                                                        │
│ [Buffer: 4 items]                                      │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Viewport: Visible Items (Index 100 to 112)         │ │
│ └────────────────────────────────────────────────────┘ │
│ [Buffer: 4 items]                                      │
└────────────────────────────────────────────────────────┘
```

1. **R — Requirements:** Render 100,000 items with smooth 60fps scrolling, search filtering, and dynamic row heights without browser memory crashes.
2. **A — Architecture:** Maintain a phantom spacer div equal to `totalItems * itemHeight` to preserve the native scrollbar. Calculate `startIndex = Math.floor(scrollTop / itemHeight)` and `endIndex = startIndex + visibleCount + buffer`. Render **only** the ~20 slice elements translated via GPU `transform: translateY(startIndex * itemHeight)`.
3. **D — Data Model:** Keep 100,000 items in a flat JavaScript array. Only pass the 20 visible items to the DOM.
4. **I — Interface:** Throttle scroll events using `requestAnimationFrame`. Use CSS `will-change: transform` to promote rows to GPU layers.
5. **O — Optimizations:** DOM node recycling (pool of 20 nodes re-used by mutating text content rather than recreating DOM elements), preventing layout thrashing by reading `scrollTop` once per frame.
