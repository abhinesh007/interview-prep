/**
 * =============================================================================
 * PROBLEM: Flatten Deeply Nested Array
 * =============================================================================
 * 
 * Problem Description:
 * Given a multi-dimensional array `arr` and an integer `depth`, return a 
 * flattened version of the array.
 * 
 * A multi-dimensional array is an array containing elements that may themselves 
 * be arrays.
 * 
 * Flattening an array means taking any nested array elements and replacing 
 * them with their individual items up to `depth` levels deep.
 * 
 * If `depth` is not provided, it should default to flattening completely (Infinity).
 * Note: Do NOT use the built-in `Array.prototype.flat()`.
 * 
 * Constraints:
 * - 0 <= count of numbers in arr <= 10^5
 * - 0 <= depth <= 1000
 * - -1000 <= element values <= 1000
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: arr = [1, 2, 3, [4, 5, 6], [7, 8, [9, 10, 11], 12], [13, 14, 15]], depth = 1
 *   Output: [1, 2, 3, 4, 5, 6, 7, 8, [9, 10, 11], 12, 13, 14, 15]
 * 
 * Example 2:
 *   Input: arr = [1, [2, [3, [4, [5]]]]], depth = 2
 *   Output: [1, 2, 3, [4, [5]]]
 * 
 * Example 3:
 *   Input: arr = [[1, 2], [3, [4, [5]]]], depth = Infinity
 *   Output: [1, 2, 3, 4, 5]
 * =============================================================================
 */

export const flattenArray = (arr, depth = Infinity) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(flattenArray([1, 2, 3, [4, 5, 6], [7, 8, [9, 10, 11], 12], [13, 14, 15]], 1));
// Expected: [1, 2, 3, 4, 5, 6, 7, 8, [9, 10, 11], 12, 13, 14, 15]
// console.log(flattenArray([1, [2, [3, [4, [5]]]]], 2));
// Expected: [1, 2, 3, [4, [5]]]
// console.log(flattenArray([[1, 2], [3, [4, [5]]]]));
// Expected: [1, 2, 3, 4, 5]
