# 08 — Classes, OOP & Modern Decorators

> Deep dive into Class typings, TypeScript `private` vs JavaScript `#private` fields, parameter properties, the `override` keyword, and ECMAScript Stage 3 Decorators (TS 5.0+) vs Legacy Experimental Decorators.

---

## 📑 Table of Contents
1. [Class Encapsulation: TS `private` vs JS `#private`](#1-class-encapsulation-ts-private-vs-js-private)
2. [Parameter Properties & `--erasableSyntaxOnly`](#2-parameter-properties---erasablesyntaxonly)
3. [The `override` Keyword & Polymorphism](#3-the-override-keyword--polymorphism)
4. [ECMAScript Stage 3 Decorators (TS 5.0+) vs Experimental](#4-ecmascript-stage-3-decorators-ts-50-vs-experimental)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Class Encapsulation: TS `private` vs JS `#private`

### Q1: What is the critical runtime difference between TypeScript's `private` modifier and native JavaScript private fields (`#private`)?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Private-Fields]` `[Encapsulation]` `[Runtime-Security]`

**Answer:**
This is one of the most frequently asked senior interview questions on TypeScript classes.

```text
TypeScript `private`:    Compile-time illusion (Erased in emitted JS, accessible at runtime!)
JavaScript `#private`:    Engine-level hard private (Stored in private slots, inaccessible outside!)
```

```typescript
class Account {
  private balance: number = 1000;
  #secretApiKey: string = "secret_abc123";

  getBalance() { return this.balance; }
}

const acc = new Account();

// ❌ TypeScript Compile-Time Error:
// Property 'balance' is private and only accessible within class 'Account'.
// acc.balance;

// ⚠️ BUT AT RUNTIME IN JAVASCRIPT:
// Bracket notation bypasses TypeScript checking!
console.log((acc as any).balance); // 1000! (Completely accessible!)
console.log(acc["balance"]);       // 1000!

// HOWEVER, WITH NATIVE #private:
// ❌ Runtime SyntaxError: Private field '#secretApiKey' must be declared in an enclosing class!
// console.log(acc.#secretApiKey);
// (acc as any)['#secretApiKey']; // Returns undefined!
```

#### Under the Hood:
- **`private balance`:** The compiler strips the `private` keyword. In the output JavaScript, `this.balance = 1000;` is a standard, enumerable property on the instance.
- **`#secretApiKey`:** The JavaScript engine (V8) places `#secretApiKey` into an internal, non-enumerable **Private Slot** (`[[PrivateElements]]`). No prototype inspection, `Object.keys()`, or bracket reflection can access it.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "When should you prefer `#private` over `private`?"  
*Senior Answer:* Always use `#private` when writing security-sensitive code, enterprise libraries, or SDKs where internal invariants or secrets must not be accessed or monkey-patched by consumer code.

---

## 2. Parameter Properties & `--erasableSyntaxOnly`

### Q2: What are Parameter Properties, and why are modern runtimes phasing them out via `--erasableSyntaxOnly`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Modern Standards (TS 5.8)  
**Tags:** `[Parameter-Properties]` `[ErasableSyntaxOnly]` `[TS-5.8]`

**Answer:**
**Parameter Properties** are shorthand syntax that combines constructor argument declaration with automatic member field initialization:

```typescript
// Shorthand:
class User {
  constructor(public readonly id: string, private email: string) {}
}

// Emits JavaScript:
class User {
  constructor(id, email) {
    this.id = id;
    this.email = email;
  }
}
```

#### Why They Are Being Phased Out:
Parameter properties require the TypeScript compiler to **generate new JavaScript code inside the constructor body**. 

Modern runtime environments (such as Node.js 22+ with `--experimental-strip-types`, Bun, and Deno) strive to execute TypeScript by simply **stripping type annotations**. They do not perform AST transformations. 

In **TypeScript 5.8**, the flag `--erasableSyntaxOnly` flags parameter properties as an error, requiring standard explicit field declarations:

```typescript
// Modern erasable syntax:
class User {
  readonly id: string;
  private email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }
}
```

---

## 3. The `override` Keyword & Polymorphism

### Q3: What problem does the `override` keyword solve, and which `tsconfig.json` flag enforces it?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Override]` `[NoImplicitOverride]` `[OOP]`

**Answer:**
In OOP codebases, subclasses frequently override base class methods. If a base class method is later renamed or refactored, the subclass method silently becomes an orphaned new method, causing undetected logic bugs:

```typescript
class BaseService {
  // Developer refactors method from 'cleanup()' to 'dispose()'
  dispose(): void {
    console.log("Base disposal");
  }
}

class ChildService extends BaseService {
  // 🐛 SILENT BUG: The developer thought they were overriding cleanup(),
  // but now cleanup() never gets called by the base lifecycle!
  cleanup(): void {
    console.log("Child cleanup");
  }
}
```

#### The `override` Solution:
When `"noImplicitOverride": true` is enabled in `tsconfig.json`, TypeScript **mandates** the `override` keyword on any method overriding a parent method:

```typescript
class ChildService extends BaseService {
  // ❌ Compile Error: This member cannot have an 'override' modifier 
  // because it is not declared in the base class 'BaseService'.
  override cleanup(): void {
    console.log("Child cleanup");
  }
}
```

---

## 4. ECMAScript Stage 3 Decorators (TS 5.0+) vs Experimental

### Q4: Compare legacy `experimentalDecorators` with official ECMAScript Stage 3 Decorators (TS 5.0+).
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Evolution  
**Tags:** `[Decorators]` `[Stage-3]` `[TS-5.0]`

**Answer:**
Decorators underwent a decade-long evolution in TC39:

| Feature | Legacy Experimental Decorators | Stage 3 Decorators (TS 5.0+) |
|---|---|---|
| **`tsconfig.json` Flag** | `"experimentalDecorators": true` | No flag required (Standard JS feature) |
| **Metadata Dependency** | Requires `reflect-metadata` | Standard context objects (`ClassMethodDecoratorContext`) |
| **Parameter Decorators** | Supported (`@Inject() param`) | Not yet supported in standard TC39 |
| **Type Checking** | Loose, cannot transform method signatures | Strictly typed; can replace/wrap targets |
| **Runtime Syntax** | Complex `__decorate` helper polyfill | Built-in native specification |

#### Implementing a Modern Stage 3 Method Decorator:
```typescript
export function logged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const methodName = String(context.name);

  function replacementMethod(this: This, ...args: Args): Return {
    console.log(`[START] ${methodName} called with args:`, args);
    const start = performance.now();
    const result = target.call(this, ...args);
    console.log(`[END] ${methodName} finished in ${(performance.now() - start).toFixed(2)}ms`);
    return result;
  }

  return replacementMethod;
}

class UserService {
  @logged
  calculateTax(amount: number, rate: number): number {
    return amount * rate;
  }
}
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: Why can a TypeScript `class` be used as both a type and a value?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Type-vs-Value]`

**Answer:**
A class declaration introduces two symbols simultaneously:
1. **A Value:** The constructor function placed into the runtime JavaScript scope.
2. **A Type:** The interface representing the *instance shape* of the class.

---

### Q6: What is an auto-accessor (`accessor` keyword in TS 5.0+)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Auto-Accessor]` `[Decorators]`

**Answer:**
An auto-accessor (`accessor count: number = 0;`) automatically emits a private backing field with a getter and setter. It is designed specifically to allow Stage 3 field decorators to intercept reads and writes.
