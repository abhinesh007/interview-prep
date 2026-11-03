/**
 * =============================================================================
 * PROBLEM: Async Task Runner with Concurrency Limit
 * =============================================================================
 * 
 * Problem Description:
 * When processing many asynchronous jobs (e.g. file uploads, network calls), 
 * executing all of them simultaneously can overload system resources or hit 
 * API rate limits.
 * 
 * Implement an `AsyncTaskRunner` (or `pLimit`) that executes asynchronous tasks 
 * while guaranteeing that no more than `concurrencyLimit` tasks run concurrently.
 * 
 * Implement the class `AsyncTaskRunner`:
 * - `constructor(limit)`: Sets the maximum number of concurrent running tasks.
 * - `push(task)`: Receives a function `task` that returns a Promise. Returns a Promise 
 *   that resolves/rejects with the result of `task()` when it eventually executes.
 * - Tasks are queued in FIFO order and start executing as soon as an active execution 
 *   slot becomes available.
 * 
 * Examples:
 * 
 * Example 1:
 *   const runner = new AsyncTaskRunner(2);
 *   const timeout = (time, val) => () => new Promise(res => setTimeout(() => res(val), time));
 * 
 *   // Queue 4 tasks with limit 2:
 *   runner.push(timeout(100, 'A')).then(console.log);
 *   runner.push(timeout(200, 'B')).then(console.log);
 *   runner.push(timeout(50, 'C')).then(console.log);
 *   runner.push(timeout(100, 'D')).then(console.log);
 * 
 *   // 'A' and 'B' start immediately.
 *   // At 100ms: 'A' finishes, 'C' starts.
 *   // At 150ms: 'C' finishes, 'D' starts.
 *   // At 200ms: 'B' finishes.
 *   // At 250ms: 'D' finishes.
 * =============================================================================
 */

export class AsyncTaskRunner {
    constructor(limit) {
        // TODO: Implement constructor
        throw new Error('Not implemented');
    }

    push(task) {
        // TODO: Implement push
        throw new Error('Not implemented');
    }
}

// --- Test Cases ---
// const runner = new AsyncTaskRunner(2);
// const delay = (ms, val) => () => new Promise(res => setTimeout(() => res(val), ms));
// runner.push(delay(100, 'Task 1')).then(console.log);
// runner.push(delay(50, 'Task 2')).then(console.log);
// runner.push(delay(20, 'Task 3')).then(console.log);
