# 06 — WAL, Checkpointing & Durability Engine

> Write-Ahead Logging (WAL) Architecture, Log Sequence Number (LSN) Mechanics, Checkpointer Process & Spreading, Full Page Writes (`full_page_writes`) & Torn Pages, Crash Recovery Redo Loop, and `synchronous_commit` Tuning.

---

## 📑 Table of Contents
1. [Write-Ahead Logging (WAL) Fundamentals & LSN Arithmetic](#1-write-ahead-logging-wal-fundamentals--lsn-arithmetic)
2. [Checkpoints & The Checkpointer Process](#2-checkpoints--the-checkpointer-process)
3. [The Torn Page Problem & Full Page Writes](#3-the-torn-page-problem--full-page-writes)
4. [Crash Recovery Mechanics & The Redo Loop](#4-crash-recovery-mechanics--the-redo-loop)
5. [Durability vs Latency Tuning (`synchronous_commit`)](#5-durability-vs-latency-tuning-synchronous_commit)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Write-Ahead Logging (WAL) Fundamentals & LSN Arithmetic

### Q1: What is Write-Ahead Logging (WAL), and what fundamental architectural rule does it enforce?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[WAL]` `[Durability]` `[Internals]`

**Answer:**
Write-Ahead Logging (WAL) is the core storage engine mechanism that guarantees **Durability (the D in ACID)** and **Atomicity** while maintaining high write throughput.

```text
The Fundamental WAL Rule:
┌────────────────────────────────────────────────────────┐
│ Client executes UPDATE / INSERT                        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
      1. MUST write changes to WAL buffer / disk FIRST!
      ┌──────────────────────────────────────────────────┐
      │ WAL Stream (pg_wal/)                             │
      └─────────────────────┬────────────────────────────┘
                            │ ONLY AFTER WAL IS FLUSHED
                            ▼
      2. Data page in shared_buffers is marked "dirty"   │
      (May stay in memory for minutes before disk flush) │
```

#### The Golden Rule of WAL:
> **"No data page from `shared_buffers` may be written to disk until the WAL records describing the changes to that page have been flushed to non-volatile storage (`fsync`)."**

#### Why Databases Use WAL Instead of Direct Page Writes:
1. **Random vs Sequential I/O:** Writing 8KB heap and index pages directly to disk for every transaction requires expensive **random disk I/O** across thousands of scattered file blocks.
2. **Sequential Append:** WAL is an append-only stream of compact binary change records written **sequentially**. Sequential writes achieve the maximum throughput of NVMe or magnetic storage controllers.
3. **Delayed Heap Flushing:** By guaranteeing durability in the sequential WAL stream, PostgreSQL can keep modified data pages in `shared_buffers` for minutes, batching thousands of writes before flushing them to data files.

---

### Q2: What is a Log Sequence Number (LSN)? How does PostgreSQL use LSN arithmetic to coordinate replication and crash recovery?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[LSN]` `[WAL]` `[Replication]`

**Answer:**
A **Log Sequence Number (LSN)** is a **64-bit integer** representing the exact, unique byte position in the PostgreSQL WAL stream. It is represented in SQL and logs as two hexadecimal numbers separated by a slash:

$$\mathbf{LSN} = \text{FileOffsetHigh} \,/\, \text{FileOffsetLow} \quad (\text{e.g., } \texttt{16/B3748})$$

```text
PostgreSQL Global WAL Stream:
0x00000000 ────────────────────────────────────────────────────────► 0xFFFFFFFFFFFFFFFF
            │                       │
      LSN 0/16B3748           LSN 0/16B4000
      (Transaction Commit A)  (Transaction Commit B)
```

#### How LSNs Drive Recovery & Consistency:
1. **The Page `pd_lsn` Check:**
   - Every 8KB data page header stores a field named `pd_lsn`, which records the LSN of the last WAL record that modified that specific page.
   - During crash recovery, Postgres compares the LSN of a WAL record with the page’s `pd_lsn`. If $\text{record\_lsn} \le \text{page.pd\_lsn}$, the change is already present on disk and is **skipped**. This guarantees **recovery idempotency**.
2. **Measuring Replication Lag with LSN Arithmetic:**
   - Because LSNs are byte offsets, subtracting two LSNs yields the exact number of bytes of replication lag:
     ```sql
     SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_in_bytes
     FROM pg_stat_replication;
     ```

---

## 2. Checkpoints & The Checkpointer Process

### Q3: What happens during a PostgreSQL Checkpoint, and how does "Checkpoint Spreading" prevent I/O spikes?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Checkpoints]` `[IO]` `[Performance]`

**Answer:**
A **Checkpoint** is a known safe recovery point in the transaction log. Its primary objective is to advance the database recovery horizon so that older WAL segments in `$PGDATA/pg_wal` can be deleted or recycled.

```text
Checkpoint Execution Flow:
1. Identify all dirty buffers in shared_buffers at checkpoint start time.
2. Flush those dirty buffers to disk sequentially.
3. Call fsync() on all modified data files.
4. Write a special CHECKPOINT WAL record containing the REDO LSN.
5. Update $PGDATA/global/pg_control with the latest checkpoint metadata.
6. Recycle or remove WAL segment files older than the REDO LSN.
```

#### What Triggers a Checkpoint?
1. **Time-Based:** `checkpoint_timeout` (default 5 minutes).
2. **Volume-Based:** `max_wal_size` (default 1GB, typically tuned to 32GB–64GB on production systems).
3. **Manual Command:** `CHECKPOINT;`.

#### Checkpoint Spreading (`checkpoint_completion_target`):
- **The Problem:** If a checkpoint attempts to flush 50,000 dirty pages (400MB) immediately, disk I/O saturates to 100%, causing foreground application queries to freeze (**checkpoint stalls**).
- **The Solution:** The Checkpointer process **spreads** the disk writes over time based on `checkpoint_completion_target` (default `0.9` in modern PG):
  $$\text{Checkpoint Duration} = \text{checkpoint\_timeout} \times \text{checkpoint\_completion\_target}$$
  With `checkpoint_timeout = 15min` and `checkpoint_completion_target = 0.9`, the checkpointer spreads the writes smoothly across $15 \times 0.9 = 13.5$ minutes, keeping disk I/O flat and predictable!

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What does the log message `LOG: checkpoints are occurring too frequently` mean?"  
*Senior Answer:* It indicates that checkpoints are being triggered by **volume** (`max_wal_size`) rather than by time (`checkpoint_timeout`). The database is writing WAL faster than `max_wal_size` allows, forcing un-spread, aggressive checkpoints that spike disk I/O. To fix it, increase `max_wal_size` (e.g., from 1GB to 32GB or 64GB).

---

## 3. The Torn Page Problem & Full Page Writes

### Q4: What is a "Torn Page"? How does `full_page_writes` protect against it, and what is its write amplification cost?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[FullPageWrites]` `[TornPages]` `[CrashRecovery]`

**Answer:**

```text
The Torn Page Dilemma:
Postgres Block Size: 8192 bytes (8KB)
OS / Hardware Sector Write: 4096 bytes (4KB)

Power Loss or OS Crash Occurs Mid-Write!
┌────────────────────────────────┬────────────────────────────────┐
│ 4KB Sector 1: Written Cleanly  │ 4KB Sector 2: OLD CORRUPT DATA │
└────────────────────────────────┴────────────────────────────────┘
RESULT: The 8KB page is partially overwritten (a TORN PAGE)!
Standard delta WAL records (e.g. "+5 to column X") cannot be replayed on corrupt bytes!
```

#### The Engine Solution: Full Page Writes (`full_page_writes = on`):
1. Immediately after a checkpoint completes, PostgreSQL tracks which pages have been modified.
2. The **very first time an 8KB data page is modified** following a checkpoint, PostgreSQL writes a **complete, byte-for-byte 8KB copy of the entire page into the WAL stream** (a Full Page Image - FPI).
3. Subsequent modifications to that same page write only tiny delta WAL records (e.g., 50 bytes) until the *next* checkpoint occurs.

#### How It Recovers from a Torn Page:
If the database crashes and leaves a torn page on disk:
- Crash recovery encounters the Full Page Image in WAL.
- It **completely overwrites the torn page on disk** with the pristine 8KB image from WAL!
- Subsequent delta WAL records are then replayed on top of the restored page cleanly.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the primary operational penalty of `full_page_writes`?"  
*Senior Answer:* **Massive WAL Write Amplification immediately following a checkpoint.** If you have 100,000 active pages, the first wave of updates after a checkpoint writes $100,000 \times 8\text{KB} \approx 800\text{MB}$ of raw page images into WAL in seconds. This is why checkpoints should be spaced out (e.g., `checkpoint_timeout = 15min` to `30min`) rather than running every 1–2 minutes. Never disable `full_page_writes` unless your filesystem guarantees atomic 8KB writes (e.g., ZFS with copy-on-write).

---

## 4. Crash Recovery Mechanics & The Redo Loop

### Q5: Walk through the exact step-by-step sequence of events when PostgreSQL restarts after an abrupt power failure (`SIGKILL`).
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[CrashRecovery]` `[Redo]` `[pg_control]`

**Answer:**
When the PostgreSQL server boots up, it detects that the database was not shut down cleanly by inspecting the **`$PGDATA/global/pg_control`** file.

```text
Crash Recovery 4-Step Sequence:
┌────────────────────────────────────────────────────────┐
│ 1. Read $PGDATA/global/pg_control                      │
│    • Status: "in production" (dirty shutdown detected) │
│    • Find LSN of the latest valid Checkpoint Record.   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Read Checkpoint Record from WAL                     │
│    • Extract the REDO LSN (the oldest un-flushed buffer│
│      when that checkpoint began).                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Forward REDO Scan (The Replay Loop)                 │
│    • Scan WAL forward from REDO LSN to end of WAL.     │
│    • For each record:                                  │
│      Read target data page.                            │
│      IF record.lsn > page.pd_lsn:                      │
│         Apply WAL change! Update page.pd_lsn.          │
│      ELSE:                                             │
│         Skip record (already on disk).                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Completion & Normal Startup                         │
│    • Write new shutdown checkpoint record.             │
│    • Update pg_control status to "shut down".          │
│    • Accept incoming client connections on port 5432!  │
└────────────────────────────────────────────────────────┘
```

#### Why Undo Logging is Not Required in PostgreSQL:
Unlike Oracle or MySQL InnoDB (which use Rollback Segments or Undo Logs to reverse uncommitted transactions during crash recovery), **PostgreSQL does NOT need an Undo phase!**
- Because Postgres uses append-only MVCC, uncommitted transactions simply left dead tuple versions on disk with `xmin` set to their `XID`.
- During crash recovery, those transactions are marked as `ABORTED` in `pg_xact`.
- When the database opens, MVCC visibility rules treat those tuples as dead, and VACUUM later cleans them up.

---

## 5. Durability vs Latency Tuning (`synchronous_commit`)

### Q6: What are the performance and data loss trade-offs of the 5 levels of `synchronous_commit`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Tuning  
**Tags:** `[SynchronousCommit]` `[Performance]` `[Durability]`

**Answer:**
The `synchronous_commit` parameter controls when the PostgreSQL backend returns a `SUCCESS` acknowledgment to the client application following a `COMMIT` statement:

| `synchronous_commit` Level | When is `COMMIT` Acknowledged? | Write Latency | Potential Data Loss on Crash? |
| :--- | :--- | :--- | :--- |
| **`off`** (Asynchronous) | WAL written to memory buffer (`wal_buffers`); flushed to disk in background | **Lowest (~0.2ms)** | Up to $3 \times \text{wal\_writer\_delay}$ (~600ms) of recent transactions |
| **`local`** | WAL flushed to **local disk** via `fsync()` | Low (~2–5ms) | **Zero data loss on local server crash** |
| **`remote_write`** | Standby replica has received WAL into OS memory buffer | Medium (Network RTT) | Survives local disk crash; lost if both primary & standby lose power |
| **`on`** (Default) | Standby replica has written and **flushed WAL to disk** | Medium/High | Survives power loss on primary |
| **`remote_apply`** | Standby replica has **applied WAL to its data pages** | Highest | **Guarantees zero replication lag for read-after-write consistency** |

#### When to Use Asynchronous Commit (`synchronous_commit = off`):
- You can toggle this per session or per transaction:
  ```sql
  BEGIN;
  SET LOCAL synchronous_commit = off;
  INSERT INTO audit_logs VALUES (...);
  COMMIT;
  ```
- **Crucial Invariant:** `synchronous_commit = off` **does NOT cause data corruption**. It only risks losing the last few milliseconds of transactions if the OS abruptly loses power. Database consistency (foreign keys, indexes, invariants) is 100% preserved.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What happens if the disk hosting `$PGDATA/pg_wal` fills up completely to 100%?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[DisasterRecovery]` `[DiskFull]`

**Answer:**
PostgreSQL immediately panics and enters an emergency read-only / shutdown state: `PANIC: could not write to log file: No space left on device`.
**The Trap:** Do **NOT** manually run `rm -rf pg_wal/*`! Deleting active WAL files permanently destroys the transaction redo log and corrupts the database.
**Recovery:** Mount temporary storage, expand the disk volume, or move old archived WAL files out of `pg_wal` to temporary storage.

---

### Q8: What does the `checkpoint_timeout` parameter control?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Checkpoints]` `[Configuration]`

**Answer:**
It specifies the maximum time between automatic WAL checkpoints (default `5min`). Increasing it to `15min` or `30min` reduces disk I/O write amplification at the expense of increasing recovery time after an unexpected crash.

---

### Q9: Can an `INSERT` statement modify a data file directly without writing to WAL?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[UnloggedTables]` `[WAL]`

**Answer:**
**Yes, if inserting into an `UNLOGGED TABLE`** (`CREATE UNLOGGED TABLE staging_data (...)`). Unlogged tables bypass the WAL stream completely, achieving 2x–3x faster write performance. However, they are not crash-safe: upon unexpected server reboot, unlogged tables are automatically truncated to zero rows.
