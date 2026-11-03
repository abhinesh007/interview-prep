/**
 * =============================================================================
 * PROBLEM: Function Currying (Arbitrary Arity)
 * =============================================================================
 * 
 * Problem Description:
 * Currying is the technique of converting a function that takes multiple arguments 
 * into a sequence of functions that each takes a single argument (or fewer arguments).
 * 
 * Implement a function `curry(fn)` that takes a function `fn` and returns a 
 * curried version of that function.
 * 
 * Requirements:
 * 1. If the number of passed arguments is greater than or equal to `fn.length`, 
 *    execute `fn` with the arguments.
 * 2. If fewer arguments are provided, return a new function that takes subsequent 
 *    arguments, accumulating them until `fn.length` arguments are collected.
 * 3. Preserve `this` binding correctly across curried invocations.
 * 
 * Examples:
 * 
 * Example 1:
 *   function sum(a, b, c) {
 *     return a + b + c;
 *   }
 *   const curriedSum = curry(sum);
 *   curriedSum(1)(2)(3);    // 6
 *   curriedSum(1, 2)(3);    // 6
 *   curriedSum(1)(2, 3);    // 6
 *   curriedSum(1, 2, 3);    // 6
 * =============================================================================
 */

export const curry = (fn) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// const sum = (a, b, c) => a + b + c;
// const curriedSum = curry(sum);
// console.log(curriedSum(1)(2)(3)); // Expected: 6
// console.log(curriedSum(1, 2)(3)); // Expected: 6
// console.log(curriedSum(1)(2, 3)); // Expected: 6
