# 03 — Functions, Generics & Type Constraints

> Deep dive into generic functions and classes, constraints with `extends keyof`, function overloads vs unions, `this` parameter typing, `NoInfer<T>` (TS 5.4), and callback return type mechanics (`void` vs `undefined`).

---

## 📑 Table of Contents
1. [Generic Mechanics & Type Constraints](#1-generic-mechanics--type-constraints)
2. [Function Overloading vs Union Signatures](#2-function-overloading-vs-union-signatures)
3. [Modern Inference Control & `NoInfer<T>`](#3-modern-inference-control--noinfert)
4. [Callback Mechanics: `void` vs `undefined`](#4-callback-mechanics-void-vs-undefined)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Generic Mechanics & Type Constraints

### Q1: What are Generics, and why are they superior to using `any` or loose unions for reusable logic?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Generics]` `[Type-Safety]` `[Inference]`

**Answer:**
**Generics** are type variables (placeholders) that allow functions, classes, and interfaces to operate over a variety of types while **preserving the precise type relationship** between input arguments and the return value.

```text
Without Generics (any):
[ Argument: string ] ───▶ function identity(x: any): any ───▶ [ Return: any ] (Type Lost!)

With Generics (<T>):
[ Argument: string ] ───▶ function identity<T>(x: T): T   ───▶ [ Return: string ] (Preserved!)
```

```typescript
// 1. Using 'any' (Destroys type safety):
function firstItemAny(arr: any[]): any {
  return arr[0];
}
const item1 = firstItemAny(["hello", "world"]); // item1 is 'any'! No autocomplete.

// 2. Using Generics (Type relationship preserved):
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}
const item2 = firstItem(["hello", "world"]); // item2 is strictly 'string | undefined'
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is 'Premature Generic Abstraction', and why is it considered a junior anti-pattern?"  
*Senior Answer:* Adding generics when they provide no relationship tracking:
```typescript
// ❌ Junior Anti-Pattern: T is used only once!
function logMessage<T extends string>(msg: T): void {
  console.log(msg);
}
// ✅ Idiomatic Senior: Just use the primitive type:
function logMessage(msg: string): void {
  console.log(msg);
}
```
**Rule of thumb:** If a generic type parameter `T` only appears once in the function signature, you almost certainly do not need a generic!

---

### Q2: How do Generic Constraints work, and how do you implement a type-safe `getProperty` (or `pluck`) function?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Generic-Constraints]` `[Keyof]` `[Indexed-Access]`

**Answer:**
A **Generic Constraint** uses the `extends` keyword to restrict the types that can be passed to a type parameter: `<T extends Constraint>`.

To write a function that safely accesses any property of an object:
1. `T` is constrained to an object.
2. `K` is constrained to the keys of that object: `K extends keyof T`.
3. The return type is the **Indexed Access Type**: `T[K]`.

```typescript
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

interface User {
  id: number;
  name: string;
  isActive: boolean;
  role: "admin" | "member";
}

const user: User = {
  id: 101,
  name: "Grace Hopper",
  isActive: true,
  role: "admin"
};

// Return type is strictly inferred as 'string':
const userName = getProperty(user, "name");

// Return type is strictly inferred as 'number':
const userId = getProperty(user, "id");

// ❌ Compile Error: Argument of type '"salary"' is not assignable to parameter of type 'keyof User'.
// const salary = getProperty(user, "salary");
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How would you type a `pluck` function that extracts an array of values for multiple keys?"  
*Senior Answer:*
```typescript
export function pluck<T, K extends keyof T>(arr: T[], key: K): T[K][] {
  return arr.map(item => item[key]);
}
const names = pluck([user], "name"); // Inferred strictly as string[]
```

---

### Q3: How do Generic Defaults work, and how do you design ergonomic library APIs with them?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Generic-Defaults]` `[Library-Design]`

**Answer:**
Just like default parameter values in JavaScript (`(x = 10) => ...`), TypeScript supports **Default Type Arguments**: `<TData = unknown, TError = Error>`.

Defaults allow callers to omit type parameters for standard use cases, while allowing advanced consumers to provide specific types when needed:

```typescript
// Library API Response Definition:
export interface ApiResponse<TData = unknown, TError = Error> {
  status: "success" | "error";
  data?: TData;
  error?: TError;
  timestamp: number;
}

// Case 1: Simple consumer uses defaults:
function handleGenericResponse(res: ApiResponse) {
  // res.data is unknown, res.error is Error
}

// Case 2: Advanced consumer overrides types:
interface OrderPayload {
  orderId: string;
  total: number;
}

interface CustomApiError {
  code: number;
  retryAfterSeconds: number;
}

type OrderResponse = ApiResponse<OrderPayload, CustomApiError>;
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can a required generic parameter follow a default generic parameter?"  
*Senior Answer:* No! Just like function arguments, required type parameters cannot follow optional (defaulted) type parameters:
`type Invalid<A = string, B> = ...` ❌ Error: A required type parameter cannot follow an optional type parameter.

---

## 2. Function Overloading vs Union Signatures

### Q4: How does Function Overloading work in TypeScript, and why is the implementation signature hidden?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Function-Overloading]` `[Signatures]`

**Answer:**
Function overloading allows a function to accept different combinations of arguments and return different types.

An overloaded function consists of:
1. **One or more Overload Signatures:** Public API contracts visible to external callers.
2. **One Implementation Signature:** The internal function body that handles all cases. **The implementation signature is completely invisible to callers!**

```typescript
// 1. Overload signatures (Public API):
function makeDate(timestamp: number): Date;
function makeDate(m: number, d: number, y: number): Date;

// 2. Implementation signature (Internal only - must be compatible with ALL overloads):
function makeDate(mOrTimestamp: number, d?: number, y?: number): Date {
  if (d !== undefined && y !== undefined) {
    return new Date(y, mOrTimestamp, d);
  } else {
    return new Date(mOrTimestamp);
  }
}

// ✅ Valid calls (Match overloads):
const d1 = makeDate(1609459200000);
const d2 = makeDate(5, 12, 2024);

// ❌ Compile Error: No overload expects 2 arguments!
// Even though the implementation signature allows `(mOrTimestamp, d?)`, callers cannot see it!
// const d3 = makeDate(5, 12);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why does calling an overloaded function with a union type argument often fail?"  
*Senior Answer:* Because TypeScript checks each call against **one overload at a time**, rather than unioning overloads:
```typescript
function format(x: string): string;
function format(x: number): number;
function format(x: string | number): string | number { return x; }

declare const val: string | number;
// ❌ Error: No overload matches this call!
// format(val);
```
To fix this, prefer **conditional types with generics** over function overloads when handling unions:
`function format<T extends string | number>(x: T): T`

---

### Q5: What is the bug in this overloaded function signature?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Overload-Order]` `[Bug-Hunting]`

```typescript
// Find the bug in the overload ordering:
interface Element { tag: string; }
interface HTMLElement extends Element { focus(): void; }

function getElement(selector: string): Element;
function getElement(selector: "input" | "button"): HTMLElement;
function getElement(selector: string): any {
  return document.querySelector(selector);
}

const el = getElement("button");
// Inferred type of 'el': Element (NOT HTMLElement!)
// Calling el.focus() throws a compile-time error!
```

**Answer:**
**The Bug:** Overload signatures are resolved **top-to-bottom**. The first signature that matches the argument is chosen!

Because `"button"` is assignable to `string`, TypeScript immediately matches the first overload (`getElement(selector: string): Element`), ignoring the more specific second overload.

#### The Fix:
Always declare **the most specific overloads first**, followed by wider, more generic overloads:

```typescript
// Correct Order: Specific to General
function getElement(selector: "input" | "button"): HTMLElement;
function getElement(selector: string): Element;
function getElement(selector: string): any {
  return document.querySelector(selector);
}

const el = getElement("button"); // ✅ Strictly inferred as HTMLElement!
```

---

## 3. Modern Inference Control & `NoInfer<T>`

### Q6: What problem does `NoInfer<T>` (Introduced in TypeScript 5.4) solve?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Feature Deep-Dive  
**Tags:** `[NoInfer]` `[TS-5.4]` `[Type-Inference]`

**Answer:**
By default, TypeScript infers a generic type parameter `T` from **every single argument** where `T` appears in the function signature. If two arguments provide conflicting candidate types for `T`, TypeScript **widens `T` to a union**, often masking bugs!

#### The Problem Before TS 5.4:
```typescript
function createPalette<T extends string>(colors: T[], defaultColor: T) {
  return { colors, defaultColor };
}

// 🐛 ACCIDENTAL UNION WIDENING:
// The developer made a typo: "blakc" is not in the array!
// But TypeScript infers T as: "red" | "green" | "blue" | "blakc"
// The typo silently succeeds!
const palette = createPalette(["red", "green", "blue"], "blakc");
```

#### The Solution with `NoInfer<T>`:
`NoInfer<T>` instructs the compiler: *"Do NOT use this position to infer `T`. Infer `T` from other arguments, and then enforce that this argument satisfies `T`."*

```typescript
function createPalette<T extends string>(colors: T[], defaultColor: NoInfer<T>) {
  return { colors, defaultColor };
}

// ✅ TypeScript infers T strictly as: "red" | "green" | "blue" (from the first argument).
// ❌ Compile Error on second argument:
// Argument of type '"blakc"' is not assignable to parameter of type '"red" | "green" | "blue"'.
const palette = createPalette(["red", "green", "blue"], "blakc");
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How did developers implement `NoInfer` before TypeScript 5.4?"  
*Senior Answer:* Using a conditional type hack that deferred evaluation:
```typescript
type LegacyNoInfer<T> = [T][T extends any ? 0 : never];
```
TypeScript 5.4 formalized this into the built-in `NoInfer<T>` intrinsic utility, which is cleaner and evaluates much faster in the compiler.

---

### Q7: How do you strongly type the `this` context inside functions and methods?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[This-Parameter]` `[Context]`

**Answer:**
JavaScript functions frequently run in dynamic `this` contexts (event listeners, DOM handlers, jQuery-style APIs).

TypeScript allows declaring a fake **`this` parameter** as the **first parameter** of a function signature. It is purely compile-time and has zero runtime footprint (erased during compilation):

```typescript
interface DatabaseConnection {
  host: string;
  query(sql: string): Promise<any>;
}

// Declare that this function requires a DatabaseConnection context:
function executeMigration(this: DatabaseConnection, migrationName: string) {
  console.log(`Running ${migrationName} on ${this.host}`);
  return this.query(`APPLY ${migrationName}`);
}

const db: DatabaseConnection = {
  host: "db.internal.production",
  query: async () => []
};

// ❌ Compile Error: 'this' context of type 'void' is not assignable to method's 'this' of type 'DatabaseConnection'.
// executeMigration("001_initial_schema");

// ✅ Valid: Invoked via call/apply with valid context:
executeMigration.call(db, "001_initial_schema");
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you use an arrow function with a `this` parameter?"  
*Senior Answer:* TypeScript disallows declaring a `this` parameter in an arrow function because arrow functions capture `this` lexically from their enclosing scope:
`const fn = (this: DatabaseConnection) => ...` ❌ Compile Error: An arrow function cannot have a 'this' parameter.

---

## 4. Callback Mechanics: `void` vs `undefined`

### Q8: Why does a callback typed as `() => void` permit returning a value, whereas `() => undefined` throws a compile error?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction & Deep-Dive  
**Tags:** `[Void-vs-Undefined]` `[Callbacks]` `[Soundness]`

**Answer:**
This is one of the most important pragmatic design decisions in TypeScript.

```typescript
// Case 1: Callback returns void
function executeTask(cb: () => void): void {
  cb();
}

// Case 2: Callback returns undefined
function executeTaskStrict(cb: () => undefined): void {
  cb();
}

const numbers = [1, 2, 3];
const set = new Set<number>();

// ✅ COMPILES CLEANLY:
// Array.prototype.push returns a number (the new length)!
// But executeTask accepts it!
executeTask(() => numbers.push(4));

// ❌ COMPILE ERROR:
// Type 'number' is not assignable to type 'undefined'.
// executeTaskStrict(() => numbers.push(4));
```

#### Why `void` Allows Return Values in Callbacks:
In TypeScript, when used as a function return type:
- **`void` means:** *"The caller promises to ignore any return value."*
- **`undefined` means:** *"The function MUST explicitly return the literal value `undefined`."*

If `() => void` forbade returning values, standard JavaScript patterns would be illegal. For example:
`[1, 2, 3].forEach(n => set.add(n));`
Here, `Set.prototype.add()` returns the `Set` instance. If `forEach` required `() => undefined`, passing `set.add` would cause a compile error, forcing developers to write verbose boilerplate:
`[1, 2, 3].forEach(n => { set.add(n); });`

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can you use the return value of a function typed as `void`?"  
*Senior Answer:* No! TypeScript forbids using the result:
```typescript
function doSomething(): void { return 42 as any; }
// ❌ Error: An expression of type 'void' cannot be tested for truthiness.
// if (doSomething()) { ... }
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q9: Why does `<T>(x: T) => T` produce a JSX syntax error in `.tsx` files, and how do you fix it?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[TSX]` `[Generics]`

**Answer:**
In a `.tsx` file, the parser encounters `<T>` and assumes it is an opening JSX tag (`<T>...</T>`), throwing an error: `JSX element 'T' has no corresponding closing tag`.

#### Fixes:
1. **Add a generic constraint:**
   ```typescript
   const identity = <T extends unknown>(x: T): T => x;
   ```
2. **Add a trailing comma:**
   ```typescript
   const identity = <T,>(x: T): T => x;
   ```

---

### Q10: What is the difference between `Parameters<T>` and `ConstructorParameters<T>`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Utility-Types]` `[Parameters]`

**Answer:**
- `Parameters<T>` extracts the tuple of argument types from a **regular callable function type**:
  `type Fn = (a: string, b: number) => void;` -> `Parameters<Fn>` is `[a: string, b: number]`.
- `ConstructorParameters<T>` extracts the tuple of argument types from a **constructable class / `new` signature**:
  `type Ctor = new (x: number) => Point;` -> `ConstructorParameters<Ctor>` is `[x: number]`.

---

### Q11: What happens if you define a function with generic `T` and never use `T` in the arguments or return type?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Phantom-Generics]`

**Answer:**
```typescript
function doWork<T>() {
  console.log("Working");
}
```
`T` becomes an unconstrained phantom generic. Since callers can supply any type (`doWork<number>()` or `doWork<string>()`), and it is not used in checking, it acts as dead type code. Avoid phantom generics unless building nominal brand builders.

---

### Q12: Can an optional parameter precede a required parameter in TypeScript functions?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Parameters]` `[Functions]`

**Answer:**
**No.** A required parameter cannot follow an optional parameter:
```typescript
// ❌ Error: A required parameter cannot follow an optional parameter.
// function bad(a?: string, b: number) {}

// ✅ Valid:
function good(b: number, a?: string) {}
```
