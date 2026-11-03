# 09 — Angular HTTP Client, Functional Interceptors & Networking

> Modern Functional Interceptors (`HttpInterceptorFn`), Request/Response Pipelines, `HttpContext` & `HttpContextToken`, 401 Token Refresh Queues, Exponential Backoff Retries, and In-Memory Caching.

---

## 📑 Table of Contents
1. [Functional Interceptors Architecture](#1-functional-interceptors-architecture)
2. [Interceptor Pipeline Execution Order](#2-interceptor-pipeline-execution-order)
3. [`HttpContext` & Per-Request Metadata](#3-httpcontext--per-request-metadata)
4. [Advanced 401 Refresh Token Queue](#4-advanced-401-refresh-token-queue)
5. [Resilient Retries with Exponential Backoff](#5-resilient-retries-with-exponential-backoff)
6. [🎯 Networking Traps & Senior Scenarios](#6--networking-traps--senior-scenarios)

---

## 1. Functional Interceptors Architecture

### Q1: Compare modern Functional Interceptors (`HttpInterceptorFn`) with legacy Class-Based Interceptors (`HttpInterceptor`).
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[HttpClient]` `[Interceptors]`

**Answer:**
Angular 15+ introduced functional interceptors via `provideHttpClient(withInterceptors([...]))`, eliminating class-based `HTTP_INTERCEPTORS` multi-providers.

```typescript
// Modern Functional Interceptor (auth.interceptor.ts)
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const clonedReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(clonedReq);
  }

  return next(req);
};
```

#### Registration in `app.config.ts`:
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor, loggingInterceptor])
    )
  ]
};
```

### Why Functional Interceptors are superior:
1. **Tree-Shakable & Lightweight:** Plain functions with zero decorator overhead.
2. **Direct `inject()` Support:** Injects any dependency in-line without constructor boilerplate.
3. **Explicit Ordering:** Registered directly in an array in `appConfig`, guaranteeing predictable execution order.

---

## 2. Interceptor Pipeline Execution Order

### Q2: What is the exact execution order of multiple interceptors during the request and response phases?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[Interceptors]` `[Pipeline]`

**Answer:**
Interceptors form an onion-like pipeline (middleware chain).

If configured as:
`withInterceptors([LoggerInterceptor, AuthInterceptor, ErrorInterceptor])`

```text
[HTTP Request]
     │
     ▼
1. LoggerInterceptor (Request Phase)
     │
     ▼
2. AuthInterceptor   (Request Phase)
     │
     ▼
3. ErrorInterceptor  (Request Phase)
     │
     ▼
[HTTP Backend / Network Request to Server]
     │
     ▲
3. ErrorInterceptor  (Response Phase)
     │
     ▲
2. AuthInterceptor   (Response Phase)
     │
     ▲
1. LoggerInterceptor (Response Phase)
     │
     ▲
[Component receives HttpResponse]
```

- **Request Phase:** Executes from **first to last** (Index `0 ➔ N`).
- **Response Phase:** Executes from **last to first** (Index `N ➔ 0`) via RxJS pipe operators on the returned stream.

---

## 3. `HttpContext` & Per-Request Metadata

### Q3: How do you bypass an interceptor (e.g. skip auth header or skip global loading spinner) for a specific HTTP request?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[HttpContext]` `[Tokens]`

**Answer:**
Angular provides **`HttpContext`** and **`HttpContextToken`** to pass typed metadata along with a request without polluting URL query params or headers.

```typescript
// 1. Define the Context Token (tokens.ts)
import { HttpContextToken } from '@angular/common/http';

export const BYPASS_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);
```

```typescript
// 2. Interceptor checks the token (auth.interceptor.ts)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if caller wants to bypass auth
  if (req.context.get(BYPASS_AUTH)) {
    return next(req); // Pass through without Bearer token!
  }

  const token = inject(AuthService).getToken();
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

```typescript
// 3. Making the request in a Service:
this.http.get('/api/public-catalogue', {
  context: new HttpContext().set(BYPASS_AUTH, true)
});
```

---

## 4. Advanced 401 Refresh Token Queue

### Q4: Write a production-grade 401 Unauthorized Refresh Token Interceptor that prevents race conditions across concurrent requests.
**Difficulty:** 🟣 Principal / Lead  
**Type:** 💻 Coding  
**Tags:** `[Auth]` `[Concurrency]`

**Answer:**
When multiple concurrent requests fail with `401 Unauthorized`, only **one** request should initiate the refresh token API call. All other requests must pause and wait in a queue until the new token is acquired.

```typescript
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const jwtRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null); // Reset queue lock

          return authService.refreshToken().pipe(
            switchMap((newTokenResponse) => {
              isRefreshing = false;
              refreshTokenSubject.next(newTokenResponse.accessToken); // Unblock queue!
              return next(req.clone({
                setHeaders: { Authorization: `Bearer ${newTokenResponse.accessToken}` }
              }));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authService.logout(); // Refresh failed -> force logout
              return throwError(() => refreshErr);
            })
          );
        } else {
          // Another request is ALREADY refreshing -> Queue this request!
          return refreshTokenSubject.pipe(
            filter((token): token is string => token !== null), // Wait until token is not null
            take(1),
            switchMap((token) => {
              return next(req.clone({
                setHeaders: { Authorization: `Bearer ${token}` }
              }));
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};
```

---

## 5. Resilient Retries with Exponential Backoff

### Q5: How do you implement Automatic Retries with Exponential Backoff and Jitter in Angular?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Retry]` `[Resilience]`

**Answer:**
RxJS's `retry` operator supports a configuration object with a dynamic delay function:

```typescript
import { retry, timer } from 'rxjs';

export function retryWithBackoff(maxRetries = 3, initialDelayMs = 1000) {
  return retry({
    count: maxRetries,
    delay: (error: any, retryIndex: number) => {
      // Never retry client validation errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s + random jitter (0-500ms)
      const delayTime = initialDelayMs * Math.pow(2, retryIndex - 1);
      const jitter = Math.random() * 500;
      console.warn(`Retry attempt #${retryIndex} after ${delayTime + jitter}ms...`);

      return timer(delayTime + jitter);
    }
  });
}

// Applied in service:
this.http.get('/api/analytics').pipe(
  retryWithBackoff(3, 1000)
);
```

---

## 6. 🎯 Networking Traps & Senior Scenarios

### Q6: 🐛 Bug: Cloning an HttpRequest does not deep-clone headers. How do you append vs set headers?
**Answer:**
```typescript
// ❌ WRONG: req.headers is immutable! Mutating directly does nothing.
req.headers.set('Authorization', 'Bearer token');

// ✅ CORRECT: Use clone({ setHeaders: { ... } }) or clone({ headers: req.headers.set(...) })
const modifiedReq = req.clone({
  setHeaders: {
    'Authorization': `Bearer ${token}`,
    'X-Client-Version': '2.0.0'
  }
});
```

- **`setHeaders`**: Replaces existing headers with the specified keys or adds them if absent.
- **`append`**: Useful if you need multiple values for the same header key (e.g. `Accept`).
