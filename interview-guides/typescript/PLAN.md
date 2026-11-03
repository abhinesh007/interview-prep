# 📋 TypeScript Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise TypeScript interview Question & Answer guide in `/Users/abhineshgour/learning-space/abhi-agy/interview-prep/typescript`.
> Aligned with modern TypeScript standards (TypeScript 5.0 through 5.8+), compiler internals, advanced type gymnastics, runtime execution boundaries, modern `tsconfig.json` architecture (`NodeNext`, `Bundler`), project references, monorepos, and multi-version evolution (TS 3.x vs 4.x vs 5.x with an exhaustive breakdown of the last 5 releases: 5.4, 5.5, 5.6, 5.7, and 5.8).

---

## 🎯 Design Principles & Structure

Every question in the guide adheres strictly to the repository standards defined in [`CONTEXT.md`](../CONTEXT.md) and [`TEMPLATES.md`](../TEMPLATES.md):

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation breaking down type-system mechanics under the hood. Accompanied by ASCII/Unicode mental model diagrams, comparison tables, and idiomatic, production-ready TypeScript code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Realistic edge-case challenge, production gotcha, or trap scenario]"  
*Senior Answer:* [How a staff engineer resolves the nuance with concrete mitigations, runtime vs compile-time boundaries, and architectural trade-offs.]
```

### Five Mandatory Question Archetypes:
- 📖 **Conceptual & Deep-Dive:** Structural typing, Excess Property Checks (EPC), covariance vs contravariance, control flow analysis graph, type erasure boundaries.
- 💻 **Practical Coding & Refactoring:** Custom generic utility types, user-defined type guards, strongly-typed dot-notation paths, builder patterns, event emitter mappings.
- 🧩 **Output & Behavior Prediction:** Execution ordering vs type checking, fresh object assignment vs referenced assignment, `keyof` on unions vs intersections, callback return `void` vs `undefined`.
- 🐛 **Debug & Bug Hunting:** Subtle type leaks (`any` propagation), `noUncheckedIndexedAccess` runtime crashes, dual-package hazard CJS/ESM import breaks, `exactOptionalPropertyTypes` violations.
- 🏗️ **System Design & Enterprise Architecture:** End-to-end type safety (tRPC, OpenAPI, GraphQL Codegen), monorepo project reference topology (`tsc -b`), zero-runtime overhead branded domain models, compile-time performance tuning (`--generateTrace`).

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|:---:|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation, Topic Index, Difficulty Matrix & Learning Tracks | Index |
| `01` | [`01-type-system-foundations-and-runtime-qa.md`](01-type-system-foundations-and-runtime-qa.md) | Structural vs Nominal Typing, Type Erasure vs Emit, Top & Bottom Types (`any`, `unknown`, `never`), Fresh Literals & EPC, Branded Types | 18–22 |
| `02` | [`02-interfaces-types-and-object-modeling-qa.md`](02-interfaces-types-and-object-modeling-qa.md) | `interface` vs `type`, Declaration Merging, Index Signatures vs `Record`, `readonly` & `as const`, Discriminated Unions & `XOR` | 16–20 |
| `03` | [`03-functions-generics-and-type-constraints-qa.md`](03-functions-generics-and-type-constraints-qa.md) | Generic Functions/Classes, Constraints (`extends keyof`), Overloads vs Unions, `this` Parameter, `NoInfer<T>`, Callback `void` vs `undefined` | 18–22 |
| `04` | [`04-type-narrowing-control-flow-and-guards-qa.md`](04-type-narrowing-control-flow-and-guards-qa.md) | Control Flow Analysis, Type Guards (`is`), Inferred Type Predicates (TS 5.5+), Assertion Functions, Closure Narrowing (TS 5.4+), Exhaustiveness | 18–22 |
| `05` | [`05-advanced-types-conditionals-and-infer-qa.md`](05-advanced-types-conditionals-and-infer-qa.md) | Conditional Types, Distributive Conditionals, `infer` Pattern Matching, Recursive Types, `Awaited<T>`, Mutual Exclusion Types | 18–22 |
| `06` | [`06-mapped-types-and-template-literal-types-qa.md`](06-mapped-types-and-template-literal-types-qa.md) | Mapped Types, Key Remapping (`as`), Template Literal Types, Strongly Typed Event Emitters, Dot-Notation Path Accessors (`Path<T>`) | 16–20 |
| `07` | [`07-tuples-arrays-and-const-assertions-qa.md`](07-tuples-arrays-and-const-assertions-qa.md) | Tuples vs Arrays, Variadic Tuples, Named Elements, `as const` vs `const` Type Parameters (TS 5.0+), Tuple Type Arithmetic | 14–16 |
| `08` | [`08-classes-oop-and-decorators-qa.md`](08-classes-oop-and-decorators-qa.md) | Classes, TS `private` vs JS `#private`, Parameter Properties, Stage 3 Decorators (TS 5.0+) vs Experimental Decorators, `override` Keyword | 16–18 |
| `09` | [`09-type-variance-and-structural-subtyping-qa.md`](09-type-variance-and-structural-subtyping-qa.md) | Covariance, Contravariance, Invariance, Bivariance, Method Shorthand Trap, `strictFunctionTypes`, In/Out Variance Annotations | 15–18 |
| `10` | [`10-built-in-utility-types-and-type-gymnastics-qa.md`](10-built-in-utility-types-and-type-gymnastics-qa.md) | Standard Utility Types Internals, Custom Gymnastics (`DeepPartial`, `UnionToIntersection`, `IsAny`, `IsNever`, `IsEqual`) | 18–22 |
| `11` | [`11-tsconfig-compiler-options-and-module-resolution-qa.md`](11-tsconfig-compiler-options-and-module-resolution-qa.md) | `tsconfig.json` Architecture, Strict Family, Beyond-Strict Flags, `NodeNext` vs `Bundler`, `verbatimModuleSyntax`, `--isolatedDeclarations`, `--erasableSyntaxOnly` | 20–25 |
| `12` | [`12-modules-namespaces-and-esm-cjs-interop-qa.md`](12-modules-namespaces-and-esm-cjs-interop-qa.md) | ESM vs CommonJS Dual-Package Hazard, Package `exports`, Type-Only Imports, Import Attributes (`with`), Ambient Declarations, Native TS Runtimes | 16–20 |
| `13` | [`13-monorepos-project-references-and-build-performance-qa.md`](13-monorepos-project-references-and-build-performance-qa.md) | Project References (`tsc -b`, `composite`), Monorepo TSConfig Topology, Compiler Tracing (`--generateTrace`), Fixing Slow Type Checking | 15–18 |
| `14` | [`14-testing-types-linting-and-ecosystem-tooling-qa.md`](14-testing-types-linting-and-ecosystem-tooling-qa.md) | Type Testing (`expectTypeOf`, `tsd`), `@ts-expect-error` vs `@ts-ignore`, Type-Aware ESLint Rules, Runtime Schemas (Zod) ↔ TypeScript Interop | 15–18 |
| `15` | [`15-enterprise-architecture-and-api-type-safety-qa.md`](15-enterprise-architecture-and-api-type-safety-qa.md) | End-to-End Type Safety (tRPC, GraphQL Codegen), Strongly Typed REST Clients, `Result<T, E>` Pattern, Domain-Driven Design (DDD) Value Objects, RADIO System Design | 12–15 |
| `16` | [`16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md`](16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md) | TS 3.x vs 4.x vs 5.x Architecture Shifts, Deep Dive into Last 5 Versions (5.4, 5.5, 5.6, 5.7, 5.8), 16 Before-vs-After Paradigm Shift Code Comparisons | 20–25 |

---

## 📑 Detailed Section Specifications

---

### 📄 `01-type-system-foundations-and-runtime-qa.md` — Foundations & Runtime Execution Model (18–22 Questions)
> **Core Theme:** Type erasure, structural vs nominal subtyping, compilation boundaries, top/bottom types, and the TypeScript type hierarchy.

#### 1. The Compilation Model & Type Erasure
- What happens during TypeScript compilation? Breakdown of Scanner, Parser, Binder, Checker, and Emitter.
- Which TypeScript constructs produce runtime JavaScript code, and which are completely erased? (Classes/Enums/Decorators vs Types/Interfaces/Generics).
- Why TypeScript does NOT perform runtime type validation, and how relying on compile-time types for untrusted data leads to security flaws.
- 🧩 **Output & Behavior:** Passing an object with extra keys to a function — why does runtime JavaScript retain properties TypeScript claimed were stripped?

#### 2. Structural Typing vs Nominal Typing
- What is structural subtyping ("duck typing" at compile time), and how does TypeScript determine assignability?
- The **Excess Property Checking (EPC)** Gotcha: Why does passing `{ x: 1, y: 2, z: 3 }` directly to a function expecting `Point2D` throw a compile error, while assigning it to a intermediate `const obj` first succeeds?
- Simulating nominal typing in a structural system: Implementing **Branded Types** / Opaque Types (`type USD = number & { readonly __brand: unique symbol }`).
- 💻 **Coding:** Write a branded type constructor and validator function for `EmailAddress` and `UserId` to prevent accidental ID mixing.

#### 3. The Type Hierarchy: Top and Bottom Types
- Visualizing the complete TypeScript type lattice: `any` (top/bottom escape hatch), `unknown` (true top type), `never` (bottom type), `void`, and `undefined`.
- Deep dive: `any` vs `unknown`. Why should modern codebases ban implicit and explicit `any` in favor of `unknown`?
- The role of `never`: Empty unions, unreachable code, and exhaustiveness checking in `switch` statements.
- 🐛 **Bug Hunt:** A function returns `any`, silencing type checking down a 10-function pipeline, leading to `TypeError: undefined is not a function` at runtime.

#### 4. Type Assertions & Non-Null Operator Pitfalls
- `as T` type assertion vs `<T>` syntax vs type annotation (`const x: T`). What does `as` actually tell the compiler?
- Why is `as unknown as T` (double assertion) dangerous, and when is it legitimately required?
- The non-null assertion operator (`!`): Compile-time promise vs runtime reality. What happens when strict null checks are turned on vs off?
- 🎯 **Quick-Fire Section:**
  - What is the difference between `object`, `Object`, and `{}`?
  - Why does `typeof null === 'object'` complicate TypeScript type narrowing?
  - What is the meaning of `unique symbol`?

---

### 📄 `02-interfaces-types-and-object-modeling-qa.md` — Interfaces, Types & Object Modeling (16–20 Questions)
> **Core Theme:** Type aliases vs interfaces, declaration merging, index signatures, mutability controls, and modeling exclusive states.

#### 1. `interface` vs `type` Aliases
- Exhaustive comparison: Syntax, capabilities, and under-the-hood compiler caching differences between `interface` and `type`.
- What is **Declaration Merging**? How does it enable module augmentation and monkey-patching globals (e.g., adding properties to `window` or `express.Request`)?
- Performance under the hood: Why does the TypeScript compiler cache interface relationship checks by shape name faster than intersection types (`&`)?
- When MUST you use a `type` alias instead of an `interface`? (Primitives, unions, tuples, mapped types, template literals).

#### 2. Object Signatures & Property Modifiers
- Index signatures (`[key: string]: string`) vs `Record<string, string>`: Assignability nuances and strict index checking.
- The `readonly` modifier on object properties vs `Readonly<T>` vs Object.freeze(). Is `readonly` shallow or deep?
- Optional properties (`?`) vs explicit `| undefined`: Why `{ a?: number }` and `{ a: number | undefined }` are subtly different under `exactOptionalPropertyTypes`.
- 🐛 **Bug Hunt:** Mutating a nested property inside an object typed with `readonly`, causing undetected state mutations.

#### 3. Discriminated Unions & Exclusive States
- What is a Discriminated Union (Tagged Union / Algebraic Data Type)? The 3 requirements: common literal property, distinct values, union wrapper.
- Modeling impossible states out of existence: Refactoring a buggy `{ isLoading: boolean, error?: Error, data?: Data }` state into a bulletproof discriminated union.
- The "Missing XOR" in TypeScript: How to model a type where a user can provide `email` OR `phone`, but NEVER both and NEVER neither.
- 💻 **Coding:** Implement a generic `XOR<T, U>` utility type that enforces mutual exclusivity across two object shapes.

#### 4. 🎯 Quick-Fire & Trap Questions
- What happens if you assign an empty object literal `{}` to a variable typed with `{ [key: string]: number }`?
- Can an `interface` extend a union `type`? Why or why not?
- How does `Object.keys(obj)` return `string[]` instead of `(keyof T)[]`? Explain why TypeScript is deliberately sound here.

---

### 📄 `03-functions-generics-and-type-constraints-qa.md` — Functions, Generics & Type Constraints (18–22 Questions)
> **Core Theme:** Generic signatures, type parameter constraints, function overloads vs unions, `this` typing, and inference control with `NoInfer`.

#### 1. Generic Functions & Classes
- What are Generics, and how do they differ from `any` or union types in preserving type relationships between arguments and return values?
- Generic Constraints using `extends`: Restricting type parameters (e.g., `<T extends { id: string }>`, `<K extends keyof T>`).
- 💻 **Coding:** Write a strongly-typed `getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` and a type-safe `pluck` function.
- Multiple type parameters and generic defaults: Designing ergonomic library APIs with sensible fallbacks (`<TData = unknown, TError = Error>`).

#### 2. Function Overloads vs Union Signatures
- How do TypeScript function overloads work? The difference between overload signatures and the single implementation signature.
- Why are function overloads often an anti-pattern compared to union types or generics with conditional return types?
- 🧩 **Output & Behavior:** Why does calling an overloaded function with a union type argument (`string | number`) fail even when overloads exist for both `string` and `number`?
- 🐛 **Bug Hunt:** Writing an overload where the order of signatures causes TypeScript to always match the wider signature, hiding more specific overloads.

#### 3. Modern Generic Features & Inference Control
- **`NoInfer<T>` (Introduced in TS 5.4):** What problem does it solve? Preventing TypeScript from using a specific function argument to infer a generic type parameter.
- 💻 **Coding:** Implement a `createPalette<T extends string>(colors: T[], defaultColor: NoInfer<T>)` function where `defaultColor` cannot accidentally widen the `colors` union.
- The `this` parameter in functions: Typing callbacks and method context without runtime overhead.
- Callback return type gotcha: Why does `() => void` permit passing a function that returns a value (e.g., `arr.forEach(x => set.add(x))`), while `() => undefined` throws a compile error?

#### 4. 🎯 Quick-Fire & Trap Questions
- What is premature generic abstraction, and why is `<T extends string>(arg: T): T` often worse than `(arg: string): string`?
- How does generic instantiation depth limit recursion in the compiler?
- What is the difference between `<T>(x: T) => T` and `<T extends unknown>(x: T) => T` in `.tsx` files?

---

### 📄 `04-type-narrowing-control-flow-and-guards-qa.md` — Type Narrowing, Control Flow & Guards (18–22 Questions)
> **Core Theme:** Control Flow Analysis (CFA), type guards, inferred type predicates, assertion functions, and narrowing edge cases.

#### 1. Control Flow Analysis (CFA) Mechanics
- How does the TypeScript compiler construct a Directed Acyclic Graph (DAG) of basic code blocks to compute variable types at each program point?
- Built-in narrowing mechanisms:
  - `typeof` checks (and the `typeof null === 'object'` trap).
  - `instanceof` checks (and why they fail across iframes or worker realms).
  - The `in` operator (property presence narrowing in unions).
  - Truthiness and equality narrowing (`===`, `!==`, `== null`).
- `switch (true)` narrowing: How TypeScript narrows expressions evaluated against dynamic conditions (introduced/refined in TS 5.3).

#### 2. User-Defined Type Guards & Inferred Predicates
- The `val is T` return type syntax: Writing custom user-defined type guards.
- The classic `.filter(Boolean)` trap: Why `['a', undefined].filter(Boolean)` historically inferred `(string | undefined)[]`.
- **Inferred Type Predicates (Introduced in TS 5.5):** How TypeScript 5.5 automatically infers type guards for simple boolean-returning functions without manual `val is T` annotations!
- 💻 **Coding:** Write a type guard that safely validates whether an untrusted API payload conforms to a deeply nested user profile interface.

#### 3. Assertion Functions & Exhaustiveness Checking
- Assertion signatures (`asserts condition`, `asserts val is T`): How they allow assertion helper functions to narrow types in subsequent lines without returning booleans.
- Exhaustiveness checking pattern: Assigning the remainder of a narrowed union to `const _exhaustiveCheck: never = x;`.
- **Closure Narrowing Preservation (Introduced in TS 5.4):** Why callbacks inside functions previously lost narrowed types, and how TS 5.4 preserves narrowing when variables aren't mutated after definition.
- **Disallowed Truthy/Nullish Checks (Introduced in TS 5.6):** How TS 5.6 prevents bugs by flagging always-truthy checks on functions, objects, and regex literals.

#### 4. 🎯 Quick-Fire & Trap Questions
- Why doesn't `Array.isArray(x)` narrow a tuple into individual element types?
- Can a type guard narrow `any` into a specific type?
- What happens if a custom type guard contains a logical error in its runtime body? (Type soundess vs runtime bugs).

---

### 📄 `05-advanced-types-conditionals-and-infer-qa.md` — Conditional Types, `infer` & Pattern Matching (18–22 Questions)
> **Core Theme:** Type-level ternary operators, distributive conditional behavior, pattern matching with `infer`, and recursive type algorithms.

#### 1. Conditional Types Fundamentals
- Anatomy of conditional types: `T extends U ? X : Y`. How they evaluate at compile time.
- Why conditional types act as the "if-else" branching engine of TypeScript's type system.
- Distributive Conditional Types: Why does `(A | B) extends U ? X : Y` distribute to `(A extends U ? X : Y) | (B extends U ? X : Y)`?
- How to PREVENT distribution over naked type parameters: Wrapping in a tuple (`[T] extends [U] ? X : Y`).
- 🧩 **Output & Behavior:** Predict the evaluation of `type Test = string | number extends string ? true : false` vs `type Test<T> = T extends string ? true : false; type Result = Test<string | number>;`.

#### 2. The `infer` Keyword & Pattern Matching
- What is the `infer` keyword, and where can it be used? (Only in the `extends` clause of a conditional type).
- Deconstructing function signatures: Re-implementing built-in `ReturnType<T>`, `Parameters<T>`, and `ConstructorParameters<T>`.
- Deconstructing Promises and async values: Re-implementing `Awaited<T>` with recursive unwrapping.
- Deconstructing Arrays and Tuples: Extracting the first element (`Head<T>`), the rest (`Tail<T>`), and the last element (`Last<T>`).
- 💻 **Coding:** Write an `UnpackPromise<T>` utility and an `ExtractGeneric<T>` helper using `infer`.

#### 3. Advanced Type Gymnastics & Recursive Types
- Recursive conditional types (introduced in TS 4.1): Tail-recursion elimination in TypeScript's type checker (up to 1,000 steps).
- 💻 **Coding:** Implement a type-level `Flatten<T>` that recursively unpacks nested arrays of arbitrary depth (`number[][][][]` -> `number[]`).
- 💻 **Coding:** Implement `UnionToIntersection<U>` using distributive conditional types and contravariant function parameter inference!
- 🐛 **Bug Hunt:** "Type instantiation is excessively deep and possibly infinite" error — diagnosing runaway type recursion and applying base-case guards.

#### 4. 🎯 Quick-Fire & Trap Questions
- What does `infer R` do when multiple candidates exist in covariant positions vs contravariant positions?
- Why does `never extends never ? true : false` return `never` when passed through a distributive generic?
- How do you test if a type is strictly `any`?

---

### 📄 `06-mapped-types-and-template-literal-types-qa.md` — Mapped Types & Template Literal Gymnastics (16–20 Questions)
> **Core Theme:** Transforming object keys and values, key remapping via `as`, string manipulation at compile time, and strongly typed path access.

#### 1. Mapped Types Mechanics
- Syntax and anatomy of mapped types: `[K in Keys]: Value`.
- Adding and removing modifiers: `+readonly`, `-readonly`, `+?`, `-?`.
- Re-implementing standard utilities from scratch: `Partial<T>`, `Required<T>`, `Readonly<T>`, `Record<K, V>`.
- Value transformation: Converting all methods of an interface into async methods returning Promises.

#### 2. Key Remapping via `as`
- Key remapping syntax: `[K in keyof T as NewKey<K>]: T[K]`.
- Filtering out keys at compile time using `as never`: Implementing a strictly typed `OmitByType<T, ValueType>`.
- Prefixing and suffixing keys: Creating `Getters<T>` where property `name` becomes `getName(): string`.
- 💻 **Coding:** Write a mapped type that takes a database model and creates a `UpdateDTO<T>` where all fields are optional except `id`, and all dates are converted to ISO strings.

#### 3. Template Literal Types (TS 4.1+)
- String interpolation at compile time: ``type Event = `on${Capitalize<Action>}` ``.
- Built-in string manipulation intrinsics: `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, `Uncapitalize<S>`.
- Combinatorial explosions: How template literal unions can generate thousands of string variations, and how to prevent compiler slowdowns.
- 💻 **Coding:** Implement a strongly-typed `EventEmitter` where subscribing to `on('user:created', cb)` passes a `User` payload, while `on('order:cancelled', cb)` passes an `Order` payload.

#### 4. Strongly-Typed Dot-Notation Paths
- 💻 **Coding Challenge:** Implement a type-safe `Path<T>` and `PathValue<T, P>` utility that generates all valid dot-notation string paths for a deeply nested object (e.g., `"user.address.street"`).
- Typing form validation libraries: How libraries like React Hook Form or Formik leverage template literal paths for `register("profile.settings.notifications")`.
- 🎯 **Quick-Fire Section:**
  - What happens if you map over a union type using `keyof`?
  - Can template literal types parse integer numbers from strings?
  - How does TypeScript handle infinite template literal loops?

---

### 📄 `07-tuples-arrays-and-const-assertions-qa.md` — Tuples, Arrays & Const Assertions (14–16 Questions)
> **Core Theme:** Fixed-length sequences, variadic tuple types, literal widening, `as const`, and `const` type parameters.

#### 1. Tuples vs Arrays
- Key distinctions: Fixed length, ordered heterogeneous elements vs arbitrary length, homogeneous elements.
- Optional tuple elements (`[string, number?]`) and labeled/named tuple elements (`[lat: number, lng: number]`).
- The `readonly` tuple: Preventing mutation methods like `.push()`, `.pop()`, and `.splice()`.
- 🧩 **Output & Behavior:** Why does TypeScript infer `(string | number)[]` instead of `[string, number]` when declaring `const coords = ['lat', 42]`?

#### 2. Variadic Tuple Types (TS 4.0+)
- Spread elements in tuple positions: Leading, middle, and trailing spreads (`[first: string, ...rest: number[], last: boolean]`).
- 💻 **Coding:** Implement a strongly-typed `concat<T extends readonly unknown[], U extends readonly unknown[]>(arr1: T, arr2: U): [...T, ...U]`.
- Reversing and slicing tuples at compile time.
- Typing curried functions and function composition (`pipe`, `compose`) with variadic tuple types.

#### 3. `as const` vs `const` Type Parameters (TS 5.0+)
- What does `as const` (const assertion) do? Preventing type widening, freezing arrays into readonly tuples, and preserving primitive literals.
- **`const` Type Parameters (TS 5.0):** Declaring `<const T>(arg: T)` to automatically infer arguments as const without callers writing `as const`!
- 💻 **Coding:** Refactor a route definition helper so that users get literal route types without writing `as const` on every object literal.
- 🐛 **Bug Hunt:** Passing a mutable array into a function requiring a tuple or readonly array, causing type mismatch errors.

#### 4. 🎯 Quick-Fire & Trap Questions
- What does `[number, ...number[]]` represent? (A non-empty array!).
- Why does `arr[10]` NOT return `undefined` by default without `noUncheckedIndexedAccess`?
- How does `Object.entries(obj)` type its return tuples, and why?

---

### 📄 `08-classes-oop-and-decorators-qa.md` — Classes, OOP & Modern Decorators (16–18 Questions)
> **Core Theme:** Class typing, runtime vs compile-time encapsulation, ECMAScript Stage 3 decorators vs experimental decorators, and inheritance.

#### 1. Class Modifiers & Privacy Boundaries
- TypeScript access modifiers: `public`, `protected`, and `private`.
- The Crucial Gotcha: **TypeScript `private` vs JavaScript `#private` fields**.
  - TypeScript `private` is purely compile-time; properties are accessible via bracket notation (`obj['secret']`) at runtime!
  - JavaScript `#private` is enforced natively by the JavaScript engine's PrivateSlots and cannot be bypassed.
- Parameter properties (`constructor(public name: string)`): Ergonomics vs compatibility with type-stripping runtimes (and why `--erasableSyntaxOnly` flags them).
- Readonly class properties, static members, and abstract classes vs interfaces.

#### 2. The `override` Keyword & Polymorphism
- The `override` keyword (`noImplicitOverride`): Preventing silent bugs when a base class method is renamed or deleted.
- Polymorphic `this` typing: Chaining builder methods in subclasses while maintaining the derived class type.
- Implementing interfaces vs extending classes: Differences in prototype chain and emitted JavaScript.

#### 3. Decorator Paradigms: Stage 3 (TS 5.0+) vs Legacy Experimental
- Architectural shift: The difference between legacy `experimentalDecorators` + `emitDecoratorMetadata` (used in Angular/NestJS) and official **ECMAScript Stage 3 Decorators** introduced in TypeScript 5.0.
- Anatomy of modern Stage 3 Decorators: Class decorators, Method decorators, Getter/Setter decorators, Field decorators, and Auto-Accessor (`accessor`) decorators.
- The `ClassDecoratorContext` and `ClassMethodDecoratorContext` objects: Adding metadata, initializers, and modifying prototypes without `reflect-metadata`.
- 💻 **Coding:** Write a modern Stage 3 `@logged` method decorator that logs execution time and parameters without using experimental metadata.

#### 4. 🎯 Quick-Fire & Trap Questions
- Why does TypeScript allow a class to be used as both a type and a value?
- Can you use ECMAScript `#private` fields in an object literal?
- What is an "auto-accessor" (`accessor prop: string`)?

---

### 📄 `09-type-variance-and-structural-subtyping-qa.md` — Type Variance & Subtyping Mechanics (15–18 Questions)
> **Core Theme:** Covariance, contravariance, bivariance, invariance, subtyping rules, and `strictFunctionTypes`.

#### 1. Understanding Variance
- What is Variance? How subtyping between complex types relates to subtyping between their component types.
- **Covariance:** If `Dog extends Animal`, then `Array<Dog>` extends `Array<Animal>`. (Output positions).
- **Contravariance:** If `Dog extends Animal`, then `(arg: Animal) => void` extends `(arg: Dog) => void`! (Input/parameter positions).
- **Invariance:** Types must match exactly. When does invariance occur? (Read-write mutable properties, invariant generics).
- **Bivariance:** Both covariant and contravariant. When does TypeScript intentionally allow bivariance for pragmatic reasons?

#### 2. The Method Shorthand Bivariance Trap
- The notorious difference between method syntax and function property syntax:
  ```ts
  interface AnimalShelter {
    add(animal: Animal): void;       // Method syntax: BIVARIANT!
    addFn: (animal: Animal) => void;  // Property syntax: CONTRAVARIANT!
  }
  ```
- Why did TypeScript make method signatures bivariant? (To support `Array<Dog>` being assignable to `Array<Animal>` with methods like `.push()`).
- How `strictFunctionTypes` enforces contravariance on function properties but intentionally ignores method declarations!
- 🐛 **Bug Hunt:** Passing a callback that expects a specific subtype to a method, triggering a runtime crash because method bivariance permitted the unsound assignment.

#### 3. In/Out Variance Annotations (TS 4.7+)
- Explicit variance annotations: `type Getter<out T> = () => T` (Covariant), `type Setter<in T> = (val: T) => void` (Contravariant), `type Container<in out T>`.
- Why explicit variance annotations dramatically accelerate compiler performance on complex generic types.
- 🎯 **Quick-Fire Section:**
  - Are function return types covariant or contravariant?
  - Why is assigning a function with fewer parameters to a function expecting more parameters valid in TypeScript? (e.g., `[1, 2].map(x => x * 2)` ignoring `index` and `array`).

---

### 📄 `10-built-in-utility-types-and-type-gymnastics-qa.md` — Built-in Utility Types & Gymnastics (18–22 Questions)
> **Core Theme:** Under-the-hood implementations of built-in utilities and authoring custom staff-level type transformations.

#### 1. Built-in Utility Types Deep Dive
- Deconstruct and explain every standard utility type:
  - Property modifiers: `Partial<T>`, `Required<T>`, `Readonly<T>`.
  - Object filtering: `Pick<T, K>`, `Omit<T, K>`, `Record<K, T>`.
  - Union manipulation: `Exclude<T, U>`, `Extract<T, U>`, `NonNullable<T>`.
  - Function inspections: `Parameters<T>`, `ConstructorParameters<T>`, `ReturnType<T>`, `InstanceType<T>`.
  - Context & Async: `ThisParameterType<T>`, `OmitThisParameter<T>`, `ThisType<T>`, `Awaited<T>`.
- Why is `Omit<T, K>` implemented as `Pick<T, Exclude<keyof T, K>>` instead of an atomic primitive?

#### 2. Implementing Advanced Custom Utility Types
- 💻 **Coding Challenge 1:** Implement `DeepPartial<T>` and `DeepReadonly<T>` that recursively transform nested objects, arrays, maps, and sets while leaving functions untouched.
- 💻 **Coding Challenge 2:** Implement `IsEqual<A, B>` using function subtyping techniques that correctly distinguish between `any` and other types.
- 💻 **Coding Challenge 3:** Implement `IsAny<T>` and `IsNever<T>`.
- 💻 **Coding Challenge 4:** Implement `TupleToUnion<T>` and `UnionToIntersection<U>`.
- 💻 **Coding Challenge 5:** Implement `Mutable<T>` that strips `readonly` modifiers deeply.

#### 3. 🎯 Quick-Fire & Trap Questions
- Why does `Exclude<'a' | 'b', 'a'>` return `'b'`, but `Omit<{ a: 1, b: 2 }, 'a'>` returns `{ b: 2 }`?
- What does the `ThisType<T>` marker interface do, and where is it used? (Vue options API, Pinia stores).
- How do you construct a utility type that ensures a string union contains no duplicate values?

---

### 📄 `11-tsconfig-compiler-options-and-module-resolution-qa.md` — TSConfig, Compiler Options & Module Resolution (20–25 Questions)
> **Core Theme:** Comprehensive breakdown of `tsconfig.json`, module resolutions (`NodeNext` vs `Bundler`), strict flags, emit flags, isolated compilation, and build speed.

#### 1. The `tsconfig.json` Architecture & Hierarchy
- Anatomy of `tsconfig.json`: `compilerOptions`, `include`, `exclude`, `files`, `references`.
- The `extends` field: Extending base configs, and **Array Support for `extends` (Introduced in TS 5.0)** for multi-inheritance.
- What is `baseUrl` and why is its use without path mapping deprecated or discouraged in modern ESM setups?
- `paths` mapping: How path aliases work in TypeScript, and why they do NOT rewrite import paths in emitted JS without dedicated bundlers or TS 5.7+ flags!

#### 2. The `strict` Flag Family vs "Beyond Strict" Flags
- What does `"strict": true` actually enable?
  - `noImplicitAny`, `noImplicitThis`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`.
- **The "Beyond Strict" Production Flags (Crucial for Senior Interviews):**
  - **`noUncheckedIndexedAccess`:** Why `arr[0]` returns `T | undefined`. Eliminating out-of-bounds runtime crashes.
  - **`exactOptionalPropertyTypes`:** Enforcing that optional properties (`foo?: string`) cannot explicitly receive `undefined` (`{ foo: undefined }`).
  - **`noImplicitOverride`:** Enforcing the `override` keyword on subclass methods.
  - **`noImplicitReturns`:** Guaranteeing all code branches explicitly return values.
  - **`noFallthroughCasesInSwitch`:** Preventing accidental fall-through bugs in `switch` statements.
  - **`noPropertyAccessFromIndexSignature`:** Requiring bracket notation for undefined record access.

#### 3. Module Resolution: `NodeNext` vs `Bundler` vs Legacy
- **`NodeNext` / `Node16`:**
  - Strict adherence to Node.js native ECMAScript Module (ESM) resolution.
  - Why you MUST write relative imports with `.js` extensions even in `.ts` source files (`import { foo } from './foo.js'`).
  - Strict enforcement of `package.json` `"exports"` and `"imports"` subpath mappings.
- **`Bundler` (Introduced in TS 5.0):**
  - Designed for modern bundlers (Vite, Webpack, esbuild, Next.js).
  - Permits extensionless imports, non-JS assets, and flexible package export resolutions.
- Comparing `moduleResolution`: `classic` vs `node10` (legacy `node`) vs `node16` vs `nodenext` vs `bundler`.

#### 4. Emit, Transpilation & Modern Strip Flags
- `noEmit` vs `emitDeclarationOnly`: Using TypeScript purely for type checking while Babel/esbuild/SWC/Vite handles emit.
- **`verbatimModuleSyntax` (Introduced in TS 5.0):**
  - Why it superseded `isolatedModules` and `importsNotUsedAsValues`.
  - The golden rule: "What you write is what is emitted." Requiring explicit `import type` for type-only imports.
- **`--isolatedDeclarations` (Introduced in TS 5.5):**
  - Why it is revolutionary for monorepos and build tools (SWC, Oxlint, esbuild).
  - Requiring explicit return types on exported functions so `.d.ts` files can be generated without running the full type checker!
- **`--erasableSyntaxOnly` (Introduced in TS 5.8):**
  - Banning TS features that emit code (enums, namespaces, parameter properties) for native Node.js type-stripping execution (`node --experimental-strip-types`).
- **`--rewriteRelativeImportExtensions` (Introduced in TS 5.7):**
  - Rewriting `.ts` extensions to `.js` in emitted JavaScript output.

#### 5. Build Speed & `skipLibCheck`
- **The `skipLibCheck: true` Debate:** Why is it almost universal, and what are the hidden risks? (Skipping `.d.ts` checking in `node_modules` vs missing library type mismatches).
- `incremental: true` and `.tsbuildinfo`: How incremental builds cache dependency graphs.
- 🎯 **Quick-Fire Section:**
  - What does `forceConsistentCasingInFileNames` do?
  - What is the difference between `target: "ES2022"` and `module: "ESNext"`?
  - What is `declarationMap` and why does it improve IDE "Go to Definition" in monorepos?

---

### 📄 `12-modules-namespaces-and-esm-cjs-interop-qa.md` — Modules, Namespaces & ESM/CJS Interop (16–20 Questions)
> **Core Theme:** CommonJS vs ECMAScript Modules, the dual-package hazard, package exports, ambient declarations, and import attributes.

#### 1. CommonJS vs ESM in TypeScript
- The deep differences: Static vs dynamic resolution, synchronous `require()` vs asynchronous `import()`, top-level `await`.
- **The Dual-Package Hazard:** What happens when an npm package publishes both CJS and ESM versions, and a consumer imports both (two singleton instances in memory!).
- Using tools like `attw` (*Are the Types Wrong?*) to detect broken declaration maps and export conditions.

#### 2. Package `exports` & Module Augmentation
- Configuring `package.json` for modern TypeScript:
  - The `"exports"` map: `"import"`, `"require"`, and `"types"` conditions.
  - Why `"types"` MUST come first in conditional exports!
- `typesVersions`: Providing fallback type definitions for older TypeScript versions.
- Ambient declarations (`declare module 'foo'`, `declare global`): Augmenting external libraries and setting up global variables.

#### 3. Modern Import Syntax & Attributes
- Type-only imports and exports: `import type { Foo }`, `export { type Bar }`. Why they guarantee zero runtime footprint.
- **Import Attributes (TS 5.3 & 5.8):** Moving from import assertions (`assert { type: 'json' }`) to import attributes (`with { type: 'json' }`).
- Native TypeScript execution: How modern engines (Node.js 22+ with `--experimental-strip-types`, Bun, Deno) run TypeScript directly, and how TypeScript's role is shifting to a pure type-checker.

#### 4. 🎯 Quick-Fire & Trap Questions
- What is the difference between a Script file and a Module file in TypeScript? (The presence of `import`/`export`).
- Why are TypeScript `namespaces` considered legacy in modern codebases?
- What does `esModuleInterop` do under the hood?

---

### 📄 `13-monorepos-project-references-and-build-performance-qa.md` — Monorepos, Project References & Build Performance (15–18 Questions)
> **Core Theme:** Scalable multi-package repositories, `tsc -b`, `composite: true`, build profiling with trace files, and eliminating compiler bottlenecks.

#### 1. Project References & `tsc -b`
- What are Project References and why were they introduced?
- The 4 requirements for project references:
  1. Setting `"composite": true` in referenced projects.
  2. Setting `"declaration": true`.
  3. Configuring `"references": [{ "path": "../lib" }]`.
  4. Building with `tsc --build` (`tsc -b`).
- How project references prevent full recompilation and enable parallel builds.

#### 2. Monorepo Configuration Patterns (Nx, Turborepo, pnpm)
- Designing the tsconfig hierarchy:
  - `tsconfig.base.json`: Shared compiler options (strict flags, module settings).
  - Package `tsconfig.json`: Project references, include/exclude, package-specific paths.
  - Package `tsconfig.lib.json` vs `tsconfig.spec.json`: Separating application code from test files.
- Preventing circular project references across monorepo packages.

#### 3. Profiling & Eliminating Slow Type-Checking
- Diagnosing compiler bottlenecks:
  - Running `tsc --diagnostics` and `tsc --extendedDiagnostics` to inspect check time and memory usage.
  - Generating performance traces: `tsc --generateTrace traceDir` and analyzing them with `@typescript/analyze-trace` or Chrome `about://tracing`.
- Common causes of compiler slowness:
  - Massive unions with thousands of permutations.
  - Deeply recursive conditional types without base-case short-circuiting.
  - Overly broad `include` globs parsing `node_modules` or build artifacts.
  - Missing `skipLibCheck`.
- Leveraging **`--isolatedDeclarations` (TS 5.5+)** to offload `.d.ts` generation to fast native tools (OXC, SWC, Rspack).

#### 4. 🎯 Quick-Fire & Trap Questions
- What is `--stopOnBuildErrors` (introduced in TS 5.6)?
- What is the `.tsbuildinfo` file and should it be committed to Git?
- Why can barrel files (`index.ts`) degrade both type-checking performance and bundler tree-shaking?

---

### 📄 `14-testing-types-linting-and-ecosystem-tooling-qa.md` — Type Testing, Linting & Ecosystem Tooling (15–18 Questions)
> **Core Theme:** Testing types in CI, `@ts-expect-error` vs `@ts-ignore`, type-aware ESLint rules, and runtime schema interop (Zod).

#### 1. Testing Types in Modern CI/CD
- Why unit testing runtime code is not enough: How to write automated tests that assert *types* themselves!
- Tools: `expectTypeOf` (Vitest), `tsd`, `expect-type`.
- Testing type assignability, parameters, return types, and matching exact types (`expectTypeOf<T>().toEqualTypeOf<U>()`).
- Negative testing: Asserting that invalid code produces a compile error.

#### 2. `@ts-expect-error` vs `@ts-ignore`
- Why `@ts-ignore` is banned in high-rigor engineering teams: It suppresses errors indefinitely, even after the code is fixed or refactored.
- Why `@ts-expect-error` is the senior standard: It asserts that an error *must* occur; if the line compiles cleanly without error, TypeScript throws a build error!
- Using `@ts-expect-error` as a type regression test.

#### 3. Type-Aware Linting with typescript-eslint
- How `@typescript-eslint/parser` works with TypeScript's AST.
- Essential type-aware lint rules that catch production disasters:
  - `@typescript-eslint/no-floating-promises` (catching unhandled asynchronous promises).
  - `@typescript-eslint/await-thenable` (preventing awaiting non-promises).
  - `@typescript-eslint/strict-boolean-expressions` (preventing truthy/falsy bugs with numbers and empty strings).
  - `@typescript-eslint/no-misused-promises` (catching async callbacks passed to event listeners or `forEach`).

#### 4. Runtime Schema Validation Interop (Zod / Valibot / ArkType)
- The fundamental divide: Static compile-time types vs dynamic runtime boundary validation.
- Generating static TypeScript types from runtime schemas: `type User = z.infer<typeof UserSchema>`.
- Code generation vs schema-first design: Why modern architectures validate API inputs at the network edge with Zod and infer static types downstream.
- 🎯 **Quick-Fire Section:**
  - What is the performance overhead of type-aware linting in large codebases?
  - What is the AST difference between a `TypeAliasDeclaration` and an `InterfaceDeclaration`?

---

### 📄 `15-enterprise-architecture-and-api-type-safety-qa.md` — Enterprise Architecture & API Type Safety (12–15 Questions)
> **Core Theme:** End-to-end type safety, typed client-server contracts, Domain-Driven Design (DDD) with branded types, and senior system design using the RADIO framework.

#### 1. End-to-End Type Safety Across the Full Stack
- Architectural patterns for zero-duplication type safety:
  - **tRPC:** Sharing router types between backend and frontend without build artifacts or codegen.
  - **GraphQL Code Generator:** Generating typed hooks and query documents from GraphQL schemas.
  - **OpenAPI / Swagger to TypeScript:** Generating typed fetch clients from OpenAPI 3.1 specifications (`openapi-typescript`).
- 💻 **Coding:** Implement a generic, strongly-typed HTTP `ApiClient` wrapper around `fetch` where endpoints, HTTP methods, request bodies, and response types are validated against an API route contract interface.

#### 2. Functional Error Handling: `Result<T, E>`
- Why throwing exceptions creates invisible, untyped error paths in TypeScript.
- Implementing the `Result` / `Either` monad:
  ```ts
  type Result<T, E = Error> = 
    | { ok: true; value: T } 
    | { ok: false; error: E };
  ```
- Exhaustive error handling with pattern matching in business logic.

#### 3. Domain-Driven Design (DDD) with Branded Types
- Value Objects and Entities in TypeScript: Preventing domain corruption (e.g., passing a `CustomerId` into an `OrderId` parameter).
- Implementing immutable domain models with compile-time branding and runtime factory constructors (`createUserId(raw: string): Result<UserId, ValidationError>`).

#### 4. 🏗️ Senior System Design Interview Scenario (The RADIO Framework)
- **Scenario:** Architecting a high-performance, strongly-typed Multi-Tenant Analytics & Feature-Flagging SDK.
  - **R — Requirements:** Zero runtime overhead, sub-millisecond evaluation, typed user traits, strictly typed event tracking with payload schemas, plugin architecture.
  - **A — Architecture:** Core client, typed schema registry, batching pipeline, offline buffer.
  - **D — Data Contracts & Types:** Type-level registry matching event names to payload interfaces using mapped types and template literals.
  - **I — Interface Design:** Fluent builder API with compile-time step enforcement.
  - **O — Optimizations & Trade-offs:** Tree-shaking unused events, avoiding heavy schema validators in browser bundles, caching evaluations.

---

### 📄 `16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md` — Version Evolution, Paradigm Shifts & Last 5 Releases (20–25 Questions)
> **Core Theme:** Comprehensive version evolution guide covering TypeScript 3.x vs 4.x vs 5.x major architecture shifts, an exhaustive deep-dive into the last 5 versions (5.4, 5.5, 5.6, 5.7, 5.8), and before-vs-after code comparisons.

#### 1. Major Architectural & Paradigm Shifts (TS 3.x vs 4.x vs 5.x)
- **Architecture & Performance Overhaul:**
  - In TS 5.0, the compiler was completely migrated from namespaces to ECMAScript modules (ESM). Package size shrank from 63.8 MB to 37.4 MB (~41% reduction!), and build speeds improved by 10–25%.
- **Decorators Evolution:**
  - Experimental Stage 1/2 decorators (`experimentalDecorators` + `emitDecoratorMetadata`) vs official ECMAScript Stage 3 Decorators (TS 5.0+).
- **Import Statements Evolution:**
  - Legacy `import ... = require()` vs ES imports vs Type-only imports (`import type`) vs Import Assertions (`assert`) vs Import Attributes (`with`).
- **Module Resolution Evolution:**
  - `classic` -> `node` (Node 10) -> `Node16` / `NodeNext` (ESM package.json `exports`) -> `Bundler` (Vite, Webpack, esbuild).
- **Enums Evolution:**
  - Numeric Enums -> String Enums -> Const Enums -> Union Enums -> `as const` object literals -> `--erasableSyntaxOnly` (TS 5.8+ banishing enums for direct strip-type execution).

#### 2. Exhaustive Deep Dive into the Last 5 Releases (5.4 – 5.8)

##### 🔹 TypeScript 5.4 Deep Dive
1. **`NoInfer<T>` Utility Type:**
   - Preventing unwanted generic inference from secondary arguments.
   - *Before vs After code comparison:* Type inference in color palettes and state initializers.
2. **Preserved Closure Narrowing:**
   - Previous gotcha: Closures inside functions immediately lost narrowed types.
   - New behavior: TypeScript preserves type narrowing inside closures if the variable is never reassigned after the closure is created.
3. **`--allowImportingTsExtensions` Enhancements:**
   - Support for compiling files that explicitly reference `.ts` extensions in import paths without requiring full emit.

##### 🔹 TypeScript 5.5 Deep Dive
1. **Inferred Type Predicates:**
   - Previous gotcha: `[1, undefined].filter(x => x !== undefined)` inferred `(number | undefined)[]`.
   - New behavior: TypeScript 5.5 automatically infers `x is number` for simple boolean expressions!
2. **`--isolatedDeclarations` Flag:**
   - Enabling fast non-type-checking tools (SWC, Oxlint, esbuild) to generate `.d.ts` declaration files in parallel without running `tsc`.
   - Requiring explicit return types and exported type annotations.
3. **Regular Expression Syntax Checking:**
   - Catching regex syntax errors (invalid quantifier, unclosed group) at compile time.
4. **Hard Deprecation Errors:**
   - Removal of legacy flags deprecated in 5.0 (`--target ES3`, `--noImplicitUseStrict`, `importsNotUsedAsValues`).

##### 🔹 TypeScript 5.6 Deep Dive
1. **Disallowed Nullish and Truthy Checks:**
   - Compiler errors on conditions that are always truthy or always falsy (e.g., `if (fn) { ... }`, `if (/foo/) { ... }`, `if (x => 0) { ... }`).
2. **`--stopOnBuildErrors` Flag:**
   - Immediately halting multi-project builds (`tsc -b`) upon the first error, saving massive CI time in large monorepos.
3. **Typed Native Iterator Helpers:**
   - Proper types for ECMAScript iterator helpers (`IteratorObject`, `.map()`, `.filter()`, `.take()`, `.drop()`).

##### 🔹 TypeScript 5.7 Deep Dive
1. **Checks for Never-Initialized Variables:**
   - Detecting local `let` variables read before they have ever been initialized or assigned a value, fixing a long-standing hole in flow analysis.
2. **`--rewriteRelativeImportExtensions` Flag:**
   - Automatically rewriting relative `.ts` import paths to `.js` in emitted JavaScript output, enabling seamless execution on runtimes supporting native TypeScript type-stripping.
3. **V8 Compile Cache Support:**
   - Snappier CLI execution times by leveraging V8 compile caching in Node.js tools.

##### 🔹 TypeScript 5.8 Deep Dive
1. **`--erasableSyntaxOnly` Flag:**
   - Ensuring the codebase strictly uses TypeScript syntax that can be erased with zero runtime code emission.
   - Bans enums, namespaces, parameter properties, and legacy module declarations.
   - Designed for direct execution in Node.js 22+ (`node --experimental-strip-types`), Bun, and Deno.
2. **Granular Checks for Return Expression Branches:**
   - Stricter branch-by-branch checking in conditional (ternary) return expressions, catching subtle type mismatches in function returns.
3. **Mandatory Import Attributes (`with` vs `assert`):**
   - Enforcing modern ECMAScript import attributes (`with { type: 'json' }`) under `--module nodenext`.
4. **Enhanced ESM/CJS Interoperability:**
   - Improved support for `require(esm)` in hybrid package setups.

#### 3. 16 Before-vs-After Paradigm Shift Code Comparisons
- 16 concrete side-by-side code blocks comparing legacy TypeScript patterns against modern TypeScript 5.x idiomatic patterns:
  1. `as const` manual assertion vs `<const T>` type parameter.
  2. Manual type guard `x is T` in `.filter()` vs Inferred type predicate (TS 5.5).
  3. `experimentalDecorators` vs ECMAScript Stage 3 Decorators (TS 5.0).
  4. Workarounds for generic inference vs `NoInfer<T>` (TS 5.4).
  5. Lost closure narrowing vs Preserved closure narrowing (TS 5.4).
  6. Silent regex runtime bug vs Compile-time regex validation (TS 5.5).
  7. Silent always-truthy function check vs Disallowed truthy check error (TS 5.6).
  8. Uninitialized `let` variable runtime `undefined` vs TS 5.7 compile error.
  9. Import assertions (`assert`) vs Import attributes (`with`) (TS 5.8).
  10. Enums with runtime code emit vs Object literal `as const` / `--erasableSyntaxOnly` (TS 5.8).
  11. `importsNotUsedAsValues` vs `verbatimModuleSyntax` (TS 5.0).
  12. Single `extends` in `tsconfig` vs Array of configs in `extends` (TS 5.0).
  13. `moduleResolution: "node"` vs `moduleResolution: "NodeNext"` & `"Bundler"`.
  14. Loose index signatures vs `noUncheckedIndexedAccess`.
  15. Optional property `{ a?: string }` receiving `undefined` vs `exactOptionalPropertyTypes`.
  16. Full monolithic `tsc` `.d.ts` build vs Fast `--isolatedDeclarations` parallel emit.

---

## 🛠️ Implementation & Quality Checklist

Every question generated across these 16 modules must pass this quality checklist:
- [ ] Contains 12 to 25 detailed questions per module.
- [ ] Structured into 4 to 6 logical thematic sub-sections plus a final **🎯 Quick-Fire & Trap Questions** section.
- [ ] Balanced distribution across difficulty levels (🟢 Junior, 🟡 Mid, 🔴 Senior, 🟣 Principal/Lead).
- [ ] Incorporates all 5 question archetypes (Conceptual, Coding, Output, Bug Hunt, Architecture).
- [ ] Features clean, idiomatic TypeScript examples with realistic naming (no `foo`/`bar`).
- [ ] Mandatory **⚠️ Gotcha / Interviewer Follow-up** block in every question with interviewer probe and senior answer.
- [ ] Explains *why* TypeScript behaves the way it does at compile time and runtime.
