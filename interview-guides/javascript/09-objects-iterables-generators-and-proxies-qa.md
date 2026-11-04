# 09 — Objects, Iterables, Generators & Proxies

> Deep dive into property descriptors, iteration protocols, generator coroutines, metaprogramming with `Proxy` & `Reflect`, and structural sharing with copy-on-write Proxies (the Immer architecture).

---

## 📑 Table of Contents
1. [Property Descriptors & Object Internals](#1-property-descriptors--object-internals)
2. [The Iteration Protocols](#2-the-iteration-protocols)
3. [Generator Functions & Coroutines](#3-generator-functions--coroutines)
4. [Metaprogramming with `Proxy`, `Reflect` & Structural Sharing](#4-metaprogramming-with-proxy-reflect--structural-sharing)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Property Descriptors & Object Internals

### Q1: What are Property Descriptors, and why is `configurable: false` the ultimate lock?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[Property-Descriptors]` `[Object.defineProperty]` `[Configurable]`

**Answer:**
In JavaScript, object properties are not just raw key-value pairs; they are governed by **Property Descriptors**. There are two types:
1. **Data Descriptors:** `{ value, writable, enumerable, configurable }`
2. **Accessor Descriptors:** `{ get, set, enumerable, configurable }`

```text
┌────────────────────────────────────────────────────────┐
│               Property Descriptor Flags                │
├────────────────┬───────────────────────────────────────┤
│ Flag           │ Meaning when false                    │
├────────────────┼───────────────────────────────────────┤
│ writable       │ Value cannot be changed via =         │
│ enumerable     │ Hidden from for...in and Object.keys()│
│ configurable   │ Lock flag! Once false, property       │
│                │ cannot be deleted, descriptor cannot  │
│                │ be re-configured, and type cannot be  │
│                │ changed between data and accessor.    │
└────────────────┴───────────────────────────────────────┘
```

**The Sole Permitted Mutation When `configurable: false`:**
Per the ECMAScript specification, if `configurable: false`, the **only** modification permitted is transitioning `writable` from `true` to `false` (locking down mutability further). It can **never** be changed from `false` back to `true`.

```javascript
const user = {};
Object.defineProperty(user, "id", {
  value: 101,
  writable: false,
  configurable: false,
  enumerable: true
});

delete user.id; // Fails silently (or throws TypeError in strict mode)
console.log(user.id); // 101
```

---

## 2. The Iteration Protocols

### Q2: What are the Iterable and Iterator protocols? Implement a custom `Range` class that supports `for...of` loops.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Iteration-Protocols]` `[Symbol.iterator]` `[Iterators]`

**Answer:**
JavaScript standardizes iteration across two decoupled protocols:
1. **The Iterable Protocol:** An object must implement a method whose key is **`[Symbol.iterator]()`**, which returns an **Iterator**.
2. **The Iterator Protocol:** An object must provide a **`next()`** method that returns an object conforming to `{ value: any, done: boolean }`.

```javascript
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }

  // Implementation of the Iterable Protocol
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    const step = this.step;

    // Returns an object conforming to the Iterator Protocol
    return {
      next() {
        if (current <= end) {
          const value = current;
          current += step;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      }
    };
  }
}

// USAGE:
for (const num of new Range(1, 10, 3)) {
  console.log(num); // Prints 1, 4, 7, 10
}
```

---

## 3. Generator Functions & Coroutines

### Q3: How does the `yield` keyword in Generator functions suspend execution, and how does bidirectional communication work?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Practical  
**Tags:** `[Generators]` `[Yield]` `[Coroutines]` `[Bidirectional-Data]`

**Answer:**
A **Generator function (`function*`)** returns a `Generator` object that is both an Iterable and an Iterator.
When `yield` is encountered:
- The engine preserves the entire local execution context (variable bindings and instruction pointer) on the heap.
- It suspends function execution and returns the yielded value to the caller.

### Bidirectional Data Passing:
Values passed to `generator.next(val)` become the evaluated result of the suspended `yield` expression!

```javascript
function* conversationalBot() {
  console.log("Bot started...");
  const name = yield "What is your name?";
  console.log(`Bot received name: ${name}`);
  const age = yield `Nice to meet you, ${name}. How old are you?`;
  return `Registered ${name}, age ${age}`;
}

const bot = conversationalBot();

console.log(bot.next().value);       // "What is your name?"
console.log(bot.next("Alice").value); // "Nice to meet you, Alice. How old are you?"
console.log(bot.next(30).value);     // "Registered Alice, age 30"
```

---

## 4. Metaprogramming with `Proxy`, `Reflect` & Structural Sharing

### Q4: How does Immer achieve copy-on-write structural sharing using `Proxy`? Build a mini `produce()` function from scratch.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Practical Coding & Architecture  
**Tags:** `[Proxy]` `[Reflect]` `[Immer]` `[Structural-Sharing]` `[Copy-On-Write]`

**Answer:**
Libraries like **Immer** allow developers to write intuitive mutable code (`state.user.age++`) while generating a perfectly frozen immutable tree.
It accomplishes this via **Copy-on-Write (CoW) Proxies**:
1. It wraps the base state in a `Proxy`.
2. When properties are only *read*, it returns the original object (zero copies).
3. As soon as a property is *written* to (`set` trap), it performs a shallow copy of that specific node and marks it as modified.
4. When finalizing, it re-uses all unmodified branches directly by reference (**Structural Sharing**) and connects the shallow-copied modified branches.

```javascript
// Mini-Immer produce() from scratch
function produce(baseState, recipe) {
  const modifiedMap = new Map();

  function getDraft(target) {
    if (typeof target !== "object" || target === null) return target;

    return new Proxy(target, {
      get(obj, prop) {
        const value = modifiedMap.has(obj) ? modifiedMap.get(obj)[prop] : obj[prop];
        return getDraft(value); // Lazily wrap nested objects in proxies
      },
      set(obj, prop, val) {
        if (!modifiedMap.has(obj)) {
          modifiedMap.set(obj, Array.isArray(obj) ? [...obj] : { ...obj });
        }
        modifiedMap.get(obj)[prop] = val;
        return true;
      }
    });
  }

  const draft = getDraft(baseState);
  recipe(draft);

  function finalize(target) {
    if (typeof target !== "object" || target === null) return target;
    const copy = modifiedMap.get(target);
    if (!copy) return target; // Structural sharing: unchanged branch retained!

    for (const key of Object.keys(copy)) {
      copy[key] = finalize(copy[key]);
    }
    return Object.freeze(copy);
  }

  return finalize(baseState);
}

// USAGE DEMONSTRATION:
const originalState = {
  user: { name: "Alice", address: { city: "London" } },
  posts: [1, 2, 3]
};

const nextState = produce(originalState, draft => {
  draft.user.address.city = "Paris"; // Mutate draft naturally!
});

console.log(nextState.user.address.city); // "Paris"
console.log(originalState.user.address.city); // "London" (Untouched!)
console.log(nextState.posts === originalState.posts); // TRUE! (Structural Sharing!)
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What is a Revocable Proxy (`Proxy.revocable()`)?
**Difficulty:** 🔴 Senior | **Type:** 📖 Security & APIs  
**Answer:** `Proxy.revocable(target, handler)` returns `{ proxy, revoke }`. When `revoke()` is called, the proxy is immediately disabled. Any subsequent access to the proxy throws a `TypeError: Cannot perform 'get' on a proxy that has been revoked`. Used for granting temporary, revokable access to private resources across untrusted plugins.

### Q6: Why is `obj.hasOwnProperty(prop)` unsafe compared to `Object.hasOwn(obj, prop)`?
**Difficulty:** 🟢 Junior | **Type:** 🐛 Debug & Bug Hunting  
**Answer:** `obj.hasOwnProperty` fails if `obj` was created without a prototype via `Object.create(null)` (where `obj.hasOwnProperty` is `undefined`), or if an attacker overrides the `hasOwnProperty` property on the object itself (`{ hasOwnProperty: () => true }`). `Object.hasOwn()` is a safe static method introduced in ES2022 that works reliably on all objects.
