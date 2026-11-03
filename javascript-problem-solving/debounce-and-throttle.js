/**
 * =============================================================================
 * PROBLEM: Debounce and Throttle
 * =============================================================================
 * 
 * Problem Description:
 * Implement two of the most critical timing control functions in JavaScript:
 * 
 * 1. `debounce(fn, delay, immediate)`:
 *    Creates a debounced function that delays invoking `fn` until after `delay`
 *    milliseconds have elapsed since the last time the debounced function was invoked.
 *    If `immediate` is true, trigger `fn` on the leading edge instead of the trailing edge.
 * 
 * 2. `throttle(fn, limit)`:
 *    Creates a throttled function that only invokes `fn` at most once per every 
 *    `limit` milliseconds.
 * 
 * Both wrappers must:
 * - Preserve the execution context (`this`).
 * - Forward all arguments passed to the returned function.
 * 
 * Examples:
 * 
 * Example 1 (Debounce):
 *   const log = debounce((msg) => console.log(msg), 200);
 *   log('a');
 *   log('b');
 *   log('c');
 *   // Only 'c' is logged after 200ms of inactivity.
 * 
 * Example 2 (Throttle):
 *   const log = throttle((msg) => console.log(msg), 500);
 *   log('first'); // Executed immediately
 *   log('second'); // Dropped or deferred until limit window expires
 * =============================================================================
 */

export const debounce = (fn, delay, immediate = false) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

export const throttle = (fn, limit) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// const debouncedLog = debounce((x) => console.log('Debounced:', x), 100);
// debouncedLog(1);
// debouncedLog(2);
// debouncedLog(3); // Only 3 should log after 100ms

// const throttledLog = throttle((x) => console.log('Throttled:', x), 200);
// throttledLog('A'); // logs 'A'
// throttledLog('B'); // suppressed
