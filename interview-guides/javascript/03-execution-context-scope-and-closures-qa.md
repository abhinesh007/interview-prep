# 03 — Execution Context, Scope Chains & Closures

> Deep dive into Execution Context phases, Environment Records, hoisting mechanics, the Temporal Dead Zone (TDZ), Scope Chain traversal, and the physical engine mechanics of heap-allocated closures.

---

## 📑 Table of Contents
1. [Execution Context Anatomy & Lifecycle](#1-execution-context-anatomy--lifecycle)
2. [Hoisting & The Temporal Dead Zone (TDZ)](#2-hoisting--the-temporal-dead-zone-tdz)
3. [Scope Chains & Lexical Environment Traversal](#3-scope-chains--lexical-environment-traversal)
4. [Closures Under the Hood & Memory Retention](#4-closures-under-the-hood--memory-retention)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Execution Context Anatomy & Lifecycle

### Q1: What is an Execution Context in JavaScript, and what are its two lifecycle phases?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `[Execution-Context]` `[Creation-Phase]` `[Execution-Phase]` `[Call-Stack]`

**Answer:**
An **Execution Context** is an abstract environment created by the JavaScript engine to evaluate and execute code. There are three types:
1. **Global Execution Context (GEC):** Created by default when the script starts; exactly one exists.
2. **Function Execution Context (FEC):** Created every time a function is invoked.
3. **Eval Execution Context:** Created when code is passed to `eval()`.

Every Execution Context passes through two distinct lifecycle phases:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Execution Context Lifecycle                     │
├───────────────────────────────────┬────────────────────────────────────┤
│      Phase 1: Creation Phase      │      Phase 2: Execution Phase      │
├───────────────────────────────────┼────────────────────────────────────┤
│ 1. Create Global/Outer Object     │ 1. Execute code line-by-line       │
│ 2. Bind 'this' keyword            │ 2. Assign runtime values to        │
│ 3. Allocate VariableEnvironment:  │    variables                       │
│    - Hoist var (init: undefined)  │ 3. Evaluate expressions            │
│ 4. Allocate LexicalEnvironment:   │ 4. Push/pop new FECs on invocation │
│    - Hoist let/const (uninit)     │                                    │
│    - Hoist function declarations  │                                    │
└───────────────────────────────────┴────────────────────────────────────┘
```

Internally, an Execution Context consists of:
- **`VariableEnvironment`:** Records bindings for `var` variables and function declarations.
- **`LexicalEnvironment`:** Records bindings for block-scoped variables (`let`, `const`) within the current context.
- **`OuterEnv` (Outer Environment Reference):** Pointer to the enclosing lexical environment, used to build the Scope Chain.
- **`ThisBinding`:** The value of `this` established for this context.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is an Environment Record, and why does ECMAScript distinguish between Declarative and Object Environment Records?"  
*Senior Answer:* The Environment Record is the concrete dictionary storing identifier-to-value bindings within an environment.
- **Declarative Environment Record:** Holds variables, functions, and modules (`let`, `const`, `function`, `class`). It is optimized to store bindings directly in stack registers.
- **Object Environment Record:** Binds identifiers to properties of an actual JavaScript object (specifically, the `window` global object in browsers or `with` statements). Accessing `window.foo` reads from the Global Object Environment Record.

---

## 2. Hoisting & The Temporal Dead Zone (TDZ)

### Q2: What is variable and function hoisting under the hood? Why is hoisting not the physical moving of code?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Hoisting]` `[TDZ]` `[Var]` `[Let]` `[Const]`

**Answer:**
**Hoisting** is a colloquial term describing how declarations are recognized before any line of code actually runs.
The engine does **NOT** physically move source code lines to the top of the file!

Instead, during **Phase 1 (Creation Phase)**, the engine parses the script and creates bindings in the Environment Record before execution begins:

```text
Source Code Written:
  console.log(a); // undefined
  var a = 10;
  console.log(b); // ReferenceError: Cannot access 'b' before initialization
  let b = 20;

What the Engine Allocates in Creation Phase:
  EnvironmentRecord = {
    a: undefined,         // 'var' is declared AND initialized to undefined
    b: <uninitialized>    // 'let' is declared, but NOT initialized (TDZ active!)
  }
```

The three stages of a variable binding:
1. **Declaration:** Registering the variable name in the environment record.
2. **Initialization:** Assigning the variable an initial value (or default `undefined`).
3. **Assignment:** Assigning the actual user-specified value at runtime.

| Construct | When Declared? | When Initialized? | When Assigned? |
|---|---|---|---|
| `function foo() {}` | Creation Phase | Creation Phase (with function object) | Creation Phase |
| `var x = 1` | Creation Phase | Creation Phase (with `undefined`) | Execution Phase (at `x = 1`) |
| `let / const x = 1` | Creation Phase | Execution Phase (at `let x`) | Execution Phase (at `x = 1`) |

Because function declarations are both declared and initialized with their full function body during the Creation Phase, they can be invoked anywhere in their enclosing scope before their definition line.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Predict the output of this code snippet and explain why:"
```javascript
var a = 1;
function a() {}
console.log(typeof a);
```
*Senior Answer:* It prints `"number"`.
1. During the Creation Phase, `function a` is hoisted first and initialized with the function pointer.
2. `var a` declaration is processed; since `a` already exists as an identifier, the engine ignores the duplicate `var` declaration.
3. During the Execution Phase, the assignment line `a = 1` executes, overwriting the function object with the numeric value `1`. Therefore, `typeof a` is `"number"`.

---

### Q3: What is the Temporal Dead Zone (TDZ)? Provide an output prediction scenario where TDZ causes unexpected crashes.
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction & Deep-Dive  
**Tags:** `[TDZ]` `[Scope-Resolution]` `[ReferenceError]`

**Answer:**
The **Temporal Dead Zone (TDZ)** is the span of execution from the beginning of a block scope until the point where the `let` or `const` declaration is evaluated and initialized.
Accessing a variable in its TDZ throws a **`ReferenceError: Cannot access '<var>' before initialization`**.

```text
{
  // ─── START OF BLOCK SCOPE: TDZ starts for 'item' ───
  console.log(foo); // ReferenceError!
  // ... more code ...
  // ─── TDZ ENDS at the initialization line: ────────────
  let item = "ready";
  console.log(item); // "ready" (Accessible!)
}
```

**Tricky Output Prediction Puzzle:**
```javascript
let x = "global";

function testScope() {
  console.log(x);
  let x = "local";
}

testScope();
```

**Output:** `ReferenceError: Cannot access 'x' before initialization` (throws at `console.log(x)`).

**Under-the-Hood Explanation:**
Candidates often mistakenly think it will print `"global"` via the scope chain.
However, because `let x = "local"` is inside `testScope()`, the engine's compilation phase registers `x` in `testScope`'s Lexical Environment. This creates an uninitialized binding that **shadows** the global `x` immediately at function entry. When `console.log(x)` runs, it resolves `x` in the local environment and encounters the uninitialized TDZ state, throwing an immediate `ReferenceError`.

---

## 3. Scope Chains & Lexical Environment Traversal

### Q4: What is Lexical Scope, and how is the Scope Chain physically traversed via `[[Scopes]]`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[Lexical-Scope]` `[Scope-Chain]` `[Scopes-Slot]` `[Identifier-Resolution]`

**Answer:**
JavaScript utilizes **Lexical Scope (Static Scope)**: scope boundaries are determined strictly by where functions and blocks are physically authored in the source code, **not** where functions are invoked.

When an identifier is referenced (e.g., `console.log(userName)`):
1. The engine checks the current local `EnvironmentRecord`.
2. If not found, it traverses the `OuterEnv` pointer to the enclosing parent environment.
3. This traversal continues up the chain until reaching the Global Environment.
4. If the identifier is not found in the Global Environment, it throws a `ReferenceError: userName is not defined` in strict mode.

```text
Global Execution Context:
┌──────────────────────────────────────────────┐
│ EnvironmentRecord: { appName: "Demo" }       │ ◄──┐
└──────────────────────────────────────────────┘    │
                                                    │ OuterEnv
Function A Context:                                 │
┌──────────────────────────────────────────────┐    │
│ EnvironmentRecord: { user: "Alice" }         │ ───┤
└──────────────────────────────────────────────┘    │
                                                    │ OuterEnv
Function B Context (Nested inside A):               │
┌──────────────────────────────────────────────┐    │
│ EnvironmentRecord: { role: "Admin" }         │ ───┘
└──────────────────────────────────────────────┘
```

**The Internal `[[Scopes]]` Slot:**
When a function object is instantiated in memory, the engine attaches an internal hidden slot called **`[[Scopes]]`**. This slot stores an array of references to all outer Environment Records in which the function was created. Even if the function is passed to another file and invoked from an entirely different call stack, its `[[Scopes]]` property retains the original lexical chain.

---

## 4. Closures Under the Hood & Memory Retention

### Q5: What is a closure at the engine level? How does V8 allocate closure variables on the Heap?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Memory Layout  
**Tags:** `[Closures]` `[V8-Context]` `[Heap-Allocation]` `[Activation-Records]`

**Answer:**
A **Closure** is the combination of a function bundled together with references to its surrounding lexical environment (`[[Scopes]]`).

**Engine Mechanics (Stack vs Heap Allocation for Closures):**
Normally, local variables live on the fast Call Stack and are discarded when the stack frame pops.
However, during the AST parsing phase, V8's **Scope Analysis** scans functions to determine if any inner function references an outer variable:
- If an inner function references an outer variable and escapes (e.g., returned or passed to an async callback), that variable **CANNOT** be stored on the Call Stack frame.
- V8 allocates a dedicated heap object called a **`Context` object** (Activation Record).
- The outer variable is placed inside the heap-allocated `Context`.
- When the outer function returns and its stack frame is popped, the inner function continues holding a strong pointer to the heap `Context`.

```text
Call Stack:                           Memory Heap:
┌────────────────────────┐            ┌────────────────────────────────┐
│ outer() Stack Frame    │            │ V8 Context Object:             │
│ (Popped on return!)    │            │ ┌────────────────────────────┐ │
└────────────────────────┘            │ │ count: 1                   │ │
                                      │ └────────────────────────────┘ │
                                      └────────────────────────────────┘
                                                       ▲
                                                       │ [[Scopes]][0]
                                      ┌────────────────────────────────┐
                                      │ inner() Function Object        │
                                      └────────────────────────────────┘
```

---

### Q6: What is the "Shared Lexical Scope Leak" (The Meteor Leak), and how do sibling closures cause memory retention?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Meteor-Leak]` `[Memory-Leak]` `[Closures]` `[V8-Optimization]`

**Answer:**
In V8 and modern JavaScript engines, **all closures created within the same lexical parent scope share the exact same `Context` heap object**.

If one closure references a massive variable, **every other closure produced in that same parent scope keeps that massive variable alive**, even if the other closure never mentions it!

```javascript
// THE CLASSIC METEOR LEAK
let theThing = null;

function replaceThing() {
  const originalThing = theThing;
  
  // Unused closure: references originalThing!
  const unused = function() {
    if (originalThing) console.log("hi");
  };

  // Active closure: does NOT reference originalThing directly!
  theThing = {
    longStr: new Array(1e6).join("*"), // 1MB array
    someMethod: function() {
      console.log("active");
    }
  };
}

// Every invocation creates an uncollectable linked chain of 1MB arrays!
setInterval(replaceThing, 100);
```

**Why This Leaks Memory:**
1. `unused` and `someMethod` share the same parent `Context` record for `replaceThing`.
2. Because `unused` references `originalThing`, `originalThing` is stored in that shared `Context`.
3. `theThing.someMethod` is kept alive globally by `theThing`.
4. As long as `theThing` is alive, its `someMethod` closure keeps the `Context` alive.
5. That `Context` contains `originalThing`, which points to the *previous* `theThing`.
6. Result: An infinite linked list of 1MB objects builds up on the heap until the browser tab crashes.

**Fix:** Break the closure link explicitly:
```javascript
function replaceThing() {
  const originalThing = theThing;
  // ...
  originalThing = null; // Clears the reference inside the shared Context!
}
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q7: What is the technical difference between `undeclared`, `undefined`, and `null`?
**Difficulty:** 🟢 Junior | **Type:** 📖 Conceptual  
**Answer:**
- **`undeclared`:** The identifier does not exist in any accessible Environment Record. Referencing it throws a runtime `ReferenceError`.
- **`undefined`:** A primitive value assigned by the engine to declared variables that have not yet been assigned a value, or returned by functions without an explicit `return`.
- **`null`:** A primitive value representing the intentional absence of any object reference. Assigned explicitly by programmers.

### Q8: Does an empty block `{}` create a new execution context?
**Difficulty:** 🟡 Mid | **Type:** 📖 Conceptual  
**Answer:** No. An empty block `{}` does **not** create a new Execution Context (it does not push a frame onto the Call Stack). However, a block with declarations (`{ let x = 1; }`) creates a new **Lexical Environment Record** linked to the outer environment to enforce block scoping for `let` and `const`.

### Q9: What happens if you assign a value to an undeclared variable in sloppy mode vs strict mode?
**Difficulty:** 🟢 Junior | **Type:** 🐛 Debug & Bug Hunting  
**Answer:** In sloppy mode (`"use strict"` omitted), assigning `foo = 42` traverses the scope chain to the top and dynamically creates a new property `foo` on the global `window` object (an accidental global leak). In strict mode (`"use strict"`), the engine forbids dynamic global creation and throws a `ReferenceError: foo is not defined`.
