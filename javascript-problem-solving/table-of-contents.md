# JavaScript Problem Solving — Table of Contents

A curated collection of JavaScript algorithmic challenges, data structures, and problem-solving patterns frequently encountered in technical interviews.

- **Master Plan & Solutions**: [PLAN.md](./PLAN.md)
- **Complexity Deep Dive**: [Space & Time Complexity: Hardware Foundations & JavaScript Gotchas](./space-time-complexity-guide.md)

---

## Problems List

| # | Problem | Technique / Pattern | Difficulty | Brief Description | File Link |
|---|---------|---------------------|------------|-------------------|-----------|
| 1 | **Longest Substring Without Repeating Characters** | Sliding Window, Hash Map | Medium | Find the length and value of the longest contiguous substring containing all unique characters. | [maximum-substring-with-non-repeated-characters.js](./maximum-substring-with-non-repeated-characters.js) |
| 2 | **Two Sum (Sorted Array)** | Two Pointers | Easy | Find two numbers in a sorted array that sum up to a specific target value. | [two-sum-sorted.js](./two-sum-sorted.js) |
| 3 | **3Sum (Unique Triplets)** | Two Pointers, Sorting | Medium | Find all unique triplets in an integer array that sum up to zero without duplicates. | [three-sum.js](./three-sum.js) |
| 4 | **Container With Most Water** | Two Pointers, Greedy | Medium | Find two vertical lines that form a container holding the maximum amount of water. | [container-with-most-water.js](./container-with-most-water.js) |
| 5 | **Minimum Size Subarray Sum** | Dynamic Sliding Window | Medium | Find the minimal length of a contiguous subarray whose sum is at least a given target. | [minimum-size-subarray-sum.js](./minimum-size-subarray-sum.js) |
| 6 | **Group Anagrams** | Hash Map, Frequency Key | Medium | Group an array of strings such that all anagrams are clustered together. | [group-anagrams.js](./group-anagrams.js) |
| 7 | **Valid Parentheses with Types** | Stack (LIFO) | Easy | Validate whether open brackets are closed by the same type and in correct order. | [valid-parentheses-with-types.js](./valid-parentheses-with-types.js) |
| 8 | **Daily Temperatures** | Monotonic Stack | Medium | Calculate how many days to wait until a warmer temperature occurs for each day. | [daily-temperatures.js](./daily-temperatures.js) |
| 9 | **Merge Overlapping Intervals** | Interval Sorting & Merging | Medium | Merge all overlapping intervals into contiguous non-overlapping intervals. | [merge-intervals.js](./merge-intervals.js) |
| 10 | **Maximum Subarray Sum** | Kadane's Algorithm, DP | Medium | Find the contiguous subarray within a one-dimensional array of numbers that has the largest sum. | [maximum-subarray-sum.js](./maximum-subarray-sum.js) |
| 11 | **Least Recently Used (LRU) Cache** | Hash Map + Doubly Linked List | Medium | Design an LRU cache data structure supporting $O(1)$ get and put operations. | [lru-cache.js](./lru-cache.js) |
| 12 | **Tree / DOM Level Order Traversal** | Breadth-First Search (Queue) | Medium | Traverse a tree or DOM structure level-by-level from top to bottom, left to right. | [traverse-dom-tree-levels.js](./traverse-dom-tree-levels.js) |
| 13 | **Flatten Deeply Nested Array** | Recursion / Stack | Medium | Flatten a multi-dimensional array up to a specified depth without `Array.prototype.flat()`. | [flatten-deep-nested-array.js](./flatten-deep-nested-array.js) |
| 14 | **Find Duplicate Number** | Fast & Slow Pointers (Floyd's) | Medium | Identify the single duplicated number in an array of $n+1$ integers in $O(1)$ extra space. | [find-duplicate-number.js](./find-duplicate-number.js) |
| 15 | **Debounce and Throttle** | Higher-Order Functions, Timers | Medium | Implement rate-limiting wrappers with leading/trailing edge execution control. | [debounce-and-throttle.js](./debounce-and-throttle.js) |
| 16 | **Custom Promise.all Polyfill** | Async Control Flow, Promises | Medium | Recreate `Promise.all` handling raw values, asynchronous resolution, and fail-fast rejection. | [promise-all-polyfill.js](./promise-all-polyfill.js) |
| 17 | **Deep Clone (Circular References)** | Recursion, WeakMap Cache | Medium | Deeply duplicate nested objects, arrays, Dates, and RegExps while preventing circular loops. | [deep-clone-with-circular-refs.js](./deep-clone-with-circular-refs.js) |
| 18 | **Spiral Matrix Traversal** | 2D Boundary Traversal | Medium | Traverse all elements of an $m \times n$ matrix in spiral order using wall boundaries. | [spiral-matrix.js](./spiral-matrix.js) |
| 19 | **Number of Islands** | Grid DFS / Connected Components | Medium | Count distinct land masses in a 2D binary grid using grid traversal and flood fill. | [number-of-islands.js](./number-of-islands.js) |
| 20 | **Search in Rotated Sorted Array** | Modified Binary Search | Medium | Find the index of a target value in an ascending array with an unknown pivot in $O(\log n)$. | [search-rotated-sorted-array.js](./search-rotated-sorted-array.js) |
| 21 | **Subsets (Power Set)** | Backtracking / Cascading | Medium | Generate all unique subsets from a collection of distinct numbers. | [subsets-backtracking.js](./subsets-backtracking.js) |
| 22 | **Event Emitter (Pub/Sub Pattern)** | Observer Pattern | Medium | Build a complete event publisher and subscriber system with `on`, `emit`, `off`, and `once`. | [event-emitter-pub-sub.js](./event-emitter-pub-sub.js) |
| 23 | **Function Currying (Arbitrary Arity)** | Closures, Function Reflection | Medium | Convert multi-argument functions into sequentially invokable single-argument functions. | [curry-function.js](./curry-function.js) |
| 24 | **Async Task Runner (Concurrency Limit)** | Task Queue, Resource Pool | Hard | Execute asynchronous tasks ensuring no more than $K$ concurrent tasks run at any instant. | [async-task-runner-concurrency-limiter.js](./async-task-runner-concurrency-limiter.js) |
