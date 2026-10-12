# 08 — Angular Directives, Directive Composition & Pipes

> Directive Composition API (`hostDirectives`), Modern Host Bindings (`host`), Custom Structural Directives (`TemplateRef` / `ViewContainerRef`), Pure vs Impure Pipes, and Pipe Performance.

---

## 📑 Table of Contents
1. [Directive Composition API (Angular 15+)](#1-directive-composition-api-angular-15)
2. [Modern Host Bindings vs Legacy Decorators](#2-modern-host-bindings-vs-legacy-decorators)
3. [Custom Structural Directives](#3-custom-structural-directives)
4. [Pipes: Pure vs Impure Internals](#4-pipes-pure-vs-impure-internals)
5. [🎯 Output Challenges & Common Traps](#5--output-challenges--common-traps)

---

## 1. Directive Composition API (Angular 15+)

### Q1: What problem does the Directive Composition API solve, and how does it work?
**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `[hostDirectives]` `[Composition]`

**Answer:**
Prior to Angular 15, to reuse UI behaviors (such as tooltips, ripple effects, drag-and-drop, or focus trapping) across multiple components, developers were forced to use **class inheritance (`extends BaseComponent`)**. Class inheritance in JavaScript is strictly single-inheritance, rigid, and tightly couples unrelated logic.

The **Directive Composition API** enables true **behavior composition** by allowing components or directives to declare `hostDirectives` directly inside their decorator.

```typescript
// 1. Standalone Behavior Directives
@Directive({ selector: '[appTooltip]', standalone: true })
export class TooltipDirective {
  tooltipText = input.required<string>();
}

@Directive({ selector: '[appRipple]', standalone: true })
export class RippleDirective {
  rippleColor = input('rgba(0,0,0,0.2)');
}

// 2. Custom Button Composes Both Behaviors!
@Component({
  selector: 'app-fancy-button',
  standalone: true,
  hostDirectives: [
    RippleDirective,
    {
      directive: TooltipDirective,
      inputs: ['tooltipText: tip'] // Exposes input as 'tip' on app-fancy-button!
    }
  ],
  template: `<button><ng-content /></button>`
})
export class FancyButtonComponent {}
```

```html
<!-- Consumed with composed inputs directly on host -->
<app-fancy-button tip="Click to proceed">Submit</app-fancy-button>
```

### Key Advantages:
- **Zero inheritance hierarchy:** Compose 5+ independent behaviors onto a single component.
- **Input/Output aliasing:** Re-expose or remap directive inputs/outputs on the host component's public API.
- **Encapsulation:** The consumer doesn't need to manually type `appRipple` and `appTooltip` on every button instance.

---

## 2. Modern Host Bindings vs Legacy Decorators

### Q2: Why are `@HostBinding` and `@HostListener` discouraged in modern Angular, and what is the preferred alternative?
**Difficulty:** 🟡 Mid  
**Type:** 💻 Coding  
**Tags:** `[HostBinding]` `[Modern]`

**Answer:**
`@HostBinding` and `@HostListener` decorators have been largely superseded by the **`host` object literal** inside `@Component` and `@Directive` metadata (or using `HostListener` via functional listeners / host signals).

#### Comparison:
```typescript
// ❌ Legacy Decorator Syntax:
@Component({...})
export class LegacyCardComponent {
  @HostBinding('class.is-expanded') isExpanded = false;
  @HostBinding('attr.role') role = 'region';

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    this.isExpanded = !this.isExpanded;
  }
}

// ✅ Modern Recommended Syntax (Direct in decorator metadata):
@Component({
  selector: 'app-modern-card',
  standalone: true,
  host: {
    'role': 'region',
    '[class.is-expanded]': 'isExpanded()',
    '(click)': 'toggleExpanded($event)'
  },
  template: `...`
})
export class ModernCardComponent {
  isExpanded = signal(false);

  toggleExpanded(event: MouseEvent) {
    this.isExpanded.update(v => !v);
  }
}
```

### Why the `host` property is preferred:
1. **Single Source of Truth:** All host DOM bindings are visible in one place alongside `selector` and `template`.
2. **Superior Performance:** Compiler compiles `host` bindings into faster internal Ivy instructions.
3. **No Duplicate Field Bindings:** Avoids scattered decorators across large class files.

---

## 3. Custom Structural Directives

### Q3: How do Custom Structural Directives work under the hood? Write a custom `*appPermission` directive.
**Difficulty:** 🔴 Senior  
**Type:** 💻 Coding  
**Tags:** `[StructuralDirectives]` `[TemplateRef]`

**Answer:**
A structural directive shapes the DOM by adding, removing, or manipulating host elements using:
- **`TemplateRef<T>`:** Represents the embedded `<ng-template>` content.
- **`ViewContainerRef`:** Represents the DOM container where views can be attached or detached.

The asterisk syntax `*appPermission="['admin']"` is syntactic sugar that compiles into:
`<ng-template [appPermission]="['admin']"><button>Delete</button></ng-template>`.

```typescript
import { Directive, TemplateRef, ViewContainerRef, inject, input, effect } from '@angular/core';
import { AuthService } from '../auth.service';

@Directive({
  selector: '[appPermission]',
  standalone: true
})
export class PermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  // Modern Signal Input
  appPermission = input.required<string[]>();

  constructor() {
    effect(() => {
      const requiredRoles = this.appPermission();
      const user = this.authService.currentUser();
      const hasAccess = requiredRoles.some(role => user?.roles.includes(role));

      this.viewContainer.clear();

      if (hasAccess) {
        // Render embedded template into the DOM
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
```

---

## 4. Pipes: Pure vs Impure Internals

### Q4: What is the difference between Pure and Impure Pipes in Angular?
**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `[Pipes]` `[Performance]`

**Answer:**

```typescript
@Pipe({
  name: 'filterList',
  standalone: true,
  pure: true // Default
})
export class FilterPipe implements PipeTransform { ... }
```

| Feature | Pure Pipe (`pure: true`) | Impure Pipe (`pure: false`) |
|---|---|---|
| **Execution Trigger** | Only when input parameter reference changes (`prev !== next`) | On **EVERY** change detection cycle across the app |
| **Memoization** | ✅ Result is memoized based on inputs | ❌ Recalculates continuously |
| **Performance** | High performance | Can severely degrade frame rates |
| **Common Use** | Formatting currency, dates, numbers, text transforms | `AsyncPipe` (needs to subscribe & check stream continuously) |

---

### Q5: 🐛 Bug: A Pure Pipe filtering an array fails to update when a new item is pushed into the array. Why?
**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug & Fix  
**Tags:** `[Pipes]` `[Immutability]`

**Answer:**

```typescript
// Component:
items = ['Apple', 'Banana'];
addItem() {
  this.items.push('Cherry'); // ❌ Mutates array in place!
}
```
```html
<!-- Template -->
@for (item of (items | filterFruit); track item) { ... }
```

#### Why it fails:
`FilterFruitPipe` is **pure**. Angular checks if the input reference changed:
`prevItems === nextItems` is `true` (both reference the exact same array in memory). Angular skips pipe execution!

#### Fix:
Always update array immutably:
```typescript
addItem() {
  this.items = [...this.items, 'Cherry']; // ✅ New array reference triggers pure pipe!
}
```

---

## 5. 🎯 Output Challenges & Common Traps

### Q6: Why is `AsyncPipe` marked as an Impure Pipe (`pure: false`)?
**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `[AsyncPipe]` `[Internals]`

**Answer:**
If `AsyncPipe` were pure, it would only evaluate when the *Observable reference itself* changed (`obs1 !== obs2`).  
However, an Observable instance emits new values over time *without* changing its own reference!  
Therefore, `AsyncPipe` must be **impure** so Angular can evaluate its state across change detection runs, check for new emissions from the internal subscription, and call `markForCheck()` to schedule a DOM render.
