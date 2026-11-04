# 05 — Types, Coercion, Equality & Serialization Quirks

> Deep dive into ECMAScript's 8 data types, IEEE 754 double-precision floating-point arithmetic, the `ToPrimitive` specification algorithm, equality semantics (`==` vs `===` vs `Object.is`), the 6 deadly traps of `JSON.stringify`, and `structuredClone` limits.

---

## 📑 Table of Contents
1. [Data Types & IEEE 754 Floating-Point Mechanics](#1-data-types--ieee-754-floating-point-mechanics)
2. [Type Coercion & The `ToPrimitive` Specification](#2-type-coercion--the-toprimitive-specification)
3. [Equality Semantics: `==` vs `===` vs `Object.is()`](#3-equality-semantics--vs--vs-objectis)
4. [JSON Serialization & Deep Cloning Quirks](#4-json-serialization--deep-cloning-quirks)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Data Types & IEEE 754 Floating-Point Mechanics

### Q1: What are the 8 ECMAScript data types, and why does `typeof null === 'object'`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Primitives]` `[Typeof-Null]` `[Data-Types]`

**Answer:**
Modern JavaScript defines exactly **8 data types**:
- **7 Primitives:** `undefined`, `null`, `boolean`, `number`, `bigint`, `string`, `symbol`.
- **1 Reference Type:** `object` (functions, arrays, dates, regex, maps, and sets are all subtypes of `object`).

**Why `typeof null === 'object'`:**
This is an infamous bug in the original 1995 JavaScript implementation by Brendan Eich.
In early engines, values were represented using a **32-bit tagged pointer system**:
- The lowest 1 to 3 bits stored a type tag.
- Type tag `000` represented an **Object reference**.
- The `null` pointer was represented as all zeros (`0x00000000`).
- Because the lowest 3 bits of `0x00000000` were `000`, the engine's `typeof` check read the tag as an Object!

A TC39 proposal to fix `typeof null` to return `"null"` was formally rejected because it broke millions of legacy websites that relied on `typeof null === 'object'`.

**Safe Type Checking Utility:**
```javascript
function getTrueType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

console.log(getTrueType(null));        // "null"
console.log(getTrueType([]));          // "array"
console.log(getTrueType(/regex/));     // "regexp"
console.log(getTrueType(new Map()));   // "map"
```

---

### Q2: Why does `0.1 + 0.2 !== 0.3` in JavaScript, and how do you handle financial arithmetic safely?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding & Conceptual  
**Tags:** `[IEEE-754]` `[Floating-Point]` `[Precision]` `[Financial-Math]`

**Answer:**
In JavaScript, all numbers (except `BigInt`) are stored as **64-bit double-precision binary floating-point numbers** governed by the **IEEE 754** standard.

```text
IEEE 754 64-bit Floating-Point Layout:
┌──────┬───────────────────────┬────────────────────────────────────────────┐
│ Sign │  Exponent (11 bits)   │            Fraction / Mantissa (52 bits)   │
│(1 bit│                       │                                            │
└──────┴───────────────────────┴────────────────────────────────────────────┘
```

In base-10, fractions like $1/3$ produce repeating decimals ($0.3333...$).
Similarly, in base-2 (binary), fractions like $1/10$ ($0.1$) and $2/10$ ($0.2$) cannot be represented accurately:
- $0.1_{10} = 0.00011001100110011..._2$ (repeats infinitely).
- When rounded to fit the 52-bit mantissa limit:
  - $0.1 \rightarrow 0.100000000000000005551115123126...$
  - $0.2 \rightarrow 0.200000000000000011102230246252...$
  - $0.1 + 0.2 = \mathbf{0.300000000000000044408920985006...}$

**Production Solutions for Financial Arithmetic:**
1. **Integer Scaling (Cents):** Store money in cents/integer units ($10.50 \rightarrow 1050$).
2. **`Number.EPSILON` Tolerance:**
   ```javascript
   function numbersAreEqual(a, b) {
     return Math.abs(a - b) < Number.EPSILON;
   }
   console.log(numbersAreEqual(0.1 + 0.2, 0.3)); // true
   ```
3. **Dedicated Arbitrary Precision Libraries:** Use libraries like `decimal.js` or `bignumber.js`.

---

## 2. Type Coercion & The `ToPrimitive` Specification

### Q3: How does the ECMAScript `ToPrimitive` abstract operation work, and what are the results of notorious arithmetic puzzles?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction & Specifications  
**Tags:** `[ToPrimitive]` `[Type-Coercion]` `[valueOf]` `[toString]`

**Answer:**
When an object is used in an arithmetic or string operation, the engine must convert it to a primitive value via the internal **`ToPrimitive(input, preferredType)`** algorithm:

1. **Check `Symbol.toPrimitive`:** If the object has a `[Symbol.toPrimitive](hint)` method, call it with `hint` (`"number"`, `"string"`, or `"default"`).
2. **If hint is `"string"`:** Call `obj.toString()`. If primitive, return it; otherwise call `obj.valueOf()`.
3. **If hint is `"number"` or `"default"`:** Call `obj.valueOf()`. If primitive, return it; otherwise call `obj.toString()`.
4. If neither returns a primitive, throw `TypeError: Cannot convert object to primitive value`.

```text
┌───────────────────────────────────────────────┐
│            The Notorious Coercion Puzzles     │
├─────────────────┬─────────────┬───────────────┤
│ Expression      │ Result      │ Exact Reason  │
├─────────────────┼─────────────┼───────────────┤
│ [] + []         │ ""          │ Both arrays convert to "" via toString(); "" + "" = "" │
│ [] + {}         │ "[object... │ [] -> ""; {} -> "[object Object]"; concatenated.      │
│ {} + []         │ 0 (or "[..] │ Parsed as empty block {} followed by +[]; +[] -> 0.   │
│ true + false    │ 1           │ Number(true) is 1; Number(false) is 0; 1 + 0 = 1.     │
│ 12 / "6"        │ 2           │ Division operator strictly coerces strings to numbers. │
│ "foo" + + "bar" │ "fooNaN"    │ Unary + "bar" evaluates to NaN; "foo" + NaN = "fooNaN" │
└─────────────────┴─────────────┴───────────────┘
```

---

## 3. Equality Semantics: `==` vs `===` vs `Object.is()`

### Q4: Compare `==`, `===`, and `Object.is()`. When does `===` fail?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[Equality]` `[Object.is]` `[SameValue]` `[NaN]`

**Answer:**
JavaScript offers three levels of equality checking:

```text
1. Abstract Equality (==):
   Performs type coercion before comparison. (e.g., '5' == 5 is true).

2. Strict Equality (===):
   Checks both type and value WITHOUT coercion.
   Two critical exceptions in IEEE 754:
     • NaN === NaN is FALSE! (NaN is not equal to itself)
     • +0 === -0 is TRUE!   (Cannot distinguish positive/negative zero)

3. SameValue Algorithm (Object.is):
   Accurate mathematical equality:
     • Object.is(NaN, NaN) is TRUE!
     • Object.is(+0, -0) is FALSE!
```

```javascript
// Polyfill for Object.is
function objectIs(x, y) {
  if (x === y) {
    // Distinguish +0 from -0: 1 / +0 is +Infinity, 1 / -0 is -Infinity
    return x !== 0 || 1 / x === 1 / y;
  }
  // Distinguish NaN: NaN is the only value in JS that does not equal itself
  return x !== x && y !== y;
}
```

*Use Case:* React's state management hooks (`useState`, `useEffect`) and Fiber reconciler use `Object.is()` to determine whether component state has actually changed and needs a re-render.

---

## 4. JSON Serialization & Deep Cloning Quirks

### Q5: What are the 6 deadly traps of `JSON.stringify()`, and when does `structuredClone()` throw?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[JSON-Stringify]` `[structuredClone]` `[Deep-Clone]` `[Serialization]`

**Answer:**

### The 6 Traps of `JSON.stringify()`:
1. **Omission in Objects:** Properties whose values are `undefined`, `Function`, or `Symbol` are silently **dropped** from the resulting JSON string:
   ```javascript
   JSON.stringify({ a: 1, b: undefined, c: () => {}, d: Symbol("id") });
   // Result: '{"a":1}'
   ```
2. **Replacement with `null` in Arrays:** In arrays, `undefined`, functions, and symbols are converted to `null` to preserve index positioning:
   ```javascript
   JSON.stringify([1, undefined, () => {}, 4]);
   // Result: '[1,null,null,4]'
   ```
3. **`NaN` and `Infinity` become `null`:**
   ```javascript
   JSON.stringify({ val: NaN, inf: Infinity });
   // Result: '{"val":null,"inf":null}'
   ```
4. **`BigInt` Throws a Fatal TypeError:**
   ```javascript
   JSON.stringify({ amount: 100n });
   // TypeError: Do not know how to serialize a BigInt
   ```
5. **Circular References Throw a Fatal TypeError:**
   ```javascript
   const circular = {}; circular.self = circular;
   JSON.stringify(circular);
   // TypeError: Converting circular structure to JSON
   ```
6. **`Map` and `Set` serialize to empty objects:**
   ```javascript
   JSON.stringify(new Map([['a', 1]]));
   // Result: '{}'
   ```

### Native `structuredClone()` vs `JSON.parse(JSON.stringify())`:
`structuredClone()` uses the HTML Structured Clone Algorithm:
- **Capabilities:** Clones circular references, `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, and `TypedArrays`.
- **Fatal Throws (`DataCloneError`):** Throws immediately if an object contains **functions**, **DOM nodes**, or **Proxy objects**!

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What does `void 0` evaluate to, and why was it traditionally preferred over `undefined`?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:** `void 0` evaluates strictly to `undefined`. In pre-ES5 JavaScript, `undefined` was a mutable global property that could be reassigned (`window.undefined = "hacked"`). Using `void 0` guaranteed a reliable primitive `undefined` regardless of the execution environment.

### Q7: Why does `Math.max()` with no arguments return `-Infinity`, while `Math.min()` returns `Infinity`?
**Difficulty:** 🟡 Mid | **Type:** 🧩 Output Prediction  
**Answer:** In mathematical reduction, the identity element for finding a maximum must be the lowest possible number ($- \infty$), so that any number compared against it will be greater: $\max(-\infty, x) = x$. Conversely, the identity element for minimum is $+ \infty$: $\min(+\infty, x) = x$.

### Q8: What is the difference between `Object.freeze()`, `Object.seal()`, and `Object.preventExtensions()`?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:**
- **`preventExtensions(obj)`:** Prevents adding new properties; existing properties can be deleted or modified.
- **`seal(obj)`:** Prevents adding and deleting properties (`configurable: false`); existing property values can be modified.
- **`freeze(obj)`:** Prevents adding, deleting, or modifying property values (`configurable: false, writable: false`). All three are **shallow** by default.
