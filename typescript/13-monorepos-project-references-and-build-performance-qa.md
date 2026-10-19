# 13 — Monorepos, Project References & Build Performance

> Deep dive into TypeScript Project References (`tsc -b`, `composite: true`), Monorepo configuration architecture (Nx, Turborepo, pnpm), compiler performance profiling (`--generateTrace`), and eliminating type-checker bottlenecks.

---

## 📑 Table of Contents
1. [Project References Architecture (`tsc -b`)](#1-project-references-architecture-tsc--b)
2. [Monorepo TSConfig Hierarchy & Boundaries](#2-monorepo-tsconfig-hierarchy--boundaries)
3. [Compiler Performance Profiling & Optimization](#3-compiler-performance-profiling--optimization)
4. [🎯 Quick-Fire & Trap Questions](#4--quick-fire--trap-questions)

---

## 1. Project References Architecture (`tsc -b`)

### Q1: What are TypeScript Project References, and how does `tsc --build` (`tsc -b`) solve scaling issues in large codebases?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Build Performance  
**Tags:** `[Project-References]` `[Tsc-Build]` `[Composite]`

**Answer:**
In a standard monolithic TypeScript configuration, running `tsc` loads **every single file into a single massive Program object in memory**. In large codebases (hundreds of thousands of lines), this leads to excessive memory consumption and slow build cycles.

**Project References** divide a codebase into independent, smaller compilation units that reference each other:

```text
┌────────────────────────────────────────────────────────┐
│                        APP                             │
│                  (tsconfig.json)                       │
└──────────────┬──────────────────────────┬──────────────┘
               │ references               │ references
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│        UI-COMPONENTS         │ │          CORE-UTILS          │
│   (composite: true, .d.ts)   │ │   (composite: true, .d.ts)   │
└──────────────────────────────┘ └──────────────────────────────┘
```

#### The Four Mandatory Requirements for Project References:
1. **`"composite": true`:** Tells TypeScript the project can be built as a standalone unit.
2. **`"declaration": true`:** Forces the project to emit `.d.ts` files so consumers check against types, not raw implementation files.
3. **`"references": [{ "path": "../core-utils" }]`:** Explicitly lists dependencies in the consumer's `tsconfig.json`.
4. **`tsc --build` (`tsc -b`):** Must use the build orchestrator flag to build references in topological dependency order!

#### Performance Advantage:
When editing `APP`, TypeScript does NOT re-check the internal implementation of `CORE-UTILS`. It simply reads `CORE-UTILS`'s compiled `.d.ts` declaration files. If `CORE-UTILS` has not changed, its build is skipped entirely using `.tsbuildinfo` caches!

---

## 2. Monorepo TSConfig Hierarchy & Boundaries

### Q2: How do you design a clean, maintainable `tsconfig` hierarchy in an enterprise monorepo (Nx / Turborepo / pnpm)?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Enterprise Architecture  
**Tags:** `[Monorepos]` `[Nx]` `[Turborepo]` `[TSConfig-Hierarchy]`

**Answer:**
Enterprise monorepos follow a three-tier configuration hierarchy:

```text
monorepo-root/
├── tsconfig.base.json           # Shared strict compiler rules & path aliases
├── tsconfig.json                # Solution config referencing all packages
├── packages/
│   ├── core-domain/
│   │   ├── tsconfig.json        # References tsconfig.lib.json & tsconfig.spec.json
│   │   ├── tsconfig.lib.json    # Composite: true, emits .d.ts for production
│   │   └── tsconfig.spec.json   # Includes test files, references jest/vitest types
│   └── web-app/
│       ├── tsconfig.json        # References core-domain via project references
```

```json
// packages/core-domain/tsconfig.lib.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

**Benefits:**
- Production builds (`tsconfig.lib.json`) compile only clean source code without test bloat.
- IDEs load `tsconfig.json` which merges both production and test files.
- Circular dependencies between packages trigger an immediate compile-time error during topological sort.

---

## 3. Compiler Performance Profiling & Optimization

### Q3: How do you profile slow TypeScript compilation times, and what are the primary culprits of compiler slowdowns?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Profiling  
**Tags:** `[GenerateTrace]` `[Diagnostics]` `[Performance-Tuning]`

**Answer:**

#### Step 1: Run Diagnostics:
```bash
tsc --diagnostics --extendedDiagnostics
```
This outputs key metrics:
- `Files`: Total source files loaded (Check if `node_modules` was accidentally included).
- `Types`: Total unique type instances created.
- `Check time`: Milliseconds spent in the type-checking phase.

#### Step 2: Generate Chromium Performance Trace:
```bash
tsc --generateTrace ./perf-trace
```
Inspect the output using:
- **`@typescript/analyze-trace ./perf-trace`** (CLI tool that highlights hot types).
- Chrome's internal **`about://tracing`** or **Speedscope**. Look for wide boxes indicating expensive `checkSourceFile` and `instantiateType` calls.

#### The Top Three Culprits of Compiler Slowdowns:
1. **Massive Union Cross-Multiplications:** Template literal combinations or deep nested unions generating tens of thousands of type permutations.
2. **Deep Recursive Conditional Types:** Unrolling hundreds of recursive iterations without base-case guards.
3. **Heavy Barrel Files (`index.ts`):** Exporting hundreds of modules from a central `index.ts`, forcing the compiler to parse and bind entire component trees when an application only needs one utility function!

---

## 4. 🎯 Quick-Fire & Trap Questions

### Q4: What is `--stopOnBuildErrors` (Introduced in TS 5.6)?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Version Evolution (TS 5.6)  
**Tags:** `[TS-5.6]` `[StopOnBuildErrors]`

**Answer:**
When building multi-project monorepos with `tsc --build`, TypeScript previously continued building downstream projects even after an upstream dependency failed.
`--stopOnBuildErrors` immediately halts the entire build process upon the first error, saving substantial CI runner time.

---

### Q5: What is the `.tsbuildinfo` file, and should it be committed to Git?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[TsBuildInfo]` `[Incremental]`

**Answer:**
The `.tsbuildinfo` file caches the dependency graph and file hashes generated when `"incremental": true` is enabled. 
**It should NEVER be committed to Git.** It is machine-specific and should be added to `.gitignore`.
