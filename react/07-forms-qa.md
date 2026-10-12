# 07 — Forms & Validation Interview Questions & Answers

> Controlled vs Uncontrolled forms, performance bottlenecks on 50+ fields, React Hook Form (RHF) architecture, Zod schema validation, multi-step wizards, Formik comparison, and Accessibility (ARIA).

---

## 📑 Table of Contents
1. [Controlled vs Uncontrolled Form Performance](#1-controlled-vs-uncontrolled-form-performance)
2. [Validation Timing & Accessibility (a11y)](#2-validation-timing--accessibility-a11y)
3. [React Hook Form (RHF) Deep Dive](#3-react-hook-form-rhf-deep-dive)
4. [Schema Validation with Zod](#4-schema-validation-with-zod)
5. [Multi-Step Form Wizard Architecture](#5-multi-step-form-wizard-architecture)
6. [Formik vs React Hook Form Comparison](#6-formik-vs-react-hook-form-comparison)
7. [🎯 Quick-Fire Round](#-quick-fire-round)

---

## 1. Controlled vs Uncontrolled Form Performance

### Q1: Why do large controlled forms suffer from performance lag?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Performance

**Answer:**
In a classic controlled form:
```jsx
const [formData, setFormData] = useState({ firstName: '', lastName: '', ...50Fields });

const handleChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
};
```
Every single keystroke triggers:
1. A state update via `setFormData`.
2. A re-render of the parent `<Form>` component.
3. A cascading re-render of **all 50 input fields** and buttons unless every single input is aggressively memoized with `React.memo` and callbacks with `useCallback`.
4. High CPU usage, battery drain, and dropped frames, especially on mobile devices.

**How Uncontrolled Forms Solve This:**
Uncontrolled forms (like React Hook Form) store input state in the **native DOM element itself** using `ref`s. Keystrokes mutate the native input node without triggering a single React re-render. React only reads the values when needed (validation or submission).

---

### Q2: Why MUST `<input type="file" />` always be an uncontrolled input?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
In HTML and JavaScript browser security models, an `<input type="file" />` value is **strictly read-only** from JavaScript.
A web page cannot programmatically set `input.value = "C:/passwords.txt"` due to browser security restrictions.

Because React cannot control or inject the file path back into the DOM node, React will throw an error if you pass `value` to a file input. File inputs **must** be uncontrolled, and files must be read via `ref.current.files` or `onChange={(e) => handleFile(e.target.files[0])}`.

---

## 2. Validation Timing & Accessibility (a11y)

### Q3: When should form validation run? Compare On-Submit, On-Blur, and On-Change.
**Difficulty:** 🟡 Mid  
**Type:** 📖 UX & Engineering

**Answer:**

| Strategy | When it triggers | UX Pros | UX Cons | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **On-Submit** | Only when user clicks "Submit" | Zero premature warnings while typing | User gets flooded with 10 errors at once | Short forms, simple logins |
| **On-Blur** | When user tabs/clicks away from input | Validates after user finishes typing in a field | Doesn't clear error as soon as user fixes it | Email, phone number, address fields |
| **On-Change** | On every keystroke | Instant feedback | Annoying if shown before user finishes typing | Password strength meter, username availability check |

**The Gold Standard (Hybrid / Touched Strategy):**
Start in **On-Blur** mode (wait until the user leaves the field). Once a field is invalid (touched and erroneous), switch that specific field to **On-Change** mode so the error message clears immediately as soon as the user corrects their typo!

---

### Q4: Coding Challenge: Accessible Form Field with `aria-invalid` and `aria-describedby`
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding / Accessibility

```tsx
import React, { useId } from 'react';

interface InputProps {
  label: string;
  error?: string;
  value: string;
  onChange: (val: string) => void;
}

export function AccessibleInput({ label, error, value, onChange }: InputProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="error-message">
          {error}
        </span>
      )}
    </div>
  );
}
```
*Why this matters in interviews:* Screen readers announce `aria-invalid="true"` and read out the error message referenced by `aria-describedby` automatically when the input gains focus!

---

## 3. React Hook Form (RHF) Deep Dive

### Q5: How does React Hook Form achieve high performance?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Internals

**Answer:**
1. **Uncontrolled under the hood:** RHF registers inputs via native DOM refs using the `register()` function. Input changes modify the DOM directly without causing component re-renders.
2. **Subscription-based updates:** Instead of re-rendering the whole form on state change, RHF uses an internal observer (pub/sub). Only components explicitly subscribed to a state slice (e.g. via `watch()` or `useWatch()`) re-render.
3. **Isolated re-renders:** Error messages and submission spinners only re-render the specific error elements rather than the whole form tree.

---

### Q6: `watch()` vs `getValues()` in React Hook Form — What is the crucial difference?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual / Gotcha

**Answer:**
- **`watch('fieldName')`:** Subscribes to input changes and **triggers a component re-render** whenever the watched field updates. Use this when UI rendering depends on the value (e.g., displaying a preview, toggling conditional input fields).
- **`getValues('fieldName')`:** Reads the current value from the DOM ref **without triggering any re-render**. Use this inside event callbacks or helper functions when you just need to inspect the current value imperatively.

---

## 4. Schema Validation with Zod

### Q7: Coding Challenge: Complete Registration Form with React Hook Form + Zod Schema
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define Zod Schema with Password Match refinement
const registerSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // Anchor error to confirmPassword field
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// 2. Component
export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label>Username</label>
        <input {...register('username')} />
        {errors.username && <p className="err">{errors.username.message}</p>}
      </div>

      <div>
        <label>Email</label>
        <input type="email" {...register('email')} />
        {errors.email && <p className="err">{errors.email.message}</p>}
      </div>

      <div>
        <label>Password</label>
        <input type="password" {...register('password')} />
        {errors.password && <p className="err">{errors.password.message}</p>}
      </div>

      <div>
        <label>Confirm Password</label>
        <input type="password" {...register('confirmPassword')} />
        {errors.confirmPassword && <p className="err">{errors.confirmPassword.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## 5. Multi-Step Form Wizard Architecture

### Q8: Coding Challenge: Multi-Step Form with Per-Step Validation (`trigger()`)
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding / Architecture

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type StepFormData = {
  // Step 1
  firstName: string;
  lastName: string;
  // Step 2
  shippingAddress: string;
  city: string;
};

export function MultiStepWizard() {
  const [step, setStep] = useState(1);
  const { register, handleSubmit, trigger, formState: { errors } } = useForm<StepFormData>();

  const nextStep = async () => {
    // Validate ONLY Step 1 fields before advancing!
    if (step === 1) {
      const isValid = await trigger(['firstName', 'lastName']);
      if (isValid) setStep(2);
    }
  };

  const prevStep = () => setStep(s => s - 1);

  const onSubmit = (data: StepFormData) => {
    console.log('Final Submission:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {step === 1 && (
        <fieldset>
          <legend>Step 1: Personal Info</legend>
          <input {...register('firstName', { required: 'First name is required' })} placeholder="First Name" />
          {errors.firstName && <span>{errors.firstName.message}</span>}

          <input {...register('lastName', { required: 'Last name is required' })} placeholder="Last Name" />
          {errors.lastName && <span>{errors.lastName.message}</span>}

          <button type="button" onClick={nextStep}>Next ➔</button>
        </fieldset>
      )}

      {step === 2 && (
        <fieldset>
          <legend>Step 2: Shipping</legend>
          <input {...register('shippingAddress', { required: 'Address is required' })} placeholder="Address" />
          <input {...register('city', { required: 'City is required' })} placeholder="City" />

          <button type="button" onClick={prevStep}>⬅ Back</button>
          <button type="submit">Complete Order</button>
        </fieldset>
      )}
    </form>
  );
}
```

---

## 6. Formik vs React Hook Form Comparison

### Q9: Formik vs React Hook Form: Comprehensive Comparison
**Difficulty:** 🟡 Mid  
**Type:** 📊 Architecture Decision

| Criteria | Formik | React Hook Form |
| :--- | :--- | :--- |
| **Architecture** | Controlled (React state on every keystroke) | Uncontrolled (Native DOM refs) |
| **Re-renders** | Re-renders form on every keypress | Zero re-renders during typing |
| **Bundle Size** | ~13 kB | ~8 kB |
| **Maintenance** | Low frequency updates, legacy | Actively maintained, modern standard |
| **TypeScript DX** | Good | Superior (`zodInfer` integration) |
| **Recommendation** | Legacy support only | **Recommended for all new React projects** |

---

## 🎯 Quick-Fire Round

1. **What is `noValidate` on a `<form>` tag used for?**  
   *It disables browser native HTML5 validation popups, allowing custom JavaScript validation to handle errors.*
2. **Can you share a Zod schema between Next.js server actions and React Hook Form?**  
   *Yes! This provides end-to-end type safety and unified validation rules.*
3. **What does `reset()` do in React Hook Form?**  
   *Resets all form input values and clears dirty/error states.*
4. **How do you handle custom third-party UI inputs (e.g. MUI Select, Datepicker) in RHF?**  
   *Use the `<Controller />` component or `useController` hook.*
5. **What is `isDirty` in form state?**  
   *A boolean flag indicating whether any form value has been modified from its initial default value.*
6. **Can you validate asynchronously with Zod (e.g., check if email is taken)?**  
   *Yes, using `.refine(async (val) => await checkEmail(val))`.*
7. **What is the difference between `touchedFields` and `dirtyFields`?**  
   *`touchedFields` means the user focused and blurred the field; `dirtyFields` means the value actually changed.*
8. **Why should you pass `defaultValue` instead of `value` when using uncontrolled inputs?**  
   *To provide initial data without binding the input to controlled state updates.*
9. **Does calling `handleSubmit` prevent default form submission automatically?**  
   *Yes, React Hook Form's `handleSubmit` invokes `e.preventDefault()` internally.*
10. **Can you register an input without passing it to JSX?**  
    *Yes, using `setValue('name', value, { shouldValidate: true })` for hidden/imperative values.*

---

> **Next:** [08 — Data Fetching Interview Q&A →](file:///Users/abhineshgour/learning-space/abhi-agy/interview-prep/react/08-data-fetching-qa.md)
