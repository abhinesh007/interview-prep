# 13 — Structured Logging & OpenTelemetry Observability

> High-Performance Structured Logging with `structlog`, Event Loop Non-Blocking Logging, Correlation IDs with `contextvars`, OpenTelemetry (OTel) Distributed Tracing, W3C Trace Context Propagation, and Log-to-Trace Correlation.

---

## 📑 Table of Contents
1. [Structured Logging Architecture (`structlog` vs Standard Library)](#1-structured-logging-architecture-structlog-vs-standard-library)
2. [Context Propagation with `contextvars` & Correlation IDs](#2-context-propagation-with-contextvars--correlation-ids)
3. [OpenTelemetry Distributed Tracing (Traces, Spans, Baggage)](#3-opentelemetry-distributed-tracing-traces-spans-baggage)
4. [Correlating Logs with OpenTelemetry Distributed Traces](#4-correlating-logs-with-opentelemetry-distributed-traces)
5. [Telemetry Security: PII Scrubbing & Attribute Masking](#5-telemetry-security-pii-scrubbing--attribute-masking)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Structured Logging Architecture (`structlog` vs Standard Library)

### Q1: Why does standard library `logging` fall short in modern cloud-native architectures? How does `structlog`'s processor pipeline operate?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Observability]` `[structlog]` `[JSON]`

**Answer:**
Standard Python `logging` produces unstructured text strings:
```text
2026-10-12 10:15:32 INFO [user_service] User 1042 checked out order 5901 with total 150.00
```
Log aggregation systems (Datadog, Elasticsearch, Grafana Loki) cannot index or aggregate arbitrary text without expensive regex parsing.

**`structlog`** structures logs as **immutable dictionaries of key-value pairs** passed through a pipeline of composable processors:

```text
Event Dictionary: {"event": "order_checkout", "user_id": 1042, "amount": 150.00}
                                │
1. add_timestamp() ─────────────┼──► {"timestamp": "2026-10-12T10:15:32Z", ...}
                                │
2. inject_trace_context() ──────┼──► {"trace_id": "4bf92f3577b34da6a3ce929d0e0e4736", ...}
                                │
3. scrub_sensitive_pii() ───────┼──► Redacts passwords, credit cards
                                │
4. JSONRenderer() ──────────────▼──► Emits NDJSON string to stdout
```

#### Production `structlog` Configuration:
```python
import structlog


def configure_structured_logging():
  structlog.configure(
      processors=[
          structlog.contextvars.merge_contextvars,  # Injects request contextvars
          structlog.processors.add_log_level,
          structlog.processors.TimeStamper(fmt="iso"),
          structlog.processors.StackInfoRenderer(),
          structlog.processors.format_exc_info,
          structlog.processors.JSONRenderer(),  # High-speed JSON serialization
      ],
      wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
      context_class=dict,
      logger_factory=structlog.BytesLoggerFactory(),
      cache_logger_on_first_use=True,
  )


logger = structlog.get_logger()
# Logs: {"timestamp":"2026-10-12T...","level":"info","event":"user_login","user_id":1042,"tenant":"acme"}
logger.info("user_login", user_id=1042, tenant="acme")
```

---

## 2. Context Propagation with `contextvars` & Correlation IDs

### Q2: Why does `threading.local()` fail in asynchronous Python? How do you implement request correlation IDs using `contextvars`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[contextvars]` `[CorrelationID]` `[AsyncIO]`

**Answer:**
In multi-threaded servers (e.g., standard Flask), `threading.local()` associates data with the active thread ID.
In **asyncio/FastAPI**, a single OS thread handles thousands of interleaved requests. When a coroutine hits `await`, the thread switches to another coroutine. If you used `threading.local()`, **request data would bleed between concurrent users**!

Python 3.7+ introduced **`contextvars`**, which stores context bound to the active **asyncio Task continuation**:

```python
from contextvars import ContextVar
import uuid
from fastapi import FastAPI, Request
import structlog

# ContextVar isolated across asynchronous tasks:
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
logger = structlog.get_logger()

app = FastAPI()


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
  # Extract incoming header or generate new UUID:
  req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
  token = request_id_ctx.set(req_id)

  # Bind to structlog contextvars processor:
  structlog.contextvars.clear_contextvars()
  structlog.contextvars.bind_contextvars(request_id=req_id)

  try:
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response
  finally:
    # Reset contextvar to prevent memory leak across recycled tasks:
    request_id_ctx.reset(token)
```

Now, every log emitted anywhere down the call stack automatically includes `"request_id"` without passing parameters!

---

## 3. OpenTelemetry Distributed Tracing (Traces, Spans, Baggage)

### Q3: How does OpenTelemetry (OTel) Distributed Tracing work in Python? What is the W3C Trace Context standard?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[OpenTelemetry]` `[DistributedTracing]` `[W3C]`

**Answer:**
Distributed tracing tracks requests as they flow across multiple microservices:

```text
User Request ──► Frontend API ────────► Order Service ────────► Payment Gateway
[Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736]
┌────────────────────────────────────────────────────────────────────────┐
│ Span A: Frontend API (Duration: 250ms)                                 │
│  ├─ Span B: Order Service (Duration: 180ms)                            │
│  │   └─ Span C: Payment Gateway Call (Duration: 120ms)                 │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Components:
1. **Trace:** A Directed Acyclic Graph (DAG) representing the complete journey of a request across all services, identified by a 128-bit **`TraceID`**.
2. **Span:** A single timed block of execution within a service, identified by a 64-bit **`SpanID`**. Contains timestamps, attributes, events, and status (`OK` or `ERROR`).
3. **Context Propagation (W3C `traceparent`):** When Service A calls Service B over HTTP, it injects the W3C Trace Context header:
   ```text
   traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
                │  │                                │                │
             Version TraceID                     Parent SpanID     Flags (Sampled)
   ```

---

## 4. Correlating Logs with OpenTelemetry Distributed Traces

### Q4: 💻 Coding: How do you configure OpenTelemetry manual spans and inject the active `trace_id` and `span_id` directly into `structlog`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[OpenTelemetry]` `[structlog]` `[Correlation]`

**Answer:**

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
    OTLPSpanExporter,
)
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
import structlog

# 1. Initialize OpenTelemetry Provider
resource = Resource.create({"service.name": "order-processor"})
provider = TracerProvider(resource=resource)
# Asynchronous batching processor: avoids adding network latency to user requests!
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="localhost:4317", insecure=True)
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-processor")


# 2. Custom structlog Processor for OpenTelemetry Correlation
def inject_open_telemetry_ids(logger, log_method, event_dict):
  span = trace.get_current_span()
  if span.is_recording():
    ctx = span.get_span_context()
    if ctx.is_valid:
      # Format trace_id and span_id as 32-hex and 16-hex characters:
      event_dict["trace_id"] = f"{ctx.trace_id:032x}"
      event_dict["span_id"] = f"{ctx.span_id:016x}"
  return event_dict


# Add 'inject_open_telemetry_ids' to structlog.processors!
```

```python
# Business Logic Usage:
async def process_checkout(order_id: str):
  with tracer.start_as_current_span("process_checkout") as span:
    span.set_attribute("order.id", order_id)

    # Automatically includes "trace_id" and "span_id" in JSON log payload!
    logger.info("payment_initiated", order_id=order_id)
```

Now, clicking on a log line in Grafana or Datadog immediately jumps to the exact distributed trace waterfall!

---

## 5. Telemetry Security: PII Scrubbing & Attribute Masking

### Q5: How do you prevent sensitive Personally Identifiable Information (PII) or secrets from leaking into traces and logs?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Security]` `[PII]` `[Sanitization]`

**Answer:**
Auto-instrumentation libraries frequently capture full HTTP request URLs (which may contain API tokens in query parameters) and HTTP headers (`Authorization`, `Cookie`).

#### Production Mitigation Strategy:
1. **Custom `structlog` Sanitization Processor:**
   ```python
   SENSITIVE_KEYS = {"password", "secret", "token", "credit_card", "ssn"}


   def scrub_sensitive_fields(logger, method_name, event_dict):
     for key in list(event_dict.keys()):
       if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
         event_dict[key] = "[REDACTED]"
     return event_dict
```

2. **Custom OpenTelemetry Span Processor Filter:**
   ```python
   from opentelemetry.sdk.trace import SpanProcessor


   class PiiScrubbingSpanProcessor(SpanProcessor):

     def on_start(self, span, parent_context):
       # Scrub Authorization headers or query tokens captured in attributes
       if "http.url" in span.attributes:
         url = span.attributes["http.url"]
         if "token=" in url:
           span.set_attribute("http.url", url.split("?")[0])
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What happens to buffered OpenTelemetry spans if a Python process crashes or is killed by `SIGKILL`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[OTel]`

**Answer:**
`BatchSpanProcessor` buffers spans in memory and exports them periodically. If the process is killed abruptly by `SIGKILL` or an unhandled C-level crash, buffered in-flight spans **are lost**. To prevent loss during graceful shutdowns (`SIGTERM`), always invoke `provider.shutdown()` or `processor.force_flush()` inside the application lifespan teardown hook.

---

### Q7: Why should synchronous logging handlers never write directly to NFS or slow network files inside an asyncio app?
**Difficulty:** 🟢 Junior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[EventLoop]`

**Answer:**
Standard file writes in Python invoke synchronous blocking OS system calls (`write(2)`). If the file resides on a slow or saturated disk/NFS share, the write blocks the single thread of the asyncio event loop, causing server-wide latency spikes. Always log to local `stdout` and let dedicated log-shipping sidecars (Vector, FluentBit) handle remote network transport.
