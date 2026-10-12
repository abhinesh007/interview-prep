# 14 — MongoDB Architecture, Scenarios & Techniques

> WiredTiger Storage Engine Internals, Concurrency & Ticket Starvation, Document Modeling Patterns (Embedding vs Referencing), Write & Read Concerns, The ESR Indexing Rule, Sharded Cluster Chunk Balancing, Multi-Document ACID Transactions, and Real-World Outage Troubleshooting.

---

## 📑 Table of Contents
1. [Document Data Modeling Patterns & The 16MB Boundary](#1-document-data-modeling-patterns--the-16mb-boundary)
2. [WiredTiger Storage Engine Internals & Cache Sizing](#2-wiredtiger-storage-engine-internals--cache-sizing)
3. [Write Concern & Read Concern Mechanics](#3-write-concern--read-concern-mechanics)
4. [The ESR Indexing Rule (Compound Index Architecture)](#4-the-esr-indexing-rule-compound-index-architecture)
5. [Sharded Cluster Topology & Sharding Gotchas](#5-sharded-cluster-topology--sharding-gotchas)
6. [Multi-Document ACID Transactions & Change Streams](#6-multi-document-acid-transactions--change-streams)
7. [High-Value Production Outage Troubleshooting Scenarios](#7-high-value-production-outage-troubleshooting-scenarios)
8. [🎯 Quick-Fire & Trap Questions](#8--quick-fire--trap-questions)

---

## 1. Document Data Modeling Patterns & The 16MB Boundary

### Q1: When should you Embed subdocuments vs Reference across collections in MongoDB? What is the 16MB document limit hazard?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ System Design  
**Tags:** `[MongoDB]` `[DataModeling]` `[EmbeddingVsReferencing]`

**Answer:**
Data modeling in MongoDB is driven by **application query access patterns**, not formal relational normalization rules.

```text
1. Embedding (Denormalization - 1:Few):
┌────────────────────────────────────────────────────────┐
│ User Document (Collection: users)                      │
│  _id: 101, name: "Alice",                              │
│  addresses: [                                          │
│    { type: "home", street: "123 Main St", city: "NY" },│
│    { type: "work", street: "456 Wall St", city: "NY" } │
│  ]                                                     │
└────────────────────────────────────────────────────────┘
* Single atomic read ($O(1)$) retrieves entire entity tree!

2. Referencing (Normalization - 1:Many Unbounded):
┌──────────────────────────┐       ┌──────────────────────────┐
│ User Document (users)    │       │ Log Document (user_logs) │
│  _id: 101, name: "Alice" │ ◄───┤  _id: 991, user_id: 101,  │
└──────────────────────────┘       │  action: "LOGIN"         │
                                   └──────────────────────────┘
```

#### Decision Framework:
- **Embed When:**
  - Relationship is 1:1 or 1:Few (bounded, e.g., user profiles with $<5$ addresses).
  - Child data is always retrieved alongside the parent document.
  - Data updates are atomic within the single parent document boundary.
- **Reference When:**
  - Relationship is 1:Many with **unbounded growth** (e.g., e-commerce orders, device telemetry, comments on viral posts).
  - Child entities are frequently queried, updated, or paginated independently.
  - Avoiding data duplication across millions of records.

#### The 16MB BSON Document Limit & Anti-Pattern:
- **Hard Limit:** MongoDB enforces a strict maximum document size of **16 Megabytes**.
- **The Unbounded Array Anti-Pattern:** Storing an array of user activity logs inside the `user` document:
  ```json
  { "_id": 1, "username": "bob", "activity_logs": [ ... millions of items ... ] }
  ```
  As the array grows past 16MB, updates throw fatal errors (`BSONObjectTooLarge`), and the engine must continually relocate the document in memory, causing severe WiredTiger cache fragmentation.
- **Mitigation Patterns:**
  - **The Subset Pattern:** Embed only the last 10 items in the parent document for fast UI rendering; store older historical records in a separate collection.
  - **The Bucket Pattern:** Group time-series or log events into bounded buckets of 500 entries per document.

---

## 2. WiredTiger Storage Engine Internals & Cache Sizing

### Q2: How does the WiredTiger storage engine manage memory and concurrency? What causes "Ticket Starvation"?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[WiredTiger]` `[Cache]` `[Concurrency]` `[TicketStarvation]`

**Answer:**
Since MongoDB 3.2, **WiredTiger** is the default storage engine, providing document-level concurrency, multi-version concurrency control (MVCC), and block compression.

```text
WiredTiger Engine Memory & Concurrency Architecture:
┌────────────────────────────────────────────────────────────────────────┐
│ System RAM (e.g. 64GB)                                                 │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ WiredTiger Internal Cache (31GB)│  │ OS Filesystem Page Cache    │  │
│  │ Uncompressed B-tree pages in RAM│  │ Stores compressed blocks on │  │
│  │ Checkpoint flushes dirty pages  │  │ disk; handles prefetching   │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ Concurrency Control:                                                   │
│  • Optimistic Concurrency Control (OCC) at document level.            │
│  • WiredTiger Ticket Queue: Default 128 Read Tickets & 128 Write Tickets│
└────────────────────────────────────────────────────────────────────────┘
```

#### 1. Internal Cache Sizing Formula:
WiredTiger automatically sizes its internal cache based on available system RAM:
$$\mathbf{Cache \, Size} = \max\left(50\% \times (\text{Total RAM} - 1\text{GB}), \, 256\text{MB}\right)$$
On a 64GB node: $\text{Cache} = 0.5 \times (64 - 1) = \mathbf{31.5 \text{ GB}}$.
- Data in the WiredTiger cache is **uncompressed** for fast in-memory CPU manipulation.
- Data on disk and in the Linux OS page cache is **compressed** (Snappy by default, Zlib optional).

#### 2. Checkpointing & Journaling:
- **Checkpoints:** WiredTiger takes a snapshot checkpoint every **60 seconds** (or when 2GB of journal data accumulates), writing consistent state to disk.
- **Journaling:** To guarantee durability between checkpoints, mutations are written sequentially to on-disk write-ahead journal files (`journal/WiredTigerLog.*`).

#### 3. The "Ticket Starvation" Catastrophe:
- WiredTiger limits concurrent operations using **Tickets** (default: **128 concurrent read tickets** and **128 concurrent write tickets**).
- Under normal indexed operations, operations hold tickets for microseconds.
- **The Incident:** An unindexed query executes a massive collection scan (`COLLSCAN`) across 50 million documents, reading cold blocks from disk into cache.
- 128 concurrent client requests execute the same unindexed query.
- All 128 read tickets are seized by the slow disk-bound queries.
- **Result:** Available tickets drop to **0**. All subsequent queries (even lightning-fast primary key lookups) enter a blocked wait queue (`wiredTiger.concurrentTransactions.read.out = 0`), connection pools fill up, and the database freezes!

---

## 3. Write Concern & Read Concern Mechanics

### Q3: Dissect Write Concern (`w`, `j`, `wtimeout`) and Read Concern (`local`, `majority`, `linearizable`). How do they prevent dirty reads and rollbacks?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[WriteConcern]` `[ReadConcern]` `[Consistency]`

**Answer:**

#### 1. Write Concern (`w`, `j`, `wtimeout`):
Defines the level of acknowledgment requested from MongoDB before considering a write successful:

| Write Concern | Durability Guarantee | Failure Risk |
| :--- | :--- | :--- |
| **`w: 1`** (Historical default) | Acknowledged once primary writes to its memory/journal | **Data loss risk on primary failover!** (Unreplicated writes are rolled back) |
| **`w: "majority"`** (Modern default) | Acknowledged only after a strict quorum majority of replica set nodes have processed write | **Immune to rollbacks** on primary failover |
| **`j: true`** | Acknowledged only after written to the on-disk journal file | Guarantees survival against hard power loss of the node |
| **`wtimeout: 5000`** | Aborts with error if acknowledgment takes $>5000\text{ms}$ | Prevents client threads from blocking forever if a replica drops |

```javascript
// Production financial write:
db.accounts.updateOne(
  { _id: 101 },
  { $inc: { balance: -100 } },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
);
```

#### 2. Read Concern:
Controls data isolation and freshness for queries:
- **`readConcern: "local"` / `"available"`:** Returns the node’s current in-memory state without checking whether the write has been replicated. Fast, but can return dirty data that is subsequently rolled back if the primary crashes.
- **`readConcern: "majority"`:** Returns data that has been acknowledged by a majority of replica set members. **Guarantees that data read will never disappear due to a primary failover!**
- **`readConcern: "linearizable"`:** Forces the primary to coordinate with a quorum of nodes *during the read* to confirm that it is still the legitimate active primary. Prevents reading stale data during network partition split-brain scenarios (at the expense of significant latency).
- **`readConcern: "causalConsistency"`:** Guarantees Read-Your-Own-Writes and monotonic reads across distributed sessions.

---

## 4. The ESR Indexing Rule (Compound Index Architecture)

### Q4: What is the ESR (Equality, Sort, Range) Rule for compound index design? Why does violating it cause in-memory sort spills?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / IndexDesign  
**Tags:** `[ESRRule]` `[Indexing]` `[QueryPlanner]`

**Answer:**
The **ESR Rule** dictates the exact field ordering required when constructing high-performance compound indexes:

$$\mathbf{Index \, Field \, Order} = \mathbf{E} \, (\text{Equality}) \longrightarrow \mathbf{S} \, (\text{Sort}) \longrightarrow \mathbf{R} \, (\text{Range})$$

```text
Query Example:
db.orders.find({
  status: "PAID",                    // 1. EQUALITY (E)
  total: { $gte: 100, $lte: 500 }    // 3. RANGE (R)
}).sort({
  orderDate: -1                      // 2. SORT (S)
})

Optimal Compound Index according to ESR:
db.orders.createIndex({
  status: 1,      // 1. EQUALITY FIRST
  orderDate: -1,  // 2. SORT SECOND
  total: 1        // 3. RANGE LAST
})
```

#### Why ESR Works Mathematically:
1. **Equality (E) First:**
   - Filters down the candidate search space immediately to a contiguous slice of the B-Tree leaf pages matching `status: "PAID"`.
2. **Sort (S) Second (Before Range!):**
   - Inside that `status` slice, the index entries are already pre-sorted by `orderDate: -1`.
   - MongoDB can walk the B-Tree leaf pointers sequentially in exact desired order. **Zero in-memory sorting required!**
3. **Range (R) Last:**
   - As it walks the pre-sorted entries, it checks the `total` range bounds, discarding values outside the range.

#### The Consequence of Violating ESR (Putting Range before Sort):
If you index `{ status: 1, total: 1, orderDate: -1 }`:
- The index narrows down by `status` and `total`.
- But within that range of `total`, entries are **not pre-sorted by `orderDate`**!
- MongoDB is forced to pull all matching documents into memory and execute an expensive in-memory sort (**`SORT` execution stage**).
- **The Fatal Crash:** MongoDB limits in-memory sorts to **100MB of RAM**. If the result set exceeds 100MB without `allowDiskUse: true`, the query crashes:
  `Executor error during find command: Sort exceeded memory limit of 104857600 bytes`.

---

## 5. Sharded Cluster Topology & Sharding Gotchas

### Q5: Break down the architecture of a MongoDB Sharded Cluster. What are the fatal pitfalls of selecting a poor Shard Key?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ System Design  
**Tags:** `[Sharding]` `[mongos]` `[ConfigServers]` `[ShardKey]`

**Answer:**

```text
MongoDB Sharded Cluster Topology:
┌────────────────────────────────────────────────────────┐
│ Application Clients                                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ mongos (Stateless Query Router Tier)                   │
│ Caches chunk routing maps from Config Database         │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│ Config Server Replica Set│  │ Shard 1 (Replica Set)    │
│ Stores cluster metadata, │  │ Stores Chunk A & Chunk B │
│ chunk boundaries & config│  ├──────────────────────────┤
└──────────────────────────┘  │ Shard 2 (Replica Set)    │
                              │ Stores Chunk C & Chunk D │
                              └──────────────────────────┘
```

#### Critical Shard Key Pitfalls:
1. **Monotonically Increasing Keys (e.g., `_id: ObjectId` or `createdAt`):**
   - Every newly created document has an ID greater than all existing documents.
   - All new `INSERT` operations route to the exact same chunk on the exact same shard (**The Hot Shard Trap**).
   - Only 1 shard processes writes while the other 10 shards sit completely idle.
2. **Low-Cardinality Keys (e.g., `country` with 4 values):**
   - You can only ever create 4 chunks. A 100-shard cluster is useless because data cannot be divided among more than 4 shards.
3. **The "Jumbo Chunk" Hazard:**
   - A chunk reaches the maximum chunk size (default 64MB) and cannot be split because all documents in that chunk share the exact same shard key value!
   - The balancer marks it as **Jumbo** and refuses to migrate it, permanently unbalancing the cluster.
4. **Targeted vs Scatter-Gather Queries:**
   - If a query includes the shard key: `mongos` routes the query directly to the single shard holding that chunk (**Targeted Query**).
   - If a query omits the shard key: `mongos` must broadcast the query to **every single shard in the cluster (Scatter-Gather)**, degrading overall cluster throughput.

---

## 6. Multi-Document ACID Transactions & Change Streams

### Q6: Can MongoDB handle ACID transactions across multiple documents and collections? What are the operational trade-offs?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Transactions]` `[ACID]` `[ChangeStreams]`

**Answer:**
Since MongoDB 4.0 (replica sets) and 4.2 (sharded clusters), MongoDB supports **Multi-Document ACID Transactions** using Snapshot Isolation.

```javascript
// Multi-Document Transaction Example:
const session = client.startSession();
session.startTransaction({
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  maxCommitTimeMS: 5000,
});

try {
  await accounts.updateOne(
    { _id: 'Alice' },
    { $inc: { balance: -200 } },
    { session }
  );
  await accounts.updateOne(
    { _id: 'Bob' },
    { $inc: { balance: 200 } },
    { session }
  );
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

#### The Production Trade-Offs & Senior Advice:
1. **Performance Cost:** Transactions acquire document-level locks and hold dirty versions in the WiredTiger cache until commit, increasing memory pressure.
2. **The 60-Second Execution Limit:** Transactions that run longer than `transactionLifetimeLimitSeconds` (default 60 seconds) are automatically aborted by the server.
3. **The Data Modeling Smell:** Needing multi-document transactions in MongoDB often indicates a **relational data-modeling mindset**. If data must be updated together atomically, redesign documents to **embed** related entities so they can be modified using single-document atomic operators (`$set`, `$inc`, `$push`).

---

## 7. High-Value Production Outage Troubleshooting Scenarios

### Q7: 🐛 Production Outage Scenario: The Primary node hits 100% CPU and client connections stall. Walk through the emergency response playbook.
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Outage]` `[currentOp]` `[Troubleshooting]`

**Answer:**

#### Step 1: Inspect In-Flight Operations with `db.currentOp()`
Connect to the database via `mongosh` and identify queries running longer than 5 seconds:
```javascript
db.currentOp({
  active: true,
  secs_running: { $gt: 5 },
  ns: { $ne: "local.oplog.rs" }
});
```
Look for:
- `planSummary: "COLLSCAN"`: Table scan iterating over millions of documents without an index.
- `waitingForLock: true`: Queries blocked waiting for locks.
- `numYields`: Low yields indicating CPU-intensive aggregation pipelines.

#### Step 2: Terminate Offending Operations Immediately
Extract the operation ID (`opid`) and kill it:
```javascript
db.killOp(1048291);
```

#### Step 3: Analyze the Slow Query Log & Profiler
Check the system profiler for queries taking $>100\text{ms}$:
```javascript
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(5);
```

#### Step 4: Create Missing Index Online
Create the missing index in the background to prevent immediate recurrence:
```javascript
// In modern MongoDB (4.2+), indexes build concurrently without blocking reads or writes:
db.orders.createIndex({ customerId: 1, status: 1 });
```

---

### Q8: 🐛 Production Outage Scenario: Replication lag is growing rapidly, and secondaries are falling behind. How do you troubleshoot the Oplog Window?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Oplog]` `[ReplicationLag]` `[DisasterRecovery]`

**Answer:**

#### Step 1: Check Oplog Time Window and Lag
Run `rs.printReplicationInfo()` and `rs.printSecondaryReplicationInfo()`:
```javascript
rs.printReplicationInfo();
// Output:
// configured oplog size:   50000MB
// log length start to end: 14.5 hours  <-- OPLOG WINDOW!

rs.printSecondaryReplicationInfo();
// Output:
// Source: secondary-node-1: 13.8 hours behind primary!  <-- DANGER!
```

#### The Imminent Disaster:
- The **Oplog Window** is 14.5 hours.
- If Secondary 1 falls behind by **more than 14.5 hours**, the primary will overwrite the Oplog records that the secondary still needs to catch up!
- Once this threshold is crossed, the secondary enters a **`RECOVERING` fatal state** and cannot catch up via replication; it must be completely wiped and re-synced from scratch (**Initial Sync**)!

#### Immediate Remediation:
1. **Resize the Oplog Dynamically on Primary (Zero Downtime):**
   ```javascript
   // Expand Oplog size from 50GB to 150GB to buy 30 hours of time:
   db.adminCommand({ replSetResizeOplog: 1, size: 153600 });
   ```
2. **Diagnose Secondary Bottleneck:**
   - Check secondary disk I/O (`iostat -x 1`). If secondary disks have lower IOPS than primary, write replay blocks.
   - Upgrade secondary disk tier or enable write concern `w: "majority"` on the application to naturally throttle primary write speed to match replica throughput.

---

## 8. 🎯 Quick-Fire & Trap Questions

### Q9: What is the difference between an SQL `JOIN` and MongoDB's `$lookup` in terms of memory limits?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Lookup]` `[Join]`

**Answer:**
SQL databases optimize joins using disk-spill hash joins and merge joins with indexed memory pipelines. In MongoDB, **`$lookup` executes in memory and is constrained by a 100MB RAM limit** per aggregation pipeline stage. If `$lookup` produces an intermediate document set exceeding 100MB without `allowDiskUse: true`, the query fails. Heavy use of `$lookup` indicates relational anti-patterns in document design.

---

### Q10: What happens to uncommitted writes on a deposed primary when it reconnects after a network partition?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Rollback]` `[Failover]`

**Answer:**
If the old primary accepted writes with `w: 1` before being deposed, and those writes never reached secondaries before failover:
1. When the old primary reconnects as a secondary, it detects that its timeline diverges from the newly elected primary.
2. It undoes the diverged writes, reverting its data to the branch point.
3. It dumps the divergent documents into binary BSON files inside the **`rollback/` directory** on disk for manual administrative inspection.
