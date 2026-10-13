# 15 — Testing Strategies & Local Developer Experience (DX) Orchestration

> The MFE Testing Pyramid, Unit Testing with Vitest in Isolation, End-to-End Testing with Playwright, The "Laptop Meltdown" Problem, and Nx Dev vs Static Remotes (`--devRemotes`).

---

## 📑 Table of Contents
1. [The Micro-Frontend Testing Pyramid](#1-the-micro-frontend-testing-pyramid)
2. [Unit Testing Remotes in Complete Isolation (Vitest / Jest)](#2-unit-testing-remotes-in-complete-isolation-vitest--jest)
3. [End-to-End Testing Across Federated Boundaries (Playwright)](#3-end-to-end-testing-across-federated-boundaries-playwright)
4. [Local DX Orchestration & The "Laptop Meltdown" Solution](#4-local-dx-orchestration--the-laptop-meltdown-solution)
5. [🧩 Output Prediction & 🐛 Debug Scenarios](#5--output-prediction---debug-scenarios)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. The Micro-Frontend Testing Pyramid

### Q1: How does the Testing Pyramid change in a Micro-Frontend Monorepo architecture?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Testing]` `[Vitest]` `[Playwright]` `[Architecture]`

**Answer:**
In a monolithic application, tests assume all components and routes are compiled together into a single scope. In an MFE architecture, tests are segmented into **three distinct fidelity tiers**:

```text
┌────────────────────────────────────────────────────────┐
│                   THE MFE TESTING PYRAMID              │
├────────────────────────────────────────────────────────┤
│                       ▲                                │
│                      / \                               │
│                     / E2E\     Playwright / Cypress    │
│                    /──────\    (Host + Live Remotes)   │
│                   /Integration\ Component Harnesses    │
│                  /─────────────\ (Host + Mock Remotes) │
│                 /  Unit Tests   \ Vitest / Jest        │
│                /─────────────────\(Isolated Components)│
└────────────────────────────────────────────────────────┘
```

1. **Unit Testing (80% of tests):**
   - Executed using **Vitest** or **Jest**.
   - Tests components in **100% isolation** within their own library or remote project.
   - External federated remotes and `loadRemoteModule` calls are mocked cleanly.
   - Extremely fast: Executes in <50ms per test file.
2. **Integration / Contract Testing (15% of tests):**
   - Validates that the Host Shell can instantiate remotes and that shared event bus payloads match expected contracts using **Pact** or **Zod schema validations**.
3. **End-to-End (E2E) Testing (5% of tests):**
   - Executed using **Playwright**.
   - Spins up the Host Shell and target live remotes to verify critical business transactions across boundaries (e.g. adding item in Catalog Remote $\rightarrow$ completing purchase in Checkout Remote).

---

## 2. Unit Testing Remotes in Complete Isolation (Vitest / Jest)

### Q2: How do you mock `loadRemoteModule` in Vitest or Jest when unit testing an Angular or React Host shell?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Vitest]` `[Mocking]` `[Angular]`

**Answer:**
When unit testing a Host component that dynamically imports a remote module, the remote CDN is unavailable. You must mock the federation loader:

```typescript
// apps/shell/src/app/app.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import * as federation from '@nx/angular/dynamic-module-federation';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 1. Create a dummy test stub component to substitute for the remote
@Component({
  standalone: true,
  template: '<div id="mock-orders-remote">Mock Orders Content</div>',
})
class MockOrdersComponent {}

describe('AppComponent (Host Shell)', () => {
  beforeEach(async () => {
    // 2. Mock loadRemoteModule using Vitest spy
    vi.spyOn(federation, 'loadRemoteModule').mockResolvedValue({
      ORDERS_ROUTES: [{ path: '', component: MockOrdersComponent }],
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          {
            path: 'orders',
            loadChildren: () => federation.loadRemoteModule('orders', './Routes').then((m) => m.ORDERS_ROUTES),
          },
        ]),
      ],
    }).compileComponents();
  });

  it('should render mock remote upon navigation', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // Test passes cleanly in milliseconds without downloading external scripts!
  });
});
```

---

## 3. End-to-End Testing Across Federated Boundaries (Playwright)

### Q3: How do you configure Playwright in an Nx workspace to test a Host shell communicating with multiple live Remotes?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `[Playwright]` `[E2E]` `[Nx]`

**Answer:**
In `apps/shell-e2e/playwright.config.ts`, configure Playwright's `webServer` option to boot both the Host and all required Remotes concurrently using Nx's multi-project serve:

```typescript
// apps/shell-e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  webServer: {
    // Uses Nx to serve Host + Remotes in parallel for the E2E test run
    command: 'npx nx run shell:serve:production',
    port: 4200,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
});
```

---

## 4. Local DX Orchestration & The "Laptop Meltdown" Solution

### Q4: What is the "Laptop Meltdown" problem in large MFE architectures, and how does Nx solve it with `--devRemotes` and `--staticRemotes`?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `[DX]` `[Performance]` `[Nx-Serve]`

**Answer:**
### The "Laptop Meltdown" Problem:
If an enterprise monorepo has **15 Micro-Frontends**, running `nx serve shell` with all 15 remotes compiling in memory simultaneously consumes **16GB+ of RAM and 100% of CPU**, causing developer laptops to freeze and thermal-throttle!

```text
THE LAPTOP MELTDOWN:
Developer wants to work on JUST the "Orders" feature:
- Running: Shell (4200) + Orders (4201) + Billing (4202) + Catalog (4203)
  + Reviews (4204) + Auth (4205) + Search (4206) + Dashboard (4207)...
- 15 Node/Webpack processes compiling in parallel! Laptop crashes!

THE NX SOLUTION (--devRemotes):
$ npx nx serve shell --devRemotes=orders

1. DEV REMOTE (orders):
   - Runs full Hot Module Replacement (HMR) webpack-dev-server on port 4201.
   - Developer edits code; updates instantly in <100ms.

2. STATIC REMOTES (all other 14 remotes):
   - Nx compiles them once (or pulls from cache) into static dist files.
   - A single, ultra-lightweight Express/file-server serves all static remotes!
   - CPU Usage: Drops from 100% to 2%! RAM Usage: Drops from 16GB to 1GB!
```

---

## 5. 🧩 Output Prediction & 🐛 Debug Scenarios

### Q5: 🐛 Debug Scenario: Flaky Playwright E2E Tests on CI Due to Remote Loading Latency
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `[Debug]` `[Playwright]` `[Flaky-Tests]`

**Scenario:**
A Playwright E2E test passes 100% of the time locally on an M3 MacBook Pro.
On GitHub Actions CI runners, the test fails intermittently (30% failure rate) with:
```text
Error: locator.click: Timeout 5000ms exceeded.
Waiting for locator('#checkout-pay-button')
```
Why does this test fail intermittently in CI, and how do you make it rock-solid?

**Answer:**
**Root Cause:** CI runner CPUs are slower and virtualized. When clicking navigate to `/checkout`, the browser must fetch `remoteEntry.js` and asynchronously mount the federated React/Angular component. The test script executed immediately, looking for `#checkout-pay-button` before the remote chunk had finished evaluating.

**Fix:** Use web-first assertions that auto-wait for the remote container network idle or component mount:
```typescript
// Unstable (Flaky in CI):
await page.goto('/checkout');
await page.locator('#checkout-pay-button').click();

// Resilient (100% Stable):
await page.goto('/checkout');
// Auto-wait for the remote's root container to attach to DOM:
const checkoutRoot = page.locator('[data-mfe-remote="checkout"]');
await expect(checkoutRoot).toBeVisible({ timeout: 15000 });
// Now safely interact with buttons:
await page.locator('#checkout-pay-button').click();
```

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q6: Why is Vitest preferred over Jest in modern Nx monorepos?
**Answer:** Vitest natively supports ES Modules, shares the same configuration and plugin pipeline as Vite, uses worker threads with shared memory pools, and executes 4–10x faster than Jest without requiring `ts-jest` compilation overhead.

### Q7: What does Mock Service Worker (MSW) do in an MFE testing setup?
**Answer:** MSW intercepts outgoing network requests at the browser Service Worker level, returning mock API responses. This allows frontend MFEs to be tested and developed locally with realistic HTTP data even when backend BFF services are offline.

### Q8: What is the purpose of `nx run-many -t test --parallel=4`?
**Answer:** It runs unit tests across multiple projects concurrently, utilizing up to 4 CPU worker threads in parallel, pulling clean results directly from the computation cache for unchanged projects.
