# 15 — Enterprise Database System Design & Production Scenarios

> Enterprise Database System Design using the **RADIO Framework** (Requirements, Architecture, Data Model, Interface Contracts, Optimizations & Resiliency): High-Concurrency Flash Sale Inventory, Zero-Downtime Schema Migrations (Expand/Contract on 100M+ Rows), Multi-Tenant SaaS Architecture, and Disaster Recovery with Point-in-Time Recovery (PITR).

---

## 📑 Table of Contents
1. [Scenario 1: High-Concurrency Flash Sale Inventory Reservation](#1-scenario-1-high-concurrency-flash-sale-inventory-reservation)
2. [Scenario 2: Zero-Downtime Schema Migrations on a 100M+ Row Table](#2-scenario-2-zero-downtime-schema-migrations-on-a-100m-row-table)
3. [Scenario 3: Multi-Tenant B2B SaaS Database Architecture](#3-scenario-3-multi-tenant-b2b-saas-database-architecture)
4. [Scenario 4: Disaster Recovery & Point-in-Time Recovery (PITR)](#4-scenario-4-disaster-recovery--point-in-time-recovery-pitr)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Scenario 1: High-Concurrency Flash Sale Inventory Reservation

### Q1: System Design: Architect an inventory reservation system capable of selling 10,000 items in 10 seconds under 100,000 concurrent user requests with ZERO overselling.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[RADIO]` `[FlashSale]` `[LockContention]` `[Concurrency]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Functional Requirements:**
  - Reserve inventory for a flash-sale item during intense spikes.
  - Hard constraint: **Zero overselling** under any failure mode.
  - Unclaimed reservations expire and return to the pool after 10 minutes.
- **Non-Functional Requirements:**
  - Scale: 100,000 concurrent incoming purchase attempts.
  - Latency: p99 response time $< 100\text{ms}$.
  - Durability: Reservations must survive database restarts.

#### 2. Architecture & High-Level Topology (A)

```text
┌──────────────┐         100,000 QPS          ┌─────────────────────────┐
│ Web / Mobile │ ───────────────────────────► │ API Gateway Tier        │
│ Clients      │                              └────────────┬────────────┘
└──────────────┘                                           │
                                                           ▼
                                              ┌─────────────────────────┐
                                              │ Redis Lua Counter Tier  │ (Fast Reject)
                                              │ (Rejects 90,000 users)  │
                                              └────────────┬────────────┘
                                                           │ Passes 10,000 candidates
                                                           ▼
                                              ┌─────────────────────────┐
                                              │ PgBouncer Pool (Trans)  │
                                              └────────────┬────────────┘
                                                           │ 30 Connections
                                                           ▼
                                              ┌─────────────────────────┐
                                              │ PostgreSQL Cluster      │
                                              │ Unit Allocation Model   │
                                              └─────────────────────────┘
```

#### 3. Data Model & Database Strategy (D)
- **The Fatal Anti-Pattern:** A single inventory balance row:
  `UPDATE inventory SET stock = stock - 1 WHERE item_id = 42 AND stock > 0;`
  *Why it fails:* 10,000 concurrent transactions fight for the exact same physical row lock on Item 42. Lock contention causes connection queue saturation, thread thrashing, and server freeze!
- **The Scalable Solution: Unit-Level Allocation Model:**
  Instead of a single counter, pre-populate 10,000 discrete inventory unit rows:

```sql
CREATE TABLE inventory_units (
    id BIGSERIAL PRIMARY KEY,
    item_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RESERVED', 'SOLD'
    reserved_by UUID,
    reserved_until TIMESTAMPTZ
);
CREATE INDEX idx_inv_avail ON inventory_units (item_id, status) WHERE status = 'AVAILABLE';
```

#### 4. Interface & Core Reservation Query (I)
Use `SELECT ... FOR UPDATE SKIP LOCKED` to claim a unit with zero lock contention:

```sql
WITH target_unit AS (
    SELECT id 
    FROM inventory_units 
    WHERE item_id = 42 AND status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE inventory_units
SET status = 'RESERVED',
    reserved_by = :user_id,
    reserved_until = NOW() + INTERVAL '10 minutes'
FROM target_unit
WHERE inventory_units.id = target_unit.id
RETURNING inventory_units.id;
```
If `rowcount == 0`, the item is completely sold out.

#### 5. Optimizations, Resiliency & Expiration (O)
- **Front-Door Fast Reject with Redis:** Pre-load the inventory count into Redis. Use a Lua script (`DECRBY`) to decrement the counter atomically. The 90,000 users arriving after the count hits 0 are rejected immediately at the Redis edge, shielding the database from unnecessary traffic.
- **Auto-Releasing Expired Reservations:** A background worker runs every 10 seconds:
  ```sql
  UPDATE inventory_units 
  SET status = 'AVAILABLE', reserved_by = NULL, reserved_until = NULL 
  WHERE status = 'RESERVED' AND reserved_until < NOW();
  ```

---

## 2. Scenario 2: Zero-Downtime Schema Migrations on a 100M+ Row Table

### Q2: System Design: Design an automated zero-downtime database migration playbook to alter a mission-critical 100M-row table handling 5,000 writes/sec.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[RADIO]` `[ZeroDowntime]` `[Migrations]` `[ExpandContract]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Objective:** Alter table `orders` (100 million rows, 500GB, 5,000 writes/sec):
  1. Add non-nullable column `status_code VARCHAR(20) NOT NULL DEFAULT 'PENDING'`.
  2. Create supporting index.
  3. Rename legacy column `order_note` to `instructions`.
- **Constraint:** Zero application downtime, zero user request timeouts, zero blocking of `INSERT` or `UPDATE` queries.

#### 2. Architecture & The Expand / Contract Pattern (A)

```text
The Expand / Contract (Parallel Run) Migration Ladder:
Phase 1: EXPAND           Phase 2: DUAL-WRITE       Phase 3: BACKFILL         Phase 4: CONTRACT
┌──────────────┐          ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ Schema       │          │ App writes   │          │ Background   │          │ App reads    │
│ expanded:    │ ───────► │ to BOTH old  │ ───────► │ job backfills│ ───────► │ new schema;  │
│ new column   │          │ and new cols │          │ old records  │          │ old column   │
│ added        │          │              │          │ in batches   │          │ dropped!     │
└──────────────┘          └──────────────┘          └──────────────┘          └──────────────┘
```

#### 3. Execution Blueprint & Concrete SQL Steps (D & I)

##### Step 1: Add Column with Metadata-Only Default (PostgreSQL 11+)
In Postgres 11+, adding a column with a constant default does **not** rewrite the table on disk; it simply records the default in `pg_attribute` catalog metadata in milliseconds!
```sql
BEGIN;
SET LOCAL lock_timeout = '2s'; -- Safety circuit breaker!
ALTER TABLE orders ADD COLUMN status_code VARCHAR(20) DEFAULT 'PENDING';
COMMIT;
```

##### Step 2: Add `NOT NULL` Constraint Without Locking
Never run `ALTER TABLE orders ALTER COLUMN status_code SET NOT NULL;` on a 100M row table (it takes an `ACCESS EXCLUSIVE` lock and performs a full table validation scan, freezing all traffic for 10 minutes!).
Instead, use a **Check Constraint with `NOT VALID`**:
```sql
-- Step 2a: Add constraint instantly without validating historical rows (0ms lock):
ALTER TABLE orders ADD CONSTRAINT chk_status_not_null 
    CHECK (status_code IS NOT NULL) NOT VALID;

-- Step 2b: Validate constraint concurrently in background (acquires only SHARE UPDATE EXCLUSIVE):
ALTER TABLE orders VALIDATE CONSTRAINT chk_status_not_null;
```

##### Step 3: Create Index Concurrently
```sql
CREATE INDEX CONCURRENTLY idx_orders_status_code ON orders (status_code);
```

##### Step 4: Zero-Downtime Column Renaming
Renaming a column directly breaks running instances of the application that are currently running old code expecting the old name.
**The Safe Solution:**
1. Add the new column `instructions`.
2. Deploy App Version 1: Writes to both `order_note` and `instructions`.
3. Backfill historical rows in primary-key batches of 5,000:
   ```sql
   UPDATE orders SET instructions = order_note 
   WHERE id BETWEEN :start_id AND :end_id AND instructions IS NULL;
   ```
4. Deploy App Version 2: Reads and writes exclusively to `instructions`.
5. Drop `order_note` safely.

#### 4. Resiliency & Disaster Guardrails (O)
- **Mandatory `lock_timeout`:** Always prepend migration scripts with `SET lock_timeout = '2s'`. If the migration script cannot acquire its table lock within 2 seconds because a long-running reader is active, it immediately aborts, preventing application traffic from queueing up behind it!

---

## 3. Scenario 3: Multi-Tenant B2B SaaS Database Architecture

### Q3: System Design: Architect a multi-tenant B2B SaaS database serving 10,000 tenants ranging from small businesses to Fortune 500 enterprises with strict data isolation.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[RADIO]` `[MultiTenancy]` `[RLS]` `[Enterprise]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Functional Requirements:**
  - Support 10,000 SMB tenants (cost-effective, shared infrastructure).
  - Support 50 Enterprise tenants (require isolated databases, custom backup policies, zero noisy-neighbor interference).
  - Strict logical and physical data isolation (SOC2 / HIPAA compliance).

#### 2. Architecture: The Hybrid Tiered Multi-Tenancy Model (A)

```text
┌────────────────────────────────────────────────────────┐
│ API Gateway (Extracts Tenant ID from JWT Token)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Tenant Routing Layer (Metadata Directory)              │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
   Tier 1: SMB / Standard Tenants         │ Tier 2: Enterprise Tier (Dedicated)
               │                          │
               ▼                          ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Shared PostgreSQL Cluster    │  │ Dedicated PostgreSQL DB      │
│ (Row-Level Security Enabled) │  │ (Physical Host Isolation for │
│ Single DB, Shared Schemas    │  │  Fortune 500 Enterprise)     │
└──────────────────────────────┘  └──────────────────────────────┘
```

#### 3. Data Model & Security Strategy (D)
- **Standard Tier (Pooled / Shared):**
  - All tables include `tenant_id UUID NOT NULL`.
  - Enforced via **PostgreSQL Row-Level Security (RLS)**:
    ```sql
    CREATE POLICY tenant_isolation ON accounts 
    FOR ALL 
    USING (tenant_id = current_setting('app.tenant_id')::uuid);
    ```
- **Enterprise Tier (Siloed):**
  - Dedicated AWS Aurora PostgreSQL clusters per enterprise tenant.
  - Dedicated VPC peering and customer-managed KMS encryption keys (BYOK).

#### 4. Preventing the "Noisy Neighbor" Problem (O)
- **PgBouncer Sub-Pools:** Assign SMB tenants to a shared PgBouncer pool capped at 40 database connections. An SMB tenant executing a massive unindexed report can never starve connections from other tenants.
- **Dynamic Tier Migration:** Build an automated pipeline using **Logical Replication** to promote an SMB tenant from the shared database into a dedicated enterprise database in real time with zero downtime as they upgrade their subscription.

---

## 4. Scenario 4: Disaster Recovery & Point-in-Time Recovery (PITR)

### Q4: System Design: Design a Disaster Recovery (DR) and Point-in-Time Recovery (PITR) pipeline for a 5TB PostgreSQL cluster with RPO $\le 1$ min and RTO $\le 15$ min.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `[RADIO]` `[DisasterRecovery]` `[PITR]` `[pgBackRest]`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)
- **Database Size:** 5 Terabytes.
- **RPO (Recovery Point Objective):** $\le 1$ minute (no more than 60 seconds of data lost).
- **RTO (Recovery Time Objective):** $\le 15$ minutes (restored to operational service within 15 minutes).
- **Disaster Scenario:** Developer mistakenly runs `DROP TABLE customers;` at 14:32:15 UTC. The system must restore the database to 14:32:14 UTC without losing other tables' data.

#### 2. Architecture & Backup Topology (A)

```text
Primary Database Server                         Encrypted Cloud Storage (S3 / GCS)
┌─────────────────────────────────┐             ┌──────────────────────────────────┐
│ PostgreSQL Cluster (5TB)        │             │ pgBackRest S3 Repository         │
│  • pgBackRest Agent             │             │                                  │
│  • Continuous WAL Archiving     │ ──Stream───►│ • Base Backups (Full / In臟remental│
│    (archive_command)            │   WALs      │ • Continuous WAL Segment Stream  │
└─────────────────────────────────┘             └────────────────┬─────────────────┘
                                                                 │
                                                                 ▼ Recovery Replay
                                                ┌──────────────────────────────────┐
                                                │ Staging / DR Recovery Instance   │
                                                │ Replays WAL to exact timestamp   │
                                                └──────────────────────────────────┘
```

#### 3. Implementation Blueprint (D & I)
1. **Continuous WAL Archiving with `pgBackRest`:**
   - Instead of basic `rsync` or shell scripts, use **pgBackRest** with parallel compression (`lz4`) streaming WAL segments to S3 within seconds of creation:
     ```text
     archive_command = 'pgbackrest --stanza=prod archive-push %p'
     ```
2. **Weekly Full + Daily Differential Backups:**
   - Sunday: Full physical backup (5TB).
   - Mon–Sat: Differential backup (only blocks modified since Sunday).
3. **Restoring to the Exact Second Before Disaster (PITR):**
   ```text
   # pgbackrest.conf on recovery node:
   [prod]
   type=standby
   recovery-target-time='2026-10-12 14:32:14 UTC'
   recovery-target-action=promote
   ```
   Execute restore command:
   ```bash
   pgbackrest --stanza=prod --delta --type=time "--target=2026-10-12 14:32:14 UTC" restore
   ```

#### 4. Achieving RTO $\le 15$ Minutes for a 5TB Database (O)
- **The Bottleneck:** Downloading 5TB from S3 over the network takes hours, violating the 15-minute RTO!
- **The Production Solution:**
  1. **EBS / SAN Storage Snapshots:** Pair pgBackRest with automated **hourly AWS EBS volume snapshots**.
  2. Restore the 5TB volume from the latest EBS snapshot in **2 minutes**.
  3. pgBackRest only needs to download and replay the remaining 32 minutes of WAL segments from S3, bringing recovery time down to **under 8 minutes total**!

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q5: How do you verify that your PostgreSQL backups actually work before a disaster strikes?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / BestPractices  
**Tags:** `[Backups]` `[DR]`

**Answer:**
**Automated Recovery Fire Drills:** An unverified backup is not a backup. Build an automated CI/CD pipeline that spins up an ephemeral staging instance every night, restores the latest base backup and WAL stream from S3, executes `pg_isready` and a test integrity query suite, and alerts on Slack if recovery fails.

---

### Q6: What is the difference between `recovery_target_time` and `recovery_target_xid` in PITR?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[PITR]` `[XID]`

**Answer:**
- `recovery_target_time`: Stops recovery replay at an exact wall-clock timestamp (e.g., `'2026-10-12 14:32:14'`).
- `recovery_target_xid`: Stops recovery immediately prior to a specific Transaction ID (XID). This is superior when an exact rogue transaction ID is known (e.g. from audit logs) because wall-clock timestamps can interleave with concurrent legitimate transactions.
