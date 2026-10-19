# 11 — TSConfig, Compiler Options & Module Resolution

> Deep dive into `tsconfig.json` architecture, the `strict` umbrella, Beyond-Strict production flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `moduleResolution` (`NodeNext` vs `Bundler`), `verbatimModuleSyntax`, `--isolatedDeclarations` (TS 5.5), and `--erasableSyntaxOnly` (TS 5.8).

---

## 📑 Table of Contents
1. [`tsconfig.json` Architecture & Hierarchy](#1-tsconfigjson-architecture--hierarchy)
2. [The `strict` Family vs "Beyond-Strict" Production Flags](#2-the-strict-family-vs-beyond-strict-production-flags)
3. [Module Resolution: `NodeNext` vs `Bundler`](#3-module-resolution-nodenext-vs-bundler)
4. [Modern Emit & Transpilation Flags](#4-modern-emit--transpilation-flags)
5. [The `skipLibCheck` Debate & Build Performance](#5-the-skiplibcheck-debate--build-performance)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. `tsconfig.json` Architecture & Hierarchy

### Q1: What is the anatomy of a production `tsconfig.json`, and how does configuration inheritance (`extends`) work?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[TSConfig]` `[Extends]` `[Architecture]`

**Answer:**
A root `tsconfig.json` coordinates files, project boundaries, and compiler behavior:

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

#### Multi-Config Inheritance (TypeScript 5.0+):
Prior to TypeScript 5.0, `"extends"` only accepted a single string path. **TypeScript 5.0 introduced array support for `extends`**, allowing modular inheritance:

```json
{
  "extends": [
    "./tsconfig.base.json",
    "./tsconfig.paths.json",
    "@tsconfig/node20/tsconfig.json"
  ]
}
```
*Configurations are applied from left to right, with later entries overriding earlier ones.*

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does configuring `paths` in `tsconfig.json` rewrite import paths in emitted JavaScript?"  
*Senior Answer:* **NO! This is one of the most common production pitfalls.**
`paths` is purely for compile-time resolution. When `tsc` emits JavaScript, it preserves the exact import string: `import { foo } from '@/utils'` remains `import { foo } from '@/utils'`. Without a bundler (Vite, Webpack, esbuild), Node.js will crash with `Cannot find module '@/utils'` at runtime. (Note: TypeScript 5.7 introduced `--rewriteRelativeImportExtensions`, but path aliases still require bundler resolution).

---

## 2. The `strict` Family vs "Beyond-Strict" Production Flags

### Q2: What flags are grouped under `"strict": true`, and what are the essential "Beyond-Strict" flags used in high-rigor enterprise codebases?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Best Practices  
**Tags:** `[Strict-Flags]` `[NoUncheckedIndexedAccess]` `[ExactOptionalPropertyTypes]`

**Answer:**
Setting `"strict": true` activates a pre-configured umbrella of type-safety checks:

#### The `strict` Umbrella Flags:
1. `noImplicitAny`: Errors if a type cannot be inferred and falls back to `any`.
2. `strictNullChecks`: Separates `null` and `undefined` from all other types.
3. `strictFunctionTypes`: Enforces contravariant checking on function properties.
4. `strictBindCallApply`: Type-checks `.bind()`, `.call()`, and `.apply()`.
5. `strictPropertyInitialization`: Ensures class properties are assigned in the constructor.
6. `noImplicitThis`: Errors if `this` has an implicit `any` type.
7. `useUnknownInCatchVariables`: Types catch variables `catch (e)` as `unknown` instead of `any`.
8. `alwaysStrict`: Emits `"use strict"` in all JavaScript files.

---

### The Three Critical "Beyond-Strict" Flags:

#### 1. `noUncheckedIndexedAccess`:
- **The Problem:** By default, accessing an array element `arr[0]` or dictionary `map[key]` is typed as `T`, even if the index is out of bounds or the key doesn't exist!
- **The Fix:** With this flag on, TypeScript types all indexed reads as **`T | undefined`**, forcing developers to handle potential missing values safely.

```typescript
const numbers = [10, 20];
// With noUncheckedIndexedAccess: true
const num = numbers[5]; // Inferred type: number | undefined
// ❌ Error: Object is possibly 'undefined'.
// num.toFixed(2);
```

#### 2. `exactOptionalPropertyTypes`:
- **The Problem:** By default, `prop?: string` permits explicitly setting `{ prop: undefined }`. But in JavaScript, an omitted property is NOT the same as a property set to `undefined` (it changes `Object.keys()` and JSON serialization).
- **The Fix:** Guarantees that optional properties can be **omitted**, but if provided, their value CANNOT be `undefined`.

#### 3. `noImplicitOverride`:
- Ensures that subclasses overriding parent class methods must use the explicit `override` keyword, preventing accidental orphans during base class refactoring.

---

## 3. Module Resolution: `NodeNext` vs `Bundler`

### Q3: What is the difference between `"moduleResolution": "NodeNext"` and `"moduleResolution": "Bundler"`, and when do you choose each?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Module Resolution  
**Tags:** `[ModuleResolution]` `[NodeNext]` `[Bundler]` `[ESM]`

**Answer:**
This is one of the most critical decisions when architecting modern TypeScript applications:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      MODULE RESOLUTION COMPARISON                      │
├──────────────────────┬─────────────────────────────────────────────────┤
│ "moduleResolution"   │ Target Runtime & Behavior                       │
├──────────────────────┼─────────────────────────────────────────────────┤
│ NodeNext / Node16    │ Native Node.js ESM. Requires explicit .js       │
│                      │ extensions in source imports (import './a.js'). │
│                      │ Strictly respects package.json "exports".       │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Bundler (TS 5.0+)    │ Modern web bundlers (Vite, Webpack, esbuild,    │
│                      │ Next.js). Allows extensionless imports, CSS/    │
│                      │ asset imports, and flexible package exports.    │
└──────────────────────┴─────────────────────────────────────────────────┘
```

#### Detailed Breakdown:

1. **`NodeNext` (or `Node16`):**
   - **For:** Native Node.js backend services, CLI tools, and published npm libraries.
   - **Enforces:** Strict ECMAScript module resolution as executed natively by Node.js.
   - **Mandatory Syntax:** You **MUST** write relative import paths with explicit `.js` extensions, even though the file on disk is `.ts`!
     `import { calculateTax } from './tax.js';` (Imports `tax.ts`).

2. **`Bundler` (Introduced in TS 5.0):**
   - **For:** Frontend applications or full-stack apps where a bundler (Vite, Rspack, Webpack, Next.js) compiles and packages the code before runtime.
   - **Behavior:** Bundlers understand extensionless paths (`import './tax'`), asset modules (`import './styles.css'`), and flexible subpath exports. `Bundler` resolution models this reality accurately without forcing `.js` extensions.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you use `moduleResolution: 'Bundler'` with `module: 'commonjs'`?"  
*Senior Answer:* TypeScript will throw an error: `Option 'moduleResolution: bundler' can only be used when 'module' is set to 'es2015' or later`. Modern bundlers operate natively on ES module syntax.

---

## 4. Modern Emit & Transpilation Flags

### Q4: Explain `verbatimModuleSyntax` (TS 5.0), `--isolatedDeclarations` (TS 5.5), and `--erasableSyntaxOnly` (TS 5.8).
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual & Modern Standards Deep-Dive  
**Tags:** `[VerbatimModuleSyntax]` `[IsolatedDeclarations]` `[ErasableSyntaxOnly]`

**Answer:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     MODERN TS EMIT EVOLUTION (5.0–5.8)                 │
├──────────────────────────┬───────┬─────────────────────────────────────┤
│ Flag                     │ Vers  │ Primary Mission                     │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ verbatimModuleSyntax     │ 5.0   │ Eliminates ambiguity: what you      │
│                          │       │ write is what is emitted in JS.     │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ --isolatedDeclarations   │ 5.5   │ Enables multi-threaded fast tools   │
│                          │       │ (SWC, Oxlint) to emit .d.ts in CI.  │
├──────────────────────────┼───────┼─────────────────────────────────────┤
│ --erasableSyntaxOnly     │ 5.8   │ Prohibits code-emitting constructs  │
│                          │       │ for Node.js native strip-types.     │
└──────────────────────────┴───────┴─────────────────────────────────────┘
```

#### 1. `verbatimModuleSyntax` (TS 5.0):
Replaced the confusing older flags `importsNotUsedAsValues` and `preserveValueImports`.
- **The Golden Rule:** Any import that does not use the `type` modifier is **preserved as an import in the emitted JavaScript output**.
- If you import an interface or type, you **must** use `import type`:
  ```typescript
  import { UserComponent } from './user';      // Emitted in JS
  import type { UserProfile } from './types';  // Stripped in JS
  ```

#### 2. `--isolatedDeclarations` (TS 5.5):
Allows tools like **SWC**, **esbuild**, and **oxc** to generate `.d.ts` declaration files for individual files in parallel **without running a full type-checker program**!
- Requires that all exported declarations have **explicit type annotations**:
  ```typescript
  // ❌ Error with --isolatedDeclarations: Exported function must have an explicit return type!
  // export function add(a: number, b: number) { return a + b; }
  
  // ✅ Valid:
  export function add(a: number, b: number): number { return a + b; }
  ```

#### 3. `--erasableSyntaxOnly` (TS 5.8):
Guarantees that a codebase uses **purely erasable syntax** that can run directly in Node.js 22+ (`node --experimental-strip-types`) without a build step:
- Prohibits: Enums, namespaces, parameter properties, and legacy module declarations.

---

## 5. The `skipLibCheck` Debate & Build Performance

### Q5: Why is `skipLibCheck: true` universally recommended, and what is its hidden architectural risk?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture & Build Performance  
**Tags:** `[SkipLibCheck]` `[Performance]` `[NodeModules]`

**Answer:**
`"skipLibCheck": true` instructs the compiler to **skip type-checking all declaration files (`.d.ts`) found inside `node_modules`**.

#### Why It Is Universally Used:
1. **Massive Build Speedup:** Up to **50–70% faster** type-checking times in large projects.
2. **Prevents Dependency Conflicts:** Different dependencies in `node_modules` may declare conflicting global types or duplicate symbols. Without `skipLibCheck`, installing a new npm package can break your entire build due to a syntax bug in someone else's `.d.ts` file!

#### The Hidden Architectural Risk:
If a third-party library has subtle type inaccuracies or breaking type mismatches with one of its peer dependencies that your application directly relies upon, `skipLibCheck` masks the diagnostic. You will discover the bug only when your application code tries to interact with that library's exposed API.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What is the difference between `noEmit: true` and `emitDeclarationOnly: true`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Emit]` `[Babel]` `[SWC]`

**Answer:**
- **`noEmit: true`:** TypeScript generates **zero output files** (no `.js`, no `.d.ts`). Used when a bundler (Vite) compiles JS and `tsc` is only run in CI as a linter.
- **`emitDeclarationOnly: true`:** TypeScript generates **only `.d.ts` and `.d.ts.map` files**, leaving `.js` code emission to faster tools like Babel or SWC.

---

### Q7: What does `declarationMap: true` do, and why is it crucial for monorepos?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Monorepos  
**Tags:** `[DeclarationMap]` `[Monorepos]`

**Answer:**
`declarationMap: true` emits `.d.ts.map` source maps that map generated `.d.ts` declaration files back to their original `.ts` source files.
Without it, using "Go to Definition" in VS Code jumps to compiled `.d.ts` files inside packages. With `declarationMap`, it jumps directly to the editable `.ts` source code!
