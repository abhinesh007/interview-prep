# 11 — Database Layers, Async SQLAlchemy 2.0 & Alembic

> SQLAlchemy 2.0 Modern Declarative Syntax (`Mapped`, `mapped_column`), Async Engine & Sessions (`AsyncSession`), The `MissingGreenlet` Lazy-Loading Trap, Eager Loading (`selectinload` vs `joinedload`), Connection Pool Sizing, and Zero-Downtime Migrations with Alembic.

---

## 📑 Table of Contents
1. [SQLAlchemy 2.0 Architecture & Modern Declarative Syntax](#1-sqlalchemy-20-architecture--modern-declarative-syntax)
2. [The #1 Async SQLAlchemy Trap: `MissingGreenlet` & Eager Loading](#2-the-1-async-sqlalchemy-trap-missinggreenlet--eager-loading)
3. [Connection Pooling Mechanics & Pool Sizing Equations](#3-connection-pooling-mechanics--pool-sizing-equations)
4. [Concurrency Control: Optimistic vs Pessimistic Locking](#4-concurrency-control-optimistic-vs-pessimistic-locking)
5. [Database Migrations with Async Alembic (Expand/Contract Pattern)](#5-database-migrations-with-async-alembic-expandcontract-pattern)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. SQLAlchemy 2.0 Architecture & Modern Declarative Syntax

### Q1: How does SQLAlchemy 2.0 differ from 1.4? How do you define modern typed declarative models?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[SQLAlchemy2]` `[AsyncSession]` `[Typing]`

**Answer:**
SQLAlchemy 2.0 unified the Core and ORM APIs, deprecating the legacy chaining query interface (`session.query(User).filter(...)`) in favor of explicit, type-safe SQL statements (`select(User).where(...)`). It introduced first-class support for Python type annotations via **`Mapped`** and **`mapped_column`**:

```python
from datetime import datetime
from sqlalchemy import ForeignKey, String, func, select
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


# Base class incorporating AsyncAttrs for async inspection
class Base(AsyncAttrs, DeclarativeBase):
  pass


class User(Base):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(primary_key=True)
  email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
  created_at: Mapped[datetime] = mapped_column(server_default=func.now())

  # 1-to-Many Relationship:
  orders: Mapped[list["Order"]] = relationship(
      back_populates="user", cascade="all, delete-orphan"
  )


class Order(Base):
  __tablename__ = "orders"

  id: Mapped[int] = mapped_column(primary_key=True)
  amount_cents: Mapped[int]
  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

  user: Mapped["User"] = relationship(back_populates="orders")
```

#### Configuring the Async Engine:
```python
DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/app_db"

async_engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,  # Detects stale/dropped sockets
    echo=False,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Critical for async: prevents re-fetching upon commit!
)
```

---

## 2. The #1 Async SQLAlchemy Trap: `MissingGreenlet` & Eager Loading

### Q2: 🐛 The Senior Interview Outage: What causes `sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called`, and how do you resolve it?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[MissingGreenlet]` `[EagerLoading]` `[AsyncIO]`

**Answer:**
This is the single most common exception encountered by teams migrating to async SQLAlchemy.

#### What Causes It:
In traditional synchronous SQLAlchemy, accessing an unpopulated relationship attribute triggers **implicit lazy loading**:
```python
user = (await session.execute(select(User).where(User.id == 1))).scalar_one()
# Later in a template or serializer:
print(user.orders)  # 💥 RAISES MissingGreenlet IN ASYNC!
```

In an asynchronous runtime, database I/O **must be explicitly awaited**. Accessing `user.orders` is a synchronous attribute access; Python syntax does not allow an implicit `await` behind a property getter. Because the relationship was not loaded upfront, SQLAlchemy attempts to trigger I/O without an active greenlet bridge, throwing `MissingGreenlet`.

#### The Fix: Explicit Eager Loading Strategies
You must eagerly instruct SQLAlchemy which relationships to query upfront:

```python
from sqlalchemy.orm import joinedload, selectinload


# 1. selectinload (Optimal for 1-to-Many & Many-to-Many relationships):
# Emits two queries: SELECT users ... followed by SELECT orders WHERE user_id IN (1, ...)
async def get_user_with_orders(session: AsyncSession, user_id: int) -> User:
  stmt = select(User).options(selectinload(User.orders)).where(User.id == user_id)
  result = await session.execute(stmt)
  return result.scalar_one()


# 2. joinedload (Optimal for Many-to-1 relationships):
# Emits a single SQL query using a LEFT OUTER JOIN:
async def get_order_with_user(session: AsyncSession, order_id: int) -> Order:
  stmt = select(Order).options(joinedload(Order.user)).where(Order.id == order_id)
  result = await session.execute(stmt)
  return result.scalar_one()
```

---

## 3. Connection Pooling Mechanics & Pool Sizing Equations

### Q3: How do database connection pools work in SQLAlchemy? How do you calculate optimal pool size to prevent database starvation?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[ConnectionPool]` `[PostgreSQL]` `[Sizing]`

**Answer:**
Connecting to PostgreSQL incurs heavy OS overhead (forking backend processes, allocating memory buffers, SSL/TLS handshake). Connection pooling reuses persistent open TCP sockets across HTTP requests.

```text
Incoming API Requests
   │   │   │   │   │
┌──▼───▼───▼───▼───▼─────────────────────────────────────┐
│             SQLAlchemy Connection Pool (QueuePool)     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Socket 1     │  │ Socket 2     │  │ Socket 3     │  │
│  │ (Active)     │  │ (Active)     │  │ (Available)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────┬─────────────────────────┘
                               │ Persistent TCP Connections
┌──────────────────────────────▼─────────────────────────┐
│              PostgreSQL Database Server                │
│              (max_connections = 200)                   │
└────────────────────────────────────────────────────────┘
```

#### Pool Sizing Formula:
PostgreSQL's default `max_connections` is usually 100–200. Sizing too large destroys database cache locality and saturates disk I/O.

$$\text{Max DB Connections} \ge (\text{Number of App Nodes}) \times (\text{Gunicorn Workers per Node}) \times (\text{pool\_size} + \text{max\_overflow})$$

#### Example:
If you have **4 Kubernetes Pods**, each running **4 Gunicorn Workers**:
Total worker processes = $4 \times 4 = 16$.
If each worker sets `pool_size=10` and `max_overflow=5`:
Peak potential connections = $16 \times (10 + 5) = \mathbf{240\text{ connections}}$! (Exceeds database limit $\rightarrow$ `FATAL: too many connections`).

#### Best Practices:
1. Set `pool_size=5` and `max_overflow=2` per worker for containerized setups.
2. In large-scale architectures (>20 pods), deploy **PgBouncer** in transaction pooling mode between SQLAlchemy and PostgreSQL, and configure SQLAlchemy with `NullPool` (or small pool).

---

## 4. Concurrency Control: Optimistic vs Pessimistic Locking

### Q5: How do you prevent double-spending or inventory race conditions in SQLAlchemy using Optimistic and Pessimistic locking?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Locking]` `[Transactions]` `[ACID]`

**Answer:**

#### 1. Pessimistic Locking (`SELECT FOR UPDATE`):
Locks the row at the database level for the duration of the transaction. Any concurrent transaction attempting to read or write this row **blocks and waits**:

```python
async def deduct_inventory_pessimistic(
    session: AsyncSession, product_id: int, quantity: int
):
  async with session.begin():
    # SELECT ... FOR UPDATE locks the database row immediately:
    stmt = (
        select(Product)
        .where(Product.id == product_id)
        .with_for_update(nowait=False)
    )
    product = (await session.execute(stmt)).scalar_one()

    if product.stock < quantity:
      raise ValueError("Insufficient inventory")

    product.stock -= quantity
```

#### 2. Optimistic Locking (Version Column):
Does not lock the row. It adds an integer `version_id` column. On update, it checks that the version has not changed:

```python
class Product(Base):
  __tablename__ = "products"
  id: Mapped[int] = mapped_column(primary_key=True)
  stock: Mapped[int]
  version: Mapped[int] = mapped_column(default=1)

  __mapper_args__ = {"version_id_col": version}
```
If another transaction updated the row in the interim, SQLAlchemy automatically raises `sqlalchemy.orm.exc.StaleDataError`. The application can catch this and retry.

---

## 5. Database Migrations with Async Alembic (Expand/Contract Pattern)

### Q5: How do you perform zero-downtime database migrations with Alembic in a high-traffic production service?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Alembic]` `[ZeroDowntime]` `[Migrations]`

**Answer:**
Directly running destructive migrations (renaming columns, dropping tables, or adding non-nullable columns without defaults) locks database tables and breaks running application pods that expect the old schema.

#### The Expand / Contract Migration Pattern:

```text
Phase 1: EXPAND (Deploy DB Migration First)
  - Add new column 'phone_number' as NULLABLE.
  - Both old and new columns exist. Old app pods continue working.

Phase 2: DUAL-WRITE (Deploy App Release)
  - New app code writes to BOTH 'old_phone' and 'phone_number'.
  - Backfill existing rows via background script.

Phase 3: READ-SWITCH (Deploy Next App Release)
  - App reads exclusively from 'phone_number'. Writes only to 'phone_number'.

Phase 4: CONTRACT (Deploy Final DB Migration)
  - Add NOT NULL constraint to 'phone_number'.
  - Drop deprecated 'old_phone' column safely.
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why is `pool_pre_ping=True` essential in containerized cloud environments (AWS RDS / GCP Cloud SQL)?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[RDS]`

**Answer:**
Cloud stateful firewalls, load balancers, and RDS maintenance silently terminate idle TCP sockets after a timeout without sending a TCP `FIN` or `RST` packet. Without `pool_pre_ping=True`, SQLAlchemy attempts to use the dead connection handle from the pool, throwing `OperationalError: SSL SYSCALL error: EOF detected` on the next user request. `pool_pre_ping=True` issues a lightweight `SELECT 1` ping before handing the connection to the application, transparently recycling dead sockets.

---

### Q7: Why is `expire_on_commit=False` critical when using `async_sessionmaker`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[AsyncSession]`

**Answer:**
By default in synchronous SQLAlchemy, `expire_on_commit=True` marks all model attributes as expired after `commit()`. Accessing `user.name` after commit causes SQLAlchemy to automatically re-query the database. In async SQLAlchemy, this implicit re-query triggers the dreaded `MissingGreenlet` error! Setting `expire_on_commit=False` ensures committed data remains cached in memory on the object.
