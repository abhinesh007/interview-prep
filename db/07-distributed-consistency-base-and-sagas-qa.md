# 07 — Distributed Consistency, BASE & Sagas

> CAP & PACELC Theorems, ACID vs BASE, Distributed Consistency Spectrum (Linearizable to Eventual), Two-Phase Commit (2PC) Coordinator Blocking, The Saga Pattern (Choreography vs Orchestration), and the Transactional Outbox Pattern with CDC.

---

## 📑 Table of Contents
1. [Theoretical Foundations: CAP, PACELC & Consistency Spectrum](#1-theoretical-foundations-cap-pacelc--consistency-spectrum)
2. [ACID vs BASE Paradigms](#2-acid-vs-base-paradigms)
3. [Distributed Transactions: Two-Phase Commit (2PC) & Its Flaws](#3-distributed-transactions-two-phase-commit-2pc--its-flaws)
4. [The Saga Pattern: Orchestration vs Choreography](#4-the-saga-pattern-orchestration-vs-choreography)
5. [Transactional Outbox Pattern & Change Data Capture (CDC)](#5-transactional-outbox-pattern--change-data-capture-cdc)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Theoretical Foundations: CAP, PACELC & Consistency Spectrum

### Q1: Demystify the CAP and PACELC Theorems. How do modern databases categorize within these frameworks?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[CAPTheorem]` `[PACELC]` `[DistributedSystems]`

**Answer:**

```text
1. CAP Theorem (Under Partition P):
   Choose Consistency (C)   OR   Choose Availability (A)
   [Refuse writes if quorum lost]   [Accept writes on any node; risk divergence]

2. PACELC Theorem (Extends CAP to Normal Operations):
   If Partition (P) ────► Choose Availability (A)   OR  Consistency (C)
   ELSE (E)         ────► Choose Latency (L)        OR  Consistency (C)
```

#### The CAP Theorem:
- **Consistency (C):** Linearizability — every read receives the most recent write or an error.
- **Availability (A):** Every non-failing node returns a non-error response for every request (even if stale).
- **Partition Tolerance (P):** The system continues to operate despite arbitrary message loss or network partitions.
- *Core Theorem:* Because physical networks *will* experience partitions, you cannot choose "CA". You must choose between **CP** (reject writes to preserve correctness) or **AP** (accept writes and reconcile divergence later).

#### The PACELC Theorem (Daniel Abadi):
CAP only describes behavior *when a network partition occurs*. But partitions are rare! What happens during normal operation?
- **PC/EC (e.g., PostgreSQL with Synchronous Replication, CockroachDB, Spanner):**
  - If Partition (P) $\implies$ favors Consistency (C).
  - Else (E) $\implies$ favors Consistency (C) over Latency (L) (blocks writes until synchronous replicas ack).
- **PA/EL (e.g., Apache Cassandra, DynamoDB, Couchbase):**
  - If Partition (P) $\implies$ favors Availability (A).
  - Else (E) $\implies$ favors Latency (L) over Consistency (C) (returns write success before all replicas ack).
- **PC/EL (e.g., MongoDB with default write concern `w: 1`):**
  - If Partition (P) $\implies$ favors Consistency (rejects writes if primary isolated).
  - Else (E) $\implies$ favors Latency (returns after primary write without waiting for replicas).

---

### Q2: Map out the Distributed Consistency Spectrum from Strongest to Weakest.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ConsistencyModels]` `[Linearizability]` `[Distributed]`

**Answer:**

```text
STRICTEST (High Latency / Coordination)
  ▲
  │  1. Strict Serializability (External Consistency)
  │  2. Linearizability (Single-object real-time ordering)
  │  3. Sequential Consistency (Global program order)
  │  4. Causal Consistency (Preserves cause-and-effect causality)
  │  5. Read-Your-Own-Writes (Monotonic reads for user session)
  │  6. Eventual Consistency (Convergence in absence of new writes)
  ▼
WEAKEST (Low Latency / High Availability)
```

1. **Linearizability (Strong Consistency):** A read is guaranteed to return the latest committed write in absolute physical wall-clock time globally.
2. **Sequential Consistency:** All operations appear to take effect in some sequential order that is seen identically by all processes.
3. **Causal Consistency:** Operations that are causally related (e.g., Question $\to$ Answer) must be observed in the same order by all nodes. Concurrent unrelated operations can be seen in different orders.
4. **Read-Your-Own-Writes Consistency:** A client that writes value $V$ is guaranteed to observe value $\ge V$ on all subsequent reads, even if other users see stale data.
5. **Eventual Consistency:** Replicas do not coordinate synchronously. Replicas may return conflicting or stale values, but will eventually converge to identical state once writes cease.

---

## 2. ACID vs BASE Paradigms

### Q3: Contrast the ACID paradigm of relational databases with the BASE paradigm of distributed systems.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ACID]` `[BASE]` `[Architecture]`

**Answer:**

| Dimension | ACID (Single Database Boundary) | BASE (Distributed Microservices / NoSQL) |
| :--- | :--- | :--- |
| **Philosophy** | Pessimistic, immediate consistency, zero data anomalies | Optimistic, resilient availability, eventual convergence |
| **A** | **Atomicity:** All statements commit or all rollback | **Basically Available:** System remains functional despite node partitions |
| **C / S** | **Consistency:** Database invariants enforced at all times | **Soft State:** Data values may drift over time without external mutations |
| **I / E** | **Isolation:** Transactions cannot observe concurrent uncommitted state | **Eventual Consistency:** System converges over time via background replication |
| **D** | **Durability:** Committed data is permanent on disk | **Durability:** Preserved via quorum replication across independent nodes |
| **Coupling** | High coupling; transactions span local tables | Low coupling; services own independent private databases |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why can't we simply use standard ACID transactions across independent microservices?"  
*Senior Answer:* Each microservice owns its private, encapsulated database. A single database transaction cannot span across independent network boundaries without distributed locking (2PC). Distributed locking couples service availability, drastically multiplies network latency, and introduces coordinator blocking vulnerabilities. BASE patterns (Sagas) trade immediate isolation for system resilience and scalability.

---

## 3. Distributed Transactions: Two-Phase Commit (2PC) & Its Flaws

### Q4: Walk through the Two-Phase Commit (2PC) protocol. Why is it an architectural anti-pattern across modern microservices?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[2PC]` `[DistributedTransactions]` `[AntiPatterns]`

**Answer:**
**Two-Phase Commit (2PC)** is an atomic commitment protocol designed to guarantee that all distributed participant databases either commit or abort together.

```text
Two-Phase Commit Protocol:
Coordinator                     Participant DB 1         Participant DB 2
    │                                  │                        │
    │ 1. PREPARE ("Can you commit?")   │                        │
    ├─────────────────────────────────►│                        │
    ├──────────────────────────────────────────────────────────►│
    │                                  │                        │
    │ 2. VOTE ("VOTE_COMMIT" / ABORT)  │ (Acquires row locks!)  │ (Acquires row locks!)
    │◄─────────────────────────────────┤                        │
    │◄──────────────────────────────────────────────────────────┤
    │                                  │                        │
    │ 3. GLOBAL_COMMIT                 │                        │
    ├─────────────────────────────────►│ (Commits & frees locks)│
    ├──────────────────────────────────────────────────────────►│ (Commits & frees locks)
    ▼                                  ▼                        ▼
```

#### The Fatal Flaw: Coordinator Blocking & Resource Starvation
- **The Vulnerability:** Suppose Phase 1 succeeds: both Participant 1 and Participant 2 reply `VOTE_COMMIT` and hold row-level locks on their local tables.
- **The Crash:** Right before the Coordinator broadcasts `GLOBAL_COMMIT`, the Coordinator host crashes or suffers a network partition!
- **The Stalled State:** The participants are in an **in-doubt state**. They cannot unilaterally commit (the coordinator might have decided to abort), and they cannot unilaterally abort (the coordinator might have committed).
- **The Cascading Outage:** The participants remain blocked indefinitely, **holding row locks in memory**, blocking other queries and exhausting database connection pools across all services until the coordinator recovers!

#### The Availability Product Trap:
In a 2PC transaction involving $N$ microservices, if each service has 99.9% availability:
$$A_{\text{total}} = A_1 \times A_2 \times \dots \times A_N = (0.999)^5 \approx 99.5\%$$
Overall system availability degrades exponentially as participant count increases.

---

## 4. The Saga Pattern: Orchestration vs Choreography

### Q5: How does the Saga Pattern solve distributed transactions? Compare Choreography vs Orchestration.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[Sagas]` `[Microservices]` `[EventualConsistency]`

**Answer:**
A **Saga** breaks a distributed business transaction into a sequence of **independent local ACID transactions**. Each local transaction updates its local database and publishes a message or event. If a step fails, the saga executes a series of **Compensating Transactions** in reverse order to semantically undo preceding steps.

```text
Forward Happy Path:
[Order Service: Create Order] ──► [Payment Service: Charge Card] ──► [Inventory Service: Reserve Stock]

Compensating Failure Path (Inventory Fails!):
[Inventory Service: OUT OF STOCK ❌]
         │
         ▼
[Payment Service: REFUND CARD (Compensating Tx)]
         │
         ▼
[Order Service: CANCEL ORDER (Compensating Tx)]
```

#### Comparison: Choreography vs Orchestration:
| Dimension | Choreography (Event-Driven) | Orchestration (State Machine Engine) |
| :--- | :--- | :--- |
| **Coordination** | Decentralized; services react to pub/sub domain events (Kafka) | Centralized orchestrator service (Temporal, Cadence, AWS Step Functions) |
| **Coupling** | Loose coupling; producers don't know consumers | Services are called via explicit RPC/REST by the orchestrator |
| **Complexity** | Simple for 2–3 steps; becomes tangled "distributed spaghetti" at scale | Centralized, explicit workflow definition and failure tracing |
| **Failure Observability** | Difficult to monitor state across multiple Kafka topics | **Trivial**; state of every in-flight saga is visible in a centralized dashboard |
| **Ideal For** | Simple workflows (2–4 services) | Complex, multi-step enterprise workflows (e.g., checkout, loan approval) |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the 'Lack of Isolation' hazard in Sagas, and how do you mitigate dirty reads?"  
*Senior Answer:* Sagas do **not** provide isolation (the I in ACID). Concurrent transactions can observe intermediate states (e.g., user sees flight booked before hotel booking fails and cancels flight).
**Mitigations:**
1. **Semantic Locks:** Use intermediate states (e.g., `status = 'PENDING_APPROVAL'`) so other transactions know the record is in-flight.
2. **Commutative Updates:** Design operations so that order of arrival does not alter the final state.
3. **Pessimistic Reservation Timers:** Pre-allocate resources with TTLs.

---

## 5. Transactional Outbox Pattern & Change Data Capture (CDC)

### Q6: What is the Dual-Write Problem, and how does the Transactional Outbox Pattern with Debezium CDC guarantee 100% data consistency?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[OutboxPattern]` `[CDC]` `[Debezium]` `[Kafka]`

**Answer:**

```text
The Catastrophic Dual-Write Failure:
def create_order(order):
    db.save(order)              # Step 1: Saves to DB (Committed!)
    kafka.send("order_created") # Step 2: Network crash or Kafka timeout! ❌
# RESULT: Order exists in DB, but downstream services never received event!
```

#### The Architectural Solution: The Transactional Outbox Pattern
Instead of writing to the database and publishing to Kafka in application code, the application writes both the domain record AND the event into the **same local database within a single ACID transaction**:

```text
Application Backend
       │
       ▼ Single Local ACID Transaction (BEGIN ... COMMIT)
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                    │
│  ┌────────────────────────┐  ┌───────────────────────┐ │
│  │ Table: orders          │  │ Table: outbox_events  │ │
│  │ (id, user_id, total)   │  │ (id, payload, status) │ │
│  └────────────────────────┘  └───────────────────────┘ │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ PostgreSQL Logical Decoding (pgoutput / WAL)
                            ▼
┌────────────────────────────────────────────────────────┐
│ Debezium CDC Connector                                 │
│ Reads WAL records stream with zero database polling!   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Apache Kafka Cluster                                   │
│ Topic: order_events                                    │
└────────────────────────────────────────────────────────┘
```

#### Why Log-Based CDC (Debezium) Beats Polling Publishers:
1. **Zero Database Query Overhead:** Polling publishers run `SELECT * FROM outbox_events WHERE status = 'PENDING' LIMIT 100` in a tight loop, creating lock contention, index bloat, and CPU load. Debezium reads the append-only **WAL stream directly**, incurring zero query overhead.
2. **Sub-Millisecond Event Latency:** Events are streamed to Kafka within milliseconds of the database transaction committing.
3. **Guaranteed At-Least-Once Delivery:** Even if the application crashes, the WAL retains the unread outbox events. Downstream consumers require idempotent processing.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: Why MUST all compensating transactions in a Saga be strictly idempotent?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Sagas]` `[Idempotency]`

**Answer:**
Because distributed networks experience timeouts and message retries. If the orchestrator sends a `refundPayment` compensation command and the network times out before the acknowledgment returns, the orchestrator **will retry the command**. If the compensation is not idempotent (keyed by an idempotency token), the user will be refunded twice!

---

### Q8: What happens in a Saga if a compensating transaction itself fails permanently (e.g., payment gateway returns 500)?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Sagas]` `[FailureHandling]`

**Answer:**
A saga cannot simply give up; doing so leaves the system in a permanently corrupted state.
1. The orchestrator retries with **exponential backoff and jitter**.
2. If retries exceed maximum threshold, the failed event is routed to a **Dead Letter Queue (DLQ)**.
3. High-priority alerts notify on-call engineers.
4. Human intervention or automated reconciliation crons reconcile the state manually.

---

### Q9: Can the Transactional Outbox pattern be implemented without a dedicated `outbox_events` table?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual  
**Tags:** `[CDC]` `[LogicalReplication]`

**Answer:**
**Yes!** By leveraging PostgreSQL **Logical Decoding and `pg_logical_emit_message()`**. A transaction can emit a custom binary or JSON message directly into the PostgreSQL WAL stream within a transaction:
```sql
SELECT pg_logical_emit_message(true, 'order_events', '{"order_id": 42, "status": "CREATED"}');
```
Debezium or custom consumers read this message directly from the WAL stream, completely bypassing the need to insert or delete rows from an `outbox_events` table, avoiding table bloat entirely!
