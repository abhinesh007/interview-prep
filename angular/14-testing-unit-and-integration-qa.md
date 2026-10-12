# 14 — Angular Modern Testing: Unit, Integration & Harnesses

> Test Runners Evolution (Karma/Jasmine to Jest/Vitest), Standalone Component Testing with `TestBed`, Component Test Harnesses (`@angular/cdk/testing`), Testing Signals & `TestBed.flushEffects()`, and Mocking HTTP with `HttpTestingController`.

---

## 📑 Table of Contents
1. [Test Runners Evolution: Karma to Jest & Vitest](#1-test-runners-evolution-karma-to-jest--vitest)
2. [Testing Standalone Components with `TestBed`](#2-testing-standalone-components-with-testbed)
3. [Testing Signals & Reactive Effects](#3-testing-signals--reactive-effects)
4. [Component Test Harnesses (`@angular/cdk/testing`)](#4-component-test-harnesses-angularcdktesting)
5. [HTTP Testing with `HttpTestingController`](#5-http-testing-with-httptestingcontroller)
6. [Async Testing: `fakeAsync` vs `waitForAsync` vs Native `async/await`](#6-async-testing-fakeasync-vs-waitforasync-vs-native-asyncawait)

---

## 1. Test Runners Evolution: Karma to Jest & Vitest

### Q1: Why did the Angular team deprecate Karma and Jasmine, and why is the ecosystem shifting to Jest and Vitest?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Testing]` `[Karma]` `[Vitest]`

**Answer:**
For over a decade, Angular used **Karma** (a browser runner) and **Jasmine**.
- **The Problem with Karma:** Karma actually launches a full real headless Chrome browser instance. As codebases grow to thousands of unit tests, startup time, socket reconnections, and memory bloat make CI runs agonizingly slow (often 10–20 minutes). Karma has also been officially deprecated by its core maintainers.
- **The Modern Shift:**
  - **Jest:** Node-based testing using simulated DOM (`jsdom`), running tests in isolated worker threads with snapshot testing.
  - **Vitest:** Blazing-fast native ESM test runner integrated with Vite/esbuild, leveraging the same build configuration as the application builder.

```text
Test Suite Execution Time (2,000 unit tests):
Karma (Headless Chrome):  [ 3 - 5 minutes ]
Jest (Worker threads):    [ 40 - 60 seconds ]
Vitest (Native ESM/Vite): [ 8 - 15 seconds ]
```

---

## 2. Testing Standalone Components with `TestBed`

### Q2: How do you configure `TestBed` for Standalone Components and provide modern functional providers?
**Difficulty:** 🟢 Junior  
**Type:** 💻 Coding  
**Tags:** `[TestBed]` `[Standalone]`

**Answer:**
With standalone components, `TestBed` configuration is radically simplified:
1. Place the standalone component in `imports: [...]` (NOT `declarations`!).
2. Use modern testing providers (`provideHttpClientTesting`, `provideRouter`).

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserProfileComponent } from './user-profile.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('UserProfileComponent', () => {
  let component: UserProfileComponent;
  let fixture: ComponentFixture<UserProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent], // ✅ Import directly
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),    // Mock backend
        provideRouter([])              // Mock router
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the component', () => {
    expect(component).toBeTruthy();
  });
});
```

---

## 3. Testing Signals & Reactive Effects

### Q3: How do you test Angular Signals, `computed()` values, and `effect()`? What is `TestBed.flushEffects()`?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Signals]` `[Testing]`

**Answer:**

#### 1. Testing Signals & `computed()`:
Signals and computed expressions update synchronously when read. No need for `fixture.detectChanges()` to assert value changes:
```typescript
it('should recalculate total price on quantity change', () => {
  const component = fixture.componentInstance;

  expect(component.totalPrice()).toBe(0);

  // Update signal
  component.quantity.set(3);

  // Synchronous read of computed signal!
  expect(component.totalPrice()).toBe(30);
});
```

#### 2. Testing `effect()` with `TestBed.flushEffects()`:
Unlike `computed()`, `effect()` runs asynchronously on the microtask queue. In unit tests, to ensure effects have executed before asserting expectations, call **`TestBed.flushEffects()`**:

```typescript
it('should write to localStorage inside effect', () => {
  const component = fixture.componentInstance;
  const spy = spyOn(localStorage, 'setItem');

  component.theme.set('dark');

  // Force all pending reactive effects to execute synchronously!
  TestBed.flushEffects();

  expect(spy).toHaveBeenCalledWith('theme', 'dark');
});
```

---

## 4. Component Test Harnesses (`@angular/cdk/testing`)

### Q5: What are Angular Component Test Harnesses, and why are they vastly superior to querying DOM elements via `fixture.debugElement.query(By.css(...))`?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[ComponentHarnesses]` `[CDK]`

**Answer:**
A **Component Test Harness** (inspired by Page Object patterns) is a class that allows tests to interact with a component through an official, user-oriented API without coupling test logic to internal HTML tags or CSS classes.

#### Brittle DOM Querying (Breaks when CSS or markup changes):
```typescript
// ❌ Fragile: Breaks if class name or button element changes!
const btn = fixture.debugElement.query(By.css('.mat-mdc-button-base')).nativeElement;
btn.click();
```

#### Robust Component Harness (Resilient to redesigns):
```typescript
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

describe('OrderComponent', () => {
  let loader: HarnessLoader;

  beforeEach(() => {
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should click the submit button', async () => {
    // Interacts through official public harness
    const submitBtn = await loader.getHarness(MatButtonHarness.with({ text: 'Submit Order' }));

    expect(await submitBtn.isDisabled()).toBeFalse();
    await submitBtn.click();
  });
});
```

### Why Harnesses win:
1. **Immunity to CSS/DOM Refactors:** If Angular Material or your design system changes internal markup, your test suite remains 100% green.
2. **Built-in Async Stabilization:** Harness methods automatically trigger change detection and wait for animations/microtasks.

---

## 5. HTTP Testing with `HttpTestingController`

### Q6: How do you mock HTTP calls and simulate error responses using `HttpTestingController`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[HttpTestingController]` `[Mocking]`

**Answer:**

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = inject(UserService);
    httpTesting = inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no unmatched/dangling requests were fired
    httpTesting.verify();
  });

  it('should fetch user and return data', () => {
    service.getUser(42).subscribe(user => {
      expect(user.name).toBe('Alice');
    });

    // Expect exactly 1 request to this URL
    const req = httpTesting.expectOne('/api/users/42');
    expect(req.request.method).toBe('GET');

    // Flush mock response
    req.flush({ id: 42, name: 'Alice' });
  });

  it('should handle 404 error cleanly', () => {
    service.getUser(999).subscribe({
      next: () => fail('Should have failed with 404'),
      error: (err) => expect(err.status).toBe(404)
    });

    const req = httpTesting.expectOne('/api/users/999');
    req.flush('User not found', { status: 404, statusText: 'Not Found' });
  });
});
```

---

## 6. Async Testing: `fakeAsync` vs `waitForAsync` vs Native `async/await`

### Q7: Contrast `fakeAsync` with `waitForAsync`. When should each be used?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[fakeAsync]` `[Asynchronous]`

**Answer:**

| Feature | `fakeAsync` + `tick()` | `waitForAsync` | Native `async/await` |
|---|---|---|---|
| **Timer Model** | **Virtual Simulated Clock** | Real browser clock | Real browser clock |
| **Execution** | Purely synchronous | Asynchronous callback | Asynchronous Promise |
| **Simulating Delays** | `tick(1000)` advances 1 second **instantly** without waiting | Must wait actual wall-clock milliseconds | Must wait actual wall-clock milliseconds |
| **XHR/Fetch Support** | ❌ Cannot handle real network requests | ✅ Waits for pending XHR | ✅ Waits for promises |

```typescript
it('should debounce input search by 300ms', fakeAsync(() => {
  component.onSearch('angular');

  // Fast forward virtual clock by 299ms - search should not have fired yet
  tick(299);
  expect(component.results().length).toBe(0);

  // Advance remaining 1ms - search fires instantly!
  tick(1);
  expect(component.results().length).toBe(5);
}));
```

**Senior Rule of Thumb:** Use `fakeAsync` whenever testing timeouts, debounce intervals, or animations to keep test suites blazing fast.
