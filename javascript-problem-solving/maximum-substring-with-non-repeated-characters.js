/**
 * =============================================================================
 * PROBLEM: Longest Substring Without Repeating Characters
 * =============================================================================
 * 
 * Problem Statement:
 * Given a string, find the longest continuous substring that contains all unique 
 * (non-repeating) characters, and return either the substring or its length.
 * 
 * Example:
 * Input:  "javascriptinterview"
 * Output: "vascript" (length: 8)
 * 
 * -----------------------------------------------------------------------------
 * ALGORITHM & TECHNIQUE: Sliding Window + Hash Map
 * -----------------------------------------------------------------------------
 * 1. Sliding Window (Dynamic Size):
 *    - Maintain a window [start ... end] of characters that currently contains no duplicates.
 *    - Expand the window by advancing the right pointer `end` one character at a time.
 * 
 * 2. Hash Map (Character -> Last Seen Index):
 *    - Store the most recent index where each character appeared: `seen.set(char, end)`.
 *    - When `char` at `end` was already seen AND its recorded index is >= `start`
 *      (meaning it falls inside our active window), a duplicate has occurred.
 *    - Instead of shifting `start` one-by-one, jump `start` directly to `seen.get(char) + 1`.
 * 
 * -----------------------------------------------------------------------------
 * HOW TO APPROACH & MAIN FOCUS:
 * -----------------------------------------------------------------------------
 * - Main Focus: Maintain the invariant that the window `[start, end]` has NO repeating characters.
 * - Key Catch: Check `seen.get(char) >= start`. If a character was seen earlier in the string
 *   but outside our current active window (before `start`), it does NOT count as a duplicate
 *   for the current window and shouldn't pull `start` backward.
 * - Complexity:
 *   - Time Complexity: O(n) — single pass where each character is visited once.
 *   - Space Complexity: O(min(n, m)) — where m is the character set size (stored in Map).
 * =============================================================================
 */

let str = 'javascriptinterview'; // vascript

export const longestSubString = () => {
    let maximumLength = 0;
    let start = 0;
    let longestStr = '';
    // Map to track the last seen 0-based index of each character: char -> index
    let seen = new Map();

    // Expand the window by moving the 'end' pointer forward
    for (let end = 0; end < str.length; end++) {
        const char = str[end];

        // If character was seen before AND is within the current window [start, end]
        if (seen.has(char) && seen.get(char) >= start) {
            // Jump the left pointer past the previous occurrence of this character
            start = seen.get(char) + 1;
        }

        // Record or update the latest index of the current character
        seen.set(char, end);

        // Current valid window length
        const currentLength = end - start + 1;

        // Update maximum length and substring if a new record is found
        if (maximumLength < currentLength) {
            maximumLength = currentLength;
            longestStr = str.substring(start, end + 1);
        }
    }

    return longestStr;
}

console.log(longestSubString());