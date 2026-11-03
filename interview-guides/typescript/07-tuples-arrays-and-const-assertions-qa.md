# 07 — Tuples, Arrays & Const Assertions

> Deep dive into Tuples vs Arrays, Variadic Tuple Types, Labeled Elements, `as const` assertions vs `<const T>` Type Parameters (TS 5.0), and non-empty array modeling.

---

## 📑 Table of Contents
1. [Tuples vs Arrays & Widening](#1-tuples-vs-arrays--widening)
2. [Variadic Tuple Types (TS 4.0+)](#2-variadic-tuple-types-ts-40)
3. [`as const` vs `<const T>` Type Parameters (TS 5.0)](#3-as-const-vs-const-t-type-parameters-ts-50)
4. [🎯 Quick-Fire & Trap Questions](#4--quick-fire--trap-questions)

---

## 1. Tuples vs Arrays & Widening

### Q1: What is the technical difference between an Array and a Tuple in TypeScript, and why does TypeScript widen tuples by default?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Tuples]` `[Arrays]` `[Type-Widening]`

**Answer:**
- **Array (`T[]` or `Array<T>`):** Represents an arbitrary-length, homogeneous list of elements. Elements can be added, removed, or accessed at any index.
- **Tuple (`[T1, T2, ...Tn]`):** Represents a **fixed-length, ordered sequence** of heterogeneous elements where each specific position has a known type.

```text
Array:  [ string, string, string, ... (infinite) ]
Tuple:  [ string (index 0), number (index 1), boolean (index 2) ] (length strictly 3)
```

#### Why TypeScript Widens by Default:
When you declare `const coords = [40.7128, -74.0060];`, JavaScript arrays are mutable by nature. TypeScript assumes you might later call `coords.push(100)`, so it infers the widest possible valid type: **`number[]`**, rather than `[number, number]`.

To force tuple inference, use a type annotation or an `as const` assertion:
```typescript
const coords1: [number, number] = [40.7128, -74.0060]; // Explicit annotation
const coords2 = [40.7128, -74.0060] as const;           // readonly [40.7128, -74.0060]
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What are Labeled Tuple Elements (TS 4.0+), and do they affect runtime code?"  
*Senior Answer:* Labeled tuple elements (e.g., `[lat: number, lng: number]`) are purely documentation for the IDE and compiler diagnostics. They provide parameter name hints during function calls and destructuring, but are completely erased at runtime.

---

## 2. Variadic Tuple Types (TS 4.0+)

### Q2: How do Variadic Tuple Types work, and how do you write a strongly typed `concat` function?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Variadic-Tuples]` `[Spread]` `[TS-4.0]`

**Answer:**
**Variadic Tuple Types** allow rest elements (`...T`) to appear anywhere in a tuple, including at the beginning or middle:

```typescript
export function concat<
  T extends readonly unknown[], 
  U extends readonly unknown[]
>(arr1: T, arr2: U): [...T, ...U] {
  return [...arr1, ...arr2];
}

const tuple1 = [1, "two"] as const;
const tuple2 = [true, new Date()] as const;

// Inferred return type: readonly [1, "two", true, Date]
const combined = concat(tuple1, tuple2);
```

#### Rest in Middle/Leading Positions:
```typescript
type ActionPayload = [prefix: string, ...args: number[], timestamp: number];

// ✅ Valid: prefix is string, args are numbers, last is number
const action1: ActionPayload = ["event", 1, 2, 3, 1600000000];
```

---

## 3. `as const` vs `<const T>` Type Parameters (TS 5.0)

### Q3: What is the difference between `as const` and `<const T>` Type Parameters introduced in TypeScript 5.0?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Version Evolution (TS 5.0)  
**Tags:** `[Const-Type-Parameters]` `[TS-5.0]` `[As-Const]`

**Answer:**
#### `as const` (Caller-Side Assertion):
Requires the **consumer/caller** to manually affix `as const` to every object or array literal passed into a function:

```typescript
function defineRoutes<T extends readonly string[]>(routes: T): T {
  return routes;
}

// 🐛 Caller forgot 'as const':
// routes is inferred as string[]!
const r1 = defineRoutes(["/home", "/dashboard", "/settings"]);

// Required verbose caller syntax:
const r2 = defineRoutes(["/home", "/dashboard", "/settings"] as const);
```

#### `<const T>` (API Author-Side Enforcement in TS 5.0):
By adding `const` to the generic type parameter declaration (`<const T>`), the function author forces the compiler to infer all arguments as if they were written with `as const`, **without the caller writing a single assertion!**

```typescript
// In TypeScript 5.0+:
function defineRoutes<const T extends readonly string[]>(routes: T): T {
  return routes;
}

// ✅ Automatically inferred as: readonly ["/home", "/dashboard", "/settings"]!
const routes = defineRoutes(["/home", "/dashboard", "/settings"]);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a caller passes a mutable variable reference into a `<const T>` function?"  
*Senior Answer:* If the argument is an existing mutable variable (`const arr = ['a', 'b']`), `<const T>` cannot retroactively freeze it; it infers `string[]`. `<const T>` only applies its const-narrowing behavior to fresh object and array literals created directly in the call expression.

---

## 4. 🎯 Quick-Fire & Trap Questions

### Q4: How do you model a "Non-Empty Array" type in TypeScript?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Non-Empty-Array]` `[Tuples]`

**Answer:**
Using a tuple with a rest array element:
```typescript
export type NonEmptyArray<T> = [T, ...T[]];

function processBatch<T>(items: NonEmptyArray<T>) {
  // items[0] is guaranteed to exist!
  const first = items[0];
}

// ❌ Error: Source has 0 element(s) but target requires 1.
// processBatch([]);

// ✅ Valid:
processBatch([1, 2, 3]);
```

---

### Q5: What does `arr[10]` return by default in TypeScript without `noUncheckedIndexedAccess`?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Indexed-Access]` `[TSConfig]`

**Answer:**
Given `const arr: number[] = [1, 2];`, reading `arr[10]` returns **`number`** at compile time!
At runtime, JavaScript returns `undefined`. This causes silent runtime crashes (`arr[10].toFixed(2)`).
With `"noUncheckedIndexedAccess": true`, TypeScript correctly types index reads as `number | undefined`.
