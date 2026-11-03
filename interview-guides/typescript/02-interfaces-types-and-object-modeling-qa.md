# 02 — Interfaces, Types & Object Modeling

> Deep dive into `interface` vs `type` aliases, declaration merging, index signatures vs `Record`, `readonly` immutability traps, `exactOptionalPropertyTypes`, and modeling exclusive states with Discriminated Unions & `XOR`.

---

## 📑 Table of Contents
1. [`interface` vs `type` Aliases & Declaration Merging](#1-interface-vs-type-aliases--declaration-merging)
2. [Object Signatures, Modifiers & Immutability](#2-object-signatures-modifiers--immutability)
3. [Discriminated Unions & The Missing `XOR`](#3-discriminated-unions--the-missing-xor)
4. [🎯 Quick-Fire & Trap Questions](#4--quick-fire--trap-questions)

---

## 1. `interface` vs `type` Aliases & Declaration Merging

### Q1: What is the fundamental difference between `interface` and `type` alias, and how does the compiler handle them differently?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Interface-vs-Type]` `[Compiler-Performance]` `[Declaration-Merging]`

**Answer:**
While both `interface` and `type` can describe object shapes and can be extended, they have distinct underlying semantics in the TypeScript compiler:

| Feature | `interface` | `type` Alias |
|---|---|---|
| **Under the Hood** | Defines a named, open object type in the symbol table | Creates an alias (name binding) for any type expression |
| **Declaration Merging** | ✅ **Yes** (Multiple declarations merge automatically) | ❌ **No** (`Duplicate identifier` compile error) |
| **Allowed Types** | Object shapes and class contracts only | Objects, primitives, unions, tuples, mapped, template literals |
| **Inheritance** | `extends` keyword (checks subtyping eagerly) | Intersection `&` (creates a combined type) |
| **Compiler Performance** | Faster relationship checks (cached by symbol name) | Slower with large intersections (re-computes flattened properties) |
| **Error Messages** | Displays the interface name (`User`) | May display flattened expanded type (`{ id: string; name: string }`) |

```typescript
// Interface Declaration Merging (Open to extension):
interface Window {
  gtag?: (...args: any[]) => void;
}
interface Window {
  dataLayer?: any[];
}
// window now has BOTH gtag and dataLayer!

// Type Alias (Closed):
type Coordinates = { x: number; y: number };
// ❌ Error: Duplicate identifier 'Coordinates'.
// type Coordinates = { z: number };
```

#### Compiler Caching Performance Insight:
Interfaces create a flat named type entry in the compiler's internal symbol table. When checking `A extends B`, TypeScript can cache the assignability check by the names `A` and `B`. With type aliases combined with intersections (`type C = A & B`), the compiler must repeatedly compute, intersect, and normalize the property signatures across complex hierarchies.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When MUST you use a `type` alias instead of an `interface`?"  
*Senior Answer:* Whenever you need:
1. Unions: `type Status = 'pending' | 'success' | 'failed';`
2. Primitives: `type Currency = string;`
3. Tuples: `type Point = [number, number];`
4. Mapped Types: `type ReadonlyUser<T> = { readonly [K in keyof T]: T[K] };`
5. Template Literal Types: ``type Event = `on${string}`;``

---

### Q2: What is Declaration Merging, and how is it used for Module Augmentation?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Module-Augmentation]` `[Declaration-Merging]` `[Express]`

**Answer:**
**Declaration Merging** occurs when the TypeScript compiler merges two or more separate declarations with the same name into a single definition.

In real-world enterprise applications, declaration merging is primarily used for **Module Augmentation**—adding custom properties to third-party types (e.g., adding a `user` property to Express's `Request`, or adding custom session attributes to NextAuth).

```typescript
// express-augmentation.d.ts
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    // Augment Express Request with authenticated user and correlation ID:
    currentUser?: {
      id: string;
      email: string;
      tenantId: string;
      roles: string[];
    };
    correlationId: string;
  }
}

// In an Express controller:
import { Request, Response } from 'express';

export function handleInvoice(req: Request, res: Response) {
  // ✅ 100% type-safe access to augmented properties!
  const tenantId = req.currentUser?.tenantId;
  const requestId = req.correlationId;
  res.json({ tenantId, requestId });
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why must you include `import 'express';` at the top of an augmentation file?"  
*Senior Answer:* Without `import 'express';`, TypeScript treats the file as an **ambient script** rather than a **module**. In an ambient script, `declare module 'express'` completely *overwrites* the external module rather than augmenting it, destroying all original Express types!

---

### Q3: What is the difference between `interface Child extends Parent` and `type Child = Parent & { ... }` when properties conflict?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Extends-vs-Intersection]` `[Type-Conflicts]`

**Answer:**
When an extended property has an incompatible type, `interface extends` produces an **immediate compile error**, whereas type intersection `&` produces the **`never` type**!

```typescript
// --- Case 1: Interface extends ---
interface ParentInterface {
  id: string;
}

interface ChildInterface extends ParentInterface {
  // ❌ Immediate Compile-Time Error:
  // Interface 'ChildInterface' incorrectly extends interface 'ParentInterface'.
  // Types of property 'id' are incompatible. Type 'number' is not assignable to type 'string'.
  id: number; 
}

// --- Case 2: Type Intersection ---
type ParentType = {
  id: string;
};

type ChildType = ParentType & {
  id: number;
};

// What is the type of ChildType['id']?
// Answer: string & number === never!
const invalid: ChildType = {
  // ❌ Error: Type 'number' is not assignable to type 'never'.
  id: 123
};
```

**Why this matters:** Type intersections silently collapse conflicting properties into `never`. If this happens deep inside a complex nested type hierarchy, it results in confusing, hard-to-debug compiler errors far downstream when trying to instantiate the object.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can an interface extend a union type?"  
*Senior Answer:* No! An interface can only extend statically known object shapes:
```typescript
type Shape = { kind: 'circle'; radius: number } | { kind: 'square'; size: number };
// ❌ Error: An interface can only extend an object type or intersection of object types with statically known members.
// interface MyShape extends Shape {}
```
To combine with a union, you must use a type alias with an intersection: `type MyShape = Shape & { color: string }`.

---

## 2. Object Signatures, Modifiers & Immutability

### Q4: Compare Index Signatures (`[key: string]: T`) vs `Record<string, T>`. What are their subtle differences?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Index-Signatures]` `[Record]` `[Generics]`

**Answer:**
Both index signatures and `Record` are used to represent dynamic key-value dictionaries, but they differ in capabilities and constraints:

1. **Key Constraints:**
   - Index signatures only allow `string`, `number`, `symbol`, or template literal types as keys. They CANNOT take a specific union of strings:
     ```typescript
     // ❌ Compile Error: An index signature parameter type cannot be a union type.
     // type Actions = { [key: 'create' | 'update']: () => void };
     ```
   - `Record<K, T>` uses mapped types under the hood (`type Record<K extends keyof any, T> = { [P in K]: T }`), so it **accepts unions of literal strings**:
     ```typescript
     // ✅ Works perfectly!
     type Actions = Record<'create' | 'update' | 'delete', () => void>;
     ```

2. **Structural Assignment:**
   - A type with an index signature is an open dictionary.
   - An interface without an index signature cannot be assigned to an index signature dictionary unless it satisfies the dictionary's value type structurally.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the return type of `dictionary['missingKey']` by default, and why is it dangerous?"  
*Senior Answer:* By default, TypeScript assumes index access always returns `T` (not `T | undefined`), even if the key does not exist! Accessing a missing key causes runtime `undefined` errors. To fix this, enable `"noUncheckedIndexedAccess": true` in `tsconfig.json`, which forces the type to `T | undefined`.

---

### Q5: Is `readonly` shallow or deep? How do you prevent nested property mutation?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Readonly]` `[Immutability]` `[DeepReadonly]`

**Answer:**
In TypeScript, the `readonly` property modifier and the built-in `Readonly<T>` utility are **strictly shallow**:

```typescript
interface UserProfile {
  readonly id: string;
  readonly settings: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

const user: UserProfile = {
  id: "usr_1",
  settings: { theme: "dark", notifications: true }
};

// ❌ Error: Cannot assign to 'id' because it is a read-only property.
// user.id = "usr_2";

// ⚠️ SILENT MUTATION BUG:
// Compiles cleanly! 'settings' is readonly, but its nested properties are NOT!
user.settings.theme = "light"; 
```

#### Implementing `DeepReadonly<T>`:
To enforce deep immutability at compile time, senior engineers implement a recursive mapped type:

```typescript
type DeepReadonly<T> = T extends Function | boolean | number | string | null | undefined
  ? T
  : T extends Array<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer M>
  ? ReadonlySet<DeepReadonly<M>>
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };

// Now nested mutations are completely blocked at compile time:
const safeUser: DeepReadonly<UserProfile> = {
  id: "usr_1",
  settings: { theme: "dark", notifications: true }
};

// ❌ Compile Error: Cannot assign to 'theme' because it is a read-only property!
// safeUser.settings.theme = "light";
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does `DeepReadonly` protect objects at runtime?"  
*Senior Answer:* No! TypeScript's `readonly` is completely erased at runtime. To prevent runtime mutation, you must use `Object.freeze()` (which is also shallow unless implemented recursively), or immutable data structures (like Immer).

---

### Q6: What does the `exactOptionalPropertyTypes` compiler flag do, and why is `{ prop?: number }` NOT the same as `{ prop: number | undefined }`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Gotcha  
**Tags:** `[ExactOptionalPropertyTypes]` `[TSConfig]`

**Answer:**
In standard TypeScript, an optional property `foo?: string` implicitly includes `undefined` in its allowed value types:

```typescript
interface UserConfig {
  theme?: string; // Standard TS: allows omitting theme OR assigning undefined
}

const c1: UserConfig = {};                  // ✅ Key omitted
const c2: UserConfig = { theme: undefined }; // ✅ Key explicitly set to undefined
```

However, at runtime in JavaScript, **omitting a key is NOT identical to setting it to `undefined`**:
```javascript
"theme" in c1; // false
"theme" in c2; // true!
Object.keys(c2); // ["theme"] (Iterated in for..in, serialized in JSON.stringify)
```

When `"exactOptionalPropertyTypes": true` is enabled in `tsconfig.json`:
- `foo?: string` means the property **may be omitted**, but if present, its value MUST be a `string`. You **CANNOT** explicitly assign `undefined`!
- To allow explicit `undefined`, you must explicitly declare `foo?: string | undefined`.

```typescript
// With exactOptionalPropertyTypes: true
interface StrictConfig {
  theme?: string;
  cacheTtl?: number | undefined;
}

const a: StrictConfig = {}; // ✅ Valid

// ❌ Error: Type 'undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'.
// const b: StrictConfig = { theme: undefined };

const c: StrictConfig = { cacheTtl: undefined }; // ✅ Explicitly allowed
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is this flag critical when working with database ORMs like Prisma or libraries like `Object.assign`?"  
*Senior Answer:* Because in ORMs, `{ email: undefined }` might mean "clear the email in the DB" or cause a SQL syntax error, whereas omitting the property `{}` means "do not update this field". `exactOptionalPropertyTypes` prevents catastrophic accidental overwrites.

---

## 3. Discriminated Unions & The Missing `XOR`

### Q7: What are the three requirements of a Discriminated Union, and why are they considered the gold standard for state management?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture & State Design  
**Tags:** `[Discriminated-Unions]` `[State-Modeling]` `[Type-Narrowing]`

**Answer:**
A **Discriminated Union** (also called Tagged Union or Algebraic Data Type) requires three components:
1. **Multiple Object Types:** Each representing a distinct valid state.
2. **A Discriminant Property:** A common property across all types with a **literal type** (string, number, boolean) unique to each variant.
3. **A Union Wrapper:** Combining all variants into a single union type.

#### The Anti-Pattern (Bag of Optional Booleans):
```typescript
// 🐛 ANTI-PATTERN: Allows 8 impossible states!
interface AsyncState<T> {
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  data?: T;
}
// What happens if isLoading === true AND isError === true AND data !== undefined?
```

#### The Gold Standard (Discriminated Union):
```typescript
// ✅ IMPOSSIBLE STATES ARE UNREPRESENTABLE:
type AsyncState<T> =
  | { status: "IDLE" }
  | { status: "LOADING" }
  | { status: "SUCCESS"; data: T; timestamp: number }
  | { status: "ERROR"; error: Error };

function renderUI<T>(state: AsyncState<T>) {
  switch (state.status) {
    case "IDLE":
      return "Click to load";
    case "LOADING":
      return "Spinner...";
    case "SUCCESS":
      // TypeScript automatically narrows: 'state.data' is guaranteed to exist!
      return `Loaded data: ${JSON.stringify(state.data)}`;
    case "ERROR":
      // 'state.error' is guaranteed to exist!
      return `Error: ${state.error.message}`;
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can a boolean be used as a discriminant property?"  
*Senior Answer:* Yes! A boolean literal (`true` / `false`) works cleanly:
```typescript
type Result<T> = 
  | { success: true; data: T } 
  | { success: false; error: string };
```

---

### Q8: TypeScript does not have a built-in `XOR` type. How do you implement a mutually exclusive union where a user can provide Property A OR Property B, but NEVER both and NEVER neither?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Type Gymnastics  
**Tags:** `[XOR]` `[Mutual-Exclusion]` `[Type-Gymnastics]`

**Answer:**
If you define `{ a: string } | { b: string }`, TypeScript's structural subtyping allows `{ a: "foo", b: "bar" }` because the object satisfies the shape `{ a: string }`.

To enforce **Mutual Exclusion (XOR)**, you must explicitly set all unselected keys to `never` or `undefined`:

```typescript
// Advanced XOR Implementation:
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

export type XOR<T, U> = (T | U) extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

// Real-world application: Customer contact information
type EmailContact = { email: string };
type PhoneContact = { phone: string };

type ContactInfo = XOR<EmailContact, PhoneContact>;

// ✅ Valid: Exactly one method
const c1: ContactInfo = { email: "user@example.com" };
const c2: ContactInfo = { phone: "+1234567890" };

// ❌ Compile Error: Both provided!
// Type '{ email: string; phone: string; }' is not assignable to type 'ContactInfo'.
// Types of property 'phone' are incompatible: Type 'string' is not assignable to type 'undefined'.
// const c3: ContactInfo = { email: "user@example.com", phone: "+1234567890" };

// ❌ Compile Error: Neither provided!
// const c4: ContactInfo = {};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why set the excluded properties to `never` with an optional modifier (`?: never`) instead of just `never`?"  
*Senior Answer:* If you specify `phone: never`, the key `phone` becomes mandatory to supply, but impossible to satisfy! Setting `phone?: never` means: "The key may be omitted, but if passed, it cannot have any value."

---

## 4. 🎯 Quick-Fire & Trap Questions

### Q9: Why does `Object.keys(obj)` return `string[]` instead of `(keyof T)[]`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Object-Keys]` `[Soundness]` `[Subtyping]`

**Answer:**
Because of **structural subtyping**, an object can always contain *more* runtime properties than its static TypeScript type declares.

```typescript
interface Point {
  x: number;
  y: number;
}

const point3D = { x: 1, y: 2, z: 3 };
const p: Point = point3D; // ✅ Valid structural assignment

// If Object.keys(p) returned Array<keyof Point> ('x' | 'y')[]:
// It would claim that only 'x' and 'y' exist in the array!
// But at runtime, Object.keys(p) returns ['x', 'y', 'z']!
```

If `Object.keys` returned `(keyof T)[]`, looping over keys and indexing `p[key]` where `key` is expected to only be `'x' | 'y'` would be **unsound**. Therefore, TypeScript intentionally types `Object.keys()` as `string[]`.

---

### Q10: What does `Record<string, never>` represent?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Empty-Object]` `[Never]`

**Answer:**
`Record<string, never>` represents an object with **zero allowed keys**—a truly empty object literal:

```typescript
type StrictlyEmpty = Record<string, never>;

let a: StrictlyEmpty = {}; // ✅ Valid

// ❌ Error: Type 'string' is not assignable to type 'never'.
// let b: StrictlyEmpty = { key: "value" };
```

---

### Q11: Can an interface declare a method and a property with the same name?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Interface]` `[Declaration]`

**Answer:**
**No.** TypeScript will throw a compile error: `Duplicate identifier 'foo'`.

However, an interface CAN declare multiple **method overloads** with the same name:
```typescript
interface DataService {
  fetch(id: number): Promise<User>;
  fetch(ids: number[]): Promise<User[]>;
}
```

---

### Q12: What is the difference between `interface Foo { (): void }` and `interface Foo { run(): void }`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Call-Signature]` `[Function-Interface]`

**Answer:**
- `interface Foo { (): void }` is a **Callable Object / Function Signature**. Any variable typed with this interface can be invoked directly as a function: `foo()`.
- `interface Foo { run(): void }` is a standard object with a method property named `run`. It must be invoked as `foo.run()`.
