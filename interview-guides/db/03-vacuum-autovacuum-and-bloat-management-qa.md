# 03 — Vacuum, Autovacuum & Bloat Management

> Vacuum Process Phases, Heap-Only Tuples (HOT) Updates & `fillfactor`, Freezing & The Existential XID Wraparound Disaster, Cost-Based Vacuum Delay, Autovacuum Tuning, and Bloat Elimination (`pg_repack` vs `VACUUM FULL`).

---

## 📑 Table of Contents
1. [The Vacuum Lifecycle & Storage Mechanics](#1-the-vacuum-lifecycle--storage-mechanics)
2. [Heap-Only Tuples (HOT) & Fillfactor Optimization](#2-heap-only-tuples-hot--fillfactor-optimization)
3. [The Transaction ID (XID) Wraparound Disaster](#3-the-transaction-id-xid-wraparound-disaster)
4. [Autovacuum Architecture & High-Throughput Tuning](#4-autovacuum-architecture--high-throughput-tuning)
5. [Table & Index Bloat Remediation (`pg_repack` vs `VACUUM FULL`)](#5-table--index-bloat-remediation-pg_repack-vs-vacuum-full)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Vacuum Lifecycle & Storage Mechanics

### Q1: What are the distinct phases of a PostgreSQL `VACUUM` process, and why does a vacuum require multiple passes across indexes?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Vacuum]` `[Internals]` `[Storage]`

**Answer:**
A standard `VACUUM` (non-FULL) is an online background maintenance operation designed to reclaim space occupied by dead row versions without acquiring exclusive table locks.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        VACUUM 5-Phase Lifecycle                       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Heap Scan                                                     │
│   • Scans 8KB pages sequentially.                                      │
│   • Checks Visibility Map (skips pages marked 'all-visible').          │
│   • Collects dead tuple pointers (TIDs: page + line offset) into       │
│     maintenance_work_mem buffer.                                       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Index Vacuuming (Multi-Pass)                                  │
│   • For EVERY index on the relation:                                   │
│   • Scans B-tree / GIN leaf pages.                                     │
│   • Deletes index entries matching the collected dead TIDs.            │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Heap Vacuuming                                                │
│   • Revisits the heap pages identified in Phase 1.                     │
│   • Reclaims dead tuple payload space.                                 │
│   • Marks line pointers as UNUSED or REDIRECTED.                       │
│   • Updates Free Space Map (FSM) so future INSERTs reuse page space.   │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Freezing & Visibility Map Maintenance                         │
│   • Marks tuples older than vacuum_freeze_min_age as FROZEN.           │
│   • Sets 'all-visible' and 'all-frozen' bits in Visibility Map (_vm).  │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Truncate Empty Trailing Pages                                 │
│   • Attempts to acquire brief ACCESS EXCLUSIVE lock.                   │
│   • If trailing pages at EOF are completely empty, truncates OS file.  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Why Indexes Require a Dedicated Multi-Pass:
Unlike heap data where a page contains line pointers pointing directly to tuples, **indexes store physical TIDs `(block, offset)` in sorted leaf pages**.
Because indexes have no reverse pointers back from the heap:
1. Postgres cannot delete a dead tuple from the heap until its pointer is removed from **every single index on the table**. If it deleted the heap tuple first, an in-flight index scan would read a dangling pointer, crashing the query.
2. If `maintenance_work_mem` is too small to hold all dead TIDs from a large table (it fills up), VACUUM pauses Phase 1, executes Phase 2 (vacuuming all indexes), flushes memory, and resumes Phase 1. This causes multiple expensive scans across all indexes!

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why can't standard `VACUUM` return disk space to the OS if 80% of rows are dead?"  
*Senior Answer:* Standard `VACUUM` marks space within 8KB pages as reusable in the Free Space Map (`_fsm`), allowing future `INSERT` and `UPDATE` statements to reuse that free space without allocating new disk blocks. However, it cannot move remaining live tuples to coalesce them into earlier pages. Unless all pages at the very end (EOF) of the file become completely empty, the physical file size on the Linux filesystem remains unchanged.

---

## 2. Heap-Only Tuples (HOT) & Fillfactor Optimization

### Q2: What are Heap-Only Tuples (HOT updates), and under what exact conditions do they trigger vs fail?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[HOTUpdates]` `[Fillfactor]` `[Performance]`

**Answer:**
**Heap-Only Tuples (HOT)** is one of the most critical performance optimizations in PostgreSQL, introduced to eliminate index write amplification on update-heavy tables.

```text
Standard Non-HOT Update:
Index B-Tree:
  [Key: 1 ──► (0,1)]  AND  [Key: 1 ──► (0,2)]  <-- Must add new index entry!
Heap Page:
  Line Pointer 1 ──► [Old Tuple] (xmax=105)
  Line Pointer 2 ──► [New Tuple] (xmin=105)

HOT Update:
Index B-Tree:
  [Key: 1 ──► (0,1)]  <-- Unchanged! Points ONLY to Line Pointer 1!
Heap Page 0:
  Line Pointer 1 ──► [LP_REDIRECT ──► 2]  <-- HOT Redirect!
  Line Pointer 2 ──► [New Tuple] (xmin=105)
                     (t_infomask: HEAP_ONLY_TUPLE)
```

#### The Two Mandatory Conditions for a HOT Update:
1. **No Indexed Column is Modified:** The `UPDATE` statement must **not** modify any column that is part of *any index* on the table (including partial or expression indexes).
2. **Same-Page Space Exists:** The target 8KB data page must have enough free space (`pd_upper - pd_lower`) to hold the new tuple version.

#### How It Executes Under the Hood:
- The new tuple is written to the **same page**.
- Line Pointer 1 is transformed into an **`LP_REDIRECT`** pointer pointing to Line Pointer 2.
- The new tuple is stamped with the `HEAP_ONLY_TUPLE` flag.
- **Index B-Trees are untouched!** When an index scan looks up the row, it fetches `(0, 1)`. Reading Page 0, it follows the redirect to `(0, 2)` transparently.
- **Pruning:** When a later reader visits Page 0, it performs lightweight **single-page pruning** (`heap_page_prune`), physically removing the old dead tuple without waiting for VACUUM!

#### HOT Failure Conditions:
- If an indexed column is updated $\implies$ HOT fails.
- If the 8KB page is full $\implies$ new tuple spills to a different page $\implies$ HOT chain breaks $\implies$ all indexes must be updated.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you configure a high-write table to ensure HOT updates succeed?"  
*Senior Answer:* Lower the table’s **`fillfactor`** from default 100 to 80 or 85:
```sql
ALTER TABLE user_sessions SET (fillfactor = 80);
VACUUM FULL user_sessions; -- or pg_repack to apply to existing pages
```
A fillfactor of 80 instructs `INSERT` statements to stop filling pages once they reach 80% capacity, leaving 20% free space exclusively reserved for future HOT updates. On write-heavy tables, this reduces index write I/O by 80%+.

---

## 3. The Transaction ID (XID) Wraparound Disaster

### Q3: Explain Transaction ID (XID) wraparound. Why is it an existential threat to a PostgreSQL cluster?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual  
**Tags:** `[Wraparound]` `[XID]` `[DisasterRecovery]`

**Answer:**
PostgreSQL tracks transaction IDs (`XID`) using an unsigned **32-bit integer** (`TransactionId`), providing $2^{32} \approx 4,294,967,296$ unique IDs.

Because database instances run indefinitely, this counter inevitably overflows and **wraps around** back to 0.

```text
Modular Comparison Circle (Modulo 2^31):
                             Current XID (e.g., 2,000,000,000)
                                        ▲
                                        │
           PAST TRANSACTIONS            │          FUTURE TRANSACTIONS
           (Visible / Committed)        │          (Invisible)
          ◄─────────────────────────────┼─────────────────────────────►
          2 Billion XIDs in the Past    │    2 Billion XIDs in Future
                                        │
                                        ▼
                  Boundary Horizon (Oldest Tuple XID)
```

#### The Danger:
Postgres uses modular arithmetic: for any active transaction, the preceding **2 billion IDs** are considered "in the past" (visible), and the subsequent **2 billion IDs** are considered "in the future" (invisible).

If a table is not vacuumed for 2.1 billion transactions:
- The `xmin` of a row written 2.1 billion transactions ago suddenly rolls past the midpoint.
- The engine now interprets that row as having been written **in the future**!
- **Result:** The data silently disappears from all queries, causing catastrophic, irreversible data loss and corruption across the database!

#### The Prevention: Tuple Freezing (`HEAP_XMIN_FROZEN`):
To prevent rows from aging out, VACUUM performs **Freezing**:
- When VACUUM inspects a tuple with `xmin` older than `vacuum_freeze_min_age` (default 50M transactions), it replaces the specific 32-bit `xmin` with a special sentinel value: **`FrozenTransactionId = 2`** (or sets the `HEAP_XMIN_FROZEN` bit in `t_infomask`).
- Any tuple marked frozen is treated as permanently committed and universally older than all past, present, and future transactions. It never ages.

#### The 4-Stage Wraparound Emergency Escalation:
| Threshold Age | Action Taken by PostgreSQL | Production Impact |
| :--- | :--- | :--- |
| **`autovacuum_freeze_max_age`** (Default 200M) | Autovacuum launches aggressive, un-throttled freeze workers | High I/O consumption |
| **10 Million transactions to wraparound** | Logs severe warnings: `WARNING: database must be vacuumed within X transactions` | Alerts firing |
| **3 Million transactions to wraparound** | Refuses commands that assign new XIDs; converts all sessions to read-only | Writes fail cluster-wide |
| **0 transactions to wraparound** | **Hard Emergency Shutdown!** Refuses all connections: `FATAL: database is not accepting commands to avoid wraparound data loss` | **Total Outage** |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If Postgres enters emergency wraparound shutdown, how do you recover it?"  
*Senior Answer:* You cannot connect via standard TCP. You must log into the database host, stop the service, and start PostgreSQL in **single-user mode**:
```bash
postgres --single -D /var/lib/postgresql/data production_db
```
Inside single-user mode, execute an aggressive manual vacuum to freeze all relations:
```sql
VACUUM FREEZE ANALYZE;
```
Once complete, exit single-user mode and restart the PostgreSQL daemon normally.

---

## 4. Autovacuum Architecture & High-Throughput Tuning

### Q4: How does Autovacuum determine when to run on a table, and why do global defaults fail on large tables?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Tuning  
**Tags:** `[Autovacuum]` `[Configuration]` `[Tuning]`

**Answer:**
The Autovacuum Launcher daemon wakes up every `autovacuum_naptime` (default 1 min) and checks relation statistics in `pg_stat_user_tables`.

#### The Vacuum Trigger Threshold Formula:
Autovacuum launches a worker on a relation when:
$$\text{Dead Tuples} \ge \text{autovacuum\_vacuum\_threshold} + (\text{autovacuum\_vacuum\_scale\_factor} \times \text{Total Live Tuples})$$

#### The Default Parameter Traps:
- `autovacuum_vacuum_threshold = 50`
- `autovacuum_vacuum_scale_factor = 0.2` (20%)

#### Why Defaults Fail on Large Tables:
- **Small Table (1,000 rows):** Triggers at $50 + (0.2 \times 1000) = 250$ dead tuples. Runs quickly and safely.
- **Large Table (100,000,000 rows):** Triggers at:
  $$50 + (0.2 \times 100,000,000) = \mathbf{20,000,050 \text{ dead tuples!}}$$
- On a 100M row table, autovacuum will **not start** until 20 million dead rows accumulate!
- When it finally triggers, vacuuming 20 million dead rows takes hours, triggers massive I/O spikes, evicts buffers, and saturates disks.

#### Production Solution: Per-Table Autovacuum Tuning:
Never rely on global settings for large tables. Configure aggressive thresholds per table:
```sql
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,  -- Trigger at 1% change (1M rows)
    autovacuum_vacuum_threshold = 10000,    -- Base threshold
    autovacuum_vacuum_cost_limit = 2000,    -- Give worker higher I/O budget
    autovacuum_vacuum_cost_delay = 2        -- Reduce throttling pause
);
```

---

### Q5: How does the Cost-Based Vacuum Delay mechanism throttle Autovacuum I/O?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[VacuumCost]` `[IO]` `[Performance]`

**Answer:**
To prevent vacuuming from consuming all disk bandwidth and starving client queries, PostgreSQL uses a **token-bucket cost accounting mechanism**.

```text
Autovacuum Worker Execution Loop:
┌────────────────────────────────────────────────────────┐
│ Worker performs work:                                  │
│  • Page hit in shared_buffers   : cost += 1            │
│  • Page read from disk          : cost += 2            │
│  • Page dirtied (dead tuples)   : cost += 20           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
             Is (accumulated_cost >= cost_limit)?
             ┌──────────────┴──────────────┐
             │ YES                         │ NO
             ▼                             ▼
  Sleep for cost_delay ms           Continue working
  (Reset accumulated_cost = 0)
```

#### Cost Parameters:
- `vacuum_cost_page_hit = 1`: Reading a page already in `shared_buffers`.
- `vacuum_cost_page_miss = 2`: Reading a clean page from storage.
- `vacuum_cost_page_dirtied = 20`: Writing/dirtying a page containing dead tuples.
- `autovacuum_vacuum_cost_limit = 200` (Default in older PG; 2000 in PG 16+): The budget ceiling.
- `autovacuum_vacuum_cost_delay = 2ms` (Default): The duration the worker sleeps when budget is exhausted.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a developer sets `autovacuum_vacuum_cost_delay = 0` globally to make vacuum finish as fast as possible?"  
*Senior Answer:* Setting `cost_delay = 0` disables throttling completely. Autovacuum will consume 100% of available disk IOPS and CPU, flushing dirty pages relentlessly. In production, this causes client query latencies to spike by 500%+, exhausts connection pools, and can trigger application HTTP 504 gateway timeouts. Keep `cost_delay` non-zero, and scale up `autovacuum_vacuum_cost_limit` instead.

---

## 5. Table & Index Bloat Remediation (`pg_repack` vs `VACUUM FULL`)

### Q6: Compare `VACUUM FULL` vs `pg_repack` for eliminating massive table bloat on a 24/7 mission-critical database.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[Bloat]` `[pg_repack]` `[VacuumFull]`

**Answer:**

```text
1. VACUUM FULL Workflow:
┌──────────────────────┐
│ Table: orders (80GB) │ ──► Acquires ACCESS EXCLUSIVE lock (BLOCKS ALL READS & WRITES)
└──────────┬───────────┘
           │ Rewrites entire table into new file
           ▼
┌──────────────────────┐
│ New Table (15GB)     │ (Takes 45 mins downtime; requires 95GB total disk space)
└──────────────────────┘

2. pg_repack Online Workflow:
┌──────────────────────┐
│ Table: orders (80GB) │ ──► Normal application READS and WRITES continue!
└──────────┬───────────┘
           │ 1. Trigger logs ongoing INSERT/UPDATE/DELETE to log table
           │ 2. Concurrently builds compact new copy from snapshot
           │ 3. Replays trigger log to catch up
           │ 4. Acquires brief 200ms lock to swap relation filenodes!
           ▼
┌──────────────────────┐
│ New Table (15GB)     │ (ZERO application downtime!)
└──────────────────────┘
```

| Dimension | `VACUUM FULL` | `pg_repack` (Industry Standard) |
| :--- | :--- | :--- |
| **Lock Acquired** | **`ACCESS EXCLUSIVE`** (Blocks all `SELECT`, `INSERT`, `UPDATE`, `DELETE`) | `ACCESS SHARE` for 99% of run; brief exclusive lock at final swap |
| **Downtime Required** | **Full application downtime** for entire duration | **Zero downtime** |
| **Disk Space Overhead** | Requires free disk space equal to the table size + indexes | Requires free disk space equal to the table size + indexes |
| **Index Handling** | Rebuilds all indexes sequentially while locking table | Builds all indexes concurrently |
| **Failure Recovery** | Rolling back transaction aborts clean rewrite | Drops trigger and temp table cleanly; source table untouched |

#### Step-by-Step Production Execution with `pg_repack`:
```bash
# 1. Install extension
CREATE EXTENSION pg_repack;

# 2. Dry run check
pg_repack --dry-run -d production_db -t orders

# 3. Execute online rebuild with 2 concurrent index workers
pg_repack -h db.prod.internal -U postgres -d production_db -t orders -j 2
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: How does an uncommitted transaction in `idle in transaction` state cause cluster-wide disk bloat?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[IdleInTransaction]` `[Bloat]`

**Answer:**
An `idle in transaction` connection holds an open snapshot horizon (`backend_xmin`). Autovacuum **cannot remove any dead tuple created after that `xmin`**, across *any* table in the entire database, because that idle transaction might still need to see those tuples. Over hours, dead tuples accumulate, tables and indexes bloat, and the database approaches transaction ID wraparound. Protect against this with `idle_in_transaction_session_timeout = '5min'`.

---

### Q8: What does `VACUUM FREEZE` do compared to standard `VACUUM`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Freeze]` `[Wraparound]`

**Answer:**
A standard `VACUUM` only freezes tuples that are older than `vacuum_freeze_min_age` (default 50M transactions). `VACUUM FREEZE` sets the freeze threshold to zero, forcing Postgres to immediately freeze **every single committed tuple** on the relation regardless of age, updating the Visibility Map bit to `all-frozen`.

---

### Q9: Can Autovacuum run concurrently with an `ALTER TABLE` statement?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Locking]` `[Autovacuum]`

**Answer:**
**No.** `ALTER TABLE` requires an `ACCESS EXCLUSIVE` lock. If an autovacuum worker is currently scanning the table, `ALTER TABLE` enters a lock wait state. However, Postgres includes an automatic cancellation mechanism: if a user query or DDL needs a conflicting lock, the autovacuum worker voluntarily terminates itself (`autovacuum canceled`) to avoid blocking user traffic.

---

### Q10: How do you verify when Autovacuum last ran and whether a table is currently undergoing vacuuming?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Practical / SQL  
**Tags:** `[Monitoring]` `[SQL]`

**Answer:**
```sql
-- Check historical run timestamps:
SELECT relname, last_vacuum, last_autovacuum, autovacuum_count 
FROM pg_stat_user_tables WHERE relname = 'my_table';

-- Check active progress in real-time:
SELECT a.pid, a.phase, a.heap_blks_total, a.heap_blks_scanned, 
       round(100.0 * a.heap_blks_scanned / nullif(a.heap_blks_total, 0), 2) AS pct_complete
FROM pg_stat_progress_vacuum a;
```
