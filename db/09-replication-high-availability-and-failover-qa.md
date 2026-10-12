# 09 — Replication, High Availability & Failover

> Physical Streaming Replication, Replication Slots & Disk Overflow Traps, Synchronous vs Asynchronous Replication, Logical Replication, Automated Failover with Patroni & Raft, Split-Brain Elimination (STONITH & Watchdog), and `pg_rewind`.

---

## 📑 Table of Contents
1. [Physical Streaming Replication Internals](#1-physical-streaming-replication-internals)
2. [Synchronous vs Asynchronous Replication & Durability](#2-synchronous-vs-asynchronous-replication--durability)
3. [Logical Replication Architecture & Use Cases](#3-logical-replication-architecture--use-cases)
4. [High Availability & Automated Failover with Patroni](#4-high-availability--automated-failover-with-patroni)
5. [Split-Brain Elimination & Fencing (STONITH)](#5-split-brain-elimination--fencing-stonith)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Physical Streaming Replication Internals

### Q1: Walk through the exact internal architecture of PostgreSQL Physical Streaming Replication. What background processes are involved?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Replication]` `[StreamingReplication]` `[Internals]`

**Answer:**
PostgreSQL Physical Streaming Replication is an asynchronous or synchronous **byte-for-byte block replication** mechanism that streams raw WAL records from a primary node to one or more standby replicas over a TCP connection.

```text
Primary Database Node                           Standby Database Node
┌─────────────────────────────────┐             ┌──────────────────────────────────┐
│ Client Backends modify data     │             │ Client Readers execute SELECTs   │
│  └► Write WAL to wal_buffers    │             │  (Hot Standby)                   │
├─────────────────────────────────┤             ├──────────────────────────────────┤
│ walsender process               │ ──TCP WAL──►│ walreceiver process              │
│ Reads WAL from pg_wal           │  Stream     │ Receives WAL chunks; writes to   │
│ Tracks replication slot LSN     │             │ standby pg_wal/ directory        │
└─────────────────────────────────┘             └───────────────┬──────────────────┘
                                                                │ Replay signal
                                                                ▼
                                                ┌──────────────────────────────────┐
                                                │ Startup process                  │
                                                │ Replays WAL changes into local   │
                                                │ 8KB data pages in shared_buffers │
                                                └──────────────────────────────────┘
```

#### The Three Core Processes:
1. **`walsender` (Runs on Primary):**
   - A dedicated backend process spawned on the primary for each connected standby replica.
   - Reads newly written WAL records from `wal_buffers` or `pg_wal` files and streams them over TCP to the standby.
2. **`walreceiver` (Runs on Standby):**
   - Background worker on the standby that connects to the primary's `walsender`.
   - Receives raw WAL streams and flushes them to the standby’s local `pg_wal` storage.
3. **`Startup` Process (Runs on Standby):**
   - The engine core process on the standby.
   - Continuously reads the local standby WAL and applies the changes directly into the standby’s data pages in `shared_buffers`, bringing the standby up to date.

---

### Q2: What is a Replication Slot, and what is the catastrophic disk overflow trap associated with it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[ReplicationSlots]` `[DiskFull]` `[Outage]`

**Answer:**
Under standard streaming replication without replication slots, if a replica goes offline or falls behind due to network issues, the primary checkpointer might delete or recycle older WAL files in `$PGDATA/pg_wal` once `max_wal_size` is reached. When the replica reconnects, the WAL segments it needs are gone, permanently breaking replication (`FATAL: requested WAL segment has already been removed`).

#### The Solution: Physical Replication Slots
```sql
SELECT pg_create_physical_replication_slot('standby_1_slot');
```
A **Replication Slot** instructs the primary node:
> *"Do NOT delete or recycle ANY WAL segment file from disk until the standby associated with this slot has confirmed it has received and replayed it (`restart_lsn`)."*

#### The Catastrophic Production Trap:
- **The Scenario:** Standby 1 crashes, is decommissioned, or suffers a network cable cut. The developer forgets to remove the replication slot on the primary.
- **The Chain Reaction:**
  1. The primary continues accepting writes, generating thousands of 16MB WAL files in `pg_wal/`.
  2. Because the replication slot's `restart_lsn` is frozen in time, the primary’s checkpointer is **strictly forbidden from deleting old WAL segments**!
  3. WAL files accumulate until the primary disk reaches **100% capacity**.
  4. PostgreSQL throws `PANIC: could not write to log file: No space left on device` and **crashes the entire production cluster**!

#### The Senior Mitigation:
In PostgreSQL 13+, always configure **`max_slot_wal_keep_size`**:
```sql
ALTER SYSTEM SET max_slot_wal_keep_size = '50GB';
```
This sets a hard safety ceiling. If an orphaned standby falls behind by more than 50GB, PostgreSQL automatically invalidates the slot and deletes the WAL files, sacrificing the replica to protect the primary from crashing!

---

## 2. Synchronous vs Asynchronous Replication & Durability

### Q3: Contrast Synchronous vs Asynchronous replication in terms of RPO, RTO, and write latency.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RPO]` `[RTO]` `[SynchronousReplication]`

**Answer:**

```text
1. Asynchronous Replication (Default):
Client ──► Primary (Writes WAL & commits locally) ──► Returns OK! (Latency: 2ms)
                   │
                   └─► Streams WAL asynchronously ──► Standby Replica (Lags by N bytes)
   * Trade-off: RPO > 0 (Risk of data loss on primary failure). High write throughput.

2. Synchronous Replication:
Client ──► Primary (Writes WAL) ──► Streams to Standby ──► Standby flushes to disk & Acks
                                                                      │
Client ◄── Returns OK! ONLY after Standby acks! (Latency: Network RTT + 2ms)
   * Trade-off: RPO = 0 (Guaranteed zero data loss). Lower write throughput.
```

| Dimension | Asynchronous Replication | Synchronous Replication (`synchronous_commit = on`) |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **$\text{RPO} > 0$** (Recent writes not yet streamed to replica are lost) | **$\text{RPO} = 0$** (Zero committed data lost on primary failover) |
| **Write Latency** | Low (bounded by local disk speed, ~2ms) | High (bounded by network round-trip time between nodes) |
| **Primary Failure Impact** | High availability; promotion is instant | Standby can be promoted with 100% data fidelity |
| **Standby Outage Impact** | Primary continues writing unaffected | If standby dies, **Primary freezes and blocks all writes**! |

#### Mitigating Standby Outages with Quorum Commit:
To prevent a single dead replica from blocking the primary in synchronous setups, use **Quorum-based synchronous standby names**:
```text
synchronous_standby_names = 'ANY 2 (standby_1, standby_2, standby_3)'
```
Writes proceed as long as *any 2 out of 3* standbys acknowledge the transaction commit.

---

## 3. Logical Replication Architecture & Use Cases

### Q4: How does Logical Replication differ from Physical Streaming Replication? When is it the superior architectural choice?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[LogicalReplication]` `[Upgrades]` `[CDC]`

**Answer:**

```text
Physical Replication:
Primary Disk Blocks ────────Exact 1:1 Byte Mirror────────► Standby Disk Blocks
(Standby must be identical OS architecture, identical major PG version, and read-only)

Logical Replication:
Primary WAL ──► Logical Decoding (pgoutput) ──► Decodes into logical SQL tuples
                                                (INSERT into table A values (...))
                                                        │
                                                        ▼
Subscriber DB (Can have different schema, different PG version, and accept local writes!)
```

#### Architectural Differences:
1. **Physical:** Replicates exact disk block modifications. Standby is a byte-level replica. Standby cannot accept writes and cannot run a different major version of PostgreSQL.
2. **Logical:** Decodes WAL into logical SQL events (`INSERT`, `UPDATE`, `DELETE`) on specific published tables using **Publications and Subscriptions**.

#### Top 4 Use Cases for Logical Replication:
1. **Zero-Downtime Major Version Upgrades:**
   - Replicate from PostgreSQL 14 directly to PostgreSQL 17. Once caught up, switch traffic with <1 second downtime!
2. **Selective / Partial Table Replication:**
   - Replicating only 5 analytics tables to a reporting database rather than the entire 5TB database.
3. **Data Warehousing & Consolidation:**
   - Consolidating data from 10 distinct regional microservice databases into a single central data warehouse.
4. **Cross-Platform / Cross-Cloud Migration:**
   - Migrating from on-premise Linux to AWS Aurora PostgreSQL with zero cutover downtime.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What are the key limitations of PostgreSQL Logical Replication?"  
*Senior Answer:* Logical replication does **not** replicate:
- DDL statements (`CREATE TABLE`, `ALTER TABLE`) — schemas must be pre-created on the subscriber.
- Sequences (serial IDs must be synchronized manually).
- Large Objects (`pg_largeobject`).
- Tables without a valid Primary Key or `REPLICA IDENTITY` (updates and deletes will fail on subscriber).

---

## 4. High Availability & Automated Failover with Patroni

### Q5: How does Patroni orchestrate automated, high-availability failover without human intervention?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[Patroni]` `[HighAvailability]` `[Raft]` `[etcd]`

**Answer:**
**Patroni** is an open-source Python daemon that manages PostgreSQL instances and coordinates automated leader election and failover using a **Distributed Consensus Store (DCS)** such as `etcd`, `Consul`, or Kubernetes API.

```text
Patroni HA Topology:
┌────────────────────────────────────────────────────────┐
│ Distributed Consensus Store (etcd cluster using Raft)  │
│ Key: /service/batman/leader ──► Holds Leader Lease     │
└───────────────────▲────────────────┬───────────────────┘
                    │                │
            Heartbeat Renew          │ Health Check Watch
                    │                │
┌───────────────────┴───────┐  ┌─────┴──────────────────┐
│ Node 1 (Active Leader)    │  │ Node 2 (Standby Replica)│
│  • Patroni Daemon (Leader)│  │  • Patroni Daemon       │
│  • PostgreSQL (Primary)   │  │  • PostgreSQL (Standby) │
└───────────────────────────┘  └────────────────────────┘
```

#### Step-by-Step Automated Failover Sequence:
1. **Heartbeat Maintenance:** The leader Patroni daemon periodically renews its TTL lease key (`/service/batman/leader`) in etcd (e.g., every 10 seconds with a 30s TTL).
2. **Leader Failure:** Node 1 crashes or suffers network partition. Its lease expires in etcd after 30 seconds.
3. **Leader Election:** Standby nodes observe the expired key and initiate a leader election via etcd's Raft consensus.
4. **Candidate Validation (Lag Check):** Before electing a leader, Patroni checks which standby has the highest WAL LSN position. The replica with the least replication lag wins the election to minimize data loss.
5. **Promotion:** The winning standby's Patroni daemon executes `pg_ctl promote`. PostgreSQL increments its **Timeline ID** and begins accepting read-write traffic.
6. **Routing Update:** HAProxy or AWS route tables update health check endpoints (`GET http://patroni:8008/primary`), immediately rerouting client traffic to the new primary!

---

## 5. Split-Brain Elimination & Fencing (STONITH)

### Q6: What is a Split-Brain catastrophe, and how do Fencing Tokens and STONITH eliminate it?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[SplitBrain]` `[STONITH]` `[Fencing]`

**Answer:**
A **Split-Brain** occurs when a network partition separates a cluster into two isolated halves, causing both sides to believe the other is dead.

```text
The Catastrophic Split-Brain Scenario:
                       Network Partition!
                               ⚡
┌─────────────────────────┐    ⚡    ┌─────────────────────────┐
│ Old Primary (Node 1)    │    ⚡    │ Promoted Replica (Node 2)│
│ Client A writes here!   │    ⚡    │ Client B writes here!   │
│ balance = $500          │    ⚡    │ balance = $900          │
└─────────────────────────┘    ⚡    └─────────────────────────┘
RESULT: Divergent WAL timelines! Data is irrecoverably corrupted!
```

#### Mitigations:
1. **Quorum Consensus ($N/2 + 1$):**
   - The DCS (etcd/Consul) requires an odd number of nodes (e.g., 3 or 5).
   - Only the partition that can communicate with a strict majority ($>50\%$) of etcd nodes is allowed to elect or remain a leader. The minority partition must step down immediately.
2. **STONITH ("Shoot The Other Node In The Head"):**
   - Hardware-level fencing. If a node loses consensus, the cluster uses IPMI/iLO or cloud APIs (e.g., AWS EC2 StopInstance) to physically cut power to the old primary before promoting the replica.
3. **The Linux Watchdog Device (`/dev/watchdog`):**
   - Patroni opens a hardware watchdog timer (`/dev/watchdog` or `softdog`).
   - If Patroni fails to ping the watchdog device within a tight timeout (because it lost connection to etcd), the OS kernel **immediately resets/reboots the machine**, guaranteeing the old primary cannot accept stray writes!

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What is `pg_rewind`, and why is it a game-changer when rejoining an old demoted primary to a cluster?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[pg_rewind]` `[Timelines]`

**Answer:**
Historically, if a primary crashed and a replica was promoted, the old primary could not rejoin without re-cloning the entire multi-terabyte database from scratch.
`pg_rewind` identifies the exact point where the WAL timelines diverged, rewinds the old primary's data blocks back to the divergence LSN, copies only the few changed blocks from the new primary, and configures the old node as a standby in **seconds instead of hours**!

---

### Q8: What causes the error `ERROR: canceling statement due to conflict with recovery` on a Hot Standby?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[HotStandbyConflict]` `[Replication]`

**Answer:**
A **Hot Standby Conflict** occurs when a query running on a read replica needs to read rows that the primary node has deleted and vacuumed. When the WAL replay process on the standby reaches that vacuum record, it cannot proceed without removing those rows. If the reader query takes longer than `max_standby_streaming_delay` (default 30s), PostgreSQL cancels the reader query to prevent replication from falling behind. (Fix: increase `max_standby_streaming_delay` or enable `hot_standby_feedback = on`).
