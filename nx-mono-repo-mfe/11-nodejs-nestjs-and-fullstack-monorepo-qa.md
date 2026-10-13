# 11 — Node.js, NestJS & Fullstack Code Sharing in an Nx Monorepo

> Fullstack Monorepo Architecture, Backend-for-Frontend (BFF) Pattern with NestJS & Fastify, End-to-End Type Safety, Shared Contracts with Zod & DTOs, Prisma/Drizzle Database Layers, and Preventing Server-Side Code Leaks into Client Bundles.

---

## 📑 Table of Contents
1. [Fullstack Architecture & The BFF Pattern in Nx](#1-fullstack-architecture--the-bff-pattern-in-nx)
2. [End-to-End Type Safety with Shared Zod Contracts](#2-end-to-end-type-safety-with-shared-zod-contracts)
3. [Database Management & ORM Sharing (Prisma / Drizzle)](#3-database-management--orm-sharing-prisma--drizzle)
4. [Preventing Server-Side Code Leaks into Frontend Bundles](#4-preventing-server-side-code-leaks-into-frontend-bundles)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Fullstack Architecture & The BFF Pattern in Nx

### Q1: What is the Backend-for-Frontend (BFF) pattern, and how does co-locating NestJS BFFs with Frontend MFEs in an Nx monorepo supercharge delivery velocity?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[BFF]` `[NestJS]` `[Architecture]` `[Fullstack]`

**Answer:**
In large distributed systems, generic core microservices (e.g. Java/Go backend services) expose wide, un-aggregated domain APIs. A **Backend-for-Frontend (BFF)** is a dedicated, lightweight backend service tailored specifically to meet the data and presentation needs of a single frontend user interface.

```text
TRADITIONAL POLYREPO SETUP:
Frontend Repo: Types copy-pasted manually from backend Swagger docs.
Backend Repo:  API changes break frontend in production due to desynced types.

NX FULLSTACK MONOREPO WITH BFFs:
apps/
├── shell-host              (Angular Shell)
├── orders-mfe              (Angular Remote)
├── orders-bff              (NestJS / Fastify BFF)
│   └── calls Core Microservices, aggregates data, strips sensitive fields
└── catalog-bff             (Node.js / Express BFF)
libs/
└── orders/contracts        (SHARED TYPES & ZOD SCHEMAS)
    ├── order.dto.ts
    └── create-order.schema.ts
```

### The Monorepo Superpower:
1. **Atomic Fullstack Refactoring:** When an API contract changes (e.g. renaming `customerAddress` to `shippingAddress`), an engineer updates the shared contract in `libs/orders/contracts`. In the **same commit and PR**, both the NestJS controller and the Angular MFE are refactored and validated together by the compiler!
2. **Zero Code Generation Lag:** No waiting for npm packages to publish or CI pipelines to trigger across multiple repositories.

---

## 2. End-to-End Type Safety with Shared Zod Contracts

### Q2: How do you implement end-to-end type safety between a NestJS backend and an Angular/React MFE using a shared Zod contract library?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Zod]` `[TypeScript]` `[NestJS]` `[Validation]`

**Answer:**

### Step 1: Create Shared Pure Contract (`libs/orders/contracts`)
```typescript
// libs/orders/contracts/src/lib/order.schema.ts
import { z } from 'zod';

// Pure runtime schema + compile-time type inference
export const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(
    z.object({
      sku: z.string().min(3),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ).min(1, 'At least one item is required'),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'OVERNIGHT']),
});

// Infer TypeScript type automatically from schema
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

export interface OrderResponse {
  id: string;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED';
  createdAt: string;
}
```

### Step 2: Consumed in NestJS BFF Controller
```typescript
// apps/orders-bff/src/app/orders.controller.ts
import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { CreateOrderDto, CreateOrderSchema, OrderResponse } from '@myorg/orders/contracts';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('orders')
export class OrdersController {
  @Post()
  @UsePipes(new ZodValidationPipe(CreateOrderSchema))
  async createOrder(@Body() orderDto: CreateOrderDto): Promise<OrderResponse> {
    // orderDto is guaranteed 100% type-safe and validated at runtime!
    return {
      id: 'ord-1234',
      total: 199.99,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
    };
  }
}
```

### Step 3: Consumed in Angular MFE Client
```typescript
// apps/orders-mfe/src/app/checkout.component.ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateOrderDto, OrderResponse } from '@myorg/orders/contracts';

@Component({ ... })
export class CheckoutComponent {
  private http = inject(HttpClient);

  submitOrder(payload: CreateOrderDto) {
    this.http.post<OrderResponse>('/api/orders', payload).subscribe((res) => {
      console.log('Order created successfully with ID:', res.id);
    });
  }
}
```

---

## 3. Database Management & ORM Sharing (Prisma / Drizzle)

### Q3: How should a Prisma or Drizzle ORM database layer be architected inside an Nx workspace?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Database]` `[Prisma]` `[Drizzle]` `[ORM]`

**Answer:**
The database access layer should live inside a dedicated backend library: `libs/backend/database`.

```text
libs/backend/database/
├── prisma/
│   └── schema.prisma        (Single source of database truth)
├── src/
│   ├── lib/prisma.service.ts(Injectable NestJS Prisma Client wrapper)
│   └── index.ts             (Exports PrismaService & DB Types)
└── project.json
```

### Nx Task Pipelines for Database Migrations:
Configure database targets in `libs/backend/database/project.json`:
```json
{
  "name": "backend-database",
  "targets": {
    "migrate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx prisma migrate dev",
        "cwd": "libs/backend/database"
      }
    },
    "generate": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx prisma generate",
        "cwd": "libs/backend/database"
      }
    }
  }
}
```

In `nx.json`, configure task dependencies so that backend services automatically run database client generation before building:
```json
"targetDefaults": {
  "build": {
    "dependsOn": ["^build", "^generate"]
  }
}
```

---

## 4. Preventing Server-Side Code Leaks into Frontend Bundles

### Q4: How do you prevent Node.js backend code (`fs`, `crypto`, database connections) from accidentally leaking into client-side MFE bundles?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Module-Boundaries]` `[Server-Leak]` `[ESLint]`

**Answer:**
In a fullstack monorepo, a developer might accidentally import a backend utility or service inside a frontend component:
```typescript
// IN FRONTEND COMPONENT (DISASTROUS IMPORT):
import { hashPassword } from '@myorg/backend/auth-utils'; // Uses Node 'crypto' / 'bcrypt'
```
When Webpack or Vite attempts to compile the frontend MFE, it will crash:
```text
Module not found: Can't resolve 'crypto' in ...
BREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules.
```

### The Multi-Layered Defense:
1. **ESLint Boundary Enforcement (`@nx/enforce-module-boundaries`):**
   Tag all backend projects with `platform:node` and frontend projects with `platform:web`.
   ```javascript
   // eslint.config.js
   {
     sourceTag: 'platform:web',
     onlyDependOnLibsWithTags: ['platform:web', 'platform:shared'],
   }
   ```
   If a frontend library attempts to import a library tagged `platform:node`, ESLint flags it as a fatal build-blocking error **before compilation even begins**.
2. **Pure Contracts Isolation:** Ensure shared contract libraries (`libs/orders/contracts`) contain **zero runtime imports of Node.js packages** or NestJS framework decorators (`@nestjs/common`).

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug Scenario: Webpack Fails with "Can't resolve 'fs'" on Shared Contract
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Webpack]` `[Node.js]`

**Scenario:**
A developer creates a shared contract `OrderDto` in `libs/shared/contracts`.
An Angular MFE imports `OrderDto`.
Suddenly, running `nx build orders-mfe` fails with:
```text
ERROR in ./node_modules/@nestjs/common/utils/load-package.util.js 14:15-30
Module not found: Error: Can't resolve 'fs' in '.../node_modules/@nestjs/common/utils'
```
The developer checks their Angular code: they never imported `fs` anywhere! Why did this error occur?

**Answer:**
**Root Cause:** The shared DTO file in `libs/shared/contracts` was using NestJS validation decorators from `@nestjs/common` or importing class-validator Swagger metadata!
```typescript
// libs/shared/contracts/src/order.dto.ts
import { ApiProperty } from '@nestjs/swagger'; // <--- IMPORTS SERVER LIBS!

export class OrderDto {
  @ApiProperty()
  id: string;
}
```
When `@nestjs/swagger` is evaluated by Webpack, its internal dependency chain pulls in `@nestjs/common`, which attempts to require Node.js core modules (`fs`, `path`, `module`). Because the client-side Webpack bundler does not polyfill Node core modules, the build crashes!

**Fix:** Keep contracts framework-agnostic! Use **Zod** or pure TypeScript interfaces in shared contracts libraries, completely removing `@nestjs/*` dependencies from shared libraries consumed by browsers.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why is Zod often preferred over `class-validator` for shared contracts in an Nx monorepo?
**Answer:** `class-validator` relies on experimental TypeScript decorators and `reflect-metadata`, which bloat client bundles and require specific compiler flags. Zod is a lightweight, pure functional TypeScript schema parser with zero polyfill requirements.

### Q7: Can a NestJS BFF and an Angular MFE share the same port in local development?
**Answer:** No. They are independent processes. Typically, the Angular MFE runs on port 4200 (or 4201), and the NestJS BFF runs on port 3333. An Angular proxy configuration (`proxy.conf.json`) routes `/api` calls seamlessly to `http://localhost:3333`.

### Q8: What is tRPC, and how does it fit into an Nx monorepo?
**Answer:** tRPC enables end-to-end type safety between client and server without code generation or schemas by directly sharing the backend router's TypeScript type definition with the client API client.

### Q9: Can an Angular Remote directly query a PostgreSQL database in an Nx monorepo?
**Answer:** **Strictly No.** Browsers cannot open direct TCP connections to relational databases (PostgreSQL/MySQL), and shipping database credentials to the client is a catastrophic security vulnerability. Browsers must always communicate through a backend API/BFF.
