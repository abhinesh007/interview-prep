# 14 — Security, Authentication & Multi-Tenant MFE Architecture

> Cross-MFE Authentication (OAuth2 / OIDC with PKCE), Token Propagation (`HttpOnly` Cookies vs In-Memory), Content Security Policy (CSP) Hardening for Dynamic Remotes, XSS Blast Radius Containment, and Dynamic Multi-Tenant Discovery.

---

## 📑 Table of Contents
1. [Authentication Across Micro-Frontends (OAuth2 / OIDC)](#1-authentication-across-micro-frontends-oauth2--oidc)
2. [Token Storage Architecture & The LocalStorage Vulnerability](#2-token-storage-architecture--the-localstorage-vulnerability)
3. [Content Security Policy (CSP) & XSS Attack Surface](#3-content-security-policy-csp--xss-attack-surface)
4. [Role-Based Access Control (RBAC) & Feature Toggles](#4-role-based-access-control-rbac--feature-toggles)
5. [Dynamic Multi-Tenant Architecture in MFEs](#5-dynamic-multi-tenant-architecture-in-mfes)
6. [🧩 Output Prediction & 🐛 Debug Scenarios](#6--output-prediction---debug-scenarios)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. Authentication Across Micro-Frontends (OAuth2 / OIDC)

### Q1: How should user authentication (OAuth 2.0 / OpenID Connect) be architected across an enterprise Micro-Frontend setup?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Authentication]` `[OAuth2]` `[OIDC]` `[Security]`

**Answer:**
A critical security rule in Micro-Frontends: **Remotes must NEVER implement their own independent login redirects or authentication flows.**

```text
CENTRALIZED AUTHENTICATION TOPOLOGY:
┌────────────────────────────────────────────────────────┐
│                   Identity Provider                    │
│             (Auth0 / Okta / Keycloak / Azure AD)       │
└───────────────────────────▲────────────────────────────┘
                            │ OIDC Auth Code Flow + PKCE
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Angular Host Shell                   │
│  - Executes login redirect & processes auth code       │
│  - Stores Access Token in Memory (or via BFF session)  │
│  - Schedules Silent Token Refresh                      │
└────────┬───────────────────────────────────────┬───────┘
         │ Provides Read-Only Token Getter       │
         ▼                                       ▼
┌──────────────────┐                   ┌──────────────────┐
│  Orders Remote   │                   │  Billing Remote  │
│  (Pure consumer) │                   │  (Pure consumer) │
└──────────────────┘                   └──────────────────┘
```

### Architectural Principles:
1. **Host Owns the Auth Lifecycle:** The Host Shell handles user redirection to the Identity Provider (IdP), token acquisition via Authorization Code Flow with PKCE, and token refresh timers.
2. **Remotes Are Pure Consumers:** Remotes query the Host for the active token via a shared `AuthService` contract or an HTTP Interceptor that attaches the token to outgoing API requests.

---

## 2. Token Storage Architecture & The LocalStorage Vulnerability

### Q2: Why is storing JWT access tokens in `localStorage` catastrophic in a Micro-Frontend architecture, and what is the secure alternative?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[JWT]` `[LocalStorage]` `[XSS]` `[Cookies]`

**Answer:**
In a monolithic application, storing a JWT in `localStorage` is already risky. In a Micro-Frontend architecture, it is **catastrophic**:

```text
THE MFE BLAST RADIUS IN LOCALSTORAGE:
Host loads 8 Remotes owned by 8 different teams and external vendors.
If Remote H (e.g. Chat Widget) has an XSS vulnerability:
  Malicious script: const stolenJwt = localStorage.getItem('ACCESS_TOKEN');
  Attacker gains full admin API privileges to Checkout, Orders, and Account!
One vulnerable remote compromises the entire enterprise security perimeter!
```

### The Gold Standard Solution: `HttpOnly` Cookies via BFF

```text
┌──────────────┐         ┌──────────────┐         ┌─────────────────────┐
│ Browser Host │ ──────► │ NestJS BFF   │ ──────► │ Core Microservices  │
│ & Remotes    │         │ (Gateway)    │         │                     │
└──────────────┘         └──────────────┘         └─────────────────────┘
       ▲                        ▲
       │                        │
       └──── HttpOnly Cookie ───┘
     (JavaScript CANNOT read it!)
```

1. The user logs in; the NestJS BFF sets an `HttpOnly`, `SameSite=Strict`, `Secure` session cookie.
2. The browser automatically sends this cookie on every API request.
3. JavaScript running in the browser (including Host and all Remotes) **has zero access to the cookie string**, making XSS token theft impossible!

---

## 3. Content Security Policy (CSP) & XSS Attack Surface

### Q3: Why does Module Federation increase the XSS attack surface, and how do you configure a strict Content Security Policy (CSP)?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[CSP]` `[XSS]` `[Security]`

**Answer:**
Module Federation works by dynamically evaluating external JavaScript code hosted on external CDNs via script tag injection or `import()` statements.

If an attacker compromises Remote A's S3 bucket or CDN, they can push malicious code that evaluates directly inside the Host Shell's DOM with full access to user input and memory!

### Hardening Content Security Policy (CSP):
Configure strict CSP headers on the server serving the Host `index.html`:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.corp.com https://orders.corp.com https://billing.corp.com 'strict-dynamic';
  connect-src 'self' https://api.corp.com;
  style-src 'self' 'unsafe-inline';
  object-src 'none';
  base-uri 'self';
```

### Rules:
1. **Explicit Remote Domain Allowlisting:** Restrict `script-src` exclusively to verified, owned corporate CDN domains. Never use wildcards (`*`).
2. **CSP Nonces:** For inline bootstrap scripts, generate an unguessable cryptographic nonce per request (`nonce-{random}`).

---

## 4. Role-Based Access Control (RBAC) & Feature Toggles

### Q4: How should Role-Based Access Control (RBAC) be split between the Host Shell and federated remotes?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[RBAC]` `[Authorization]` `[Guards]`

**Answer:**
RBAC should be enforced at two levels:

```text
1. COARSE-GRAINED AUTHORIZATION (Host Router Guards):
   - Path: /admin
   - Shell Route Guard inspects user claims: ['ROLE_ADMIN']
   - If missing: Rejects navigation BEFORE loading the admin remoteEntry.js!
   - Saves bandwidth, hides administrative bundle code from unauthorized users.

2. FINE-GRAINED AUTHORIZATION (Inside Remote Component):
   - Inside OrderDetailComponent:
   - "Refund Customer" button rendered conditionally:
     @if (hasPermission('orders:refund')) { <button>Refund</button> }
```

**⚠️ Golden Rule:** Client-side RBAC is purely for User Experience (UX). All security authorization must be enforced authoritatively on the backend API!

---

## 5. Dynamic Multi-Tenant Architecture in MFEs

### Q5: How do you design a Dynamic Multi-Tenant Micro-Frontend architecture where different tenants load different remotes and branding?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[Multi-Tenant]` `[Dynamic-Discovery]` `[SaaS]`

**Answer:**
In enterprise SaaS platforms, Tenant A might have access to Basic Features, while Tenant B pays for Advanced Analytics and custom white-label branding.

### The Architecture:

```text
User visits: https://tenant1.saas.com
┌────────────────────────────────────────────────────────┐
│                   Host Shell Bootstrap                 │
│                                                        │
│  1. Parses tenant subdomain: 'tenant1'                 │
│  2. Calls Tenant Config API:                           │
│     GET /api/tenants/tenant1/mfe-manifest              │
│                                                        │
│  3. Receives Dynamic Manifest & Brand Tokens:          │
│     {                                                  │
│       "theme": { "--brand-primary": "#4f46e5" },       │
│       "remotes": {                                     │
│         "dashboard": "https://cdn.saas.com/dash/...", │
│         "customReports": "https://cdn.saas.com/rep/..."│
│       }                                                │
│     }                                                  │
│                                                        │
│  4. Injects CSS theme tokens into :root                │
│  5. Dynamically registers authorized remote routes     │
└────────────────────────────────────────────────────────┘
```

---

## 6. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q6: 🐛 Debug Scenario: CSP Blocks Remote Evaluation in Production
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[CSP]` `[Production]`

**Scenario:**
An Angular Host works flawlessly in local development.
When deployed to Production, the Shell loads, but clicking the Orders tab produces a blank screen. The browser console reports:
```text
Refused to load the script 'https://orders-cdn.production.corp.com/remoteEntry.js'
because it violates the following Content Security Policy directive: "script-src 'self'".
```
Why did this happen, and how do you resolve it?

**Answer:**
**Root Cause:** The production web server (Nginx/Cloudflare) is serving a default strict CSP header (`script-src 'self'`) that allows scripts to load only from the exact same origin as the host.

**Fix:** Update the web server's Content-Security-Policy header to allow the federated remote CDN domain:
```nginx
# nginx.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://orders-cdn.production.corp.com;";
```

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q7: Can an untrusted remote read cookies from other remotes on the same domain?
**Answer:** Yes, if cookies are accessible to JavaScript (not marked `HttpOnly`). On the same origin, all JavaScript running in the document can read `document.cookie`. This is why sensitive authentication tokens must always be marked `HttpOnly`.

### Q8: What is Subresource Integrity (SRI), and why is it difficult in Module Federation?
**Answer:** SRI uses cryptographic hashes (`integrity="sha384-..."`) on `<script>` tags to ensure external scripts have not been tampered with. In Module Federation, remotes deploy continuously and independently, meaning chunk hashes change dynamically, making static SRI validation difficult without a dynamic manifest signing service.

### Q9: How can you protect against Prototype Pollution in federated remotes?
**Answer:** Freeze native object prototypes (`Object.freeze(Object.prototype)`) at the start of the Host bootstrap script, or sanitize deeply nested user payloads using tools like Zod before object assignment.
