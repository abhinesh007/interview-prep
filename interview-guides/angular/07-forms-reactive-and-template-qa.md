# 07 — Angular Strictly Typed Forms & ControlValueAccessor

> Strictly Typed Reactive Forms (`FormGroup`, `FormControl`, `FormArray`, `FormRecord`), `getRawValue()` vs `value`, Custom Controls via `ControlValueAccessor`, Cross-Field & Async Validators, and Form Events.

---

## 📑 Table of Contents
1. [Reactive Forms vs Template-Driven Forms](#1-reactive-forms-vs-template-driven-forms)
2. [Strictly Typed Forms (Angular 14+)](#2-strictly-typed-forms-angular-14)
3. [`ControlValueAccessor` Custom Form Controls](#3-controlvalueaccessor-custom-form-controls)
4. [Advanced Validation & Async Validators](#4-advanced-validation--async-validators)
5. [Form State Lifecycle & Unified Events](#5-form-state-lifecycle--unified-events)
6. [🎯 Output & Senior Gotchas](#6--output--senior-gotchas)

---

## 1. Reactive Forms vs Template-Driven Forms

### Q1: Compare Reactive Forms with Template-Driven Forms. When should each be chosen?
**Difficulty:** 🟢 Junior  
**Type:** 📖 Conceptual  
**Tags:** `[Forms]` `[Core]`

**Answer:**

| Feature | Reactive Forms | Template-Driven Forms |
|---|---|---|
| **Form Model Setup** | Explicitly created in TypeScript class | Implicitly created by directives in template |
| **Data Flow** | Synchronous, programmatic, functional | Asynchronous (waits for two-way binding ticks) |
| **Predictability** | 100% testable without DOM rendering | Difficult to test in isolation without DOM |
| **Complex Validation** | Dynamic, conditional, cross-field easy | Cumbersome custom directives required |
| **Typing** | Strictly Typed (Angular 14+) | Loosely typed |

**Recommendation:**  
Use **Reactive Forms** for any enterprise application, complex multi-step wizards, or dynamic forms. Template-Driven forms (`[(ngModel)]`) are acceptable only for trivial single-field inputs or rapid prototyping.

---

## 2. Strictly Typed Forms (Angular 14+)

### Q2: How does Strictly Typed Reactive Forms work, and what is `FormRecord`?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[TypedForms]` `[TypeScript]`

**Answer:**
Since Angular 14, `FormControl`, `FormGroup`, and `FormArray` are strictly typed generics.

```typescript
interface LoginForm {
  email: FormControl<string>;
  password: FormControl<string>;
  rememberMe: FormControl<boolean>;
}

@Component({...})
export class LoginComponent {
  form = new FormGroup<LoginForm>({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true })
  });

  onSubmit() {
    // TypeScript knows exact shape and types!
    const email: string = this.form.controls.email.value;
  }
}
```

### What is `FormRecord`?
When the keys of a form group are **dynamic** (e.g. dynamic permissions checkboxes or user-configured key-value pairs):
`FormGroup` requires a fixed interface known at compile time.  
`FormRecord` allows dynamically adding and removing controls where all controls share the same type:

```typescript
// Dynamic permissions form
permissionsForm = new FormRecord<FormControl<boolean>>({});

addPermission(permKey: string) {
  this.permissionsForm.addControl(permKey, new FormControl(false, { nonNullable: true }));
}
```

---

### Q3: What is the critical difference between `form.value` and `form.getRawValue()`?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix  
**Tags:** `[TypedForms]` `[DisabledControls]`

**Answer:**
When a `FormControl` is **disabled** (`control.disable()`):
- **`form.value`:** Excludes disabled controls from the output object!
- **`form.getRawValue()`:** Includes **ALL** controls, regardless of their enabled or disabled state.

```typescript
const form = new FormGroup({
  id: new FormControl({ value: 101, disabled: true }), // Read-only ID
  username: new FormControl('alice')
});

console.log(form.value);
// Output: { username: 'alice' }  <-- ID IS MISSING!

console.log(form.getRawValue());
// Output: { id: 101, username: 'alice' } <-- Correct payload for PUT/PATCH!
```

**⚠️ Production Gotcha:** Submitting forms to backend APIs using `form.value` when key fields (like ID or account number) are disabled will cause the backend to receive missing keys, leading to `400 Bad Request` or null database overwrites. Always use `form.getRawValue()` for API payloads!

---

## 3. `ControlValueAccessor` Custom Form Controls

### Q4: What is `ControlValueAccessor` (CVA), and what are its 4 required methods?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[CVA]` `[CustomControls]`

**Answer:**
`ControlValueAccessor` is the bridge interface that connects Angular's Reactive Forms API (`formControlName`, `[formControl]`, `[(ngModel)]`) to a custom native or custom UI component.

```text
[Angular FormControl] ◄── CVA Interface ──► [Your Custom DOM Component]
  - value                                      - internal state
  - disabled status                            - DOM events (change, blur)
```

### The 4 Interface Methods:
1. **`writeValue(value: any): void`:** Called by Angular when the model changes programmatically (pushes value into component UI).
2. **`registerOnChange(fn: (val: any) => void): void`:** Angular registers a callback that your component MUST call when user changes the UI value.
3. **`registerOnTouched(fn: () => void): void`:** Angular registers a callback that your component MUST call when user blurs/focuses away.
4. **`setDisabledState?(isDisabled: boolean): void`:** Called when form control is enabled or disabled programmatically.

---

### Q5: Write a production-grade Custom Star Rating Component implementing `ControlValueAccessor`.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[CVA]` `[Implementation]`

**Answer:**

```typescript
import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true
    }
  ],
  template: `
    <div class="stars" [class.disabled]="disabled()">
      @for (star of [1, 2, 3, 4, 5]; track star) {
        <button
          type="button"
          [disabled]="disabled()"
          (click)="selectStar(star)"
          (blur)="onBlur()">
          {{ star <= rating() ? '★' : '☆' }}
        </button>
      }
    </div>
  `
})
export class StarRatingComponent implements ControlValueAccessor {
  rating = signal(0);
  disabled = signal(false);

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  // 1. Angular writes value from outside to inside
  writeValue(value: number): void {
    this.rating.set(value || 0);
  }

  // 2. Register change callback
  registerOnChange(fn: (val: number) => void): void {
    this.onChange = fn;
  }

  // 3. Register touched callback
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // 4. Handle disable state
  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  selectStar(value: number) {
    if (!this.disabled()) {
      this.rating.set(value);
      this.onChange(value); // Notify Angular Form!
      this.onTouched();
    }
  }

  onBlur() {
    this.onTouched();
  }
}
```

---

## 4. Advanced Validation & Async Validators

### Q6: How do you implement Cross-Field Validation (e.g., Password & Confirm Password matching)?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[Validation]` `[CrossField]`

**Answer:**
Cross-field validation must be attached to the **parent `FormGroup`**, not the individual control, so the validator can inspect multiple siblings simultaneously.

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) return null;

  return password === confirmPassword ? null : { passwordMismatch: true };
};

// Attached to FormGroup:
const registrationForm = new FormGroup({
  password: new FormControl('', Validators.required),
  confirmPassword: new FormControl('', Validators.required)
}, { validators: [passwordMatchValidator] });
```

---

### Q7: How do Async Validators work, and how do you prevent them from hammering the server API on every keystroke?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[AsyncValidation]` `[Performance]`

**Answer:**
An Async Validator returns an `Observable<ValidationErrors | null>`. While running, the control status is **`PENDING`**.

To prevent hammering the API on every single character, debounce the validation request:

```typescript
export function uniqueUsernameValidator(api: UserApiService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);

    return timer(400).pipe( // 400ms debounce
      switchMap(() => api.checkUsernameAvailable(control.value)),
      map(isAvailable => (isAvailable ? null : { usernameTaken: true })),
      catchError(() => of(null)) // Resilient to network errors
    );
  };
}

// In component:
username = new FormControl('', {
  validators: [Validators.required],
  asyncValidators: [uniqueUsernameValidator(this.userApi)],
  updateOn: 'blur' // ⚡ Alternative pro-tip: Only trigger on blur!
});
```

---

## 5. Form State Lifecycle & Unified Events

### Q8: What is the new `form.events` observable (Angular 18+), and how does it simplify form tracking?
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[Angular18]` `[FormEvents]`

**Answer:**
Previously, tracking form changes required subscribing separately to `valueChanges` and `statusChanges`. In Angular 18+, every `AbstractControl` exposes a unified **`events`** observable that streams fine-grained lifecycle events:

```typescript
import {
  ControlEvent,
  ValueChangeEvent,
  StatusChangeEvent,
  PristineChangeEvent,
  TouchedChangeEvent
} from '@angular/forms';

this.form.events.pipe(takeUntilDestroyed()).subscribe((event: ControlEvent) => {
  if (event instanceof ValueChangeEvent) {
    console.log('Value changed:', event.value);
  } else if (event instanceof TouchedChangeEvent) {
    console.log('Touched state changed:', event.touched);
  } else if (event instanceof StatusChangeEvent) {
    console.log('Validity status changed:', event.status);
  }
});
```

---

## 6. 🎯 Output & Senior Gotchas

### Q9: 🐛 Bug: `form.reset()` sets values to `null` instead of initial default values. Why and how to fix?
**Answer:**
By default, `FormControl.reset()` resets the control value to `null`.
```typescript
const count = new FormControl(0);
count.reset();
console.log(count.value); // null! (Not 0!)
```

#### The Fix: Use `{ nonNullable: true }`:
```typescript
const count = new FormControl(0, { nonNullable: true });
count.reset();
console.log(count.value); // 0! (Resets to initial default!)
```
Or use `NonNullableFormBuilder` (`inject(NonNullableFormBuilder)`).
