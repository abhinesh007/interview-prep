# 08 — Flask Architecture & WSGI Internals

> The Web Server Gateway Interface (WSGI / PEP 3333), Flask Dual-Context Model (`app_context` vs `request_context`), `current_app`, `g`, Application Factories, WSGI Middleware, and Async View Limitations.

---

## 📑 Table of Contents
1. [The WSGI Specification (PEP 3333)](#1-the-wsgi-specification-pep-3333)
2. [Flask Dual-Context Architecture (`Application` vs `Request`)](#2-flask-dual-context-architecture-application-vs-request)
3. [The Application Factory Pattern & Blueprints](#3-the-application-factory-pattern--blueprints)
4. [Request Lifecycle Hooks & WSGI Middleware](#4-request-lifecycle-hooks--wsgi-middleware)
5. [Async Views in Flask & WSGI Concurrency Bottlenecks](#5-async-views-in-flask--wsgi-concurrency-bottlenecks)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The WSGI Specification (PEP 3333)

### Q1: What is the WSGI specification (PEP 3333)? Write a raw WSGI application from scratch without using any framework.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[WSGI]` `[PEP3333]` `[Architecture]`

**Answer:**
The **Web Server Gateway Interface (WSGI)** is the synchronous standard bridging Python web applications with web servers (Gunicorn, uWSGI, Nginx).

```text
┌─────────────────┐      HTTP Request       ┌─────────────────┐
│   Web Browser   │ ──────────────────────► │   Nginx / LB    │
└─────────────────┘                         └────────┬────────┘
                                                     │ Reverse Proxy
                                            ┌────────▼────────┐
                                            │ Gunicorn Server │
                                            │  (WSGI Server)  │
                                            └────────┬────────┘
                                                     │ environ, start_response
                                            ┌────────▼────────┐
                                            │ Flask / Raw App │
                                            │ (WSGI Callable) │
                                            └─────────────────┘
```

#### The WSGI Contract:
A WSGI application is any Python callable (function, method, or class with `__call__`) that accepts two positional arguments:
1. `environ`: A standard Python dictionary containing CGI environment variables, HTTP headers, request paths, and the input byte stream (`wsgi.input`).
2. `start_response`: A callable callback provided by the server to set the HTTP status code and response headers.
It must return an **iterable of bytes** (e.g., list of bytes chunks).

#### Raw WSGI Application Implementation:
```python
from collections.abc import Iterable
from typing import Callable


def simple_wsgi_app(
    environ: dict, start_response: Callable
) -> Iterable[bytes]:
  method = environ.get("REQUEST_METHOD", "GET")
  path = environ.get("PATH_INFO", "/")

  if path == "/health":
    status = "200 OK"
    response_headers = [
        ("Content-Type", "application/json"),
        ("X-Custom-Server", "Raw-WSGI"),
    ]
    start_response(status, response_headers)
    return [b'{"status": "healthy"}']

  status = "404 Not Found"
  start_response(status, [("Content-Type", "text/plain")])
  return [b"Route not found"]
```

---

## 2. Flask Dual-Context Architecture (`Application` vs `Request`)

### Q2: How does Flask’s Dual-Context architecture work under the hood? Explain `request`, `session`, `current_app`, and `g`.
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Flask]` `[Contexts]` `[ContextVars]`

**Answer:**
Flask operates with two distinct context layers:

```text
┌────────────────────────────────────────────────────────┐
│                   Application Context                  │
│  - Active when processing an app task or request       │
│  - Proxies: current_app (App instance), g (Globals)    │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Request Context                  │  │
│  │  - Active ONLY during an incoming HTTP request   │  │
│  │  - Proxies: request (HTTP data), session (Cookie)│  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### 1. The Request Context:
Tracks request-specific data: URL, HTTP headers, query parameters, form uploads, and parsed cookies.
- Proxies: **`request`** and **`session`**.
- Created when an HTTP request arrives, pushed onto context storage, and popped off after the response is sent.

#### 2. The Application Context:
Tracks application-level state bound to the running application instance.
- Proxies: **`current_app`** (points to the active Flask application instance) and **`g`** (a general-purpose namespace for storing per-request database connections, authenticated users, or timing marks).

#### Context Storage Evolution:
- Historically, Flask used `werkzeug.local.LocalStack` based on thread IDs (`threading.get_ident()`).
- Modern Flask and Werkzeug (3.0+) use Python's **`contextvars`** module, ensuring contexts propagate correctly across asynchronous tasks and thread pools.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "Why does running a standalone script or Celery task that imports an extension function raise `RuntimeError: Working outside of application context`?"  
*Senior Answer:* Because outside of an HTTP request, no application context is pushed onto context storage. To access `current_app` or database extensions in CLI scripts or tasks, you must explicitly push an app context using:
```python
with app.app_context():
  db.create_all()
```

---

## 3. The Application Factory Pattern & Blueprints

### Q3: Why is defining `app = Flask(__name__)` at the module level an enterprise anti-pattern? How does the Application Factory pattern solve it?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Flask]` `[ApplicationFactory]` `[Blueprints]`

**Answer:**
Defining a global module-level `app` causes severe architectural problems:
1. **Circular Imports:** Modules importing models, views, and routes must import `app`, while `app` imports them to register routes.
2. **Testing Inflexibility:** You cannot create isolated app instances with different configurations (e.g., testing with SQLite in-memory vs staging with PostgreSQL) within the same test suite.

#### The Application Factory Pattern (`create_app`):
```python
from flask import Flask
from myproject.extensions import db, migrate
from myproject.views.users import users_bp


def create_app(config_name: str = "production") -> Flask:
  app = Flask(__name__)

  # 1. Load Configuration
  app.config.from_object(f"myproject.config.{config_name.capitalize()}Config")

  # 2. Initialize Extensions (Binding to app instance)
  db.init_app(app)
  migrate.init_app(app, db)

  # 3. Register Blueprints
  app.register_blueprint(users_bp, url_prefix="/api/v1/users")

  return app
```

---

## 4. Request Lifecycle Hooks & WSGI Middleware

### Q4: Explain the difference between `before_request`, `after_request`, and `teardown_request`. Write a WSGI middleware for request timing.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Flask]` `[Middleware]` `[Lifecycle]`

**Answer:**

```text
Incoming HTTP Request
        │
1. WSGI Middleware (__call__)
        │
2. Flask @app.before_request (Can abort/return early)
        │
3. Route View Function executes
        │
4. Flask @app.after_request (Mutates response headers; skipped if view crashed!)
        │
5. Flask @app.teardown_request (ALWAYS runs, even on 500 crashes; closes DB sessions)
        │
6. WSGI Middleware returns bytes to client
```

#### Differences:
- **`before_request`**: Runs before every route. If it returns a value (e.g., an unauthorized redirect), route execution is aborted.
- **`after_request`**: Takes the `Response` object, allows modifying headers (e.g., CORS, security headers), and returns the response. **Skipped if the view raised an unhandled exception!**
- **`teardown_request`**: **Guaranteed to run** at the end of the request, receiving the exception object if one was raised. Ideal for closing database transactions or releasing resources.

#### Custom WSGI Middleware Implementation:
```python
import time


class RequestTimingMiddleware:

  def __init__(self, wsgi_app):
    self.wsgi_app = wsgi_app

  def __call__(self, environ, start_response):
    start_time = time.perf_counter()

    def custom_start_response(status, response_headers, exc_info=None):
      duration = time.perf_counter() - start_time
      response_headers.append(("X-Response-Time-Seconds", f"{duration:.4f}"))
      return start_response(status, response_headers, exc_info)

    return self.wsgi_app(environ, custom_start_response)


# Apply in app factory:
app.wsgi_app = RequestTimingMiddleware(app.wsgi_app)
```

---

## 5. Async Views in Flask & WSGI Concurrency Bottlenecks

### Q5: Flask 2.0+ supports `async def` view functions. Does this make Flask as performant as FastAPI or ASGI frameworks?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Flask]` `[Async]` `[WSGIvsASGI]`

**Answer:**
**No.** Running `async def` views in Flask does **NOT** transform Flask into an asynchronous ASGI application.

```text
Gunicorn WSGI Worker (Sync Pre-Fork Model):
┌────────────────────────────────────────────────────────┐
│  Worker Process 1 (1 Thread)                          │
│                                                        │
│  Incoming Request ──► Runs async view via              │
│                       asgiref.sync.async_to_sync       │
│                                                        │
│  Event Loop awaits ──► Worker thread BLOCKS!           │
│  I/O for 200ms         Zero other requests can run!    │
└────────────────────────────────────────────────────────┘
```

#### Why Async in Flask is Still Bottlenecked:
1. **WSGI is Synchronous by Definition:** The underlying WSGI server (Gunicorn with sync workers) expects synchronous execution. When an `async def` route is called, Flask wraps it with `asgiref.sync.async_to_sync`, spinning up a short-lived event loop inside the worker thread.
2. **Worker Blocking:** While the coroutine is awaiting an external API, the entire Gunicorn worker thread is **completely blocked** from accepting new requests.
3. If you have 4 Gunicorn workers, Flask can only process 4 concurrent requests at a time, regardless of whether your routes are `def` or `async def`. To achieve true 100,000+ socket asynchronous I/O multiplexing, you must use an **ASGI framework** like FastAPI or Starlette.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why should you use `ProxyFix` when deploying Flask behind Nginx or an AWS Application Load Balancer?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[ProxyFix]`

**Answer:**
When deployed behind a reverse proxy, `request.remote_addr` returns the proxy's internal IP address (`127.0.0.1` or `10.0.0.X`) and `request.scheme` returns `http` even if the client connected over `https`. `werkzeug.middleware.proxy_fix.ProxyFix` inspects `X-Forwarded-For` and `X-Forwarded-Proto` headers to restore the true client IP and HTTPS scheme.

---

### Q7: What is the security vulnerability with Flask's default client-side session cookies?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[Security]`

**Answer:**
Flask default session cookies are **cryptographically signed, but NOT encrypted**! The cookie data is base64-encoded and can be read by anyone in the browser developer tools. Storing sensitive data (like user passwords, API tokens, or payment details) in Flask's default `session` leaks secrets to the client.
