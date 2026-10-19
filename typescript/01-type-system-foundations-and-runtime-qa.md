# 01 — TypeScript Foundations & Runtime Execution Model

> Deep dive into TypeScript's compiler architecture, type erasure boundaries, structural subtyping vs nominal typing, Excess Property Checking (EPC), top and bottom types (`any`, `unknown`, `never`), and branded types.

---

## 📑 Table of Contents
1. [The Compilation Pipeline & Type Erasure](#1-the-compilation-pipeline--type-erasure)
2. [Structural Typing vs Nominal Typing & EPC](#2-structural-typing-vs-nominal-typing--epc)
3. [Type Lattice: Top and Bottom Types](#3-type-lattice-top-and-bottom-types)
4. [Type Assertions & Soundness Escapes](#4-type-assertions--soundness-escapes)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. The Compilation Pipeline & Type Erasure

### Q1: How does the TypeScript compiler (`tsc`) process code under the hood, and what are its core phases?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `[Compiler-Internals]` `[Architecture]` `[AST]`

**Answer:**
The TypeScript compiler (`tsc`) operates as a multi-stage pipeline comprised of five core decoupled subsystems:

```text
┌──────────────┐     Tokens     ┌──────────────┐      AST       ┌──────────────┐
│   Scanner    │ -------------> │    Parser    │ -------------> │    Binder    │
└──────────────┘                └──────────────┘                └──────────────┘
  (Lexical Analysis)              (Syntax Tree)                   (Symbol Table)
                                                                        │
                                                                        ▼
┌──────────────┐   Emitted JS   ┌──────────────┐   Type Checking┌──────────────┐
│   Emitter    │ <------------- │   Checker    │ <------------- │ Symbols/Flow │
└──────────────┘    & .d.ts     └──────────────┘   Diagnostics  └──────────────┘
```

1. **Scanner (`scanner.ts`):** Converts raw UTF-8 source text into a sequential stream of lexical tokens (e.g., `SyntaxKind.ConstKeyword`, `SyntaxKind.Identifier`).
2. **Parser (`parser.ts`):** Consumes tokens and constructs the **Abstract Syntax Tree (AST)** composed of `Node` interfaces. It creates parent-child syntax relationships without understanding semantic meaning or type definitions.
3. **Binder (`binder.ts`):** Walks the AST once to build the **Symbol Table**. It creates a `Symbol` for every identifier declaration (variable, function, class, interface) and associates it with its corresponding scope (container). Symbols merge across identical names (e.g., namespace and class, or interface declaration merging).
4. **Checker (`checker.ts`):** The largest and most complex engine subsystem (~40,000+ lines). It resolves symbols, builds the Control Flow Analysis (CFA) graph, checks assignability, evaluates conditional types, instantiates generics, and produces diagnostic errors (`ts.Diagnostic`).
5. **Emitter (`emitter.ts`):** Transforms the AST into executable target JavaScript (e.g., ES2022, ES6) by stripping type annotations and downleveling modern syntax. It also emits declaration files (`.d.ts`), declaration maps (`.d.ts.map`), and source maps.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When using tools like esbuild, SWC, Babel, or Vite, which of these 5 phases actually run?"  
*Senior Answer:* None of the Checker or Binder phases run! Single-file transpilers run only a Scanner, a Parser, and an Emitter to strip type syntax. They have **no cross-file type awareness**. This is why flags like `--isolatedModules` and `--isolatedDeclarations` exist in `tsconfig.json`—they guarantee code can be safely transpiled by tools that omit the Checker.

---

### Q2: What TypeScript constructs emit JavaScript runtime code, and which are completely erased?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Type-Erasure]` `[Runtime]` `[Emitted-Code]`

**Answer:**
TypeScript follows the principle of **Type Erasure**: all type annotations, interfaces, type aliases, generic type parameters, and type assertions vanish completely during compilation, leaving clean JavaScript.

However, several historic TypeScript features violate pure type erasure and emit runtime JavaScript artifacts:

| TypeScript Construct | Produces Emitted JS? | Emitted Runtime Equivalent |
|---|:---:|---|
| `interface Foo { ... }` | ❌ No | Purely erased (0 bytes in output JS) |
| `type Bar = ...` | ❌ No | Purely erased (0 bytes in output JS) |
| `x as TargetType` | ❌ No | Purely erased (emits just `x`) |
| `<T>(arg: T): T` | ❌ No | Emits plain function `(arg) => arg` |
| `enum Status { Active, Idle }` | ✅ **Yes** | Emits an IIFE creating a bidirectional JS object |
| `namespace Utils { ... }` | ✅ **Yes** | Emits an IIFE attaching properties to a plain object |
| `constructor(public id: string)` | ✅ **Yes** | Emits `this.id = id;` property assignment |
| Legacy experimental decorators | ✅ **Yes** | Emits helper functions (`__decorate`, `__metadata`) |

```typescript
// Input TypeScript:
enum Direction {
  Up = "UP",
  Down = "DOWN"
}

class User {
  constructor(public readonly name: string) {}
}
```

```javascript
// Output JavaScript:
var Direction;
(function (Direction) {
    Direction["Up"] = "UP";
    Direction["Down"] = "DOWN";
})(Direction || (Direction = {}));

class User {
    constructor(name) {
        this.name = name;
    }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is the TypeScript team introducing `--erasableSyntaxOnly` in TypeScript 5.8?"  
*Senior Answer:* Because runtimes like Node.js 22+ (via `--experimental-strip-types`), Bun, and Deno now execute `.ts` files directly by stripping byte ranges corresponding to types. Code-emitting constructs (enums, namespaces, parameter properties) break single-pass type-stripping, requiring a full AST transform. `--erasableSyntaxOnly` disallows these non-erasable syntaxes.

---

### Q3: Why does TypeScript NOT provide runtime safety, and how does this create security vulnerabilities with untrusted inputs?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Runtime-Boundary]` `[Security]` `[Zod]`

**Answer:**
TypeScript types exist **only at compile time**. Once compiled to JavaScript, types evaporate. The JavaScript runtime engine (V8, JavaScriptCore) has no knowledge of TypeScript interfaces or type annotations.

If you cast untrusted network data (HTTP payload, localStorage, third-party webhook) to an interface using `as`, you are giving the compiler a promise that the runtime cannot verify.

```typescript
// Dangerous code assuming compile-time types guarantee runtime reality
interface TransferRequest {
  recipientId: string;
  amount: number;
}

app.post('/transfer', (req, res) => {
  // ⚠️ DANGEROUS: Type assertion bypasses checking!
  const body = req.body as TransferRequest;

  // If an attacker sends: { "recipientId": "user_123", "amount": "100; DROP TABLE users;" }
  // or { "recipientId": "user_123" } (missing amount)
  // TypeScript will NOT stop it, resulting in runtime NaN or crashes:
  executeTransfer(body.recipientId, body.amount);
});
```

To achieve true runtime type safety, you must validate input at runtime boundaries using schema validation libraries like **Zod**, **Valibot**, or **ArkType**, deriving the TypeScript type directly from the schema:

```typescript
import { z } from 'zod';

const TransferRequestSchema = z.object({
  recipientId: z.string().uuid(),
  amount: z.number().positive()
});

// Infer static type directly from the runtime schema:
type TransferRequest = z.infer<typeof TransferRequestSchema>;

app.post('/transfer', (req, res) => {
  const result = TransferRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.format() });
  }

  // result.data is strictly typed AND runtime verified:
  executeTransfer(result.data.recipientId, result.data.amount);
});
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can an API return extra undeclared fields that leak into internal state even if TypeScript types specify only 2 fields?"  
*Senior Answer:* Yes! In JavaScript, an object passed over the wire retains all its runtime properties. If the API returns `{ recipientId, amount, internalApiKey }`, standard TypeScript property access won't strip `internalApiKey`. Without a stripping validator (like `zod.strip()`), that key persists in memory and may accidentally be serialized to logs or downstream databases.

---

### Q4: What is the output of this code at runtime, and what does it reveal about TypeScript's type erasure?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output & Behavior Prediction  
**Tags:** `[Output-Prediction]` `[Type-Erasure]`

```typescript
interface UserProfile {
  id: string;
  displayName: string;
}

function sanitizeUser(input: UserProfile): UserProfile {
  return input;
}

const rawPayload = {
  id: "usr_99",
  displayName: "Ada Lovelace",
  passwordHash: "$2b$12$e8k...",
  isAdmin: true
};

const sanitized = sanitizeUser(rawPayload);

console.log(Object.keys(sanitized));
console.log((sanitized as any).isAdmin);
```

**Answer:**
**Output:**
```text
["id", "displayName", "passwordHash", "isAdmin"]
true
```

**Why:**
1. At compile time, `sanitizeUser` returns a value typed as `UserProfile`. The compiler prevents you from typing `sanitized.passwordHash` directly without a type assertion.
2. At runtime, `sanitizeUser` simply returns the original `input` reference (`return input;`). TypeScript generates **zero code** to delete, filter, or clone the object based on the `UserProfile` interface.
3. `Object.keys(sanitized)` interrogates the underlying JavaScript object in memory, which still contains all four properties.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How would you implement `sanitizeUser` so that it actually strips undeclared keys at runtime while preserving type safety?"  
*Senior Answer:*
```typescript
function sanitizeUser(input: UserProfile): UserProfile {
  return {
    id: input.id,
    displayName: input.displayName
  };
}
```
Always explicitly construct a fresh object containing only the allowed properties when dealing with data boundaries.

---

## 2. Structural Typing vs Nominal Typing & EPC

### Q5: What is Structural Typing, and how does it differ from Nominal Typing?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Type-Theory]` `[Structural-Subtyping]`

**Answer:**
- **Nominal Typing (e.g., Java, C++, C#):** Type compatibility is determined by **explicit declaration and name**. Two classes with identical fields are incompatible unless one explicitly inherits from the other:
  ```java
  // Java (Nominal)
  class Customer { String name; }
  class Supplier { String name; }
  Customer c = new Supplier(); // ❌ Compile Error: Type mismatch
  ```
- **Structural Typing (TypeScript, Go):** Type compatibility is determined entirely by the **shape and structure** of the data. If object $B$ has all the properties that type $A$ requires with compatible types, $B$ is a subtype of $A$ ($B \subseteq A$), regardless of whether it shares a name or declaration:
  ```typescript
  // TypeScript (Structural)
  interface Customer { name: string; }
  interface Supplier { name: string; }
  
  let c: Customer;
  let s: Supplier = { name: "Acme Corp" };
  c = s; // ✅ Compiles without error! Shapes match.
  ```

```text
Structural Typing Philosophy:
"If it walks like a duck and quacks like a duck, 
 TypeScript treats it as a duck."
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is TypeScript 100% structurally sound?"  
*Senior Answer:* No. TypeScript prioritizes developer ergonomics over absolute mathematical soundness. Deliberate unsound areas include:
1. Function parameter bivariance on method signatures.
2. Array index bounds checking (without `noUncheckedIndexedAccess`, arrays assume index access never yields `undefined`).
3. Excess Property Checking (EPC) which selectively rejects structurally compatible object literals.

---

### Q6: Explain Excess Property Checking (EPC). Why does assigning an object literal fail, while assigning an intermediate variable succeeds?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction & Deep-Dive  
**Tags:** `[EPC]` `[Gotchas]` `[Fresh-Literals]`

**Answer:**
Consider this classic interview scenario:

```typescript
interface Point2D {
  x: number;
  y: number;
}

function plotPoint(p: Point2D) {
  console.log(p.x, p.y);
}

// Case 1: Direct literal
plotPoint({ x: 10, y: 20, z: 30 });
// ❌ Error: Argument of type '{ x: number; y: number; z: number; }' 
// is not assignable to parameter of type 'Point2D'.
// Object literal may only specify known properties, and 'z' does not exist in type 'Point2D'.

// Case 2: Intermediate reference
const point3D = { x: 10, y: 20, z: 30 };
plotPoint(point3D); 
// ✅ Compiles cleanly without error!
```

#### Under the Hood Mechanics:
1. **Freshness of Object Literals:** When an object literal is created directly in an assignment or argument expression, the TypeScript compiler marks its type as **"fresh"**.
2. **The EPC Safety Valve:** A fresh object literal cannot be referenced anywhere else in the application. If you provide extra properties on a fresh literal, those properties can never be read through the target interface, which almost certainly indicates a **typo** or a logic bug (e.g., writing `colour: 'red'` instead of `color: 'red'`).
3. **Wiping Freshness:** When the object literal is first assigned to an intermediate variable (`const point3D = ...`), the type widens and **loses its freshness**. When `point3D` is subsequently passed to `plotPoint`, TypeScript reverts to standard **structural subtyping**: `point3D` contains `x` and `y`, so it satisfies `Point2D`. Extra properties are ignored.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How can an API designer disable Excess Property Checking on an interface if extra properties are expected?"  
*Senior Answer:* Add an index signature to the interface:
```typescript
interface Point2DWithExtras {
  x: number;
  y: number;
  [key: string]: unknown; // Disables EPC for arbitrary keys
}
```

---

### Q7: How do you implement Nominal Typing (Branded / Opaque Types) in TypeScript to prevent domain logic bugs?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Branded-Types]` `[Domain-Driven-Design]` `[Type-Safety]`

**Answer:**
Because TypeScript is structural, primitive types like `string` or `number` can easily be accidentally interchanged (e.g., passing a `UserId` into a function expecting an `OrderId`).

To enforce **Nominal Typing**, senior engineers use **Type Branding**: attaching a phantom property with a `unique symbol` to the type. This phantom property exists only at compile time and has zero runtime footprint.

```typescript
// Define unique symbols for brands to prevent collisions across libraries
declare const BrandSymbol: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [BrandSymbol]: TBrand;
};

// Nominal domain types
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type USDAmount = Brand<number, "USDAmount">;

// Constructor / Factory validators (Enforcing runtime boundaries)
export function parseUserId(raw: string): UserId {
  if (!raw.startsWith("usr_")) {
    throw new Error(`Invalid UserId format: ${raw}`);
  }
  return raw as UserId;
}

export function parseOrderId(raw: string): OrderId {
  if (!raw.startsWith("ord_")) {
    throw new Error(`Invalid OrderId format: ${raw}`);
  }
  return raw as OrderId;
}

// Business Logic Function:
function cancelOrder(userId: UserId, orderId: OrderId) {
  console.log(`User ${userId} cancelled order ${orderId}`);
}

const user = parseUserId("usr_101");
const order = parseOrderId("ord_505");

cancelOrder(user, order); // ✅ Valid

// ❌ Compilation Error:
// Argument of type 'UserId' is not assignable to parameter of type 'OrderId'.
// Type 'UserId' is not assignable to type '{ readonly [BrandSymbol]: "OrderId"; }'.
cancelOrder(order, user);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why use `unique symbol` instead of a string property like `__brand: 'UserId'`?"  
*Senior Answer:* If two different libraries both brand with `{ __brand: 'UserId' }`, TypeScript considers them structurally identical. Using `declare const BrandSymbol: unique symbol` guarantees that the brand is globally unique, preventing accidental nominal collisions.

---

## 3. Type Lattice: Top and Bottom Types

### Q8: Explain the TypeScript Type Lattice. Where do `any`, `unknown`, and `never` sit?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Type-Lattice]` `[Top-Type]` `[Bottom-Type]`

**Answer:**
Type systems can be modeled mathematically as a **bounded lattice**:

```text
                        any (Wildcard Escape)
                       /   \
                      /     \
                  unknown   (Top Type: ⊤)
                 /   |   \
                /    |    \
            Object Primitives void
               \     |    /
                \    |   /
               undefined null
                     |
                   never   (Bottom Type: ⊥)
```

1. **`unknown` (Universal Top Type $\top$):**
   - Every single type in TypeScript is assignable to `unknown` ($T \subseteq \text{unknown}$).
   - However, `unknown` is **not assignable to anything** except `unknown` and `any`.
   - You cannot access properties, call, or construct an `unknown` value without first **narrowing** it via type guards or assertions.

2. **`never` (Universal Bottom Type $\bot$):**
   - Represents the empty set ($\emptyset$): a value that can never occur.
   - `never` is assignable to every single type ($\text{never} \subseteq T$).
   - **Nothing** is assignable to `never` except `never` itself.
   - Used for functions that never return (throw or infinite loop) and for exhaustiveness checking.

3. **`any` (Soundness Off-Switch):**
   - Simultaneously acts as both a top type AND a bottom type.
   - Everything is assignable to `any`, and `any` is assignable to everything (except `never`).
   - Disables all type checking on that variable and infects downstream expressions.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the union of `unknown | string` vs the intersection of `unknown & string`?"  
*Senior Answer:*
- Union: `unknown | string` evaluates to `unknown` (because `unknown` encompasses all types).
- Intersection: `unknown & string` evaluates to `string` (because `string` is a subtype of `unknown`).
Similarly:
- Union: `never | string` evaluates to `string` (`never` drops out of unions).
- Intersection: `never & string` evaluates to `never`.

---

### Q9: Why is `any` contagious, and how does `unknown` prevent downstream type degradation?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Any-Contagion]` `[Unknown]` `[Best-Practices]`

**Answer:**
`any` is considered "contagious" because when an expression involves `any`, the result of that expression often becomes `any`, silently disabling type checking across the entire call chain:

```typescript
// 🐛 THE "ANY" CONTAGION TRAP
function parseLegacyData(json: string): any {
  return JSON.parse(json);
}

const data = parseLegacyData('{"user": {"name": "Alice"}}');
// Because 'data' is any, all downstream accesses are unverified:
const user = data.user;              // Type: any
const name = user.nammmme;           // Type: any! (Typo compiles silently!)
const upper = name.toUpperCase();    // Runtime TypeError: Cannot read properties of undefined!
```

#### The `unknown` Solution:
By typing untrusted inputs as `unknown`, TypeScript forces developers to validate shapes before using them:

```typescript
function parseSafeData(json: string): unknown {
  return JSON.parse(json);
}

const data = parseSafeData('{"user": {"name": "Alice"}}');

// ❌ Compile Error: 'data' is of type 'unknown'.
// const user = data.user;

// Developer is forced to narrow:
function isUserPayload(val: unknown): val is { user: { name: string } } {
  return (
    typeof val === "object" &&
    val !== null &&
    "user" in val &&
    typeof (val as any).user?.name === "string"
  );
}

if (isUserPayload(data)) {
  console.log(data.user.name.toUpperCase()); // ✅ 100% type-safe!
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is there any situation where `unknown` cannot be used and `any` is genuinely required?"  
*Senior Answer:* Rarely. One legitimate scenario is inside advanced generic conditional types where you need to test if a type argument can accept *any* arguments regardless of variance (e.g., `type AnyFunction = (...args: any[]) => any`). Even then, `(...args: never[]) => unknown` or `(...args: unknown[]) => unknown` is preferred where possible.

---

### Q10: How do you achieve Compile-Time Exhaustiveness Checking using the `never` type?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Exhaustiveness]` `[Never]` `[Discriminated-Unions]`

**Answer:**
When handling a discriminated union, you want compile-time protection ensuring that if a new variant is added to the union in the future, every `switch` statement across the codebase will break at compile time until handled.

```typescript
type PaymentMethod = 
  | { type: "CREDIT_CARD"; cardNumber: string }
  | { type: "PAYPAL"; email: string }
  | { type: "CRYPTO"; walletAddress: string };

function processPayment(payment: PaymentMethod): void {
  switch (payment.type) {
    case "CREDIT_CARD":
      chargeCard(payment.cardNumber);
      break;
    case "PAYPAL":
      chargePaypal(payment.email);
      break;
    case "CRYPTO":
      transferCrypto(payment.walletAddress);
      break;
    default: {
      // If all cases are handled, 'payment' is narrowed to 'never'.
      // If a developer adds a new variant { type: "APPLE_PAY" } to PaymentMethod,
      // this line fails compilation:
      // Type 'ApplePay' is not assignable to type 'never'.
      const _exhaustiveCheck: never = payment;
      throw new Error(`Unhandled payment type: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why throw an error in the `default` block if `_exhaustiveCheck` has type `never`?"  
*Senior Answer:* Because TypeScript types are erased at runtime! If a backend API passes an invalid payment type like `"KLARNA"` at runtime that bypasses compile-time checks, the `throw new Error` ensures the application fails fast rather than silently proceeding with corrupt state.

---

## 4. Type Assertions & Soundness Escapes

### Q11: What is the difference between Type Annotations, Type Assertions (`as`), and Double Assertions?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Type-Assertion]` `[Double-Assertion]` `[Soundness]`

**Answer:**
1. **Type Annotation (`const x: T = value`):**
   - Instructs the compiler: *"Verify that `value` conforms to `T` right now."*
   - If `value` does not satisfy `T`, the compiler immediately produces a diagnostic error.

2. **Type Assertion (`value as T`):**
   - Instructs the compiler: *"Trust me, I know more about this value than you do. Treat it as `T`."*
   - **Restriction:** TypeScript only allows assertions between types that overlap (where either $A \subseteq B$ or $B \subseteq A$). You cannot directly assert incompatible types:
     ```typescript
     const s = "hello" as number; 
     // ❌ Error: Conversion of type 'string' to type 'number' may be a mistake.
     ```

3. **Double Assertion (`value as unknown as T`):**
   - Because `unknown` is the top type, every type can be asserted to `unknown`.
   - And because `unknown` can be asserted to any type, `as unknown as T` bypasses all assignability checks:
     ```typescript
     const s = ("hello" as unknown) as number; // ✅ Compiles, but HIGHLY UNSOUND!
     ```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When is double assertion (`as unknown as T`) considered acceptable in production code?"  
*Senior Answer:* Only when writing low-level utility libraries, mocking complex circular types in unit tests, or working around limitations in TypeScript's type checker where the developer has mathematically proven the invariant, but the compiler cannot infer it. Every `as unknown as T` should be accompanied by a code comment explaining the proof.

---

### Q12: What does the non-null assertion operator (`!`) do, and why should it be strictly audited?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Non-Null-Assertion]` `[StrictNullChecks]`

**Answer:**
The post-fix exclamation mark (`!`) is the **Non-Null Assertion Operator**. It tells the compiler to strip `null` and `undefined` from a variable's type without performing any runtime check:

```typescript
// Type signature: HTMLElement | null
const button = document.getElementById("submit-btn");

// Compile-time promise: "button is definitely not null"
button!.addEventListener("click", () => console.log("Clicked"));
```

#### Emitted JavaScript:
```javascript
const button = document.getElementById("submit-btn");
// The '!' is completely erased:
button.addEventListener("click", () => console.log("Clicked"));
```

If the element with ID `submit-btn` does not exist in the DOM (e.g., dynamic rendering, network lag, template change), the runtime crashes immediately with:
`Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')`.

**Senior Rule:** Avoid `!`. Prefer optional chaining (`?.`), nullish coalescing (`??`), or explicit runtime guards:
```typescript
if (!button) {
  throw new Error("Missing #submit-btn in DOM");
}
button.addEventListener("click", () => ...);
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Is there any valid use case for the non-null assertion operator?"  
*Senior Answer:* Yes: initializing properties in frameworks where lifecycles guarantee assignment before use (e.g., Angular component `@ViewChild` or `@Input` bindings), or after an operation that TypeScript's control flow analysis cannot trace (such as a map lookup after `map.has(key)` has succeeded).

---

### Q13: What are the differences between `object`, `Object`, and `{}` in TypeScript?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output & Behavior Prediction  
**Tags:** `[Type-System]` `[Primitives]` `[Object-Types]`

**Answer:**
This is one of the most frequently failed senior interview questions:

```text
┌────────────────────────────────────────────────────────┐
│                        {}                              │
│  (Any value except null and undefined. Includes        │
│   primitives like 42, "hello", true, symbols!)         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    Object                        │  │
│  │  (JavaScript Object.prototype interface methods) │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │                 object                     │  │  │
│  │  │  (Any NON-PRIMITIVE type: objects,         │  │  │
│  │  │   arrays, functions, maps, sets)           │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **`object` (lowercase):**
   - Represents **any non-primitive type**.
   - Valid: `{ a: 1 }`, `[1, 2, 3]`, `() => {}`, `new Map()`.
   - Invalid: `42`, `"str"`, `true`, `Symbol()`, `null`, `undefined`.

2. **`Object` (capitalized):**
   - Represents the interface of the JavaScript `Object.prototype` (properties like `toString()`, `valueOf()`).
   - Primitives like `"hello"` and `42` are assignable to `Object` because JavaScript auto-boxes them.

3. **`{}` (empty object literal type):**
   - Represents **any value that is not `null` or `undefined`**.
   - Almost universally misunderstood: developers assume `{}` means "an empty object", but strings, numbers, and booleans are assignable to `{}`!

```typescript
let val1: object;
val1 = { x: 1 }; // ✅
val1 = [1, 2];   // ✅
val1 = 42;       // ❌ Error: Type 'number' is not assignable to type 'object'.

let val2: {};
val2 = { x: 1 }; // ✅
val2 = 42;       // ✅ Shockingly valid!
val2 = "hello";  // ✅ Valid!
val2 = null;     // ❌ Error: Type 'null' is not assignable to type '{}'.
val2 = undefined;// ❌ Error: Type 'undefined' is not assignable to type '{}'.
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you type an actual empty object with NO keys in TypeScript?"  
*Senior Answer:* Use a `Record<string, never>`:
```typescript
type StrictlyEmptyObject = Record<string, never>;

let empty: StrictlyEmptyObject = {}; // ✅
let notEmpty: StrictlyEmptyObject = { a: 1 }; // ❌ Error: Type 'number' is not assignable to type 'never'.
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q14: Why does `typeof null === 'object'` in JavaScript complicate TypeScript type narrowing?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Typeof-Null]` `[Type-Narrowing]`

**Answer:**
Due to a historic bug in the original JavaScript engine (where values were represented as type tags and objects had tag 0, while `null` was the null pointer `0x00`), `typeof null` returns `"object"`.

If you narrow a variable using `typeof x === 'object'`, TypeScript narrows `x` to `object | null`. If you then access `x.prop`, it throws a compile error under `strictNullChecks`:

```typescript
function printLength(x: string | object | null) {
  if (typeof x === 'object') {
    // ❌ Error under strictNullChecks: 'x' is possibly 'null'.
    // console.log(Object.keys(x));
    
    // Correct idiom:
    if (x !== null) {
      console.log(Object.keys(x)); // ✅ x is strictly object
    }
  }
}
```

---

### Q15: What is `unique symbol`, and how does it differ from `symbol`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Symbol]` `[Unique-Symbol]`

**Answer:**
`symbol` represents the primitive type of all JavaScript symbols. 

`unique symbol` is a subtype of `symbol` that represents **one specific, globally distinct symbol literal reference**.
- It can only be declared with `const` or `readonly static`.
- Every `unique symbol` is completely distinct from every other `unique symbol`.
- It is the foundation for creating compile-time branded types, metadata keys, and computed property names:

```typescript
const sym1: unique symbol = Symbol("id");
const sym2: unique symbol = Symbol("id");

// ❌ Error: This comparison appears to be unintentional because the types 
// 'typeof sym1' and 'typeof sym2' have no overlap.
// if (sym1 === sym2) { ... }
```

---

### Q16: What happens if you compile TypeScript code that contains type errors? Does `tsc` emit JavaScript?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Compiler]` `[EmitOnError]`

**Answer:**
**Yes! By default, TypeScript STILL emits JavaScript even if there are compilation errors.**

TypeScript's philosophy is that you should always be able to run and debug your code even if the types are incomplete or invalid (useful during active development).

To halt code emission when errors exist, you must enable `"noEmitOnError": true` in your `tsconfig.json`.

---

### Q17: Why does `Array.isArray()` narrow `unknown` to `any[]` instead of `unknown[]` in older TypeScript versions, and what is the modern signature?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Array-IsArray]` `[Type-Guards]`

**Answer:**
Historically in TypeScript, `Array.isArray(arg)` was typed with `arg is any[]`. This caused an unwanted escape hatch: narrowing an `unknown` value accidentally produced `any[]`, re-introducing type contagion!

In modern TypeScript (v4.0+), the declaration in `lib.es5.d.ts` is:
```typescript
isArray(arg: unknown): arg is any[];
```
While still `any[]` for backwards compatibility with legacy libraries, best practices recommend using a custom type guard:
```typescript
function isUnknownArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}
```

---

### Q18: Can a TypeScript type guard (`x is T`) lie and introduce runtime crashes?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Soundness]` `[Type-Guards]`

**Answer:**
**Yes.** User-defined type guards (`val is T`) are an intentional soundness escape hatch. The compiler trusts your boolean logic unconditionally:

```typescript
interface Admin {
  role: "admin";
  deleteDatabase(): void;
}

// 🐛 BUG: The function always returns true!
function isAdmin(user: any): user is Admin {
  return true; 
}

const normalUser = { role: "guest" };

if (isAdmin(normalUser)) {
  // Compiles cleanly, but crashes at runtime!
  normalUser.deleteDatabase(); // 💥 TypeError: normalUser.deleteDatabase is not a function
}
```
Always thoroughly unit-test user-defined type guards with negative test cases.
