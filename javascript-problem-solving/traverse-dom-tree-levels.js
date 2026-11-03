/**
 * =============================================================================
 * PROBLEM: Tree / DOM Node Level Order Traversal
 * =============================================================================
 * 
 * Problem Description:
 * Given a tree root node (or a mock DOM tree node with `val` or `tagName` 
 * and a `children` array of child nodes), return the level order traversal 
 * of its node values (i.e., grouped level-by-level from top to bottom, 
 * left to right).
 * 
 * Structure of a Node:
 * {
 *   val: 'div', // or string/number value
 *   children: [node1, node2, ...]
 * }
 * 
 * Examples:
 * 
 * Example 1:
 *   Tree:
 *            div
 *          /     \
 *        p        span
 *      /   \        \
 *     b     i        a
 * 
 *   Input: root node above
 *   Output: [
 *     ['div'],
 *     ['p', 'span'],
 *     ['b', 'i', 'a']
 *   ]
 * 
 * Example 2:
 *   Input: null
 *   Output: []
 * =============================================================================
 */

export const levelOrder = (root) => {
    // TODO: Implement your solution here
    throw new Error('Not implemented');
};

// --- Test Cases ---
// const mockDom = {
//   val: 'div',
//   children: [
//     { val: 'p', children: [{ val: 'b', children: [] }, { val: 'i', children: [] }] },
//     { val: 'span', children: [{ val: 'a', children: [] }] }
//   ]
// };
// console.log(levelOrder(mockDom));
// Expected: [['div'], ['p', 'span'], ['b', 'i', 'a']]
