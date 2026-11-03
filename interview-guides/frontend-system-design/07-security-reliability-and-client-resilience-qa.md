# 07 — Security, Reliability & Client Resilience

> Cross-Site Scripting (XSS) Defenses (DOMPurify, Trusted Types API), Cross-Site Request Forgery (CSRF) & SameSite Cookie Policies, Strict Content Security Policy (CSP) with Nonces, The Token Storage Security Matrix, Error Boundaries, and Resilient Telemetry.

---

## 📑 Table of Contents
1. [Cross-Site Scripting (XSS) Vectors & Modern Defenses](#1-cross-site-scripting-xss-vectors--modern-defenses)
2. [Cross-Site Request Forgery (CSRF) & SameSite Mechanics](#2-cross-site-request-forgery-csrf--samesite-mechanics)
3. [Content Security Policy (CSP) & Trusted Types](#3-content-security-policy-csp--trusted-types)
4. [Token Storage Architecture Matrix (Cookies vs WebStorage vs Workers)](#4-token-storage-architecture-matrix-cookies-vs-webstorage-vs-workers)
5. [Client Resilience: Error Boundaries & Telemetry Throttling](#5-client-resilience-error-boundaries--telemetry-throttling)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. Cross-Site Scripting (XSS) Vectors & Modern Defenses

### Q1: Detail the three categories of Cross-Site Scripting (XSS). How do modern frameworks defend against them, and where do developers accidentally re-introduce vulnerabilities?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[XSS]` `[DOMPurify]` `[TrustedTypes]`

**Answer:**
Cross-Site Scripting (XSS) occurs when malicious JavaScript code is injected and executed in the security context of an unsuspecting user's browser session.

```text
The Three XSS Attack Vectors:

1. Stored XSS (Persistent):
   Attacker ──► Injects <script>steall()</script> into forum comment ──► Database
                                                                           │
   Victim   ◄── Serves stored script in HTML page from database ───────────┘
   (Executes in victim browser; steals session cookies)

2. Reflected XSS (Non-Persistent):
   Victim clicks phishing link: https://bank.com/search?q=<script>attack()</script>
   Server echoes query param directly into unescaped HTML response.

3. DOM-Based XSS (Pure Client Execution):
   URL: https://app.com/#name=<img src=x onerror=steal()>
   Client JS: document.getElementById('welcome').innerHTML = location.hash;
   (Server NEVER sees the payload; malicious DOM sink executed entirely in browser!)
```

#### How Frameworks Auto-Escape:
Modern frameworks (React, Angular, Vue) automatically HTML-escape all data bindings inside JSX/templates. If a variable contains `<script>alert(1)</script>`, it is safely rendered as literal text nodes: `&lt;script&gt;alert(1)&lt;/script&gt;`.

#### Where Developers Accidentally Re-Introduce XSS:
1. **Unsafe HTML Ingestion:**
   Using `dangerouslySetInnerHTML={{ __html: userContent }}` in React, `[innerHTML]` in Angular, or `v-html` in Vue without sanitization.
   - *Fix:* Always sanitize untrusted HTML using **DOMPurify**:
     ```typescript
     import DOMPurify from 'dompurify';

     export function SafeHTMLViewer({ rawHtml }: { rawHtml: string }) {
       const cleanHtml = DOMPurify.sanitize(rawHtml, {
         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
         ALLOWED_ATTR: ['href', 'target'],
       });
       return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
     }
     ```
2. **JavaScript Protocol Injection in Links:**
   `<a href={userWebsite}>Visit Profile</a>`
   If `userWebsite` is `"javascript:stealData(document.cookie)"`, clicking the link executes the JavaScript payload!
   - *Fix:* Validate and whitelist URI protocols (`http:`, `https:` only) before rendering `href` or `src` attributes.

---

## 2. Cross-Site Request Forgery (CSRF) & SameSite Mechanics

### Q2: How does CSRF work? Compare the three `SameSite` cookie modes (`Strict`, `Lax`, `None`) and explain modern defense-in-depth mitigations.

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Security]` `[CSRF]` `[Cookies]` `[SameSite]`

**Answer:**
Cross-Site Request Forgery (CSRF) tricks an authenticated user's browser into executing an unauthorized state-changing request to a vulnerable web application where the user has an active session.

```text
The CSRF Attack Flow:

1. User logs into https://bank.com.
   Bank sets session cookie: Set-Cookie: session_id=xyz123; HttpOnly; (No SameSite)

2. User visits malicious site: https://evil.com in another tab.
   Evil.com renders hidden auto-submitting form:
   <form action="https://bank.com/transfer" method="POST">
     <input type="hidden" name="toAccount" value="attacker_acct" />
     <input type="hidden" name="amount" value="10000" />
   </form>
   <script>document.forms[0].submit();</script>

3. Browser automatically attaches user's ambient session_id cookie to the bank.com request!
   Bank server cannot distinguish between legitimate user click and evil.com forgery!
```

#### The `SameSite` Cookie Attribute (The Modern Defense):

| `SameSite` Mode | Cross-Site POST / State Changes | Cross-Site Top-Level GET (Clicking a link from Google) | Cross-Site Images / Iframes |
| :--- | :--- | :--- | :--- |
| **`Strict`** | ❌ Cookie NOT sent | ❌ Cookie NOT sent (User appears logged out on link click) | ❌ Cookie NOT sent |
| **`Lax`** (Default) | ❌ Cookie NOT sent | 🟢 Cookie SENT (Preserves friendly navigation from links) | ❌ Cookie NOT sent |
| **`None; Secure`** | 🟢 Cookie SENT | 🟢 Cookie SENT | 🟢 Cookie SENT (Third-party widgets) |

#### Defense-in-Depth for State-Changing APIs:
Even with `SameSite=Lax`, defense-in-depth is required:
1. **Custom HTTP Request Headers:** Standard HTML `<form>` submissions cannot set custom headers. Requiring `X-Requested-With: XMLHttpRequest` or `Content-Type: application/json` forces the browser to issue an initial **CORS Preflight (`OPTIONS`) request**, blocking cross-origin attackers who lack CORS permission.
2. **Anti-CSRF Double Submit Tokens:** Generate a cryptographically random token stored in an accessible cookie and require client-side JavaScript to read and mirror this token in a custom header (`X-CSRF-Token`). Malicious origins cannot read the cookie due to the Same-Origin Policy.

---

## 3. Content Security Policy (CSP) & Trusted Types

### Q3: Design a strict Content Security Policy (CSP) for a modern single-page application. How does the Trusted Types API prevent DOM-based XSS?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[CSP]` `[TrustedTypes]` `[StrictDynamic]` `[EnterpriseSecurity]`

**Answer:**
A **Content Security Policy (CSP)** is an HTTP response header that restricts which scripts, styles, fonts, and network connections the browser is permitted to execute.

#### Legacy Flawed CSP vs Modern Strict CSP:
- *Legacy (Domain Whitelisting):* `script-src 'self' https://apis.google.com https://cdn.com;`
  - Vulnerable to JSONP bypasses and compromised scripts hosted on whitelisted CDNs.
- *Modern Strict CSP (Nonce-Based with `'strict-dynamic'`):*
  ```http
  Content-Security-Policy:
    default-src 'self';
    script-src 'nonce-rAnd0m123_epoch' 'strict-dynamic' https: 'unsafe-inline';
    object-src 'none';
    base-uri 'none';
    frame-ancestors 'none';
    require-trusted-types-for 'script';
    report-uri /api/security/csp-violations;
  ```

#### How Strict CSP Operates:
1. **Nonce Enforcement:** The SSR server generates a cryptographically random cryptographic nonce per HTTP request and stamps it on valid scripts: `<script nonce="rAnd0m123_epoch" src="/app.js"></script>`. Injected attacker scripts lack this per-request nonce and are blocked.
2. `'strict-dynamic'`: Instructs the browser that any script already blessed by the nonce is trusted to dynamically create child `<script>` elements (allowing modern code splitting and Webpack chunks without hardcoding bundle hashes).
3. `frame-ancestors 'none'`: Prevents clickjacking by forbidding embedding the application inside `<iframe>` tags.

#### The Trusted Types API:
Even with strict escaping, developers can accidentally write to dangerous DOM sinks (`element.innerHTML = userInput` or `script.src = url`).
**Trusted Types** locks down these dangerous sinks at the browser engine level:
```typescript
// Enforce Trusted Types policy in TypeScript
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const sanitizePolicy = window.trustedTypes.createPolicy('dompurify-policy', {
    createHTML: (string) => DOMPurify.sanitize(string),
  });

  // Safe sink assignment:
  const el = document.getElementById('content');
  if (el) {
    // Calling el.innerHTML with raw string throws TypeError: Failed to set innerHTML!
    el.innerHTML = sanitizePolicy.createHTML(untrustedInput) as unknown as string;
  }
}
```

---

## 4. Token Storage Architecture Matrix (Cookies vs WebStorage vs Workers)

### Q4: Where should you store authentication tokens (JWTs) on the client? Compare `localStorage`, `sessionStorage`, `HttpOnly` Cookies, and Web Worker Token Vaults.

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual / Architecture  
**Tags:** `[TokenStorage]` `[JWT]` `[HttpOnly]` `[WebWorker]`

**Answer:**

```text
Token Storage Security Comparison Matrix:

┌────────────────────────────────────────────────────────────────────────┐
│ 1. localStorage:                                                       │
│    window.localStorage.setItem('token', jwt)                          │
│    Vulnerable to ANY XSS flaw on your domain or 3rd-party scripts!     │
│    PCI-DSS & SOC2 VIOLATION FOR SENSITIVE FINTECH APPS!                │
├────────────────────────────────────────────────────────────────────────┤
│ 2. HttpOnly SameSite Secure Cookie:                                    │
│    Set-Cookie: session=xyz; HttpOnly; Secure; SameSite=Lax             │
│    JavaScript CANNOT READ THIS COOKIE. 100% IMMUNE TO XSS THEFT!       │
│    Must defend against CSRF (SameSite + custom headers).               │
├────────────────────────────────────────────────────────────────────────┤
│ 3. In-Memory Token + HttpOnly Refresh Token:                           │
│    Access Token (15min lifetime) kept in volatile JS memory variable.  │
│    Refresh Token kept in HttpOnly Secure cookie.                       │
│    If XSS occurs, attacker cannot access permanent refresh token!      │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Web Worker Token Vault (Zero Main-Thread Exposure):                 │
│    Token lives inside Web Worker memory.                               │
│    Main Thread sends requests via postMessage(); worker attaches token │
│    and proxies fetch(). Main Thread JS cannot inspect token memory!    │
└────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Comparison Matrix:

| Storage Location | Readable by JavaScript? | Vulnerable to XSS Token Theft? | Vulnerable to CSRF? | Survives Tab Reload? | Compliance Suitability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`localStorage`** | 🔴 Yes | 🔴 **Catastrophic** | 🟢 Immune | 🟢 Yes | 🔴 Not recommended for sensitive tokens |
| **`sessionStorage`**| 🔴 Yes | 🔴 **Catastrophic** | 🟢 Immune | 🟡 Tab lifetime only | 🔴 Not recommended |
| **`HttpOnly` Cookie** | 🟢 **No (Hidden)** | 🟢 **Immune to Theft** | 🟡 Mitigated by `SameSite=Lax` | 🟢 Yes | 🟢 Enterprise standard (Banking, E-Commerce) |
| **In-Memory Variable**| 🟢 In-scope only | 🟡 Can be intercepted in runtime | 🟢 Immune | 🔴 Lost on reload (needs refresh) | 🟢 Standard for OAuth2 SPA architectures |
| **Web Worker Vault** | 🟢 Isolated Memory | 🟢 Immune to direct reading | 🟢 Immune | 🔴 Lost on reload (worker restarts) | 🟢 High-security enterprise |

---

## 5. Client Resilience: Error Boundaries & Telemetry Throttling

### Q5: How do you architect a global error boundary and client telemetry reporting system without causing a client-side DDoS on your logging backend during an outage?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Architecture  
**Tags:** `[ErrorBoundaries]` `[Telemetry]` `[Sentry]` `[RateLimiting]`

**Answer:**
When an unexpected exception occurs inside a component's render lifecycle in React, React unmounts the entire root component tree by default, presenting users with a blank white screen of death.

#### The Error Boundary Architecture:
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Scrub PII before sending
    TelemetryReporter.captureException(error, { componentStack: errorInfo.componentStack });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="error-fallback-container">
          <h2>Something went wrong</h2>
          <p>We've logged this issue and are looking into it.</p>
          <button onClick={this.handleRetry}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### Mitigating Client Telemetry DDoS (Throttling & Deduplication):
If an upstream microservice fails, 50,000 active clients will catch errors simultaneously. If every client emits error payloads in an infinite render loop, they will launch an unintentional DDoS on your Sentry/Elasticsearch cluster.

```typescript
export class TelemetryReporter {
  private static errorHistory = new Map<string, number>();
  private static readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_ERRORS_PER_WINDOW = 5;

  public static captureException(error: Error, context?: Record<string, any>): void {
    const errorSignature = `${error.name}:${error.message}`;
    const now = Date.now();
    const lastReportedTime = this.errorHistory.get(errorSignature) ?? 0;

    // 1. Deduplication: Drop duplicate errors occurring within 10 seconds
    if (now - lastReportedTime < 10000) {
      return;
    }
    this.errorHistory.set(errorSignature, now);

    // 2. Client-side Rate Limiting: Drop if exceeding threshold
    if (this.errorHistory.size > this.MAX_ERRORS_PER_WINDOW) {
      console.warn('Telemetry rate limit exceeded. Dropping report.');
      return;
    }

    // 3. PII Masking & Transmission
    const sanitizedContext = this.scrubPII(context);
    navigator.sendBeacon('/api/telemetry/errors', JSON.stringify({
      error: error.message,
      stack: error.stack,
      context: sanitizedContext,
      timestamp: now,
    }));
  }

  private static scrubPII(obj: any): any {
    // Regex replace email addresses, credit cards, auth tokens
    const jsonStr = JSON.stringify(obj || {});
    const scrubbed = jsonStr
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
      .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[CARD_REDACTED]');
    return JSON.parse(scrubbed);
  }
}
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: What is the purpose of the Subresource Integrity (SRI) attribute on `<script>` tags?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Answer:** SRI allows browsers to verify that resources fetched from third-party CDNs (e.g., `<script src="https://cdn.com/lib.js" integrity="sha384-oqVuAfXR..." crossorigin="anonymous">`) have not been tampered with or injected with malware. If the cryptographic hash of the downloaded script does not match the `integrity` attribute byte-for-byte, the browser refuses to execute the script.

### Q7: What is Clickjacking, and how do modern web standards prevent it?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Answer:** Clickjacking tricks a user into clicking something on a malicious site by embedding a target site inside an invisible, transparent `<iframe>` positioned right under the cursor. It is prevented via the HTTP header `X-Frame-Options: DENY` (or `SAMEORIGIN`) and the modern CSP directive `frame-ancestors 'none'`.
