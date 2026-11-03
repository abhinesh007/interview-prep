# 🎯 Python Interview Master Index & Table of Contents

> Complete, production-grade, section-wise Python interview preparation guide covering CPython runtime internals, memory management, modern concurrency (GIL & free-threading, multiprocessing, asyncio event loops), modern API frameworks (FastAPI, Starlette, Flask, ASGI vs WSGI), data layers (Pydantic v2 in Rust, SQLAlchemy 2.0 async ORM, Alembic), distributed observability (OpenTelemetry Python SDK, `structlog`, Prometheus multiprocess mode), enterprise security (OWASP Top 10 for Python, pickle RCE, timing attacks, SQL injection, JWTs, cryptography), and enterprise system design using the RADIO framework.

---

## 📚 Study Modules

| Module | Title | Key Topics Covered | Target Qs | Link | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **00** | **Table of Contents** | Master Index, Navigation, Difficulty Matrix & Learning Tracks | Index | [Read Index →](00-table-of-contents.md) | 🎯 Ready |
| **01** | **CPython Internals & Memory Architecture** | CPython Execution, Bytecode, `PyObject`, Reference Counting, Generational GC, `__slots__` | 18–22 | [Read Guide →](01-python-internals-and-execution-model-qa.md) | ✅ Ready |
| **02** | **Advanced Features & Metaprogramming** | Descriptors, Metaclasses, `__init_subclass__`, Decorators (`functools.wraps`), Dunders, Context Managers | 18–22 | [Read Guide →](02-advanced-language-features-and-metaprogramming-qa.md) | ✅ Ready |
| **03** | **Type System & Language Evolution** | Python 3.10–3.13, Pattern Matching, Generics (PEP 695), `Protocol` vs `ABC`, `ExceptionGroup` / `except*` | 16–20 | [Read Guide →](03-modern-python-type-system-and-language-evolution-qa.md) | ✅ Ready |
| **04** | **Concurrency, GIL & Multiprocessing** | GIL Mechanics, CPU vs I/O Bound, `threading` vs `multiprocessing`, Race Conditions, Free-Threading (PEP 703) | 18–22 | [Read Guide →](04-concurrency-gil-threading-and-multiprocessing-qa.md) | ✅ Ready |
| **05** | **AsyncIO & Event Loop Mechanics** | Event Loop Internals, Coroutines, Tasks, `TaskGroup`, Event Loop Starvation, `asyncio.to_thread`, `uvloop` | 18–22 | [Read Guide →](05-asyncio-event-loop-and-reactive-programming-qa.md) | ✅ Ready |
| **06** | **Generators, Iterators & Streaming** | Iterator Protocol, `yield`, Two-Way Comms (`send`/`throw`/`close`), `yield from`, `itertools`, `lru_cache` | 16–18 | [Read Guide →](06-generators-iterators-and-functional-programming-qa.md) | ✅ Ready |
| **07** | **Packaging, Modern Tooling & Environments** | `pyproject.toml` (PEP 517/518/621), `uv` (Astral), Poetry, Virtualenvs, Wheels, Ruff, Mypy / Pyright | 14–16 | [Read Guide →](07-modern-packaging-tooling-and-environments-qa.md) | ✅ Ready |
| **08** | **Flask Architecture & WSGI Mechanics** | WSGI Spec (PEP 3333), Request/App Contexts (`g`, `current_app`), Context Locals, Blueprints, WSGI Middleware | 16–18 | [Read Guide →](08-flask-architecture-and-wsgi-internals-qa.md) | ✅ Ready |
| **09** | **FastAPI, Starlette & ASGI Architecture** | ASGI Spec, FastAPI vs Flask, `async def` vs `def` Threadpool, Dependency Injection (`Depends`), Lifespans | 18–22 | [Read Guide →](09-fastapi-starlette-and-asgi-architecture-qa.md) | ✅ Ready |
| **10** | **Data Validation & Pydantic v2** | Rust Core (`pydantic-core`), `@field_validator` & `@model_validator` modes, `model_dump()`, Strict Mode | 16–20 | [Read Guide →](10-data-validation-pydantic-v2-and-serialization-qa.md) | ✅ Ready |
| **11** | **Database Layers & Async SQLAlchemy 2.0** | SQLAlchemy 2.0 Core/ORM, `AsyncSession`, `MissingGreenlet` Trap, Eager Loading (`selectinload`), Alembic | 18–22 | [Read Guide →](11-database-layers-async-sqlalchemy-and-alembic-qa.md) | ✅ Ready |
| **12** | **Distributed Queues, Jobs & Real-Time** | Celery (Brokers, Prefetch, Late Ack), Modern Async Queues (Arq), WebSockets in FastAPI, SSE Streaming | 16–20 | [Read Guide →](12-distributed-queues-background-jobs-and-realtime-qa.md) | ✅ Ready |
| **13** | **Structured Logging & OpenTelemetry** | Structured Logging (`structlog`), OpenTelemetry SDK (Traces, Spans, `contextvars`), W3C Trace Context | 16–20 | [Read Guide →](13-structured-logging-and-opentelemetry-observability-qa.md) | ✅ Ready |
| **14** | **Prometheus Metrics & Reliability** | Prometheus Client (`prometheus_multiproc_dir` Gunicorn Gotcha), RED/USE Methods, K8s Probes, Graceful Exit | 16–20 | [Read Guide →](14-prometheus-metrics-health-checks-and-reliability-qa.md) | ✅ Ready |
| **15** | **OWASP Security, Vulnerabilities & Crypto** | Insecure Deserialization (`pickle` RCE, PyYAML), Code/Command Injection, SQLi, Timing Attacks, Argon2, JWTs | 18–22 | [Read Guide →](15-python-security-owasp-and-cryptography-qa.md) | ✅ Ready |
| **16** | **Enterprise System Design (RADIO)** | High-Throughput Event Ingestion, Resilient Async Worker Pipeline, Microservice Circuit Breaking, Docker | 12–15 | [Read Guide →](16-enterprise-system-design-and-production-architecture-qa.md) | ✅ Ready |

---

## 🎯 Question Format Standard

Every question across all modules strictly complies with the standardized schema:

```markdown
### Q[N]: [Title of the Question]

**Difficulty:** 🟢 Junior | 🟡 Mid | 🔴 Senior | 🟣 Principal / Lead  
**Type:** 📖 Conceptual | 💻 Practical / Coding | 🧩 Output Prediction | 🐛 Debug & Bug Hunting | 🏗️ Architecture / System Design  
**Tags:** `[Tag1]` `[Tag2]`

**Answer:**
[In-depth technical explanation covering engine and runtime mechanics under the hood. Accompanied by ASCII diagrams, comparison matrices, and production-grade Python 3.12+ code snippets.]

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "[Edge-case challenge, gotcha trap, or follow-up probe]"  
*Senior Answer:* [How a senior engineer addresses the challenge with trade-offs, mitigations, and runtime nuance.]
```

---

## 🚦 Recommended Learning Tracks

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   🗺️ PYTHON INTERVIEW STUDY TRACKS                      │
├────────────────────────────────────────────────────────────────────────┤
│ 🟢 JUNIOR FOUNDATIONS TRACK:                                           │
│    Focus: Python runtime model, core OOP, iterators, packaging, Flask. │
│    • 01-python-internals-and-execution-model-qa.md                     │
│    • 02-advanced-language-features-and-metaprogramming-qa.md           │
│    • 06-generators-iterators-and-functional-programming-qa.md          │
│    • 07-modern-packaging-tooling-and-environments-qa.md               │
│    • 08-flask-architecture-and-wsgi-internals-qa.md                    │
│                                                                        │
│ 🟡 MID-LEVEL BACKEND & API ENGINEER TRACK:                             │
│    Focus: Modern Python (3.10-3.13), AsyncIO, FastAPI, Pydantic, ORMs. │
│    • 03-modern-python-type-system-and-language-evolution-qa.md         │
│    • 05-asyncio-event-loop-and-reactive-programming-qa.md              │
│    • 09-fastapi-starlette-and-asgi-architecture-qa.md                  │
│    • 10-data-validation-pydantic-v2-and-serialization-qa.md            │
│    • 11-database-layers-async-sqlalchemy-and-alembic-qa.md             │
│    • 12-distributed-queues-background-jobs-and-realtime-qa.md          │
│                                                                        │
│ 🔴 SENIOR RELIABILITY, OBSERVABILITY & SECURITY TRACK:                 │
│    Focus: Concurrency/GIL, distributed tracing, metrics, & OWASP.     │
│    • 04-concurrency-gil-threading-and-multiprocessing-qa.md            │
│    • 13-structured-logging-and-opentelemetry-observability-qa.md       │
│    • 14-prometheus-metrics-health-checks-and-reliability-qa.md         │
│    • 15-python-security-owasp-and-cryptography-qa.md                   │
│                                                                        │
│ 🟣 PRINCIPAL ARCHITECT & SYSTEM DESIGN TRACK:                          │
│    Focus: Enterprise architecture, resilient top-level design & scale. │
│    • 16-enterprise-system-design-and-production-architecture-qa.md     │
│    • Complete Cross-cutting Deep Dives Across All Modules              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Related Repository References

- [Master Plan (`PLAN.md`)](PLAN.md)
- [Repository Architecture Context (`../CONTEXT.md`)](../CONTEXT.md)
- [AI Playbook & Guidelines (`../SKILL.md`)](../SKILL.md)
- [Master Authoring Templates (`../TEMPLATES.md`)](../TEMPLATES.md)
