# 16 — Web Security, Sandbox Boundaries & Vulnerability Mitigation

> Deep dive into Cross-Site Scripting (XSS) and the Trusted Types API, Cross-Site Request Forgery (CSRF) defenses, Content Security Policy (CSP) nonces and hashes, CORS preflight mechanics, prototype pollution exploits, and secure client-side token storage.

---

## 📑 Table of Contents
1. [Cross-Site Scripting (XSS) & Defenses](#1-cross-site-scripting-xss--defenses)
2. [Cross-Site Request Forgery (CSRF) & Same-Origin Policy](#2-cross-site-request-forgery-csrf--same-origin-policy)
3. [Content Security Policy (CSP) & Subresource Integrity (SRI)](#3-content-security-policy-csp--subresource-integrity-sri)
4. [CORS Preflight Mechanics & Prototype Pollution](#4-cors-preflight-mechanics--prototype-pollution)
5. [🎯 Quick-Fire & Trap Questions](#5--quick-fire--trap-questions)

---

## 1. Cross-Site Scripting (XSS) & Defenses

### Q1: What are the three classifications of XSS, and how does the modern Trusted Types API eliminate DOM-based XSS?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Web Security  
**Tags:** `[XSS]` `[Trusted-Types]` `[DOMPurify]` `[Security-Sinks]`

**Answer:**

```text
┌────────────────────────────────────────────────────────┐
│                   The Three Types of XSS               │
├─────────────────┬──────────────────────────────────────┤
│ 1. Stored XSS   │ Malicious payload is stored in the   │
│                 │ database and served to every user    │
│ 2. Reflected XSS│ Payload is injected via URL parameter│
│                 │ and reflected immediately by backend │
│ 3. DOM-based XSS│ Vulnerability exists 100% on client: │
│                 │ JS reads unsafe source and writes    │
│                 │ into an execution sink without escape│
└─────────────────┴──────────────────────────────────────┘
```

**Dangerous JavaScript Sink APIs:**
- `element.innerHTML = userInput;`
- `document.write(userInput);`
- `eval(userInput);`
- `location.href = userInput;` (Vulnerable to `javascript:alert(1)`)

### The Modern Defense: The Trusted Types API
Modern browsers support the **Trusted Types API** via CSP (`require-trusted-types-for 'script'`).
Once enabled, assigning a raw string to dangerous sinks like `element.innerHTML` **throws an immediate TypeError**! Developers must pass a sanitized `TrustedHTML` object produced by an audited policy:

```javascript
// Register a strict Trusted Types policy with DOMPurify
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const sanitizePolicy = trustedTypes.createPolicy("default", {
    createHTML: (string) => DOMPurify.sanitize(string)
  });

  // Now, raw string assignment is protected:
  const el = document.getElementById("content");
  el.innerHTML = sanitizePolicy.createHTML(userComment); // ✅ Allowed!
  // el.innerHTML = userComment; // ❌ Throws TypeError in Trusted Types mode!
}
```

---

## 2. Cross-Site Request Forgery (CSRF) & Same-Origin Policy

### Q2: What is Cross-Site Request Forgery (CSRF), and what are the three lines of defense?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Architecture  
**Tags:** `[CSRF]` `[SameSite-Cookies]` `[SOP]` `[Security-Tokens]`

**Answer:**
**CSRF** occurs when an attacker tricks an authenticated user's browser into executing an unauthorized HTTP request against a vulnerable application.
Because browsers automatically attach stored session cookies with cross-site requests, the server mistakenly assumes the request was intentionally initiated by the legitimate user!

```text
User logged into bank.com (Holds Session Cookie)
     │
     ▼ User visits malicious-site.com
┌────────────────────────────────────────────────────────┐
│ <form action="https://bank.com/transfer" method="POST">│
│   <input type="hidden" name="to" value="attacker">     │
│   <input type="hidden" name="amount" value="10000">    │
│ </form>                                                │
│ <script>document.forms[0].submit();</script>           │
└────────────────────────────────────────────────────────┘
     │
     ▼ Browser sends POST to bank.com + AUTOMATICALLY INCLUDES BANK COOKIES!
```

### The Three Lines of Defense:
1. **`SameSite` Cookie Attribute:** Setting `SameSite=Lax` or `SameSite=Strict` ensures cookies are **never** included on cross-site form submissions or Ajax requests.
2. **Anti-CSRF Synchronizer Tokens:** The server generates a cryptographically random token tied to the user's session and embeds it in page HTML. The client must submit this token in a custom header (`X-CSRF-Token`). Since malicious sites cannot read cross-origin HTML due to the Same-Origin Policy (SOP), they cannot forge the token.
3. **Custom Headers:** Modern APIs reject requests lacking custom headers (e.g., `X-Requested-With: XMLHttpRequest`).

---

## 3. Content Security Policy (CSP) & Subresource Integrity (SRI)

### Q3: What is a Content Security Policy (CSP)? How do Nonces and Hashes eliminate inline XSS?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Specifications  
**Tags:** `[CSP]` `[Nonces]` `[SRI]` `[Security-Headers]`

**Answer:**
A **Content Security Policy (CSP)** is an HTTP response header that restricts the resources (scripts, images, styles, iframes, fonts) that the browser is permitted to load and execute for that document:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-rAnd0m123'; object-src 'none'; frame-ancestors 'none';
```

### Eliminating Inline Script Injection with Nonces:
Historically, attackers injected inline scripts: `<script>stealTokens()</script>`.
With CSP, inline scripts are blocked by default unless they carry a matching cryptographic **Nonce** (number used once) generated uniquely on every HTTP request by the server:

```html
<!-- Server generates unique nonce per request: -->
<script nonce="rAnd0m123">
  console.log("Legitimate application script executes safely.");
</script>

<!-- Injected attacker script has no matching nonce -> Browser REFUSES to execute! -->
<script>
  stealTokens(); // BLOCKED BY CSP!
</script>
```

### Subresource Integrity (SRI):
When importing scripts from third-party CDNs, an attacker could compromise the CDN and inject malware into the hosted library.
The `integrity` attribute specifies a cryptographic hash of the expected file content:
```html
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```
If the CDN delivers altered code, the hash fails and the browser refuses to execute the script!

---

## 4. CORS Preflight Mechanics & Prototype Pollution

### Q4: What triggers a CORS Preflight (`OPTIONS`) request, and why does `Access-Control-Allow-Origin: *` fail with credentials?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual & Networking  
**Tags:** `[CORS]` `[Preflight]` `[OPTIONS]` `[Credentials]`

**Answer:**
**Cross-Origin Resource Sharing (CORS)** is a browser security mechanism that allows servers to whitelist which external origins may read response data.

### Simple Requests vs Preflight Requests:
A request is "Simple" (no preflight) ONLY if:
- Method is `GET`, `POST`, or `HEAD`.
- Headers only contain safe-listed headers (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`).
- `Content-Type` is strictly `text/plain`, `multipart/form-data`, or `application/x-www-form-urlencoded`.

If a request uses **`application/json`**, a custom header like **`Authorization`**, or methods like **`PUT` / `DELETE`**, the browser automatically dispatches an **HTTP `OPTIONS` Preflight Request** first to ask the server for permission.

### The Credentials Rule:
If the client sets `fetch(url, { credentials: 'include' })` to send authentication cookies across origins:
- The server **MUST** respond with the exact matching origin: `Access-Control-Allow-Origin: https://app.example.com`.
- **The wildcard `Access-Control-Allow-Origin: *` is strictly forbidden with credentials!** The browser will throw a CORS network error and block the response.

---

### Q5: What is a Prototype Pollution attack, and how do you protect recursive merge utilities?
**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Security  
**Tags:** `[Prototype-Pollution]` `[Object-Assign]` `[Security-Defenses]`

**Answer:**
Prototype Pollution occurs when user-controlled object input (e.g., query params or JSON body) contains keys like `__proto__`, `constructor`, or `prototype`. If a recursive `deepMerge()` function merges these keys without validation, it mutates `Object.prototype`:

```javascript
// VULNERABLE DEEP MERGE:
function merge(target, source) {
  for (let key of Object.keys(source)) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!target[key]) target[key] = {};
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ATTACK PAYLOAD:
const maliciousPayload = JSON.parse('{"__proto__": {"isAdmin": true}}');
merge({}, maliciousPayload);

// CONSEQUENCE: All objects in the entire JavaScript runtime now inherit isAdmin: true!
const user = {};
console.log(user.isAdmin); // true! (Global prototype poisoned!)
```

**Defensive Mitigations:**
1. Reject dangerous keys: `if (key === "__proto__" || key === "constructor" || key === "prototype") continue;`
2. Use dictionary objects without prototypes: `Object.create(null)`.
3. Use modern `Map` instead of plain objects for dynamic user keys.
4. Freeze the prototype at application startup: `Object.freeze(Object.prototype)`.

---

## 5. 🎯 Quick-Fire & Trap Questions

### Q6: What is Clickjacking, and how does CSP `frame-ancestors` stop it?
**Difficulty:** 🟢 Junior | **Type:** 📖 Web Security  
**Answer:** Clickjacking tricks a user into clicking invisible buttons by rendering a legitimate site inside a transparent `<iframe>` overlaying an innocent-looking game or button. The HTTP response header `X-Frame-Options: DENY` or the modern CSP directive **`frame-ancestors 'none'`** informs the browser to forbid rendering the page inside any iframe.

### Q7: What is the security difference between `window.location.href = url` and `window.location.replace(url)`?
**Difficulty:** 🟢 Junior | **Type:** 📖 APIs  
**Answer:** `window.location.href = url` navigates to the new URL while keeping the current page in the browser's session history (user can click the "Back" button). `window.location.replace(url)` replaces the current page in session history, preventing the user from navigating back (essential after authentication logouts or redirects).
