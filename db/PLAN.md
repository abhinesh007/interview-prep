# 📋 Database Engineering Interview Prep — Master Plan

> **Goal:** Create an exhaustive, production-grade, section-wise Database Engineering interview Question & Answer curriculum in `/Users/abhineshgour/learning-space/abhi-agy/interview-prep/db`.
> Focused primarily on **PostgreSQL** (Postgres 14, 15, 16, and 17+ internals) as the primary relational database, comprehensive distributed data systems theory (**ACID, BASE, CAP, PACELC, 2PC, Sagas**), connection pooling (**PgBouncer**, Odyssey, serverless proxies), horizontal scalability (**declarative partitioning, Citus, sharding**), high availability (**streaming replication, Patroni, Raft, failover, split-brain**), read/write patterns, production observability (**`pg_stat_statements`, wait events, `EXPLAIN BUFFERS`**), enterprise security (**Row-Level Security, RBAC, SCRAM-SHA-256, auditing**), and a dedicated, production-deep module on **MongoDB** (WiredTiger engine, ESR indexing rule, write/read concerns, sharded cluster chunk balancing, multi-document transactions, and real-world outage troubleshooting).

---

## 🎯 Design Principles & Structure

Every question in the guide adheres strictly to the repository standards defined in [`CONTEXT.md`](../CONTEXT.md) and [`TEMPLATES.md`](../TEMPLATES.md):

```markdown
### Q[N]: [Clear, Realistic Question Title]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[Authoritative, technical explanation breaking down runtime mechanics under the hood. Accompanied by ASCII/Unicode mental model diagrams, comparison tables, exact configuration parameters, mathematical formulas, and production-tested SQL/MongoDB code examples.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Realistic edge-case challenge, production gotcha, or trap scenario]"  
*Senior Answer:* [How a staff database engineer or principal architect resolves the nuance with concrete mitigations, runtime behavior, and architectural trade-offs.]
```

### Five Mandatory Question Archetypes:
- 📖 **Conceptual & Deep-Dive:** Postgres storage engine pages, MVCC tuple header anatomy (`xmin`, `xmax`, `t_ctid`), WAL recovery mechanics, WiredTiger OCC concurrency, isolation levels under ANSI vs real engines, distributed consensus (Raft/Paxos).
- 💻 **Practical Coding & Tuning:** Writing queries with `EXPLAIN (ANALYZE, BUFFERS)`, implementing zero-downtime migrations (Expand/Contract pattern), configuring PgBouncer transaction pooling with prepared statements, building row-level security (RLS) policies for multi-tenant apps, tuning per-table autovacuum thresholds.
- 🧩 **Behavior & Anomaly Prediction:** Predicting transaction results under `READ COMMITTED` vs `REPEATABLE READ`, detecting Write Skew anomalies, simulating dirty reads vs phantom reads, anticipating locking behavior under concurrent `SELECT FOR UPDATE` vs `FOR NO KEY UPDATE`.
- 🐛 **Debug & Production Incident Response:** Resolving transaction ID (XID) wraparound emergency shutdowns, diagnosing connection pool exhaustion, identifying unindexed foreign keys causing table-level lock escalation, troubleshooting replica lag spikes, mitigating MongoDB ticket exhaustion.
- 🏗️ **System Design & Enterprise Architecture:** Architecting high-concurrency flash sale inventory reservation systems with zero overselling, designing a multi-region active-passive database with automatic failover and fencing tokens, scaling high-throughput write-heavy audit logging, architecting horizontal sharding with consistent hashing.

---

## 📁 File Breakdown & Roadmap

| # | File Name | Focus Domain | Target Qs |
|---|---|---|---|
| `00` | [`00-table-of-contents.md`](00-table-of-contents.md) | Navigation, Topic Index, Difficulty Matrix & Learning Tracks | Index |
| `01` | [`01-relational-core-and-storage-engine-qa.md`](01-relational-core-and-storage-engine-qa.md) | Postgres Architecture, 8KB Pages, Tuple Layout, Heap Files, MVCC Internals, Snapshots & Visibility | 18–22 |
| `02` | [`02-indexing-strategies-and-query-execution-qa.md`](02-indexing-strategies-and-query-execution-qa.md) | B-Tree Internals, BRIN, GIN, GiST, Covering Indexes (`INCLUDE`), Partial Indexes, Index Bloat, Optimizer Mechanics | 18–22 |
| `03` | [`03-vacuum-autovacuum-and-bloat-management-qa.md`](03-vacuum-autovacuum-and-bloat-management-qa.md) | Dead Tuples, Vacuum Process, HOT Updates, Freezing, XID Wraparound Disaster, Cost Limits & `pg_repack` | 16–20 |
| `04` | [`04-transactions-acid-and-isolation-levels-qa.md`](04-transactions-acid-and-isolation-levels-qa.md) | ACID Guarantees, ANSI vs Actual Isolation Levels, Dirty Reads, Non-Repeatable Reads, Phantoms, Write Skew & SSI | 18–22 |
| `05` | [`05-locking-mechanisms-and-concurrency-control-qa.md`](05-locking-mechanisms-and-concurrency-control-qa.md) | Row Locks, Table Locks, `FOR UPDATE` vs `FOR NO KEY UPDATE`, `SKIP LOCKED` Queues, Deadlock Detection & Graph | 16–20 |
| `06` | [`06-wal-checkpointing-and-durability-qa.md`](06-wal-checkpointing-and-durability-qa.md) | Write-Ahead Log (WAL), Checkpoints, LSN Arithmetic, Full Page Writes, Crash Recovery & fsync Durability | 16–18 |
| `07` | [`07-distributed-consistency-base-and-sagas-qa.md`](07-distributed-consistency-base-and-sagas-qa.md) | CAP & PACELC Theorems, ACID vs BASE, 2PC Coordinator Blocking, Saga Pattern (Orchestration/Choreography), CDC & Outbox | 18–22 |
| `08` | [`08-connection-pooling-and-pgbouncer-qa.md`](08-connection-pooling-and-pgbouncer-qa.md) | Postgres Fork Model, PgBouncer Modes (Session, Transaction, Statement), Prepared Statements Trap, Sizing Math | 16–20 |
| `09` | [`09-replication-high-availability-and-failover-qa.md`](09-replication-high-availability-and-failover-qa.md) | Streaming Replication, Sync vs Async (`synchronous_commit`), Logical Replication, Patroni, Split-Brain & STONITH | 18–22 |
| `10` | [`10-partitioning-sharding-and-horizontal-scale-qa.md`](10-partitioning-sharding-and-horizontal-scale-qa.md) | Declarative Partitioning (Range/List/Hash), Partition Pruning, Sharding Architectures, Citus, Shard Keys & Rebalancing | 16–20 |
| `11` | [`11-read-write-patterns-and-caching-strategies-qa.md`](11-read-write-patterns-and-caching-strategies-qa.md) | Read Replicas, Stale Reads, Read-After-Write Consistency, CQRS, Cache-Aside vs Write-Behind, Batch Writes & COPY | 16–20 |
| `12` | [`12-observability-diagnostics-and-performance-tuning-qa.md`](12-observability-diagnostics-and-performance-tuning-qa.md) | `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stat_statements`, Wait Events, Lock Analysis, Memory Tuning (`work_mem`, `shared_buffers`) | 18–22 |
| `13` | [`13-database-security-row-level-security-and-compliance-qa.md`](13-database-security-row-level-security-and-compliance-qa.md) | Row-Level Security (RLS), RBAC, SCRAM-SHA-256, TLS/SSL, `pgaudit`, Column Encryption, SQLi Mitigation & Multi-Tenancy | 16–20 |
| `14` | [`14-mongodb-architecture-scenarios-and-techniques-qa.md`](14-mongodb-architecture-scenarios-and-techniques-qa.md) | WiredTiger Internals, ESR Indexing Rule, Write/Read Concerns, Sharded Clusters, Multi-Doc Transactions & Outage Troubleshooting | 20–24 |
| `15` | [`15-enterprise-database-system-design-and-scenarios-qa.md`](15-enterprise-database-system-design-and-scenarios-qa.md) | RADIO Framework Scenarios: Flash-Sale Concurrency, Zero-Downtime Schema Migrations, Multi-Tenant SaaS, Disaster Recovery (PITR) | 12–15 |

---

## 📑 Detailed Section Specifications

---

### 📄 `01-relational-core-and-storage-engine-qa.md` — Storage Internals & MVCC Mechanics
1. **PostgreSQL Server Process Architecture:**
   - Postmaster daemon, client backend processes (`fork()` per connection), background workers (Checkpointer, Background Writer, WAL Writer, Autovacuum Launcher/Workers, Stats Collector / Cumulative Stats system in PG 15+).
   - Shared memory architecture: `shared_buffers`, WAL buffers, lock tables, process-local memory (`work_mem`, `maintenance_work_mem`).
2. **Physical Storage on Disk & Data Page Layout (8KB Pages):**
   - File system hierarchy: `$PGDATA/base/<db_oid>/<table_filenode>`. 1GB segment file splitting.
   - Internal page layout: Page Header (24 bytes: `pd_lsn`, `pd_checksum`, `pd_lower`, `pd_upper`, `pd_special`), Line Pointers (`ItemId` array growing down), Free Space, and Heap Tuples (growing up from the bottom).
   - Tuple Header layout: `t_xmin` (inserting XID), `t_xmax` (deleting/updating XID or lock holder), `t_cid` (command identifier), `t_ctid` (physical pointer to current or newer tuple version `(page, offset)`), `infomask` bits.
   - TOAST (The Oversized-Attribute Storage Technique): 2KB inline threshold, compression (pglz, lz4), out-of-line chunking in auxiliary TOAST tables.
3. **Multi-Version Concurrency Control (MVCC) Internals:**
   - Why Postgres uses append-only MVCC: Writers do not block readers, readers do not block writers.
   - What happens physically during `UPDATE`: Logical delete of old tuple (`xmax` set to current XID) + logical insert of new tuple (`xmin` set to current XID) with `t_ctid` chaining.
   - Snapshot construction: Active snapshot representation `xmin:xmax:xip_list` (oldest active XID, next unassigned XID, list of active in-flight XIDs).
   - Tuple Visibility Rules: How a backend determines if a tuple is visible to its active snapshot based on commit logs (`pg_xact`, formerly `pg_clog`) and hint bits.
4. **Free Space Map (FSM) & Visibility Map (VM):**
   - FSM (`_fsm` fork): Binary tree tracking available space per 8KB page for rapid insert routing without linear table scanning.
   - VM (`_vm` fork): Two bits per page:
     - `All-Visible`: Skips heap fetches during Index-Only Scans.
     - `All-Frozen`: Skips page scans during autovacuum freeze sweeps.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Predicting tuple visibility across concurrent transactions updating rows with delayed commits.
   - 🐛 Debug: Investigating high disk usage when table row count is small (uncovering tuple fragmentation and broken fillfactor).
6. **🎯 Quick-Fire & Trap Questions:**
   - Why does `SELECT COUNT(*)` on a million-row PostgreSQL table perform a sequential scan instead of reading a single metadata counter?
   - What are "Hint Bits" in tuple headers, and why does an initial read-only `SELECT` query generate disk writes?

---

### 📄 `02-indexing-strategies-and-query-execution-qa.md` — Indexing & Query Planner Optimization
1. **B-Tree Index Internals (The Default Workhorse):**
   - B-Tree structure: Meta page, Root page, Internal branching pages, Leaf pages with doubly-linked lists.
   - High-concurrency B-Tree mechanics: Lehman & Yao algorithm (right-sibling pointers allowing concurrent traversals during page splits without holding read locks).
   - Duplicate key handling & B-tree deduplication (PG 13+): Compressing identical index values to reduce index tree depth and disk footprint.
2. **Specialized PostgreSQL Index Types:**
   - **BRIN (Block Range Index):** Min/Max values per physical block range (e.g., 128 pages). Ideal for append-only, naturally ordered time-series data (99% smaller than B-Tree).
   - **GIN (Generalized Inverted Index):** Inverted index for multi-value types (JSONB arrays, full-text search `tsvector`, array columns). Fast lookups, write penalty, fastupdate pending list.
   - **GiST (Generalized Search Tree):** Lossy balanced tree for geometric/spatial data (PostGIS R-Tree), ranges (`daterange`), and nearest-neighbor search (`<->`).
   - **SP-GiST (Space-Partitioned GiST):** For non-balanced, partitioned data spaces (quad-trees, radix trees, prefix trees).
   - **Hash Indexes:** O(1) exact equality lookups (WAL-logged and crash-safe since PG 10).
3. **Advanced Indexing Techniques:**
   - Covering Indexes with `INCLUDE`: Storing non-search payload columns in index leaf nodes to enable **Index-Only Scans** without B-Tree branching overhead.
   - Partial Indexes: Indexing subsets with `WHERE status = 'ACTIVE'`. Massive size reduction and cache efficiency.
   - Expression / Functional Indexes: Indexing `lower(email)` or `((metadata->>'tenant_id')::uuid)`.
4. **PostgreSQL Cost-Based Optimizer & Query Execution:**
   - How the planner estimates cost: `seq_page_cost` (1.0), `random_page_cost` (1.1–4.0), `cpu_tuple_cost` (0.01), `cpu_operator_cost`.
   - Statistics collector & `ANALYZE`: `pg_statistic`, `pg_stats`, Most Common Values (MCV), histogram bounds, correlation.
   - Join strategies: Nested Loop (with index), Hash Join (in-memory hash table vs batching to disk), Merge Join (sorted inputs).
5. **🐛 Debug & Performance Traps:**
   - 🐛 Bug: Why the optimizer chooses a Sequential Scan instead of an Index Scan even when an index exists (e.g., high table selectivity, stale statistics, mismatched data types preventing index usage, `random_page_cost` set too high).
   - ⚠️ Gotcha: Creating indexes on production tables without `CONCURRENTLY` (acquires `SHARE` lock blocking all concurrent `INSERT`, `UPDATE`, `DELETE`).
6. **🎯 Quick-Fire & Trap Questions:**
   - What happens if a `CREATE INDEX CONCURRENTLY` command fails midway due to a constraint violation or connection drop? (The `INVALID` index trap).
   - Why does querying `WHERE column IS NULL` use a B-Tree index in Postgres, whereas in Oracle/MySQL it historically did not?

---

### 📄 `03-vacuum-autovacuum-and-bloat-management-qa.md` — Vacuum, Bloat & The Wraparound Disaster
1. **The Vacuum Lifecycle & Architecture:**
   - Why Vacuum is mandatory: Dead tuple reclamation, Visibility Map maintenance, Free Space Map updating, Transaction ID freezing.
   - Phases of a Vacuum cycle:
     1. Scan heap: Identify dead tuple item pointers (`t_ctid`).
     2. Vacuum indexes: Remove index entries pointing to dead tuples (multi-index pass).
     3. Vacuum heap: Mark line pointers as unused and reclaim dead page space.
     4. Truncate trailing empty pages from relation EOF (if exclusive lock can be briefly acquired).
2. **Heap-Only Tuples (HOT Updates) & Fillfactor:**
   - How HOT updates bypass index maintenance entirely when updated columns are not indexed and same-page space exists.
   - The `fillfactor` tuning parameter: Lowering table fillfactor (e.g., `SET (fillfactor = 80)`) to leave 20% free space per page for HOT updates on update-heavy workloads.
3. **The Transaction ID (XID) Wraparound Disaster:**
   - The 32-bit XID limit: ~4.2 billion transactions. Modular arithmetic modulo $2^{31}$ (2 billion transactions in the past, 2 billion in the future).
   - The catastrophic failure mode: If unvacuumed tuples exceed 2 billion transactions of age, past transactions appear to be in the *future*, resulting in silent data disappearance/corruption!
   - Freezing mechanism: Marking tuples with `HEAP_XMIN_FROZEN` (or `FrozenTransactionId = 2`), rendering them universally older than all possible transactions.
   - Fail-safe emergency shutdown: `autovacuum_freeze_max_age`. If reached, Postgres refuses new transactions, enters emergency read-only mode, and requires single-user mode (`postgres --single`) maintenance.
4. **Autovacuum Tuning for High-Throughput Production:**
   - Why global defaults fail on large tables: `autovacuum_vacuum_scale_factor = 0.2` means a 100M row table won't vacuum until 20M dead tuples accumulate!
   - Cost-based vacuum throttling: `autovacuum_vacuum_cost_limit` and `autovacuum_vacuum_cost_delay`.
   - Per-table tuning directives: Setting low scale factors (e.g., 0.01) and explicit thresholds on hot tables.
5. **Table & Index Bloat Remediation:**
   - Why plain `VACUUM` cannot return disk space to the OS (FSM page reuse vs physical file truncation).
   - `VACUUM FULL`: Why it is dangerous (acquires `ACCESS EXCLUSIVE` lock blocking all reads/writes, requires 2x disk space overhead).
   - Zero-downtime bloat elimination with `pg_repack`: Concurrently building a new copy, trigger-based change replay, minimal lock swap.
6. **🎯 Quick-Fire & Trap Questions:**
   - How does a lingering idle-in-transaction connection (`idle in transaction`) freeze the autovacuum horizon and cause cluster-wide bloat?
   - What is the difference between `REINDEX TABLE` and `REINDEX TABLE CONCURRENTLY`?

---

### 📄 `04-transactions-acid-and-isolation-levels-qa.md` — ACID Mechanics & Concurrency Anomalies
1. **ACID Under the Hood in Relational Systems:**
   - **Atomicity:** All-or-nothing execution via WAL redo/undo logging and transaction status bits in `pg_xact`.
   - **Consistency:** Database invariants enforced by schemas, constraints, foreign keys, triggers, and serializable schedules.
   - **Isolation:** Preventing concurrent transactions from observing intermediate, uncommitted, or inconsistent state via MVCC and lock managers.
   - **Durability:** Ensuring committed state survives power loss or hardware failure via WAL `fsync` to non-volatile storage.
2. **ANSI SQL-92 Isolation Levels vs PostgreSQL Implementation:**
   - The ANSI SQL standard definitions vs reality:
     | Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly / Write Skew |
     | :--- | :--- | :--- | :--- | :--- |
     | **Read Uncommitted** | Postgres treats as Read Committed (no dirty reads ever) | Possible | Possible | Possible |
     | **Read Committed** (Default) | Prevented | **Possible** | **Possible** | **Possible** |
     | **Repeatable Read** | Prevented | Prevented | **Prevented in PG!** | **Possible (Write Skew)** |
     | **Serializable (SSI)** | Prevented | Prevented | Prevented | **Prevented** |
3. **Concurrency Anomalies Deep Dive:**
   - **Dirty Read:** Reading data from an uncommitted transaction that might subsequently roll back.
   - **Non-Repeatable Read (Fuzzy Read):** Re-reading a row within the same transaction and seeing modified data committed by another transaction.
   - **Phantom Read:** Re-executing a range query and discovering new rows inserted by another committed transaction (Postgres `REPEATABLE READ` snapshot isolation prevents phantoms, exceeding ANSI spec).
   - **Write Skew:** Two transactions read overlapping data, evaluate a shared constraint, and make disjoint updates that violate the constraint (e.g., the classic "at least one doctor on call" or dual-withdrawal debit trap).
4. **Serializable Snapshot Isolation (SSI):**
   - Lock-free serializability: How SSI delivers true serializability without the performance destruction of Two-Phase Locking (2PL / S2PL).
   - Mathematical model: Tracking `rw-antidependencies` (SIREAD locks) in memory.
   - Dangerous structures: Identifying cycles in the dependency serialization graph (`T1 ──rw──> T2 ──rw──> T1`).
   - Abort and retry strategy: When a pivot transaction is detected, Postgres throws `40001: could not serialize access due to read/write dependencies among transactions`. How application code must implement exponential backoff retry wrappers.
5. **🧩 Output Prediction & 🐛 Debug Scenarios:**
   - 🧩 Output: Step-by-step interleaved timeline predicting results of two concurrent transactions modifying bank account balances under Read Committed vs Repeatable Read.
   - 🐛 Debug: Investigating why an e-commerce checkout allowed double-coupon redemption under standard Read Committed isolation.
6. **🎯 Quick-Fire & Trap Questions:**
   - Does a `SELECT ... FOR UPDATE` query execute an MVCC snapshot read or an in-place current row read?
   - What is a Read-Only Transaction Anomaly, and why can a transaction that executes only `SELECT` queries fail with a serialization failure under Serializable isolation?

---

### 📄 `05-locking-mechanisms-and-concurrency-control-qa.md` — Locking, Deadlocks & Queue Patterns
1. **The PostgreSQL Lock Hierarchy:**
   - Table-level locks (8 lock modes): `ACCESS SHARE`, `ROW SHARE`, `ROW EXCLUSIVE`, `SHARE UPDATE EXCLUSIVE`, `SHARE`, `SHARE ROW EXCLUSIVE`, `EXCLUSIVE`, `ACCESS EXCLUSIVE`.
   - Lock compatibility matrix: Which locks conflict with which operations (e.g., `VACUUM FULL` vs `SELECT`, `ALTER TABLE` vs `INSERT`, `CREATE INDEX CONCURRENTLY` vs `UPDATE`).
   - Row-level locks (4 lock modes): `FOR UPDATE`, `FOR NO KEY UPDATE`, `FOR SHARE`, `FOR KEY SHARE`.
   - Why `FOR NO KEY UPDATE` is vital: Locking rows for update without blocking foreign key validation checks on referenced tables.
2. **Explicit Row Locking & High-Concurrency Patterns:**
   - Pessimistic locking: `SELECT ... FOR UPDATE` to serialize access to scarce inventory.
   - Non-blocking lock acquisition: `NOWAIT` (fail immediately if locked) vs `SKIP LOCKED`.
   - 💻 Coding: Implementing a high-throughput, rock-solid job queue in PostgreSQL using `SELECT ... FOR UPDATE SKIP LOCKED` (zero lock contention among competing worker threads).
3. **Advisory Locks (`pg_advisory_lock`):**
   - Application-controlled distributed locks managed by Postgres shared memory.
   - Session-level vs Transaction-level advisory locks (`pg_advisory_xact_lock`).
   - Shared vs Exclusive advisory locks.
   - Ideal use cases: Distributed cron job leader election, preventing duplicate third-party webhook processing, coordinating application deployments.
4. **Deadlock Detection & Resolution:**
   - How Postgres detects deadlocks: The Lock Manager waits `deadlock_timeout` (default 1s) before initiating a directed cycle-check on the lock wait graph.
   - Deadlock victim selection: Postgres cancels one of the transactions, raising `40P01: deadlock detected`.
   - Strategies to eliminate deadlocks: Strict alphabetical lock ordering, locking parent records first, batch sorting by primary key before updates.
5. **Lock Contention Diagnosis:**
   - Querying `pg_locks` joined with `pg_stat_activity` to find blocked and blocking PIDs:
     ```sql
     SELECT blocked_locks.pid AS blocked_pid,
            blocking_locks.pid AS blocking_pid,
            blocked_activity.query AS blocked_statement,
            blocking_activity.query AS blocking_statement
     FROM pg_catalog.pg_locks blocked_locks
     JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
     JOIN pg_catalog.pg_locks blocking_locks ...
     ```
   - ⚠️ Gotcha: Unindexed foreign keys! Why deleting a row in a parent table acquires a table-wide `SHARE ROW EXCLUSIVE` lock on the child table if the foreign key column lacks an index.
6. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between `pg_cancel_backend(pid)` and `pg_terminate_backend(pid)`?
   - Why should you always configure `lock_timeout` and `statement_timeout` on migration scripts?

---

### 📄 `06-wal-checkpointing-and-durability-qa.md` — Write-Ahead Logging & Durability Engine
1. **Write-Ahead Logging (WAL) Architecture:**
   - Fundamental principle: Changes to data pages must be written to stable non-volatile WAL storage *before* those data pages are flushed from `shared_buffers` to disk.
   - Structure of WAL: 16MB segment files in `$PGDATA/pg_wal`.
   - Log Sequence Number (LSN): A 64-bit monotonically increasing integer byte offset into the WAL stream (`0/16B3748`).
   - Page LSN check: Every 8KB data page stores the LSN of the last WAL record that modified it (`pd_lsn`), ensuring crash-recovery idempotency.
2. **Checkpoints & The Checkpointer Process:**
   - What a Checkpoint does: Flushes all dirty shared buffers to disk, writes a checkpoint record to WAL, and establishes a safe redo horizon (freeing older WAL segments for deletion/recycling).
   - Checkpoint triggers: Time-based (`checkpoint_timeout`, default 5min) vs Volume-based (`max_wal_size`, default 1GB).
   - Checkpoint Spreading: Spreading dirty buffer writes over `checkpoint_completion_target` (default 0.9) to prevent severe I/O spikes (checkpoint stalls).
3. **Full Page Writes (`full_page_writes`):**
   - The Torn Page Problem: What happens if the OS or hardware crashes while writing an 8KB Postgres page made of two 4KB OS disk blocks?
   - Postgres solution: The first time a page is modified after a checkpoint, a full copy of the entire 8KB page is written to WAL.
   - ⚠️ Gotcha: Why aggressive or frequent checkpoints cause massive WAL write amplification and disk saturation due to repeated full page writes.
4. **Crash Recovery & The Redo Loop:**
   - Sequence on crash:
     1. Read `pg_control` file to find the latest valid checkpoint record.
     2. Scan forward through WAL from the checkpoint redo LSN.
     3. For every WAL record: Compare record LSN with page `pd_lsn`. If record LSN > page LSN, replay the change; otherwise, skip.
   - Point-in-Time Recovery (PITR): Combining a base backup with continuous WAL archiving (`archive_command` or streaming) to restore the database to an exact microsecond timestamp.
5. **Durability vs Latency Tuning (`synchronous_commit`):**
   - The cost of `fsync`: Every transaction commit forcing a physical disk flush.
   - `synchronous_commit = off`: Asynchronous commit returning success immediately to the client while WAL is flushed asynchronously up to `wal_writer_delay` (up to 200ms).
   - Trade-off analysis: When is asynchronous commit acceptable? (e.g., click tracking, non-critical telemetry, metrics vs financial transactions).
6. **🎯 Quick-Fire & Trap Questions:**
   - What happens if the disk hosting `$PGDATA/pg_wal` fills up completely to 100%?
   - How does PostgreSQL verify WAL segment integrity against bit-rot during replay?

---

### 📄 `07-distributed-consistency-base-and-sagas-qa.md` — Distributed Consistency, BASE & Sagas
1. **Theoretical Foundations: CAP, PACELC & Consistency Models:**
   - **CAP Theorem:** Under network partition (P), choose between Consistency (C - linearizability) and Availability (A - non-failing reads/writes).
   - **PACELC Theorem:** If Partition (P), choose Availability (A) vs Consistency (C); Else (E), choose Latency (L) vs Consistency (C). Categorizing systems (Postgres with sync replication: PC/EC; MongoDB: PC/EC or PA/EL depending on concerns; Cassandra: PA/EL).
   - Consistency spectrum: Linearizability ➔ Sequential Consistency ➔ Causal Consistency ➔ Read-After-Write ➔ Eventual Consistency.
2. **ACID vs BASE Paradigms:**
   - **ACID:** Pessimistic, immediate consistency, high coupling, single database boundary.
   - **BASE:**
     - **Basically Available:** System remains functional despite node partitions.
     - **Soft State:** Data values may drift or change over time without explicit external writes due to background propagation.
     - **Eventually Consistent:** In the absence of new mutations, all replicas converge to identical state.
3. **Distributed Transactions: Two-Phase Commit (2PC):**
   - Phase 1: Prepare (Voting phase - coordinator asks participants to prepare and acquire locks).
   - Phase 2: Commit / Abort (Decision broadcast phase).
   - The Fatal Flaw of 2PC: **Coordinator Blocking**. If the coordinator crashes after Phase 1, participant databases remain locked indefinitely, holding system resources and blocking concurrent traffic.
   - Why 2PC is an anti-pattern across microservices: Network latency amplification, availability product ($A_{system} = A_1 \times A_2 \times ... \times A_n$), and cross-service lock coupling.
4. **The Saga Pattern for Microservices:**
   - Decomposing a distributed transaction into a sequence of local ACID transactions.
   - **Compensating Transactions:** Semantic undo actions executed in reverse order upon step failure (e.g., executing `refundPayment` if `reserveInventory` fails).
   - **Choreography Sagas:** Event-driven via message brokers (Kafka/RabbitMQ). Pros: decoupled. Cons: cyclic dependencies, difficult observability, distributed spaghetti.
   - **Orchestration Sagas:** Centralized state machine engine (Temporal, AWS Step Functions, or custom orchestrator). Pros: clear failure tracing, centralized state. Cons: orchestrator dependency.
   - ⚠️ The Isolation Hazard: Sagas do NOT provide isolation (dirty reads across intermediate states). Mitigations: Semantic Locks (`state = PENDING_RESERVATION`), Commutative updates, Version tokens.
5. **Transactional Outbox Pattern & Change Data Capture (CDC):**
   - The Dual-Write Problem: Why writing to a database and publishing to Kafka in the same application method causes catastrophic data loss or inconsistency on network crashes.
   - The Solution: Writing domain entity changes and outbox messages atomically inside the same local database transaction (`BEGIN ... INSERT INTO orders ... INSERT INTO outbox_events ... COMMIT`).
   - Message relay strategies: Polling publisher vs Log-based CDC using Debezium and PostgreSQL Logical Decoding.
6. **🎯 Quick-Fire & Trap Questions:**
   - Why must all compensating transactions in a Saga be strictly idempotent?
   - What happens in a Saga if a compensating transaction itself fails permanently due to a third-party gateway error?

---

### 📄 `08-connection-pooling-and-pgbouncer-qa.md` — Connection Pooling & PgBouncer Internals
1. **The PostgreSQL Process-per-Connection Architecture:**
   - Why Postgres uses OS processes instead of lightweight threads: Process isolation, memory safety, crash containment.
   - The cost of a connection: Each client connection spawns a dedicated backend process consuming ~5MB–10MB of memory, plus OS scheduler contention and shared memory lock tracking overhead.
   - The Connection Saturation Cliff: Why benchmarking shows Postgres throughput *drops off a cliff* when connection count exceeds optimal capacity (e.g., 2,000 direct connections vs 100 pooled connections).
2. **PgBouncer Architecture & Pooling Modes:**
   - Single-threaded, event-driven proxy built on `libevent`.
   - The Three Pooling Modes:
     - **Session Pooling:** Connection leased to client for entire session lifetime until disconnect. Fully transparent, but minimal connection concurrency gain.
     - **Transaction Pooling:** Connection leased only for duration of a transaction (`BEGIN` ... `COMMIT`). Returns to pool immediately upon commit. Allows 10,000 application clients to share 50 database sockets.
     - **Statement Pooling:** Connection leased per statement. Multi-statement transactions are strictly forbidden. (Rarely used, only for specific read-only analytics).
3. **The Transaction Pooling Trap (What Breaks in Transaction Mode):**
   - ⚠️ Prepared Statements: Prepared statements are scoped to backend process memory. Executing on a different connection throws `ERROR: prepared statement "s1" does not exist`. (Modern resolution: PgBouncer 1.21+ built-in prepared statement support, or ORM named-statement disabling).
   - ⚠️ Session-level `SET` commands: `SET search_path` or `SET timezone` does not persist across transactions. (Fix: `SET LOCAL` or configuring user defaults).
   - ⚠️ Session Advisory Locks: `pg_advisory_lock` leaks or errors if unlocked on a different physical connection. (Fix: use `pg_advisory_xact_lock`).
   - ⚠️ Temporary Tables: `CREATE TEMP TABLE` exists only on that specific backend process.
4. **Optimal Connection Pool Sizing Math:**
   - The empirical connection pool sizing formula:
     $$\text{Connections} = (\text{Core Count} \times 2) + \text{Effective Spindle Count}$$
   - Understanding Little's Law in database tiering:
     $$L = \lambda \times W$$
     (Concurrent queries in DB = Query arrival rate $\times$ Average query execution latency).
   - Why smaller connection pools lead to faster response times: Eliminating CPU context switching and disk I/O queue thrashing.
5. **Modern Pooler Alternatives & Serverless Architectures:**
   - PgBouncer vs Odyssey (multi-threaded, Yandex) vs pgpool-II (connection pooling + query routing/caching).
   - Serverless database connection proxies: AWS RDS Proxy, Supabase Supavisor, Neon proxy (handling connection bursts from AWS Lambda / edge functions without exhausting DB sockets).
6. **🎯 Quick-Fire & Trap Questions:**
   - What does `DISCARD ALL` do in PostgreSQL connection pooling, and why is `server_reset_query` critical in PgBouncer?
   - How do you configure health checks and connection timeouts (`idle_transaction_timeout`, `server_idle_timeout`) to prevent orphaned connections from locking rows indefinitely?

---

### 📄 `09-replication-high-availability-and-failover-qa.md` — Replication, High Availability & Failover
1. **Physical Streaming Replication Architecture:**
   - Primary node: WAL sender background process streaming WAL records over TCP.
   - Standby node: WAL receiver process receiving WAL chunks and writing to standby WAL, Startup process applying WAL to standby data pages.
   - Hot Standby: Allowing read-only queries on the replica while applying WAL updates.
   - Replication slots: Why physical replication slots (`pg_create_physical_replication_slot`) prevent the primary from deleting unconsumed WAL segments, and the **catastrophic trap** of an orphaned replication slot filling the primary disk to 100%!
2. **Synchronous vs Asynchronous Replication:**
   - Asynchronous replication (default): Primary commits locally and returns success before WAL reaches the replica. Zero write latency penalty, but risks data loss (RPO > 0) on primary crash.
   - Synchronous replication: Controlled by `synchronous_commit` and `synchronous_standby_names`.
   - The levels of `synchronous_commit`:
     - `off`: Client notified before local flush.
     - `local`: Client notified after local flush (standard async).
     - `remote_write`: Standby received WAL into OS memory buffer.
     - `on`: Standby flushed WAL to non-volatile disk.
     - `remote_apply`: Standby applied WAL to data pages (guarantees zero replication lag for read-after-write consistency, high write latency).
3. **Logical Replication vs Physical Streaming Replication:**
   - Physical: Exact byte-for-byte block replication. Standby must be identical architecture and same major PG version. Read-only.
   - Logical: Decodes WAL into logical SQL transactions (INSERT/UPDATE/DELETE tuples) using logical decoding plugins (`pgoutput`).
   - Publication and Subscription model.
   - Prime use cases: Selective table replication, zero-downtime major version upgrades (e.g., PG 14 to PG 17), replicating to data warehouses, multi-master setups.
   - Limitations: Does not replicate DDL changes, sequences, or large objects.
4. **High Availability (HA) & Automated Failover with Patroni:**
   - Patroni architecture: Python daemon managing Postgres, backed by a Distributed Consensus Store (DCS - etcd, Consul, or Kubernetes API).
   - Raft consensus: Leader election, heartbeat leases, dynamic configuration management.
   - Automatic failover sequence:
     1. Primary fails to renew DCS lease.
     2. Standby with smallest replication lag is elected new leader.
     3. Standby promotes to primary (creating a new timeline ID).
     4. Health checks update load balancer / HAProxy routing.
5. **Split-Brain Mitigation & Fencing:**
   - What causes Split-Brain: Network partition where old primary and promoted replica both accept writes simultaneously, corrupting data.
   - Fencing mechanisms:
     - STONITH ("Shoot The Other Node In The Head"): Hardware power-off / IPMI cut.
     - Fencing tokens (monotonically increasing generation epoch).
     - Patroni watchdog (`/dev/watchdog` hardware or softdog timer resetting the machine if DCS lease renewal fails).
6. **🎯 Quick-Fire & Trap Questions:**
   - What is a "Hot Standby Conflict", and why do long analytical queries on a read replica get cancelled with `ERROR: canceling statement due to conflict with recovery`?
   - What happens to replication timelines (`timeline history`) when a standby is promoted, and how does `pg_rewind` allow an old demoted primary to rejoin without a full re-clone?

---

### 📄 `10-partitioning-sharding-and-horizontal-scale-qa.md` — Partitioning, Citus & Sharding
1. **PostgreSQL Declarative Table Partitioning:**
   - Partitioning strategies:
     - **Range Partitioning:** `PARTITION BY RANGE (created_at)` (time-series, logs).
     - **List Partitioning:** `PARTITION BY LIST (country_code)` (geographic tenancy).
     - **Hash Partitioning:** `PARTITION BY HASH (user_id)` (even distribution across N buckets).
   - Sub-partitioning (multi-level partitioning): Range by year ➔ List by region.
   - Default partitions: Handling out-of-range values and caveats.
2. **Partition Pruning (Performance Optimization):**
   - What partition pruning is: The query planner excluding irrelevant partition tables from the query execution plan based on query `WHERE` predicates.
   - Static / Compile-time pruning vs Run-time pruning (parameterized queries, prepared statements, nested loop join inputs).
   - Verification via `EXPLAIN`: Checking whether the plan scans 1 partition instead of 100 partitions.
   - Partition maintenance automation with `pg_partman`.
3. **Partitioning vs Sharding:**
   - Partitioning: Single database instance, single OS, storage division. Atomic transactions and foreign keys preserved.
   - Sharding: Shared-nothing architecture across multiple independent database nodes. Storage and compute scaled horizontally.
4. **Sharding Architectures & Shard Key Selection:**
   - The Shard Key Dilemma:
     - High cardinality vs low cardinality.
     - Monotonically increasing keys (timestamp / auto-increment ID): Creates massive write hotspots on the latest shard!
     - Hashed shard keys: Even write distribution, but destroys range-query efficiency (forcing scatter-gather queries).
   - Consistent Hashing: Distributing data across a virtual hash ring (e.g., $2^{32}-1$ tokens) to minimize data movement during node additions/removals.
5. **Postgres Distributed Sharding with Citus:**
   - Citus architecture: Coordinator node vs Worker nodes.
   - Table types: Distributed tables (sharded by hash), Reference tables (replicated to all worker nodes for fast local joins), Local tables.
   - Distributed query execution: Router execution vs Pushdown query execution vs Distributed Merge.
   - Cross-shard joins & Two-Phase Commit (2PC) in Citus: When distributed transactions work and when they stall.
6. **🎯 Quick-Fire & Trap Questions:**
   - What are the restrictions on Unique Constraints and Primary Keys on partitioned tables in PostgreSQL? (Must contain all partition key columns).
   - What is a "Scatter-Gather" query, and why does executing an unindexed aggregate across 64 shards degrade application throughput?

---

### 📄 `11-read-write-patterns-and-caching-strategies-qa.md` — Read-Write Scaling & Access Patterns
1. **Read/Write Splitting Architectures:**
   - Routing writes to Primary and read-heavy queries to a pool of Read Replicas.
   - Implementation approaches:
     - Application-level routing (multiple data sources / read-write context managers in ORMs).
     - Middleware routing (PgBouncer with read-write ports, ProxySQL for MySQL, AWS RDS Aurora Read Endpoints).
2. **Replication Lag & Consistency Anomaly Mitigations:**
   - The Stale Read Trap: A user updates their profile, clicks save, is redirected to the view page, and sees their old profile because the read routed to a lagging replica!
   - Mitigation Strategies:
     - **Read-After-Write Consistency (Write Pinning):** Pinning all reads for a given user session to the primary for $X$ seconds after any mutation.
     - **Monotonic Reads / Sequence Tokens:** Tracking the transaction commit LSN in the user's session cookie and requiring read replicas to have caught up to that LSN before serving the query (`pg_last_wal_replay_lsn() >= user_lsn`).
     - Routing critical paths (authentication, checkout, balance checks) strictly to the primary.
3. **Command Query Responsibility Segregation (CQRS):**
   - Separating write operations (Commands - modifying domain state) from read operations (Queries - optimized read models).
   - Eventual consistency synchronization: Updating materialized views or downstream search indexes (Elasticsearch/Typesense) via CDC events.
   - When CQRS is justified vs when it introduces unnecessary operational complexity.
4. **Distributed Caching Strategies (Redis / Memcached):**
   - **Cache-Aside (Lazy Loading):** App queries cache; on miss, reads DB and populates cache. Concurrency trap: Cache stampede / Thundering herd on TTL expiration (Mitigations: probabilistic early expiration XFetch, mutex locks).
   - **Write-Through:** App writes to cache, cache writes synchronously to DB.
   - **Write-Behind (Write-Back):** App writes to cache; cache batches writes to DB asynchronously. High write throughput, risk of data loss on cache crash.
   - Cache Invalidation Dilemma: "There are only two hard things in Computer Science: cache invalidation and naming things." Event-driven cache busting via Postgres CDC.
5. **Optimizing High-Throughput Write-Heavy Workloads:**
   - Batch insertion: Why single-row `INSERT` in a loop is fatal ($O(N)$ round-trips and WAL flushes). Multi-row `INSERT INTO ... VALUES (...), (...)`.
   - Streaming ingestion with `COPY ... FROM STDIN`: Bypassing SQL query parsing and AST generation for 10x-50x insert speedups.
   - Unlogged Tables (`CREATE UNLOGGED TABLE`): Skipping WAL writes entirely for ephemeral staging data (2x-3x speedup, truncated on crash).
   - Deferrable constraints (`DEFERRABLE INITIALLY DEFERRED`): Evaluating foreign keys and unique constraints at transaction `COMMIT` rather than per statement.
6. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between `INSERT ... ON CONFLICT DO NOTHING` and `INSERT ... ON CONFLICT DO UPDATE` (Upsert), and what locks does an Upsert acquire?
   - How does `hot-spotting` manifest on a single row (e.g., an account balance or inventory count), and how do you implement sub-account batching or distributed counter sharding?

---

### 📄 `12-observability-diagnostics-and-performance-tuning-qa.md` — Observability & Deep Diagnostics
1. **Query Plan Dissection: `EXPLAIN (ANALYZE, BUFFERS)`:**
   - Why plain `EXPLAIN` is insufficient (only shows planner estimates).
   - What `BUFFERS` reveals: `shared hit` (cache hits in `shared_buffers`), `shared read` (disk reads from OS page cache or storage), `shared dirtied`, `shared written`.
   - Identifying disk spills: `Sort Method: external merge Disk: 16384kB` (insufficient `work_mem` forcing disk sorting) vs `Sort Method: quicksort Memory: 1024kB`.
   - Spotting bad estimations: Comparing `rows=10` (estimated) vs `actual rows=500000` (stale stats or correlated columns needing extended statistics `CREATE STATISTICS`).
2. **Query Profiling with `pg_stat_statements`:**
   - The essential PostgreSQL extension for performance monitoring.
   - Key metrics: `total_exec_time`, `mean_exec_time`, `calls`, `shared_blks_hit`, `shared_blks_read`, `rows`.
   - Querying top bottleneck queries:
     ```sql
     SELECT query, calls, total_exec_time / calls AS avg_ms,
            (100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0)) AS cache_hit_pct
     FROM pg_stat_statements
     ORDER BY total_exec_time DESC LIMIT 10;
     ```
3. **Wait Events & Real-Time Diagnostics:**
   - `pg_stat_activity`: Inspecting active queries, states (`active`, `idle in transaction`), wait events.
   - Wait Event Types:
     - `Lock`: Waiting for heavyweight table/row locks.
     - `IO`: Waiting for disk read/write or WAL sync (`DataFileRead`, `WALWrite`, `WALSync`).
     - `LWLock`: Light-weight lock contention on shared memory structures (`WALBufMapping`, `buffer_mapping`, `ProcArrayLock`).
     - `Client`: Waiting on client network socket (`ClientRead` = idle connection waiting for client query).
4. **Memory & Engine Tuning Parameters:**
   - `shared_buffers`: Sizing recommendations (typically 25% of system RAM, leaving 75% for OS page cache).
   - `work_mem`: Sizing formula and **The Multiplier Trap**! (`work_mem` is allocated per sort/hash operation per node in a query plan, meaning a complex query with 4 sorts run by 50 concurrent connections can allocate $4 \times 50 \times \text{work\_mem}$, causing kernel OOM-killer invocations).
   - `maintenance_work_mem`: Memory for VACUUM, CREATE INDEX, ALTER TABLE (typically 1GB–2GB).
   - `random_page_cost`: Lowering from default 4.0 to 1.1 on modern NVMe/SSD storage to prevent the planner from irrationally avoiding index scans.
5. **PostgreSQL 15–17+ Modern Observability:**
   - `pg_stat_io`: Granular breakdown of I/O across backends, background workers, and autovacuum by context (normal, vacuum, bulkread, bulkwrite).
   - Cumulative statistics subsystem rewrite: Moving stats out of UDP sockets into shared memory for zero-overhead tracking.
6. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between a Sequential Scan, an Index Scan, a Bitmap Index Scan, and an Index-Only Scan?
   - How do you configure `auto_explain` to log the full execution plan of any query that exceeds 500ms in production?

---

### 📄 `13-database-security-row-level-security-and-compliance-qa.md` — Security, RLS & Multi-Tenancy
1. **Row-Level Security (RLS) for Multi-Tenant Isolation:**
   - The Multi-Tenancy dilemma: Shared Database Shared Schema vs Schema-per-tenant vs Database-per-tenant.
   - Enabling RLS: `ALTER TABLE documents ENABLE ROW LEVEL SECURITY`.
   - Creating tenant isolation policies:
     ```sql
     CREATE POLICY tenant_isolation_policy ON documents
     FOR ALL
     USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
     ```
   - Application context propagation: Setting `SET LOCAL app.current_tenant_id = '...'` inside the transaction.
   - ⚠️ Gotchas with RLS: Performance overhead of policy subqueries, table owner bypassing RLS by default (`ALTER TABLE ... FORCE ROW LEVEL SECURITY`), query optimizer leaking row existence via function execution order.
2. **Role-Based Access Control (RBAC) & Least Privilege:**
   - Users vs Roles (`CREATE ROLE` with `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`).
   - Schema privileges: Why default public schema permissions historically posed security hazards (and PG 15 revoke of `CREATE` on `public`).
   - Defining least-privilege application roles (`app_reader`, `app_writer`, `migration_admin`).
   - Default privileges (`ALTER DEFAULT PRIVILEGES IN SCHEMA ...`).
3. **Authentication & Connection Security:**
   - `pg_hba.conf` architecture: Type (`host`, `local`), Database, User, Address (CIDR), Auth method.
   - Modern Password Hashing: SCRAM-SHA-256 (RFC 5802) vs insecure legacy `md5`. Mutual authentication and resistance to replay attacks.
   - Enforcing TLS/SSL: Client certificates (`sslmode=verify-full`), preventing man-in-the-middle attacks.
4. **Data Protection at Rest & In-Transit:**
   - Transparent Data Encryption (TDE): Native solutions, disk-level LUKS encryption, AWS KMS encrypted volumes.
   - Column-level cryptographic functions with `pgcrypto`: Asymmetric and symmetric encryption (`pgp_sym_encrypt`).
   - PII masking and Dynamic Data Masking (DDM) for non-production environments.
5. **Auditing & Enterprise Compliance:**
   - The `pgaudit` extension: Fine-grained auditing for compliance (SOC2, HIPAA, PCI-DSS).
   - Logging session vs object audits (tracking all read/write queries against sensitive tables).
   - SQL Injection Defense: Why parameterized queries prevent SQLi at the protocol level, and how dynamic SQL in stored procedures (`EXECUTE format(...)`) can introduce vulnerabilities if unsanitized (`%I` for identifiers vs `%L` for literals).
6. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between `SECURITY INVOKER` and `SECURITY DEFINER` on a PostgreSQL stored function, and what security exploit can occur if `search_path` is not explicitly set on a `SECURITY DEFINER` function?
   - What happens if an application connects as a `SUPERUSER` to a table with Row-Level Security enabled?

---

### 📄 `14-mongodb-architecture-scenarios-and-techniques-qa.md` — MongoDB Engine, ESR & Outages
1. **Document Data Modeling Strategies:**
   - Embedding (Denormalization) vs Referencing (Normalization):
     - When to Embed: 1:1 relationships, 1:Few bounded relationships, data accessed together atomically.
     - When to Reference: 1:Many unbounded relationships (e.g., millions of log entries), Many-to-Many relationships, data updated frequently in isolation.
   - The 16MB BSON document limit: Why unbounded arrays cause catastrophic document growth and performance collapse.
   - Modeling patterns: Bucket pattern (time-series), Subset pattern (large lists), Outlier pattern.
2. **WiredTiger Storage Engine Internals:**
   - Concurrency control: Document-level concurrency via Optimistic Concurrency Control (OCC) without table-wide write locks.
   - Internal Cache Allocation: Sizing equation:
     $$\text{WiredTiger Cache} = \max\left(50\% \times (\text{Total RAM} - 1\text{GB}), 256\text{MB}\right)$$
   - Checkpointing & Journaling: Writing dirty pages to disk every 60 seconds (or 2GB of journal). Write-ahead journal in `journal/` directory for durability between checkpoints.
   - Ticket Exhaustion & Cache Pressure: How 128 concurrent read/write tickets can be exhausted when queries perform massive unindexed scans, freezing incoming application operations.
   - Compression: Snappy (default, low CPU), Zlib (high compression ratio), Prefix compression for indexes.
3. **Write Concern & Read Concern Mechanics:**
   - **Write Concern (`w`, `j`, `wtimeout`):**
     - `w: 1`: Primary acknowledged. Fast, but data lost if primary dies before replication!
     - `w: "majority"`: Acknowledged by quorum of replica set nodes. Immune to failover rollbacks.
     - `j: true`: Written to on-disk journal before acknowledgment.
     - `wtimeout`: Preventing threads from blocking forever if a replica is down.
   - **Read Concern:**
     - `local` / `available`: Node's current state. Prone to dirty reads and rollbacks.
     - `majority`: Data acknowledged by a quorum. Guaranteed never to be rolled back.
     - `linearizable`: Primary confirms its active leadership with quorum *during* the read. Prevents stale reads from partitioned deposed primaries.
     - `causalConsistency`: Read-your-own-writes across distributed sessions.
4. **The ESR Indexing Rule (Compound Index Design):**
   - The mathematical rule for high-performance index field ordering:
     $$\mathbf{E}\text{quality} \longrightarrow \mathbf{S}\text{ort} \longrightarrow \mathbf{R}\text{ange}$$
   - Why ESR works: Equality narrows down candidate index keys, Sort navigates pre-ordered B-tree leaf entries without in-memory sorting, and Range filters the remaining boundaries.
   - Explaining execution plans: `IXSCAN` vs `COLLSCAN`, in-memory sort (`SORT` stage with 100MB RAM limit) vs indexed sort.
   - Specialized indexes: Multikey indexes (arrays), Partial indexes, TTL indexes, Text indexes, Hashed indexes.
5. **Sharded Cluster Architecture & Pitfalls:**
   - Core topology: `mongos` query routers, Config Server replica set, Shard replica sets.
   - Choosing a Shard Key:
     - Monotonically increasing key trap (`ObjectId`, `createdAt`): All new writes hit a single shard (write hotspot).
     - Low cardinality key trap: Prevents chunk splitting beyond N distinct values.
     - Hashed shard keys: Distributes writes evenly, but turns range queries into scatter-gather queries.
   - Chunk splitting and the Balancer: Chunk size (default 64MB), jumbo chunks (chunks exceeding max size that cannot be split), balancer CPU/network overhead.
   - Targeted queries (containing shard key) vs Scatter-Gather queries (routing to every shard).
6. **Multi-Document ACID Transactions & Change Streams:**
   - Multi-Document Transactions: Distributed transactions across collections and shards using Snapshot Isolation.
   - Production trade-offs: Memory overhead in WiredTiger cache, 60-second execution time limit, lock acquisition conflicts.
   - Change Streams: Real-time change data capture built on the replica set Oplog.
7. **Production Outage Troubleshooting Scenarios:**
   - 🐛 Scenario 1: CPU hits 100% and connection pool stalls — using `db.currentOp()`, identifying `COLLSCAN`, killing queries with `db.killOp()`.
   - 🐛 Scenario 2: Oplog window exhaustion and replication lag — secondary falls off the oplog horizon, requiring initial sync / resync.
8. **🎯 Quick-Fire & Trap Questions:**
   - What is the difference between `$lookup` in MongoDB and an SQL `JOIN` in terms of memory limits and execution pipeline?
   - What happens to uncommitted writes on a deposed primary when it reconnects after a failover (the `rollback/` directory)?

---

### 📄 `15-enterprise-database-system-design-and-scenarios-qa.md` — Enterprise System Design (RADIO)
Adheres strictly to the **RADIO Framework** (Requirements, Architecture, Data Model, Interface/Contracts, Optimizations/Resiliency):

1. **Scenario 1: High-Concurrency Flash Sale & Inventory Reservation System:**
   - **R:** Reserve inventory for 100,000 items in 10 seconds. Zero overselling, strict consistency, high throughput, sub-100ms response time.
   - **A:** API Tier ➔ PgBouncer ➔ PostgreSQL with inventory partitioning and Redis rate-limiting/cache layer.
   - **D:** Items, inventory allocations, reservation records with expiration timestamps (`reserved_until`).
   - **I:** API contract: `POST /api/v1/reservations` with idempotency token.
   - **O:**
     - Eliminating single-row lock contention: Why naive `UPDATE inventory SET stock = stock - 1 WHERE item_id = 1` causes thread lock convoy and database stall.
     - The Solution: Inventory batching, sub-batch counter sharding, or `SELECT id FROM inventory_units WHERE item_id = 1 AND status = 'AVAILABLE' LIMIT 1 FOR UPDATE SKIP LOCKED`.
     - Releasing expired reservations via background worker with advisory locks.
2. **Scenario 2: Zero-Downtime Schema Migrations on a 100M+ Row Table:**
   - **R:** Alter a mission-critical `orders` table (100M rows, 500GB, 5,000 queries/sec): add non-nullable column with default value, rename a column, and alter a data type without locking reads or writes.
   - **A:** Application dual-writing / feature flagging, PostgreSQL migration runner.
   - **D:** The **Expand / Contract (Parallel Run) Pattern**:
     1. Phase 1 (Expand): Add nullable column or column with constant default (Postgres 11+ metadata-only instant default).
     2. Phase 2: Deploy app version writing to both old and new columns.
     3. Phase 3: Background backfill of historical rows in small batches using primary key pagination (`WHERE id BETWEEN ...`).
     4. Phase 4: Add `NOT NULL` constraint using `NOT VALID` followed by `VALIDATE CONSTRAINT` (avoids table lock).
     5. Phase 5: Create supporting index with `CREATE INDEX CONCURRENTLY`.
     6. Phase 6 (Contract): Deploy app version reading from new column, drop old column.
   - **O:** Lock timeouts: Setting `SET lock_timeout = '2s'` on all migration DDL to prevent blocking application queries if a lock cannot be immediately acquired.
3. **Scenario 3: Multi-Tenant B2B SaaS Database Architecture:**
   - **R:** Support 10,000 tenants ranging from small businesses to enterprise tier. Complete data isolation, SOC2 compliance, custom tenant backups, query performance isolation.
   - **A:** Hybrid multi-tenancy model: Shared Database with Row-Level Security for standard tiers; Isolated Schema / Dedicated Database for enterprise tier.
   - **D:** Tenant context schema, tenant-keyed partitioning.
   - **I:** Connection routing layer inspecting JWT tenant claims.
   - **O:** Preventing the "Noisy Neighbor" problem: Connection pool limits per tenant, resource quotas, and dynamic tenant migration from shared to dedicated storage.
4. **Scenario 4: Disaster Recovery, Backup & Point-in-Time Recovery (PITR):**
   - **R:** Recovery Point Objective (RPO) $\le 1$ minute; Recovery Time Objective (RTO) $\le 15$ minutes for a 2TB database.
   - **A:** Continuous WAL archiving to object storage (S3/GCS) with pgBackRest / WAL-G, physical base backups, automated recovery testing.
   - **D:** Backup manifests, timeline tracking.
   - **I:** DR failover runbook and validation scripts.
   - **O:** Restoring to an exact transaction LSN before a human error (`DROP TABLE`) occurred without losing subsequent transactions on other tables.

---

## 🚦 Recommended Learning Tracks

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   🗺️ DATABASE INTERVIEW STUDY TRACKS                   │
├────────────────────────────────────────────────────────────────────────┤
│ 🟢 JUNIOR TRACK (Core Foundations & Querying):                         │
│    • Module 01: Relational Core, 8KB Pages & MVCC Basics               │
│    • Module 02: Indexing Essentials (B-Tree, EXPLAIN basics)           │
│    • Module 04: ACID Concepts & Standard Isolation Levels              │
│    • Module 05: Locking Fundamentals & Row Locks                       │
│    • Module 14: MongoDB Document Basics & Basic Queries                │
│                                                                        │
│ 🟡 MID-LEVEL TRACK (Production Operations & Architecture):             │
│    • Module 02: Advanced Indexing (BRIN, GIN, Covering Indexes)        │
│    • Module 03: Vacuum, Bloat & Autovacuum Tuning                      │
│    • Module 06: WAL, Checkpoints & Crash Recovery                      │
│    • Module 08: Connection Pooling & PgBouncer Modes                   │
│    • Module 11: Read/Write Splitting & Caching Topologies              │
│    • Module 14: WiredTiger Engine, ESR Rule & Write Concerns           │
│                                                                        │
│ 🔴 SENIOR & RELIABILITY TRACK (Internals, Anomalies & HA):             │
│    • Module 03: XID Wraparound Disaster & Repack Deep Dive             │
│    • Module 04: Write Skew, Anomaly Analysis & SSI Mechanics           │
│    • Module 05: Lock Matrices, Deadlock Graphs & SKIP LOCKED           │
│    • Module 07: Distributed Consistency, CAP, PACELC, 2PC & Sagas      │
│    • Module 09: Streaming Replication, Patroni, Raft & Split-Brain     │
│    • Module 10: Declarative Partitioning & Sharding Fundamentals       │
│    • Module 12: EXPLAIN BUFFERS, Wait Events & Memory Tuning           │
│    • Module 13: Row-Level Security, SCRAM-SHA-256 & Auditing           │
│    • Module 14: Sharded Clusters, Chunk Balancing & Outage Response    │
│                                                                        │
│ 🟣 PRINCIPAL ARCHITECT TRACK (Enterprise System Design):               │
│    • Module 07: Distributed Sagas, Outbox CDC & Eventual Consistency   │
│    • Module 10: Distributed Citus Sharding & Consistent Hashing        │
│    • Module 15: Enterprise System Design (RADIO Scenarios: Flash Sale, │
│                 Zero-Downtime Schema Migrations, Multi-Tenant SaaS)    │
│    • Full Cross-cutting Scale, Disaster Recovery & Security Strategy   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Execution Strategy & Phased Rollout

1. **Phase 1: Master Blueprint & Navigation (Foundations Initialized)**
   - Initialize `/Users/abhineshgour/learning-space/abhi-agy/interview-prep/db` directory.
   - Commit [`PLAN.md`](PLAN.md) and [`00-table-of-contents.md`](00-table-of-contents.md).
2. **Phase 2: Relational Core & Engine Foundations (`01`–`03`)**
   - Storage Engine & MVCC, Indexing & Planner Optimization, Vacuum & Wraparound Bloat.
3. **Phase 3: Transactions, Concurrency & Durability (`04`–`06`)**
   - ACID & Isolation Levels, Locking & Queues, WAL & Durability Engine.
4. **Phase 4: Distributed Systems & Scalability (`07`–`10`)**
   - Distributed Consistency & Sagas, Connection Pooling (PgBouncer), Replication & HA, Partitioning & Sharding.
5. **Phase 5: Access Patterns, Observability & Enterprise Security (`11`–`13`)**
   - Read-Write Scaling & Caching, Observability & Performance Diagnostics, Row-Level Security & Governance.
6. **Phase 6: MongoDB Production Engineering (`14`)**
   - WiredTiger Storage Engine, ESR Indexing, Write/Read Concerns, Sharding & Production Outages.
7. **Phase 7: Enterprise System Design Scenarios (`15`)**
   - RADIO System Design Scenarios: Flash-Sale Concurrency, Zero-Downtime Migrations, Multi-Tenant SaaS, Disaster Recovery.
