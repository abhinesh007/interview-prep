# 🎯 Database Engineering Interview Master Index & Table of Contents

> Complete, production-grade, section-wise Database Engineering interview preparation guide covering relational database architecture (focusing on **PostgreSQL 14–17+** internals: MVCC, 8KB page layout, WAL, B-Tree/BRIN/GIN indexing, Vacuum & XID wraparound disaster), transactional isolation levels & concurrency anomalies (**Write Skew, SSI**), distributed consistency (**CAP, PACELC, ACID vs BASE, 2PC, Sagas, Outbox CDC**), connection pooling (**PgBouncer** modes & prepared statements traps), horizontal scaling & partitioning (**declarative partitioning, Citus, consistent hashing sharding**), high availability & replication (**physical streaming, logical replication, Patroni, Raft, split-brain & STONITH**), read-write patterns & caching, production observability (**`EXPLAIN BUFFERS`, `pg_stat_statements`, wait events, memory tuning**), enterprise security (**Row-Level Security, RBAC, SCRAM-SHA-256, `pgaudit`**), a dedicated production deep-dive on **MongoDB** (WiredTiger engine, ESR indexing rule, write/read concerns, sharded cluster rebalancing, multi-document transactions, and real-world outage troubleshooting), and enterprise system design using the **RADIO framework**.

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Target Qs | Link | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **00** | **Table of Contents** | Master Index, Navigation, Difficulty Matrix & Learning Tracks | Index | [Read Index →](00-table-of-contents.md) | 🎯 Ready |
| **01** | **Relational Core & Storage Engine** | Postgres Architecture, 8KB Pages, Tuple Layout, Heap Files, MVCC Internals, Snapshots & Visibility | 18–22 | [Read Guide →](01-relational-core-and-storage-engine-qa.md) | ✅ Ready |
| **02** | **Indexing Strategies & Query Execution** | B-Tree Internals, BRIN, GIN, GiST, Covering Indexes (`INCLUDE`), Partial Indexes, Index Bloat, Optimizer Mechanics | 18–22 | [Read Guide →](02-indexing-strategies-and-query-execution-qa.md) | ✅ Ready |
| **03** | **Vacuum, Autovacuum & Bloat Management** | Dead Tuples, Vacuum Process, HOT Updates, Freezing, XID Wraparound Disaster, Cost Limits & `pg_repack` | 16–20 | [Read Guide →](03-vacuum-autovacuum-and-bloat-management-qa.md) | ✅ Ready |
| **04** | **Transactions, ACID & Isolation Levels** | ACID Guarantees, ANSI vs Actual Isolation Levels, Dirty Reads, Non-Repeatable Reads, Phantoms, Write Skew & SSI | 18–22 | [Read Guide →](04-transactions-acid-and-isolation-levels-qa.md) | ✅ Ready |
| **05** | **Locking Mechanisms & Concurrency Control** | Row Locks, Table Locks, `FOR UPDATE` vs `FOR NO KEY UPDATE`, `SKIP LOCKED` Queues, Deadlock Detection & Graph | 16–20 | [Read Guide →](05-locking-mechanisms-and-concurrency-control-qa.md) | ✅ Ready |
| **06** | **WAL, Checkpointing & Durability Engine** | Write-Ahead Log (WAL), Checkpoints, LSN Arithmetic, Full Page Writes, Crash Recovery & fsync Durability | 16–18 | [Read Guide →](06-wal-checkpointing-and-durability-qa.md) | ✅ Ready |
| **07** | **Distributed Consistency, BASE & Sagas** | CAP & PACELC Theorems, ACID vs BASE, 2PC Coordinator Blocking, Saga Pattern (Orchestration/Choreography), CDC & Outbox | 18–22 | [Read Guide →](07-distributed-consistency-base-and-sagas-qa.md) | ✅ Ready |
| **08** | **Connection Pooling & PgBouncer** | Postgres Fork Model, PgBouncer Modes (Session, Transaction, Statement), Prepared Statements Trap, Sizing Math | 16–20 | [Read Guide →](08-connection-pooling-and-pgbouncer-qa.md) | ✅ Ready |
| **09** | **Replication, High Availability & Failover** | Streaming Replication, Sync vs Async (`synchronous_commit`), Logical Replication, Patroni, Split-Brain & STONITH | 18–22 | [Read Guide →](09-replication-high-availability-and-failover-qa.md) | ✅ Ready |
| **10** | **Partitioning, Sharding & Horizontal Scale** | Declarative Partitioning (Range/List/Hash), Partition Pruning, Sharding Architectures, Citus, Shard Keys & Rebalancing | 16–20 | [Read Guide →](10-partitioning-sharding-and-horizontal-scale-qa.md) | ✅ Ready |
| **11** | **Read-Write Patterns & Caching Strategies** | Read Replicas, Stale Reads, Read-After-Write Consistency, CQRS, Cache-Aside vs Write-Behind, Batch Writes & COPY | 16–20 | [Read Guide →](11-read-write-patterns-and-caching-strategies-qa.md) | ✅ Ready |
| **12** | **Observability, Diagnostics & Performance Tuning** | `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements`, Wait Events, Lock Analysis, Memory Tuning (`work_mem`, `shared_buffers`) | 18–22 | [Read Guide →](12-observability-diagnostics-and-performance-tuning-qa.md) | ✅ Ready |
| **13** | **Database Security, Row-Level Security & Compliance** | Row-Level Security (RLS), RBAC, SCRAM-SHA-256, TLS/SSL, `pgaudit`, Column Encryption, SQLi Mitigation & Multi-Tenancy | 16–20 | [Read Guide →](13-database-security-row-level-security-and-compliance-qa.md) | ✅ Ready |
| **14** | **MongoDB Architecture, Scenarios & Techniques** | WiredTiger Internals, ESR Indexing Rule, Write/Read Concerns, Sharded Clusters, Multi-Doc Transactions & Outage Troubleshooting | 20–24 | [Read Guide →](14-mongodb-architecture-scenarios-and-techniques-qa.md) | ✅ Ready |
| **15** | **Enterprise Database System Design (RADIO)** | High-Concurrency Flash Sale, Zero-Downtime Schema Migrations (Expand/Contract), Multi-Tenant SaaS, Disaster Recovery (PITR) | 12–15 | [Read Guide →](15-enterprise-database-system-design-and-scenarios-qa.md) | ✅ Ready |

---

## 🎯 Question Format Standard

Every question across all modules strictly complies with the standardized schema:

```markdown
### Q[N]: [Title of the Question]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[In-depth technical explanation covering engine and runtime mechanics under the hood. Accompanied by ASCII diagrams, comparison matrices, exact configuration parameters, mathematical formulas, and production-grade SQL or MongoDB code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Edge-case challenge, gotcha trap, or follow-up probe]"  
*Senior Answer:* [How a senior/staff engineer addresses the challenge with trade-offs, mitigations, and runtime nuance.]
```

---

## 🚦 Recommended Learning Tracks

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   🗺️ DATABASE INTERVIEW STUDY TRACKS                   │
├────────────────────────────────────────────────────────────────────────┤
│ 🟢 JUNIOR FOUNDATIONS TRACK:                                           │
│    Focus: Relational core, 8KB pages, MVCC basics, indexing, ACID.     │
│    • 01-relational-core-and-storage-engine-qa.md                       │
│    • 02-indexing-strategies-and-query-execution-qa.md                 │
│    • 04-transactions-acid-and-isolation-levels-qa.md                   │
│    • 05-locking-mechanisms-and-concurrency-control-qa.md               │
│    • 14-mongodb-architecture-scenarios-and-techniques-qa.md (Basics)  │
│                                                                        │
│ 🟡 MID-LEVEL BACKEND & DATA PLATFORM TRACK:                            │
│    Focus: Vacuum tuning, WAL, connection pooling, read-write patterns, │
│           WiredTiger engine, ESR rule & write concerns.                │
│    • 03-vacuum-autovacuum-and-bloat-management-qa.md                  │
│    • 06-wal-checkpointing-and-durability-qa.md                         │
│    • 08-connection-pooling-and-pgbouncer-qa.md                         │
│    • 11-read-write-patterns-and-caching-strategies-qa.md               │
│    • 14-mongodb-architecture-scenarios-and-techniques-qa.md (Engine)  │
│                                                                        │
│ 🔴 SENIOR RELIABILITY, REPLICATION & OBSERVABILITY TRACK:              │
│    Focus: Write skew & SSI, deadlocks, 2PC & Sagas, streaming replica, │
│           Patroni, EXPLAIN BUFFERS, wait events, RLS & security.       │
│    • 04-transactions-acid-and-isolation-levels-qa.md (SSI/Anomalies)  │
│    • 07-distributed-consistency-base-and-sagas-qa.md                   │
│    • 09-replication-high-availability-and-failover-qa.md               │
│    • 10-partitioning-sharding-and-horizontal-scale-qa.md               │
│    • 12-observability-diagnostics-and-performance-tuning-qa.md         │
│    • 13-database-security-row-level-security-and-compliance-qa.md     │
│    • 14-mongodb-architecture-scenarios-and-techniques-qa.md (Shards)  │
│                                                                        │
│ 🟣 PRINCIPAL ARCHITECT & SYSTEM DESIGN TRACK:                          │
│    Focus: Enterprise system design, flash sale concurrency, zero-      │
│           downtime migrations, multi-tenant SaaS, disaster recovery.   │
│    • 15-enterprise-database-system-design-and-scenarios-qa.md          │
│    • Complete Cross-cutting Deep Dives Across All Modules              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Related Repository References

- [Master Plan (`PLAN.md`)](PLAN.md)
- [Repository Architecture Context (`../CONTEXT.md`)](../CONTEXT.md)
- [AI Playbook & Guidelines (`../SKILL.md`)](../SKILL.md)
- [Master Authoring Templates (`../TEMPLATES.md`)](../TEMPLATES.md)
