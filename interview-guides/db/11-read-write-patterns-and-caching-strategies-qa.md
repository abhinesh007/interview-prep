# 11 — Read-Write Patterns & Caching Strategies

> Read/Write Splitting, Replication Lag Mitigations (Read-After-Write Consistency & LSN Tokens), CQRS Pattern, Distributed Caching Strategies (Cache-Aside, Write-Behind, Cache Stampede), and High-Throughput Write Optimizations (`COPY`, Batching, Unlogged Tables).

---

## 📑 Table of Contents
1. [Read/Write Splitting Architectures](#1-readwrite-splitting-architectures)
2. [Replication Lag Mitigations & Read-After-Write Consistency](#2-replication-lag-mitigations--read-after-write-consistency)
3. [Command Query Responsibility Segregation (CQRS)](#3-command-query-responsibility-segregation-cqrs)
4. [Distributed Caching Strategies & Invalidation Traps](#4-distributed-caching-strategies--invalidation-traps)
5. [High-Throughput Write Ingestion Techniques](#5-high-throughput-write-ingestion-techniques)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Read/Write Splitting Architectures

### Q1: How do you implement Read/Write Splitting across a primary database and multiple read replicas? Compare application-level vs proxy-level routing.
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ System Design  
**Tags:** `[ReadWriteSplitting]` `[Replication]` `[Architecture]`

**Answer:**

```text
1. Application-Level Routing:
┌─────────────────────────────────┐
│ Application Service             │
│  • WriteDataSource (Primary)    │ ────────► [PostgreSQL Primary Node (R/W)]
│  • ReadDataSource (ReplicaPool) │ ────┬───► [Read Replica 1 (Read-Only)]
└─────────────────────────────────┘     └───► [Read Replica 2 (Read-Only)]

2. Proxy-Level Transparent Routing:
┌─────────────────────┐      Port 5432 (Write)      ┌─────────────────────────┐
│ Application Service │ ──────────────────────────► │ Database Proxy          │
│ (Single Connection) │      Port 5433 (Read-Only)  │ (PgBouncer / AWS Aurora)│
└─────────────────────┘ ──────────────────────────► └────────────┬────────────┘
                                                                 │
                                                  ┌──────────────┴────────────┐
                                                  ▼                           ▼
                                            [Primary R/W]             [Replica Read]
```

#### Comparison of Routing Approaches:
| Dimension | Application-Level Routing (e.g. Spring `@Transactional(readOnly=true)`, SQLAlchemy dynamic session) | Proxy-Level Routing (e.g. PgBouncer multi-port, ProxySQL, AWS Aurora Cluster Endpoints) |
| :--- | :--- | :--- |
| **Control** | Fine-grained. Developers explicitly control which queries hit the primary. | Centralized; application is unaware of cluster topology. |
| **Failover Agility** | Requires application configuration reload or service restart when primary changes. | Transparent; proxy reroutes traffic immediately upon replica promotion. |
| **Replication Lag Awareness** | Application can easily enforce "Read-After-Write" pinning. | Proxy often lacks application session context, risking stale reads. |
| **Best Practice** | Ideal for microservices that need context-aware read consistency. | Ideal for legacy applications or simple read scaling. |

---

## 2. Replication Lag Mitigations & Read-After-Write Consistency

### Q2: What is the "Stale Read" trap, and how do you guarantee Read-After-Write (Read-Your-Own-Writes) consistency with asynchronous replicas?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[ReplicationLag]` `[StaleReads]` `[ReadYourOwnWrites]`

**Answer:**
Under asynchronous replication, standby replicas lag behind the primary by milliseconds to seconds.

```text
The Stale Read Incident:
1. User Alice edits her profile bio: "Staff Engineer".
   Application sends UPDATE to Primary. Primary commits at LSN 1000.
2. App redirects Alice to /profile.
   Application sends SELECT to Read Replica.
   Read Replica has only applied up to LSN 920!
3. Alice sees her OLD bio: "Junior Developer"!
4. Alice panics and clicks "Save" 5 more times, filing a bug report.
```

#### Production Mitigation Strategies:
1. **Write Pinning (Sticky Session Pinning):**
   - When a user performs any mutation (`POST`, `PUT`, `DELETE`), store a timestamp in the user's session cookie or Redis:
     `pinned_until = NOW() + 5 seconds`.
   - For the next 5 seconds, route **all reads for that specific user strictly to the Primary database**.
   - After 5 seconds, replication is guaranteed to have caught up, and reads safely revert to replicas.
2. **Monotonic LSN Sequence Tokens (Exact Consistency):**
   - When the Primary commits the user's write, extract the transaction's commit LSN:
     ```sql
     SELECT pg_current_wal_lsn(); -- Returns: 0/16B3748
     ```
   - Return this LSN token in the API response header or JWT: `X-Database-LSN: 0/16B3748`.
   - When the client makes subsequent read requests, include this token.
   - The application checks the replica’s current replay position:
     ```sql
     SELECT pg_last_wal_replay_lsn();
     ```
   - If $\text{replica\_lsn} \ge \text{token\_lsn}$, serve the read from the replica. If the replica lags behind, route the read to the primary or another replica that has caught up!

---

## 3. Command Query Responsibility Segregation (CQRS)

### Q3: When is the CQRS (Command Query Responsibility Segregation) pattern justified in relational systems? How are read models kept synchronized?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[CQRS]` `[EventSourcing]` `[Architecture]`

**Answer:**
**CQRS** separates data modification operations (**Commands**) from data retrieval operations (**Queries**), using distinct data models optimized for their respective workloads.

```text
CQRS Architecture:
                     ┌──────────────────────────────────────────────┐
                     │ API Gateway / Application Service            │
                     └──────────────┬────────────────┬──────────────┘
                                    │                │
                      Commands (Write)               Queries (Read)
                                    │                │
                                    ▼                ▼
┌──────────────────────────────────────┐  CDC /  ┌──────────────────────────────────────┐
│ Write Model (Normalized PostgreSQL)  │ ──────► │ Read Model (Elasticsearch / Denorm DB)│
│ Optimized for ACID, 3NF, Writes      │ Logical │ Optimized for Full-Text, Aggregations │
└──────────────────────────────────────┘ Stream  └──────────────────────────────────────┘
```

#### When CQRS is Justified:
- **Complex Analytical Aggregations:** When read queries require 8-table joins that degrade OLTP write throughput.
- **Polyglot Persistence:** Using PostgreSQL for transactional integrity, but projecting data into Elasticsearch for full-text search or Redis for real-time leaderboards.
- **High Read-to-Write Asymmetry:** When read volume exceeds write volume by 100:1.

#### Keeping Read Models Synchronized:
Never use synchronous dual-writes in application code. Use **Log-Based Change Data Capture (CDC)** (Debezium reading PostgreSQL WAL) to publish change events to Kafka, asynchronously updating the read models with guaranteed eventual consistency.

---

## 4. Distributed Caching Strategies & Invalidation Traps

### Q4: Compare Cache-Aside vs Write-Behind caching. How do you prevent Cache Stampede (Thundering Herd)?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Caching]` `[CacheStampede]` `[Redis]`

**Answer:**

```text
1. Cache-Aside (Lazy Loading):
   App reads Cache ──► Miss! ──► App reads DB ──► App populates Cache
   * Pros: Cache only holds requested data. Resilient to cache restart.
   * Cons: Cache miss latency penalty; potential stale data.

2. Write-Behind (Write-Back):
   App writes Cache ──► Returns OK! ──► Cache batches async writes to DB
   * Pros: Sub-millisecond write latency; batches thousands of DB writes.
   * Cons: Risk of permanent data loss if cache crashes before DB flush!
```

#### The Cache Stampede (Thundering Herd) Disaster:
- **The Incident:** A hot cache key (e.g., `homepage_feed`, requested 5,000 times/sec) expires its TTL.
- In the next 10 milliseconds, 5,000 concurrent requests experience a cache miss.
- All 5,000 requests query the database simultaneously with expensive queries!
- The database CPU hits 100%, connection pools exhaust, and the site crashes.

#### Mitigating Cache Stampede:
1. **Probabilistic Early Expiration (XFetch Algorithm):**
   - The application computes a probabilistic trigger before the key expires:
     $$\Delta \times \beta \times \ln(\text{random}()) > \text{expiry} - \text{now}$$
   - A single background thread refreshes the cache *before* it expires, ensuring normal readers never experience a miss.
2. **Distributed Mutex Lock:**
   - On cache miss, acquire a Redis mutex lock (`SET lock:key token NX EX 5`).
   - Only the single thread that acquires the lock queries the database; other threads wait and re-read the cache.

---

## 5. High-Throughput Write Ingestion Techniques

### Q5: How do you optimize PostgreSQL to ingest 100,000 writes per second? Detail batching, `COPY`, and unlogged tables.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Tuning  
**Tags:** `[WriteThroughput]` `[COPY]` `[Batching]`

**Answer:**

#### 1. Avoid Single-Row `INSERT` Loops:
- Executing `INSERT INTO logs VALUES (...)` in a loop across 100,000 rows generates 100,000 network round-trips, 100,000 SQL parse trees, and 100,000 WAL flushes ($O(N)$ overhead).

#### 2. Multi-Row Batch Insertion:
- Group inserts into batches of 1,000–5,000 rows:
  ```sql
  INSERT INTO logs (timestamp, level, message) VALUES 
  ('2026-01-01', 'INFO', 'msg 1'),
  ('2026-01-01', 'INFO', 'msg 2'),
  ...
  ('2026-01-01', 'INFO', 'msg 5000');
  ```
  Reduces network and planning overhead by 99%.

#### 3. High-Speed Streaming with `COPY ... FROM STDIN`:
- The fastest possible ingestion path in PostgreSQL.
- Bypasses SQL parsing, tokenization, and query planner entirely. Streams raw tab-delimited or binary tuples directly into data pages:
  ```sql
  COPY sensor_telemetry FROM STDIN WITH (FORMAT binary);
  ```
  Achieves **10x–50x higher throughput** than multi-row `INSERT`.

#### 4. Temporary / Staging Unlogged Tables:
```sql
CREATE UNLOGGED TABLE staging_telemetry (...);
```
- Completely disables WAL logging. Writes proceed at the speed of raw RAM/SSD page allocation.
- Once staged, bulk-transform into permanent tables in a single transaction.

#### 5. Deferrable Constraints:
- Declare foreign keys as `DEFERRABLE INITIALLY DEFERRED`. Postpones constraint validation until `COMMIT`, avoiding per-row constraint evaluation checks during ingestion.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What locks does `INSERT ... ON CONFLICT DO UPDATE` (Upsert) acquire?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Upsert]` `[Locking]`

**Answer:**
An Upsert acquires a `ROW EXCLUSIVE` table lock and attempts to insert the row. If a conflicting key is found in the unique index, it acquires an **exclusive row lock (`XMAX_EXCL`) on the existing conflicting row** and executes the update.
**The Gotcha:** High-concurrency upserts on the same unique key can cause deadlocks if multiple transactions attempt to insert the same key in conflicting orders.

---

### Q7: How do you prevent single-row lock contention on a hot counter (e.g., global page views or scarce inventory)?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[Hotspots]` `[Counters]`

**Answer:**
**Distributed Counter Sharding:**
Instead of having 10,000 threads update a single row (`UPDATE counters SET count = count + 1 WHERE id = 1`), create $N$ shard rows:
```sql
CREATE TABLE counter_shards (shard_id INT, count BIGINT);
-- Insert 16 shards:
INSERT INTO counter_shards SELECT generate_series(0, 15), 0;
```
Each worker randomly updates a shard:
```sql
UPDATE counter_shards SET count = count + 1 WHERE shard_id = floor(random() * 16);
```
Total count is computed via `SELECT sum(count) FROM counter_shards;`. This eliminates lock contention by 16x.
