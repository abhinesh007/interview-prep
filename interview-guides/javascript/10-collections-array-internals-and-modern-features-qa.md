# 10 — Collections, Array Internals & Modern ECMAScript Evolution

> Deep dive into array memory structures (sparse array holes vs packed fast elements), `Array.prototype.sort()` alphabetic string traps, in-place mutating vs modern copying methods, `Map`/`Set` hash tables, and modern ECMAScript features (the Temporal API, `groupBy`, `Array.fromAsync`).

---

## 📑 Table of Contents
1. [Array Internals & The Sparse Array Hole Trap](#1-array-internals--the-sparse-array-hole-trap)
2. [In-Place Mutating Methods vs Immutable Copy Methods](#2-in-place-mutating-methods-vs-immutable-copy-methods)
3. [Advanced Collections: `Map`, `Set`, `WeakMap`, `WeakSet`](#3-advanced-collections-map-set-weakmap-weakset)
4. [Modern ECMAScript Evolution (ES2020 to ES2026+)](#4-modern-ecmascript-evolution-es2020-to-es2026)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Array Internals & The Sparse Array Hole Trap

### Q1: What is a Sparse Array (an array with "holes"), and why does `Array(3).map(() => 1)` return `[empty × 3]`?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction & Engine Internals  
**Tags:** `[Sparse-Arrays]` `[Array-Holes]` `[Fast-Elements]` `[V8-Internals]`

**Answer:**
In JavaScript, an array is not strictly guaranteed to be a contiguous sequence of elements.
An array is **Sparse** when it contains unassigned indices ("holes").

```text
Packed (Dense) Array:     [1, 2, 3]       -> Indices 0, 1, 2 physically exist in memory
Sparse Array with Holes:  Array(3)        -> length = 3, but indices 0, 1, 2 DO NOT EXIST!
```

### The Output Puzzle:
```javascript
const a = Array(3);
const result = a.map(() => 1);
console.log(result); // [empty × 3] (Callback is NEVER executed!)

console.log(0 in a); // false! The key '0' does not exist!
```

**Why Array Methods Skip Holes:**
Per the ECMAScript specification, iteration methods (`forEach`, `map`, `filter`, `every`, `some`, `reduce`) explicitly check whether the index exists on the array using the internal `HasProperty(array, index)` check.
Because an unallocated hole has no property key, the callback is skipped completely!

**The 3 Ways to Allocate an Array:**
```javascript
// 1. Array(3) -> Creates 3 HOLES (methods skip!)
const sparse = Array(3);

// 2. [...Array(3)] -> Iterates iterable; converts holes to EXPLICIT undefined
const dense1 = [...Array(3)]; // [undefined, undefined, undefined]

// 3. Array.from({ length: 3 }) -> Clean, high-performance dense allocation
const dense2 = Array.from({ length: 3 }, () => 0); // [0, 0, 0]
```

---

## 2. In-Place Mutating Methods vs Immutable Copy Methods

### Q2: Why does `[10, 2, 5, 1].sort()` evaluate to `[1, 10, 2, 5]`, and what are ES2023 immutable array methods?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Array.sort]` `[In-Place-Mutation]` `[ES2023]` `[toSorted]`

**Answer:**

### The Default Comparator Trap in `sort()`:
By default, `Array.prototype.sort()` converts all array elements to **strings** and sorts them according to their UTF-16 code unit values!
- `'10'` begins with character `'1'`, so `'10'` sorts before `'2'`.
- Result: `[1, 10, 2, 5]`.

To sort numbers correctly, a custom comparator must always be provided:
```javascript
numbers.sort((a, b) => a - b); // Ascending: [1, 2, 5, 10]
```

### In-Place Mutators vs Modern Copy Alternatives (ES2023):
Historically, several array methods modified the original array in-place, leading to subtle state corruption bugs in React and state-driven frameworks.
ES2023 introduced immutable counterparts that return fresh arrays without touching the original:

| In-Place Mutator (Avoid in React State) | Modern Immutable Copy Alternative (ES2023) | Description |
|---|---|---|
| `arr.sort(fn)` | `arr.toSorted(fn)` | Sorts elements into a new array |
| `arr.reverse()` | `arr.toReversed()` | Reverses elements into a new array |
| `arr.splice(start, deleteCount, ...items)` | `arr.toSpliced(start, deleteCount, ...items)` | Deletes/inserts items into a new array |
| `arr[i] = val` | `arr.with(i, val)` | Returns a new array with index `i` replaced |

```javascript
const original = [3, 1, 2];
const sorted = original.toSorted((a, b) => a - b);

console.log(sorted);   // [1, 2, 3]
console.log(original); // [3, 1, 2] (Preserved untouched!)
```

---

### Q3: What happens if `reduce()` is called on an empty array without an `initialValue`?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Edge Cases  
**Tags:** `[Reduce]` `[InitialValue]` `[TypeError]`

**Answer:**
If `Array.prototype.reduce()` is called on an empty array without supplying an `initialValue`, JavaScript throws an immediate uncaught runtime exception:
```javascript
[].reduce((acc, x) => acc + x);
// Uncaught TypeError: Reduce of empty array with no initial value
```

**Single-Element Array Edge Case:**
If `reduce()` is called on an array with **exactly 1 element** without an `initialValue`:
```javascript
[42].reduce((acc, x) => acc + x);
// Result: 42 (The callback function is NEVER invoked!)
```
*Best Practice:* Always provide an explicit `initialValue` to `reduce` (`[].reduce(fn, 0)`) to protect against runtime crashes on empty collections.

---

## 3. Advanced Collections: `Map`, `Set`, `WeakMap`, `WeakSet`

### Q4: Compare `Map` vs Plain Object `{}` and `Set` vs Array. How is key equality calculated?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Performance  
**Tags:** `[Map]` `[Set]` `[SameValueZero]` `[Hash-Tables]`

**Answer:**

### `Map` vs Plain Object `{}`:
1. **Key Types:** Object keys must be Strings or Symbols (numbers are converted to strings). `Map` accepts any type (objects, functions, primitives) as keys.
2. **Key Ordering:** `Map` strictly preserves the insertion order of keys across all keys.
3. **Performance:** `Map` is optimized for frequent additions and deletions of key-value pairs.
4. **Size:** `map.size` is an instant $O(1)$ property; objects require $O(n)$ `Object.keys(obj).length`.

### Key Equality: The `SameValueZero` Algorithm
Both `Map` and `Set` evaluate key uniqueness using the **`SameValueZero`** specification algorithm:
- Treats `NaN === NaN` (allowing `NaN` to be stored as a unique key).
- Treats `+0 === -0` (positive zero and negative zero share the same key).

```javascript
// Modern Set Methods (ES2024):
const setA = new Set([1, 2, 3]);
const setB = new Set([3, 4, 5]);

console.log(setA.intersection(setB));       // Set(1) { 3 }
console.log(setA.union(setB));              // Set(5) { 1, 2, 3, 4, 5 }
console.log(setA.difference(setB));         // Set(2) { 1, 2 }
console.log(setA.symmetricDifference(setB));// Set(4) { 1, 2, 4, 5 }
```

---

## 4. Modern ECMAScript Evolution (ES2020 to ES2026+)

### Q5: Why is the JavaScript `Date` object universally flawed, and how does the new `Temporal` API resolve it?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Modern Standards  
**Tags:** `[Temporal-API]` `[Date-Object]` `[ES2026]` `[Timezones]`

**Answer:**
The historical JavaScript `Date` object (copied from Java's `java.util.Date` in 1995) has notorious design flaws:
1. **Zero-Based Months:** January is `0`, December is `11`.
2. **Ambiguous Parsing:** `new Date("2026-05-10")` parses as UTC, while `new Date("2026/05/10")` parses as local time.
3. **In-Place Mutation:** `date.setMonth(date.getMonth() + 1)` mutates the original object.
4. **Poor Timezone Support:** Only supports UTC and the user's local timezone.

### The Modern Solution: The `Temporal` API (Stage 3/4)
`Temporal` is an immutable, ISO-compliant date/time API:
- **`Temporal.Now.instant()`:** Exact timestamp in nanoseconds.
- **`Temporal.PlainDate`:** Represents a date without a time or timezone (e.g., birthday: `"2026-05-10"`).
- **`Temporal.ZonedDateTime`:** Represents a date/time tied to a specific timezone (e.g., `"America/New_York"`).

```javascript
// Native Object Grouping (ES2024):
const inventory = [
  { name: "apples", category: "fruit" },
  { name: "carrots", category: "vegetable" },
  { name: "bananas", category: "fruit" }
];

const grouped = Object.groupBy(inventory, item => item.category);
// Result:
// {
//   fruit: [{ name: "apples", ... }, { name: "bananas", ... }],
//   vegetable: [{ name: "carrots", ... }]
// }
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What is `Array.prototype.at()` and why was it introduced?
**Difficulty:** 🟢 Junior | **Type:** 📖 APIs  
**Answer:** `array.at(index)` allows accessing elements using negative indices (counting backwards from the end of the array): `arr.at(-1)` returns the last element. Previously, developers were forced to write `arr[arr.length - 1]`.

### Q7: What is the difference between `for...in` and `for...of`?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:**
- `for...in`: Iterates over the **keys/indices** (strings) of any enumerable object, including inherited prototype keys.
- `for...of`: Iterates over the **values** of any **Iterable** object (Arrays, Strings, Maps, Sets, Generators). Plain objects `{}` do not work with `for...of`.
