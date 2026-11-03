# 09 — Enterprise Architecture & Structural Refactoring

> **Comprehensive, production-grade guide** on combating architectural erosion in AI-assisted codebases: refactoring AI-generated "micro-spaghetti" into Clean / Hexagonal Architecture (Ports and Adapters), enforcing Domain-Driven Design (DDD) aggregate invariants, eliminating God functions, and applying Dependency Inversion to ensure enterprise maintainability.

---

## 📑 Table of Contents
- [🧠 Part I: Conceptual Primer & Systems Architecture](#-part-i-conceptual-primer--systems-architecture)
  - [1. Systems Metaphor: The Locally Organized Junk Drawer](#1-systems-metaphor-the-locally-organized-junk-drawer)
  - [2. Hexagonal / Ports & Adapters Architectural Topology Diagram](#2-hexagonal--ports--adapters-architectural-topology-diagram)
  - [3. The Mechanics of Architectural Erosion (Micro-Spaghetti)](#3-the-mechanics-of-architectural-erosion-micro-spaghetti)
  - [4. Core Architectural Patterns & DDD Glossary](#4-core-architectural-patterns--ddd-glossary)
- [🧩 Part II: Progressive Technical Interview Questions & Answers](#-part-ii-progressive-technical-interview-questions--answers)
  - [1. Clean Architecture & Dependency Inversion (Q1–Q4)](#1-clean-architecture--dependency-inversion-q1q4)
  - [2. DDD Aggregate Roots & Value Object Invariants (Q5–Q8)](#2-ddd-aggregate-roots--value-object-invariants-q5q8)
  - [3. God Function Refactoring & Structural Decomposition (Q9–Q12)](#3-god-function-refactoring--structural-decomposition-q9q12)
  - [4. Enterprise Modularity & Boundary Enforcement (Q13–Q16)](#4-enterprise-modularity--boundary-enforcement-q13q16)
- [⚠️ Part III: Production Gotchas, Traps & Failure Modes](#️-part-iii-production-gotchas-traps--failure-modes)
- [🏭 Part IV: Real-World Enterprise Use Cases & Case Studies](#-part-iv-real-world-enterprise-use-cases--case-studies)
- [🎯 Part V: Quick-Fire & Trap Questions](#-part-v-quick-fire--trap-questions)
- [📚 Part VI: Curated References & Further Learning](#-part-vi-curated-references--further-learning)

---

## 🧠 Part I: Conceptual Primer & Systems Architecture

### 1. Systems Metaphor: The Locally Organized Junk Drawer

AI coding assistants (Cursor, Claude Code, GitHub Copilot) possess **High Local Coherence** but **Zero Global Architectural Context**.

> **Mental Model:**  
> AI-generated code is like a **Junk Drawer where every individual item is neatly labeled with masking tape**.  
> If you look at item 4, it says: *"Rubber bands, blue, size 42."* It looks organized.  
> **However, it is still a junk drawer: batteries are mixed with mayonnaise packets, passports are jammed against rusty scissors, and there is no kitchen pantry, filing cabinet, or tool shed.**

```
The AI "Single-File Monolith" Anti-Pattern (Local Convenience):
┌────────────────────────────────────────────────────────┐
│               orders.controller.ts (450 Lines)         │
├────────────────────────────────────────────────────────┤
│ • Express HTTP routing                                 │
│ • Raw SQL queries (`SELECT * FROM orders...`)          │
│ • Stripe SDK API credit card charging                  │
│ • Nodemailer email sending                             │
│ • Tax calculation math                                 │
│ • JWT parsing and permission checking                  │
└────────────────────────────────────────────────────────┘
Result: Zero testability without spinning up real credit card APIs and databases.
Impossible to reuse tax logic in billing or inventory services.
```

1. **The Micro-Spaghetti Problem:** Because AI generates code file-by-file or function-by-function, it solves every problem locally. If it needs to send an email, it initializes an email client directly inside the route handler. Over 6 months, an enterprise application ends up with 14 different email clients instantiated in 14 different files.
2. **The Dependency Inversion Principle (DIP):** High-level business policy (Domain) must **never** depend on low-level infrastructure (PostgreSQL, Stripe, SendGrid). Both must depend on abstractions (interfaces / Ports).
3. **Domain-Driven Design (DDD) Invariants:** Business rules belong inside rich, state-protecting **Aggregate Roots** and immutable **Value Objects**, not scattered across 20 controller procedural scripts.

---

### 2. Hexagonal / Ports & Adapters Architectural Topology Diagram

```
                 HEXAGONAL ARCHITECTURE (PORTS & ADAPTERS)
                 
                      PRIMARY / DRIVING ADAPTERS
                 (HTTP Controllers, CLI, Kafka Consumers)
                                  │
                                  ▼
      ┌────────────────────────────────────────────────────────┐
      │               APPLICATION LAYER (Use Cases)            │
      │        Orchestrates domain workflows and commands      │
      │                                                        │
      │   ┌────────────────────────────────────────────────┐   │
      │   │          DOMAIN CORE (Pure Business Logic)     │   │
      │   │ • Aggregate Roots & Entities                   │   │
      │   │ • Immutable Value Objects                      │   │
      │   │ • Domain Events & Invariants                   │   │
      │   │ [ ZERO EXTERNAL DEPENDENCIES OR ORM ANNOTATIONS]│   │
      │   └───────────────────────┬────────────────────────┘   │
      │                           │                            │
      │                     DRIVEN PORTS                       │
      │            (Interfaces: PaymentPort, OrderRepo)        │
      └───────────────────────────┼────────────────────────────┘
                                  │ Implemented by
                                  ▼
                     SECONDARY / DRIVEN ADAPTERS
              (PostgreSQL DB, Stripe Gateway, SendGrid, Redis)
```

---

### 3. The Mechanics of Architectural Erosion (Micro-Spaghetti)

Architectural erosion in AI-assisted codebases occurs across 4 stages:

$$\text{Architecture Quality} = \frac{\text{Separation of Concerns} \times \text{Domain Invariant Cohesion}}{\text{Coupling to External I/O}}$$

1. **Stage 1 (Inline Direct Execution):** AI implements features by importing third-party SDKs directly into controllers (`import stripe from 'stripe'`).
2. **Stage 2 (Anemic Domain Models):** AI generates database entities that are mere bags of getters/setters (`class Order { status: string; total: number; }`). All business logic leaks into service procedural scripts.
3. **Stage 3 (Duplicate Utility Drift):** Because the AI does not search the entire monorepo, it writes helper functions (`formatDate`, `calculateTax`, `sanitizeString`) that duplicate existing canonical utilities with slightly different logic.
4. **Stage 4 (Circular Dependency Collapse):** Controllers import services, services import models, models import formatters, formatters import controllers, breaking bundlers and runtime dependency injection containers.

---

### 4. Core Architectural Patterns & DDD Glossary

| Pattern / Concept | Architectural Purpose | AI Review Rule |
|---|---|---|
| **Port (Interface)** | An abstraction defining a boundary contract (e.g., `PaymentGatewayPort`). | Domain core depends *only* on ports. |
| **Adapter (Implementation)** | Concrete implementation of a port (e.g., `StripePaymentAdapter`). | Infrastructure layer implements adapters; domain never imports adapters. |
| **Value Object** | Immutable object defined purely by its attributes without identity (e.g., `Money`, `EmailAddress`). | Enforce for all domain primitives to eliminate primitive obsession. |
| **Aggregate Root** | Entity cluster that enforces transactional and domain consistency invariants (e.g., `Order`). | External services can only mutate aggregate state via public methods, never direct field assignment. |
| **Repository Pattern** | Mediates between domain and data mapping layers using collection-like interface. | Enforce that repositories return Domain Entities, never raw database ORM rows. |

---

## 🧩 Part II: Progressive Technical Interview Questions & Answers

### 1. Clean Architecture & Dependency Inversion (Q1–Q4)

---

#### Q1: Refactor this 200-line AI-generated monolithic route handler into Clean / Hexagonal Architecture.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[Clean-Architecture]` `[Hexagonal]` `[Refactoring]` `[TypeScript]`

**Flawed AI-Generated Scaffold:**
```typescript
// orders.controller.ts
import express from 'express';
import { db } from './db';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET!);

router.post('/checkout', async (req, res) => {
  const { customerId, items } = req.body;

  // 1. Calculate total in controller
  let total = 0;
  for (const item of items) {
    const p = await db.query('SELECT price FROM products WHERE id = $1', [item.id]);
    total += p.rows[0].price * item.quantity;
  }

  // 2. Charge card directly in controller
  const charge = await stripe.charges.create({
    amount: total,
    currency: 'usd',
    customer: customerId,
  });

  // 3. Insert order
  const order = await db.query(
    'INSERT INTO orders (customer_id, total, charge_id) VALUES ($1, $2, $3) RETURNING id',
    [customerId, total, charge.id]
  );

  // 4. Send email in controller
  const transporter = nodemailer.createTransport({});
  await transporter.sendMail({
    to: req.body.email,
    subject: 'Order Confirmed',
    text: `Order ${order.rows[0].id} placed for $${total / 100}`,
  });

  res.json({ orderId: order.rows[0].id });
});
```

**Answer:**
##### Architectural Decomposition:
We decompose this procedural monolith into three isolated layers:
1. **Domain Core:** Pure entities, value objects, and business calculations (zero npm dependencies).
2. **Ports (Driven Interfaces):** `PaymentGatewayPort`, `OrderRepositoryPort`, `NotificationPort`.
3. **Application Use Case:** `CheckoutUseCase` orchestrating the workflow.
4. **Primary Adapter:** HTTP Controller receiving JSON and calling the Use Case.

##### 1. Domain Layer (`src/domain/order.ts`):
```typescript
// Pure domain entity enforcing business invariants
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: ReadonlyArray<{ productId: string; quantity: number; unitPriceCents: number }>,
    public readonly status: 'PENDING' | 'PAID' | 'CANCELLED'
  ) {}

  public static create(
    id: string,
    customerId: string,
    items: Array<{ productId: string; quantity: number; unitPriceCents: number }>
  ): Order {
    if (items.length === 0) {
      throw new Error('An order must contain at least one item');
    }
    for (const item of items) {
      if (item.quantity <= 0) throw new Error('Item quantity must be positive');
    }
    return new Order(id, customerId, Object.freeze([...items]), 'PENDING');
  }

  public calculateTotalCents(): number {
    return this.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  }
}
```

##### 2. Driven Ports (`src/application/ports.ts`):
```typescript
export interface PaymentGatewayPort {
  charge(customerId: string, amountCents: number, idempotencyKey: string): Promise<{ chargeId: string }>;
}

export interface OrderRepositoryPort {
  save(order: Order, chargeId: string): Promise<void>;
}

export interface NotificationPort {
  sendReceipt(recipientEmail: string, orderId: string, totalCents: number): Promise<void>;
}
```

##### 3. Application Use Case (`src/application/CheckoutUseCase.ts`):
```typescript
export class CheckoutUseCase {
  constructor(
    private readonly paymentGateway: PaymentGatewayPort,
    private readonly orderRepo: OrderRepositoryPort,
    private readonly notifier: NotificationPort
  ) {}

  public async execute(command: {
    customerId: string;
    recipientEmail: string;
    items: Array<{ productId: string; quantity: number; unitPriceCents: number }>;
    idempotencyKey: string;
  }): Promise<{ orderId: string }> {
    const orderId = crypto.randomUUID();
    const order = Order.create(orderId, command.customerId, command.items);
    const totalCents = order.calculateTotalCents();

    // 1. Charge customer via abstract port
    const { chargeId } = await this.paymentGateway.charge(
      command.customerId,
      totalCents,
      command.idempotencyKey
    );

    // 2. Persist order via abstract port
    await this.orderRepo.save(order, chargeId);

    // 3. Dispatch receipt asynchronously (fire-and-forget or outbox)
    this.notifier.sendReceipt(command.recipientEmail, orderId, totalCents).catch(err => {
      console.error('Failed to dispatch receipt email:', err);
    });

    return { orderId };
  }
}
```

##### 4. Primary Driving Adapter (`src/adapters/http/orders.controller.ts`):
```typescript
export function createOrderRouter(checkoutUseCase: CheckoutUseCase): Router {
  const router = Router();

  router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string || crypto.randomUUID();
      const result = await checkoutUseCase.execute({
        customerId: req.body.customerId,
        recipientEmail: req.body.email,
        items: req.body.items,
        idempotencyKey,
      });
      return res.status(201).json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What did we gain by writing 4 files instead of 1 monolithic controller?"  
*Senior Answer:* "Total architectural independence: (1) We can unit-test `CheckoutUseCase` in 3 milliseconds using pure in-memory mock adapters without touching PostgreSQL or Stripe; (2) If the company switches from Stripe to Adyen, we write an `AdyenPaymentAdapter` without altering a single line of domain business logic or HTTP routing; (3) We can run the same checkout logic from a CLI or a Kafka queue worker simply by plugging in a different driving adapter."

---

#### Q2: What is the Dependency Inversion Principle (DIP), and how does AI code generation violate it?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[SOLID]` `[DIP]` `[Architecture]`

**Answer:**
##### Formal Definition (Robert C. Martin):
1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
2. Abstractions should not depend on details. Details should depend on abstractions.

##### How AI Violates DIP:
AI models generate code top-to-bottom. If a service needs to persist data, it imports Prisma, Mongoose, or pg directly:
```typescript
// AI Anti-Pattern: Domain service depends directly on Postgres client
import { pgClient } from '../infra/postgres'; // VIOLATION! High-level depends on low-level

export class BillingService {
  async settleInvoice(id: string) {
    await pgClient.query('UPDATE invoices ...');
  }
}
```
If you ever want to test `BillingService`, run it in a browser, or switch databases, you cannot do so without dragging the entire PostgreSQL infrastructure into the execution environment.

##### DIP Inversion:
`BillingService` declares an interface: `interface InvoiceRepository { settle(id: string): Promise<void>; }`. 
The PostgreSQL implementation resides in the infrastructure directory and **implements** that interface. Control flows inward; dependencies point inward.

---

#### Q3: Contrast "Anemic Domain Models" with "Rich Domain Models". Why do LLMs favor anemic models?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / DDD  
**Tags:** `[DDD]` `[Anemic-Model]` `[Domain-Driven-Design]`

**Answer:**
##### The Anemic Domain Model (AI Favorite):
```typescript
// Class is just a data container with public properties:
class BankAccount {
  public id: string;
  public balance: number;
  public isFrozen: boolean;
}

// All business logic is scattered in procedural service classes:
class BankService {
  withdraw(account: BankAccount, amount: number) {
    if (account.isFrozen) throw new Error('Account frozen');
    if (account.balance < amount) throw new Error('Insufficient');
    account.balance -= amount; // Mutable state modified externally!
  }
}
```
*Why AI favors it:* It mirrors simple JSON schemas and LeetCode class representations.

##### The Rich Domain Model (Enterprise Standard):
```typescript
export class BankAccount {
  private constructor(
    public readonly id: string,
    private _balanceCents: bigint,
    private _isFrozen: boolean
  ) {}

  // Invariants are strictly protected inside the entity:
  public withdraw(amountCents: bigint): void {
    if (this._isFrozen) {
      throw new DomainInvariantViolation('Cannot withdraw from a frozen account');
    }
    if (amountCents <= 0n) {
      throw new DomainInvariantViolation('Withdrawal amount must be strictly positive');
    }
    if (this._balanceCents < amountCents) {
      throw new InsufficientFundsException(this.id, this._balanceCents, amountCents);
    }
    this._balanceCents -= amountCents;
  }

  public get balanceCents(): bigint {
    return this._balanceCents;
  }
}
```
*Enterprise Value:* It is **impossible** for any developer or AI assistant to put the `BankAccount` into an invalid state (e.g., negative balance or unauthorized withdrawal) from anywhere in the codebase.

---

#### Q4: How do you eliminate "Primitive Obsession" using Domain-Driven Value Objects?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Value-Objects]` `[DDD]` `[TypeScript]`

**Answer:**
Primitive obsession is the practice of using basic primitives (`string`, `number`) to represent complex domain concepts with inherent business rules (Email, Money, Currency, Postal Code).

##### Enterprise Value Object Implementation:
```typescript
export class EmailAddress {
  private readonly _value: string;

  private constructor(rawEmail: string) {
    this._value = rawEmail;
  }

  public static create(candidate: string): EmailAddress {
    if (!candidate || typeof candidate !== 'string') {
      throw new InvalidEmailError('Email must be a non-empty string');
    }

    const trimmed = candidate.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    
    if (!emailRegex.test(trimmed) || trimmed.length > 254) {
      throw new InvalidEmailError(`Invalid email address format: "${candidate}"`);
    }

    return new EmailAddress(trimmed);
  }

  public get value(): string {
    return this._value;
  }

  // Value objects are compared by value equality, not reference identity
  public equals(other: EmailAddress): boolean {
    return this._value === other._value;
  }
}
```

---

### 2. DDD Aggregate Roots & Value Object Invariants (Q5–Q8)

---

#### Q5: What is an Aggregate Root in Domain-Driven Design, and how does it prevent data corruption in concurrent AI updates?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Architecture  
**Tags:** `[Aggregate-Root]` `[DDD]` `[Transactional-Boundaries]`

**Answer:**
An **Aggregate** is a cluster of associated domain objects (Entities and Value Objects) that we treat as a **single unit for data changes**. 
The **Aggregate Root** is the only entity through which external consumers are permitted to hold references and initiate mutations.

```text
               AGGREGATE BOUNDARY (Order Aggregate)
┌────────────────────────────────────────────────────────┐
│ [ Order ] (Aggregate Root)                             │
│   ├── OrderId (Value Object)                           │
│   ├── ShippingAddress (Value Object)                   │
│   └── LineItems [ 0..N ] (Entities inside aggregate)   │
│         ├── ItemId                                     │
│         └── Price (Value Object)                       │
└────────────────────────────────────────────────────────┘
RULE: External controllers CANNOT directly modify a LineItem!
They must call: `order.addLineItem(product, quantity)`
```

##### Why this prevents AI concurrency corruption:
In naive AI code, if an order has 10 line items, the AI creates an endpoint: `POST /api/order-items/update` that modifies a single line item directly in SQL without recalculating total tax, discounts, or minimum order thresholds.
By enforcing that mutations occur strictly through `Order.updateLineItem()`, the Aggregate Root guarantees that all overarching business invariants (order limits, max items, promotional validity) are recalculated and enforced atomically.

---

#### Q6: How do Domain Events decouple side-effects from core business logic in AI-generated services?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[Domain-Events]` `[Event-Driven]` `[Decoupling]`

**Answer:**
When an AI assistant implements a business operation (e.g., `user.cancelSubscription()`), it writes 8 sequential side-effects into the method:
1. Update database.
2. Send Stripe cancellation API call.
3. Send email via SendGrid.
4. Notify Slack customer success channel.
5. Invalidate Redis cache.
6. Trigger analytics event in Mixpanel.

If step 4 (Slack webhook) fails, does the subscription cancel or roll back? The code is tightly coupled and fragile.

##### Enterprise Refactor with Domain Events:
```typescript
export class SubscriptionCancelledEvent {
  public readonly occurredOn = new Date();
  constructor(
    public readonly subscriptionId: string,
    public readonly userId: string,
    public readonly reason: string
  ) {}
}

export class Subscription {
  private _domainEvents: object[] = [];

  public cancel(reason: string): void {
    if (this._status === 'CANCELLED') {
      throw new Error('Subscription is already cancelled');
    }
    this._status = 'CANCELLED';

    // Record domain event internally; do NOT call network services here!
    this._domainEvents.push(
      new SubscriptionCancelledEvent(this.id, this.userId, reason)
    );
  }

  public pullDomainEvents(): object[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
```
The application use case saves the aggregate, pulls the events, and publishes them to an event bus (EventEmitter, Kafka, RabbitMQ). Independent listeners handle Slack, emails, and analytics without coupling core subscription logic to external infrastructure.

---

#### Q7: What is the "God Object / God Function" anti-pattern in AI code, and what metrics identify it?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Code-Smells]` `[God-Object]` `[Refactoring]`

**Answer:**
A **God Object / God Function** is an entity that knows too much or does too much, centralizing an entire system's functionality into a single monolithic class or 500-line function.

##### Static Analysis Metrics to Identify God Functions:
1. **Lines of Code (LOC):** A single function exceeding 80 lines or a single file exceeding 400 lines.
2. **Cyclomatic Complexity:** Exceeding a score of 15 (measured via ESLint `complexity` rule).
3. **Number of Collaborators / Injected Dependencies:** A class constructor taking more than 5 constructor arguments.
4. **Lack of Cohesion of Methods (LCOM):** High LCOM score indicating methods in the class operate on completely disjoint subsets of instance fields.

---

#### Q8: Refactor a God Function using the Command Pattern and Polymorphic Strategy.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Design-Patterns]` `[Strategy-Pattern]` `[Polymorphism]`

**Flawed AI-Generated Scaffold:**
```typescript
// AI giant switch statement:
export function processNotification(type: string, payload: any) {
  if (type === 'EMAIL') {
    // 40 lines of nodemailer code
  } else if (type === 'SMS') {
    // 35 lines of Twilio SDK code
  } else if (type === 'PUSH') {
    // 50 lines of Firebase Cloud Messaging code
  } else if (type === 'SLACK') {
    // 30 lines of Slack Webhook code
  } else {
    throw new Error('Unknown type');
  }
}
```

##### Enterprise Refactor using Strategy Pattern:
```typescript
// 1. Declare Notification Strategy Interface
export interface NotificationStrategy {
  readonly channelType: string;
  send(recipient: string, message: string): Promise<void>;
}

// 2. Concrete Polymorphic Implementations
export class EmailNotificationStrategy implements NotificationStrategy {
  public readonly channelType = 'EMAIL';
  async send(recipient: string, message: string) { /* ... */ }
}

export class SmsNotificationStrategy implements NotificationStrategy {
  public readonly channelType = 'SMS';
  async send(recipient: string, message: string) { /* ... */ }
}

// 3. Open-Closed Principle Registry (Open for extension, closed for modification)
export class NotificationService {
  private strategies = new Map<string, NotificationStrategy>();

  constructor(strategyList: NotificationStrategy[]) {
    for (const s of strategyList) {
      this.strategies.set(s.channelType, s);
    }
  }

  public async dispatch(channelType: string, recipient: string, message: string): Promise<void> {
    const strategy = this.strategies.get(channelType);
    if (!strategy) {
      throw new UnsupportedChannelError(`Channel ${channelType} is not supported.`);
    }
    await strategy.send(recipient, message);
  }
}
```

---

### 3. God Function Refactoring & Structural Decomposition (Q9–Q12)

---

#### Q9: What is the "Feature Envy" code smell common in AI output, and how do you resolve it?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Code-Smells]` `[Refactoring]` `[OOP]`

**Answer:**
**Feature Envy** occurs when a method in class $A$ spends more time reading and manipulating data in class $B$ than in its own class:

```typescript
// AI Anti-Pattern (OrderService has Feature Envy on Customer):
class OrderService {
  calculateDiscount(customer: Customer): number {
    // Reaching deep into customer fields to make customer-specific decisions:
    if (customer.tier === 'GOLD' && customer.yearsActive > 5 && customer.spend > 10000) {
      return 0.20;
    }
    return 0.05;
  }
}
```

##### Resolution: Move Method / Tell, Don't Ask
Move the logic onto the class that owns the data:
```typescript
class Customer {
  public getEligibleDiscountRate(): number {
    if (this.tier === 'GOLD' && this.yearsActive > 5 && this.spend > 10000) {
      return 0.20;
    }
    return 0.05;
  }
}

// OrderService simply delegates:
const discountRate = customer.getEligibleDiscountRate();
```

---

#### Q10: How do you replace AI-generated global singletons with Inversion of Control (IoC) containers?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[IoC]` `[Dependency-Injection]` `[Inversify]` `[Clean-Code]`

**Answer:**
AI assistants frequently export global instantiated singletons:
```typescript
// AI Anti-Pattern:
export const dbClient = new DatabaseConnection(process.env.DB_URL!);
export const authService = new AuthService(dbClient);
```
This binds the entire application to environment variables at module evaluation time and makes mock injection during tests almost impossible.

##### Enterprise IoC Container (e.g., TSyringe / InversifyJS / Manual DI Factory):
```typescript
export interface AppContainer {
  databaseClient: DatabasePort;
  userRepository: UserRepositoryPort;
  paymentGateway: PaymentGatewayPort;
  checkoutUseCase: CheckoutUseCase;
}

// Centralized Composition Root (server.ts):
export function buildProductionContainer(config: AppConfig): AppContainer {
  const databaseClient = new PostgresDatabaseAdapter(config.databaseUrl);
  const userRepository = new SqlUserRepository(databaseClient);
  const paymentGateway = new StripePaymentAdapter(config.stripeApiKey);

  const checkoutUseCase = new CheckoutUseCase(
    paymentGateway,
    userRepository,
    new EmailNotificationAdapter(config.smtpUrl)
  );

  return {
    databaseClient,
    userRepository,
    paymentGateway,
    checkoutUseCase,
  };
}
```

---

#### Q11: Explain the "Law of Demeter" (Principle of Least Knowledge) and refactor code that violates it.
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Law-of-Demeter]` `[Clean-Code]` `[OOP]`

**Answer:**
The **Law of Demeter** states that a given method should only call methods on:
1. Itself.
2. Parameters passed to it.
3. Objects it instantiated.
4. Its own direct component objects.

It should **never "reach through"** objects: `a.getB().getC().getD().doSomething()`.

##### Flawed AI Code:
```typescript
function processShipment(order: Order) {
  // Violates Law of Demeter: Reaching 4 levels deep
  const country = order.getCustomer().getProfile().getAddress().getCountry();
  if (country === 'US') { /* ... */ }
}
```

##### Enterprise Refactor:
Encapsulate the query on the root entity:
```typescript
function processShipment(order: Order) {
  if (order.isDomesticShipment()) {
    /* ... */
  }
}
```

---

#### Q12: How do you identify and eliminate circular dependencies generated by AI tools in TypeScript/JavaScript?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Circular-Dependency]` `[Madge]` `[ESM]` `[Bundlers]`

**Answer:**
##### Why AI Introduces Circular Dependencies:
AI models generate code piecemeal. If `User` needs `Order`, the AI imports `Order` in `User.ts`. If `Order` needs `User`, it imports `User` in `Order.ts`:
```text
User.ts ──► imports Order.ts ──► imports User.ts
```
In CommonJS, this leaves one of the modules as an empty object `{}` during load time. In ES Modules, it can cause temporal dead zone runtime errors: `ReferenceError: Cannot access 'Order' before initialization`.

##### Automated Detection in CI:
Use **`madge`** to scan for cycles:
```bash
npx madge --circular --extensions ts src/
# Output: Found 1 circular dependency!
# user.ts > order.ts > user.ts
```

##### Architectural Resolution: Dependency Inversion
Break the cycle by extracting a shared interface or shared types package:
```typescript
// types.ts (No dependencies)
export interface IUserSummary { id: string; name: string; }

// user.ts
import type { IOrderSummary } from './types';

// order.ts
import type { IUserSummary } from './types';
```

---

### 4. Enterprise Modularity & Boundary Enforcement (Q13–Q16)

---

#### Q13: How do you configure Nx or ESLint to strictly enforce architectural boundaries across a monorepo?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / Governance  
**Tags:** `[Nx]` `[Monorepo]` `[ESLint]` `[Governance]`

**Answer:**
In an enterprise monorepo, we tag projects with structural scopes and enforce import boundaries using `@nx/enforce-module-boundaries`:

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "allow": [],
        "depConstraints": [
          {
            "sourceTag": "scope:domain",
            "onlyDependOnLibsWithTags": ["scope:domain-shared"]
          },
          {
            "sourceTag": "scope:application",
            "onlyDependOnLibsWithTags": ["scope:domain", "scope:application-shared"]
          },
          {
            "sourceTag": "scope:infrastructure",
            "onlyDependOnLibsWithTags": ["scope:domain", "scope:application"]
          },
          {
            "sourceTag": "scope:ui",
            "onlyDependOnLibsWithTags": ["scope:application", "scope:ui-shared"]
          }
        ]
      }
    ]
  }
}
```
If an AI coding assistant in a UI component writes:
`import { PostgresOrderRepository } from '@enterprise/infra-db'`,
ESLint throws a compile-time error:
`A project tagged with "scope:ui" is not allowed to depend on projects tagged with "scope:infrastructure"`.

---

#### Q14: Explain the Outbox Pattern and why it is mandatory when an AI service mutates a database and publishes to a message broker.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / Distributed-Systems  
**Tags:** `[Outbox-Pattern]` `[Dual-Write]` `[Kafka]` `[Distributed-Transactions]`

**Answer:**
##### The Dual-Write Flaw in AI Code:
```typescript
// AI-generated order processor:
await db.orders.create(orderData); // Step 1: Database Commit
await kafkaProducer.send({ topic: 'order-created', message: orderData }); // Step 2: Kafka Publish
```
If the server crashes or the network blips between Step 1 and Step 2, the order is created in the database, but **Kafka is never notified**. Downstream shipping, fraud, and notification microservices never process the order.

##### The Transactional Outbox Pattern Resolution:
1. In the **same database transaction** that creates the `orders` row, insert an outbox message row into an `outbox` table.
2. A dedicated Change Data Capture (CDC) process (e.g., Debezium) or reliable background poller reads the `outbox` table and publishes to Kafka.
3. Once published, the message is marked processed or deleted.

```text
               TRANSACTIONAL OUTBOX PATTERN
               
 ┌────────────────────────────────────────────────────────┐
 │           SINGLE DATABASE ACID TRANSACTION             │
 │  1. INSERT INTO orders VALUES (...);                   │
 │  2. INSERT INTO outbox_messages (topic, payload) ...;  │
 └──────────────────────────┬─────────────────────────────┘
                            │ Guaranteed committed together!
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │ Outbox Poller / Debezium CDC ──► Publishes to Kafka    │
 └────────────────────────────────────────────────────────┘
```

---

#### Q15: How do you design an enterprise codebase so that AI assistants cannot accidentally introduce breaking API schema changes?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / API-Governance  
**Tags:** `[OpenAPI]` `[Contract-Testing]` `[Zod]`

**Answer:**
1. **Contract-First Code Generation:** Maintain canonical OpenAPI v3.1 YAML specifications in a dedicated directory.
2. Generate TypeScript client and server interfaces automatically via code generation (`openapi-typescript`). Developers and AI assistants are forbidden from editing the generated types manually.
3. Run **Optic** or **oasdiff** in CI to compare the branch OpenAPI schema against `main`. If an endpoint or field was renamed, removed, or changed from optional to required, the pull request is automatically blocked.

---

#### Q16: What is the Strangler Fig Pattern, and how do you use AI to safely modernize a legacy codebase without big-bang rewrites?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / Modernization  
**Tags:** `[Strangler-Fig]` `[Migration]` `[Legacy-Code]`

**Answer:**
A "Big Bang" complete system rewrite has a > 80% failure rate in enterprise software.
The **Strangler Fig Pattern** incrementally replaces legacy system components by creating new, clean microservices or modules around the edges of the legacy core until the legacy system is completely superseded.

##### AI-Assisted Modernization Workflow:
1. **API Gateway Interception:** Place an API Gateway (Cloudflare Worker / Kong) in front of the legacy monolith.
2. **Isolate a Single Bounded Context:** Use AI to scaffold clean, Hexagonal use cases for a single feature (e.g., `/api/v2/discounts`).
3. **Route Traffic via Canary:** Route 5% of production traffic to the AI-hardened modern service; run **Shadow Execution** comparing legacy output against modern output.
4. **Decommission:** Once parity is verified, route 100% of traffic to the new module and delete the legacy code branch.

---

## ⚠️ Part III: Production Gotchas, Traps & Failure Modes

1. **The Inverted Dependency Injector:** AI creating circular dependency injection containers where Service A injects Service B, and Service B injects Service A, causing stack overflow during container boot.
2. **Direct Entity Exposure:** AI returning internal database entities directly in API JSON responses, leaking internal schema column names, database IDs, and password reset tokens to frontend clients.
3. **The Utility Drawer Sprawl:** Creating a generic `utils/helpers.ts` file that grows to 4,000 lines containing unrelated string, math, date, and networking code. Always organize by specific domain concern.

---

## 🏭 Part IV: Real-World Enterprise Use Cases & Case Studies

### Postmortem: The Monolithic AI Refactor That Halted Feature Releases for 3 Weeks

**The Scenario:** A retail software team asked an AI assistant to "refactor the legacy checkout module to make it cleaner." The AI consolidated 12 separate domain classes into a single 1,200-line "clean" procedural class with 40 helper functions.

**The Fallout:**
1. Unit tests could no longer isolate individual discounts or tax calculations.
2. Two different developers working on coupons and gift cards experienced continuous merge conflicts in the single monolithic file.
3. A bug introduced in tax calculation broke credit card charging because both concerns were coupled in the same local execution scope.
4. Feature velocity ground to a complete halt for 3 weeks while the team painstakingly untangled the micro-spaghetti into Hexagonal ports and adapters.

**The Enterprise Policy:** Implemented an architectural linter blocking any single file exceeding 350 lines or cyclomatic complexity > 12.

---

## 🎯 Part V: Quick-Fire & Trap Questions

1. **Q:** What does the Single Responsibility Principle (SRP) state?  
   **A:** A class or module should have one, and only one, reason to change (it should be responsible to only one actor or stakeholder).

2. **Q:** What is the difference between an Entity and a Value Object?  
   **A:** An Entity has a unique identifier that persists across state changes (e.g., `User` with ID `usr_123`). A Value Object is defined entirely by its attributes and is immutable (e.g., `Money(10, 'USD')`).

3. **Q:** What is the Open-Closed Principle (OCP)?  
   **A:** Software entities should be open for extension, but closed for modification.

4. **Q:** Why is Hexagonal Architecture also known as "Ports and Adapters"?  
   **A:** Because the application defines Ports (interfaces) through which it interacts with the outside world, and Infrastructure provides Adapters (concrete implementations) that plug into those ports.

---

## 📚 Part VI: Curated References & Further Learning

### 🌐 High-Quality Engineering Blogs
- [Martin Fowler: Software Architecture Guide](https://martinfowler.com/architecture/) — The definitive guide to modular software design.
- [Alistair Cockburn: Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) — The original foundational paper on Ports and Adapters.
- [Netflix TechBlog: Ready for Changes with Hexagonal Architecture](https://netflixtechblog.com/) — Real-world enterprise case studies.

### 📖 Specifications & Cookbooks
- [Domain-Driven Design: Tackling Complexity in the Heart of Software (Eric Evans)](https://www.domainlanguage.com/ddd/) — Foundational blue book.
- [Clean Architecture: A Craftsman's Guide (Robert C. Martin)](https://blog.cleancoder.com/) — Foundational architectural patterns.

### 📺 Visual Deep Dives & Lectures
- **Uncle Bob Martin:** *The Principles of Clean Architecture* (YouTube) — Visual breakdown of dependency inversion and architectural boundaries.
