# 10 — Data Validation, Pydantic v2 & Serialization

> Pydantic v2 Rust Engine (`pydantic-core`), Breaking Changes from v1, Validator Execution Modes (`before`, `after`, `wrap`, `plain`), Strict Mode, Custom Types via `Annotated`, `computed_field`, and ORM Serialization (`from_attributes`).

---

## 📑 Table of Contents
1. [Pydantic v2 Architecture & The Rust Core Rewrite](#1-pydantic-v2-architecture--the-rust-core-rewrite)
2. [Validator Modes: `@field_validator` & `@model_validator`](#2-validator-modes-field_validator--model_validator)
3. [Type Coercion vs Strict Validation Mode](#3-type-coercion-vs-strict-validation-mode)
4. [High-Performance Serialization & `computed_field`](#4-high-performance-serialization--computed_field)
5. [ORM Interoperability (`from_attributes`) & Common Traps](#5-orm-interoperability-from_attributes--common-traps)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Pydantic v2 Architecture & The Rust Core Rewrite

### Q1: Why was Pydantic v2 rewritten in Rust (`pydantic-core`), and what are the primary architectural and breaking changes from v1?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[PydanticV2]` `[Rust]` `[Performance]`

**Answer:**
Pydantic v1 was implemented in pure Python. Validating nested schemas and serializing large datasets required traversing Python objects and calling hundreds of thousands of Python functions, creating severe CPU bottlenecks in API frameworks like FastAPI.

Pydantic v2 moved the entire validation and serialization engine to **`pydantic-core`**, a compiled library written in **Rust**:

```text
Incoming JSON Byte Stream
        │
┌───────▼────────────────────────────────────────────────┐
│             pydantic-core (Rust Layer)                 │
│  - Parses JSON bytes directly into Rust structs        │
│  - Validates types and constraints without Python GIL  │
│  - 2x to 50x faster than pure Python!                  │
└───────┬────────────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────────────────────┐
│               Python Application Layer                 │
│  - Returns clean, strongly-typed Python model instances│
└────────────────────────────────────────────────────────┘
```

#### Key Migration Breaking Changes:

| Concept / Method | Pydantic v1 (Deprecated) | Pydantic v2 (Modern Idiomatic) |
|---|---|---|
| **Model to Dict** | `model.dict()` | `model.model_dump()` |
| **Model to JSON String**| `model.json()` | `model.model_dump_json()` (Direct Rust serializer) |
| **Parsing Dict** | `Model.parse_obj(data)` | `Model.model_validate(data)` |
| **Parsing JSON String** | `Model.parse_raw(json_str)`| `Model.model_validate_json(json_str)` |
| **Model Configuration** | `class Config:` inner class | `model_config = ConfigDict(...)` attribute |
| **Field Validators** | `@validator("field")` | `@field_validator("field", mode="after")` |
| **Root Validators** | `@root_validator` | `@model_validator(mode="after")` |
| **ORM Conversion Mode** | `orm_mode = True` | `from_attributes = True` |

---

## 2. Validator Modes: `@field_validator` & `@model_validator`

### Q2: Explain the four validator execution modes (`before`, `after`, `wrap`, `plain`) in Pydantic v2. When should you use each?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[PydanticV2]` `[Validators]` `[ValidationModes]`

**Answer:**
In Pydantic v2, `@field_validator` provides explicit control over **when** validation runs relative to Pydantic's internal type-coercion engine:

```python
from pydantic import BaseModel, field_validator, ValidationInfo


class UserRegistration(BaseModel):
  email: str
  password: str

  # 1. mode='after' (Default): Runs AFTER Pydantic has coerced and validated the type.
  # 'v' is guaranteed to be a string here.
  @field_validator("email", mode="after")
  @classmethod
  def validate_email_domain(cls, v: str) -> str:
    if not v.endswith("@company.com"):
      raise ValueError("Only @company.com email addresses are allowed")
    return v.lower()

  # 2. mode='before': Runs BEFORE Pydantic attempts any parsing or coercion.
  # Useful for sanitizing raw input (e.g. trimming whitespace from dirty input).
  @field_validator("password", mode="before")
  @classmethod
  def sanitize_raw_input(cls, v: object) -> object:
    if isinstance(v, str):
      return v.strip()
    return v
```

#### The Four Modes:
1. **`mode='after'` (Default):** Runs after standard type validation. The value `v` is already the coerced target type. Best for business logic rules.
2. **`mode='before'`:** Runs before standard type validation. Input `v` can be anything (`str`, `dict`, `int`). Best for data cleanup and normalization.
3. **`mode='wrap'`:** Takes a `handler` callable and wraps standard validation. Allows inspecting raw input, calling `handler(v)`, catching errors, and returning custom fallbacks.
4. **`mode='plain'`:** Completely bypasses Pydantic's built-in validation for that field; you assume full responsibility for validating the type.

---

## 3. Type Coercion vs Strict Validation Mode

### Q3: How does Pydantic v2 handle Type Coercion, and how do you enforce Strict Mode globally or per-field?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[PydanticV2]` `[StrictValidation]` `[Types]`

**Answer:**
By default, Pydantic uses **lax type coercion** to facilitate web forms and JSON payloads:
- A string `"123"` is automatically coerced into `int(123)`.
- `"true"`, `"yes"`, `1` are coerced into `True` for boolean fields.

In high-security APIs (banking, payments), implicit coercion can lead to subtle bugs. Pydantic v2 provides **Strict Mode**:

```python
from pydantic import BaseModel, ConfigDict, StrictInt, StrictStr


# Option 1: Global Strict Mode on the Model
class PaymentTransaction(BaseModel):
  model_config = ConfigDict(strict=True)

  account_id: int
  amount_cents: int
  reference: str


# Attempting coercion fails immediately in strict mode:
# PaymentTransaction(account_id="101", amount_cents=5000, reference="REF")
# -> ValidationError: Input should be a valid integer [type=int_type]
```

```python
# Option 2: Per-field Strict Types using Annotated or Strict types:
class MixedModel(BaseModel):
  flexible_id: int  # Accepts "100" and coerces to 100
  strict_security_code: StrictInt  # Rejects "100", only accepts integer 100
```

---

## 4. High-Performance Serialization & `computed_field`

### Q4: How do you declare computed properties that are included in JSON serialization? How do you customize field serialization?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[PydanticV2]` `[Serialization]` `[computed_field]`

**Answer:**
In Pydantic v1, including dynamic values in JSON required custom root validators or property hacks. In Pydantic v2, use the **`@computed_field`** decorator:

```python
from decimal import Decimal
from pydantic import BaseModel, computed_field, field_serializer


class OrderItem(BaseModel):
  item_name: str
  unit_price: Decimal
  quantity: int

  @computed_field
  @property
  def total_price(self) -> Decimal:
    """Included in model_dump() and model_dump_json() automatically!"""
    return self.unit_price * self.quantity

  @field_serializer("unit_price", "total_price")
  def serialize_currency(self, val: Decimal) -> str:
    """Formats Decimals as two-decimal string in JSON output."""
    return f"{val:.2f}"


order = OrderItem(
    item_name="Mechanical Keyboard", unit_price=Decimal("129.99"), quantity=2
)
print(order.model_dump_json())
# {"item_name":"Mechanical Keyboard","unit_price":"129.99","quantity":2,"total_price":"259.98"}
```

---

## 5. ORM Interoperability (`from_attributes`) & Common Traps

### Q5: How do you convert SQLAlchemy ORM instances to Pydantic v2 models? What is the `from_attributes` setting?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[PydanticV2]` `[SQLAlchemy]` `[ORM]`

**Answer:**
By default, Pydantic attempts to read fields from dictionaries using key lookup (`data["id"]`). SQLAlchemy ORM instances are objects whose columns are attributes (`instance.id`), not dictionary keys.

To allow Pydantic to read data by attribute access on ORM models, enable **`from_attributes = True`** (formerly `orm_mode = True` in v1):

```python
from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  username: str
  email: str


# Usage with an active SQLAlchemy User model instance:
db_user = await db_session.get(User, 1)

# Translates attribute lookups (db_user.id, db_user.username) into Pydantic model:
user_dto = UserResponse.model_validate(db_user)
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What happens if you define a mutable default value (like `tags: list[str] = []`) in a Pydantic model?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Defaults]`

**Answer:**
Unlike standard Python functions (where mutable defaults share the same object in memory), Pydantic **deep-copies default values** upon instance creation. However, the recommended and type-safe modern practice is to use `Field(default_factory=list)` to avoid static analysis warnings from Ruff/Mypy.

---

### Q7: What is the difference between `model_validate(data)` and `model_validate_json(json_str)`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[pydantic-core]`

**Answer:**
- `model_validate(data)` takes an already-parsed Python object (dict, list, instance) and validates it.
- `model_validate_json(json_str)` takes a raw JSON string or bytes and parses it **directly in Rust inside `pydantic-core`**, completely bypassing Python's `json.loads()`. It is up to **3x faster** and consumes significantly less memory.
