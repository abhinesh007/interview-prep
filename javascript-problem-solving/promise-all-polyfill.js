/**
 * =============================================================================
 * PROBLEM: Custom Promise.all Implementation
 * =============================================================================
 * 
 * Problem Description:
 * Implement a function `promiseAll(iterable)` that replicates the behavior of 
 * the native `Promise.all()`.
 * 
 * Specifications:
 * 1. Takes an iterable (array) of promises or raw values.
 * 2. Returns a single Promise that:
 *    - Resolves when all of the input's promises have resolved, with an array of the
 *      resolved values, in the same order as the input iterable (not in resolution order).
 *    - Rejects immediately when any of the input's promises rejects, with the reason
 *      of the first promise that rejected.
 * 3. If passed an empty array, resolves immediately with an empty array.
 * 4. Must handle raw non-promise values seamlessly (e.g. `promiseAll([Promise.resolve(1), 2, 3])`).
 * 
 * Examples:
 * 
 * Example 1:
 *   const p1 = Promise.resolve(3);
 *   const p2 = 42;
 *   const p3 = new Promise((resolve) => setTimeout(() => resolve('foo'), 50));
 *   promiseAll([p1, p2, p3]).then(console.log); 
 *   // Output: [3, 42, 'foo']
 * 
 * Example 2:
 *   const p1 = Promise.resolve('ok');
 *   const p2 = Promise.reject('err');
 *   promiseAll([p1, p2]).catch(console.error);
 *   // Output: 'err'
 * =============================================================================
 */

export const promiseAll = (iterable) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// const p1 = Promise.resolve(10);
// const p2 = 20;
// const p3 = new Promise((resolve) => setTimeout(() => resolve(30), 50));
// promiseAll([p1, p2, p3]).then(res => console.log('Resolved:', res)); // Expected: [10, 20, 30]
