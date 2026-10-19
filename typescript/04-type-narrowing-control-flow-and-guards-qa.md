# 04 — Type Narrowing, Control Flow & Guards

> Deep dive into Control Flow Analysis (CFA), built-in type narrowing (`typeof`, `instanceof`, `in`), User-Defined Type Guards (`is`), Inferred Type Predicates (TS 5.5), Assertion Functions (`asserts`), Closure Narrowing Preservation (TS 5.4), and Disallowed Truthy Checks (TS 5.6).

---

## 📑 Table of Contents
1. [Control Flow Analysis (CFA) & Built-in Narrowing](#1-control-flow-analysis-cfa--built-in-narrowing)
2. [User-Defined Type Guards & Inferred Type Predicates (TS 5.5)](#2-user-defined-type-guards--inferred-type-predicates-ts-55)
3. [Assertion Functions & Closure Narrowing (TS 5.4)](#3-assertion-functions--closure-narrowing-ts-54)
4. [Disallowed Truthy Checks & Traps (TS 5.6)](#4-disallowed-truthy-checks--traps-ts-56)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Control Flow Analysis (CFA) & Built-in Narrowing

### Q1: How does TypeScript's Control Flow Analysis (CFA) engine track and compute variable types across branching code?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[CFA]` `[Compiler-Internals]` `[Flow-Graph]`

**Answer:**
TypeScript's **Control Flow Analysis (CFA)** engine operates during the type-checking phase. It constructs a **Directed Acyclic Graph (DAG)** of control flow nodes representing basic blocks, branches, loops, and return statements.

```text
                  ┌──────────────────────┐
                  │ let x: string | null │
                  └──────────┬───────────┘
                             │
                     Branch: if (x !== null)
                             ├──────────────────────────┐
                             ▼                          ▼
                  ┌──────────────────────┐   ┌──────────────────────┐
                  │ True Path:           │   │ False Path:          │
                  │ Type(x) = string     │   │ Type(x) = null       │
                  └──────────────────────┘   └──────────────────────┘
```

1. **Flow Nodes:** Every assignment, branch condition (`if`, `switch`, ternary), and loop creates a `FlowNode`.
2. **Backward Reachability:** When an identifier `x` is referenced, the type checker walks backward up the flow graph from that point to all reaching flow nodes, calculating the intersection/subtraction of possible types.
3. **Narrowing by Subtraction:** When a condition is checked (e.g., `typeof x === 'string'`), the "true" branch narrows `x` to `string`, and the "false" branch subtracts `string` from the original union (`(string | number) \ string = number`).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does reassigning a variable reset its narrowed type?"  
*Senior Answer:* Yes! In TypeScript, variables declared with `let` have their type recalculated at every assignment based on the assigned expression:
```typescript
let val: string | number = "hello";
// Type of val is 'string' here
val = 42;
// Type of val is 'number' here
```

---

### Q2: Why does `instanceof` narrowing fail when working across iframes, Web Workers, or Node.js `vm` realms?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Instanceof]` `[Prototypes]` `[Cross-Realm]`

**Answer:**
`instanceof` checks if the prototype property of a constructor appears anywhere in the prototype chain of an object (`obj.__proto__ === Constructor.prototype`).

In JavaScript, **each realm (iframe, Worker, or Node.js `vm` context) has its own distinct global execution context and memory heap**. The `Array`, `Date`, or `Error` constructor in Iframe A is a completely different object reference from the `Array` constructor in Parent Window B:

```typescript
// Inside parent window:
const iframe = document.querySelector('iframe')!;
const foreignArray = iframe.contentWindow!.eval('[1, 2, 3]');

// 🐛 RUNTIME BUG:
console.log(foreignArray instanceof Array); // FALSE!
// Prototype chain: foreignArray -> IframeArray.prototype !== MainWindowArray.prototype
```

#### How TypeScript is Affected:
If you rely on `instanceof Array` or `instanceof CustomError` across realm boundaries, TypeScript's compile-time narrowing will assume the branch works, but the runtime check will fail!

#### Senior Fix:
Use brand properties, structural duck-typing, or global standard guards:
- For arrays: Use `Array.isArray(x)` (which is cross-realm safe in ES5+).
- For custom classes: Use a distinct discriminant property (e.g., `readonly kind: 'CustomError'`).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How does the `in` operator compare for cross-realm narrowing?"  
*Senior Answer:* The `in` operator checks property presence directly on the object shape:
```typescript
if ('radius' in shape) {
  // Safe across realms because it inspects properties, not prototype identities!
}
```

---

## 2. User-Defined Type Guards & Inferred Type Predicates (TS 5.5)

### Q3: What is the `val is T` return type syntax in User-Defined Type Guards, and how does it instruct the compiler?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Practical Coding  
**Tags:** `[Type-Guards]` `[Type-Predicates]` `[Narrowing]`

**Answer:**
A **User-Defined Type Guard** is a function whose return type is a **Type Predicate** of the form `paramName is TargetType`.

When the function returns `true`, TypeScript's Control Flow Analysis narrows `paramName` to `TargetType` inside the calling block:

```typescript
interface NetworkError {
  kind: "network";
  statusCode: number;
}

interface ValidationError {
  kind: "validation";
  fieldErrors: Record<string, string>;
}

type AppError = NetworkError | ValidationError;

// User-Defined Type Guard:
export function isNetworkError(err: AppError): err is NetworkError {
  return err.kind === "network" && typeof (err as NetworkError).statusCode === "number";
}

// In an error handler:
function handle(err: AppError) {
  if (isNetworkError(err)) {
    // TypeScript automatically narrows 'err' to NetworkError!
    console.error(`HTTP status: ${err.statusCode}`);
  } else {
    // Narrowed to ValidationError!
    console.error(err.fieldErrors);
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can a type guard function accept `unknown` as its parameter?"  
*Senior Answer:* Yes, and this is the gold standard when validating untrusted external data:
```typescript
export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}
```

---

### Q4: Explain the historic `.filter(Boolean)` gotcha, and how **TypeScript 5.5 Inferred Type Predicates** permanently resolved it.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Version Evolution (TS 5.5)  
**Tags:** `[TS-5.5]` `[Inferred-Type-Predicates]` `[Filter-Boolean]`

**Answer:**
#### The Historic Gotcha (TypeScript 1.0 through 5.4):
In older TypeScript, filtering an array to eliminate `null` and `undefined` failed to narrow the resulting array:

```typescript
const items: (string | null | undefined)[] = ["alpha", null, "beta", undefined];

// Historically inferred type: (string | null | undefined)[]!
// TypeScript did NOT realize null/undefined were filtered out!
const filtered = items.filter(x => x !== null && x !== undefined);

// Developer was forced to write a manual type guard boilerplate:
const safe = items.filter((x): x is string => x !== null && x !== undefined);
```

#### The Paradigm Shift in TypeScript 5.5:
**TypeScript 5.5 introduced Inferred Type Predicates.** The compiler now analyzes the return expression of a function; if it returns a boolean checking the type of a parameter, TypeScript automatically infers a type predicate (`x is NonNullable<T>`) without the developer typing anything!

```typescript
// In TypeScript 5.5+:
const items: (string | null | undefined)[] = ["alpha", null, "beta", undefined];

// Automatically inferred return type: string[]!
const clean = items.filter(x => x != null);

// Built-in Boolean function also automatically narrows:
const truthyItems = items.filter(Boolean); // Inferred: string[]!
```

#### How it Works Under the Hood:
When checking a function declaration without an explicit return type:
1. TypeScript checks if all return statements return a boolean expression.
2. It checks if the condition narrows the input parameter.
3. If it does, the signature's return type is automatically inferred as `param is NarrowedType` instead of `boolean`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Will TypeScript 5.5 infer a type predicate for functions with multiple complex statements?"  
*Senior Answer:* Only if all code paths consistently narrow the parameter. If a branch returns a boolean that does not guarantee narrowing (e.g., checking an unrelated global flag or multiple variables), it safely falls back to standard `boolean`.

---

## 3. Assertion Functions & Closure Narrowing (TS 5.4)

### Q5: What are Assertion Functions (`asserts condition`, `asserts val is T`), and how do they differ from Type Guards?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Assertion-Functions]` `[Asserts]`

**Answer:**
- **Type Guards (`val is T`):** Return a boolean. The caller must wrap the variable in an `if (...)` statement to trigger narrowing.
- **Assertion Functions (`asserts val is T`):** Throw an exception if the check fails and return `void`. **They narrow the variable for the entire remainder of the scope without an `if` block!**

```typescript
// Form 1: General condition assertion
function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

// Form 2: Type assertion function
function assertIsUser(val: unknown): asserts val is { id: string; name: string } {
  if (
    typeof val !== "object" ||
    val === null ||
    !("id" in val) ||
    !("name" in val)
  ) {
    throw new Error("Invalid User object");
  }
}

function processIncoming(raw: unknown) {
  // raw is 'unknown' here
  assertIsUser(raw);
  
  // From this line downward, 'raw' is guaranteed to be { id: string; name: string }:
  console.log(raw.id.toUpperCase());
  console.log(raw.name.trim());
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why must assertion functions be written as function declarations or const function expressions with explicit return types?"  
*Senior Answer:* TypeScript requires an explicit `asserts` annotation on the function signature. You cannot infer an assertion signature automatically.

---

### Q6: Explain Closure Narrowing Preservation introduced in TypeScript 5.4. What was the historic bug?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction & Feature Deep-Dive  
**Tags:** `[TS-5.4]` `[Closure-Narrowing]` `[Control-Flow]`

**Answer:**
#### The Historic Problem (Prior to TS 5.4):
TypeScript previously invalidated type narrowing whenever a variable was accessed inside a nested function (closure), because it conservatively assumed the callback could be executed later after the variable was mutated:

```typescript
function executeOperation(url: string | null) {
  if (url !== null) {
    // url is narrowed to 'string' here.
    
    // In TS 5.3 and below:
    const fetcher = () => {
      // ❌ Error in TS <= 5.3: 'url' is possibly 'null'!
      // TypeScript forgot that 'url' was narrowed!
      fetch(url); 
    };
  }
}
```

#### The TypeScript 5.4 Advancement:
TypeScript 5.4 introduced **Preserved Narrowing in Closures**. The CFA engine now inspects whether the narrowed variable is ever reassigned anywhere in the function body:
- If the variable is **never reassigned** after the closure is created, the narrowed type is **preserved inside the closure**!
- If the variable is reassigned later, TypeScript conservatively reverts to the widened type.

```typescript
// In TS 5.4+:
function executeOperation(url: string | null) {
  if (url !== null) {
    // ✅ Valid in TS 5.4+: 'url' remains 'string' inside the closure!
    const fetcher = () => fetch(url);
    fetcher();
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if `url` is reassigned after the closure definition?"  
*Senior Answer:*
```typescript
function executeOperation(url: string | null) {
  if (url !== null) {
    const fetcher = () => fetch(url); // ❌ Error: 'url' is possibly 'null'!
    url = null; // Reassignment detected! TypeScript invalidates narrowing inside the closure.
  }
}
```

---

## 4. Disallowed Truthy Checks & Traps (TS 5.6)

### Q7: What are Disallowed Truthy and Nullish Checks introduced in TypeScript 5.6?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[TS-5.6]` `[Disallowed-Checks]` `[Bug-Prevention]`

**Answer:**
Developers frequently write unintentional bugs by testing conditions that are **always truthy** or **always falsy** (e.g., testing if a function declaration is truthy instead of calling it, or checking if an object literal is null).

In **TypeScript 5.6**, the compiler added strict diagnostics that flag expressions that can never evaluate to anything else:

```typescript
// 1. Function reference tested without calling it:
function isValid(): boolean {
  return true;
}

// 🐛 BUG: Forgot parentheses '()' on function call!
// In TS <= 5.5: Compiles silently (functions are always truthy).
// ❌ In TS 5.6+: Compile Error!
// Error: This condition will always return true since this function is always defined.
// Did you mean to call it instead?
if (isValid) {
  // ...
}

// 2. Regular Expression literal tested:
// ❌ In TS 5.6+: Error: This condition will always return true since JavaScript RegExp literals are always truthy.
if (/^[a-z]+$/) {
  // ...
}

// 3. Array literal tested:
// ❌ In TS 5.6+: Error: This condition will always return true since array literals are always truthy.
if ([]) {
  // ...
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What if you intentionally want to check if an optional callback passed via props exists?"  
*Senior Answer:* If the function can be `undefined` (e.g., `cb?: () => void`), checking `if (cb)` is completely valid and encouraged in TS 5.6 because `cb` has type `(() => void) | undefined`, which is NOT always truthy.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q8: How does the `switch (true)` idiom work in TypeScript 5.3+ for pattern matching?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Switch-True]` `[TS-5.3]`

**Answer:**
TypeScript 5.3 refined Control Flow Analysis so that `switch (true)` correctly narrows variables across each `case` condition:

```typescript
type ResponseData = string | number | { error: string };

function processResponse(res: ResponseData) {
  switch (true) {
    case typeof res === "string":
      return res.toUpperCase(); // res is narrowed to 'string'
    case typeof res === "number":
      return res.toFixed(2);    // res is narrowed to 'number'
    default:
      return res.error;        // res is narrowed to '{ error: string }'
  }
}
```

---

### Q9: Why doesn't `Array.isArray(x)` narrow a tuple `[string, number]` into individual element types?
**Difficulty:** 🔴 Senior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Array-IsArray]` `[Tuples]`

**Answer:**
Tuples are represented at runtime as standard JavaScript `Array` objects. `Array.isArray(x)` narrows to `any[]` or `unknown[]`, which is **wider** than the tuple. Because the compiler cannot know the length or specific indices of an array from `Array.isArray` alone, it cannot preserve specific tuple positions.

---

### Q10: Can a user-defined type guard narrow `any` into a specific type?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Any]` `[Type-Guards]`

**Answer:**
**Yes!** Type guards are specifically designed to narrow from wide types (`any` or `unknown`) into specific concrete types:
```typescript
function isString(val: any): val is string {
  return typeof val === 'string';
}
const x: any = "hello";
if (isString(x)) {
  // x is strictly 'string' here, not 'any'!
}
```
