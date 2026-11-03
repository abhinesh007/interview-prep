/**
 * =============================================================================
 * PROBLEM: Group Anagrams
 * =============================================================================
 * 
 * Problem Description:
 * Given an array of strings `strs`, group the anagrams together. 
 * You can return the answer in any order.
 * 
 * An anagram is a word or phrase formed by rearranging the letters of a 
 * different word or phrase, typically using all the original letters exactly once.
 * 
 * Constraints:
 * - 1 <= strs.length <= 10^4
 * - 0 <= strs[i].length <= 100
 * - strs[i] consists of lowercase English letters.
 * 
 * Examples:
 * 
 * Example 1:
 *   Input: strs = ["eat", "tea", "tan", "ate", "nat", "bat"]
 *   Output: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]
 * 
 * Example 2:
 *   Input: strs = [""]
 *   Output: [[""]]
 * 
 * Example 3:
 *   Input: strs = ["a"]
 *   Output: [["a"]]
 * =============================================================================
 */

export const groupAnagrams = (strs) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// console.log(groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]));
// Expected: [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]] (order of groups may vary)
// console.log(groupAnagrams([""]));
// Expected: [[""]]
// console.log(groupAnagrams(["a"]));
// Expected: [["a"]]
