# 05 — Locking Mechanisms & Concurrency Control

> PostgreSQL Lock Hierarchy (Table Locks & Row Locks), Explicit Locking (`FOR UPDATE`, `FOR NO KEY UPDATE`), Lock-Free Queueing with `SKIP LOCKED`, Advisory Locks (`pg_advisory_lock`), Deadlock Detection, and Lock Contention Diagnostics.

---

## 📑 Table of Contents
1. [The PostgreSQL Lock Hierarchy (Table & Row Locks)](#1-the-postgresql-lock-hierarchy-table--row-locks)
2. [Explicit Row Locking & Job Queueing (`SKIP LOCKED`)](#2-explicit-row-locking--job-queueing-skip-locked)
3. [Advisory Locks (`pg_advisory_lock`)](#3-advisory-locks-pg_advisory_lock)
4. [Deadlock Detection & Resolution Engine](#4-deadlock-detection--resolution-engine)
5. [Lock Contention Diagnosis & The Unindexed Foreign Key Trap](#5-lock-contention-diagnosis--the-unindexed-foreign-key-trap)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The PostgreSQL Lock Hierarchy (Table & Row Locks)

### Q1: Detail the PostgreSQL Table Lock hierarchy. Which locks conflict with each other?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Locking]` `[TableLocks]` `[Internals]`

**Answer:**
PostgreSQL defines **8 distinct table-level lock modes**. Even when a query modifies only a single row, the database engine acquires a table-level lock to ensure concurrent operations (such as `DROP TABLE` or `ALTER TABLE`) do not alter the table schema out from underneath the running query.

```text
Table Lock Strength Hierarchy (Weakest ──► Strongest):
ACCESS SHARE ──► ROW SHARE ──► ROW EXCLUSIVE ──► SHARE UPDATE EXCL ──► SHARE ──► SHARE ROW EXCL ──► EXCLUSIVE ──► ACCESS EXCLUSIVE
```

#### Table Lock Conflict Matrix:
| Lock Mode | Acquired By | Conflicts With |
| :--- | :--- | :--- |
| **`ACCESS SHARE`** | `SELECT` | `ACCESS EXCLUSIVE` |
| **`ROW SHARE`** | `SELECT ... FOR UPDATE / FOR SHARE` | `EXCLUSIVE`, `ACCESS EXCLUSIVE` |
| **`ROW EXCLUSIVE`** | `INSERT`, `UPDATE`, `DELETE` | `SHARE`, `SHARE ROW EXCL`, `EXCLUSIVE`, `ACCESS EXCL` |
| **`SHARE UPDATE EXCLUSIVE`** | `VACUUM` (plain), `ANALYZE`, `CREATE INDEX CONCURRENTLY` | `SHARE UPDATE EXCL`, `SHARE`, `SHARE ROW EXCL`, `EXCLUSIVE`, `ACCESS EXCL` |
| **`SHARE`** | `CREATE INDEX` (non-concurrent) | `ROW EXCL`, `SHARE UPDATE EXCL`, `SHARE ROW EXCL`, `EXCLUSIVE`, `ACCESS EXCL` |
| **`SHARE ROW EXCLUSIVE`** | Rare (e.g., `CREATE TRIGGER`) | `ROW EXCL`, `SHARE UPDATE EXCL`, `SHARE`, `SHARE ROW EXCL`, `EXCLUSIVE`, `ACCESS EXCL` |
| **`EXCLUSIVE`** | `REFRESH MATERIALIZED VIEW CONCURRENTLY` | All except `ACCESS SHARE` |
| **`ACCESS EXCLUSIVE`** | `ALTER TABLE`, `DROP TABLE`, `TRUNCATE`, `VACUUM FULL`, `REINDEX` | **ALL LOCKS** (Blocks all reads and writes!) |

#### Key Takeaway for Architects:
- Normal `SELECT` queries acquire `ACCESS SHARE`.
- Normal `INSERT`, `UPDATE`, `DELETE` queries acquire `ROW EXCLUSIVE`.
- Notice that `ACCESS SHARE` and `ROW EXCLUSIVE` **do not conflict**! That is why reads never block writes and writes never block reads in PostgreSQL.
- Only operations requiring `SHARE` or above (e.g., non-concurrent index creation, DDL changes) conflict with user DML.

---

### Q2: What is the difference between `FOR UPDATE` and `FOR NO KEY UPDATE`? Why is `FOR NO KEY UPDATE` critical for foreign key concurrency?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[RowLocks]` `[ForeignKey]` `[Performance]`

**Answer:**
PostgreSQL supports **4 row-level lock modes**:

```text
Row Lock Conflict Matrix:
                      FOR KEY SHARE   FOR SHARE   FOR NO KEY UPDATE   FOR UPDATE
FOR KEY SHARE               -             -               -               X
FOR SHARE                   -             -               X               X
FOR NO KEY UPDATE           -             X               X               X
FOR UPDATE                  X             X               X               X
```

#### 1. `FOR UPDATE` (Exclusive Lock):
- Locks the row exclusively.
- Blocks *all* concurrent row-level locks, including `FOR KEY SHARE`.
- **Foreign Key Impact:** When a child table references a parent row (e.g., `orders.customer_id ──► customers.id`), inserting into `orders` requires acquiring a `FOR KEY SHARE` lock on the parent customer row to guarantee the customer is not deleted.
- If a background job locks the customer row using `SELECT ... FOR UPDATE`, **all child order inserts for that customer are blocked**!

#### 2. `FOR NO KEY UPDATE` (Weaker Exclusive Lock):
- Used when updating non-primary-key / non-foreign-key columns (e.g., updating `email` or `status` when the primary key is `id`).
- Crucially: **`FOR NO KEY UPDATE` conflicts with other updates, but does NOT conflict with `FOR KEY SHARE`!**
- *Result:* Child table `INSERT` operations referencing the parent record can proceed concurrently without stalling!

```sql
-- High-concurrency best practice:
SELECT * FROM customers WHERE id = 42 FOR NO KEY UPDATE;
-- Concurrent child inserts into orders (customer_id = 42) SUCCEED immediately!
```

---

## 2. Explicit Row Locking & Job Queueing (`SKIP LOCKED`)

### Q3: How do you implement a production-grade, lock-free distributed job queue in PostgreSQL using `FOR UPDATE SKIP LOCKED`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[JobQueue]` `[SkipLocked]` `[HighConcurrency]`

**Answer:**
Historically, using a relational database as a message queue caused severe lock contention because multiple worker threads competing for the next pending job would block on the same row.

PostgreSQL 9.5+ solved this by introducing **`SKIP LOCKED`**.

```text
Workers Competing for Jobs:
Job Queue Table:
  Row 1 (Job A, status='PENDING') <── Locked by Worker 1
  Row 2 (Job B, status='PENDING') <── Locked by Worker 2
  Row 3 (Job C, status='PENDING') <── Worker 3 SKIPS 1 & 2, claims Row 3 instantly!
```

#### Production Queue Implementation:
```sql
-- Claim next available job atomically without blocking other workers:
WITH next_job AS (
    SELECT id 
    FROM background_tasks 
    WHERE status = 'PENDING' 
      AND scheduled_at <= NOW()
    ORDER BY priority DESC, id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE background_tasks
SET status = 'PROCESSING',
    locked_by = pg_backend_pid(),
    started_at = NOW()
FROM next_job
WHERE background_tasks.id = next_job.id
RETURNING background_tasks.*;
```

#### Why This Pattern Outperforms Alternatives:
1. **Zero Thread Contention:** If 50 worker processes execute this query simultaneously, each worker skips the rows locked by others and claims a distinct job in parallel.
2. **Crash Resilience:** If a worker process crashes or loses network connectivity mid-job, its database connection closes. PostgreSQL **automatically releases the row lock**, allowing another worker to immediately pick up the task without needing complex zombie-reaper crons.
3. **No Polling Sleep Collisions:** Pair this with PostgreSQL's native `LISTEN / NOTIFY` to wake workers instantly upon job insertion.

---

## 3. Advisory Locks (`pg_advisory_lock`)

### Q4: What are PostgreSQL Advisory Locks? How do you use them to elect a single leader among 100 application pods?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[AdvisoryLocks]` `[LeaderElection]` `[DistributedSystems]`

**Answer:**
**Advisory Locks** are application-defined distributed locks managed by PostgreSQL's shared memory lock table. Unlike row or table locks, advisory locks have **no table or tuple association**; they lock an abstract 64-bit integer (or two 32-bit integers) defined by application code.

#### Two Scopes of Advisory Locks:
1. **Session-Level (`pg_advisory_lock(key)`):** Held until the client connection disconnects or explicitly calls `pg_advisory_unlock(key)`. **Caution:** In PgBouncer transaction pooling mode, session advisory locks leak across clients!
2. **Transaction-Level (`pg_advisory_xact_lock(key)`):** Automatically released when the active transaction commits or rolls back (`COMMIT` / `ROLLBACK`). Fully compatible with PgBouncer transaction pooling.

#### Distributed Leader Election / Singleton Cron Implementation:
```sql
-- Non-blocking attempt to acquire lock key 8492019:
SELECT pg_try_advisory_xact_lock(8492019) AS is_leader;
```

```python
# Application logic for singleton scheduled task:
def run_nightly_reconciliation(db_session):
  with db_session.begin():
    # Attempt to acquire transaction advisory lock without blocking:
    result = db_session.execute(
        text("SELECT pg_try_advisory_xact_lock(8492019)")
    ).scalar()

    if not result:
      print("Another pod is currently running reconciliation. Skipping.")
      return

    print("Lock acquired! Executing singleton reconciliation job...")
    process_reconciliation()
    # Lock is automatically released at the end of the transaction block!
```

---

## 4. Deadlock Detection & Resolution Engine

### Q5: How does the PostgreSQL Deadlock Detection engine work? What causes a deadlock, and how is it resolved?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Deadlock]` `[LockWaitGraph]` `[Internals]`

**Answer:**
A **Deadlock** occurs when two or more transactions hold locks that the others need, creating a circular wait dependency where no transaction can proceed.

```text
Deadlock Cycle:
Transaction A holds Lock 1, waits for Lock 2.
Transaction B holds Lock 2, waits for Lock 1.

┌─────────────────┐        waits for Lock 2        ┌─────────────────┐
│  Transaction A  │ ─────────────────────────────► │  Transaction B  │
└─────────────────┘                                └─────────────────┘
         ▲                                                  │
         │                 waits for Lock 1                 │
         └──────────────────────────────────────────────────┘
```

#### The Detection Algorithm:
1. When a transaction requests a lock and is blocked, it does **not** check for deadlocks immediately (deadlock checks are computationally expensive graph traversals).
2. It sleeps for the duration of **`deadlock_timeout`** (default: `1000ms` / 1 second).
3. If still blocked when the timer expires, the backend wakes up and triggers a **directed cycle detection** on the global lock wait graph in shared memory.
4. If a cycle is detected:
   - Postgres selects one transaction as the **deadlock victim**.
   - It aborts the victim transaction, rolling back its changes and raising:
     ```text
     ERROR: deadlock detected
     DETAIL: Process 14023 waits for ShareLock on transaction 8491; blocked by process 14024.
             Process 14024 waits for ShareLock on transaction 8490; blocked by process 14023.
     HINT: See server log for query details.
     SQLSTATE: 40P01
     ```
   - The un-aborted transaction immediately acquires its lock and continues.

#### The Three Golden Rules to Eliminate Deadlocks:
1. **Consistent Lock Ordering:** Always lock records in deterministic order (e.g., sort primary keys ascending before locking):
   ```sql
   -- BAD: Tx A locks ID 1 then 2; Tx B locks ID 2 then 1
   -- GOOD: Both sort IDs [1, 2] and lock in the exact same order!
   ```
2. **Lock Parent Before Child:** Always lock parent entities before inserting or updating child entities.
3. **Use Short Lock Timeouts:** Set `SET lock_timeout = '3s'` so queries fail fast rather than stalling application threads.

---

## 5. Lock Contention Diagnosis & The Unindexed Foreign Key Trap

### Q6: 🐛 Debug Scenario: Why did deleting a row from a parent table freeze all inserts on the child table? The Unindexed Foreign Key Trap.
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ForeignKey]` `[LockEscalation]` `[ProductionOutage]`

**Scenario:**
A DBA executes `DELETE FROM customers WHERE id = 999;`. Suddenly, thousands of concurrent orders being inserted by users stall and time out.

#### The Culprit:
The child table `orders` has a foreign key referencing `customers`:
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC
);
-- Notice: NO INDEX ON orders(customer_id)!
```

#### Under the Hood:
1. When a row in `customers` is deleted or its primary key is updated, PostgreSQL must verify whether any referencing rows exist in `orders`.
2. Because there is **no index on `orders(customer_id)`**, Postgres cannot perform a fast index lookup.
3. It is forced to acquire a **`SHARE ROW EXCLUSIVE` lock on the ENTIRE `orders` table** while it scans the child table!
4. Referring to the Table Lock Conflict Matrix: `SHARE ROW EXCLUSIVE` conflicts directly with `ROW EXCLUSIVE` (the lock acquired by every `INSERT INTO orders`).
5. **Result:** The entire child table is locked against all writes!

#### The Fix:
Always index foreign key columns on child tables:
```sql
CREATE INDEX CONCURRENTLY idx_orders_customer_id ON orders (customer_id);
```
With the index in place, Postgres acquires only a lightweight row lock on matching child rows instead of locking the entire table.

---

### Q7: Write the diagnostic SQL query to detect active lock contention and blocked queries in real time.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / SQL  
**Tags:** `[Diagnostics]` `[pg_locks]` `[Monitoring]`

**Answer:**
```sql
SELECT blocked_locks.pid                  AS blocked_pid,
       blocked_activity.usename           AS blocked_user,
       blocking_locks.pid                 AS blocking_pid,
       blocking_activity.usename          AS blocking_user,
       blocked_activity.query             AS blocked_statement,
       blocking_activity.query            AS blocking_statement,
       now() - blocked_activity.query_start AS waiting_duration
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
 AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
 AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
 AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
 AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
 AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
 AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
 AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
 AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
 AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
 AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity 
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q8: What is the difference between `pg_cancel_backend(pid)` and `pg_terminate_backend(pid)`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Administration]` `[Troubleshooting]`

**Answer:**
- `pg_cancel_backend(pid)`: Sends a `SIGINT` to the backend process. It gracefully cancels the *currently executing query*, but leaves the database connection and transaction alive.
- `pg_terminate_backend(pid)`: Sends a `SIGTERM` to the backend process. It forcefully **kills the entire OS process**, tearing down the connection, releasing all held locks, and rolling back active transactions.

---

### Q9: Why should every data migration script set `lock_timeout` before issuing DDL?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / BestPractices  
**Tags:** `[Migrations]` `[LockTimeout]`

**Answer:**
If an `ALTER TABLE` cannot acquire an `ACCESS EXCLUSIVE` lock immediately because a background reader is scanning the table, the `ALTER TABLE` enters the lock queue. **All subsequent queries are queued behind the DDL**, quickly causing connection pool exhaustion and site outages. Setting `SET lock_timeout = '2s'` ensures the migration fails fast and rolls back safely if the lock cannot be acquired within 2 seconds.

---

### Q10: What is `NOWAIT` in `SELECT ... FOR UPDATE NOWAIT`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[NoWait]` `[RowLocks]`

**Answer:**
`NOWAIT` instructs PostgreSQL not to wait if the target row is already locked by another transaction. Instead of blocking, it immediately raises an exception: `ERROR: could not obtain lock on row in relation "my_table" (SQLSTATE 55P03)`.
