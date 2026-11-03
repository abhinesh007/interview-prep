# 10 — Partitioning, Sharding & Horizontal Scale

> Declarative Partitioning (Range, List, Hash), Partition Pruning Mechanics, Partitioning vs Sharding, Shard Key Selection Dilemma, Consistent Hashing, Citus Distributed PostgreSQL, and Cross-Shard Query Hazards.

---

## 📑 Table of Contents
1. [Declarative Table Partitioning in PostgreSQL](#1-declarative-table-partitioning-in-postgresql)
2. [Partition Pruning: Compile-Time vs Run-Time](#2-partition-pruning-compile-time-vs-run-time)
3. [Partitioning vs Sharding Architectural Spectrum](#3-partitioning-vs-sharding-architectural-spectrum)
4. [Sharding Architectures & Shard Key Selection](#4-sharding-architectures--shard-key-selection)
5. [Distributed PostgreSQL with Citus](#5-distributed-postgresql-with-citus)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Declarative Table Partitioning in PostgreSQL

### Q1: Detail the three declarative partitioning strategies in PostgreSQL: Range, List, and Hash. How do they work under the hood?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Partitioning]` `[DeclarativePartitioning]` `[DDL]`

**Answer:**
PostgreSQL supports native **Declarative Table Partitioning** (introduced in PG 10 and heavily optimized in PG 11–17+). A partitioned table is logically a single relation (parent) that divides its physical data across multiple underlying storage tables (partitions).

```text
Logical Parent Table: orders (Partitioned by RANGE on created_at)
┌────────────────────────────────────────────────────────┐
│ orders (Schema, Constraints, Virtual Root)             │
└──────────────┬──────────────────┬──────────────────────┘
               │                  │
        ┌──────┴──────┐    ┌──────┴──────┐    ┌─────────────┐
        ▼             ▼    ▼             ▼    ▼             ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ orders_2026_q1││ orders_2026_q2││ orders_2026_q3││ orders_default│
│ (Jan - Mar)  ││ (Apr - Jun)  ││ (Jul - Sep)  ││ (Catch-All)  │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

#### The Three Partitioning Strategies:
1. **Range Partitioning (`PARTITION BY RANGE`):**
   - Data is split into non-overlapping numerical, date, or timestamp ranges.
   - Ideal for: Audit logs, orders, time-series telemetry.
   ```sql
   CREATE TABLE sensor_readings (
       id BIGSERIAL,
       reading_time TIMESTAMPTZ NOT NULL,
       val NUMERIC
   ) PARTITION BY RANGE (reading_time);

   CREATE TABLE sensor_readings_2026_01 PARTITION OF sensor_readings
       FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
   ```
2. **List Partitioning (`PARTITION BY LIST`):**
   - Data is routed based on discrete enumerated key values.
   - Ideal for: Multi-tenant by region or country code (`US`, `EU`, `APAC`).
   ```sql
   CREATE TABLE customers (
       id UUID NOT NULL,
       region VARCHAR(10) NOT NULL
   ) PARTITION BY LIST (region);

   CREATE TABLE customers_na PARTITION OF customers FOR VALUES IN ('US', 'CA', 'MX');
   ```
3. **Hash Partitioning (`PARTITION BY HASH`):**
   - Data is routed by computing a 64-bit hash of the key modulo the modulus $N$.
   - Ideal for: Evenly distributing high-volume tables across $N$ physical storage disks when no natural date range exists.
   ```sql
   CREATE TABLE user_profiles (
       user_id UUID NOT NULL,
       data JSONB
   ) PARTITION BY HASH (user_id);

   CREATE TABLE user_profiles_p0 PARTITION OF user_profiles FOR VALUES WITH (MODULUS 4, REMAINDER 0);
   CREATE TABLE user_profiles_p1 PARTITION OF user_profiles FOR VALUES WITH (MODULUS 4, REMAINDER 1);
   ```

---

## 2. Partition Pruning: Compile-Time vs Run-Time

### Q2: What is Partition Pruning, and how does the optimizer distinguish between Compile-Time and Run-Time pruning?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[PartitionPruning]` `[Performance]` `[Optimizer]`

**Answer:**
**Partition Pruning** is an essential query planner optimization where PostgreSQL examines query `WHERE` clauses and **completely skips scanning partitions whose boundary constraints cannot possibly match the query**.

```text
Query: SELECT * FROM sensor_readings WHERE reading_time = '2026-01-15';
Without Pruning: Scans 48 monthly partitions (100% of table) ──► Slow Seq Scan!
With Pruning   : Scans ONLY sensor_readings_2026_01 (Skips 47 partitions!)
```

#### 1. Compile-Time (Static) Pruning:
- Occurs during the query planning phase when query predicates contain literal, static values:
  ```sql
  SELECT * FROM sensor_readings WHERE reading_time >= '2026-01-01' AND reading_time < '2026-02-01';
  ```
- The optimizer analyzes the partition boundary definitions and excludes non-matching partition tables from the query execution plan tree entirely before execution begins.

#### 2. Run-Time (Dynamic) Pruning:
- Occurs when query predicates depend on values that are unknown at plan time:
  - Prepared statements with bind parameters (`WHERE reading_time = $1`).
  - Subqueries (`WHERE reading_time = (SELECT max_date FROM params)`).
  - Parameterized nested loop joins.
- **How it executes:** The query plan includes an `Append` node over all partitions, but at execution time, as each parameter value is bound, Postgres evaluates the value and skips execution of non-matching partition child nodes.
- Visible in `EXPLAIN ANALYZE` as:
  `Subplans Removed: 47`

---

## 3. Partitioning vs Sharding Architectural Spectrum

### Q3: Contrast Table Partitioning with Database Sharding. When should an engineering team graduate from partitioning to sharding?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Partitioning]` `[Sharding]` `[SystemDesign]`

**Answer:**

```text
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│ Single-Node Partitioning             │       │ Multi-Node Horizontal Sharding       │
├──────────────────────────────────────┤       ├──────────────────────────────────────┤
│ Single PostgreSQL Instance           │       │ Shared-Nothing Architecture          │
│ Single CPU, Single RAM pool, 1 Host  │       │ Independent DB Nodes over Network    │
│                                      │       │                                      │
│  ┌────────────────────────────────┐  │       │ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  │ Part 1 │ Part 2 │ Part 3       │  │       │ │ Shard 1  │ │ Shard 2  │ │ Shard 3  │
│  └────────────────────────────────┘  │       │ └──────────┘ └──────────┘ └──────────┘
│ • ACID preserved across partitions   │       │ • Distributed transactions required  │
│ • Local Foreign Keys work natively   │       │ • Cross-shard joins are expensive    │
│ • Bounded by vertical host compute   │       │ • Compute and storage scale linearly │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

| Decision Criterion | Partitioning (Vertical Node) | Sharding (Horizontal Cluster) |
| :--- | :--- | :--- |
| **Physical Storage Topology** | Single database instance (or single primary + replicas) | Multiple independent database servers |
| **Transaction Boundaries** | Native local ACID transactions across all partitions | Distributed transactions (2PC or Sagas required) |
| **Foreign Keys & Uniqueness** | Fully supported across partitions | Cannot enforce foreign keys across independent shards |
| **Operational Complexity** | Low (handled transparently by PostgreSQL engine) | High (requires routing proxy, resharding tools, distributed backups) |
| **Scaling Limit** | Bounded by the largest available cloud machine (e.g. 128 vCPUs, 1TB RAM) | **Virtually limitless** horizontal scale |

#### The Senior Rule of Thumb:
> **"Do not shard until you have exhausted partitioning, read replicas, connection pooling, and vertical hardware scaling."** Sharding solves compute and storage exhaustion, but destroys cross-table relational ergonomics.

---

## 4. Sharding Architectures & Shard Key Selection

### Q4: How do you choose an effective Shard Key? Analyze the hazards of Monotonic vs Low-Cardinality vs Hashed keys.
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[ShardKey]` `[Hotspots]` `[ConsistentHashing]`

**Answer:**
Choosing a shard key is the single most critical architectural decision in distributed databases. A poor shard key creates irreversible write hotspots and degrades performance.

```text
The Shard Key Trap:
1. Monotonically Increasing Key (e.g., created_at or auto-increment id):
Shard 1 (2024)   Shard 2 (2025)   Shard 3 (Current: 2026)
[Idle / Cold]    [Idle / Cold]    [100% CPU SATURATION! ALL NEW WRITES LAND HERE!] ❌

2. Hashed Shard Key (e.g., hash(user_id)):
Shard 1          Shard 2          Shard 3
[33% Writes]     [33% Writes]     [33% Writes]  <-- PERFECT WRITE DISTRIBUTION!
```

#### Evaluation of Shard Key Strategies:
1. **Monotonically Increasing Key (`created_at`, Sequential `id`):**
   - **Hazard:** All current `INSERT` operations hit the newest shard. Older shards sit completely idle. Destroys horizontal scaling.
2. **Low-Cardinality Key (e.g., `country_code` with 5 values):**
   - **Hazard:** You can never scale beyond 5 physical shards! Furthermore, if 80% of users reside in the `US`, Shard 1 becomes an overloaded hot shard.
3. **Hashed Shard Key (`hash(user_id)`):**
   - **Advantage:** Guarantees uniform, statistical write distribution across all shards.
   - **Trade-off:** Range queries (e.g., `WHERE user_id BETWEEN 100 AND 200`) lose physical co-location and must query **every single shard in the cluster (Scatter-Gather)**.

#### Consistent Hashing Rings:
When scaling a sharded cluster from $N$ to $N+1$ shards, naive modulo hashing ($\text{hash}(key) \pmod N$) forces $N-1$ out of $N$ keys to move to new nodes, causing network saturation.
**Consistent Hashing** maps nodes and keys onto a virtual ring ($2^{32}-1$ tokens). Adding a new shard requires migrating only $K/N$ keys, minimizing rebalancing disruption.

---

## 5. Distributed PostgreSQL with Citus

### Q5: How does Citus transform PostgreSQL into a horizontally sharded distributed database? Detail Distributed vs Reference tables.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[Citus]` `[DistributedPostgres]` `[Sharding]`

**Answer:**
**Citus** is an open-source extension that scales PostgreSQL horizontally by distributing tables and query execution across a cluster of multiple PostgreSQL nodes.

```text
Citus Cluster Architecture:
┌────────────────────────────────────────────────────────┐
│ Citus Coordinator Node                                 │
│  • Stores cluster metadata & shard routing maps        │
│  • Compiles distributed query execution trees          │
└───────────────────────────┬────────────────────────────┘
                            │ Distributed Query Plan
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐
│ Citus Worker 1  ││ Citus Worker 2  ││ Citus Worker 3  │
│ Shards: 101, 102││ Shards: 103, 104││ Shards: 105, 106│
└─────────────────┘└─────────────────┘└─────────────────┘
```

#### The Citus Table Topology:
1. **Distributed Tables (Sharded Tables):**
   - Sharded across worker nodes using a distribution column (e.g., `tenant_id` or `company_id`).
   ```sql
   SELECT create_distributed_table('events', 'tenant_id');
   ```
   - Queries filtering by `tenant_id` are routed directly to the specific worker node holding that shard (**Router Execution**), executing with local PostgreSQL speed.
2. **Reference Tables (Replicated Tables):**
   - Small dimension tables (e.g., `currencies`, `countries`, `roles`) that rarely change.
   ```sql
   SELECT create_reference_table('countries');
   ```
   - Citus replicates a complete copy of this table to **every worker node**.
   - **Massive Benefit:** When a distributed query joins `events` with `countries`, the join executes locally on each worker without shipping data across the network!

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What are the restrictions on Unique Constraints and Primary Keys on partitioned tables in PostgreSQL?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Constraints]` `[Gotchas]`

**Answer:**
In PostgreSQL, a unique constraint or primary key on a partitioned table **MUST contain all the partition key columns**.
For example, if a table is `PARTITION BY RANGE (created_at)`, you **cannot** create a primary key on `id` alone; it must be a composite primary key: `PRIMARY KEY (id, created_at)`.
*Reason:* Enforcing global uniqueness on `id` across independent partitions would require an expensive distributed cross-partition index lock check on every single insert.

---

### Q7: What is a "Scatter-Gather" query, and why does it degrade throughput on sharded clusters?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[ScatterGather]` `[Performance]`

**Answer:**
A **Scatter-Gather query** occurs when a query does not include the shard key in its `WHERE` predicate. The coordinator cannot determine which shard holds the data, so it must broadcast ("scatter") the query to **every single worker node** in the cluster, wait for the slowest node to respond, and merge ("gather") the results. Under high concurrency, scatter-gather queries saturate cluster CPU and network bandwidth.
