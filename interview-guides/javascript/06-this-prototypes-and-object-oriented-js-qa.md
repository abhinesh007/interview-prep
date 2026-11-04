# 06 — `this` Context, Prototypes & Object-Oriented JavaScript

> Deep dive into the 4 binding rules of `this`, arrow function lexical resolution, prototypal delegation under the hood (`[[Prototype]]` vs `prototype`), ES6 `class` compilation, `#private` brand checks, and prototype pollution risks.

---

## 📑 Table of Contents
1. [The `this` Keyword Resolution Rules](#1-the-this-keyword-resolution-rules)
2. [Arrow Functions vs Regular Functions](#2-arrow-functions-vs-regular-functions)
3. [Prototypes & Prototypal Delegation](#3-prototypes--prototypal-delegation)
4. [ES6 Classes & Hard `#private` Fields](#4-es6-classes--hard-private-fields)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. The `this` Keyword Resolution Rules

### Q1: What determines the value of `this` in JavaScript? Explain the 4 binding rules in order of precedence.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `[This-Binding]` `[Call-Site]` `[Call]` `[Apply]` `[Bind]`

**Answer:**
In JavaScript, `this` is **not** determined by where a function is declared; it is determined strictly by **how the function is called at the call-site**.

The 4 binding rules evaluated in order of priority:

```text
Highest Precedence
   │
   ▼ 1. 'new' Binding:         const obj = new Foo();      -> 'this' is the newly created object
   │
   ▼ 2. Explicit Binding:      fn.call(ctx), fn.bind(ctx)  -> 'this' is explicitly passed context
   │
   ▼ 3. Implicit Binding:      user.getName()              -> 'this' is the containing object (user)
   │
   ▼ 4. Default Binding:       standalone()                -> 'this' is global window (sloppy)
Lowest Precedence                                             or undefined (strict mode)
```

```javascript
function show() {
  console.log(this.name);
}

const obj1 = { name: "Obj 1", show };
const obj2 = { name: "Obj 2" };

// 1. Implicit Binding
obj1.show(); // "Obj 1"

// 2. Explicit Binding overrides Implicit Binding
obj1.show.call(obj2); // "Obj 2"

// 3. Method Borrowing / Lost Context Trap
const detached = obj1.show;
detached(); // undefined (or window.name in non-strict mode)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Can a function bound with `Function.prototype.bind()` be re-bound to a different context by calling `.bind()` or `.call()` on it a second time?"  
*Senior Answer:* **No!** Once a function is bound via `.bind()`, its context is permanently locked. A second `.bind()` or `.call()` simply wraps the already-bound function in another closure. The original target function still executes with the very first bound `this` argument.

---

## 2. Arrow Functions vs Regular Functions

### Q2: How do Arrow Functions resolve `this`, and what internal engine slots do they lack?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Comparison  
**Tags:** `[Arrow-Functions]` `[Lexical-This]` `[Engine-Internals]`

**Answer:**
Arrow functions (`() => {}`) do **not** have their own `this` binding. Instead, they resolve `this` **lexically** via the standard Scope Chain from their enclosing lexical context, exactly like any regular variable (`let` or `const`).

```text
┌────────────────────────────────────────────────────────┐
│         Internal Slots Missing in Arrow Functions      │
├────────────────────────────────┬───────────────────────┤
│ Slot Lacked                    │ Consequence           │
├────────────────────────────────┼───────────────────────┤
│ [[ThisBindingStatus]]          │ Resolves 'this' from  │
│                                │ enclosing lexical scope│
│ [[Construct]]                  │ Cannot be called with │
│                                │ 'new' (throws error)  │
│ [[Prototype]] property         │ Arrow functions have  │
│                                │ no .prototype object  │
│ arguments object               │ Must use rest (...args│
│ new.target                     │ Resolves from outer   │
└────────────────────────────────┴───────────────────────┘
```

**The Object Method Arrow Function Anti-Pattern:**
```javascript
const counter = {
  count: 0,
  // BUG: Arrow function has lexical 'this', resolving to outer scope (window/global)!
  increment: () => {
    this.count++;
  }
};

counter.increment();
console.log(counter.count); // 0! 'this' was window!
```

---

## 3. Prototypes & Prototypal Delegation

### Q3: What is the Prototype Chain? Explain the exact relationship between `__proto__`, `prototype`, and `Object.getPrototypeOf()`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Mental Model  
**Tags:** `[Prototypes]` `[Prototype-Chain]` `[Inheritance]`

**Answer:**
Every JavaScript object contains an internal link to another object called its **`[[Prototype]]`**. When a property is accessed on an object and not found on the instance itself, the engine delegates the search up the prototype chain until reaching `Object.prototype.__proto__ === null`.

```text
┌────────────────────────────────────────────────────────┐
│                   Constructor vs Instance              │
├────────────────────────────────────────────────────────┤
│ Person Constructor Function                            │
│  └── .prototype ──────────────────────────────┐        │
│                                               ▼        │
│ Person.prototype Object               ◄────────────────┤
│  ├── greet()                                  │        │
│  └── constructor: Person                      │        │
│                                               │        │
│ const alice = new Person("Alice")             │        │
│  └── [[Prototype]] (exposed via __proto__) ───┘        │
└────────────────────────────────────────────────────────┘
```

- **`Constructor.prototype`:** A regular object automatically attached to function declarations. It serves as the prototype blueprint assigned to objects created via `new Constructor()`.
- **`instance.__proto__`:** An accessor property on `Object.prototype` that exposes the internal `[[Prototype]]` pointer of an instance. It is deprecated for production use.
- **`Object.getPrototypeOf(instance)`:** The standard, high-performance specification method to inspect an object's prototype.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is calling `Object.setPrototypeOf(obj, newProto)` considered catastrophic for V8 runtime performance?"  
*Senior Answer:* Because it alters the object's hidden class transition lineage in-place. V8 must completely invalidate all Inline Caches (ICs) and optimized machine code across all functions and call sites that ever interacted with that object shape. If custom inheritance is needed, use `Object.create(proto)` to set the prototype at object creation time.

---

## 4. ES6 Classes & Hard `#private` Fields

### Q4: Are ES6 Classes purely syntactic sugar? What does the engine do differently for classes vs constructor functions?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[Classes]` `[ES6]` `[Private-Fields]` `[Syntactic-Sugar]`

**Answer:**
While ES6 classes compile down to prototypal mechanics, they are **not** purely syntactic sugar. The engine enforces several runtime semantics that cannot be recreated with standard constructor functions:

1. **Mandatory `new` Calling:** Classes have an internal `[[IsClassConstructor]]: true` slot. Invoking a class without `new` (`MyClass()`) throws an immediate `TypeError: Class constructor MyClass cannot be invoked without 'new'`.
2. **Non-Enumerable Methods:** All methods defined inside a class body are non-enumerable (`enumerable: false`), keeping them out of `for...in` and `Object.keys()` loops.
3. **Strict Mode Default:** The class body always runs in strict mode automatically.
4. **`super()` Constructor Order:** In derived classes (`extends`), accessing `this` before calling `super()` throws a `ReferenceError`. The derived constructor does not allocate `this`; the base constructor allocates memory for `this`.

### Modern `#private` Class Fields:
Unlike TypeScript's compile-time `private` keyword (which is erased), JavaScript `#private` fields provide **hard runtime encapsulation**:
```javascript
class BankAccount {
  #balance = 0; // Truly private; stored in V8 PrivateSymbols

  deposit(amount) {
    this.#balance += amount;
  }

  getBalance() {
    return this.#balance;
  }
}

const account = new BankAccount();
console.log(account.#balance); // SyntaxError: Private field '#balance' must be declared
console.log(account["#balance"]); // undefined!
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What does the `new` operator do step-by-step?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:**
1. Creates a fresh, empty plain JavaScript object `{}`.
2. Sets the newly created object's `[[Prototype]]` to the constructor function's `.prototype` property.
3. Invokes the constructor function with `this` bound to the newly created object.
4. If the constructor explicitly returns a non-primitive object, that returned object wins; otherwise, the newly created object from Step 1 is returned.

### Q6: What is Prototype Pollution, and how can an attacker exploit `Object.assign`?
**Difficulty:** 🔴 Senior | **Type:** 🐛 Debug & Security  
**Answer:** Prototype Pollution occurs when user-supplied input (e.g., JSON payload or query parameters) contains keys like `__proto__` or `constructor.prototype`. If a deep merge utility unsafely assigns `target["__proto__"]["isAdmin"] = true`, it mutates `Object.prototype`. Every object in the entire JavaScript runtime now inherits `isAdmin: true`! Defend by using `Object.create(null)` or validating keys against `["__proto__", "prototype", "constructor"]`.

### Q7: What is the difference between `for...in` and `Object.keys()` regarding prototype properties?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:** `for...in` iterates over all enumerable properties on the object **and throughout its entire prototype chain** (requires `Object.hasOwn` filtering). `Object.keys()` returns an array containing **only the object's own** enumerable properties.
