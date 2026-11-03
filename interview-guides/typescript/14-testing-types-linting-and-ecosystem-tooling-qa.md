# 14 — Type Testing, Linting & Ecosystem Tooling

> Deep dive into testing types in CI/CD (`expectTypeOf`, `tsd`), `@ts-expect-error` vs `@ts-ignore`, type-aware ESLint rules, and runtime schema validation interop (Zod / Valibot).

---

## 📑 Table of Contents
1. [Testing Types in CI/CD (`expectTypeOf` & `tsd`)](#1-testing-types-in-cicd-expecttypeof--tsd)
2. [`@ts-expect-error` vs `@ts-ignore`](#2-ts-expect-error-vs-ts-ignore)
3. [Type-Aware Linting with `typescript-eslint`](#3-type-aware-linting-with-typescript-eslint)
4. [Runtime Schema Validation Interop (Zod / Valibot)](#4-runtime-schema-validation-interop-zod--valibot)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Testing Types in CI/CD (`expectTypeOf` & `tsd`)

### Q1: Why are unit tests insufficient for library and type authors, and how do you test types in CI without running code?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & CI Testing  
**Tags:** `[Type-Testing]` `[ExpectTypeOf]` `[Vitest]` `[CI]`

**Answer:**
Standard unit tests (Jest, Vitest) test runtime JavaScript values. They cannot detect if a refactoring inadvertently widened a return type from `'admin' | 'member'` to `string`, or broke generic parameter inference.

Modern CI pipelines use **Type Testing** tools like **`expectTypeOf` (built into Vitest)** or **`tsd`**:

```typescript
import { expectTypeOf, test } from 'vitest';
import { getProperty } from './utils';

test('getProperty types should be strictly sound', () => {
  const user = { id: 101, name: 'Ada', isActive: true };

  // 1. Assert exact return types:
  expectTypeOf(getProperty(user, 'name')).toEqualTypeOf<string>();
  expectTypeOf(getProperty(user, 'id')).toEqualTypeOf<number>();

  // 2. Assert assignability:
  expectTypeOf(getProperty(user, 'isActive')).toBeBoolean();

  // 3. Negative testing (Assert compile-time failure):
  // @ts-expect-error - 'invalidKey' is not a property of user
  getProperty(user, 'invalidKey');
});
```

These assertions are evaluated purely by the TypeScript compiler during test runs with zero runtime execution overhead.

---

## 2. `@ts-expect-error` vs `@ts-ignore`

### Q2: Why is `@ts-ignore` banned in high-rigor engineering teams, while `@ts-expect-error` is encouraged?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Code Quality  
**Tags:** `[Ts-Expect-Error]` `[Ts-Ignore]` `[Best-Practices]`

**Answer:**

```text
@ts-ignore:       "Silence any error on the next line forever." (Dangerous)
@ts-expect-error: "An error MUST occur on the next line. If it compiles cleanly, FAIL THE BUILD!" (Safe)
```

#### The `@ts-ignore` Trap:
If you use `@ts-ignore` to suppress an error during an incremental refactor, and later another engineer fixes the underlying type or upstream library, `@ts-ignore` **remains silent indefinitely**, leaving an invisible dead suppression that can mask future regressions.

#### Why `@ts-expect-error` is the Senior Standard:
If the code is refactored and no longer produces an error, TypeScript **throws a compilation error**:
`Unused '@ts-expect-error' directive.`

This makes `@ts-expect-error` an executable **regression test** that verifies an intentional type boundary continues to fail as expected.

---

## 3. Type-Aware Linting with `typescript-eslint`

### Q3: What is "Type-Aware Linting", and what are the essential rules that catch critical production disasters?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Code Quality  
**Tags:** `[TypeScript-ESLint]` `[Floating-Promises]` `[Linting]`

**Answer:**
Standard ESLint only inspects syntax tokens. **Type-Aware Linting** integrates ESLint directly with TypeScript's type checker, enabling lint rules that understand symbol types, Promise lifecycles, and control flow:

#### Essential Production Rules:
1. **`@typescript-eslint/no-floating-promises`:**
   - Detects Promises that are called without `await`, `.then()`, or `void`.
   - Prevents uncaught asynchronous exceptions that crash background workers.
2. **`@typescript-eslint/await-thenable`:**
   - Prevents awaiting values that are not Promises, eliminating unnecessary event loop microtask ticks.
3. **`@typescript-eslint/no-misused-promises`:**
   - Catches async functions passed to places expecting synchronous handlers (e.g., passing an async function to `array.forEach` or `element.addEventListener` without error boundaries).
4. **`@typescript-eslint/strict-boolean-expressions`:**
   - Prevents subtle bugs with `0` or `""` (e.g., `if (count)` failing when `count === 0`).

---

## 4. Runtime Schema Validation Interop (Zod / Valibot)

### Q4: How do modern architectures bridge compile-time types with runtime schema validation (Zod)?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical Coding  
**Tags:** `[Zod]` `[Runtime-Validation]` `[Single-Source-of-Truth]`

**Answer:**
Modern applications avoid writing duplicate interfaces and runtime validators. Instead, they define a **runtime schema as the Single Source of Truth**, and infer static TypeScript types from it:

```typescript
import { z } from 'zod';

// 1. Single Source of Truth (Runtime Schema):
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'guest']),
  preferences: z.object({
    newsletter: z.boolean()
  }).optional()
});

// 2. Infer Static TypeScript Type (Compile-Time):
export type User = z.infer<typeof UserSchema>;

// Equivalent to:
// type User = {
//   id: string;
//   email: string;
//   role: 'admin' | 'member' | 'guest';
//   preferences?: { newsletter: boolean };
// }
```

**Benefits:**
- Zero duplication between types and validation schemas.
- If a field is modified, types update automatically across the entire app.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: What is the performance impact of enabling type-aware linting in ESLint?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ESLint]` `[Performance]`

**Answer:**
Type-aware linting can increase ESLint execution time by **3x to 10x** because ESLint must invoke TypeScript to parse and type-check the entire program. In large repositories, teams typically run non-type-aware linting on pre-commit hooks and type-aware linting in CI.
