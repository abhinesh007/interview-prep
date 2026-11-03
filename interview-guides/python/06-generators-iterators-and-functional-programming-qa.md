# 06 — Generators, Iterators & Functional Programming

> The Iterator Protocol (`__iter__` vs `__next__`), Generator State Machines, Two-Way Generator Communication (`send`, `throw`, `close`), `yield from` Delegation, Memory-Efficient Streaming Pipelines, `itertools.batched`, and `functools.lru_cache` Gotchas.

---

## 📑 Table of Contents
1. [The Iterator Protocol Under the Hood](#1-the-iterator-protocol-under-the-hood)
2. [Generators, Lazy Streams & State Machines](#2-generators-lazy-streams--state-machines)
3. [Two-Way Communication: `send()`, `throw()`, and `close()`](#3-two-way-communication-send-throw-and-close)
4. [Memory-Efficient Data Pipelines ($O(1)$ RAM Processing)](#4-memory-efficient-data-pipelines-o1-ram-processing)
5. [Modern `itertools` & `functools` Caching Traps](#5-modern-itertools--functools-caching-traps)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Iterator Protocol Under the Hood

### Q1: What is the exact difference between an Iterable and an Iterator in Python? How does a `for` loop execute at the bytecode level?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Iterators]` `[Protocols]` `[Bytecode]`

**Answer:**
The **Iterator Protocol** defines two complementary concepts:

```text
┌────────────────────────────────────────────────────────┐
│                   Iterable Object                      │
│        (e.g., list, set, dict, custom stream)          │
│   Implements: __iter__() ──► Returns an Iterator       │
└───────────────────────────┬────────────────────────────┘
                            │ iter(obj)
┌───────────────────────────▼────────────────────────────┐
│                   Iterator Object                      │
│   Implements:                                          │
│   1. __next__() ──► Returns next item OR               │
│                     Raises StopIteration               │
│   2. __iter__() ──► Returns self                       │
└────────────────────────────────────────────────────────┘
```

#### Under the Hood: The Bytecode of a `for` Loop
When you write:
```python
for item in container:
  process(item)
```

CPython compiles this to the following opcode sequence:
```text
  1           0 LOAD_GLOBAL              0 (container)
              2 GET_ITER                               # 1. Calls iter(container) -> pushes iterator
        >>    4 FOR_ITER                10 (to 16)     # 2. Calls __next__(); jumps to 16 on StopIteration
              6 STORE_FAST               0 (item)
              8 LOAD_GLOBAL              1 (process)
             10 LOAD_FAST                0 (item)
             12 CALL                     1
             14 JUMP_BACKWARD            6 (to 4)      # 3. Loops back
        >>   16 END_FOR                                # 4. Cleans iterator from stack
```

The PVM executes `GET_ITER` (invoking `container.__iter__()`), repeatedly executes `FOR_ITER` (calling `__next__()` in C), and catches `StopIteration` without Python-level exception handler overhead.

---

## 2. Generators, Lazy Streams & State Machines

### Q2: What is a generator function? What are the states in a generator's lifecycle, and how do you inspect them?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Generators]` `[StateMachines]` `[inspect]`

**Answer:**
A **generator function** is any function containing the `yield` keyword. Calling it does not execute the function body; it returns a **generator iterator** that lazily computes and yields values on demand, consuming $O(1)$ memory.

#### Generator Lifecycle States (`inspect.getgeneratorstate`):
1. **`GEN_CREATED`**: Instantiated, waiting to be started.
2. **`GEN_RUNNING`**: Currently executing bytecode in the PVM.
3. **`GEN_SUSPENDED`**: Paused at a `yield` expression; local frame state, variables, and instruction pointer are frozen in memory.
4. **`GEN_CLOSED`**: Execution completed (either returned or raised `StopIteration`/`GeneratorExit`).

```python
import inspect


def count_stream():
  yield 1
  yield 2


gen = count_stream()
print(inspect.getgeneratorstate(gen))  # GEN_CREATED

next(gen)
print(inspect.getgeneratorstate(gen))  # GEN_SUSPENDED

next(gen)
try:
  next(gen)
except StopIteration:
  pass

print(inspect.getgeneratorstate(gen))  # GEN_CLOSED
```

---

## 3. Two-Way Communication: `send()`, `throw()`, and `close()`

### Q3: How do `generator.send()`, `generator.throw()`, and `generator.close()` enable two-way communication?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Generators]` `[Coroutines]` `[send]`

**Answer:**
`yield` is not only an output statement; it is also an **expression that accepts input values from the caller**:

```python
def moving_average():
  total = 0.0
  count = 0
  average = 0.0

  while True:
    # 1. Yield current average, and 2. Receive new value from caller:
    new_val = yield average
    if new_val is None:
      break
    total += new_val
    count += 1
    average = total / count


avg = moving_average()
# Primer: Must advance to the first yield before sending values!
next(avg)  # Returns 0.0

print(avg.send(10.0))  # Output: 10.0
print(avg.send(20.0))  # Output: 15.0
print(avg.send(30.0))  # Output: 20.0

# Injecting an exception into the suspended frame:
# avg.throw(ValueError("Reset!"))

# Closes the generator (raises GeneratorExit inside):
avg.close()
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if you call `gen.send(10)` immediately after creating a generator without calling `next(gen)` or `gen.send(None)` first?"  
*Senior Answer:* It raises `TypeError: can't send non-none value to a just-started generator`. When a generator is in the `GEN_CREATED` state, it hasn't advanced to the first `yield` expression yet, so there is no expression waiting to receive the value. You must always **prime** the generator first using `next(gen)` or `gen.send(None)`.

---

## 4. Memory-Efficient Data Pipelines ($O(1)$ RAM Processing)

### Q4: 💻 Coding: Design a streaming data pipeline in Python that processes a 100GB access log file within a strictly capped 50MB RAM memory footprint.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Streams]` `[Memory]` `[DataEngineering]`

**Answer:**
By chaining generator expressions, each record flows through processing stages lazily item-by-item without accumulating in memory:

```python
from collections.abc import Iterator
import json
from pathlib import Path
from typing import Any


def stream_log_lines(filepath: Path) -> Iterator[str]:
  """Lazily reads lines one at a time from disk."""
  with open(filepath, "r", encoding="utf-8") as f:
    for line in f:
      yield line


def filter_http_errors(lines: Iterator[str]) -> Iterator[str]:
  """Filters for 5xx server error logs."""
  for line in lines:
    if ' "status": 5' in line:
      yield line


def parse_json_payloads(lines: Iterator[str]) -> Iterator[dict[str, Any]]:
  """Parses raw text into JSON dictionaries."""
  for line in lines:
    try:
      yield json.loads(line)
    except json.JSONDecodeError:
      continue


def batch_records[T](
    stream: Iterator[T], batch_size: int = 1000
) -> Iterator[list[T]]:
  """Batches items for bulk ingestion into Elasticsearch / ClickHouse."""
  batch = []
  for item in stream:
    batch.append(item)
    if len(batch) >= batch_size:
      yield batch
      batch = []
  if batch:
    yield batch


# Execution pipeline: (Consumes < 30MB RAM regardless of file size!)
def process_pipeline(log_path: Path):
  raw_lines = stream_log_lines(log_path)
  error_lines = filter_http_errors(raw_lines)
  parsed_records = parse_json_payloads(error_lines)
  batches = batch_records(parsed_records, batch_size=500)

  for batch in batches:
    # Bulk insert batch into database / queue
    pass
```

---

## 5. Modern `itertools` & `functools` Caching Traps

### Q5: What is `itertools.batched` (Python 3.12+), and how did developers batch iterables previously?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[itertools]` `[Python3.12]`

**Answer:**
Batching sequences or streams is one of the most common operations in backend development (chunking database updates, API payloads, vector embeddings).

```python
import itertools

data = range(10)
# Modern Python 3.12+ built-in:
batches = list(itertools.batched(data, n=3))
print(batches)
# Output: [(0, 1, 2), (3, 4, 5), (6, 7, 8), (9,)]
```

Before Python 3.12, developers had to write custom generators or use the complex `zip(*[iter(data)]*n)` recipe which lost uneven trailing items unless padded with `itertools.zip_longest`.

---

### Q6: 🐛 Bug Hunt: The Memory Leak in `@functools.lru_cache` on Instance Methods
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[lru_cache]` `[MemoryLeak]` `[Gotcha]`

**Problem Scenario:**
An API creates short-lived request-scoped objects. After adding `@lru_cache` to a calculation method, memory leaks persistently over time:

```python
from functools import lru_cache


class RequestContext:

  def __init__(self, tenant_id: str, large_payload: bytes):
    self.tenant_id = tenant_id
    self.large_payload = large_payload

  @lru_cache(maxsize=128)
  def compute_hash(self) -> str:
    return hashlib.sha256(self.large_payload).hexdigest()
```

#### Why it Leaks:
The method `compute_hash` is decorated at the class level.
- `lru_cache` stores cached results in an internal dictionary keyed by function arguments.
- For an instance method, the first argument in `args` is **`self`** (`RequestContext`).
- The cache dictionary retains a **strong reference to `self`**.
- As long as `self` remains in the LRU cache, the entire `RequestContext` object (including its multi-megabyte `large_payload`) **CANNOT be garbage collected**, even after the HTTP request has finished!

#### The Fix:
Use `lru_cache` on a helper method that only takes primitive immutable attributes, or clear the cache on teardown:

```python
class RequestContext:

  def __init__(self, tenant_id: str, large_payload: bytes):
    self.tenant_id = tenant_id
    self.large_payload = large_payload

  def compute_hash(self) -> str:
    return self._compute_hash(self.large_payload)

  @staticmethod
  @lru_cache(maxsize=128)
  def _compute_hash(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: Why do generator expressions have separate variable scope, whereas in Python 2 list comprehensions leaked variables?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Scoping]`

**Answer:**
In Python 3, both list comprehensions and generator expressions are compiled into independent function code objects (`<listcomp>`, `<genexpr>`). Loop variables inside comprehensions and generator expressions are strictly local to that function frame and do not overwrite variables in the enclosing scope.

---

### Q8: What does `itertools.tee(iterable, n=2)` do, and what is its hidden memory trap?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[itertools]`

**Answer:**
`itertools.tee` splits an iterable into $N$ independent iterators. **Memory Trap:** If one iterator advances far ahead of the other, `tee` must buffer all intermediate items in an internal deque in RAM until the slowest iterator catches up. Using `tee` on large or infinite streams with uneven consumption will exhaust system memory.
