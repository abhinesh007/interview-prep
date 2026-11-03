/**
 * =============================================================================
 * PROBLEM: Daily Temperatures (Next Warmer Day)
 * =============================================================================
 * 
 * Problem Description:
 * Given an array of integers `temperatures` represents the daily temperatures, 
 * return an array `answer` such that `answer[i]` is the number of days you have 
 * to wait after the `i-th` day to get a warmer temperature. 
 * 
 * If there is no future day for which this is possible, keep `answer[i] == 0` instead.
 * 
 * Constraints:
 * - 1 <= temperatures.length <= 10^5
 * - 30 <= temperatures[i] <= 100
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: temperatures = [73, 74, 75, 71, 69, 72, 76, 73]
 *   Output: [1, 1, 4, 2, 1, 1, 0, 0]
 * 
 * Example 2:
 *   Input: temperatures = [30, 40, 50, 60]
 *   Output: [1, 1, 1, 0]
 * 
 * Example 3:
 *   Input: temperatures = [30, 60, 90]
 *   Output: [1, 1, 0]
 * =============================================================================
 */

export const dailyTemperatures = (temperatures) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])); // Expected: [1, 1, 4, 2, 1, 1, 0, 0]
// console.log(dailyTemperatures([30, 40, 50, 60]));                 // Expected: [1, 1, 1, 0]
// console.log(dailyTemperatures([30, 60, 90]));                     // Expected: [1, 1, 0]
