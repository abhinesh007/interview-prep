# 09 — Type Variance & Subtyping Mechanics

> Deep dive into Covariance, Contravariance, Invariance, Bivariance, the Method Shorthand Bivariance Trap, `strictFunctionTypes`, and `in`/`out` Variance Annotations (TS 4.7+).

---

## 📑 Table of Contents
1. [Understanding Variance: The Four Dimensions](#1-understanding-variance-the-four-dimensions)
2. [The Method Shorthand Bivariance Trap & `strictFunctionTypes`](#2-the-method-shorthand-bivariance-trap--strictfunctiontypes)
3. [Explicit `in` / `out` Variance Annotations (TS 4.7+)](#3-explicit-in--out-variance-annotations-ts-47)
4. [🎯 Quick-Fire & Trap Questions](#4--quick-fire--trap-questions)

---

## 1. Understanding Variance: The Four Dimensions

### Q1: What is Variance in type systems, and how do Covariance and Contravariance apply to inputs and outputs?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Type Theory  
**Tags:** `[Type-Variance]` `[Covariance]` `[Contravariance]`

**Answer:**
**Variance** describes how the subtyping relationship between complex types relates to the subtyping relationship between their component types.

Given a subtyping relationship: $\text{Dog} \le \text{Animal}$ (a `Dog` is a subtype of `Animal`):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        THE FOUR FORMS OF VARIANCE                      │
├─────────────────┬──────────────────────────────────────────────────────┤
│ 1. Covariance   │ Preserves direction: Producer<Dog> ≤ Producer<Animal>│
│ 2. Contravariance│ Reverses direction: Consumer<Animal> ≤ Consumer<Dog> │
│ 3. Invariance   │ Neither direction: Box<Dog> ≰ Box<Animal>            │
│ 4. Bivariance   │ Both directions: Can assign in either direction      │
└─────────────────┴──────────────────────────────────────────────────────┘
```

1. **Covariance (Output Positions):**
   - If a generic type *produces* or *returns* a value (like an Array, Promise, or Getter), it is **covariant**.
   - A function returning `Dog` can be used wherever a function returning `Animal` is expected:
     `() => Dog` is assignable to `() => Animal`.

2. **Contravariance (Input / Parameter Positions):**
   - If a function *consumes* a value as an argument, subtyping is **reversed**!
   - A handler that accepts *any* `Animal` can safely handle a `Dog`:
     `(a: Animal) => void` is assignable to `(d: Dog) => void`!
   - Conversely, a handler expecting a `Dog` cannot be assigned to one expecting an `Animal` (what if someone passes a `Cat`?).

---

## 2. The Method Shorthand Bivariance Trap & `strictFunctionTypes`

### Q2: What is the Method Shorthand Bivariance Trap, and why does TypeScript allow it even under `strictFunctionTypes`?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Bivariance-Trap]` `[StrictFunctionTypes]` `[Soundness]`

**Answer:**
In TypeScript, function properties declared with **method syntax** are **bivariant**, whereas function properties declared with **arrow property syntax** are **contravariant** under `strictFunctionTypes`!

```typescript
class Animal { name = "Animal"; }
class Dog extends Animal { bark() { console.log("Woof"); } }
class Cat extends Animal { meow() { console.log("Meow"); } }

// Notice the two declaration styles:
interface MethodHandler {
  handle(animal: Dog): void; // Method syntax: BIVARIANT!
}

interface PropertyHandler {
  handle: (animal: Dog) => void; // Property syntax: CONTRAVARIANT!
}

const animalFn = (a: Animal) => console.log(a.name);
const dogFn = (d: Dog) => d.bark();

let m: MethodHandler;
let p: PropertyHandler;

// ⚠️ THE BIVARIANCE TRAP:
// Even under "strictFunctionTypes: true", this compiles!
m = { handle: animalFn }; // Covariant assignment (Allowed)
m = { handle: (c: Cat) => c.meow() as any }; // 💥 Unsound assignment allowed!

// BUT WITH PROPERTY SYNTAX:
// p = { handle: (c: Cat) => c.meow() as any }; // ❌ Error: Type 'Animal' is not assignable to type 'Cat'.
```

#### Why TypeScript Did This Deliberately:
TypeScript prioritizes JavaScript ergonomics. In JavaScript, arrays are mutable. If method parameters were strictly contravariant, `Dog[]` could **never be assigned to `Animal[]`** because methods like `Array.prototype.push(item: T)` take `T` as an input parameter!

To prevent breaking array subtyping, TypeScript made method signatures bivariant, and restricted `strictFunctionTypes` to apply **only to function properties**.

**Senior Takeaway:** Always use function property syntax (`fn: (arg: T) => void`) on interfaces when strict type safety is required!

---

## 3. Explicit `in` / `out` Variance Annotations (TS 4.7+)

### Q3: What do the `in` and `out` keywords on generic parameters do (TS 4.7+), and how do they boost compiler performance?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Compiler Performance  
**Tags:** `[Variance-Annotations]` `[TS-4.7]` `[In-Out]`

**Answer:**
TypeScript 4.7 introduced **Explicit Type Parameter Variance Annotations**:
- **`out T`:** Declares that `T` is only used in **covariant (output)** positions.
- **`in T`:** Declares that `T` is only used in **contravariant (input)** positions.
- **`in out T`:** Declares that `T` is **invariant**.

```typescript
// Pure Producer (Covariant):
export interface Producer<out T> {
  produce(): T;
}

// Pure Consumer (Contravariant):
export interface Consumer<in T> {
  consume(arg: T): void;
}
```

#### How It Accelerates the Compiler:
By default, the TypeScript compiler must structurally inspect every single member and nested reference of a generic interface to compute its variance. For large libraries with complex generic types (e.g., Redux, RxJS, TanStack Query), this deep traversal takes substantial CPU time.

Explicit `in`/`out` annotations tell the compiler the variance up front, allowing it to skip structural checks and perform instant assignability calculations!

---

## 4. 🎯 Quick-Fire & Trap Questions

### Q4: Why is a function with FEWER parameters assignable to a function expecting MORE parameters?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Parameters]` `[Soundness]`

**Answer:**
In JavaScript, callbacks commonly ignore extra arguments. For instance, `[1, 2, 3].map(x => x * 2)` only takes the `element`, ignoring `index` and `array`.

If TypeScript required parameter counts to match exactly, every `.map()` callback would be forced to accept all three arguments: `arr.map((val, index, array) => ...)`. TypeScript intentionally permits passing functions with fewer parameters for pragmatic usability.

---

### Q5: Are mutable array elements covariant, contravariant, or invariant?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Arrays]` `[Invariance]`

**Answer:**
In type theory, mutable references must be **invariant** to be sound. If you assign `Dog[]` to `Animal[]`, someone can call `animals.push(new Cat())`, placing a Cat inside an array typed as Dogs!
TypeScript intentionally treats arrays as **covariant** for pragmatic convenience, accepting this known unsoundness.
