# JavaScript Problem Solving & Algorithmic Patterns — Master Plan

A comprehensive roadmap of the most frequently asked algorithmic problem-solving patterns in JavaScript and Frontend/Full-Stack technical interviews.

For hardware fundamentals, measurement techniques, and language-specific pitfalls, see the [Space & Time Complexity Guide](./space-time-complexity-guide.md).

---

## Roadmap & Problem Matrix

| # | Problem Title | Target File | Core Pattern | Complexity (Time / Space) |
|---|---------------|-------------|--------------|---------------------------|
| 1 | Longest Substring Without Repeating Characters | [`maximum-substring-with-non-repeated-characters.js`](./maximum-substring-with-non-repeated-characters.js) | Dynamic Sliding Window | $O(N)$ / $O(\min(N, \Sigma))$ |
| 2 | Two Sum (Sorted Array) | [`two-sum-sorted.js`](./two-sum-sorted.js) | Two Pointers (Inward) | $O(N)$ / $O(1)$ |
| 3 | Three Sum (Unique Triplets) | [`three-sum.js`](./three-sum.js) | Sort + Two Pointers | $O(N^2)$ / $O(1)$ |
| 4 | Container With Most Water | [`container-with-most-water.js`](./container-with-most-water.js) | Two Pointers (Greedy) | $O(N)$ / $O(1)$ |
| 5 | Minimum Size Subarray Sum | [`minimum-size-subarray-sum.js`](./minimum-size-subarray-sum.js) | Dynamic Sliding Window | $O(N)$ / $O(1)$ |
| 6 | Group Anagrams | [`group-anagrams.js`](./group-anagrams.js) | Hash Map / Signature Key | $O(N \cdot K)$ / $O(N \cdot K)$ |
| 7 | Valid Parentheses | [`valid-parentheses-with-types.js`](./valid-parentheses-with-types.js) | Stack (LIFO Matching) | $O(N)$ / $O(N)$ |
| 8 | Daily Temperatures (Next Warmer Day) | [`daily-temperatures.js`](./daily-temperatures.js) | Monotonic Decreasing Stack | $O(N)$ / $O(N)$ |
| 9 | Merge Overlapping Intervals | [`merge-intervals.js`](./merge-intervals.js) | Interval Sorting & Merging | $O(N \log N)$ / $O(N)$ |
| 10 | Maximum Subarray Sum (Kadane's) | [`maximum-subarray-sum.js`](./maximum-subarray-sum.js) | Dynamic Programming / Greedy | $O(N)$ / $O(1)$ |
| 11 | Least Recently Used (LRU) Cache | [`lru-cache.js`](./lru-cache.js) | Hash Map + Doubly Linked List | $O(1)$ Get/Put / $O(C)$ |
| 12 | Binary/DOM Tree Level Order Traversal | [`traverse-dom-tree-levels.js`](./traverse-dom-tree-levels.js) | Breadth-First Search (Queue) | $O(N)$ / $O(W)$ |
| 13 | Flatten Deeply Nested Array | [`flatten-deep-nested-array.js`](./flatten-deep-nested-array.js) | Recursive DFS / Iterative Stack | $O(N)$ / $O(D)$ |
| 14 | Find Duplicate Number (Floyd's Cycle) | [`find-duplicate-number.js`](./find-duplicate-number.js) | Fast & Slow Pointers | $O(N)$ / $O(1)$ |
| 15 | Debounce and Throttle | [`debounce-and-throttle.js`](./debounce-and-throttle.js) | Higher-Order Functions / Timers | $O(1)$ per call / $O(1)$ |
| 16 | Custom Promise.all Polyfill | [`promise-all-polyfill.js`](./promise-all-polyfill.js) | Async Flow / Promise Chaining | $O(N)$ / $O(N)$ |
| 17 | Deep Clone (Circular References) | [`deep-clone-with-circular-refs.js`](./deep-clone-with-circular-refs.js) | Recursion + WeakMap Cache | $O(N)$ / $O(N)$ |
| 18 | Spiral Matrix Traversal | [`spiral-matrix.js`](./spiral-matrix.js) | 2D Boundary Traversal | $O(M \cdot N)$ / $O(1)$ auxiliary |
| 19 | Number of Islands | [`number-of-islands.js`](./number-of-islands.js) | Grid DFS / Connected Components | $O(M \cdot N)$ / $O(M \cdot N)$ |
| 20 | Search in Rotated Sorted Array | [`search-rotated-sorted-array.js`](./search-rotated-sorted-array.js) | Modified Binary Search | $O(\log N)$ / $O(1)$ |
| 21 | Subsets (Power Set) | [`subsets-backtracking.js`](./subsets-backtracking.js) | Backtracking / Cascading | $O(2^N \cdot N)$ / $O(N)$ stack |
| 22 | Event Emitter (Pub/Sub) | [`event-emitter-pub-sub.js`](./event-emitter-pub-sub.js) | Observer Pattern / Map of Sets | $O(1)$ add / $O(K)$ emit |
| 23 | Function Currying (Arbitrary Arity) | [`curry-function.js`](./curry-function.js) | Closures / Arity Inspection | $O(1)$ per step |
| 24 | Async Task Runner (Concurrency Limit) | [`async-task-runner-concurrency-limiter.js`](./async-task-runner-concurrency-limiter.js) | Task Queue / Resource Pool | $O(1)$ enqueue / $O(L)$ concurrent |

---

## Detailed Problem Breakdown, Under-the-Hood Concepts & Reference Solutions

---

### 1. Longest Substring Without Repeating Characters
- **File**: [`maximum-substring-with-non-repeated-characters.js`](./maximum-substring-with-non-repeated-characters.js)
- **Problem**: Given a string `s`, find the longest contiguous substring consisting exclusively of unique characters.
- **Concept & Technique**: **Dynamic Sliding Window with Hash Map**.
  - Keep two pointers `start` and `end`.
  - Maintain a map of `char -> lastSeenIndex`.
  - When `seen.has(char) && seen.get(char) >= start`, jump `start` directly to `seen.get(char) + 1`.
  - Record the maximum window length `end - start + 1`.

#### Reference Solution
```javascript
export const longestSubString = (str) => {
    let maximumLength = 0;
    let start = 0;
    let longestStr = '';
    const seen = new Map();

    for (let end = 0; end < str.length; end++) {
        const char = str[end];
        if (seen.has(char) && seen.get(char) >= start) {
            start = seen.get(char) + 1;
        }
        seen.set(char, end);
        const currentLength = end - start + 1;
        if (maximumLength < currentLength) {
            maximumLength = currentLength;
            longestStr = str.substring(start, end + 1);
        }
    }
    return longestStr;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(\min(N, \Sigma))$.

---

### 2. Two Sum (Sorted Array)
- **File**: [`two-sum-sorted.js`](./two-sum-sorted.js)
- **Problem**: Given a 1-indexed array of integers sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number. Return their 1-based indices `[index1, index2]`.
- **Concept & Technique**: **Two Pointers (Inward Collision)**.
  - Because the array is sorted, place pointer `left = 0` and pointer `right = numbers.length - 1`.
  - Calculate `sum = numbers[left] + numbers[right]`.
  - If `sum === target`, solution found.
  - If `sum < target`, increment `left` to increase the total sum.
  - If `sum > target`, decrement `right` to decrease the total sum.

#### Reference Solution
```javascript
export const twoSumSorted = (numbers, target) => {
    let left = 0;
    let right = numbers.length - 1;

    while (left < right) {
        const sum = numbers[left] + numbers[right];
        if (sum === target) {
            return [left + 1, right + 1]; // 1-indexed
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    return [];
};
```
- **Complexity**: Time: $O(N)$, Space: $O(1)$.

---

### 3. Three Sum (Unique Triplets)
- **File**: [`three-sum.js`](./three-sum.js)
- **Problem**: Given an integer array `nums`, return all the unique triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.
- **Concept & Technique**: **Sorting + Two Pointers with Duplicate Avoidance**.
  - Sort the array in ascending order.
  - Iterate through `i` from `0` to `n - 3`. If `nums[i] === nums[i - 1]`, skip to avoid duplicate triplets.
  - Use two pointers: `left = i + 1`, `right = n - 1`.
  - Check `sum = nums[i] + nums[left] + nums[right]`.
  - If `sum === 0`, push triplet to result, then advance `left` and `right` past identical neighboring values.

#### Reference Solution
```javascript
export const threeSum = (nums) => {
    const result = [];
    nums.sort((a, b) => a - b);

    for (let i = 0; i < nums.length - 2; i++) {
        // Skip duplicate values for the first element
        if (i > 0 && nums[i] === nums[i - 1]) continue;

        let left = i + 1;
        let right = nums.length - 1;

        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++;
                right--;
            } else if (sum < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
};
```
- **Complexity**: Time: $O(N^2)$, Space: $O(1)$ auxiliary (ignoring sort output).

---

### 4. Container With Most Water
- **File**: [`container-with-most-water.js`](./container-with-most-water.js)
- **Problem**: Given an array `height` of length $n$, find two vertical lines that, together with the x-axis, form a container that holds the most water. Return the maximum area.
- **Concept & Technique**: **Two Pointers (Greedy Inward Squeeze)**.
  - The area is determined by `min(height[left], height[right]) * (right - left)`.
  - Always move the pointer that points to the shorter line inward. Moving the taller line inward cannot increase area because the width shrinks and the bottleneck (the shorter line) remains the same or gets worse.

#### Reference Solution
```javascript
export const maxArea = (height) => {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;

    while (left < right) {
        const width = right - left;
        const h = Math.min(height[left], height[right]);
        maxWater = Math.max(maxWater, width * h);

        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return maxWater;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(1)$.

---

### 5. Minimum Size Subarray Sum
- **File**: [`minimum-size-subarray-sum.js`](./minimum-size-subarray-sum.js)
- **Problem**: Given an array of positive integers `nums` and a positive integer `target`, return the minimal length of a contiguous subarray of which `sum >= target`. If none exists, return `0`.
- **Concept & Technique**: **Dynamic Sliding Window (Expand right, shrink left)**.
  - Expand `right` pointer, accumulating `windowSum += nums[right]`.
  - While `windowSum >= target`, record the minimum length `Math.min(minLength, right - left + 1)` and shrink from the left: `windowSum -= nums[left++]`.

#### Reference Solution
```javascript
export const minSubArrayLen = (target, nums) => {
    let left = 0;
    let sum = 0;
    let minLength = Infinity;

    for (let right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            minLength = Math.min(minLength, right - left + 1);
            sum -= nums[left++];
        }
    }
    return minLength === Infinity ? 0 : minLength;
};
```
- **Complexity**: Time: $O(N)$ (each element visited at most twice), Space: $O(1)$.

---

### 6. Group Anagrams
- **File**: [`group-anagrams.js`](./group-anagrams.js)
- **Problem**: Given an array of strings `strs`, group the anagrams together in any order.
- **Concept & Technique**: **Hash Map with Canonical Character Key / Frequency Signature**.
  - Two words are anagrams if and only if they have the exact same character frequency counts (or sorted representation).
  - Use a 26-element count array formatted as `#c0#c1...#c25` or sorted character string as a unique Map key.
  - Collect words into lists grouped by this key.

#### Reference Solution
```javascript
export const groupAnagrams = (strs) => {
    const map = new Map();

    for (const str of strs) {
        // Build 26-character frequency signature
        const count = new Array(26).fill(0);
        for (let i = 0; i < str.length; i++) {
            count[str.charCodeAt(i) - 97]++;
        }
        const key = count.join('#');

        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(str);
    }

    return Array.from(map.values());
};
```
- **Complexity**: Time: $O(N \cdot K)$ where $N$ is count and $K$ is max string length, Space: $O(N \cdot K)$.

---

### 7. Valid Parentheses with Types
- **File**: [`valid-parentheses-with-types.js`](./valid-parentheses-with-types.js)
- **Problem**: Given a string containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['`, and `']'`, determine if the input string is valid (brackets close in the correct order and same type).
- **Concept & Technique**: **Stack (LIFO Structure)**.
  - Map closing brackets to opening brackets: `{ ')': '(', '}': '{', ']': '[' }`.
  - Iterate through characters: if opening, push to stack; if closing, pop stack and verify it matches.
  - Return `true` if stack is empty at the end.

#### Reference Solution
```javascript
export const isValid = (s) => {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };

    for (const char of s) {
        if (char === '(' || char === '{' || char === '[') {
            stack.push(char);
        } else if (map[char]) {
            if (stack.pop() !== map[char]) {
                return false;
            }
        }
    }
    return stack.length === 0;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(N)$.

---

### 8. Daily Temperatures (Next Warmer Day)
- **File**: [`daily-temperatures.js`](./daily-temperatures.js)
- **Problem**: Given an array of integers `temperatures` representing daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i-th` day to get a warmer temperature. If no future day is warmer, `answer[i] == 0`.
- **Concept & Technique**: **Monotonic Decreasing Stack**.
  - Stack stores indices of temperatures in strictly decreasing order.
  - As we iterate with index `i`, while `temperatures[i] > temperatures[stack.top]`, pop the index `prevIndex` and calculate `answer[prevIndex] = i - prevIndex`.
  - Push current index `i` onto stack.

#### Reference Solution
```javascript
export const dailyTemperatures = (temperatures) => {
    const n = temperatures.length;
    const answer = new Array(n).fill(0);
    const stack = []; // stores indices

    for (let i = 0; i < n; i++) {
        while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
            const prevIndex = stack.pop();
            answer[prevIndex] = i - prevIndex;
        }
        stack.push(i);
    }
    return answer;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(N)$.

---

### 9. Merge Overlapping Intervals
- **File**: [`merge-intervals.js`](./merge-intervals.js)
- **Problem**: Given an array of intervals where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of non-overlapping intervals that cover all intervals in the input.
- **Concept & Technique**: **Sorting by Start Time + Linear Merge**.
  - Sort intervals ascending by start time: `intervals.sort((a, b) => a[0] - b[0])`.
  - Iterate through intervals: if `current[0] <= lastMerged[1]`, merge them by setting `lastMerged[1] = Math.max(lastMerged[1], current[1])`. Otherwise, append `current` as a new interval.

#### Reference Solution
```javascript
export const mergeIntervals = (intervals) => {
    if (intervals.length <= 1) return intervals;
    intervals.sort((a, b) => a[0] - b[0]);

    const merged = [intervals[0]];

    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const current = intervals[i];

        if (current[0] <= last[1]) {
            last[1] = Math.max(last[1], current[1]);
        } else {
            merged.push(current);
        }
    }
    return merged;
};
```
- **Complexity**: Time: $O(N \log N)$ (sorting), Space: $O(N)$.

---

### 10. Maximum Subarray Sum (Kadane's Algorithm)
- **File**: [`maximum-subarray-sum.js`](./maximum-subarray-sum.js)
- **Problem**: Given an integer array `nums`, find the subarray with the largest sum, and return its sum.
- **Concept & Technique**: **Kadane's Algorithm (Dynamic Programming / Greedy)**.
  - At each position `i`, decide: start a new subarray with `nums[i]`, or extend the current subarray: `currentSum = Math.max(nums[i], currentSum + nums[i])`.
  - Update `maxSum = Math.max(maxSum, currentSum)`.

#### Reference Solution
```javascript
export const maxSubArray = (nums) => {
    let currentSum = nums[0];
    let maxSum = nums[0];

    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(1)$.

---

### 11. Least Recently Used (LRU) Cache
- **File**: [`lru-cache.js`](./lru-cache.js)
- **Problem**: Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with `get(key)` and `put(key, value)` in strictly $O(1)$ average time.
- **Concept & Technique**: **Map or Hash Table + Doubly Linked List**.
  - In JavaScript, ES6 `Map` preserves insertion order. Re-inserting a key (`map.delete(key)` then `map.set(key, val)`) updates recency to newest in $O(1)$.
  - Alternatively, implement with a Doubly Linked List (`head` <-> `tail`) and `Map` to guarantee strict pointer-based $O(1)$ operations regardless of JS engine internals.

#### Reference Solution
```javascript
export class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        const val = this.cache.get(key);
        // Refresh recency
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // Evict least recently used (first key in Map iterator)
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, value);
    }
}
```
- **Complexity**: Time: $O(1)$ for both `get` and `put`, Space: $O(C)$ where $C$ is capacity.

---

### 12. Tree / DOM Level Order Traversal
- **File**: [`traverse-dom-tree-levels.js`](./traverse-dom-tree-levels.js)
- **Problem**: Given a tree root node (or a mock DOM node object with `tagName` / `value` and `children: []`), return the level order traversal of its nodes' values (i.e., from left to right, level by level).
- **Concept & Technique**: **Breadth-First Search (BFS) using a Queue**.
  - Enqueue the root node.
  - While queue is not empty, snapshot `levelSize = queue.length`.
  - Dequeue `levelSize` elements, collect values into a `currentLevel` array, and push their children to the queue.
  - Add `currentLevel` to the final `levels` array.

#### Reference Solution
```javascript
export const levelOrder = (root) => {
    if (!root) return [];
    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const levelSize = queue.length;
        const currentLevel = [];

        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            currentLevel.push(node.val !== undefined ? node.val : node.tagName);

            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    queue.push(child);
                }
            }
        }
        result.push(currentLevel);
    }
    return result;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(W)$ where $W$ is the maximum width of the tree.

---

### 13. Flatten Deeply Nested Array
- **File**: [`flatten-deep-nested-array.js`](./flatten-deep-nested-array.js)
- **Problem**: Given a multi-dimensional array with arbitrary nesting depth and an optional depth limit `n`, return a flattened version of the array without using `Array.prototype.flat()`.
- **Concept & Technique**: **Recursion / Depth-First Traversal or Explicit Stack**.
  - Iterate through elements. If an element is an array and depth remaining $> 0$, recursively flatten with `depth - 1` and push results. Otherwise, push element directly.

#### Reference Solution
```javascript
export const flattenArray = (arr, depth = Infinity) => {
    const result = [];

    const helper = (current, currentDepth) => {
        for (const item of current) {
            if (Array.isArray(item) && currentDepth > 0) {
                helper(item, currentDepth - 1);
            } else {
                result.push(item);
            }
        }
    };

    helper(arr, depth);
    return result;
};
```
- **Complexity**: Time: $O(N)$ total elements, Space: $O(D)$ recursion stack depth.

---

### 14. Find Duplicate Number (Floyd's Cycle Detection)
- **File**: [`find-duplicate-number.js`](./find-duplicate-number.js)
- **Problem**: Given an array of integers `nums` containing `n + 1` integers where each integer is in the range `[1, n]` inclusive. There is only one repeated number in `nums`, return this duplicate number without modifying the array and using only $O(1)$ extra space.
- **Concept & Technique**: **Fast and Slow Pointers (Tortoise and Hare)**.
  - Model the array as a linked list where `nums[i]` points to index `nums[i]`.
  - Phase 1: `slow = nums[slow]`, `fast = nums[nums[fast]]` until `slow === fast`.
  - Phase 2: Reset `slow = nums[0]`, advance both `slow` and `fast` one step at a time until they meet at the cycle entry (the duplicate value).

#### Reference Solution
```javascript
export const findDuplicate = (nums) => {
    let slow = nums[0];
    let fast = nums[0];

    // Phase 1: Detect cycle
    do {
        slow = nums[slow];
        fast = nums[nums[fast]];
    } while (slow !== fast);

    // Phase 2: Find cycle entrance
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }

    return slow;
};
```
- **Complexity**: Time: $O(N)$, Space: $O(1)$.

---

### 15. Debounce and Throttle
- **File**: [`debounce-and-throttle.js`](./debounce-and-throttle.js)
- **Problem**: Implement debounce with leading/immediate option and throttle wrappers preserving `this` and arguments.
- **Concept & Technique**: **Closures + Timer Management (`setTimeout` / timestamp delta)**.
  - Debounce: Clear any existing `timer` on each call. If `immediate` and no timer active, call immediately; otherwise reschedule trailing execution.
  - Throttle: Check elapsed time since `lastTime`. If $\ge limit$, run immediately and update `lastTime`; otherwise schedule a timeout for the remaining window.

#### Reference Solution
```javascript
export const debounce = (fn, delay, immediate = false) => {
    let timer = null;

    return function (...args) {
        const context = this;
        const callNow = immediate && !timer;

        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            if (!immediate) fn.apply(context, args);
        }, delay);

        if (callNow) fn.apply(context, args);
    };
};

export const throttle = (fn, limit) => {
    let lastTime = 0;
    let timer = null;

    return function (...args) {
        const context = this;
        const now = Date.now();

        if (now - lastTime >= limit) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            lastTime = now;
            fn.apply(context, args);
        } else if (!timer) {
            timer = setTimeout(() => {
                lastTime = Date.now();
                timer = null;
                fn.apply(context, args);
            }, limit - (now - lastTime));
        }
    };
};
```
- **Complexity**: Time: $O(1)$ per invocation, Space: $O(1)$.

---

### 16. Custom Promise.all Polyfill
- **File**: [`promise-all-polyfill.js`](./promise-all-polyfill.js)
- **Problem**: Implement `promiseAll(iterable)` returning a Promise that resolves when all input values resolve (in original index order) or rejects on first rejection.
- **Concept & Technique**: **Promise Constructor + Concurrency Counter**.
  - Wrap raw values via `Promise.resolve(item)` to handle primitives.
  - Maintain `completedCount` and `results = []`.
  - When `completedCount === items.length`, resolve outer promise.
  - Any `.catch()` immediately triggers `reject(error)`.

#### Reference Solution
```javascript
export const promiseAll = (iterable) => {
    return new Promise((resolve, reject) => {
        const items = Array.from(iterable);
        if (items.length === 0) return resolve([]);

        const results = new Array(items.length);
        let completed = 0;

        items.forEach((item, index) => {
            Promise.resolve(item)
                .then((value) => {
                    results[index] = value;
                    completed++;
                    if (completed === items.length) {
                        resolve(results);
                    }
                })
                .catch(reject);
        });
    });
};
```
- **Complexity**: Time: $O(N)$ where $N$ is count of promises, Space: $O(N)$ results array.

---

### 17. Deep Clone (With Circular References)
- **File**: [`deep-clone-with-circular-refs.js`](./deep-clone-with-circular-refs.js)
- **Problem**: Deep clone arbitrary objects/arrays including Date, RegExp, and circular self-references.
- **Concept & Technique**: **Recursive Traversal + `WeakMap` Visited Cache**.
  - Check primitives/null: return immediately.
  - If `seen.has(value)`, return cached clone reference to break cycle.
  - Handle `Date` (`new Date(value.getTime())`) and `RegExp` (`new RegExp(value.source, value.flags)`).
  - Create clone target based on `Array.isArray(value)` or `{}`.
  - Cache target in `seen.set(value, cloneTarget)`.
  - Recursively copy all own keys (`Reflect.ownKeys` or `Object.keys`).

#### Reference Solution
```javascript
export const deepClone = (value, seen = new WeakMap()) => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return new RegExp(value.source, value.flags);

    if (seen.has(value)) {
        return seen.get(value);
    }

    const clone = Array.isArray(value) ? [] : {};
    seen.set(value, clone);

    for (const key of Object.keys(value)) {
        clone[key] = deepClone(value[key], seen);
    }

    return clone;
};
```
- **Complexity**: Time: $O(N)$ properties visited, Space: $O(N)$ memory and recursion stack.

---

### 18. Spiral Matrix Traversal
- **File**: [`spiral-matrix.js`](./spiral-matrix.js)
- **Problem**: Traverse an $M \times N$ matrix in clockwise spiral order.
- **Concept & Technique**: **4-Boundary Wall Shrinking (`top`, `bottom`, `left`, `right`)**.
  - Traverse left to right along `top`, then `top++`.
  - Traverse top to bottom along `right`, then `right--`.
  - Traverse right to left along `bottom` (if `top <= bottom`), then `bottom--`.
  - Traverse bottom to top along `left` (if `left <= right`), then `left++`.

#### Reference Solution
```javascript
export const spiralOrder = (matrix) => {
    if (!matrix.length || !matrix[0].length) return [];
    const result = [];
    let top = 0;
    let bottom = matrix.length - 1;
    let left = 0;
    let right = matrix[0].length - 1;

    while (top <= bottom && left <= right) {
        for (let col = left; col <= right; col++) result.push(matrix[top][col]);
        top++;

        for (let row = top; row <= bottom; row++) result.push(matrix[row][right]);
        right--;

        if (top <= bottom) {
            for (let col = right; col >= left; col--) result.push(matrix[bottom][col]);
            bottom--;
        }

        if (left <= right) {
            for (let row = bottom; row >= top; row--) result.push(matrix[row][left]);
            left++;
        }
    }
    return result;
};
```
- **Complexity**: Time: $O(M \cdot N)$, Space: $O(1)$ auxiliary space.

---

### 19. Number of Islands
- **File**: [`number-of-islands.js`](./number-of-islands.js)
- **Problem**: Count the number of islands in a binary matrix where `'1'` is land and `'0'` is water.
- **Concept & Technique**: **Grid DFS / Flood Fill / Connected Components**.
  - Scan each cell `(r, c)`.
  - If `grid[r][c] === '1'`, increment island count and initiate DFS.
  - In DFS, mutate `grid[r][c] = '0'` (sink the land to avoid revisits) and explore all 4 cardinal directions.

#### Reference Solution
```javascript
export const numIslands = (grid) => {
    if (!grid || grid.length === 0) return 0;
    let islands = 0;
    const rows = grid.length;
    const cols = grid[0].length;

    const dfs = (r, c) => {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
        grid[r][c] = '0'; // mark visited
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    };

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                islands++;
                dfs(r, c);
            }
        }
    }
    return islands;
};
```
- **Complexity**: Time: $O(M \cdot N)$, Space: $O(M \cdot N)$ worst-case recursion stack (when grid is filled with land).

---

### 20. Search in Rotated Sorted Array
- **File**: [`search-rotated-sorted-array.js`](./search-rotated-sorted-array.js)
- **Problem**: Find target in a rotated ascending array in $O(\log N)$ time.
- **Concept & Technique**: **Modified Binary Search with Sorted Half Invariant**.
  - At least one half (`[left ... mid]` or `[mid ... right]`) is guaranteed to be sorted.
  - If left half is sorted (`nums[left] <= nums[mid]`):
    - If `nums[left] <= target && target < nums[mid]`, target lies in left half (`right = mid - 1`); else `left = mid + 1`.
  - Otherwise, right half is sorted:
    - If `nums[mid] < target && target <= nums[right]`, target lies in right half (`left = mid + 1`); else `right = mid - 1`.

#### Reference Solution
```javascript
export const search = (nums, target) => {
    let left = 0;
    let right = nums.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;

        // Check if left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        } else {
            // Right half is sorted
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
    }
    return -1;
};
```
- **Complexity**: Time: $O(\log N)$, Space: $O(1)$.

---

### 21. Subsets (Power Set)
- **File**: [`subsets-backtracking.js`](./subsets-backtracking.js)
- **Problem**: Return all possible subsets (the power set) of an array of unique integers.
- **Concept & Technique**: **Backtracking / Cascading**.
  - Base case: at each step, push current `[...currentSub]` to `result`.
  - Loop `i` from `start` to `nums.length - 1`:
    - Choose: `currentSub.push(nums[i])`
    - Explore: `backtrack(i + 1, currentSub)`
    - Un-choose: `currentSub.pop()`

#### Reference Solution
```javascript
export const subsets = (nums) => {
    const result = [];

    const backtrack = (start, current) => {
        result.push([...current]);

        for (let i = start; i < nums.length; i++) {
            current.push(nums[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    };

    backtrack(0, []);
    return result;
};
```
- **Complexity**: Time: $O(2^N \cdot N)$, Space: $O(N)$ recursion stack depth.

---

### 22. Event Emitter (Observer Pattern)
- **File**: [`event-emitter-pub-sub.js`](./event-emitter-pub-sub.js)
- **Problem**: Implement EventEmitter class with `on`, `emit`, `off`, and `once`.
- **Concept & Technique**: **Map of Event Name -> Set/Array of Listeners**.
  - `on`: store callback in `events.get(eventName)`.
  - `emit`: iterate over a copy of callbacks: `[...callbacks].forEach(cb => cb(...args))`.
  - `off`: delete specific callback.
  - `once`: wrap callback with a wrapper that calls `this.off` before running the callback.

#### Reference Solution
```javascript
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    on(eventName, listener) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        this.events.get(eventName).add(listener);

        return {
            unsubscribe: () => this.off(eventName, listener)
        };
    }

    emit(eventName, ...args) {
        if (!this.events.has(eventName)) return false;
        const listeners = Array.from(this.events.get(eventName));
        for (const listener of listeners) {
            listener(...args);
        }
        return true;
    }

    off(eventName, listener) {
        if (this.events.has(eventName)) {
            this.events.get(eventName).delete(listener);
            if (this.events.get(eventName).size === 0) {
                this.events.delete(eventName);
            }
        }
    }

    once(eventName, listener) {
        const wrapper = (...args) => {
            this.off(eventName, wrapper);
            listener(...args);
        };
        this.on(eventName, wrapper);
    }
}
```
- **Complexity**: Time: $O(1)$ add/remove, $O(K)$ emit where $K$ is number of listeners. Space: $O(E \cdot K)$.

---

### 23. Function Currying (Arbitrary Arity)
- **File**: [`curry-function.js`](./curry-function.js)
- **Problem**: Transform a function of $N$ arguments into a sequence of functions accepting one or more arguments until $N$ are collected.
- **Concept & Technique**: **Closures & `Function.prototype.length` Reflection**.
  - Inspect `fn.length` (the declared number of parameters).
  - Return a function `curried(...args)`:
    - If `args.length >= fn.length`, return `fn.apply(this, args)`.
    - Otherwise, return a function `(...nextArgs) => curried.apply(this, [...args, ...nextArgs])`.

#### Reference Solution
```javascript
export const curry = (fn) => {
    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        }
        return function (...nextArgs) {
            return curried.apply(this, args.concat(nextArgs));
        };
    };
};
```
- **Complexity**: Time: $O(1)$ overhead per call, Space: $O(K)$ closures created.

---

### 24. Async Task Runner (Concurrency Limit)
- **File**: [`async-task-runner-concurrency-limiter.js`](./async-task-runner-concurrency-limiter.js)
- **Problem**: Execute async tasks maintaining a hard cap on maximum simultaneous operations.
- **Concept & Technique**: **FIFO Task Queue + Active Worker Counter**.
  - Maintain `queue = []`, `activeCount = 0`, and `limit`.
  - When `push(task)` is called, return a Promise and append `{ task, resolve, reject }` to queue.
  - Call `runNext()`: while `activeCount < limit && queue.length > 0`, dequeue, increment `activeCount`, execute `task()`.
  - In `.finally()`, decrement `activeCount` and trigger `runNext()` to process the next queued task.

#### Reference Solution
```javascript
export class AsyncTaskRunner {
    constructor(limit) {
        this.limit = limit;
        this.activeCount = 0;
        this.queue = [];
    }

    push(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.runNext();
        });
    }

    runNext() {
        if (this.activeCount >= this.limit || this.queue.length === 0) {
            return;
        }

        const { task, resolve, reject } = this.queue.shift();
        this.activeCount++;

        task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.activeCount--;
                this.runNext();
            });
    }
}
```
- **Complexity**: Time: $O(1)$ enqueue and dequeue, Space: $O(Q)$ queued tasks.

