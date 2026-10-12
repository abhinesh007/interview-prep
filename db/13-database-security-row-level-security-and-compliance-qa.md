# 13 — Database Security, Row-Level Security & Compliance

> Row-Level Security (RLS) for Multi-Tenant Isolation, Role-Based Access Control (RBAC), Authentication & SCRAM-SHA-256, `pg_hba.conf`, Data Encryption (`pgcrypto` & TDE), Compliance Auditing with `pgaudit`, and SQL Injection Hardening.

---

## 📑 Table of Contents
1. [Row-Level Security (RLS) for Multi-Tenant SaaS](#1-row-level-security-rls-for-multi-tenant-saas)
2. [Role-Based Access Control (RBAC) & Principle of Least Privilege](#2-role-based-access-control-rbac--principle-of-least-privilege)
3. [Authentication Security: SCRAM-SHA-256 & `pg_hba.conf`](#3-authentication-security-scram-sha-256--pg_hbaconf)
4. [Data Protection at Rest & In-Transit](#4-data-protection-at-rest--in-transit)
5. [Auditing & Compliance (`pgaudit`)](#5-auditing--compliance-pgaudit)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Row-Level Security (RLS) for Multi-Tenant SaaS

### Q1: How do you implement bulletproof multi-tenant isolation in a Shared-Database Shared-Schema PostgreSQL architecture using Row-Level Security (RLS)?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Security  
**Tags:** `[RowLevelSecurity]` `[MultiTenancy]` `[Security]`

**Answer:**
In a multi-tenant SaaS application sharing a single database and schema, relying solely on application-level filters (`WHERE tenant_id = 42`) is fragile: a single missing `WHERE` clause in an ORM query leaks customer data to unauthorized tenants.

**Row-Level Security (RLS)** pushes isolation into the database engine kernel itself, guaranteeing that queries cannot observe or modify rows belonging to other tenants.

```text
Application Client                      PostgreSQL Engine Kernel
┌─────────────────────────────────┐     ┌────────────────────────────────────┐
│ Sets session variable:          │ ──► │ Evaluates RLS Policy automatically:│
│ SET LOCAL app.tenant_id = 't1'; │     │ USING (tenant_id = current_setting)│
├─────────────────────────────────┤     ├────────────────────────────────────┤
│ Query: SELECT * FROM documents; │ ──► │ Rewrites AST Query plan:           │
│                                 │     │ SELECT * FROM documents            │
│                                 │     │ WHERE tenant_id = 't1';            │
└─────────────────────────────────┘     └────────────────────────────────────┘
```

#### Step-by-Step Implementation:
1. **Enable RLS on Relation:**
   ```sql
   ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
   -- Mandatory Security Directive: Force RLS even for table owners!
   ALTER TABLE documents FORCE ROW LEVEL SECURITY;
   ```
2. **Define Multi-Tenant Security Policy:**
   ```sql
   CREATE POLICY tenant_isolation_policy ON documents
   FOR ALL
   USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
   WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
   ```
   - `USING`: Filters rows returned by `SELECT`, `UPDATE`, and `DELETE`.
   - `WITH CHECK`: Enforces that `INSERT` and `UPDATE` statements cannot write a row with a different `tenant_id`.
3. **Application Session Binding (Within Transaction):**
   ```python
   # Inside API Request Handler:
   with db.transaction():
     # Inject tenant claim verified from JWT:
     db.execute(text("SET LOCAL app.current_tenant_id = :tenant_id"), {
         "tenant_id": jwt_claims["tenant_id"]
     })
     # Query now executes with bulletproof hardware isolation:
     docs = db.execute(text("SELECT * FROM documents")).fetchall()
   ```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What is the critical trap with table owners and superusers regarding RLS?"  
*Senior Answer:* By default, **table owners and superusers bypass RLS policies completely**! If your application connects to PostgreSQL as the user that created the tables (or as `postgres`), RLS is silently bypassed.
**Mitigations:**
1. Execute `ALTER TABLE documents FORCE ROW LEVEL SECURITY;` to ensure table owners are bound by the policy.
2. Never connect application services as a superuser; create dedicated unprivileged application roles.

---

## 2. Role-Based Access Control (RBAC) & Principle of Least Privilege

### Q2: How do you design a Least-Privilege Role Hierarchy in PostgreSQL? What security flaw existed in the default `public` schema prior to PG 15?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Architecture  
**Tags:** `[RBAC]` `[LeastPrivilege]` `[Postgres15]`

**Answer:**

```text
Least-Privilege Role Topology:
                     ┌───────────────────────┐
                     │ admin_role (DDL / Mig)│
                     └───────────────────────┘
                                 ▲
                     ┌───────────┴───────────┐
                     │ writer_role (DML R/W) │
                     └───────────────────────┘
                                 ▲
                     ┌───────────┴───────────┐
                     │ reader_role (DML RO)  │
                     └───────────────────────┘
                                 ▲
                     ┌───────────┴───────────┐
                     │ app_user (LOGIN ONLY) │
                     └───────────────────────┘
```

#### Implementation Script:
```sql
-- 1. Create non-login group roles
CREATE ROLE db_reader;
CREATE ROLE db_writer;

-- 2. Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO db_reader;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO db_writer;

-- 3. Configure default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO db_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO db_writer;

-- 4. Create application login role and inherit permissions
CREATE ROLE app_service_user WITH LOGIN PASSWORD 'secure_scram_password';
GRANT db_reader, db_writer TO app_service_user;
```

#### The PostgreSQL 15 Public Schema Security Overhaul:
- **Historical Flaw (PG 14 and older):** By default, the `public` schema granted `CREATE` permission to the pseudo-role `PUBLIC` (all users). Any low-privilege user could create tables, functions, or malicious triggers inside `public`, leading to privilege escalation attacks.
- **The PG 15 Fix:** PostgreSQL 15 revoked the global `CREATE` permission on the `public` schema from `PUBLIC`. Only database owners can create objects in `public` unless explicitly granted.

---

## 3. Authentication Security: SCRAM-SHA-256 & `pg_hba.conf`

### Q3: Why is `SCRAM-SHA-256` superior to legacy `md5` authentication? How do you configure hardened client access in `pg_hba.conf`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Authentication]` `[SCRAM]` `[pg_hba]`

**Answer:**
PostgreSQL supports several authentication methods defined in `$PGDATA/pg_hba.conf`.

#### Why `md5` is Obsolete:
- In PostgreSQL, legacy `md5` authentication does not salt passwords properly (it uses `md5(password + username)`).
- If an attacker compromises the `pg_authid` catalog table, rainbow tables and modern GPUs can crack millions of hashes per second.
- Furthermore, `md5` does not provide mutual authentication: a rogue server can spoof the database.

#### Why `SCRAM-SHA-256` (RFC 5802 / 7677) is the Standard:
1. **Cryptographically Strong Salted Hashing:** Uses PBKDF2 with HMAC-SHA-256 and thousands of iterations.
2. **Zero Password Transmission:** The client and server prove to each other that they possess the secret password through a challenge-response exchange **without ever transmitting the password or its hash over the wire**.
3. **Channel Binding (`SCRAM-SHA-256-PLUS`):** Cryptographically ties the authentication handshake to the TLS certificate, completely eliminating Man-in-the-Middle (MitM) attacks.

#### Hardened `pg_hba.conf` Production Configuration:
```text
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Reject unencrypted local connections:
local   all             all                                     peer

# Enforce TLS encryption and SCRAM-SHA-256 from application VPC subnet:
hostssl production_db   app_user        10.0.0.0/16             scram-sha-256

# Reject all other connections by default:
host    all             all             all                     reject
```

---

## 4. Data Protection at Rest & In-Transit

### Q4: Compare Transparent Data Encryption (TDE) vs Column-Level Encryption with `pgcrypto`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Encryption]` `[pgcrypto]` `[TDE]`

**Answer:**

| Dimension | Transparent Data Encryption (TDE / LUKS / AWS KMS) | Column-Level Application Encryption (`pgcrypto`) |
| :--- | :--- | :--- |
| **Encryption Scope** | Entire storage volume / filesystem pages on disk | Specific sensitive columns (e.g., SSN, credit cards) |
| **Key Location** | Managed by cloud KMS or OS key manager | Held by application service or passed in query |
| **DBA Access** | **DBA can read all data in plain text!** Protects only against stolen physical hard drives. | **DBA CANNOT read data** without application encryption keys! |
| **Index Usability** | Full B-tree indexing on all columns works transparently | **Indexes broken** on encrypted ciphertext; cannot perform range queries |
| **CPU Overhead** | Handled by hardware AES-NI instructions (~1% CPU) | Higher CPU cost per row encryption/decryption in PostgreSQL |

#### Column Encryption with `pgcrypto`:
```sql
CREATE EXTENSION pgcrypto;

-- Encrypt on insert using symmetric AES:
INSERT INTO customers (id, ssn_encrypted)
VALUES (1, pgp_sym_encrypt('123-45-6789', 'master_app_key', 'cipher-algo=aes256'));

-- Decrypt on query:
SELECT pgp_sym_decrypt(ssn_encrypted, 'master_app_key') AS ssn 
FROM customers WHERE id = 1;
```

---

## 5. Auditing & Compliance (`pgaudit`)

### Q5: How do you achieve SOC2 / HIPAA compliance in PostgreSQL using the `pgaudit` extension?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Compliance  
**Tags:** `[pgaudit]` `[Compliance]` `[Security]`

**Answer:**
Standard PostgreSQL logging (`log_statement = 'all'`) is insufficient for compliance: it dumps logs to flat text files, fills disks with noisy internal queries, and lacks structured audit trails.

The **`pgaudit`** extension provides detailed session and object-level audit logging required by SOC2, HIPAA, and PCI-DSS.

#### Production Configuration (`postgresql.conf`):
```text
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'read, write, ddl, role'
pgaudit.log_catalog = off
pgaudit.log_parameter = on
pgaudit.log_relation = on
```

#### Structured Audit Log Entry Output:
```text
AUDIT: SESSION,1,1,READ,SELECT,TABLE,public.patients,"SELECT ssn, diagnosis FROM patients WHERE id = 42;",<not logged>
```
Audit logs record:
- Timestamp, user, database, client IP.
- Exact statement executed.
- Object class (`TABLE`), schema (`public`), relation name (`patients`).
- Parameter values.
- Logs are shipped to immutable SIEM tools (Datadog, Splunk, AWS CloudWatch) to prevent DBAs from tampering with audit trails.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What is the security hazard of `SECURITY DEFINER` on a PostgreSQL stored function? How does an un-set `search_path` lead to arbitrary code execution?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[SecurityDefiner]` `[PrivilegeEscalation]`

**Answer:**
A function declared with `SECURITY DEFINER` executes with the privileges of the **user that created the function** (often `superuser`).
**The Exploit:** If the function does not explicitly set `search_path`, an attacker creates a malicious table or function in a temporary schema or public schema named after a standard function (e.g. `upper()`). When the superuser runs the function, Postgres resolves the attacker's object first, executing arbitrary code as superuser!
**The Mandatory Fix:** Always fix `search_path` on security definer functions:
```sql
CREATE FUNCTION transfer_funds(...) RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$ LANGUAGE sql;
```

---

### Q7: How do you safely format dynamic SQL in PL/pgSQL stored procedures to prevent SQL injection?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / SQL  
**Tags:** `[SQLInjection]` `[PLpgSQL]`

**Answer:**
Never concatenate raw strings inside `EXECUTE`! Use PostgreSQL’s **`format()`** function with format specifiers:
- **`%I`**: Safely quotes **Identifiers** (table names, column names).
- **`%L`**: Safely quotes **Literals** (strings, values).
```sql
-- SECURE DYNAMIC SQL:
EXECUTE format('SELECT * FROM %I WHERE status = %L', table_name, user_status);
```
