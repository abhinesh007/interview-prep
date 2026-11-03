# 05 — Advanced Types, Conditionals & `infer`

> Deep dive into Conditional Types (`T extends U ? X : Y`), Distributive Conditionals vs Tuple Non-Distribution, Pattern Matching with `infer`, Recursive Types, `Awaited<T>`, and `UnionToIntersection<U>`.

---

## 📑 Table of Contents
1. [Conditional Types & Distributive Mechanics](#1-conditional-types--distributive-mechanics)
2. [Pattern Matching with the `infer` Keyword](#2-pattern-matching-with-the-infer-keyword)
3. [Recursive Types & Tail-Recursion Elimination](#3-recursive-types--tail-recursion-elimination)
4. [Masterclass: Implementing `UnionToIntersection<U>`](#4-masterclass-implementing-uniontointersectionu)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Conditional Types & Distributive Mechanics

### Q1: What are Conditional Types in TypeScript, and how do they evaluate at compile time?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Conditional-Types]` `[Extends]`

**Answer:**
**Conditional Types** introduce ternary branching logic (`condition ? trueBranch : falseBranch`) into TypeScript's type system:

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

#### Evaluation Rules:
1. When `T` is a concrete type (not a generic parameter), the compiler checks if $T \subseteq U$ (if $T$ is assignable to $U$).
2. If true, it resolves to the first branch; otherwise, to the second branch.
3. If $T$ is unresolved or depends on a free type variable, the conditional type remains deferred until instantiated.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the difference between `type NonNullable<T> = T extends null | undefined ? never : T` and using an `Exclude`?"  
*Senior Answer:* They are equivalent! In fact, TypeScript's built-in `Exclude<T, U>` is implemented as:
`type Exclude<T, U> = T extends U ? never : T;`
`NonNullable<T>` is simply `type NonNullable<T> = T extends null | undefined ? never : T;`.

---

### Q2: Explain Distributive Conditional Types. Why does `ToArray<string | number>` evaluate to `string[] | number[]` instead of `(string | number)[]`?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction & Deep-Dive  
**Tags:** `[Distributive-Conditionals]` `[Naked-Type-Parameters]`

**Answer:**
When a conditional type acts on a **naked type parameter** (a bare generic parameter `T` without being wrapped in another type), it **automatically distributes over union types**!

```text
Distributive Rule:
(A | B) extends U ? X : Y  ===>  (A extends U ? X : Y) | (B extends U ? X : Y)
```

```typescript
type ToArray<T> = T extends any ? T[] : never;

// Given a union: string | number
type Result = ToArray<string | number>;

// Step 1: Distributes over each union member:
// ToArray<string> | ToArray<number>

// Step 2: Evaluates each branch independently:
// string[] | number[] (A union of arrays!)
// NOT (string | number)[] (an array of mixed elements)!
```

#### How to PREVENT Distribution:
If you want the conditional type to evaluate against the entire union as a single whole, **wrap the type parameter in a tuple `[T]`**:

```typescript
type ToArrayNonDistributive<T> = [T] extends [any] ? T[] : never;

type MixedResult = ToArrayNonDistributive<string | number>;
// Evaluates strictly to: (string | number)[]
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the output of `type Test<T> = T extends never ? true : false; type Res = Test<never>;`?"  
*Senior Answer:* The result is **`never`**, NOT `true`!
Because `never` represents the empty union ($\emptyset$), when passed to a distributive conditional type, there are zero union members to distribute over. The distribution runs 0 times, returning `never`!
To fix it, wrap in tuples: `type Test<T> = [T] extends [never] ? true : false;`.

---

## 2. Pattern Matching with the `infer` Keyword

### Q3: What is the `infer` keyword, and where can it be used in conditional types?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Infer]` `[Pattern-Matching]`

**Answer:**
The `infer` keyword introduces a **type variable to be deduced via pattern matching** within the `extends` clause of a conditional type.

Instead of asserting a relationship, you ask the compiler: *"If this type matches this structural pattern, extract the component type into this new variable `R`."*

```typescript
// Pattern: "If T is a function returning R, extract R"
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function fetchUser() {
  return { id: 1, name: "Ada" };
}

// Inferred as: { id: number; name: string }
type User = MyReturnType<typeof fetchUser>;
```

#### Rules for `infer`:
1. `infer` can **only** be used inside the `extends` clause of a conditional type.
2. The inferred type variable `R` is **only available in the true branch** of the conditional expression.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does TypeScript's built-in `Awaited<T>` use `infer` recursively?"  
*Senior Answer:*
```typescript
type MyAwaited<T> = T extends null | undefined
  ? T
  : T extends object & { then(onfulfilled: infer F, ...args: any[]): any }
  ? F extends (value: infer V, ...args: any[]) => any
    ? MyAwaited<V> // Recursive unwrapping of nested Promises!
    : never
  : T;
```
If you pass `Promise<Promise<string>>`, `MyAwaited` unwraps both layers to produce `string`.

---

### Q4: Implement `Head<T>`, `Tail<T>`, and `Last<T>` tuple extractors using `infer`.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Infer]` `[Tuples]` `[Pattern-Matching]`

**Answer:**
```typescript
// 1. Extract the first element of a tuple:
export type Head<T extends readonly unknown[]> = T extends readonly [infer First, ...unknown[]]
  ? First
  : never;

// 2. Extract all elements except the first:
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest]
  ? Rest
  : [];

// 3. Extract the last element of a tuple:
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer LastItem]
  ? LastItem
  : never;

// Tests:
type Coords = [lat: number, lng: number, elevation: number];

type Lat = Head<Coords>;       // number
type Rest = Tail<Coords>;      // [lng: number, elevation: number]
type Elev = Last<Coords>;      // number
```

---

## 3. Recursive Types & Tail-Recursion Elimination

### Q5: How do Recursive Conditional Types work in modern TypeScript (TS 4.1+), and how does the compiler avoid stack overflows?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Performance  
**Tags:** `[Recursive-Types]` `[Tail-Recursion]` `[Compiler-Limit]`

**Answer:**
Prior to TypeScript 4.1, recursive conditional types were severely restricted. TypeScript 4.1 introduced official support for **Recursive Conditional Types**, along with **Tail-Recursion Elimination**.

#### Tail-Recursion Mechanics:
If a conditional type's recursive call sits in a tail position (meaning the result is returned directly without further transformation), TypeScript avoids creating new nested stack frames in the compiler:
- Standard non-tail recursion is capped at **~50 steps**.
- Tail-recursive conditional types can execute **up to 1,000 steps** before emitting: `"Type instantiation is excessively deep and possibly infinite"`.

```typescript
// ✅ Tail-Recursive String Reversal:
type ReverseString<
  S extends string, 
  Acc extends string = ""
> = S extends `${infer First}${infer Rest}`
  ? ReverseString<Rest, `${First}${Acc}`> // Tail call!
  : Acc;

type Reversed = ReverseString<"TypeScript">; // "tpircSepyT"
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you implement a type-level `Flatten<T>` that recursively flattens arrays of arbitrary depth?"  
*Senior Answer:*
```typescript
export type Flatten<T> = T extends readonly (infer Element)[]
  ? Flatten<Element>
  : T;

type Nested = number[][][][];
type Flat = Flatten<Nested>; // strictly number!
```

---

## 4. Masterclass: Implementing `UnionToIntersection<U>`

### Q6: How does `UnionToIntersection<U>` work, and why does it rely on function parameter Contravariance?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Practical Coding & Deep Type Theory  
**Tags:** `[UnionToIntersection]` `[Contravariance]` `[Type-Gymnastics]`

**Answer:**
This is universally considered one of the highest-yield, most impressive questions in senior/staff TypeScript interviews.

#### The Goal:
Transform a union type `'a' | 'b' | 'c'` or `{ a: 1 } | { b: 2 }` into an intersection `{ a: 1 } & { b: 2 }`.

#### The Implementation:
```typescript
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void)
    ? I
    : never;

// Verification:
type Union = { id: string } | { name: string } | { role: "admin" };
type Intersected = UnionToIntersection<Union>;
// Result: { id: string } & { name: string } & { role: "admin" }
```

#### Under the Hood Theory:
1. **Distribution into Functions:**
   `(U extends any ? (k: U) => void : never)` distributes the union `U` into a union of function types.
   If $U = A \mid B$, this creates: `((k: A) => void) | ((k: B) => void)`.
2. **Contravariant Candidate Inference:**
   When `extends (k: infer I) => void` matches against a union of functions, `I` is in a **contravariant parameter position**.
3. **Intersection Synthesis:**
   In type theory, for a function to be simultaneously assignable to multiple functions taking different parameter types, its parameter must accept **the intersection of all candidate types**:
   $(A \to \text{void}) \lor (B \to \text{void}) \implies (A \land B) \to \text{void}$.
   Therefore, TypeScript resolves `infer I` to `A & B`!

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you use `infer` on return types instead of parameters?"  
*Senior Answer:* Return types are in **covariant positions**. Multiple candidates in covariant positions infer a **union**, not an intersection:
`(U extends any ? () => U : never) extends (() => infer R) ? R : never` returns $A \mid B$.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q7: How do you implement a strictly accurate `IsAny<T>` utility type?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[IsAny]` `[Soundness]`

**Answer:**
Because `any` is both a top and bottom type, testing `T extends any` always returns true for everything.

The only reliable way to isolate `any` is by leveraging the fact that `any` creates an unexpected union when intersecting with functions or testing inside tuple assignability:

```typescript
// Checks if 0 & 1 resolves to never for standard types, but any for 'any':
export type IsAny<T> = 0 extends (1 & T) ? true : false;

type A = IsAny<any>;     // true
type B = IsAny<unknown>; // false
type C = IsAny<never>;   // false
type D = IsAny<string>;  // false
```

---

### Q8: How do you implement `IsNever<T>`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[IsNever]` `[Tuples]`

**Answer:**
Because `never` is distributive and skips execution, you must wrap `T` in a tuple:

```typescript
export type IsNever<T> = [T] extends [never] ? true : false;

type T1 = IsNever<never>;  // true
type T2 = IsNever<any>;    // false
type T3 = IsNever<void>;   // false
```

---

### Q9: What is the output of `type Foo = [string] extends [any] ? true : false` vs `type Bar = string extends any ? true : false`?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Conditionals]`

**Answer:**
Both evaluate to **`true`**. The difference only manifests when passing a union or `never` to generic parameters.
