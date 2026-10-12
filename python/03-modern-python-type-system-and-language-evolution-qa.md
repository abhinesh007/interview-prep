# 03 — Modern Python Type System & Language Evolution

> Modern Python 3.10–3.13 Evolution, Structural Pattern Matching (`match`/`case`), Generics & PEP 695 Syntax, Protocols vs ABCs, Exception Groups (`except*`), Per-Interpreter GIL (PEP 684), and Free-Threaded CPython (PEP 703).

---

## 📑 Table of Contents
1. [Structural Pattern Matching (Python 3.10+ PEP 634)](#1-structural-pattern-matching-python-310-pep-634)
2. [Advanced Type Hints & Generics (Python 3.12 PEP 695)](#2-advanced-type-hints--generics-python-312-pep-695)
3. [Nominal Subtyping (`ABC`) vs Structural Subtyping (`Protocol`)](#3-nominal-subtyping-abc-vs-structural-subtyping-protocol)
4. [Exception Groups & `except*` Handling (Python 3.11+ PEP 654)](#4-exception-groups--except-handling-python-311-pep-654)
5. [CPython 3.12 & 3.13 Runtime Evolution (Per-Interpreter GIL & PEP 703)](#5-cpython-312--313-runtime-evolution-per-interpreter-gil--pep-703)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Structural Pattern Matching (Python 3.10+ PEP 634)

### Q1: How does Structural Pattern Matching (`match`/`case`) work in Python 3.10+, and how does it fundamentally differ from standard C/Java `switch` statements?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[PatternMatching]` `[Python3.10]` `[AST]`

**Answer:**
Structural Pattern Matching (PEP 634) is not merely a `switch/case` statement for testing equality on numbers or strings; it is an expressive **data deconstruction engine** that simultaneously matches structure, validates types, extracts variables, and applies conditional guards.

```python
from dataclasses import dataclass


@dataclass
class HttpRequest:
  method: str
  path: str
  headers: dict[str, str]


@dataclass
class WebSocketRequest:
  endpoint: str
  token: str


def route_request(request: HttpRequest | WebSocketRequest) -> str:
  match request:
    case HttpRequest(
        method="GET", path="/health", headers={"x-probe": "kubernetes"}
    ):
      return "Health check OK (Internal K8s)"

    case HttpRequest(method="POST", path="/api/v1/orders") as req if (
        "authorization" in req.headers
    ):
      return "Authorized Order Processing"

    case WebSocketRequest(endpoint="/ws/feed", token=str(jwt)) if len(jwt) > 10:
      return f"WebSocket Feed Connected with Token: {jwt[:6]}..."

    case HttpRequest():
      return "Generic HTTP Fallback"

    case _:
      raise ValueError(f"Unknown protocol request: {request}")
```

#### Why it differs from C/Java `switch`:
1. **Structural Deconstruction:** Can unpack mappings (dicts), sequences (lists/tuples), and arbitrary class instances with nested shapes.
2. **Variable Binding (Capture Patterns):** Identifiers like `token=str(jwt)` extract the value and bind it to variable `jwt` for use within the block.
3. **Guard Clauses (`if condition`):** Evaluate arbitrary runtime booleans *after* the structural pattern has matched.
4. **No Fall-Through:** Execution automatically breaks after matching the first successful pattern; no `break` statement required.

#### Class Patterns & `__match_args__`:
To support positional unpacking in class patterns (`case Point(x, y):`), classes must define `__match_args__ = ("x", "y")`. Dataclasses and Pydantic models automatically generate `__match_args__` for you.

---

## 2. Advanced Type Hints & Generics (Python 3.12 PEP 695)

### Q2: How did Python 3.12 revolutionize Generics and Type Aliases (PEP 695)? Contrast legacy typing boilerplate with modern syntax.
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Typing]` `[Python3.12]` `[PEP695]`

**Answer:**
Before Python 3.12, defining generic classes, generic functions, and type aliases required verbose imports and ceremony using `TypeVar`, `Generic`, and `TypeAlias` from the `typing` module.

#### Legacy Boilerplate (Python 3.8–3.11):
```python
from typing import Generic, Sequence, TypeAlias, TypeVar

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Type alias:
JsonDict: TypeAlias = dict[str, Sequence[T]]


# Generic repository class:
class BaseRepository(Generic[T]):

  def __init__(self, connection_pool: str):
    self.pool = connection_pool

  def find_by_id(self, entity_id: int) -> T: ...
```

#### Modern Idiomatic Syntax (Python 3.12+ PEP 695):
Python 3.12 introduced first-class syntax for type parameters, eliminating explicit `TypeVar` declarations and the `Generic` base class:

```python
# 1. Modern Type Alias using the 'type' keyword:
type JsonDict[T] = dict[str, list[T]]
type Coordinate = tuple[float, float]


# 2. Modern Generic Class:
class BaseRepository[T]:

  def __init__(self, connection_pool: str):
    self.pool = connection_pool

  def find_by_id(self, entity_id: int) -> T:
    raise NotImplementedError


# 3. Modern Generic Function:
def serialize_entities[T, U](entities: list[T], transform: callable) -> list[U]:
  return [transform(e) for e in entities]
```

#### Runtime Benefits of PEP 695:
- **Lazy Evaluation:** Modern `type` statements create a `TypeAliasType` instance whose value is evaluated **lazily**, completely eliminating circular import errors caused by forward references and type annotations!
- **Zero Boilerplate:** No more module-level `T = TypeVar('T')` polluting namespaces.

---

### Q3: What are `ParamSpec` and `Concatenate`, and why are they essential for typing decorators?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[ParamSpec]` `[Decorators]` `[Mypy]`

**Answer:**
Historically, typing higher-order functions and decorators with standard `TypeVar` caused static type checkers (Mypy, Pyright) to erase the original function's argument signatures (collapsing them to `Callable[..., T]`).

**`typing.ParamSpec`** (PEP 612) captures arbitrary function parameter signatures (args and kwargs) as a single type variable. Combined with **`typing.Concatenate`**, it allows adding, removing, or transforming specific parameters while preserving exact argument types:

```python
from collections.abc import Callable
from functools import wraps
import time
from typing import Concatenate, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def measure_latency(func: Callable[P, R]) -> Callable[P, R]:
  """Preserves exact argument types and return type."""

  @wraps(func)
  def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
    start = time.perf_counter()
    result = func(*args, **kwargs)
    elapsed = time.perf_counter() - start
    print(f"Function {func.__name__} executed in {elapsed:.4f}s")
    return result

  return wrapper


@measure_latency
def calculate_tax(income: float, state: str, deductions: int = 0) -> float:
  return income * 0.25 - deductions


# IDE / Mypy now provides full autocomplete and type-checking:
# calculate_tax("invalid", state=123) -> Flags Mypy error immediately!
```

---

## 3. Nominal Subtyping (`ABC`) vs Structural Subtyping (`Protocol`)

### Q4: Compare `abc.ABC` (Nominal Subtyping) with `typing.Protocol` (Structural Subtyping). When should you choose each in production?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Protocol]` `[ABC]` `[DuckTyping]`

**Answer:**
Python supports both **nominal typing** (inheritance-based) and **structural typing** (interface/duck-typing-based):

```text
Nominal Subtyping (abc.ABC):
┌────────────────────────┐
│     class Animal(ABC)  │
└───────────▲────────────┘
            │ MUST explicitly inherit: class Dog(Animal)
┌───────────┴────────────┐
│      class Dog         │
└────────────────────────┘

Structural Subtyping (typing.Protocol):
┌────────────────────────┐
│ class Quackable(Prot.) │ ◄──┐
│   def quack() -> str   │    │ No inheritance required!
└────────────────────────┘    │ Matches if method signature matches.
┌────────────────────────┐    │
│ class RealDuck         │ ───┘
│   def quack() -> str   │
└────────────────────────┘
```

#### Comparison Matrix:

| Feature / Aspect | `abc.ABC` (Abstract Base Class) | `typing.Protocol` (PEP 544) |
|---|---|---|
| **Subtyping Philosophy** | **Nominal**: Subclass must explicitly inherit from the ABC | **Structural**: Satisfied if method signatures match ("Static Duck Typing") |
| **Runtime Enforcement** | Prevents instantiation if abstract methods are missing (`TypeError`) | No instantiation check at runtime unless decorated with `@runtime_checkable` |
| **Third-Party Compatibility**| Cannot make third-party classes satisfy an ABC without monkeypatching or `ABC.register()` | Third-party libraries automatically satisfy the Protocol if signatures match |
| **Performance Overhead** | Small metaclass instantiation check overhead | Zero runtime overhead during normal execution |

#### Production Protocol Example:
```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class KeyValueStore(Protocol):

  def get(self, key: str) -> str | None: ...
  def set(self, key: str, value: str, ttl_seconds: int = 3600) -> None: ...


# Neither RedisClient nor InMemoryCache need to import or inherit KeyValueStore!
class InMemoryCache:

  def __init__(self):
    self._data = {}

  def get(self, key: str) -> str | None:
    return self._data.get(key)

  def set(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
    self._data[key] = value


def initialize_session(store: KeyValueStore):
  # Mypy statically guarantees store has .get() and .set()
  store.set("session_123", "user_data")
```

---

## 4. Exception Groups & `except*` Handling (Python 3.11+ PEP 654)

### Q5: How do `ExceptionGroup` and `except*` work in Python 3.11+? How do they handle concurrent task failures in `asyncio.TaskGroup`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[ExceptionGroup]` `[asyncio]` `[Python3.11]`

**Answer:**
Traditionally, if multiple concurrent tasks failed simultaneously in Python (e.g., in a thread pool or `asyncio.gather`), the runtime could only raise **one exception**, discarding or chaining the others.

Python 3.11 introduced **`ExceptionGroup`** and the **`except*`** syntax (PEP 654) to handle collections of unrelated exceptions occurring concurrently:

```python
import asyncio


async def fetch_user_profile():
  await asyncio.sleep(0.1)
  raise ValueError("User not found in primary database")


async def fetch_user_orders():
  await asyncio.sleep(0.1)
  raise ConnectionError("Payment gateway connection timed out")


async def main():
  try:
    async with asyncio.TaskGroup() as tg:
      tg.create_task(fetch_user_profile())
      tg.create_task(fetch_user_orders())
  except* ValueError as eg:
    # Handles only the ValueError component of the group
    print(f"Caught ValueErrors: {eg.exceptions}")
  except* ConnectionError as eg:
    # Handles only the ConnectionError component of the group
    print(f"Caught Network Errors: {eg.exceptions}")


asyncio.run(main())
```

#### Mechanics of `except*`:
- Unlike standard `except` (where only the first matching branch executes), **multiple `except*` branches can execute** during a single `try` block!
- Python carves matching exceptions out of the group for each branch. Any unhandled exceptions remaining in the group are re-raised automatically.

---

## 5. CPython 3.12 & 3.13 Runtime Evolution (Per-Interpreter GIL & PEP 703)

### Q6: What is the Per-Interpreter GIL (PEP 684) in Python 3.12, and how does Free-Threaded CPython (PEP 703) in Python 3.13 eliminate the GIL entirely?
**Difficulty:** 🟣 Principal / Lead  
**Type:** 📖 Conceptual  
**Tags:** `[GIL]` `[PEP703]` `[Python3.13]` `[Architecture]`

**Answer:**

```text
CPython 3.11 and Earlier:
┌────────────────────────────────────────────────────────┐
│                   Single OS Process                    │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Thread 1 (Bytecode)   │  │ Thread 2 (Bytecode)   │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  │
│              └─────────────┬────────────┘              │
│                            ▼                           │
│                 Global Interpreter Lock                │
│                 (Only 1 thread runs!)                  │
└────────────────────────────────────────────────────────┘

CPython 3.12 (PEP 684: Per-Interpreter GIL):
┌────────────────────────────────────────────────────────┐
│                   Single OS Process                    │
│  ┌─────────────────────────┐ ┌───────────────────────┐ │
│  │ Sub-Interpreter A       │ │ Sub-Interpreter B     │ │
│  │ (GIL A)                 │ │ (GIL B)               │ │
│  │ Core 1 (100% CPU)       │ │ Core 2 (100% CPU)     │ │
│  └─────────────────────────┘ └───────────────────────┘ │
└────────────────────────────────────────────────────────┘

CPython 3.13+ (PEP 703: Free-Threaded Build):
┌────────────────────────────────────────────────────────┐
│                   Single OS Process                    │
│  Thread 1 ──► Core 1 ──┐                               │
│  Thread 2 ──► Core 2 ──┼──► Shared Heap (No GIL!)      │
│  Thread 3 ──► Core 3 ──┘   (Biased Ref Counting & BRC) │
└────────────────────────────────────────────────────────┘
```

#### 1. Python 3.12: Per-Interpreter GIL (PEP 684)
- Enables multiple sub-interpreters within a **single OS process**, each possessing its own independent GIL.
- Allows running CPU-bound Python code concurrently across multiple CPU cores without the heavy memory footprint of spawning separate OS processes (`multiprocessing`).
- Interpreters communicate via isolated communication channels (`interpreters` module).

#### 2. Python 3.13+: Free-Threaded CPython (PEP 703)
- An optional build mode (`--disable-gil`) that removes the GIL entirely from the CPython executable.
- **How it replaces reference counting safety:**
  - **Biased Reference Counting (BRC):** Each object has an owning thread. Reference count mutations by the owning thread are fast and non-atomic; mutations by other threads use atomic operations.
  - **Immortal Objects:** Common constants (integers, strings, singletons) have their reference counts disabled entirely, avoiding cross-thread cache thrashing.
  - **Memory Allocator:** Uses Microsoft's `mimalloc` thread-safe allocator.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "If the GIL is removed in Python 3.13 free-threaded builds, does that mean Python application code is automatically thread-safe?"  
*Senior Answer:* **No!** Removing the GIL protects CPython's internal memory structures, not your application code. In a free-threaded Python build, race conditions on shared data structures (modifying lists, dicts, or ORM objects across threads) become *more* dangerous. Developers must explicitly synchronize shared mutable state using locks (`threading.Lock`), concurrent queues, or immutable data structures.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: What is the practical difference between `Any` and `object` in Python type hints?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Typing]`

**Answer:**
- `Any`: Disables static type checking entirely. You can access any attribute or pass it anywhere without Mypy errors ("turn off the type checker for this variable").
- `object`: Represents the root of the Python type hierarchy. You can assign anything to it, but you **cannot access arbitrary attributes or methods** without explicitly type-narrowing it first (e.g., via `isinstance()`).

---

### Q8: What does `typing.cast()` do at runtime?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[QuickFire]` `[Typing]`

**Answer:**
`typing.cast(target_type, value)` does **absolutely nothing at runtime**. It returns `value` unmodified without any type conversion or validation: `def cast(typ, val): return val`. Its sole purpose is to instruct static type checkers (Mypy) to treat the expression as `target_type`.

---

### Q9: What is `typing.Self` (PEP 673), and why is it superior to `TypeVar('T', bound='MyClass')`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Self]`

**Answer:**
`Self` represents the dynamic instance type of the enclosing class. When subclassing a fluent interface (builder pattern or factory method `def clone(self) -> Self:`), `Self` automatically resolves to the subclass type rather than the parent base class, without the boilerplate of defining bounded `TypeVar`s.
