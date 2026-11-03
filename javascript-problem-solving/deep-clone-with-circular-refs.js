/**
 * =============================================================================
 * PROBLEM: Deep Clone With Circular References
 * =============================================================================
 * 
 * Problem Description:
 * Implement a function `deepClone(value)` that creates a deep copy of any 
 * JavaScript value.
 * 
 * Requirements:
 * 1. Primitive types (number, string, boolean, null, undefined, symbol, bigint) 
 *    should be returned as-is.
 * 2. Arrays and plain objects must be deeply cloned into new instances.
 * 3. Handles Date and RegExp objects properly by instantiating new copies.
 * 4. Circular References: If an object references itself or forms a circular cycle, 
 *    the function must NOT enter an infinite loop. It must preserve the reference structure.
 * 
 * Examples:
 * 
 * Example 1:
 *   const original = { a: 1, b: { c: 2 }, d: [3, 4] };
 *   const copy = deepClone(original);
 *   copy.b.c = 99;
 *   console.log(original.b.c); // 2 (independent clone)
 * 
 * Example 2 (Circular Reference):
 *   const obj = { name: 'cycle' };
 *   obj.self = obj;
 *   const cloned = deepClone(obj);
 *   console.log(cloned !== obj); // true
 *   console.log(cloned.self === cloned); // true
 * =============================================================================
 */

export const deepClone = (value, seen = new WeakMap()) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// const original = { a: 1, b: { c: [10, 20] }, date: new Date() };
// const clone = deepClone(original);
// console.log(clone !== original && clone.b !== original.b); // Expected: true
