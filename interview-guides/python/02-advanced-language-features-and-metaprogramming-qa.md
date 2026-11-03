# 02 — Advanced Language Features & Metaprogramming

> Descriptors & Attribute Lookup Precedence, Metaclasses, `__init_subclass__`, Decorator Mechanics (`functools.wraps`), Dunder Protocols (`__new__`, `__hash__`), and Synchronous / Asynchronous Context Managers.

---

## 📑 Table of Contents
1. [The Descriptor Protocol & Attribute Lookup Hierarchy](#1-the-descriptor-protocol--attribute-lookup-hierarchy)
2. [Metaclasses & `__init_subclass__` Hooks](#2-metaclasses--__init_subclass__-hooks)
3. [Decorators, Signatures & Function Introspection](#3-decorators-signatures--function-introspection)
4. [Object Construction & Dunder Protocols (`__new__`, `__hash__`)](#4-object-construction--dunder-protocols-__new__-__hash__)
5. [Context Managers & Resource Sandboxing](#5-context-managers--resource-sandboxing)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Descriptor Protocol & Attribute Lookup Hierarchy

### Q1: What is a descriptor in Python, and how does Python resolve attribute lookup when an attribute exists in both the instance dictionary and the class?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Descriptors]` `[AttributeLookup]` `[MRO]`

**Answer:**
A **descriptor** is an object that customizes attribute access by implementing at least one of the methods in the descriptor protocol:
- `__get__(self, instance, owner=None)`: Called on retrieval (`obj.attr`).
- `__set__(self, instance, value)`: Called on assignment (`obj.attr = value`).
- `__delete__(self, instance)`: Called on deletion (`del obj.attr`).
- `__set_name__(self, owner, name)`: Called during class creation to bind the attribute name.

Descriptors form the foundational plumbing behind `@property`, `@classmethod`, `@staticmethod`, `super()`, and ORM field mappings (SQLAlchemy, Django ORM).

```text
┌────────────────────────────────────────────────────────┐
│               Attribute Lookup for obj.x               │
└───────────────────────────┬────────────────────────────┘
                            │
               Is 'x' in type(obj) MRO?
              /                        \
           YES                          NO
            │                            │
  Is 'x' a Data Descriptor?              │
  (defines __set__ or __delete__)        │
         /        \                      │
       YES         NO                    │
        │           │                    │
┌───────▼──────┐ ┌──▼──────────────────┐ │
│ Invoke       │ │ Is 'x' in           │ │
│ __get__()    │ │ obj.__dict__?       │ │
└──────────────┘ └──┬──────────────────┘ │
                    │          \         │
                  YES           NO       │
                   │             │       │
             ┌─────▼─────┐ ┌─────▼─────┐ │
             │ Return    │ │ Is 'x' a  │ │
             │ instance  │ │ Non-Data  │ │
             │ __dict__  │ │ Descriptor│ │
             │ value     │ │ (__get__)?│ │
             └───────────┘ └─────┬─────┘ │
                                 │       │
                               YES   NO  │
                                │     │  │
                         ┌──────▼──┐ ┌▼──▼───────────────┐
                         │ Invoke  │ │ Check class dict; │
                         │ __get__ │ │ Fall back to      │
                         └─────────┘ │ __getattr__()     │
                                     └───────────────────┘
```

#### Attribute Lookup Precedence (Strict Order):
1. **Data Descriptors** found in the class's Method Resolution Order (MRO): Takes highest precedence. If `__set__` is defined, instance `__dict__` cannot shadow it!
2. **Instance Dictionary (`instance.__dict__`)**: Direct instance attributes.
3. **Non-Data Descriptors** in class MRO: Defines only `__get__` (e.g., standard methods, static methods).
4. **Class Dictionary (`type(instance).__dict__`)**: Ordinary class variables.
5. **`__getattr__(self, name)` fallback**: Invoked only if the attribute was not found in steps 1–4.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you define a method on an instance `obj.my_method = lambda: 'custom'`? Does it override the class method?"  
*Senior Answer:* Yes! Standard class methods are **non-data descriptors** (they only implement `__get__` to bind `self`). Because instance `__dict__` takes precedence over non-data descriptors, the instance-level lambda in `obj.__dict__` shadows the class method. However, if the class attribute is a `@property` (which is a data descriptor with a dummy `__set__` that raises `AttributeError`), attempting to assign `obj.my_prop = 'custom'` invokes the descriptor's `__set__` and fails, rather than overwriting `__dict__`.

---

### Q2: How do you build a reusable type-safe validation descriptor using `__set_name__`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Descriptors]` `[Validation]` `[Metaprogramming]`

**Answer:**
Before Python 3.6, descriptors required passing the attribute name manually (`age = IntegerField('age')`). With **`__set_name__`** (PEP 487), CPython automatically notifies the descriptor of the variable name it was bound to on the owning class.

```python
class ValidatedInteger:

  def __init__(self, min_val: int = 0, max_val: int = 150):
    self.min_val = min_val
    self.max_val = max_val
    self.private_name = ""

  def __set_name__(self, owner: type, name: str) -> None:
    # Automatically binds: '_age' for 'age'
    self.private_name = f"_{name}"

  def __get__(self, instance: object, owner: type | None = None) -> object:
    if instance is None:
      return self  # Accessed via class: User.age returns descriptor instance
    return getattr(instance, self.private_name, None)

  def __set__(self, instance: object, value: object) -> None:
    if not isinstance(value, int) or isinstance(value, bool):
      raise TypeError(
          f"Attribute '{self.private_name[1:]}' must be an integer."
      )
    if not (self.min_val <= value <= self.max_val):
      raise ValueError(
          f"Value {value} out of range [{self.min_val}, {self.max_val}]"
      )
    setattr(instance, self.private_name, value)


class UserProfile:
  age = ValidatedInteger(min_val=18, max_val=120)
  score = ValidatedInteger(min_val=0, max_val=1000)

  def __init__(self, age: int, score: int):
    self.age = age
    self.score = score
```

```python
user = UserProfile(age=25, score=100)
user.age = 15  # Raises ValueError: Value 15 out of range [18, 120]
user.score = "high"  # Raises TypeError: Attribute 'score' must be an integer.
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why did you check `instance is None` in `__get__`?"  
*Senior Answer:* When someone accesses an attribute via the class itself (e.g., `UserProfile.age`), CPython calls `__get__(None, UserProfile)`. Returning `self` allows developers or inspection libraries (like Sphinx, IDE autocomplete, or ORMs) to access the descriptor instance itself rather than crashing with an `AttributeError` on a non-existent instance.

---

## 2. Metaclasses & `__init_subclass__` Hooks

### Q3: What is a Metaclass? Walk through the class creation lifecycle and contrast it with `__init_subclass__`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Metaclass]` `[__init_subclass__]` `[OOP]`

**Answer:**
In Python, **classes are instances of metaclasses**. By default, all classes in Python are instances of the built-in `type` metaclass:

```text
┌────────────────┐      creates / instance of      ┌────────────────┐
│   Metaclass    │ ──────────────────────────────► │     Class      │
│  (e.g., type)  │                                 │ (e.g., User)   │
└────────────────┘                                 └───────┬────────┘
                                                           │ creates / instance of
                                                           ▼
                                                   ┌────────────────┐
                                                   │    Instance    │
                                                   │   (e.g., u)    │
                                                   └────────────────┘
```

#### Class Creation Lifecycle:
When Python compiles a `class MyClass(Base, metaclass=Meta):` block:
1. Resolves the metaclass (inspects `metaclass=` argument or base classes).
2. Calls `metaclass.__prepare__(name, bases, **kw)` to prepare the class namespace dictionary (e.g., `collections.OrderedDict`).
3. Executes the class body within that namespace.
4. Calls `metaclass.__new__(mcs, name, bases, namespace)`: Allocates and returns the new `type` object in memory.
5. Calls `metaclass.__init__(cls, name, bases, namespace)`: Initializes the created class object.

#### The Modern Alternative: `__init_subclass__` (PEP 487):
95% of use cases historically requiring metaclasses (subclass registration, API contract validation, plugin discovery) are solved cleanly with **`__init_subclass__`** without metaclass conflicts.

```python
class PluginBase:
  registry: dict[str, type["PluginBase"]] = {}

  @classmethod
  def __init_subclass__(cls, plugin_name: str | None = None, **kwargs):
    super().__init_subclass__(**kwargs)
    if plugin_name is None:
      plugin_name = cls.__name__.lower()

    if plugin_name in cls.registry:
      raise ValueError(f"Duplicate plugin name: {plugin_name}")

    cls.registry[plugin_name] = cls


class JsonExportPlugin(PluginBase, plugin_name="json_exporter"):
  pass


class CsvExportPlugin(PluginBase, plugin_name="csv_exporter"):
  pass


print(PluginBase.registry)
# {'json_exporter': <class 'JsonExportPlugin'>, 'csv_exporter': <class 'CsvExportPlugin'>}
```

| Dimension | Metaclass (`class Meta(type)`) | `__init_subclass__` (PEP 487) |
|---|---|---|
| **Complexity** | High (manipulates raw C-level `type` objects) | Low (pure Python class method hook) |
| **Metaclass Conflicts** | Frequent when multiple base classes define different metaclasses | None (standard cooperative multiple inheritance) |
| **Namespace Mutation** | Can modify namespace *before* class creation (`__prepare__`) | Executes *after* subclass has been created |
| **Recommendation** | Use only for AST rewrites or dynamic slot mutation | Recommended standard for class registration and validation |

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What causes the notorious `TypeError: metaclass conflict: the metaclass of a derived class must be a (non-strict) subclass of the metaclasses of all its bases`?"  
*Senior Answer:* If class `Child` inherits from `BaseA` (metaclass `MetaA`) and `BaseB` (metaclass `MetaB`), Python cannot construct `Child` unless `MetaA` is a subclass of `MetaB` (or vice-versa). The fix requires creating a unified composite metaclass: `class CombinedMeta(MetaA, MetaB): pass` and explicitly specifying `class Child(BaseA, BaseB, metaclass=CombinedMeta): pass`.

---

## 3. Decorators, Signatures & Function Introspection

### Q4: Why is `@functools.wraps` mandatory in production decorators, and how does omitting it break frameworks like FastAPI or Flask?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Decorators]` `[functools]` `[FastAPI]`

**Answer:**
A decorator replaces the original callable with a wrapper function. Without `@functools.wraps(func)`, the wrapper masks the original function's metadata:

```python
import functools
import inspect


def naive_decorator(func):

  def wrapper(*args, **kwargs):
    return func(*args, **kwargs)

  return wrapper


def proper_decorator(func):

  @functools.wraps(func)
  def wrapper(*args, **kwargs):
    return func(*args, **kwargs)

  return wrapper


@naive_decorator
def greet(name: str, priority: int = 1) -> str:
  """Greets a user."""
  return f"Hello {name}"
```

```python
print(greet.__name__)  # 'wrapper' (NOT 'greet'!)
print(greet.__doc__)  # None
print(greet.__annotations__)  # {} (Type hints lost!)
print(inspect.signature(greet))  # (*args, **kwargs)
```

#### Why this breaks modern frameworks:
1. **FastAPI & Pydantic:** FastAPI inspects `inspect.signature(route_func)` and `__annotations__` to parse query parameters, path arguments, and request bodies. With `naive_decorator`, FastAPI sees `(*args, **kwargs)` and fails to register endpoint parameters.
2. **Flask View Routing:** Flask registers URL endpoints using `func.__name__` by default. If multiple routes use `naive_decorator`, all endpoints are named `'wrapper'`, causing `AssertionError: View function mapping is overwriting an existing endpoint function: wrapper`.
3. **OpenTelemetry / Profiling:** Traces and flamegraphs report hundreds of calls to `wrapper()` instead of the actual domain function name.

#### What `@functools.wraps` does under the hood:
It copies `__name__`, `__doc__`, `__annotations__`, `__qualname__`, and sets **`__wrapped__`** pointing directly to the unwrapped target function, allowing `inspect.unwrap()` to recover the original callable.

---

### Q5: 💻 Coding: Implement a production-grade `@retry` decorator with exponential backoff, jitter, and selective exception filtering.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Decorators]` `[Resilience]` `[Backoff]`

**Answer:**

```python
import functools
import logging
import random
import time
from typing import Callable, TypeVar

logger = logging.getLogger("resilience")
T = TypeVar("T")


def retry(
    max_retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: tuple[type[Exception], ...] = (Exception,),
) -> Callable:
  """Decorator that retries a function with exponential backoff and jitter."""

  def decorator(func: Callable[..., T]) -> Callable[..., T]:
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
      delay = initial_delay
      for attempt in range(1, max_retries + 1):
        try:
          return func(*args, **kwargs)
        except retryable_exceptions as exc:
          if attempt == max_retries:
            logger.error(
                "Execution failed after %d retries. Raising: %s", attempt, exc
            )
            raise

          # Exponential backoff + full jitter calculation
          sleep_time = delay * (backoff_factor ** (attempt - 1))
          if jitter:
            sleep_time = random.uniform(0, sleep_time)

          logger.warning(
              "Attempt %d failed with %s. Retrying in %.2fs...",
              attempt,
              type(exc).__name__,
              sleep_time,
          )
          time.sleep(sleep_time)

      raise RuntimeError("Unreachable retry loop state")

    return wrapper

  return decorator
```

```python
# Production Usage:
@retry(
    max_retries=4,
    initial_delay=0.1,
    retryable_exceptions=(ConnectionError, TimeoutError),
)
def fetch_payment_status(transaction_id: str) -> dict:
  # Network call...
  pass
```

---

## 4. Object Construction & Dunder Protocols (`__new__`, `__hash__`)

### Q6: What is the exact difference between `__new__` and `__init__`? How do you implement a thread-safe Singleton using `__new__`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Dunder]` `[Singleton]` `[Threading]`

**Answer:**
- **`__new__(cls, *args, **kwargs)`**: The **allocator**. A static method (implicitly treated as such) that allocates and returns a fresh, uninitialized instance of `cls` on the heap.
- **`__init__(self, *args, **kwargs)`**: The **initializer**. Called *after* `__new__` returns an instance of `cls` to configure its attributes.

```text
User executes: obj = MyClass(x=10)
                      │
           1. MyClass.__new__(MyClass, x=10)
                      │ (Allocates raw PyObject on heap)
           Returns: instance of MyClass?
                    /           \
                 YES             NO (returns other type)
                  │               │
  2. instance.__init__(x=10)    Skip __init__!
                  │             Return raw instance
  3. Returns instance           immediately
```

#### Thread-Safe Singleton Implementation:
```python
import threading


class DatabaseConnectionPool:
  _instance = None
  _lock = threading.Lock()

  def __new__(cls, *args, **kwargs):
    # Double-checked locking pattern for high-throughput thread safety
    if cls._instance is None:
      with cls._lock:
        if cls._instance is None:
          cls._instance = super().__new__(cls)
          # Ensure initialization happens only once
          cls._instance._initialized = False
    return cls._instance

  def __init__(self, dsn: str = "postgresql://localhost:5432/app"):
    if getattr(self, "_initialized", False):
      return
    self.dsn = dsn
    self._initialized = True
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if `__new__` returns an instance of a *different* class?"  
*Senior Answer:* If `__new__` returns an object that is **not an instance of `cls`**, Python **completely skips calling `__init__`**. This technique is heavily used in factory patterns, serialization/deserialization proxies, and mock libraries.

---

### Q7: Why does defining `__eq__` on a class make its instances unhashable by default? What is the hash contract?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Hashing]` `[Equality]` `[DataStructures]`

**Answer:**
In Python, dictionary keys and set elements require objects to be **hashable**:
An object is hashable if:
1. It has a hash value that remains constant throughout its lifecycle (`__hash__`).
2. It can be compared for equality (`__eq__`).
3. If `a == b` is `True`, then `hash(a) == hash(b)` **MUST be `True`** (The Hash Invariant).

```python
class Node:

  def __init__(self, val: int):
    self.val = val

  def __eq__(self, other: object) -> bool:
    return isinstance(other, Node) and self.val == other.val


n = Node(42)
# Attempting to use in a set:
s = {n}  # TypeError: unhashable type: 'Node'
```

#### Why Python zeroes `__hash__`:
By default, user-defined classes inherit `__hash__` and `__eq__` from `object` (identity-based: `id(self)`).
- When you define a custom `__eq__` based on attribute values (e.g., `self.val == other.val`), Python **explicitly sets `__hash__ = None`** on the class.
- Why? Because if `self.val` can be modified after insertion into a `set` or `dict`, the object's hash bucket location changes, corrupting the hash table lookup and making the item unfindable (a silent data corruption bug!).

#### The Fix (Immutable Hashable Value Object):
```python
class FrozenNode:

  def __init__(self, val: int):
    self._val = val

  @property
  def val(self) -> int:
    return self._val

  def __eq__(self, other: object) -> bool:
    return isinstance(other, FrozenNode) and self._val == other._val

  def __hash__(self) -> int:
    return hash(self._val)
```

---

## 5. Context Managers & Resource Sandboxing

### Q8: How does exception suppression work in `__exit__`, and how do you build an asynchronous context manager?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[ContextManager]` `[AsyncIO]` `[Exceptions]`

**Answer:**
The context manager protocol handles exceptions using the return value of `__exit__`:
```python
def __exit__(self, exc_type, exc_val, exc_tb) -> bool | None:
  ...
```
- If an unhandled exception occurs inside the `with` block, Python passes the exception details into `__exit__`.
- If `__exit__` returns `True`, Python **suppresses the exception** and execution resumes normally after the `with` block.
- If it returns `False` or `None`, the exception is re-raised automatically.

#### Asynchronous Context Manager Protocol:
In async applications (FastAPI, aiohttp, asyncpg), resources like database transactions or HTTP client sessions must be awaited on entry and exit (`__aenter__` and `__aexit__`).

```python
import asyncio
from typing import Any


class AsyncDatabaseTransaction:

  def __init__(self, db_client: Any):
    self.db_client = db_client
    self.tx_id: str | None = None

  async def __aenter__(self):
    self.tx_id = await self.db_client.begin_transaction()
    print(f"Transaction {self.tx_id} started.")
    return self

  async def __aexit__(self, exc_type, exc_val, exc_tb) -> bool:
    if exc_type is not None:
      print(f"Rolling back transaction {self.tx_id} due to {exc_val}")
      await self.db_client.rollback(self.tx_id)
      return False  # Do not suppress error: re-raise to caller
    else:
      print(f"Committing transaction {self.tx_id}")
      await self.db_client.commit(self.tx_id)
      return True
```

```python
# Async Usage:
async def process_order():
  async with AsyncDatabaseTransaction(db) as tx:
    await db.deduct_inventory()
    await db.charge_credit_card()
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: How does the `@property` decorator work under the hood?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Property]`

**Answer:**
`property` is a built-in class that implements the descriptor protocol. When you write `@property def x(self): return self._x`, it binds an instance of `property(fget=x)` to the class namespace. On access (`obj.x`), Python invokes `property.__get__()`, which in turn calls the registered getter function `fget(obj)`.

---

### Q10: What is the difference between `__getattr__` and `__getattribute__`?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[AttributeLookup]`

**Answer:**
- `__getattribute__` is called **unconditionally** for *every single attribute access* on an instance (`obj.x`). Overriding it without calling `super().__getattribute__(name)` easily causes infinite recursion.
- `__getattr__` is called **only as a fallback** when the attribute does *not* exist in the instance dictionary or class hierarchy.

---

### Q11: Can a generator function be decorated with `@contextlib.contextmanager`? How does cleanup work if an exception is raised?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[contextlib]`

**Answer:**
Yes. The code before `yield` runs in `__enter__`, and the code after `yield` runs in `__exit__`. **Critical Trap:** If an exception occurs inside the `with` block, `@contextlib.contextmanager` re-raises that exception *at the line of the `yield` statement*. If your cleanup code is not wrapped in a `try...finally` block, the cleanup code will **never execute**, leaking the resource!
