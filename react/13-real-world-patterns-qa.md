# 13 — Real-World Production Architecture Interview Questions & Answers

> Enterprise directory structuring (feature-based vs type-based), barrel exports trap, token storage (localStorage vs httpOnly cookie), layered Error Boundaries, Docker multi-stage builds, and Vite environment variables.

---

## 📑 Table of Contents
1. [Scalable Project Structure (Feature-First Architecture)](#1-scalable-project-structure-feature-first-architecture)
2. [Barrel Exports (`index.ts`) & The Circular Dependency Trap](#2-barrel-exports-indexts--the-circular-dependency-trap)
3. [Authentication Security: localStorage vs httpOnly Cookies](#3-authentication-security-localstorage-vs-httponly-cookies)
4. [Layered Error Handling & Global Toast Notifications](#4-layered-error-handling--global-toast-notifications)
5. [Environment Variables & Vite Deployment](#5-environment-variables--vite-deployment)
6. [Docker Multi-Stage Production Builds](#6-docker-multi-stage-production-builds)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Scalable Project Structure (Feature-First Architecture)

### Q1: Compare Feature-Based vs Type-Based Directory Structures for large React applications.
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ System Design & Architecture

**Answer:**

#### Type-Based / Layer-Based (Anti-Pattern at scale):
```text
src/
├── components/ (120 files)
├── hooks/      (45 files)
├── services/   (30 files)
└── types/      (40 files)
```
*Why it fails:* To update a single feature (e.g. `Billing`), a developer must jump across 4 disparate folders. When a feature is deprecated or deleted, finding and removing all related files is error-prone.

#### Feature-Based / Domain-Driven (Industry Best Practice):
```text
src/
├── app/               # Providers, router configuration, global layout
├── assets/            # Fonts, static SVGs
├── components/        # Shared, dumb primitives (Button, Modal, Input)
├── features/          # Domain-specific modules
│   ├── auth/          # Feature slice
│   │   ├── api/       # Auth API endpoints & hooks
│   │   ├── components/# LoginForm, RegisterForm
│   │   ├── types/     # Auth-specific TypeScript types
│   │   └── utils/     # Token validation
│   ├── dashboard/
│   └── billing/
└── lib/               # Pre-configured clients (axios, queryClient)
```
*Why it wins:* **High cohesion, low coupling**. Everything related to `billing` lives in one place. Deleting a feature requires deleting a single directory.

---

## 2. Barrel Exports (`index.ts`) & The Circular Dependency Trap

### Q3: What are Barrel Exports (`index.ts`), and why can they cause severe performance and circular dependency bugs?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Architecture / Gotcha

**Answer:**
A **Barrel File** is an `index.ts` that aggregates and re-exports modules from a folder:
```typescript
// components/index.ts
export * from './Button';
export * from './Modal';
export * from './Chart'; // 500kB Chart library import!
```

**Two major production traps:**
1. **Broken Tree-Shaking & Bundle Bloat:** If a small component imports `{ Button } from '@/components'`, some bundlers (especially in dev mode or with CommonJS dependencies) evaluate the **entire barrel file**, pulling in heavy modules like `Chart` and D3 even though the consumer only needed a button!
2. **Circular Dependency Loops:**
   - `FeatureA` imports from `FeatureB/index.ts`.
   - `FeatureB` imports from `FeatureA/index.ts`.
   - At runtime, module resolution hits an unfinished module, causing `Cannot access 'X' before initialization` runtime crashes!

**Senior Best Practice:** Avoid deep barrel files in feature directories. Import directly from specific files (e.g., `import { Button } from '@/components/Button'`), or restrict barrel files to strictly atomic shared UI primitives.

---

## 3. Authentication Security: localStorage vs httpOnly Cookies

### Q4: Security Architecture: Where should JWT access and refresh tokens be stored?
**Difficulty:** 🔴 Senior  
**Type:** 🔒 Security & Architecture

**Answer:**

| Storage Mechanism | Vulnerability to XSS | Vulnerability to CSRF | Recommended Use |
| :--- | :--- | :--- | :--- |
| **`localStorage` / `sessionStorage`** | ❌ **High:** Any injected script can read `localStorage.getItem('token')` and exfiltrate it. | ✅ **Immune:** Browser does not auto-send tokens. | Non-sensitive data, public preferences. |
| **`httpOnly`, `Secure`, `SameSite=Strict` Cookie** | ✅ **Immune:** JavaScript cannot access `document.cookie`. | ⚠️ **Requires CSRF protection:** Browsers auto-attach cookies on requests. | **Industry standard for Refresh Tokens and Sessions.** |
| **In-Memory (React State / Variable)** | ✅ **Harder to steal:** Wiped on refresh, hidden from `document.cookie`. | ✅ **Immune to CSRF.** | **Best for Short-Lived Access Tokens (5-15 min).** |

**The Gold Standard Architecture (Hybrid):**
1. **Access Token (Short-lived, 10 min):** Kept in JavaScript memory (React Context / Zustand). Lost on page refresh.
2. **Refresh Token (Long-lived, 7 days):** Stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie managed exclusively by the backend.
3. On initial page load or token expiration: React calls `/api/auth/refresh`. The browser sends the cookie automatically, returning a fresh short-lived access token into memory.

---

## 4. Layered Error Handling & Global Toast Notifications

### Q5: How do you design Layered Error Boundaries across an entire app?
**Difficulty:** 🟡 Mid  
**Type:** 🏗️ System Design

**Answer:**
A production application should have at least **3 layers of Error Boundaries**:

```text
┌────────────────────────────────────────────────────────┐
│ 1. ROOT ERROR BOUNDARY                                 │
│ - Catches catastrophic crashes in Layout / Root Router │
│ - Displays: "Application crashed. Refresh page."       │
├────────────────────────────────────────────────────────┤
│ 2. ROUTE-LEVEL ERROR BOUNDARY (React Router errorElement)│
│ - Catches crashes within a specific page / route       │
│ - Keeps Navigation Header and Sidebar intact           │
│ - Displays: "Page could not be loaded."                │
├────────────────────────────────────────────────────────┤
│ 3. WIDGET / COMPONENT-LEVEL BOUNDARY                   │
│ - Wraps fragile third-party widgets (Charts, Maps)     │
│ - Replaces only that widget with a "Retry Widget" card │
│ - The rest of the page remains 100% interactive!       │
└────────────────────────────────────────────────────────┘
```

---

## 5. Environment Variables & Vite Deployment

### Q6: Why does Vite require the `VITE_` prefix for environment variables?
**Difficulty:** 🟢 Junior  
**Type:** 🛠️ Tooling & Security

**Answer:**
In Node.js, `process.env` contains sensitive server secrets (database passwords, AWS private keys, Stripe secret keys).

Vite compiles client-side code that runs in the **user's public web browser**. To prevent developers from accidentally leaking server secrets into client JavaScript bundles, Vite **strictly ignores** all variables in `.env` unless they are explicitly prefixed with `VITE_`:
```bash
# In .env
DATABASE_PASSWORD="secret"  # 🔒 Hidden from browser
VITE_API_URL="https://api.com" # 🌐 Exposed to browser as import.meta.env.VITE_API_URL
```

---

### Q7: Why do SPAs show 404 errors on page reload on Netlify, Vercel, or AWS S3? How do you fix it?
**Difficulty:** 🟢 Junior  
**Type:** 🚀 DevOps / Routing

**Answer:**
- In an SPA, routes like `/dashboard/analytics` are virtual routes handled by React Router in client JavaScript.
- When a user presses Refresh, the browser sends an HTTP GET request to the hosting server looking for a physical file named `/dashboard/analytics/index.html`.
- Because that physical file does not exist on the static server, it returns **HTTP 404 Not Found**.

**The Fix (URL Rewrites):**
Instruct the static server to route **all requests (`/*`)** back to `/index.html`:

- **For Netlify (`public/_redirects`):**
  ```text
  /*    /index.html   200
  ```
- **For Vercel (`vercel.json`):**
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **For Nginx (`nginx.conf`):**
  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  ```

---

## 6. Docker Multi-Stage Production Builds

### Q8: Coding Challenge: Multi-Stage Dockerfile for a React Production App
**Difficulty:** 🟡 Mid  
**Type:** 🐳 DevOps & Production

```dockerfile
# Stage 1: Build stage (Node.js)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Production runtime (Ultra-lightweight Nginx)
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx public files
RUN rm -rf ./*

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist .

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
*Why multi-stage builds are critical:* The builder stage contains 500MB of Node.js runtimes and `node_modules`. The final runner image contains **only Nginx and static HTML/CSS/JS files**, reducing image size from 600MB down to ~25MB!

---

## 🎯 Quick-Fire Round

1. **What is ESLint's `no-cycle` rule?**  
   *A linter rule preventing circular import dependencies between files.*
2. **What is `lint-staged` with Husky?**  
   *A Git pre-commit hook that automatically formats and lints only staged files before allowing commits.*
3. **What is Content Security Policy (CSP)?**  
   *An HTTP header restricting which domains the browser can execute scripts, styles, and API calls from, mitigating XSS.*
4. **Why should you avoid hardcoding API URLs in code?**  
   *Because staging, development, and production environments point to different API endpoints.*
5. **What is Flash of Unauthenticated Content (FOUC)?**  
   *When a protected dashboard briefly renders before the authentication check completes and redirects to login.*
6. **How do you prevent FOUC on protected routes?**  
   *Display a full-page loading spinner while the auth session token check is pending.*
7. **What is Semantic Versioning (SemVer)?**  
   *`MAJOR.MINOR.PATCH` (Breaking changes . New features . Bug fixes).*
8. **What does `npm ci` do compared to `npm install`?**  
   *`npm ci` performs a clean, deterministic install strictly matching `package-lock.json`, ideal for CI/CD.*
9. **Can you read `import.meta.env` at runtime in Docker after Vite builds?**  
   *No! Vite bakes environment variables into the static JS bundle at build time unless injected via a runtime window config.*
10. **What is a Service Worker used for in production?**  
    *Offline caching, background sync, and push notifications.*

---

> **Next:** [14 — React Ecosystem & Tooling Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/14-ecosystem-qa.md)
