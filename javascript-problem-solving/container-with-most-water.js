/**
 * =============================================================================
 * PROBLEM: Container With Most Water
 * =============================================================================
 * 
 * Problem Description:
 * You are given an integer array `height` of length `n`. There are `n` vertical 
 * lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and 
 * `(i, height[i])`.
 * 
 * Find two lines that together with the x-axis form a container, such that the 
 * container contains the most water.
 * 
 * Return the maximum amount of water a container can store.
 * Notice that you may not slant the container.
 * 
 * Constraints:
 * - n == height.length
 * - 2 <= n <= 10^5
 * - 0 <= height[i] <= 10^4
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
 *   Output: 49
 *   Explanation: The lines are at indices 1 and 8 with heights 8 and 7.
 *     Distance = 8 - 1 = 7.
 *     Height = min(8, 7) = 7.
 *     Area = 7 * 7 = 49.
 * 
 * Example 2:
 *   Input: height = [1, 1]
 *   Output: 1
 * =============================================================================
 */

export const maxArea = (height) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])); // Expected: 49
// console.log(maxArea([1, 1]));                      // Expected: 1
