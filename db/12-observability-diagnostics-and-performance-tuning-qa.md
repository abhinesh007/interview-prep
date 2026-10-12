# 12 — Observability, Diagnostics & Performance Tuning

> Query Plan Dissection with `EXPLAIN (ANALYZE, BUFFERS)`, Top Bottleneck Profiling via `pg_stat_statements`, Real-Time Wait Events (`Lock`, `IO`, `LWLock`), Engine Memory Sizing (`shared_buffers`, `work_mem` Multiplier Trap), and Modern `pg_stat_io`.

---

## 📑 Table of Contents
1. [Query Plan Dissection: `EXPLAIN (ANALYZE, BUFFERS)`](#1-query-plan-dissection-explain-analyze-buffers)
2. [Query Profiling with `pg_stat_statements`](#2-query-profiling-with-pg_stat_statements)
3. [Wait Events & Real-Time Engine Diagnostics](#3-wait-events--real-time-engine-diagnostics)
4. [Memory Architecture & Engine Tuning Parameters](#4-memory-architecture--engine-tuning-parameters)
5. [Modern PostgreSQL 15–17+ Observability (`pg_stat_io`)](#5-modern-postgresql-1517-observability-pg_stat_io)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Query Plan Dissection: `EXPLAIN (ANALYZE, BUFFERS)`

### Q1: Why is plain `EXPLAIN` insufficient for performance tuning? Walk through how to interpret an `EXPLAIN (ANALYZE, BUFFERS)` execution plan.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / QueryAnalysis  
**Tags:** `[ExplainAnalyze]` `[Buffers]` `[Performance]`

**Answer:**
Plain `EXPLAIN` only shows what the **Cost-Based Optimizer estimates will happen**. It does not execute the query, does not measure actual execution duration, and reveals nothing about disk vs memory buffer usage.

`EXPLAIN (ANALYZE, BUFFERS)` **actually runs the query** inside a rollback-safe transaction, measuring precise wall-clock time and memory buffer statistics.

```text
Sample EXPLAIN (ANALYZE, BUFFERS) Output:
Sort  (cost=12500.20..12750.20 rows=100000 width=72) (actual time=42.120..48.340 rows=100000 loops=1)
  Sort Method: external merge  Disk: 16384kB   <-- DISK SPILL DETECTED!
  Buffers: shared hit=4210 read=12500 dirtied=25, temp read=2048 written=2048
  ->  Index Scan using idx_orders_status on orders  (cost=0.42..4210.50 rows=100000 width=72)
                                                    (actual time=0.045..22.100 rows=100000 loops=1)
        Buffers: shared hit=4210 read=12500
Planning Time: 0.245 ms
Execution Time: 52.410 ms
```

#### How to Dissect Critical Metrics:
1. **Actual Time vs Cost:**
   - `cost=12500.20..12750.20`: Estimated startup cost (time to first row) and total cost.
   - `actual time=42.120..48.340`: Exact time in milliseconds when the first and last row were produced.
   - `loops=1`: Number of times this node executed (critical in nested loops!). If `loops=50`, multiply actual time by 50 to get total node duration.
2. **Buffer Statistics (`BUFFERS`):**
   - `shared hit`: 8KB pages found directly in RAM (`shared_buffers`). Instant memory hit.
   - `shared read`: 8KB pages that had to be read from disk or the OS page cache. High `shared read` indicates disk I/O bottlenecks.
   - `shared dirtied`: Pages modified by this query.
3. **Temp Buffers & Spills (`temp read / written`):**
   - `Sort Method: external merge Disk: 16384kB`: Indicates that the sort operation exceeded `work_mem` and spilled 16MB of data to temporary disk files! Raising `work_mem` allows the sort to execute in RAM (`Sort Method: quicksort`).

---

## 2. Query Profiling with `pg_stat_statements`

### Q2: How do you configure and query `pg_stat_statements` to identify the top 10 most damaging queries in production?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / SQL  
**Tags:** `[pg_stat_statements]` `[Monitoring]` `[DBA]`

**Answer:**
`pg_stat_statements` is the single most valuable extension for PostgreSQL observability. It tracks execution statistics of all SQL statements executed across the cluster, normalizing queries (replacing literal constants with parameter placeholders).

#### Configuration (`postgresql.conf`):
```text
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

#### Diagnostic Query 1: Top Queries by Total CPU / Execution Time:
```sql
SELECT queryid,
       substr(query, 1, 80) AS query_snippet,
       calls,
       round(total_exec_time::numeric, 2) AS total_ms,
       round(mean_exec_time::numeric, 2)  AS avg_ms,
       round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

#### Diagnostic Query 2: Queries Causing the Highest Disk Reads (Cache Misses):
```sql
SELECT queryid,
       substr(query, 1, 80) AS query_snippet,
       calls,
       shared_blks_read,
       shared_blks_hit
FROM pg_stat_statements
ORDER BY shared_blks_read DESC
LIMIT 10;
```
If a query has low `cache_hit_pct` (<90%), it is continuously thrashing `shared_buffers` and forcing random disk I/O. Adding an index or increasing `shared_buffers` is the remediation.

---

## 3. Wait Events & Real-Time Engine Diagnostics

### Q4: How do you interpret PostgreSQL Wait Events in `pg_stat_activity` to diagnose active bottlenecks?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[WaitEvents]` `[pg_stat_activity]` `[Performance]`

**Answer:**
When a PostgreSQL query takes longer than expected, checking `pg_stat_activity` reveals what resource the backend is currently blocked on via `wait_event_type` and `wait_event`.

```text
Active Query Wait Event Classification:
┌────────────────────────────────────────────────────────┐
│ pg_stat_activity (wait_event_type)                     │
├─────────────────┬──────────────────────────────────────┤
│ Lock            │ Blocked on heavyweight DB lock       │
│ IO              │ Blocked on disk read / write / sync  │
│ LWLock          │ Light-weight lock contention in RAM  │
│ IPC             │ Waiting for parallel workers/shm     │
│ Client          │ Idle connection waiting for network  │
└─────────────────┴──────────────────────────────────────┘
```

#### Key Wait Events Decoded:
1. **`wait_event_type = 'Lock'` (`wait_event = 'relation'` or `'tuple'`):**
   - Query is blocked waiting for another transaction to release a table or row lock.
   - *Remediation:* Query `pg_locks` to find the blocking PID and terminate it.
2. **`wait_event_type = 'IO'` (`wait_event = 'DataFileRead'` or `'WALSync'`):**
   - `DataFileRead`: Disk subsystem cannot keep up with reading 8KB pages into memory.
   - `WALSync`: Commit latency is throttled by storage `fsync` flush speed. Storage IOPS are saturated.
3. **`wait_event_type = 'LWLock'` (`wait_event = 'WALBufMapping'` or `'buffer_mapping'`):**
   - High concurrency contention on shared memory data structures. Too many backends are trying to allocate or look up pages in `shared_buffers` simultaneously.
4. **`wait_event_type = 'Client'` (`wait_event = 'ClientRead'`):**
   - The database backend is completely idle, waiting for the application client to send the next query. (If transaction state is `idle in transaction`, the app is holding open an uncommitted transaction!).

---

## 4. Memory Architecture & Engine Tuning Parameters

### Q5: What is the `work_mem` Multiplier Trap? How do you safely size `shared_buffers` and `work_mem`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Tuning  
**Tags:** `[work_mem]` `[shared_buffers]` `[OOM]`

**Answer:**

```text
PostgreSQL Memory Architecture:
┌────────────────────────────────────────────────────────────────────────┐
│ Shared Memory (Global):                                                │
│  • shared_buffers: 25% of Total RAM (e.g. 16GB on a 64GB node)        │
│  • OS Page Cache : 75% of RAM (Postgres relies on OS page cache!)      │
├────────────────────────────────────────────────────────────────────────┤
│ Private Process Memory (Per Backend):                                  │
│  • work_mem (Allocated per Sort / Hash operation per node!)            │
└────────────────────────────────────────────────────────────────────────┘
```

#### The `work_mem` Multiplier Trap:
Many engineers believe `work_mem = 64MB` means each connection can use at most 64MB of RAM. **This is dangerously false!**
- `work_mem` is allocated **per sort or hash operation per plan node**.
- A complex analytical query with 3 joins and 2 sorts can allocate:
  $$\text{Memory per query} = 5 \times \text{work\_mem} = 5 \times 64\text{MB} = 320\text{MB}$$
- If 100 concurrent connections execute this query simultaneously:
  $$\text{Total Memory} = 100 \times 320\text{MB} = \mathbf{32 \text{ Gigabytes of RAM!}}$$
- If physical memory is exceeded, the Linux kernel invokes the **OOM Killer (`Out Of Memory`)**, abruptly sending `SIGKILL` to the PostgreSQL postmaster daemon, crashing the entire database cluster!

#### Safe Sizing Guidelines:
1. **`shared_buffers`:** Set to **25% of total system RAM**. (Setting it to 80% hurts performance because PostgreSQL relies on double-buffering with the Linux OS kernel page cache).
2. **`work_mem`:** Keep global `work_mem` conservative (e.g., `16MB` to `32MB`). Override it locally for specific batch reporting sessions:
   ```sql
   SET LOCAL work_mem = '512MB';
   -- Run heavy aggregation query...
   ```
3. **`maintenance_work_mem`:** Set to **1GB–2GB** (used only by single-threaded VACUUM, CREATE INDEX, and ALTER TABLE).

---

## 5. Modern PostgreSQL 15–17+ Observability (`pg_stat_io`)

### Q6: What does the new `pg_stat_io` view provide in PostgreSQL 16+?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[pg_stat_io]` `[Postgres16]` `[Observability]`

**Answer:**
Prior to PostgreSQL 16, DBAs could see total system I/O via Linux OS tools (`iostat`), but could not determine *which specific database subsystem* was generating the I/O.

`pg_stat_io` provides a detailed matrix of disk reads, writes, and extends broken down by:
- **Backend Type:** Client backends, autovacuum workers, background writer, checkpointer.
- **Target Context:** Normal, vacuum, bulkread, bulkwrite.
- **I/O Object:** Relation data, temp relations.

```sql
SELECT backend_type, context, io_object, reads, writes, extends, hits
FROM pg_stat_io
WHERE reads > 0 OR writes > 0
ORDER BY reads DESC;
```
Now you can immediately answer: *"Is autovacuum causing 80% of our disk reads, or are client reporting queries the culprit?"*

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What is the exact difference between a Sequential Scan, Index Scan, Bitmap Index Scan, and Index-Only Scan?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[ScanTypes]` `[Planner]`

**Answer:**
- **Sequential Scan:** Reads every 8KB heap block in the table sequentially from beginning to end.
- **Index Scan:** Traverses the B-Tree index to find row pointers (`ctid`), then visits the heap page for each matching row.
- **Bitmap Index Scan:** Reads the index to build an in-memory bitmask of matching pages, sorts page numbers physically, and reads each heap page once in physical disk order.
- **Index-Only Scan:** Returns all requested data directly from the index leaf pages without visiting the heap at all (validated via the Visibility Map).

---

### Q8: How do you automatically log the execution plan of any query that takes longer than 500ms in production?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Configuration  
**Tags:** `[auto_explain]` `[Logging]`

**Answer:**
Use the built-in **`auto_explain`** extension in `postgresql.conf`:
```text
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = '500ms'
auto_explain.log_analyze = true
auto_explain.log_buffers = true
auto_explain.log_format = text
```
Any query taking longer than 500ms will automatically write its full `EXPLAIN (ANALYZE, BUFFERS)` execution plan into the PostgreSQL server log.
