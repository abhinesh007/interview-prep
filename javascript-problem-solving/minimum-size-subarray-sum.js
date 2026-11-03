/**
 * =============================================================================
 * PROBLEM: Minimum Size Subarray Sum
 * =============================================================================
 * 
 * Problem Description:
 * Given an array of positive integers `nums` and a positive integer `target`, 
 * return the minimal length of a contiguous subarray `[nums[l], nums[l+1], ..., nums[r-1], nums[r]]` 
 * of which the sum is greater than or equal to `target`. 
 * If there is no such subarray, return 0 instead.
 * 
 * Constraints:
 * - 1 <= target <= 10^9
 * - 1 <= nums.length <= 10^5
 * - 1 <= nums[i] <= 10^4
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: target = 7, nums = [2, 3, 1, 2, 4, 3]
 *   Output: 2
 *   Explanation: The subarray [4, 3] has the minimal length under the problem constraint.
 * 
 * Example 2:
 *   Input: target = 4, nums = [1, 4, 4]
 *   Output: 1
 * 
 * Example 3:
 *   Input: target = 11, nums = [1, 1, 1, 1, 1, 1, 1, 1]
 *   Output: 0
 * =============================================================================
 */

export const minSubArrayLen = (target, nums) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(minSubArrayLen(7, [2, 3, 1, 2, 4, 3]));          // Expected: 2
// console.log(minSubArrayLen(4, [1, 4, 4]));                   // Expected: 1
// console.log(minSubArrayLen(11, [1, 1, 1, 1, 1, 1, 1, 1]));    // Expected: 0
