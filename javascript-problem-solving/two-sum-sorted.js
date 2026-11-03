/**
 * =============================================================================
 * PROBLEM: Two Sum (Input Array Is Sorted)
 * =============================================================================
 * 
 * Problem Description:
 * Given a 1-indexed array of integers `numbers` that is already sorted in 
 * non-decreasing order, find two numbers such that they add up to a specific 
 * `target` number.
 * 
 * Let these two numbers be `numbers[index1]` and `numbers[index2]` 
 * where 1 <= index1 < index2 <= numbers.length.
 * 
 * Return the indices of the two numbers, `[index1, index2]`, as an integer 
 * array of length 2.
 * 
 * Constraints:
 * - 2 <= numbers.length <= 3 * 10^4
 * - -1000 <= numbers[i] <= 1000
 * - numbers is sorted in non-decreasing order.
 * - -1000 <= target <= 1000
 * - The tests are generated such that there is exactly one solution.
 * - You may not use the same element twice.
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: numbers = [2, 7, 11, 15], target = 9
 *   Output: [1, 2]
 *   Explanation: The sum of 2 and 7 is 9. Therefore, index1 = 1, index2 = 2. We return [1, 2].
 * 
 * Example 2:
 *   Input: numbers = [2, 3, 4], target = 6
 *   Output: [1, 3]
 *   Explanation: The sum of 2 and 4 is 6. Therefore, index1 = 1, index2 = 3. We return [1, 3].
 * 
 * Example 3:
 *   Input: numbers = [-1, 0], target = -1
 *   Output: [1, 2]
 * =============================================================================
 */

export const twoSumSorted = (numbers, target) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(twoSumSorted([2, 7, 11, 15], 9)); // Expected: [1, 2]
// console.log(twoSumSorted([2, 3, 4], 6));      // Expected: [1, 3]
// console.log(twoSumSorted([-1, 0], -1));       // Expected: [1, 2]
