# 06 — Mapped Types & Template Literal Gymnastics

> Deep dive into Mapped Types, Key Remapping (`as`), filtering with `as never`, Template Literal Types, strongly typed Event Emitters, and nested dot-notation object path accessors (`Path<T>`).

---

## 📑 Table of Contents
1. [Mapped Types Mechanics & Modifier Flags](#1-mapped-types-mechanics--modifier-flags)
2. [Key Remapping via `as` & Filtering](#2-key-remapping-via-as--filtering)
3. [Template Literal Types & Event Emitters](#3-template-literal-types--event-emitters)
4. [Masterclass: Strongly Typed Dot-Notation Paths (`Path<T>`)](#4-masterclass-strongly-typed-dot-notation-paths-patht)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Mapped Types Mechanics & Modifier Flags

### Q1: What is a Mapped Type, and how do modifier prefixes (`+`, `-`) control `readonly` and optionality?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Mapped-Types]` `[Modifiers]`

**Answer:**
A **Mapped Type** builds new object types by iterating over keys (typically using `keyof` or a union of string literals). It is TypeScript's type-level equivalent of `Array.prototype.map()`.

```typescript
type Mapped<K extends keyof any, V> = {
  [P in K]: V;
};
```

#### Modifier Prefixes (`+` and `-`):
You can explicitly add (`+`) or remove (`-`) the `readonly` and optional (`?`) modifiers:

| Syntax | Behavior | Equivalent Built-in |
|---|---|---|
| `[K in keyof T]+?: T[K]` | Makes all properties **optional** | `Partial<T>` |
| `[K in keyof T]-?: T[K]` | Strips optionality (makes **required**) | `Required<T>` |
| `[K in keyof T]+readonly: T[K]` | Adds **`readonly`** to all properties | `Readonly<T>` |
| `[K in keyof T]-readonly: T[K]` | Strips `readonly` (makes **mutable**) | Custom `Mutable<T>` |

```typescript
// Custom Mutable type stripping readonly:
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

interface ImmutableConfig {
  readonly apiUrl: string;
  readonly retries: number;
}

type EditableConfig = Mutable<ImmutableConfig>;
// EditableConfig properties are now mutable (apiUrl: string; retries: number)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What does TypeScript do if you omit the `+` or `-` prefix when writing `[K in keyof T]?: T[K]`?"  
*Senior Answer:* The `+` prefix is the default. Writing `?` is syntactic sugar for `+?`, and `readonly` is sugar for `+readonly`.

---

### Q2: How do you transform all methods of an interface into asynchronous methods returning Promises?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Mapped-Types]` `[Promise]` `[Async-Service]`

**Answer:**
```typescript
export type PromisifyMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Promise<Awaited<Return>>
    : T[K];
};

// Application:
interface SynchronousMathService {
  version: string;
  add(a: number, b: number): number;
  multiply(a: number, b: number): number;
}

// Resulting type:
// {
//   version: string;
//   add: (a: number, b: number) => Promise<number>;
//   multiply: (a: number, b: number) => Promise<number>;
// }
type AsyncMathService = PromisifyMethods<SynchronousMathService>;
```

---

## 2. Key Remapping via `as` & Filtering

### Q3: How does Key Remapping via `as` work in Mapped Types, and how can you filter out keys using `as never`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Deep-Dive  
**Tags:** `[Key-Remapping]` `[As-Clause]` `[Filtering-Keys]`

**Answer:**
TypeScript 4.1 introduced the `as` clause in mapped types (`[K in keyof T as NewKey<K>]: T[K]`), allowing keys to be transformed or completely filtered out:

```text
Iterate Key K ───▶ Transform via `as` ───▶ If `never`: KEY IS DROPPED!
                                      ───▶ If String: NEW KEY CREATED!
```

#### 1. Filtering Keys by Property Type (`PickByType` / `OmitByType`):
```typescript
// Filter keys whose values match 'ValueType':
export type PickByType<T, ValueType> = {
  [K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};

// Filter keys whose values do NOT match 'ValueType':
export type OmitByType<T, ValueType> = {
  [K in keyof T as T[K] extends ValueType ? never : K]: T[K];
};

interface UserRecord {
  id: number;
  name: string;
  bio: string;
  isActive: boolean;
  loginCount: number;
}

// Only string fields: { name: string; bio: string; }
type TextFields = PickByType<UserRecord, string>;

// Strips functions from a class or interface:
type DataOnly<T> = OmitByType<T, Function>;
```

#### 2. Key Transformation (Prefixing / Suffixing):
```typescript
export type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

// Result: { getName: () => string; getAge: () => number; }
type PersonGetters = Getters<Person>;
```

---

## 3. Template Literal Types & Event Emitters

### Q4: How do Template Literal Types work, and how do they enable strongly typed event emitters?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding  
**Tags:** `[Template-Literals]` `[EventEmitter]` `[Strong-Typing]`

**Answer:**
**Template Literal Types** bring JavaScript template literal interpolation syntax to the type level: `` `on${Capitalize<Event>}` ``.

When combined with unions, template literals produce **all cross-multiplied string permutations**:
```typescript
type Vertical = "top" | "bottom";
type Horizontal = "left" | "right";
// "top-left" | "top-right" | "bottom-left" | "bottom-right"
type Alignment = `${Vertical}-${Horizontal}`;
```

#### Strongly Typed Event Bus Implementation:
```typescript
export interface EventPayloadMap {
  "user:login": { userId: string; ip: string };
  "user:logout": { userId: string };
  "order:created": { orderId: string; amount: number };
  "order:cancelled": { orderId: string; reason: string };
}

export class StronglyTypedEventEmitter {
  private handlers: { [K in keyof EventPayloadMap]?: ((payload: EventPayloadMap[K]) => void)[] } = {};

  on<K extends keyof EventPayloadMap>(
    event: K, 
    handler: (payload: EventPayloadMap[K]) => void
  ): void {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event]!.push(handler);
  }

  emit<K extends keyof EventPayloadMap>(
    event: K, 
    payload: EventPayloadMap[K]
  ): void {
    this.handlers[event]?.forEach(h => h(payload));
  }
}

const emitter = new StronglyTypedEventEmitter();

// ✅ Autocompletes "user:login", and payload is strictly { userId: string; ip: string }:
emitter.on("user:login", (payload) => {
  console.log(`User ${payload.userId} logged in from ${payload.ip}`);
});

// ❌ Compile Error: Property 'amount' is missing in payload!
// emitter.emit("order:created", { orderId: "ord_101" });
```

---

## 4. Masterclass: Strongly Typed Dot-Notation Paths (`Path<T>`)

### Q5: How do you implement a type-safe `Path<T>` and `PathValue<T, P>` utility for nested object access (e.g., `"user.address.zip"`)?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Practical Coding & Type Gymnastics  
**Tags:** `[Path]` `[PathValue]` `[Recursive-Types]` `[Form-Validation]`

**Answer:**
This question tests deep recursive template literal construction, mapped types, and indexed access—fundamental to libraries like React Hook Form and Prisma.

```typescript
// 1. Recursive Path Generator:
export type Path<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${Path<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
  : never;

// 2. Recursive Path Value Extractor:
export type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;

// Real-World Example:
interface ComplexUser {
  id: string;
  profile: {
    fullName: string;
    address: {
      city: string;
      zipCode: number;
    };
  };
  tags: string[];
}

// Strongly Typed Getter function:
export function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  const segments = (path as string).split(".");
  let current: any = obj;
  for (const segment of segments) {
    if (current == null) return undefined as any;
    current = current[segment];
  }
  return current;
}

const user: ComplexUser = {
  id: "usr_1",
  profile: {
    fullName: "Ada Lovelace",
    address: {
      city: "London",
      zipCode: 12345
    }
  },
  tags: ["vip", "early-adopter"]
};

// Autocomplete offers: "id" | "profile" | "profile.fullName" | "profile.address" | "profile.address.city" | "profile.address.zipCode"
const city = get(user, "profile.address.city");    // strictly string!
const zip = get(user, "profile.address.zipCode"); // strictly number!

// ❌ Compile Error: Argument of type '"profile.address.country"' is not assignable to parameter of type Path<ComplexUser>.
// get(user, "profile.address.country");
```

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What happens if a template literal type produces a combinatorial explosion?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Combinatorial-Explosion]` `[Performance]`

**Answer:**
If you combine unions with many variants:
```typescript
type Letters = "a" | "b" | "c" | "d" | "e" | "f";
type BigUnion = `${Letters}${Letters}${Letters}${Letters}${Letters}`;
```
This generates $6^5 = 7,776$ type instantiations. The TypeScript compiler caps union combinations to prevent running out of heap memory and will throw:
`Expression produces a union type that is too complex to represent.`

---

### Q7: Can template literal types parse integer numbers from string inputs?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Template-Literals]` `[Infer]`

**Answer:**
**Yes!** Using `infer` with a number constraint:
```typescript
type ParseInt<T extends string> = T extends `${infer N extends number}` ? N : never;

type Num = ParseInt<"42">;   // strictly 42 (literal number)!
type NaN = ParseInt<"test">; // never
```

---

### Q8: What are the four built-in string manipulation type intrinsics in TypeScript?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Intrinsics]`

**Answer:**
Implemented directly inside the compiler core:
1. `Uppercase<StringType>`
2. `Lowercase<StringType>`
3. `Capitalize<StringType>`
4. `Uncapitalize<StringType>`
