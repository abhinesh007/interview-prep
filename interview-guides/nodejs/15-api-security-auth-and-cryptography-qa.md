# 15 — API Security, Authentication & Cryptography

> Distributed Rate Limiting (Redis Sliding Window), Helmet Headers & CORS Traps, JWT Exploits & Token Revocation, Password Hashing (`argon2` vs `bcrypt`), and Timing Attacks (`timingSafeEqual`).

---

## 📑 Table of Contents
1. [Distributed Rate Limiting & Slowloris Defense](#1-distributed-rate-limiting--slowloris-defense)
2. [Security Headers, CORS Reflection & CSRF](#2-security-headers-cors-reflection--csrf)
3. [JWT Architectural Exploits & Revocation Strategies](#3-jwt-architectural-exploits--revocation-strategies)
4. [Modern Cryptography, Password Hashing & Timing Attacks](#4-modern-cryptography-password-hashing--timing-attacks)
5. [Authorization Architectures: RBAC vs ABAC](#5-authorization-architectures-rbac-vs-abac)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Distributed Rate Limiting & Slowloris Defense

### Q1: Implement a high-performance distributed sliding-window rate limiter in Node.js using Redis and Lua scripts.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[RateLimiting]` `[Redis]` `[Security]`

**Answer:**

#### Why In-Memory Rate Limiters Fail in Production:
In-memory counters (`express-rate-limit` with default memory store) fail because production APIs run across multiple container instances behind a load balancer. A user can send $N$ times the allowed limit by cycling requests across instances.

#### Redis Sliding Window with Atomic Lua Script:
Uses a Redis **Sorted Set (ZSET)** where each request timestamp is stored as both score and member:

```typescript
import Redis from 'ioredis';

const redis = new Redis();

// Atomic Lua Script: Eliminates race conditions between check and increment
const slidingWindowLua = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - window

  -- 1. Remove timestamps outside the sliding window
  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

  -- 2. Count requests in current window
  local currentRequests = redis.call('ZCARD', key)

  if currentRequests < limit then
    -- 3. Add current request timestamp
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return { 1, limit - currentRequests - 1 } -- Allowed: { 1, remaining }
  else
    return { 0, 0 } -- Blocked: { 0, 0 }
  end
`;

export async function isRateLimited(
  userId: string,
  limit = 100,
  windowMs = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${userId}`;
  const now = Date.now();

  const [allowed, remaining] = (await redis.eval(
    slidingWindowLua,
    1,
    key,
    now,
    windowMs,
    limit
  )) as [number, number];

  return { allowed: allowed === 1, remaining };
}
```

---

### Q2: What is a Slowloris attack, and how do you configure Node.js server timeouts to neutralize it?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[DoS]` `[Timeouts]`

**Answer:**
A **Slowloris attack** is a low-bandwidth Denial of Service attack where an attacker opens hundreds of TCP connections to a Node server and sends incomplete HTTP headers extremely slowly (e.g., 1 byte every 15 seconds):
`X-Header: a...`
- The server keeps the socket open waiting for the end of the header (`\r\n\r\n`).
- The attacker exhausts all available operating system sockets and file descriptors, preventing legitimate users from connecting.

#### Defense via Server Timeouts (Node 18+ defaults):
```typescript
import http from 'node:http';

const server = http.createServer(app);

// 1. headersTimeout: Time allowed for client to finish sending HTTP headers (Default: 60s)
server.headersTimeout = 10000; // Drop slow header connections after 10s

// 2. requestTimeout: Total time allowed for entire HTTP request body (Default: 5min)
server.requestTimeout = 30000; // 30 seconds

// 3. keepAliveTimeout: Max idle time between requests on reusable connection
server.keepAliveTimeout = 5000; // 5 seconds
```

---

## 2. Security Headers, CORS Reflection & CSRF

### Q3: What is the "Dynamic Origin Reflection" vulnerability in CORS, and how does it compromise private APIs?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Security]` `[CORS]` `[Vulnerability]`

**Answer:**

#### The Vulnerable Configuration:
Developers attempting to bypass CORS errors often write:
```javascript
// CRITICAL VULNERABILITY: Reflects any incoming Origin header back!
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin); // DANGEROUS!
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
```

#### The Exploit:
1. A legitimate user logs in to `yourbank.com`; an authentication cookie is set.
2. The user visits malicious site `evil-hacker.com`.
3. The malicious script makes a credentialed cross-origin `fetch('https://yourbank.com/api/balance', { credentials: 'include' })`.
4. Your server reads `Origin: https://evil-hacker.com`, dynamically reflects it back in `Access-Control-Allow-Origin`, and permits credentials!
5. The browser gives the attacker's script full read access to the victim's private financial data!

#### Safe Implementation:
Always validate against a strict, static whitelist of trusted origins:
```typescript
import cors from 'cors';

const ALLOWED_ORIGINS = new Set(['https://app.yourdomain.com', 'https://admin.yourdomain.com']);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));
```

---

## 3. JWT Architectural Exploits & Revocation Strategies

### Q4: Explain the top two architectural exploits against JWTs in Node.js (Algorithm Confusion & "none" Algorithm).
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[JWT]` `[Security]` `[Authentication]`

**Answer:**

#### 1. The Algorithm Confusion Attack (Asymmetric to Symmetric):
An API uses **RS256** (asymmetric): tokens are signed with a private key and verified with a public key.
- The public key is publicly accessible (e.g., at `/.well-known/jwks.json`).
- If the server's verification logic blindly trusts the `alg` header in the incoming JWT:
  ```javascript
  // VULNERABLE: Does NOT enforce algorithm in verify() options!
  jwt.verify(token, publicKey);
  ```
- The attacker re-signs the token with **HS256** (symmetric HMAC) using the **public key string as the HMAC secret key**!
- The server verifies using `publicKey` as the secret for HS256, the signature validates, and the attacker gains unauthorized admin access!

#### 2. The "none" Algorithm Attack:
An attacker modifies the JWT header to `{"alg": "none", "typ": "JWT"}` and removes the signature segment. Outdated or misconfigured JWT libraries accept tokens with no signature as valid.

#### The Mitigation:
Always enforce explicit allowed algorithms during verification:
```typescript
import jwt from 'jsonwebtoken';

jwt.verify(token, publicKey, {
  algorithms: ['RS256'], // Explicitly rejects HS256, none, etc.!
});
```

---

### Q5: How do you solve the Stateless JWT Revocation problem in Node.js when a user logs out or is banned?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[JWT]` `[Revocation]` `[Redis]`

**Answer:**
Pure stateless JWTs cannot be revoked until their expiration time (`exp`) lapses.

#### The Dual-Token Strategy with Refresh Token Rotation:
```text
Access Token:  Short-lived (10–15 minutes). Held in memory. Stateless.
Refresh Token: Long-lived (7–30 days). Stored in HttpOnly Secure Cookie.
               Indexed in Redis with unique JTI (JWT ID).
```

```typescript
// On User Logout or Account Compromise:
export async function revokeUserTokens(userId: string, jti: string, tokenExpSec: number) {
  // Option A: Revoke specific refresh token in Redis
  await redis.del(`refresh_token:${jti}`);

  // Option B: Blacklist active Access Token JTI until its natural expiration
  await redis.set(`blacklist:${jti}`, 'revoked', 'EX', tokenExpSec);
}
```
*Benefits:* The access token remains stateless for fast verification at high scale. If compromised, the blast radius is capped at 10 minutes. Any security-sensitive action requires checking the Redis blacklist or forcing a refresh.

---

## 4. Modern Cryptography, Password Hashing & Timing Attacks

### Q6: Why should you use `argon2` instead of `bcrypt` in modern Node.js, and what is the Event Loop vs Thread Pool trap with hashing?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Cryptography]` `[Argon2]` `[bcrypt]`

**Answer:**

#### Argon2 vs Bcrypt:
- **`bcrypt` (1999):** Only CPU-hard. Vulnerable to fast, cheap parallel hardware cracking using custom GPUs and ASICs.
- **`argon2` (Winner of the Password Hashing Competition):** Both **CPU-hard AND Memory-hard**. It forces the cracking hardware to allocate dedicated RAM per attempt, rendering GPU/ASIC cluster cracking cost-prohibitive.

#### The Event Loop vs Thread Pool Trap:
Password hashing is intentionally designed to be computationally expensive (taking ~200–500ms per attempt).
```javascript
// FATAL DISASTER: Freezes Node.js main thread completely!
const hash = bcrypt.hashSync(password, 12); 
```
If 10 users log in concurrently using `hashSync`, **the entire Node.js server freezes for 5 straight seconds!**

**The Solution:** Always use asynchronous methods (`await argon2.hash(password)`). Native C++ modules offload hashing computations to **background worker threads**, leaving the main event loop free to handle other traffic.

---

### Q7: What is a Timing Attack, and how does `crypto.timingSafeEqual()` prevent secret token extraction?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Cryptography]` `[TimingAttack]` `[Crypto]`

**Answer:**
Standard JavaScript string comparison (`===`) uses **early exit**:
It compares characters byte-by-byte and returns `false` on the **first mismatched byte**:

```text
Actual Secret: "abcd1234efgh"
Attempt A:     "Xbcd1234efgh" ──► Fails at byte 0 (Takes 2 nanoseconds)
Attempt B:     "abcdX234efgh" ──► Fails at byte 4 (Takes 8 nanoseconds)
```
An attacker measuring microsecond response times across thousands of network requests can determine each character of your secret token one byte at a time!

#### The Fix: Constant-Time Comparison
`crypto.timingSafeEqual()` compares all bytes unconditionally, taking the exact same execution duration regardless of where or whether a mismatch occurs:

```typescript
import crypto from 'node:crypto';

export function verifyApiSecret(providedSecret: string, actualSecret: string): boolean {
  const bufA = Buffer.from(providedSecret);
  const bufB = Buffer.from(actualSecret);

  // Buffer lengths must match before passing to timingSafeEqual!
  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
```

---

## 5. Authorization Architectures: RBAC vs ABAC

### Q8: Compare Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC). How do you implement ABAC with CASL in Node.js?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Authorization]` `[RBAC]` `[ABAC]` `[CASL]`

**Answer:**
- **RBAC (Role-Based):** Coarse-grained. Checks what role a user has: *"Can users with role 'EDITOR' update articles?"*
- **ABAC (Attribute-Based):** Fine-grained. Checks dynamic attributes of the user, resource, and environment: *"Can user X update article Y if user X is the author AND article Y status is 'DRAFT'?"*

#### Implementing ABAC with CASL:
```typescript
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

export function defineAbilityFor(user: { id: string; role: string }) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.role === 'admin') {
    can('manage', 'all'); // Admin can do anything
  } else {
    can('read', 'Article');
    // ABAC Rule: Can only update Article if user is the author!
    can('update', 'Article', { authorId: user.id });
    // Cannot delete published articles
    cannot('delete', 'Article', { status: 'PUBLISHED' });
  }

  return build();
}
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q9: What is the difference between AES-256-GCM and AES-256-CBC?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Cryptography]` `[Encryption]`

**Answer:**
- **AES-256-CBC:** Cipher Block Chaining. Encrypts data, but does **not verify integrity**. Vulnerable to padding oracle attacks unless paired with an HMAC.
- **AES-256-GCM:** Galois/Counter Mode. An **Authenticated Encryption with Associated Data (AEAD)** cipher. It provides both confidentiality AND cryptographic integrity via an authentication tag (`authTag`), preventing tampering.

---

### Q10: Why should production environment secrets NEVER be stored in `.env` files in production Docker containers?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[Secrets]`

**Answer:**
`.env` files checked into repositories or baked into Docker images can be inspected in image layer histories (`docker history`), leak via accidental source dumps, and cannot be rotated without rebuilding containers. Production secrets should be injected at runtime via secret managers (HashiCorp Vault, AWS Secrets Manager, or Kubernetes Secrets).
