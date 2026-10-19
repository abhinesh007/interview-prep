# 15 — Enterprise Architecture & API Type Safety

> Deep dive into End-to-End Type Safety (tRPC, OpenAPI, GraphQL Codegen), strongly typed HTTP REST clients, Functional Error Handling (`Result<T, E>`), Domain-Driven Design (DDD) with branded value objects, and a Senior System Design Scenario using the RADIO Framework.

---

## 📑 Table of Contents
1. [End-to-End Type Safety & Typed REST Clients](#1-end-to-end-type-safety--typed-rest-clients)
2. [Functional Error Handling: The `Result<T, E>` Pattern](#2-functional-error-handling-the-resultt-e-pattern)
3. [Domain-Driven Design (DDD) with Branded Value Objects](#3-domain-driven-design-ddd-with-branded-value-objects)
4. [🏗️ Senior System Design: Multi-Tenant Analytics SDK (RADIO)](#4-️-senior-system-design-multi-tenant-analytics-sdk-radio)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. End-to-End Type Safety & Typed REST Clients

### Q1: How do you build a strongly typed HTTP API Client wrapper around `fetch` that enforces valid routes, methods, and response payloads at compile time?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & Architecture  
**Tags:** `[End-To-End-Type-Safety]` `[Fetch-Wrapper]` `[API-Client]`

**Answer:**
```typescript
// 1. Declare the API Route Contract Interface:
export interface ApiContract {
  "/users": {
    GET: {
      params?: { page?: number; limit?: number };
      response: { users: { id: string; name: string }[]; total: number };
    };
    POST: {
      body: { name: string; email: string };
      response: { id: string; name: string; createdAt: string };
    };
  };
  "/users/:id": {
    GET: {
      response: { id: string; name: string; email: string };
    };
    DELETE: {
      response: { success: boolean };
    };
  };
}

// 2. Strongly Typed API Client Implementation:
export class TypedApiClient {
  constructor(private baseUrl: string) {}

  async request<
    Path extends keyof ApiContract,
    Method extends keyof ApiContract[Path]
  >(
    path: Path,
    method: Method,
    options?: ApiContract[Path][Method] extends { body: infer B }
      ? { body: B }
      : { body?: never }
  ): Promise<
    ApiContract[Path][Method] extends { response: infer R } ? R : never
  > {
    const res = await fetch(`${this.baseUrl}${path as string}`, {
      method: method as string,
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  }
}

// 3. Usage Verification:
const client = new TypedApiClient("https://api.internal.com");

// ✅ Valid: Autocompletes route, method, and body. Response is strictly typed!
const newUser = await client.request("/users", "POST", {
  body: { name: "Grace Hopper", email: "grace@navy.mil" }
});
console.log(newUser.id); // Inferred string!

// ❌ Compile Error: Method 'PATCH' does not exist on '/users'!
// await client.request("/users", "PATCH");
```

---

## 2. Functional Error Handling: The `Result<T, E>` Pattern

### Q2: Why is throwing exceptions considered an anti-pattern for predictable domain logic in TypeScript, and how does the `Result<T, E>` pattern fix it?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture & Error Handling  
**Tags:** `[Result-Pattern]` `[Either]` `[Error-Handling]`

**Answer:**
In TypeScript, **thrown exceptions are completely invisible to the type system**. TypeScript functions cannot declare checked exceptions:
`function findUser(id: string): User` can throw `DatabaseError`, `NotFoundError`, or `NetworkError`, but the caller only sees `User`.

#### The `Result<T, E>` Discriminated Union:
```typescript
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Application Logic:
type RegistrationError = 
  | { code: "EMAIL_TAKEN"; email: string }
  | { code: "WEAK_PASSWORD"; minLength: number };

export function registerUser(email: string, password: string): Result<{ userId: string }, RegistrationError> {
  if (email === "admin@corp.com") {
    return Err({ code: "EMAIL_TAKEN", email });
  }
  if (password.length < 8) {
    return Err({ code: "WEAK_PASSWORD", minLength: 8 });
  }
  return Ok({ userId: "usr_99" });
}

// Caller is forced to handle errors:
const res = registerUser("test@test.com", "123");
if (!res.ok) {
  // res.error is narrowed to RegistrationError!
  console.error(`Registration failed: ${res.error.code}`);
} else {
  // res.value is narrowed to { userId: string }!
  console.log(`Registered user: ${res.value.userId}`);
}
```

---

## 3. Domain-Driven Design (DDD) with Branded Value Objects

### Q3: How do you implement Domain-Driven Design (DDD) Value Objects in TypeScript to prevent domain corruption?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical Coding & DDD  
**Tags:** `[DDD]` `[Value-Objects]` `[Branded-Types]`

**Answer:**
In large domains, raw primitives (`string`, `number`) lead to accidental bugs (e.g., passing `CustomerId` where `AccountId` is expected).

DDD Value Objects are modeled as **immutable branded types** with factory functions:

```typescript
declare const Brand: unique symbol;

export type CustomerId = string & { readonly [Brand]: "CustomerId" };
export type AccountId = string & { readonly [Brand]: "AccountId" };

// Factory with domain validation:
export function createCustomerId(raw: string): CustomerId {
  if (!/^CUST-[A-Z0-9]{8}$/.test(raw)) {
    throw new Error(`Domain Invariant Violation: Invalid CustomerId ${raw}`);
  }
  return raw as CustomerId;
}

export function createAccountId(raw: string): AccountId {
  if (!/^ACC-[0-9]{10}$/.test(raw)) {
    throw new Error(`Domain Invariant Violation: Invalid AccountId ${raw}`);
  }
  return raw as AccountId;
}

function linkCustomerAccount(customer: CustomerId, account: AccountId) {
  // ...
}

const cust = createCustomerId("CUST-ABC12345");
const acc = createAccountId("ACC-1234567890");

// ❌ Compile Error: Cannot accidentally swap arguments!
// linkCustomerAccount(acc, cust);
```

---

## 4. 🏗️ Senior System Design: Multi-Tenant Analytics SDK (RADIO)

### Q4: Design a high-performance, strongly typed Multi-Tenant Analytics & Feature Flagging SDK.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design (RADIO Framework)  
**Tags:** `[System-Design]` `[RADIO]` `[SDK-Architecture]`

**Answer:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SDK CLIENT ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────────────┤
│  Fluent Builder API (Compile-time step validation)                     │
│  └── Strongly Typed Event Registry (Mapped & Template Literal Types)   │
│      └── Offline Buffer & Batching Queue                               │
│          └── Network Edge Dispatcher                                   │
└────────────────────────────────────────────────────────────────────────┘
```

#### R — Requirements:
- **Functional:** Zero-runtime overhead typing, strict event tracking with custom schemas per tenant, offline queueing.
- **Non-Functional:** Bundle budget < 10KB gzipped, zero runtime schema library dependencies in client bundle.

#### A — Architecture:
- Core SDK package with zero external dependencies.
- Compile-time type generation using template literal and mapped types.

#### D — Data Contracts & Types:
```typescript
export interface TenantEventSchemas {
  ecommerce: {
    "product:viewed": { productId: string; price: number };
    "checkout:completed": { orderId: string; total: number; itemCount: number };
  };
  saas: {
    "workspace:created": { workspaceId: string; plan: "free" | "pro" };
    "member:invited": { email: string; role: string };
  };
}

export class AnalyticsClient<Tenant extends keyof TenantEventSchemas> {
  track<E extends keyof TenantEventSchemas[Tenant]>(
    event: E,
    properties: TenantEventSchemas[Tenant][E]
  ): void {
    // Queued into memory buffer...
  }
}
```

#### I — Interface Design (Fluent Builder Pattern):
```typescript
export class AnalyticsBuilder<Tenant extends keyof TenantEventSchemas> {
  private tenant!: Tenant;
  private apiKey!: string;

  withTenant<T extends keyof TenantEventSchemas>(tenant: T): AnalyticsBuilder<T> {
    return this as any;
  }

  withApiKey(key: string): this {
    this.apiKey = key;
    return this;
  }

  build(): AnalyticsClient<Tenant> {
    return new AnalyticsClient<Tenant>();
  }
}
```

#### O — Optimizations & Trade-Offs:
- **Trade-off:** Validation is purely compile-time for the SDK bundle to keep it < 8KB. Runtime validation is offloaded to the backend ingestion gateway with Zod/Ajv.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: How do tools like tRPC achieve end-to-end type safety without generating client code?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[tRPC]` `[Inference]`

**Answer:**
tRPC exports the backend's root router **type only** (`export type AppRouter = typeof appRouter;`). The frontend imports this type via `import type { AppRouter }`. Because only types are imported, the backend JavaScript code is completely omitted from the frontend bundle, yet full autocomplete and type-checking remain active!
