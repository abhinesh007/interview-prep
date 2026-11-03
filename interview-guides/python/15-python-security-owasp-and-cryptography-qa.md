# 15 — Python Security, OWASP & Cryptography

> Insecure Deserialization (`pickle` RCE & PyYAML), Command & Code Injection (`subprocess` & `eval` Sandbox Escapes), SQL Injection in SQLAlchemy, Timing Attacks (`hmac.compare_digest`), Password Hashing (Argon2), JWT Traps, and SSRF Prevention.

---

## 📑 Table of Contents
1. [Insecure Deserialization: `pickle` RCE & PyYAML](#1-insecure-deserialization-pickle-rce--pyyaml)
2. [Code Injection & Python Sandbox Escapes (`eval` & `exec`)](#2-code-injection--python-sandbox-escapes-eval--exec)
3. [Command Injection & Subprocess Hardening](#3-command-injection--subprocess-hardening)
4. [SQL Injection in ORMs & Dynamic Queries](#4-sql-injection-in-orms--dynamic-queries)
5. [Cryptographic Best Practices & Timing Side-Channels](#5-cryptographic-best-practices--timing-side-channels)
6. [API Security: JWT Traps, SSRF & Supply Chain Audits](#6-api-security-jwt-traps-ssrf--supply-chain-audits)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. Insecure Deserialization: `pickle` RCE & PyYAML

### Q1: Why is Python's `pickle` module inherently unsafe for untrusted input? Demonstrate how `pickle` achieves Remote Code Execution (RCE) via `__reduce__`.
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Security]` `[pickle]` `[RCE]` `[OWASP]`

**Answer:**
`pickle` is not simply a data serialization format (like JSON); it is an interpreted bytecode language designed to reconstruct arbitrary Python object graphs.

When an object is unpickled, CPython looks for the **`__reduce__`** magic method:
- `__reduce__` must return a tuple `(callable, (arg1, arg2, ...))`.
- During `pickle.loads()`, CPython **automatically invokes the callable with the provided arguments** to reconstruct the object!

#### The Exploit Payload:
An attacker crafts a malicious class whose `__reduce__` executes arbitrary OS commands:

```python
import os
import pickle


class MaliciousExploit:

  def __reduce__(self):
    # Executes arbitrary shell command when unpickled!
    command = "cat /etc/passwd"  # Or reverse shell payload
    return (os.system, (command,))


# Attacker serializes the payload:
malicious_bytes = pickle.dumps(MaliciousExploit())

# 💥 VICTIM BACKEND UNPICKLES UNTRUSTED DATA:
# The moment pickle.loads() is executed, os.system("cat /etc/passwd") runs immediately!
pickle.loads(malicious_bytes)
```

#### Safe Alternatives:
- Use data-only formats: `json`, `msgpack`, Protocol Buffers, or `tomllib`.
- If Python objects must be serialized, sign the serialized payload with HMAC (`itsdangerous` or `hmac`) and reject any payload where the cryptographic signature does not verify.

#### PyYAML Gotcha:
Similar to `pickle`, `yaml.load(payload, Loader=yaml.Loader)` executes arbitrary Python code. Always use **`yaml.safe_load(payload)`**, which strictly parses basic YAML data types.

---

## 2. Code Injection & Python Sandbox Escapes (`eval` & `exec`)

### Q2: Why is it virtually impossible to build a secure Python sandbox using `eval(code, {"__builtins__": {}})`? Demonstrate a sandbox breakout.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Security]` `[eval]` `[SandboxEscape]`

**Answer:**
Developers often attempt to create "safe formula evaluation" engines by disabling built-in functions:
```python
# NAIVE ATTEMPT:
eval(user_code, {"__builtins__": {}}, {})
```

#### Why Python Sandbox Escapes are Trivial:
In Python, *everything is connected through the object model*. Even with zero built-in functions, an attacker can traverse the Method Resolution Order (MRO) of any basic literal (like empty tuple `()` or string `""`) to reach `object`, inspect its subclasses, and locate the `subprocess.Popen` or `os.system` classes:

```python
# Malicious user_code input string:
"""
[
    cls for cls in ().__class__.__base__.__subclasses__() 
    if cls.__name__ == 'BuiltinImporter' or 'Popen' in cls.__name__
][0]('cat /etc/passwd', shell=True)
"""
```

#### The Safe Alternative: `ast.literal_eval` or `simpleeval`:
- To safely parse literal values (strings, numbers, tuples, lists, dicts, booleans, None), use **`ast.literal_eval()`**. It parses the Abstract Syntax Tree directly and raises `ValueError` if any executable statement, variable lookup, or operator is detected.
- To evaluate mathematical expressions, use dedicated sandboxed parsers like the **`simpleeval`** library.

---

## 3. Command Injection & Subprocess Hardening

### Q3: Why is `subprocess.run(shell=True)` a severe security vulnerability? Contrast with safe argument lists.
**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `[Security]` `[subprocess]` `[CommandInjection]`

**Answer:**

```python
# VULNERABLE CODE (shell=True):
import subprocess


def convert_document(filename: str):
  # If filename is "report.pdf; rm -rf /", the shell executes BOTH commands!
  subprocess.run(f"soffice --convert-to pdf {filename}", shell=True)
```

When `shell=True` is enabled, Python passes the entire formatted string to the system shell (`/bin/sh -c`). The shell treats characters like `;`, `&&`, `|`, `` ` ``, and `$(...)` as command separators, allowing arbitrary command execution.

#### The Hardened Production Fix:
Set `shell=False` (default) and pass arguments as an **explicit list of strings**:

```python
import subprocess


def convert_document_secure(filename: str):
  # Operating system executes the binary directly without a shell interpreter:
  # Even if filename contains "; rm -rf /", it is treated strictly as a literal filename string!
  subprocess.run(
      ["soffice", "--convert-to", "pdf", filename],
      shell=False,
      check=True,
      timeout=30,  # Prevents denial-of-service hangs
  )
```

---

## 4. SQL Injection in ORMs & Dynamic Queries

### Q4: How do developers accidentally introduce SQL Injection (SQLi) into SQLAlchemy queries? How do you fix it?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Security]` `[SQLInjection]` `[SQLAlchemy]`

**Answer:**
SQLAlchemy ORM methods (`filter()`, `where()`) automatically use parameterized queries (prepared statements). However, developers introduce vulnerabilities when using `text()` with string formatting:

```python
from sqlalchemy import text

# 💥 VULNERABLE CODE (Python f-string interpolation):
user_input = "alice' OR '1'='1"
stmt = text(f"SELECT * FROM users WHERE username = '{user_input}'")
# Emits: SELECT * FROM users WHERE username = 'alice' OR '1'='1' (Bypasses auth!)
```

#### Production Fix: Explicit Bound Parameters
Pass untrusted variables separately as bound parameters:

```python
from sqlalchemy import text

# SECURE: Database engine treats input strictly as data, never as executable code:
stmt = text(
    "SELECT * FROM users WHERE username = :username"
).bindparams(username=user_input)
result = await session.execute(stmt)
```

#### Dynamic Column Sorting Gotcha:
SQL does not support parameterized column identifiers in `ORDER BY`. If allowing users to sort by dynamic columns, you **must whitelist** allowed column names against an explicit set:

```python
ALLOWED_SORT_COLUMNS = {"created_at", "username", "email"}
sort_col = (
    user_sort_input
    if user_sort_input in ALLOWED_SORT_COLUMNS
    else "created_at"
)
stmt = select(User).order_by(getattr(User, sort_col))
```

---

## 5. Cryptographic Best Practices & Timing Side-Channels

### Q5: What is a cryptographic timing attack? Why is `token == secret` vulnerable, and how does `hmac.compare_digest` eliminate it?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Cryptography]` `[TimingAttack]` `[Security]`

**Answer:**
Standard Python string equality `a == b` uses **short-circuit optimization**: it compares strings character-by-character from left to right and returns `False` immediately upon the first mismatched byte:

```text
Attacker Guesses: "Axxxx" -> Fails at index 0 (Takes 1.2 microseconds)
Attacker Guesses: "Txxxx" -> Matches index 0, fails index 1 (Takes 1.8 microseconds)
```
By measuring HTTP response latency down to microseconds, an attacker can deduce character by character, eventually recovering secret webhook signatures, API tokens, or session IDs.

#### The Fix: Constant-Time Comparison via `hmac.compare_digest`
Python's standard library provides `hmac.compare_digest(a, b)` (PEP 506):

```python
import hmac


def verify_webhook_signature(
    incoming_signature: str, calculated_signature: str
) -> bool:
  # Compares every byte in constant time regardless of where mismatches occur:
  return hmac.compare_digest(incoming_signature, calculated_signature)
```

---

### Q6: Why are MD5 and SHA256 unsuited for password storage? How do you securely hash passwords in Python?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Cryptography]` `[Argon2]` `[Passwords]`

**Answer:**
MD5 and SHA-256 are general-purpose cryptographic hash functions designed to be **extremely fast**. A modern GPU cluster can compute over **100 billion SHA-256 hashes per second**, making brute-force cracking trivial.

Password hashing requires **slow, memory-hard key derivation functions**:
- **Argon2id:** Winner of the Password Hashing Competition. Highly resistant to GPU/ASIC cracking by requiring both computational time and large physical RAM buffers.
- **Bcrypt:** Adaptive work factor, industry standard.

#### Production Implementation with `argon2-cffi`:
```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher(
    time_cost=3,  # Number of iterations
    memory_cost=65536,  # 64 MB of RAM required per verification
    parallelism=4,
)

# Hashing a password (automatically handles random salting):
password_hash = ph.hash("SuperSecretP@ssword123")

# Verifying a password:
try:
  ph.verify(password_hash, "SuperSecretP@ssword123")
  print("Password correct!")
except VerifyMismatchError:
  print("Invalid credentials.")
```

---

## 6. API Security: JWT Traps, SSRF & Supply Chain Audits

### Q7: What are the two most common JWT vulnerabilities in Python APIs (Algorithm Confusion & "none" Algorithm)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[JWT]` `[Security]` `[Auth]`

**Answer:**
1. **The `"none"` Algorithm Exploit:**
   - Attackers modify the JWT header to `{"alg": "none", "typ": "JWT"}` and strip the signature.
   - If the backend uses naive libraries or passes `options={"verify_signature": False}`, the token is accepted without verification, granting admin access.
   - *Fix:* Explicitly enforce the allowed algorithm in `jwt.decode(token, key, algorithms=["RS256"])`.

2. **Algorithm Confusion (Asymmetric to Symmetric):**
   - The server expects tokens signed using an asymmetric key pair (**RS256** using a private RSA key).
   - An attacker changes the algorithm in the header to **HS256** (symmetric HMAC) and signs the token using the server's **public RSA key** (which is publicly accessible via JWKS endpoints).
   - The backend reads the public key as the secret and verifies the HMAC signature successfully!
   - *Fix:* Never trust the `alg` header from the token. Strictly enforce the expected algorithm list in the verification configuration.

---

### Q8: What is Server-Side Request Forgery (SSRF)? How do you protect a Python webhook engine from querying internal cloud metadata?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[SSRF]` `[Networking]` `[Security]`

**Answer:**
SSRF occurs when an application fetches remote URLs supplied by untrusted users (e.g., importing avatars, testing webhook endpoints). An attacker provides `http://169.254.169.254/latest/meta-data/iam/security-credentials/` to steal AWS IAM instance credentials or queries internal databases (`http://10.0.0.5:5432`).

#### Defense Strategy:
1. Parse the URL and resolve the domain to IP addresses using `socket.getaddrinfo()`.
2. Validate that the resolved IP does **not** fall into loopback (`127.0.0.0/8`), private RFC 1918 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or link-local metadata addresses (`169.254.169.254`).
3. Disable automatic HTTP redirect following in `httpx` to prevent DNS Rebinding bypasses.

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q9: Why is `os.path.join("/base/storage", user_filename)` vulnerable to Path Traversal if `user_filename` starts with `/`?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[QuickFire]` `[PathTraversal]`

**Answer:**
In Python, if any component passed to `os.path.join()` is an **absolute path** (starts with a leading slash `/`), **all previous components are completely discarded**!
`os.path.join("/base/storage", "/etc/passwd")` returns **`"/etc/passwd"`**!
Always resolve paths using `pathlib.Path(base).resolve()` and verify that the target path begins with the base directory (`resolved_path.is_relative_to(base)`).

---

### Q10: What is Mass Assignment / Over-Posting, and how do Pydantic models prevent it in FastAPI?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[QuickFire]` `[FastAPI]`

**Answer:**
Mass assignment happens when an attacker passes unexpected JSON fields (e.g., `{"is_admin": true, "role": "superuser"}`) directly into an update endpoint. Pydantic request models prevent this by strictly defining permitted input schemas; any undeclared fields are automatically ignored (or rejected with validation errors if `extra="forbid"` is configured).
