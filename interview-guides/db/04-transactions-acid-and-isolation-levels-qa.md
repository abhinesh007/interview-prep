# 04 — Transactions, ACID & Isolation Levels

> ACID Guarantees Under the Hood, ANSI SQL-92 vs PostgreSQL Reality, Concurrency Anomalies (Dirty, Fuzzy, Phantom Reads, Lost Updates), Write Skew, and Serializable Snapshot Isolation (SSI).

---

## 📑 Table of Contents
1. [ACID Mechanics Under the Hood](#1-acid-mechanics-under-the-hood)
2. [ANSI SQL-92 vs PostgreSQL Isolation Reality](#2-ansi-sql-92-vs-postgresql-isolation-reality)
3. [Concurrency Anomalies & The Write Skew Phenomenon](#3-concurrency-anomalies--the-write-skew-phenomenon)
4. [Serializable Snapshot Isolation (SSI) Internals](#4-serializable-snapshot-isolation-ssi-internals)
5. [Behavior Prediction & Production Bug Hunting](#5-behavior-prediction--production-bug-hunting)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. ACID Mechanics Under the Hood

### Q1: How does a relational database like PostgreSQL implement each of the four ACID guarantees at the engine and storage layer?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ACID]` `[Storage]` `[Transactions]`

**Answer:**
ACID is not a single feature; it is an architectural contract implemented by distinct subsystems within the database engine:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Engine Subsystems                    │
├────────────────────────────────┬───────────────────────────────────────┤
│ ACID Guarantee                 │ Underlying Engine Implementation      │
├────────────────────────────────┼───────────────────────────────────────┤
│ Atomicity ("All or Nothing")   │ • Write-Ahead Logging (WAL redo log)  │
│                                │ • Commit Status bits in pg_xact       │
│                                │ • Append-only MVCC tuple versioning   │
├────────────────────────────────┼───────────────────────────────────────┤
│ Consistency ("Invariants Hold")│ • Schema constraints (FK, UNIQUE, CHECK)│
│                                │ • Serialized transaction schedules    │
│                                │ • Transaction rollback on error       │
├────────────────────────────────┼───────────────────────────────────────┤
│ Isolation ("No Interleaving")  │ • MVCC Snapshots (xmin/xmax horizon)  │
│                                │ • Lock Manager (Row/Table locks)      │
│                                │ • SSI (SIREAD locks & cycle detection)│
├────────────────────────────────┼───────────────────────────────────────┤
│ Durability ("Committed State") │ • WAL fsync to non-volatile storage   │
│                                │ • Checkpoints flushing dirty buffers  │
│                                │ • Crash recovery redo replay          │
└────────────────────────────────┴───────────────────────────────────────┘
```

#### 1. Atomicity:
- If a transaction inserts 10 rows and crashes on row 11, the first 10 rows are **not rolled back by physically deleting them immediately**.
- Instead, Postgres writes `ABORT` for that `XID` into `pg_xact`. Because the transaction status in `pg_xact` is `ABORTED`, the `xmin` of those 10 rows marks them as dead to all other transactions. Autovacuum later cleans them up.

#### 2. Consistency:
- Enforces application invariants (e.g., account balance $\ge 0$, valid foreign key references).
- If any statement violates a constraint, PostgreSQL sets the entire transaction state to `ABORT_PENDING` (subsequent commands raise `current transaction is aborted, commands ignored until end of transaction block`), requiring an explicit `ROLLBACK`.

#### 3. Isolation:
- Prevents concurrent transactions from observing uncommitted, partial, or conflicting state through **Multi-Version Concurrency Control (MVCC)** for reads and the **Lock Manager** for writes.

#### 4. Durability:
- When a client receives a `COMMIT` acknowledgment, the database guarantees that all WAL records corresponding to that transaction have been flushed to physical, non-volatile storage using the OS `fsync()` system call.

---

## 2. ANSI SQL-92 vs PostgreSQL Isolation Reality

### Q2: How does PostgreSQL's actual implementation of Isolation Levels differ from the ANSI SQL-92 standard?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[IsolationLevels]` `[ANSISQL]` `[PostgreSQL]`

**Answer:**
The ANSI SQL-92 standard defines isolation levels based on three classical phenomena: **Dirty Read**, **Non-Repeatable Read**, and **Phantom Read**. However, PostgreSQL's implementation deviates significantly from the standard in several beneficial ways:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly (Write Skew) |
| :--- | :--- | :--- | :--- | :--- |
| **ANSI Read Uncommitted** | Permitted | Permitted | Permitted | Permitted |
| **PostgreSQL Read Uncommitted** | **PREVENTED ❌** | Permitted | Permitted | Permitted |
| **PostgreSQL Read Committed** (Default) | Prevented | **Possible** | **Possible** | **Possible** |
| **PostgreSQL Repeatable Read** | Prevented | Prevented | **PREVENTED ❌ (Exceeds ANSI!)** | **Possible (Write Skew)** |
| **PostgreSQL Serializable (SSI)** | Prevented | Prevented | Prevented | **PREVENTED ❌** |

#### Crucial Discrepancies:
1. **Read Uncommitted does not exist in Postgres:**
   - In PostgreSQL, configuring `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED` simply runs under **`READ COMMITTED`**.
   - *Reason:* Under Postgres MVCC, readers *never* read uncommitted tuples because visibility rules always require verifying transaction status in `pg_xact`. Allowing dirty reads would require deliberately writing complex code to bypass MVCC for no architectural benefit.
2. **Repeatable Read prevents Phantom Reads in Postgres:**
   - In the ANSI SQL-92 specification, `Repeatable Read` is allowed to suffer from Phantom Reads (where a range query `WHERE age > 30` sees newly inserted rows on second execution).
   - In PostgreSQL, `Repeatable Read` uses a single **transaction-level MVCC snapshot** taken at the start of the first statement. Because new inserts post-date the snapshot's `xmax`, **phantom reads are completely impossible**!
3. **Repeatable Read does NOT mean Serializable:**
   - Despite eliminating dirty, non-repeatable, and phantom reads, PostgreSQL's `Repeatable Read` still permits **Write Skew**. True serializability requires `SERIALIZABLE`.

---

## 3. Concurrency Anomalies & The Write Skew Phenomenon

### Q3: What is Write Skew? Walk through the classic "On-Call Doctors" scenario and explain why Snapshot Isolation fails to prevent it.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[WriteSkew]` `[SnapshotIsolation]` `[Anomalies]`

**Answer:**
**Write Skew** is a subtle concurrency anomaly that occurs under Snapshot Isolation (`REPEATABLE READ`). It occurs when two concurrent transactions read an overlapping set of rows, make decisions based on that data, and then modify **disjoint (non-overlapping)** rows, collectively violating an application-wide invariant.

```text
Database Invariant: "At least one doctor must remain on call at all times."
Initial State: Doctor Alice (on_call = TRUE), Doctor Bob (on_call = TRUE).

Transaction 1 (Alice requests off-call):       Transaction 2 (Bob requests off-call):
T1: BEGIN ISOLATION REPEATABLE READ;           T2: BEGIN ISOLATION REPEATABLE READ;
T3: SELECT count(*) FROM doctors               T4: SELECT count(*) FROM doctors
    WHERE on_call = TRUE;                          WHERE on_call = TRUE;
    -- Returns: 2 (Safe to go off-call!)           -- Returns: 2 (Safe to go off-call!)
T5: UPDATE doctors SET on_call = FALSE         T6: UPDATE doctors SET on_call = FALSE
    WHERE name = 'Alice';                          WHERE name = 'Bob';
T7: COMMIT;                                    T8: COMMIT;

FINAL STATE:
  Alice: on_call = FALSE
  Bob  : on_call = FALSE
  Count on call = 0  <-- INVARIANT VIOLATED!
```

#### Why Snapshot Isolation / Repeatable Read Allows This:
- Transaction 1 modified Alice's row.
- Transaction 2 modified Bob's row.
- Neither transaction modified a row that the other transaction touched. There is **no row-level lock conflict** and **no overlapping update**.
- Both transactions commit cleanly under `REPEATABLE READ`.
- Yet, no serial execution order ($T1 \to T2$ or $T2 \to T1$) could have produced this result! In a serial execution, the second doctor's transaction would have seen `count = 1` and aborted.

#### How to Prevent Write Skew in Production:
1. **Pessimistic Locking (`SELECT FOR UPDATE`):**
   Force both transactions to lock all matching rows:
   ```sql
   SELECT count(*) FROM doctors WHERE on_call = TRUE FOR UPDATE;
   ```
2. **Explicit Serializable Isolation (`SERIALIZABLE`):**
   Postgres detects the `rw-antidependency` conflict and aborts one of the transactions.

---

### Q4: Explain the Lost Update anomaly. How does PostgreSQL handle it under Read Committed vs Repeatable Read?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[LostUpdate]` `[Concurrency]`

**Answer:**
A **Lost Update** occurs when two transactions read the same initial value, compute a mutation locally in application memory, and write it back, causing the second write to overwrite the first write without incorporating its changes.

```text
Lost Update Scenario:
Initial Account Balance: $100
Transaction A wants to deposit $50. Transaction B wants to deposit $20.

T1: Tx A: SELECT balance FROM accounts WHERE id = 1; -- reads $100
T2: Tx B: SELECT balance FROM accounts WHERE id = 1; -- reads $100
T3: Tx A calculates 100 + 50 = $150.
    Tx A: UPDATE accounts SET balance = 150 WHERE id = 1; COMMIT;
T4: Tx B calculates 100 + 20 = $120.
    Tx B: UPDATE accounts SET balance = 120 WHERE id = 1; COMMIT;

FINAL BALANCE: $120! Tx A's $50 deposit was completely lost!
```

#### PostgreSQL Engine Behavior:
1. **Under Read Committed:**
   - If the update is written as an atomic in-database mutation:
     ```sql
     UPDATE accounts SET balance = balance + 50 WHERE id = 1;
     ```
     Postgres uses **EvalPlanQual (EPQ)**. Transaction B blocks until Transaction A commits, then re-reads the updated row ($150) and evaluates $150 + 20 = $170. No update is lost.
   - However, if the calculation is performed in application memory (as in ORM detached entities), the lost update *does* occur!
2. **Under Repeatable Read:**
   - Transaction B blocks at T4.
   - Once Transaction A commits, Transaction B immediately aborts with:
     `ERROR: could not serialize access due to concurrent update (40001)`.
   - The lost update is strictly prevented at the database level.

---

## 4. Serializable Snapshot Isolation (SSI) Internals

### Q5: How does Serializable Snapshot Isolation (SSI) deliver true serializability without locking reads?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual  
**Tags:** `[SSI]` `[Serializable]` `[Locks]`

**Answer:**
Historically, achieving true serializability required **Strict Two-Phase Locking (S2PL)**: acquiring shared read locks on every query and exclusive write locks on mutations, holding all locks until commit. S2PL destroys read concurrency.

PostgreSQL uses **Serializable Snapshot Isolation (SSI)** (based on the Cahill, Röhm, and Fekete algorithm). SSI is an **optimistic concurrency control mechanism** that allows reads to execute lock-free using MVCC while tracking dependencies in memory.

```text
SSI Serialization Graph Dependency Tracking:
┌─────────────────┐       rw-antidependency       ┌─────────────────┐
│ Transaction T1  │ ────────────────────────────► │ Transaction T2  │
│ Reads Doctors   │ (T1 reads row that T2 writes) │ Writes Alice    │
└────────┬────────┘                               └────────┬────────┘
         ▲                                                 │
         │                rw-antidependency                │
         └─────────────────────────────────────────────────┘
                   (T2 reads row that T1 writes)
                   
          CYCLE DETECTED: T1 ──rw──► T2 ──rw──► T1
          Postgres immediately aborts T2 as Pivot!
```

#### How SSI Works Under the Hood:
1. **SIREAD Locks:**
   - When a transaction in `SERIALIZABLE` mode reads a tuple, page, or index, Postgres places a **SIREAD lock** in shared memory.
   - **Crucial:** SIREAD locks are purely informational in-memory flags! They **never block any operation**. Readers do not block writers; writers do not block readers.
2. **Tracking `rw-antidependencies`:**
   - An `rw-antidependency` occurs when Transaction $T_1$ reads a version of data, and concurrent Transaction $T_2$ writes a newer version of that data (meaning $T_1$ logically happened *before* $T_2$).
3. **Detecting Dangerous Structures (Cycles):**
   - True serializability violations occur only when there is a **directed cycle** in the serialization graph consisting of two consecutive `rw-antidependency` edges (`T_prev ──rw──> T_pivot ──rw──> T_next`).
   - The transaction in the middle is known as the **Pivot Transaction**.
4. **Victim Abortion:**
   - As soon as Postgres detects a dangerous cycle, it terminates the pivot transaction with:
     ```text
     ERROR: could not serialize access due to read/write dependencies among transactions
     DETAIL: Reason code = Canceled on identification as a pivot, during commit attempt.
     HINT: The transaction might succeed if retried.
     SQLSTATE: 40001
     ```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the mandatory application development requirement when using Serializable isolation in PostgreSQL?"  
*Senior Answer:* **Application-level retry loops with exponential backoff and jitter are mandatory.** Because SSI is optimistic, serialization conflicts are expected under high concurrency. Any application using `SERIALIZABLE` must wrap database transactions in a retry handler catching SQLSTATE `40001`.

---

## 5. Behavior Prediction & Production Bug Hunting

### Q6: 🧩 Output Prediction: Predict the exact behavior of concurrent transactions under `REPEATABLE READ`.
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[RepeatableRead]` `[MVCC]` `[Prediction]`

**Scenario:**
Table `inventory (sku TEXT PRIMARY KEY, qty INT)` contains `('WIDGET', 10)`.

```sql
-- Initial Setup:
INSERT INTO inventory VALUES ('WIDGET', 10);

-- Interleaved Execution:
T1: Session 1: BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
T2: Session 2: BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
T3: Session 1: SELECT qty FROM inventory WHERE sku = 'WIDGET'; -- Query 1
T4: Session 2: UPDATE inventory SET qty = qty - 2 WHERE sku = 'WIDGET';
T5: Session 2: COMMIT;
T6: Session 1: SELECT qty FROM inventory WHERE sku = 'WIDGET'; -- Query 2
T7: Session 1: UPDATE inventory SET qty = qty - 3 WHERE sku = 'WIDGET'; -- Query 3
```

**Step-by-Step Prediction:**
- **At T3 (Session 1 Query 1):**  
  Returns: `qty = 10`. Session 1 establishes its transaction snapshot.
- **At T5 (Session 2 commits):**  
  Row version updated on heap: `qty = 8`.
- **At T6 (Session 1 Query 2):**  
  Returns: **`qty = 10`!**  
  *Reason:* Under `REPEATABLE READ`, Session 1 uses the static snapshot established at T3. Session 2's commit post-dates the snapshot horizon, so the update is invisible.
- **At T7 (Session 1 Query 3 UPDATE):**  
  *Result:* **`ERROR: could not serialize access due to concurrent update (SQLSTATE 40001)`!**  
  *Reason:* When Session 1 attempts to write, it discovers that the tuple at `sku = 'WIDGET'` was modified and committed by a concurrent transaction (`t_xmax` committed after Session 1's snapshot). Under `REPEATABLE READ`, it is forbidden to overwrite changes it could not see, so the transaction aborts.

---

### Q7: 🐛 Debug Scenario: An e-commerce system allowed a single discount promo code with `max_redemptions = 1` to be used 4 times concurrently. How did this happen under `READ COMMITTED`?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[RaceCondition]` `[ReadCommitted]` `[Locks]`

**Scenario:**
A checkout service executes the following code when applying a promo code:
```python
# Application logic inside a standard READ COMMITTED transaction:
def apply_promo(code, user_id):
  with db.transaction():  # READ COMMITTED
    promo = db.query(
        "SELECT times_used, max_uses FROM coupons WHERE code = :code",
        code=code,
    )
    if promo.times_used < promo.max_uses:
      # Race condition window!
      db.execute(
          "INSERT INTO coupon_redemptions (code, user_id) VALUES (:code,"
          " :user_id)",
          code=code,
          user_id=user_id,
      )
      db.execute(
          "UPDATE coupons SET times_used = times_used + 1 WHERE code = :code",
          code=code,
      )
      return True
    return False
```

#### Root Cause:
Under `READ COMMITTED`, 4 concurrent user requests read `times_used = 0` simultaneously. Each request evaluates `0 < 1` as `True`. All 4 proceed to insert a redemption and increment `times_used`, resulting in `times_used = 4`.

#### The Fixes:
1. **Fix Option 1 (Pessimistic Row Lock):**
   ```sql
   SELECT times_used, max_uses FROM coupons WHERE code = :code FOR UPDATE;
   ```
   Locks the coupon row. Subsequent concurrent requests must wait until the first transaction commits, after which they read the updated `times_used = 1` and abort.
2. **Fix Option 2 (Atomic Conditional Update):**
   ```sql
   UPDATE coupons 
   SET times_used = times_used + 1 
   WHERE code = :code AND times_used < max_uses;
   ```
   Check `rowcount`. If `rowcount == 0`, raise an error.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q8: Does `SELECT ... FOR UPDATE` read an MVCC snapshot version or the current latest row version?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ForUpdate]` `[MVCC]`

**Answer:**
`SELECT ... FOR UPDATE` fetches the **current physical row version** from the heap, not an older MVCC snapshot. If another transaction has locked or updated the row, it blocks until that transaction commits, then re-evaluates the query filter against the newly committed version.

---

### Q9: What is a Read-Only Transaction Anomaly? Can a transaction that executes ONLY `SELECT` queries fail under Serializable isolation?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[ReadOnly]` `[SSI]` `[Anomalies]`

**Answer:**
**Yes!** A transaction executing strictly `SELECT` statements can be aborted with SQLSTATE `40001` under `SERIALIZABLE`. If a read-only transaction observes a state that could not exist in any valid serial execution schedule relative to concurrent write transactions, SSI aborts the read-only transaction to preserve global serializability. (Mitigation: use `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE`).

---

### Q10: What is the difference between `SNAPSHOT` isolation and `SERIALIZABLE` isolation?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Snapshot]` `[Serializable]`

**Answer:**
Snapshot Isolation guarantees that all reads within a transaction see a consistent point-in-time snapshot, preventing dirty reads, non-repeatable reads, and phantom reads. However, Snapshot Isolation **permits Write Skew**. Serializable isolation is strictly stronger: it prevents Write Skew and guarantees that the concurrent execution is equivalent to some serial execution.
