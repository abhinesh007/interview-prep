# 08 — Functional Patterns, Transducers & Monads

> Deep dive into functional programming paradigms in JavaScript: pure functions, tacit (point-free) style caveats, currying with placeholders, transducers for high-performance single-pass array processing, monadic error handling (`Result` / `Either`), and async memoizers with LRU cache eviction.

---

## 📑 Table of Contents
1. [Functional Foundations & The Point-Free Trap](#1-functional-foundations--the-point-free-trap)
2. [Advanced Currying, Placeholders & Composition](#2-advanced-currying-placeholders--composition)
3. [Transducers: High-Performance Single-Pass Data Pipelines](#3-transducers-high-performance-single-pass-data-pipelines)
4. [Monadic Error Handling & Advanced Memoization](#4-monadic-error-handling--advanced-memoization)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Functional Foundations & The Point-Free Trap

### Q1: What is Tacit Programming (Point-Free Style), and why does `['1', '2', '3'].map(parseInt)` fail?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction & Functional Patterns  
**Tags:** `[Point-Free]` `[Map-ParseInt]` `[Arity-Mismatch]` `[Tacit-Style]`

**Answer:**
**Tacit Programming (Point-Free Style)** is a functional paradigm where function definitions do not explicitly identify the arguments (or "points") on which they operate. Instead, functions are composed or passed directly as first-class references.

```javascript
// Pointful style:
const double = numbers.map(n => multiplyByTwo(n));

// Point-free style (Tacit):
const double = numbers.map(multiplyByTwo);
```

### The Notorious Trap: `['1', '2', '3'].map(parseInt)`
**Output:** `[1, NaN, NaN]` (NOT `[1, 2, 3]`!)

**Why This Occurs:**
1. `Array.prototype.map` does not invoke its callback with 1 argument; it passes **3 arguments**:
   `callback(currentValue, index, array)`
2. `parseInt` accepts **2 arguments**:
   `parseInt(string, radix)`
3. When passed point-free to `map`, the `index` argument is silently forwarded as the `radix` (number base)!

```text
Iteration 0: parseInt('1', 0) -> Radix 0 defaults to base 10           -> Result: 1
Iteration 1: parseInt('2', 1) -> Base 1 is invalid (radix must be 2-36) -> Result: NaN
Iteration 2: parseInt('3', 2) -> '3' is an illegal digit in base 2     -> Result: NaN
```

**Senior Takeaway:**
Never use point-free style when passing functions to multi-argument higher-order functions unless the target function's parameter arity is strictly controlled (e.g., using a unary wrapper: `numbers.map(n => parseInt(n, 10))`).

---

## 2. Advanced Currying, Placeholders & Composition

### Q2: What is Currying vs Partial Application? Implement an advanced `curry()` utility supporting placeholders (`_`).
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Currying]` `[Partial-Application]` `[Placeholders]` `[Closures]`

**Answer:**
- **Partial Application:** Fixes a subset of arguments now, producing a function that expects *all remaining arguments at once*.
- **Currying:** Transforms a function of arity $N$ into a chain of $N$ unary functions, each accepting one argument until all $N$ arguments are collected.

```javascript
const _ = Symbol("curry.placeholder");

function curry(fn) {
  return function curried(...args) {
    // Check if we have enough non-placeholder arguments
    const complete = args.length >= fn.length &&
      args.slice(0, fn.length).every(arg => arg !== _);

    if (complete) {
      return fn(...args);
    }

    return function(...nextArgs) {
      // Merge nextArgs into current args, filling in placeholders first
      const merged = args.map(arg => (arg === _ && nextArgs.length ? nextArgs.shift() : arg));
      return curried(...merged, ...nextArgs);
    };
  };
}
curry.placeholder = _;

// USAGE EXAMPLE:
const divide = (a, b) => a / b;
const curriedDivide = curry(divide);

const divideByTwo = curriedDivide(_, 2);
console.log(divideByTwo(10)); // 5 (10 / 2)

const halveTen = curriedDivide(10);
console.log(halveTen(2));     // 5 (10 / 2)
```

---

## 3. Transducers: High-Performance Single-Pass Data Pipelines

### Q3: What is a Transducer, and how does it solve the memory and CPU penalties of chained array transformations?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture & High-Performance Coding  
**Tags:** `[Transducers]` `[Array-Chaining]` `[Performance]` `[Memory-Optimization]`

**Answer:**
When performing chained data processing on large collections:
```javascript
// Memory-Heavy Chain:
const result = bigArray
  .filter(isEven)       // Iteration 1: Allocates intermediate array (size N/2)
  .map(double)          // Iteration 2: Allocates intermediate array (size N/2)
  .slice(0, 10);        // Iteration 3: Allocates final array
```
If `bigArray` contains 1,000,000 items, this allocates **millions of temporary heap objects** and performs multiple full passes over the collection, triggering garbage collection pressure.

A **Transducer** (transform-reducer) decouples transformations from the underlying data structure:
- It composes `map` and `filter` operations together into a single reducing function.
- It processes items in a **single pass** ($O(n)$ time) with **zero intermediate array allocations** ($O(1)$ intermediate memory).

```text
Chained Methods:
Input Array ──> [Filter pass] ──(Intermediate Array)──> [Map pass] ──(Intermediate Array)──> Output

Transducer Pipeline:
Item 1 ──> [Filter ──> Map ──> Step] ──> Accumulated into Output
Item 2 ──> [Filter (Drop!)]           ──> Skipped immediately!
Item 3 ──> [Filter ──> Map ──> Step] ──> Accumulated into Output
(Single pass, zero intermediate allocations!)
```

```javascript
// Native Transducer Implementation from Scratch
const mapTransducer = (transform) => (step) => (acc, val) => step(acc, transform(val));
const filterTransducer = (predicate) => (step) => (acc, val) =>
  predicate(val) ? step(acc, val) : acc;

// Compose helper (right-to-left)
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

// Transduce runner:
function transduce(transducer, reducer, initial, collection) {
  const step = transducer(reducer);
  return collection.reduce(step, initial);
}

// USAGE:
const isEven = x => x % 2 === 0;
const double = x => x * 2;
const pushReducer = (acc, x) => { acc.push(x); return acc; };

const pipeline = compose(
  filterTransducer(isEven),
  mapTransducer(double)
);

const bigData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const results = transduce(pipeline, pushReducer, [], bigData);
console.log(results); // [4, 8, 12, 16, 20]
```

---

## 4. Monadic Error Handling & Advanced Memoization

### Q4: Why is relying on `throw` / `try...catch` for business logic considered an anti-pattern? Implement the `Result` Monad in JavaScript.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Functional Patterns  
**Tags:** `[Monads]` `[Result-Pattern]` `[Railway-Oriented]` `[Error-Handling]`

**Answer:**
`throw` creates "invisible goto" control flows that bypass function signatures, making code difficult to trace and impossible for static tools to verify exhaustively.

The **Result Monad** (`Ok` / `Err`) encapsulates either a successful value or a failure reason into a first-class object, enabling **Railway-Oriented Programming**:

```javascript
class Result {
  constructor(isSuccess, value, error) {
    this.isSuccess = isSuccess;
    this.value = value;
    this.error = error;
  }

  static ok(val) {
    return new Result(true, val, null);
  }

  static err(error) {
    return new Result(false, null, error);
  }

  map(fn) {
    return this.isSuccess ? Result.ok(fn(this.value)) : this;
  }

  flatMap(fn) {
    return this.isSuccess ? fn(this.value) : this;
  }

  unwrapOr(fallback) {
    return this.isSuccess ? this.value : fallback;
  }
}

// Clean Business Logic Pipeline without a single try/catch block:
function parseJSON(str) {
  try {
    return Result.ok(JSON.parse(str));
  } catch (err) {
    return Result.err("Invalid JSON");
  }
}

function validateAge(user) {
  return user.age >= 18
    ? Result.ok(user)
    : Result.err("User must be 18+");
}

const outcome = parseJSON('{"name":"Bob","age":21}')
  .flatMap(validateAge)
  .map(u => u.name.toUpperCase());

console.log(outcome.unwrapOr("ANONYMOUS")); // "BOB"
```

---

### Q5: How do you prevent Cache Stampedes in asynchronous memoizers?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Concurrency  
**Tags:** `[Memoization]` `[Cache-Stampede]` `[Async-Memoize]` `[LRU]`

**Answer:**
A **Cache Stampede (Thundering Herd)** occurs when an expensive un-cached asynchronous resource is requested by 100 concurrent callers simultaneously. If the memoizer only caches *resolved values*, all 100 callers initiate identical parallel network requests!

**The Solution: Cache the Active Promise:**
```javascript
function memoizeAsync(fn, keyResolver = (...args) => JSON.stringify(args)) {
  const cache = new Map();

  return function(...args) {
    const key = keyResolver(...args);

    if (cache.has(key)) {
      return cache.get(key); // Return existing pending Promise or resolved value
    }

    // Cache the PROMISE itself immediately before execution!
    const promise = fn(...args).catch(err => {
      // Evict on error so subsequent requests can retry
      cache.delete(key);
      throw err;
    });

    cache.set(key, promise);
    return promise;
  };
}
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What is a Thunk, and how does it prevent stack overflows in recursion?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:** A **Thunk** is a function that takes no arguments and wraps an expression delay: `() => recursiveStep()`. A **Trampoline** runner executes thunks in a simple `while` loop, continuously unwrapping returned thunks without accumulating stack frames.

### Q7: What is the difference between a Pure Function and an Idempotent Function?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:**
- **Pure Function:** For identical inputs, always returns the identical output and causes **zero side effects**.
- **Idempotent Function:** Executing it multiple times with the same input produces the same state as executing it once (e.g., HTTP `PUT` or `DELETE`, or `Math.abs(Math.abs(x))`). An idempotent function may still have side effects!
