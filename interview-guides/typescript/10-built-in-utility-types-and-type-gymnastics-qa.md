# 10 — Built-in Utility Types & Type Gymnastics

> Deep dive into standard utility types (`Partial`, `Required`, `Pick`, `Omit`, `Exclude`, `Extract`, `ReturnType`, `Awaited`), and authoring custom staff-level gymnastics (`DeepPartial`, `IsEqual`, `IsAny`, `IsNever`, `TupleToUnion`).

---

## 📑 Table of Contents
1. [Built-in Utility Types: Internals & Mechanics](#1-built-in-utility-types-internals--mechanics)
2. [Masterclass: Implementing `IsEqual<A, B>`](#2-masterclass-implementing-isequala-b)
3. [Deep Recursive Utilities: `DeepPartial<T>`](#3-deep-recursive-utilities-deeppartialt)
4. [🎯 Quick-Fire & Trap Questions](#4--quick-fire--trap-questions)

---

## 1. Built-in Utility Types: Internals & Mechanics

### Q1: How are `Exclude<T, U>`, `Extract<T, U>`, `Pick<T, K>`, and `Omit<T, K>` implemented under the hood?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Code Deconstruction  
**Tags:** `[Utility-Types]` `[Pick]` `[Omit]` `[Exclude]`

**Answer:**
Understanding how built-in utilities are constructed is crucial for building custom type transformers:

```typescript
// 1. Exclude: Distributes over union T, filtering out members assignable to U:
type MyExclude<T, U> = T extends U ? never : T;

// 2. Extract: Keeps only members of T assignable to U:
type MyExtract<T, U> = T extends U ? T : never;

// 3. Pick: Constructs a type by picking specific keys K from object T:
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 4. Omit: Picks all keys from T EXCEPT K:
type MyOmit<T, K extends keyof any> = MyPick<T, MyExclude<keyof T, K>>;
```

#### The Fundamental Difference Between `Exclude` and `Omit`:
- **`Exclude<Union, Members>`** operates on **unions of values or strings** (`'a' | 'b' | 'c'`).
- **`Omit<Object, Keys>`** operates on **object shapes** (`{ id: string; name: string }`).

```typescript
type Status = "idle" | "loading" | "success" | "error";
type NonErrorStatus = Exclude<Status, "error">; // "idle" | "loading" | "success"

interface User { id: string; name: string; passwordHash: string; }
type SafeUser = Omit<User, "passwordHash">; // { id: string; name: string; }
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is the second argument of `Omit` constrained to `keyof any` rather than `keyof T`?"  
*Senior Answer:* Because in real-world code, you often want to omit a key that *might* not exist on all variants of a union, or omit arbitrary strings without TypeScript throwing an error if the key isn't present.

---

## 2. Masterclass: Implementing `IsEqual<A, B>`

### Q2: How do you implement a strictly sound `IsEqual<A, B>` utility that correctly handles `any`, `never`, and modifier differences?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Practical Coding & Deep Type Theory  
**Tags:** `[IsEqual]` `[Soundness]` `[Type-Gymnastics]`

**Answer:**
Naively writing `[A] extends [B] ? ([B] extends [A] ? true : false) : false` **fails** when `any` is involved because `any` is assignable to everything and everything is assignable to `any`.

The canonical, sound solution relies on **generic conditional type inference in function return positions**:

```typescript
export type IsEqual<A, B> = 
  (<T>() => T extends A ? 1 : 2) extends 
  (<T>() => T extends B ? 1 : 2) 
    ? true 
    : false;

// Verification:
type Test1 = IsEqual<string, string>;       // true
type Test2 = IsEqual<string, number>;       // false
type Test3 = IsEqual<any, number>;          // false! (Properly catches 'any')
type Test4 = IsEqual<any, any>;             // true
type Test5 = IsEqual<never, never>;         // true
type Test6 = IsEqual<{ readonly x: 1 }, { x: 1 }>; // false! (Catches readonly differences)
```

#### Why This Works Under the Hood:
TypeScript compares generic conditional types internally by checking if the condition `T extends A` is structurally identical to `T extends B`. Because `any` alters the evaluation of conditional types uniquely, the compiler only considers `<T>() => T extends A ? 1 : 2` assignable to `<T>() => T extends B ? 1 : 2` if `A` and `B` are **strictly identical in every respect**, including modifier flags and soundness escapes!

---

## 3. Deep Recursive Utilities: `DeepPartial<T>`

### Q3: Implement `DeepPartial<T>` that recursively handles objects, arrays, maps, and leaves functions untouched.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[DeepPartial]` `[Recursion]` `[Mapped-Types]`

**Answer:**
```typescript
export type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? _DeepPartialArray<U>
  : T extends Map<infer K, infer V>
  ? _DeepPartialMap<K, V>
  : T extends Set<infer M>
  ? _DeepPartialSet<M>
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// Internal helpers to prevent excessive recursion instantiation:
type _DeepPartialArray<T> = Array<DeepPartial<T>>;
type _DeepPartialMap<K, V> = Map<DeepPartial<K>, DeepPartial<V>>;
type _DeepPartialSet<T> = Set<DeepPartial<T>>;

// Test application:
interface ComplexConfig {
  server: {
    host: string;
    port: number;
    ssl: {
      cert: string;
      key: string;
    };
  };
  endpoints: string[];
  connect(): Promise<void>;
}

// All nested properties become optional, while connect() remains a callable function:
const patch: DeepPartial<ComplexConfig> = {
  server: {
    ssl: {
      cert: "new_cert"
    }
  }
};
```

---

## 4. 🎯 Quick-Fire & Trap Questions

### Q4: What does the `ThisType<T>` marker interface do, and where is it used?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ThisType]` `[Context]`

**Answer:**
`ThisType<T>` is a built-in marker interface that emits no code. When present in an object type, it instructs the compiler that methods inside that object literal should have their `this` context typed as `T`. It is widely used in Vue 2 Options API and Pinia store definitions:

```typescript
type Store<S, M> = {
  state: S;
  methods: M & ThisType<S & M>;
};
```

---

### Q5: How do you transform a Tuple into a Union?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical Coding  
**Tags:** `[TupleToUnion]` `[Indexed-Access]`

**Answer:**
Using indexed access with `[number]`:
```typescript
type Tuple = ["apple", "banana", "orange"];
type Union = Tuple[number]; // "apple" | "banana" | "orange"
```
