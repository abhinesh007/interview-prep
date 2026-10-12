# 09 — Modern API Frameworks: Express, Fastify & NestJS

> Express vs Fastify vs NestJS Architectural Breakdown, Radix-Tree Routing (`find-my-way`), Fastify Plugin Encapsulation, Schema Serialization (`fast-json-stringify`), and NestJS DI Scopes.

---

## 📑 Table of Contents
1. [Framework Architectures & Philosophy Comparison](#1-framework-architectures--philosophy-comparison)
2. [Routing Internals: Radix Tree vs Array Scan](#2-routing-internals-radix-tree-vs-array-scan)
3. [Fastify Deep Dive: Encapsulation & Schema Compilation](#3-fastify-deep-dive-encapsulation--schema-compilation)
4. [NestJS Enterprise Architecture & Dependency Injection](#4-nestjs-enterprise-architecture--dependency-injection)
5. [Middleware Pipelines & Error Handling Gotchas](#5-middleware-pipelines--error-handling-gotchas)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Framework Architectures & Philosophy Comparison

### Q1: Compare Express, Fastify, and NestJS across architecture, routing complexity, performance, and enterprise suitability.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Architecture]` `[Express]` `[Fastify]` `[NestJS]`

**Answer:**

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Express     │       │     Fastify     │       │     NestJS      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ Minimalist      │       │ High-Throughput │       │ Enterprise      │
│ Middleware Pipe │       │ Schema-Driven   │       │ Layered / DI    │
│ Array Routing   │       │ Radix-Tree Trie │       │ Opinionated     │
│ Legacy Unmanaged│       │ Encapsulation   │       │ Angular-like    │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

| Dimension | Express (v4/v5) | Fastify (v4/v5) | NestJS (v10+) |
|---|---|---|---|
| **Architectural Style** | Minimalist micro-framework; un-opinionated | Plugin-based, schema-first, encapsulated | Multi-tiered, modular, Dependency Injection (DI) |
| **Routing Algorithm** | Linear Array Scan (`router.stack` $O(N)$) | Radix Tree (`find-my-way` near $O(1)$) | Uses Express or Fastify under the hood |
| **Serialization** | Native `JSON.stringify()` (Slow) | `fast-json-stringify` (Compiled C-like speed) | Interceptors / class-transformer |
| **Schema Validation** | Requires external manual middleware | Native JSON Schema integration (Ajv) | ValidationPipe with `class-validator` or Zod |
| **Async Errors** | Express 4 drops unhandled async errors! | Fully native promise/async lifecycle | Global Exception Filters |
| **Throughput** | ~20,000–30,000 req/s | **~75,000–90,000 req/s** | ~25k (Express adapter) / ~70k (Fastify adapter) |

---

## 2. Routing Internals: Radix Tree vs Array Scan

### Q2: Why does Fastify's routing perform up to 10x faster than Express on large API codebases with hundreds of routes?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Routing]` `[RadixTree]` `[Algorithms]`

**Answer:**

#### Express Routing: The Sequential Array Scan ($O(N)$)
Express stores all registered middleware and routes in a single flat array: `app._router.stack`.
When an HTTP request arrives (e.g., `GET /api/v1/orders/123`):
- Express loops through every middleware and route in sequence from index `0` to $N$.
- For each entry, it executes a regular expression match (`path-to-regexp`).
- If you have 300 registered routes and the matching route is at the end, **it evaluates 300 regex operations** on every single request.

#### Fastify Routing: Compressed Radix Tree ($O(K)$, where $K$ is path length)
Fastify uses the **`find-my-way`** routing library based on a Radix Tree (compressed trie):

```text
                      root ('/')
                      ┌───┴───┐
                    'api/'   'health'
                      │
                   'v1/'
                 ┌────┴────┐
             'users/'   'orders/'
               │           │
            ':userId'   ':orderId'
```
- Path matching traverses characters of the URL down the tree.
- Time complexity is proportional strictly to the **depth of the URL string**, completely independent of whether the application has 10 routes or 10,000 routes.

---

## 3. Fastify Deep Dive: Encapsulation & Schema Compilation

### Q3: How does Fastify's Plugin Encapsulation model work, and what is `fast-json-stringify`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Fastify]` `[Encapsulation]` `[Serialization]`

**Answer:**

#### 1. Plugin Encapsulation (`fastify.register()`):
In Express, middleware mutations are global; attaching a property to `req` in one route leaks everywhere.
Fastify creates an **isolated child context** for every registered plugin:
- Decorators, hooks, and schemas added inside a plugin are available **only to that plugin and its descendants**.
- They do not pollute the parent or sibling plugins.
- To make a plugin global (e.g., a database connection pool), wrap it with `fastify-plugin` (`fp`).

```typescript
import Fastify from 'fastify';
import fp from 'fastify-plugin';

const fastify = Fastify();

// Scoped Feature Plugin (Encapsulated)
fastify.register(async function orderRoutes(childServer) {
  // Hook applies ONLY to /orders/* routes!
  childServer.addHook('onRequest', async (req) => {
    console.log('Order request received');
  });

  childServer.get('/orders', async () => [{ id: '1' }]);
});
```

#### 2. High-Speed Serialization with `fast-json-stringify`:
Native `JSON.stringify()` inspects every object property recursively at runtime via V8 reflection.
Fastify uses **JSON Schema** to compile a dedicated C-style string concatenation function in V8 machine code ahead of time:

```typescript
fastify.get('/user/:id', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
}, async (request, reply) => {
  return { id: 'u123', email: 'user@example.com', internalSecret: 'HIDDEN' };
});
```
*Benefits:*
1. **2x to 5x faster serialization speed.**
2. **Automatic Security Redaction:** Fields not defined in the schema (like `internalSecret`) are stripped automatically, preventing accidental data leaks.

---

## 4. NestJS Enterprise Architecture & Dependency Injection

### Q4: Explain NestJS Injection Scopes (DEFAULT, REQUEST, TRANSIENT). Why is `Scope.REQUEST` a severe performance hazard?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[NestJS]` `[DependencyInjection]` `[Performance]`

**Answer:**

```typescript
@Injectable({ scope: Scope.DEFAULT })   // 1. Singleton (Recommended)
@Injectable({ scope: Scope.REQUEST })   // 2. Request-scoped (DANGEROUS)
@Injectable({ scope: Scope.TRANSIENT }) // 3. Transient (New instance per injector)
```

1. **`Scope.DEFAULT` (Singleton):** The provider is instantiated once at application startup. Reused across all incoming HTTP requests. High performance, zero GC thrashing.
2. **`Scope.REQUEST`:** A **brand new instance of the provider is allocated for every single incoming HTTP request**, and garbage-collected when the request finishes.
3. **`Scope.TRANSIENT`:** A new instance is dedicated to every consumer that injects it.

#### The `Scope.REQUEST` Performance Bubble:
In NestJS, **Injection Scope bubbles upwards!**
If you mark a low-level service (e.g., `TenantService`) as `Scope.REQUEST`:
- Every Controller, Service, and Repository that injects `TenantService` is **automatically forced into `Scope.REQUEST` as well**!
- Under 2,000 req/s, NestJS instantiates tens of thousands of JavaScript class instances, runs hundreds of constructor functions, and triggers violent V8 GC thrashing, dropping API throughput by 60–80%.

**Senior Solution:** Keep services as Singletons (`Scope.DEFAULT`). Access request-specific tenant info via function arguments or `AsyncLocalStorage` instead of request-scoped DI!

---

### Q5: What is the exact execution lifecycle order of NestJS Guards, Interceptors, Pipes, and Filters?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[NestJS]` `[Lifecycle]`

**Answer:**

```text
Incoming Request
      │
      ▼
1. Global / Controller / Route GUARDS ──────► (CanActivate - Authentication / RBAC)
      │
      ▼
2. INTERCEPTORS (Pre-Controller) ───────────► (Logging, Metrics, Timing start)
      │
      ▼
3. PIPES ───────────────────────────────────► (Validation via Zod / class-validator)
      │
      ▼
4. CONTROLLER HANDLER ──────────────────────► (Executes Business Logic)
      │
      ▼
5. INTERCEPTORS (Post-Controller) ──────────► (Transform response, timing end)
      │
      ▼
6. EXCEPTION FILTERS ───────────────────────► (Catch unhandled errors, format JSON)
      │
      ▼
Response Sent to Client
```

---

## 5. Middleware Pipelines & Error Handling Gotchas

### Q6: Why does Express require exactly four arguments `(err, req, res, next)` for error-handling middleware?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Express]` `[ErrorHandling]` `[Gotcha]`

**Answer:**
Express determines whether a middleware is a standard route handler or an error handler using **`fn.length`** (JavaScript reflection on the function's parameter count).

```javascript
// BUG: Removing 'next' drops fn.length from 4 to 3!
app.use((err, req, res) => {
  // Express treats this as a NORMAL middleware!
  // It will NEVER be invoked when an error is thrown!
  res.status(500).json({ error: err.message });
});

// CORRECT: Exactly 4 parameters
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: How does asynchronous error handling differ between Express 4 and Express 5?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Express]` `[AsyncErrors]`

**Answer:**
- **Express 4:** An unhandled rejected promise inside an `async (req, res)` handler is **not caught** by Express. The request hangs indefinitely or crashes the process. You had to wrap every route in `try/catch` or use `express-async-errors`.
- **Express 5:** Natively supports Promises. Any rejected promise in an async route is caught automatically and passed to `next(err)`.

---

### Q8: How do you configure NestJS to run on Fastify instead of Express?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[NestJS]` `[Fastify]`

**Answer:**
Install `@nestjs/platform-fastify` and provide `FastifyAdapter` during bootstrap:
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```
