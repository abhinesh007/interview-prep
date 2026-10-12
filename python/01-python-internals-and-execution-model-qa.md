# 01 — CPython Internals & Memory Architecture

> CPython Compilation & Virtual Machine Execution, `PyObject` Layout, Small Integer & String Interning, Reference Counting, Generational Cyclic Garbage Collection, and Memory Optimization with `__slots__`.

---

## 📑 Table of Contents
1. [CPython Compilation & Execution Pipeline](#1-cpython-compilation--execution-pipeline)
2. [Object Model & Memory Layout (`PyObject`)](#2-object-model--memory-layout-pyobject)
3. [Memory Management & Garbage Collection](#3-memory-management--garbage-collection)
4. [Memory Optimization with `__slots__`](#4-memory-optimization-with-__slots__)
5. [Output Prediction & Bug Hunting Scenarios](#5-output-prediction--bug-hunting-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. CPython Compilation & Execution Pipeline

### Q1: What happens under the hood from the moment you execute `python script.py` to machine execution?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[CPython]` `[Bytecode]` `[Compiler]`

**Answer:**
Python is neither purely compiled nor purely interpreted in the traditional sense; CPython (the standard reference implementation written in C) employs a two-stage execution pipeline: **Compilation to Bytecode** followed by **Evaluation in the Python Virtual Machine (PVM)**.

```text
┌────────────────────────┐
│   Source Code (.py)    │
└───────────┬────────────┘
            │ 1. Lexical Analysis (Tokenizer)
┌───────────▼────────────┐
│      Token Stream      │
└───────────┬────────────┘
            │ 2. Parsing (PEG Parser in Python 3.9+)
┌───────────▼────────────┐
│  Concrete / AST Tree   │
└───────────┬────────────┘
            │ 3. Symbol Table Generation & Bytecode Compiler
┌───────────▼────────────┐
│   Code Object (__code__)│ ──► Cached to disk as .pyc in __pycache__/
└───────────┬────────────┘
            │ 4. PVM Evaluation Loop (_PyEval_EvalFrameDefault)
┌───────────▼────────────┐
│  Host CPU / OS Kernel  │
└────────────────────────┘
```

The 4-stage pipeline unfolds as follows:
1. **Tokenization (Lexing):** The tokenizer converts raw UTF-8 text into a sequence of lexical tokens (keywords, identifiers, literals, operators, indentation tokens `INDENT`/`DEDENT`).
2. **Parsing (AST Construction):** CPython's PEG (Parsing Expression Grammar) parser converts tokens into an Abstract Syntax Tree (`ast` module).
3. **Bytecode Compilation:** The compiler analyzes variable scopes (generating the symbol table) and emits platform-independent, stack-based bytecode wrapped inside a Python **Code Object** (`PyCodeObject`). If imported as a module, this is serialized to disk as a `.pyc` file inside `__pycache__/` using the `marshal` module.
4. **Virtual Machine Interpretation:** The PVM executes the code object within a frame evaluation loop (`_PyEval_EvalFrameDefault` in CPython `Python/ceval.c`). The PVM is a **stack machine**: arguments are pushed onto an evaluation value stack, operated upon by opcodes, and popped off.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Does running a `.pyc` file make Python execute faster than running the `.py` source file directly?"  
*Senior Answer:* No, `.pyc` files only bypass the tokenization and parsing stages (startup compilation overhead). Once loaded into memory, the bytecode instructions executed by the PVM are 100% identical. In long-running services (like FastAPI, Flask, or background workers), compilation time is negligible (<50ms at startup), so `.pyc` files yield zero runtime performance boost after the process initializes.

---

### Q2: How can you inspect Python bytecode, and how does the PVM value stack execute a simple operation like `a + b`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Bytecode]` `[dis]` `[PVM]`

**Answer:**
You can disassemble any Python function or code block using the standard library `dis` module.

```python
import dis


def add(a: int, b: int) -> int:
  return a + b


dis.dis(add)
```

**Disassembly Output (Python 3.12+):**
```text
  1           0 RESUME                   0

  2           2 LOAD_FAST                0 (a)
              4 LOAD_FAST                1 (b)
              6 BINARY_OP                0 (+)
             10 RETURN_VALUE
```

#### Step-by-Step Value Stack Mechanics:
```text
State 0: Initial Stack:       []
State 1: LOAD_FAST 0 (a):     [10]          (Pushes local variable 'a')
State 2: LOAD_FAST 1 (b):     [10, 20]      (Pushes local variable 'b')
State 3: BINARY_OP 0 (+):     [30]          (Pops 20 & 10, calls PyNumber_Add, pushes result)
State 4: RETURN_VALUE:        []            (Pops 30 and returns to caller frame)
```

Key internals:
- `LOAD_FAST` reads directly from a pre-allocated fixed-size C array of pointers (`fastlocals`) indexed by integer offset, avoiding dictionary hash lookups.
- `BINARY_OP` (introduced in Python 3.11 to consolidate `BINARY_ADD`, `BINARY_SUBTRACT`, etc.) looks up the slot `tp_as_number->nb_add` on `a`'s `PyTypeObject`.
- Python 3.11+ includes the **Specializing Adaptive Interpreter (PEP 659)**: frequently executed opcodes adapt dynamically at runtime (e.g., `BINARY_OP` morphs into `BINARY_OP_ADD_INT` inline cache for integer additions, bypassing dynamic type dispatch).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why is accessing a local variable significantly faster than accessing a global variable inside a loop?"  
*Senior Answer:* Local variables use `LOAD_FAST`, which performs an $O(1)$ direct array index lookup in C (`frame->f_localsplus[offset]`). Global variables use `LOAD_GLOBAL`, which performs an $O(1)$ dictionary hash lookup in `f_globals` and falls back to `f_builtins` dictionary lookup on miss. In tight CPU-bound loops, caching a global or built-in function to a local variable (`_sin = math.sin`) saves millions of dictionary lookups.

---

## 2. Object Model & Memory Layout (`PyObject`)

### Q3: How is an object represented in CPython memory, and what is the physical overhead of a basic integer?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[PyObject]` `[Memory]` `[CPython]`

**Answer:**
In CPython, *everything is an object on the heap*. Every Python object is represented in C as a struct that begins with the `PyObject` header (defined in `Include/object.h`):

```c
struct _object {
    _PyObject_HEAD_EXTRA // Double-linked list pointers used for GC tracking
    Py_ssize_t ob_refcnt; // 64-bit integer tracking active references (8 bytes)
    PyTypeObject *ob_type; // Pointer to the object's type descriptor (8 bytes)
};
```

For variable-length objects (like strings, lists, tuples, and integers in Python 3), the header is `PyVarObject`:
```c
struct {
    PyObject ob_base;
    Py_ssize_t ob_size;   // Number of items or sign/digit count (8 bytes)
};
```

```text
┌────────────────────────────────────────────────────────┐
│                   PyLongObject Layout                  │
├────────────────────────────────┬───────────────────────┤
│ ob_refcnt (8 bytes)            │ Reference Count       │
├────────────────────────────────┼───────────────────────┤
│ ob_type   (8 bytes)            │ Pointer to &PyLong_Type│
├────────────────────────────────┼───────────────────────┤
│ ob_size   (8 bytes)            │ Digit Count and Sign  │
├────────────────────────────────┼───────────────────────┤
│ ob_digit[1] (4-8 bytes)        │ 30-bit Digit Payload  │
└────────────────────────────────┴───────────────────────┘
Total Physical Memory on 64-bit OS: 28 bytes!
```

```python
import sys

# A simple zero integer
print(sys.getsizeof(0))  # Output: 24 or 28 bytes
print(sys.getsizeof(1))  # Output: 28 bytes
print(sys.getsizeof(2**60))  # Output: 36 bytes (multiple 30-bit digits)
```

In contrast to a C `int` which occupies 4 bytes on the call stack, a Python integer requires **28 bytes on the heap** because it stores:
1. Reference count (`ob_refcnt`: 8 bytes).
2. Type pointer (`ob_type`: 8 bytes).
3. Number of digits (`ob_size`: 8 bytes).
4. The digit array (`ob_digit`: 4–8 bytes per digit).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Since Python integers use arbitrary-precision arithmetic, can they ever cause integer overflow like in C/Java?"  
*Senior Answer:* No, standard Python integers (`int`) never overflow; if a number exceeds the capacity of one 30-bit digit, CPython dynamically allocates additional digits in `ob_digit` array on the heap, limited only by available system RAM. However, C-extensions like NumPy allocate fixed-width C types (e.g., `np.int64`, `np.int32`), which *do* overflow silently or wrap around.

---

### Q4: Explain the difference between `is` and `==`. Why does `256 is 256` evaluate to `True`, but `257 is 257` might evaluate to `False`?
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Interning]` `[Identity]` `[Equality]`

**Answer:**
- `==` checks **value equality** by invoking `a.__eq__(b)`.
- `is` checks **reference identity** by comparing raw memory addresses: `id(a) == id(b)`.

```python
# In standard Python interactive REPL:
>>> a = 256
>>> b = 256
>>> a is b
True

>>> x = 257
>>> y = 257
>>> x is y
False
```

#### Why this happens (Small Integer Interning):
During CPython initialization, the runtime pre-allocates an array of `PyLongObject` singletons for all integers in the range **`[-5, 256]`** (defined as `_PY_NSMALLNEGINTS` and `_PY_NSMALLPOSINTS`).
- Any calculation or assignment resulting in an integer between `-5` and `256` returns a pointer to the existing pre-allocated singleton.
- For integers $\ge 257$ or $< -5$, CPython allocates a new heap object each time.

```text
Memory Address Range [-5, 256]:
[Singleton -5] ... [Singleton 0] ... [Singleton 256]
        ▲                                    ▲
        │                                    │
   Any var = 0                          Any var = 256
   shares same pointer                  shares same pointer
```

#### The Compiler Constant-Folding Gotcha:
If you execute the same test within a `.py` script or single compiled code block:
```python
x = 257
y = 257
print(x is y)  # Outputs True in a file!
```
When compiling a whole code object (module or function), CPython's peephole optimizer / compiler constant table detects duplicate immutable constants and points both `x` and `y` to the same code constant in `co_consts`.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Should you ever use `is` to compare numbers or strings in production?"  
*Senior Answer:* **Never.** Using `is` for value comparison is a critical bug. Relying on interning is an implementation detail of CPython that breaks across interpreters (PyPy, Jython), integer boundaries, or dynamically evaluated values (e.g., `int("257") is int("257")` is always `False`). `is` should strictly be reserved for comparing against singletons, notably `None` (`if val is None:`), `True`, `False`, `Ellipsis`, or sentinel object instances (`SENTINEL = object()`).

---

## 3. Memory Management & Garbage Collection

### Q5: How does CPython reclaim memory? Explain Reference Counting and the Generational Cyclic Garbage Collector.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[GC]` `[Memory]` `[Generations]`

**Answer:**
CPython employs a **hybrid two-tier memory reclamation system**:
1. **Primary: Reference Counting** (Immediate deallocation).
2. **Secondary: Generational Cyclic Garbage Collector** (Periodic sweep for cyclic graphs).

```text
┌────────────────────────────────────────────────────────┐
│              Object Created (ob_refcnt = 1)            │
└───────────────────────────┬────────────────────────────┘
                            │
              Reference Count Drops to 0?
             /                           \
          YES                             NO
           │                               │
┌──────────▼──────────┐         ┌──────────▼──────────┐
│ Immediate Free via  │         │ Survives. Enters    │
│ PyObject_Free()     │         │ Generation 0 of     │
└─────────────────────┘         │ Cyclic GC           │
                                └──────────┬──────────┘
                                           │
                            Threshold Exceeded?
                           (gc.collect())
                                           │
                                ┌──────────▼──────────┐
                                │ Detect Reference    │
                                │ Cycles & Free Loop  │
                                └──────────┬──────────┘
                                           │ Survives?
                                ┌──────────▼──────────┐
                                │ Promoted to Gen 1   │
                                │ (and later Gen 2)   │
                                └─────────────────────┘
```

#### 1. Reference Counting:
- Every `PyObject` contains `ob_refcnt`.
- Incremented when: assigned to variable, passed to function, stored in list/dict.
- Decremented when: variable goes out of scope, reassigned, or `del` is called.
- When `ob_refcnt == 0`, CPython immediately frees memory via `PyObject_Free()`.
- **Limitation:** Reference counting cannot detect **reference cycles** (where object A points to object B, and B points to A, keeping their refcounts $\ge 1$).

#### 2. Generational Cyclic Garbage Collector:
To collect isolated reference cycles, CPython provides the `gc` module, which only tracks container objects (lists, dicts, custom class instances, tuples holding containers):
- **Generations (0, 1, 2):**
  - **Generation 0 (Nursery):** Newly allocated containers. Collected frequently.
  - **Generation 1:** Objects that survived one Gen 0 collection.
  - **Generation 2:** Long-lived objects (survived Gen 1 collection). Collected least frequently.
- **The Collection Algorithm:**
  1. The GC maintains doubly-linked lists for each generation.
  2. For every tracked object, it copies `ob_refcnt` to a temporary field `gc_refs`.
  3. It iterates through all reachable objects and decrements `gc_refs` for every outgoing pointer from tracked containers.
  4. Any object whose `gc_refs` reaches 0 was only referenced from within the cycle and is marked as candidate garbage.
  5. Objects that survive are promoted to the next generation.

```python
import gc

# Default collection thresholds: (700, 10, 10)
# Gen 0 runs every 700 allocations > deallocations.
# Gen 1 runs every 10 Gen 0 runs.
# Gen 2 runs every 10 Gen 1 runs.
print(gc.get_threshold())
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Historically, why did defining a `__del__` method on an object inside a reference cycle cause permanent memory leaks?"  
*Senior Answer:* Before Python 3.4 (PEP 442), if objects in an isolated cycle implemented `__del__`, CPython could not determine which object's destructor to run first without risking reading a destroyed partner object. CPython gave up, placed the cycle in `gc.garbage`, and leaked it forever. Since PEP 442 (Python 3.4+), CPython breaks the cycle safely and invokes `__del__` cleanly. However, `__del__` is still an anti-pattern: exceptions inside `__del__` are ignored with warnings, and it prolongs object lifetimes. Use context managers (`with`) instead.

---

### Q6: What is PyMalloc, and why doesn't freeing Python objects immediately return RAM to the operating system?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[PyMalloc]` `[MemoryLeak]` `[OS]`

**Answer:**
Developers frequently observe that a Python worker process uses 2GB of RAM to process a batch job, and after `del large_dataset` and `gc.collect()`, the OS Activity Monitor / Kubernetes memory usage remains near 2GB.

This behavior stems from **PyMalloc** (CPython’s small object memory allocator):

```text
┌────────────────────────────────────────────────────────┐
│            OS Physical RAM / Virtual Memory            │
└───────────────────────────┬────────────────────────────┘
                            │ System malloc()
┌───────────────────────────▼────────────────────────────┐
│                  Arenas (256 KB each)                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │               Pools (4 KB each)                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Blocks (8 to 512 bytes, quantized in 8B)  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Small vs Large Objects:**
   - Any allocation $\le 512$ bytes uses **PyMalloc**.
   - Any allocation $> 512$ bytes routes directly to the OS standard `malloc()`.
2. **Arenas, Pools, and Blocks:**
   - Memory is requested from the OS in **256KB Arenas**.
   - Each Arena is carved into 64 **Pools of 4KB** each.
   - Each Pool contains fixed-size **Blocks** (Pool for 16-byte objects, Pool for 32-byte objects, etc.).
3. **The Fragmentation Trap:**
   - CPython can only release a 256KB Arena back to the OS via `free()` if **every single 4KB pool inside that arena is completely 100% empty**.
   - If an Arena has 64 pools, and 63 are empty but 1 single pool retains one live 32-byte integer, the entire 256KB Arena remains pinned in the process's Resident Set Size (RSS).

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you mitigate memory bloat in long-running Python workers (e.g., Celery, Gunicorn)?"  
*Senior Answer:* Three primary strategies:
1. **Worker Recycling:** Configure Gunicorn (`--max-requests 1000 --max-requests-jitter 100`) or Celery (`worker_max_tasks_per_child = 100`) to gracefully restart worker processes after handling $N$ requests, releasing all arenas back to the OS.
2. **Subprocess Isolation:** Offload memory-heavy batch jobs to a transient `multiprocessing.Process` or `concurrent.futures.ProcessPoolExecutor` that terminates after job completion.
3. **Alternative Allocators:** Use `jemalloc` or `mimalloc` by preloading the shared library (`LD_PRELOAD=/usr/lib/libjemalloc.so`), which combats fragmentation far better than the default glibc `malloc`.

---

## 4. Memory Optimization with `__slots__`

### Q7: How does `__slots__` work under the hood, and how does it reduce instance memory usage?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Slots]` `[Optimization]` `[Descriptors]`

**Answer:**
By default, every Python user-defined class instance stores its attributes in an internal dynamic dictionary (`instance.__dict__`). 

```python
class NormalUser:

  def __init__(self, user_id: int, username: str):
    self.user_id = user_id
    self.username = username


u = NormalUser(1, "alice")
print(u.__dict__)  # {'user_id': 1, 'username': 'alice'}
```

An empty `dict` on a 64-bit architecture consumes ~104 to 152 bytes, plus a `__weakref__` pointer (8 bytes). For applications maintaining millions of instances in RAM (e.g., in-memory caches, graph nodes, ORM models), `__dict__` introduces massive overhead:

```text
Normal Object:
┌──────────────┐      ┌─────────────────────────────┐
│  PyObject    │ ───► │ __dict__ (Hash Table in RAM)│
│  Header      │      │ 'user_id'  ──► 1            │
│  (16 bytes)  │      │ 'username' ──► 'alice'      │
└──────────────┘      └─────────────────────────────┘

Slotted Object:
┌──────────────────────────────────────────────────┐
│ PyObject Header (16 bytes)                       │
├──────────────────────────────────────────────────┤
│ C Pointer to user_id (8 bytes)                   │
├──────────────────────────────────────────────────┤
│ C Pointer to username (8 bytes)                  │
└──────────────────────────────────────────────────┘
Total: 32 bytes (No dynamic dict created!)
```

#### Implementing `__slots__`:
```python
class SlottedUser:
  __slots__ = ("user_id", "username")

  def __init__(self, user_id: int, username: str):
    self.user_id = user_id
    self.username = username


s = SlottedUser(1, "alice")
# hasattr(s, '__dict__') is False!
```

#### Under the Hood:
When CPython encounters `__slots__` during class creation, it does **not** allocate the `tp_dictoffset` slot. Instead, it creates **member descriptors** in the class namespace. Attribute access translates to a direct C-level struct offset lookup ($O(1)$ pointer math) instead of a dictionary hash lookup.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a child class inherits from a slotted class without defining `__slots__` itself?"  
*Senior Answer:* The child class **silently reverts to creating `__dict__` and `__weakref__`** for its instances! To maintain the memory benefits throughout an inheritance tree, every subclass in the chain must explicitly declare `__slots__ = ()` (or declare any additional child attributes). Additionally, instances with `__slots__` cannot have arbitrary dynamic attributes added at runtime unless `'__dict__'` is explicitly included in the `__slots__` tuple.

---

## 5. Output Prediction & Bug Hunting Scenarios

### Q8: 🧩 Output Prediction: Mutable Default Arguments
**Difficulty:** 🟢 Junior  
**Type:** 🧩 Output Prediction  
**Tags:** `[Gotcha]` `[Functions]` `[DefaultArgs]`

**What is the output of the following code? Explain why.**

```python
def append_item(val: int, target_list: list = []) -> list:
  target_list.append(val)
  return target_list


print(append_item(1))
print(append_item(2))
print(append_item(3, []))
print(append_item(4))
```

#### Output:
```text
[1]
[1, 2]
[3]
[1, 2, 4]
```

#### Deep Dive Explanation:
In Python, **default parameter values are evaluated once at function definition time** (when the `def` statement executes and compiles the function object), NOT at call time.
- The empty list `[]` is created once and stored inside the function's `__defaults__` tuple (`append_item.__defaults__`).
- Every subsequent invocation that omits `target_list` references the **same exact list object in heap memory**.
- Passing an explicit empty list `append_item(3, [])` creates a fresh list for that specific call, leaving `__defaults__` untouched.

#### The Idiomatic Production Fix:
```python
def append_item(val: int, target_list: list | None = None) -> list:
  if target_list is None:
    target_list = []
  target_list.append(val)
  return target_list
```

---

### Q9: 🧩 Output Prediction: Late Binding Closures in Loops
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[Closures]` `[Scoping]` `[LateBinding]`

**What is the output of the following code? Explain why.**

```python
functions = []
for i in range(4):
  functions.append(lambda: i * 2)

results = [f() for f in functions]
print(results)
```

#### Output:
```text
[6, 6, 6, 6]
```

#### Deep Dive Explanation:
Python closures use **late binding**: variables referenced inside closures are looked up when the inner function is **called**, not when it is defined.
- During the loop, each `lambda` captures the variable name `i`, not the current value of `i`.
- All 4 lambdas share the same lexical scope and point to the same variable cell in memory.
- When `f()` is eventually called in the list comprehension, the loop has completed, and `i` has the value `3`.
- Therefore, each function calculates `3 * 2 = 6`.

#### The Fix (Early Binding via Default Parameter):
```python
# Default arguments are evaluated at definition time:
functions = [lambda i=i: i * 2 for i in range(4)]
print([f() for f in functions])  # Output: [0, 2, 4, 6]
```

---

### Q10: 🐛 Bug Hunt: The Memory Leak in In-Memory Caching
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[MemoryLeak]` `[Closures]` `[GarbageCollection]`

**Problem Scenario:**
A high-throughput API gateway uses the following caching decorator. After 48 hours in production, the container crashes with an Out-of-Memory (OOM) error, even though the database query results are small strings.

```python
import functools
import time


def memoize(func):
  cache = {}

  @functools.wraps(func)
  def wrapper(*args, **kwargs):
    key = (args, tuple(sorted(kwargs.items())))
    if key not in cache:
      cache[key] = (func(*args, **kwargs), time.time())
    return cache[key][0]

  return wrapper


class ProductService:

  def __init__(self, db_client):
    self.db_client = db_client

  @memoize
  def get_product(self, product_id: int) -> dict:
    return self.db_client.query_product(product_id)
```

**Diagnose the root cause and provide the production mitigation.**

#### Diagnosis:
1. **Instance Method Retention Trap:**
   - When `@memoize` decorates the instance method `get_product`, the first argument in `args` is `self` (the `ProductService` instance).
   - The key in `cache` is `((self, 101), ())`.
   - The `cache` dictionary retains a strong reference to `self` (`ProductService`), which in turn holds `self.db_client`, database connection pools, and all attached services.
2. **Unbounded Cache Growth:**
   - The `cache` dictionary has no eviction policy (no LRU, no maximum size, no TTL pruning). Every distinct `product_id` and every distinct service instance created during the lifecycle remains retained forever in module memory.

#### Production Mitigation:
Use `functools.lru_cache` with a bounded size, or use a cache keyed strictly on primitive identifiers rather than instance references:

```python
from functools import lru_cache


class ProductService:

  def __init__(self, db_client):
    self.db_client = db_client

  def get_product(self, product_id: int) -> dict:
    return self._cached_get_product(product_id)

  @lru_cache(maxsize=4096)
  def _cached_get_product(self, product_id: int) -> dict:
    return self.db_client.query_product(product_id)
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q11: What does `sys.getrefcount(obj)` return, and why is the number always 1 higher than expected?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[ReferenceCounting]`

**Answer:**
`sys.getrefcount(x)` always returns $N + 1$ because passing `x` as an argument into the `sys.getrefcount()` function temporarily creates a new reference to `x` inside the function's stack frame parameter. Once `getrefcount` returns, that temporary reference is decremented.

---

### Q12: What is the difference between `__repr__` and `__str__`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Dunder]`

**Answer:**
- `__repr__` is intended for developers and debugging: unambiguous, detailed, and ideally valid Python code that could recreate the object (`eval(repr(obj)) == obj`).
- `__str__` is intended for end-users: readable, clean representation. If `__str__` is not defined on a class, Python automatically falls back to `__repr__`.

---

### Q13: Why is `tuple` immutable, but a tuple containing a list can be mutated?
**Difficulty:** 🟡 Mid  
**Type:** 🧩 Output Prediction  
**Tags:** `[QuickFire]` `[Mutability]`

**Answer:**
A `tuple`'s immutability means its **array of reference pointers cannot be modified** (no adding, removing, or reassigning pointers). However, the objects that those pointers reference may themselves be mutable. If `t = ([1, 2], 3)`, `t[0].append(4)` modifies the list in place without modifying the pointer stored in the tuple.

---

### Q14: What is the difference between shallow copy (`copy.copy()`) and deep copy (`copy.deepcopy()`)?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Copy]`

**Answer:**
A **shallow copy** constructs a new compound object and inserts references to the original child objects. A **deep copy** recursively constructs new compound objects and copies all nested children, maintaining a memo dictionary to prevent infinite recursion on cyclic data structures.
