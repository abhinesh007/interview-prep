# 🎯 TypeScript Interview Master Index & Table of Contents

> **Comprehensive, production-grade TypeScript interview preparation guide** covering runtime boundaries, structural subtyping, advanced type gymnastics, modern `tsconfig.json` architecture (`NodeNext`, `Bundler`), project references, enterprise type safety, and version evolution across TypeScript 3.x to 5.8+.

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Link | Questions | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **00** | **Table of Contents** | Guide Index, Role-Based Study Tracks & Question Standard | [Read Index →](00-table-of-contents.md) | Index | 🎯 Ready |
| **01** | **Foundations & Runtime Model** | Structural Typing, Type Erasure, Top/Bottom Types (`any`, `unknown`, `never`), Fresh Literals & EPC, Branded Types | [Read Guide →](01-type-system-foundations-and-runtime-qa.md) | 18 Qs | ✅ Ready |
| **02** | **Interfaces, Types & Object Modeling** | `interface` vs `type`, Declaration Merging, Index Signatures vs `Record`, `readonly` vs `as const`, Discriminated Unions & `XOR` | [Read Guide →](02-interfaces-types-and-object-modeling-qa.md) | 12 Qs | ✅ Ready |
| **03** | **Functions, Generics & Constraints** | Generic Constraints (`extends keyof`), Overloads vs Unions, `this` Parameter, `NoInfer<T>`, Callback `void` vs `undefined` | [Read Guide →](03-functions-generics-and-type-constraints-qa.md) | 12 Qs | ✅ Ready |
| **04** | **Type Narrowing, CFA & Guards** | Control Flow Analysis (CFA), Type Guards (`is`), Inferred Type Predicates (TS 5.5), Assertion Functions, Closure Narrowing (TS 5.4), Exhaustiveness | [Read Guide →](04-type-narrowing-control-flow-and-guards-qa.md) | 10 Qs | ✅ Ready |
| **05** | **Advanced Conditionals & Infer** | Conditional Types, Distributive Conditionals, `infer` Pattern Matching, Recursive Types, `Awaited<T>`, `UnionToIntersection` | [Read Guide →](05-advanced-types-conditionals-and-infer-qa.md) | 9 Qs | ✅ Ready |
| **06** | **Mapped & Template Literal Types** | Mapped Types, Key Remapping (`as`), Template Literal Types, Strongly Typed Event Emitters, Dot-Notation Paths (`Path<T>`) | [Read Guide →](06-mapped-types-and-template-literal-types-qa.md) | 8 Qs | ✅ Ready |
| **07** | **Tuples, Arrays & Const Assertions** | Tuples vs Arrays, Variadic Tuples, Named Elements, `as const` vs `const` Type Parameters (TS 5.0), Non-Empty Array Modeling | [Read Guide →](07-tuples-arrays-and-const-assertions-qa.md) | 5 Qs | ✅ Ready |
| **08** | **Classes, OOP & Modern Decorators** | Classes, TS `private` vs JS `#private`, Parameter Properties, Stage 3 Decorators (TS 5.0+) vs Experimental, `override` Keyword | [Read Guide →](08-classes-oop-and-decorators-qa.md) | 6 Qs | ✅ Ready |
| **09** | **Type Variance & Subtyping Mechanics** | Covariance, Contravariance, Invariance, Bivariance, Method Shorthand Trap, `strictFunctionTypes`, In/Out Annotations | [Read Guide →](09-type-variance-and-structural-subtyping-qa.md) | 5 Qs | ✅ Ready |
| **10** | **Built-in Utilities & Type Gymnastics** | Standard Utility Types Internals, Custom Utilities (`DeepPartial`, `IsAny`, `IsNever`, `IsEqual`, `TupleToUnion`) | [Read Guide →](10-built-in-utility-types-and-type-gymnastics-qa.md) | 5 Qs | ✅ Ready |
| **11** | **TSConfig, Compiler Options & Resolution** | `tsconfig.json` Architecture, Strict Family, Beyond-Strict Flags, `NodeNext` vs `Bundler`, `verbatimModuleSyntax`, `--isolatedDeclarations`, `--erasableSyntaxOnly` | [Read Guide →](11-tsconfig-compiler-options-and-module-resolution-qa.md) | 7 Qs | ✅ Ready |
| **12** | **Modules, Namespaces & ESM/CJS Interop** | Dual-Package Hazard, Package `exports`, Type-Only Imports, Import Attributes (`with`), Ambient Declarations, Native TS Runtimes | [Read Guide →](12-modules-namespaces-and-esm-cjs-interop-qa.md) | 6 Qs | ✅ Ready |
| **13** | **Monorepos, Project References & Perf** | Project References (`tsc -b`, `composite`), Monorepo Config Topology, Compiler Tracing (`--generateTrace`), Eliminating Bottlenecks | [Read Guide →](13-monorepos-project-references-and-build-performance-qa.md) | 5 Qs | ✅ Ready |
| **14** | **Type Testing, Linting & Ecosystem** | Type Testing (`expectTypeOf`, `tsd`), `@ts-expect-error` vs `@ts-ignore`, Type-Aware ESLint Rules, Runtime Schemas (Zod) ↔ TS Interop | [Read Guide →](14-testing-types-linting-and-ecosystem-tooling-qa.md) | 5 Qs | ✅ Ready |
| **15** | **Enterprise Architecture & API Safety** | End-to-End Type Safety (tRPC, GraphQL Codegen), Strongly Typed REST Clients, `Result<T, E>` Pattern, DDD Value Objects, RADIO Design | [Read Guide →](15-enterprise-architecture-and-api-type-safety-qa.md) | 5 Qs | ✅ Ready |
| **16** | **Version Evolution & Last 5 Releases** | TS 3.x vs 4.x vs 5.x Architecture Shifts, Deep Dive into Last 5 Versions (5.4, 5.5, 5.6, 5.7, 5.8), 16 Before-vs-After Paradigm Shift Code Comparisons | [Read Guide →](16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md) | 18 Qs | ✅ Ready |

---

## 🎯 Question Schema Standard

Every question in this repository adheres strictly to this standardized format:

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation breaking down type-system mechanics under the hood. Accompanied by ASCII/Unicode mental model diagrams, comparison tables, and idiomatic, production-ready TypeScript code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Realistic edge-case challenge, production gotcha, or trap scenario]"  
*Senior Answer:* [How a staff engineer resolves the nuance with concrete mitigations, runtime vs compile-time boundaries, and architectural trade-offs.]
```

---

## 🧭 Role-Based Learning Tracks

Choose the preparation pathway tailored to your target engineering level:

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ROLE-BASED STUDY TRACKS                              │
├────────────────────────────────────────────────────────────────────────────────┤
│ 1. 🟢 Junior / Mid Fast-Track    ──▶  01 ─▶ 02 ─▶ 03 ─▶ 04 ─▶ 07 ─▶ 10 ─▶ 11   │
│ 2. 🔴 Senior Full-Stack Track    ──▶  04 ─▶ 05 ─▶ 06 ─▶ 08 ─▶ 09 ─▶ 12 ─▶ 15   │
│ 3. 🟣 Staff / Principal Track    ──▶  09 ─▶ 11 ─▶ 12 ─▶ 13 ─▶ 14 ─▶ 15 ─▶ 16   │
│ 4. ⚙️ Tsconfig & Tooling Track   ──▶  11 ─▶ 12 ─▶ 13 ─▶ 14 ─▶ 16                │
│ 5. 🔄 TS 5.x Migration Track     ──▶  08 ─▶ 11 ─▶ 12 ─▶ 16                      │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 1. 🟢 Fast-Track: Junior / Mid Core Mastery
- **Focus:** Foundations, structural subtyping, interfaces vs types, generics, type narrowing, built-in utilities, tsconfig strict mode.
- **Recommended Modules:**
  - [`01-type-system-foundations-and-runtime-qa.md`](01-type-system-foundations-and-runtime-qa.md)
  - [`02-interfaces-types-and-object-modeling-qa.md`](02-interfaces-types-and-object-modeling-qa.md)
  - [`03-functions-generics-and-type-constraints-qa.md`](03-functions-generics-and-type-constraints-qa.md)
  - [`04-type-narrowing-control-flow-and-guards-qa.md`](04-type-narrowing-control-flow-and-guards-qa.md)
  - [`07-tuples-arrays-and-const-assertions-qa.md`](07-tuples-arrays-and-const-assertions-qa.md)
  - [`10-built-in-utility-types-and-type-gymnastics-qa.md`](10-built-in-utility-types-and-type-gymnastics-qa.md)
  - [`11-tsconfig-compiler-options-and-module-resolution-qa.md`](11-tsconfig-compiler-options-and-module-resolution-qa.md)

### 2. 🔴 Advanced: Senior Full-Stack & Type Gymnastics
- **Focus:** Advanced conditional types, `infer`, mapped types, template literals, variance mechanics, modern decorators, ESM/CJS interop, type testing, and API type safety.
- **Recommended Modules:**
  - [`04-type-narrowing-control-flow-and-guards-qa.md`](04-type-narrowing-control-flow-and-guards-qa.md)
  - [`05-advanced-types-conditionals-and-infer-qa.md`](05-advanced-types-conditionals-and-infer-qa.md)
  - [`06-mapped-types-and-template-literal-types-qa.md`](06-mapped-types-and-template-literal-types-qa.md)
  - [`08-classes-oop-and-decorators-qa.md`](08-classes-oop-and-decorators-qa.md)
  - [`09-type-variance-and-structural-subtyping-qa.md`](09-type-variance-and-structural-subtyping-qa.md)
  - [`10-built-in-utility-types-and-type-gymnastics-qa.md`](10-built-in-utility-types-and-type-gymnastics-qa.md)
  - [`12-modules-namespaces-and-esm-cjs-interop-qa.md`](12-modules-namespaces-and-esm-cjs-interop-qa.md)
  - [`14-testing-types-linting-and-ecosystem-tooling-qa.md`](14-testing-types-linting-and-ecosystem-tooling-qa.md)
  - [`15-enterprise-architecture-and-api-type-safety-qa.md`](15-enterprise-architecture-and-api-type-safety-qa.md)

### 3. 🟣 Staff / Principal / Architect Track
- **Focus:** Monorepo architecture, project references (`composite`, `tsc -b`), compiler tracing, enterprise DDD, `isolatedDeclarations`, zero-runtime overhead, and migration strategies.
- **Recommended Modules:**
  - [`09-type-variance-and-structural-subtyping-qa.md`](09-type-variance-and-structural-subtyping-qa.md)
  - [`11-tsconfig-compiler-options-and-module-resolution-qa.md`](11-tsconfig-compiler-options-and-module-resolution-qa.md)
  - [`12-modules-namespaces-and-esm-cjs-interop-qa.md`](12-modules-namespaces-and-esm-cjs-interop-qa.md)
  - [`13-monorepos-project-references-and-build-performance-qa.md`](13-monorepos-project-references-and-build-performance-qa.md)
  - [`14-testing-types-linting-and-ecosystem-tooling-qa.md`](14-testing-types-linting-and-ecosystem-tooling-qa.md)
  - [`15-enterprise-architecture-and-api-type-safety-qa.md`](15-enterprise-architecture-and-api-type-safety-qa.md)
  - [`16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md`](16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md)

### 4. ⚙️ Tsconfig, Tooling & Build Performance Specialist Track
- **Focus:** Deep dive into compiler flags, `NodeNext` vs `Bundler`, `verbatimModuleSyntax`, `--erasableSyntaxOnly`, `--isolatedDeclarations`, build optimization, `--generateTrace`.
- **Recommended Modules:**
  - [`11-tsconfig-compiler-options-and-module-resolution-qa.md`](11-tsconfig-compiler-options-and-module-resolution-qa.md)
  - [`12-modules-namespaces-and-esm-cjs-interop-qa.md`](12-modules-namespaces-and-esm-cjs-interop-qa.md)
  - [`13-monorepos-project-references-and-build-performance-qa.md`](13-monorepos-project-references-and-build-performance-qa.md)
  - [`14-testing-types-linting-and-ecosystem-tooling-qa.md`](14-testing-types-linting-and-ecosystem-tooling-qa.md)
  - [`16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md`](16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md)

### 5. 🔄 Modern TypeScript 5.x & Version Migration Track
- **Focus:** Transitioning from TS 3.x/4.x to modern TS 5.x, Stage 3 decorators, the last 5 releases (5.4–5.8), and before-vs-after code shifts.
- **Recommended Modules:**
  - [`08-classes-oop-and-decorators-qa.md`](08-classes-oop-and-decorators-qa.md)
  - [`11-tsconfig-compiler-options-and-module-resolution-qa.md`](11-tsconfig-compiler-options-and-module-resolution-qa.md)
  - [`12-modules-namespaces-and-esm-cjs-interop-qa.md`](12-modules-namespaces-and-esm-cjs-interop-qa.md)
  - [`16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md`](16-version-evolution-v3-to-v5-and-last-5-releases-deep-dive.md)

---

## 📊 Difficulty Taxonomy

- 🟢 **Junior:** Type primitives, type inference vs annotation, simple interfaces vs types, basic function typing, union types, fundamental compiler flags (`target`, `module`).
- 🟡 **Mid:** Generics and constraints (`extends keyof`), discriminated unions, user-defined type guards (`is`), built-in utility types (`Partial`, `Pick`, `Omit`), basic mapped types, `tsconfig.json` `strict: true`.
- 🔴 **Senior:** Distributive conditional types, `infer` pattern matching, template literal types, variance (covariance/contravariance), method shorthand bivariance trap, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, Stage 3 Decorators, `NodeNext` vs `Bundler`.
- 🟣 **Principal / Lead:** Monorepos with Project References (`composite`, `tsc -b`), `--isolatedDeclarations` architecture, compiler performance tracing (`--generateTrace`), dual-package hazard mitigation, end-to-end type safety systems, migration across major versions.
