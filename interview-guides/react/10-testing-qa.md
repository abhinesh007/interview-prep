# 10 — Testing in React Interview Questions & Answers

> Testing Trophy vs Pyramid, React Testing Library (RTL) query hierarchy, `userEvent` vs `fireEvent`, MSW (Mock Service Worker), testing custom hooks with `renderHook`, and Playwright E2E.

---

## 📑 Table of Contents
1. [Testing Philosophy: Trophy vs Pyramid](#1-testing-philosophy-trophy-vs-pyramid)
2. [React Testing Library (RTL) Principles](#2-react-testing-library-rtl-principles)
3. [Query Priority & Async Queries](#3-query-priority--async-queries)
4. [User Interactions: `userEvent` vs `fireEvent`](#4-user-interactions-userevent-vs-fireevent)
5. [Mocking with MSW (Mock Service Worker)](#5-mocking-with-msw-mock-service-worker)
6. [Testing Custom Hooks with `renderHook`](#6-testing-custom-hooks-with-renderhook)
7. [Playwright E2E Testing](#7-playwright-e2e-testing)
8. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Testing Philosophy: Trophy vs Pyramid

### Q1: What is the "Testing Trophy" and why does it replace the traditional "Testing Pyramid" for React?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual

**Answer:**
Kent C. Dodds introduced the **Testing Trophy** for modern web applications:

```text
       ▲
      / \        [ E2E ]          (Few tests, high confidence, slow)
     /───\
    /     \      [ Integration ]  <--- SWEET SPOT (Most tests belong here!)
   /───────\
  /         \    [ Unit ]         (Fast, tests isolated pure functions/reducers)
 /───────────\
/             \  [ Static ]       (TypeScript, ESLint — instant feedback)
───────────────
```

- **The Traditional Pyramid:** Heavy emphasis on isolated Unit Tests. Unit testing isolated React components in a vacuum (mocking everything) gives low confidence because real bugs occur at the seams where components interact.
- **The Trophy:** Focuses heavily on **Integration Tests**. Testing a group of components together (e.g., rendering a full page, clicking a button, waiting for the mocked API response to render) replicates real user behavior and yields the highest return on investment.

---

### Q2: "Test user behavior, not implementation details" — Explain with an example.
**Difficulty:** 🟢 Junior  
**Type:** 📖 Core Philosophy

**Answer:**
**Testing Implementation Details (Bad):**
- Testing the internal state variable name: `expect(wrapper.state('isOpen')).toBe(true)`
- Testing private class methods or internal hook names.
*Why it fails:* If you refactor from `useState` to `useReducer` without changing the UI, the test breaks even though the component works perfectly for users (false negative).

**Testing User Behavior (Good):**
- Testing what the user sees and interacts with:
```javascript
// ✅ Good: User clicks button and sees the dialog
await user.click(screen.getByRole('button', { name: /open dialog/i }));
expect(screen.getByRole('dialog')).toBeInTheDocument();
```
*Why it wins:* You can rewrite the entire component from scratch, switch libraries, or refactor hooks—as long as the user can still open the dialog, the test passes!

---

## 2. React Testing Library (RTL) Principles

### Q3: What should you NEVER test in a React application?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Best Practices

**Answer:**
1. **Third-party library internals:** Do not test whether Redux, TanStack Query, or React Router work; test *your application's usage* of them.
2. **Standard browser behavior:** Do not test if a link opens a new tab or if an input receives focus natively.
3. **Pure visual styling:** Do not write unit tests asserting that `color === 'rgb(0, 0, 255)'`. Use visual regression tools (Percy, Chromatic) or Playwright screenshots instead.
4. **Implementation details / Private hook states:** Never spy on internal component state.

---

## 3. Query Priority & Async Queries

### Q4: RTL Query Priority: Why does `getByRole` come first, and when should you use `getByTestId`?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Best Practices

**Answer:**
React Testing Library recommends this priority order:

1. **`getByRole` (Highest Priority):** Accessible to everyone and screen readers (`button`, `heading`, `dialog`, `textbox`). Guarantees your app is accessible!
2. **`getByLabelText`:** Essential for form inputs associated with `<label>` elements.
3. **`getByPlaceholderText`:** Fallback for inputs without labels.
4. **`getByText`:** Useful for non-interactive elements (paragraphs, spans).
5. **`getByDisplayValue`:** Useful when checking current input values.
6. **`getByTestId` (Last Resort):** Use ONLY when the element has no semantic role or visible text (e.g., an icon-only button without an aria-label or dynamic SVG canvas).

---

### Q5: `getBy` vs `queryBy` vs `findBy`: When to use each?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Reference Guide

**Answer:**

| Query Variant | Element Found | Element NOT Found | Async / Awaited? | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **`getBy...`** | Returns element | **Throws Exception** | Synchronous | Verifying element is immediately on screen |
| **`queryBy...`** | Returns element | **Returns `null`** | Synchronous | **Asserting absence:** `expect(queryByText('Error')).not.toBeInTheDocument()` |
| **`findBy...`** | Returns Promise | **Rejects Promise** (timeout 1000ms) | **Async (`await`)** | **Waiting for async elements:** API data, lazy chunks |

---

## 4. User Interactions: `userEvent` vs `fireEvent`

### Q6: Why is `@testing-library/user-event` always preferred over `fireEvent`?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
- **`fireEvent`:** Dispatches a single synthetic DOM event directly on the target element.
  - `fireEvent.click(checkbox)` only dispatches the click event. It doesn't focus the checkbox, doesn't trigger `keyDown`, doesn't check if the checkbox is disabled or covered by a modal!
- **`userEvent`:** Simulates full, realistic browser interactions as a real user would perform them.
  - Calling `await user.type(input, 'Hello')` triggers:
    1. Hover over input
    2. Click to focus
    3. `keyDown`, `keyPress`, `input`, and `keyUp` for **every single character**!
    4. Respects `disabled` state (refuses to type if input is disabled).

---

## 5. Mocking with MSW (Mock Service Worker)

### Q7: Why is MSW superior to mocking `fetch` or `axios` with `jest.fn()`?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture

**Answer:**
- **Mocking Fetch/Axios directly (`jest.spyOn(global, 'fetch')`):** Mocks the implementation. If you switch from `fetch` to `axios` or update query options, all tests break. It also doesn't test URL paths, headers, or query string parsing accurately.
- **MSW (Mock Service Worker):** Operates at the **network level** (via Service Workers in the browser or intercepting native Node http modules in Jest/Vitest). Your app makes real HTTP requests through standard fetch/axios clients, and MSW intercepts them at the boundary.

---

### Q8: Coding Challenge: Form Submission Test with MSW and RTL
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { LoginForm } from './LoginForm';

// 1. Setup MSW server
const server = setupServer(
  http.post('/api/login', async ({ request }) => {
    const body: any = await request.json();
    if (body.email === 'admin@test.com') {
      return HttpResponse.json({ user: 'Admin' });
    }
    return new HttpResponse('Unauthorized', { status: 401 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('logs in successfully and shows welcome message', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  // Fill in inputs
  await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
  await user.type(screen.getByLabelText(/password/i), 'secret123');

  // Click submit
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  // Wait for async response to render
  expect(await screen.findByText(/welcome, admin/i)).toBeInTheDocument();
});
```

---

## 6. Testing Custom Hooks with `renderHook`

### Q9: Coding Challenge: Test a Counter Hook with `renderHook` and `act`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

// The Hook
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  return { count, increment, decrement };
}

// The Test
test('should increment and decrement counter', () => {
  const { result } = renderHook(() => useCounter(10));

  expect(result.current.count).toBe(10);

  // Any state-updating hook calls must be wrapped in act()
  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(11);

  act(() => {
    result.current.decrement();
  });

  expect(result.current.count).toBe(10);
});
```

---

## 7. Playwright E2E Testing

### Q10: Coding Challenge: Write a Playwright Test for Login -> Dashboard Flow
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding / E2E

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user logs in and navigates to protected dashboard', async ({ page }) => {
    // 1. Visit Login page
    await page.goto('/login');

    // 2. Fill credentials
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('Password123!');

    // 3. Click Login
    await page.getByRole('button', { name: 'Log In' }).click();

    // 4. Assert redirection and dashboard header visibility
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    // 5. Verify local storage session
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
  });
});
```

---

## 🎯 Quick-Fire Round

1. **What is `act()` in React testing?**  
   *A utility ensuring all React state updates and effects are processed before running assertions.*
2. **Why does RTL auto-wrap `render` and `userEvent` in `act()`?**  
   *To eliminate manual `act()` warnings during standard user interaction tests.*
3. **What is Snapshot Testing and when should it be avoided?**  
   *Serializing component HTML to a string snapshot. Avoid for large trees as devs blindly update snapshots without inspecting diffs.*
4. **How do you test components requiring React Router?**  
   *Wrap them in `<MemoryRouter initialEntries={['/users/1']}>`.*
5. **How do you test components requiring Context or TanStack Query?**  
   *Create a `customRender` wrapper function that wraps the component with required Providers.*
6. **Can `waitFor` in RTL cause test timeouts?**  
   *Yes, if the condition inside `waitFor(() => expect(...))` never succeeds within the timeout window (default 1000ms).*
7. **What is Vitest?**  
   *A Vite-native unit test framework with Jest-compatible APIs that is significantly faster than Jest.*
8. **What does `screen.debug()` do?**  
   *Prints the current DOM tree in the test console for debugging.*
9. **How do you test error boundaries in RTL?**  
   *Render a child component that throws an error, and assert that the fallback error UI is in the document.*
10. **Why should you avoid `cleanup()` in `afterEach` manually?**  
    *RTL calls `cleanup()` automatically after every test in modern setups.*

---

> **Next:** [11 — Performance Optimization Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/11-performance-qa.md)
