import type { ProblemDetail, TopicCount } from "@/types/contracts/coding";

export const MOCK_ALL_CODING_PROBLEMS: ProblemDetail[] = [
  // 10 Easy Problems
  {
    id: "coding-easy-1",
    slug: "two-sum",
    number: 1,
    title: "Two Sum",
    difficulty: "easy",
    topics: ["Array", "Hash Table"],
    descriptionMd: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "nums[1] + nums[2] == 6, so we return [1, 2].",
      },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraintsMd: `- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- **Only one valid answer exists.**`,
    functionName: "twoSum",
    params: [
      { name: "nums", type: "list_int" },
      { name: "target", type: "int" },
    ],
    returnType: "list_int",
    starterCode: {
      python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[2, 7, 11, 15], 9], expected: [0, 1], isExample: true },
      { inputArgs: [[3, 2, 4], 6], expected: [1, 2], isExample: true },
      { inputArgs: [[3, 3], 6], expected: [0, 1], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: One-Pass Hash Table

While iterating through the array, we check if \`target - num\` exists in our hash map.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(N)$`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-2",
    slug: "valid-parentheses",
    number: 2,
    title: "Valid Parentheses",
    difficulty: "easy",
    topics: ["Stack", "String"],
    descriptionMd: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.`,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraintsMd: `- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'\`.`,
    functionName: "isValid",
    params: [{ name: "s", type: "string" }],
    returnType: "boolean",
    starterCode: {
      python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
      javascript: "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["()"], expected: true, isExample: true },
      { inputArgs: ["()[]{}"], expected: true, isExample: true },
      { inputArgs: ["(]"], expected: false, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Stack matching

Push open brackets to stack and pop when corresponding closing bracket is found.`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-3",
    slug: "merge-two-sorted-lists",
    number: 3,
    title: "Merge Two Sorted Lists",
    difficulty: "easy",
    topics: ["Linked List", "Recursion"],
    descriptionMd: `You are given the heads of two sorted linked lists \`list1\` and \`list2\`. Merge the two lists into one **sorted** list and return the head.`,
    examples: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", output: "[1,1,2,3,4,4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
    ],
    constraintsMd: `- The number of nodes in both lists is in range \`[0, 50]\`.
- \`-100 <= Node.val <= 100\``,
    functionName: "mergeTwoLists",
    params: [
      { name: "list1", type: "list_node" },
      { name: "list2", type: "list_node" },
    ],
    returnType: "list_node",
    starterCode: {
      python: "class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      javascript: "var mergeTwoLists = function(list1, list2) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4], isExample: true },
      { inputArgs: [[], []], expected: [], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Iterative with Sentinel Dummy Node`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-4",
    slug: "best-time-to-buy-and-sell-stock",
    number: 4,
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
    topics: ["Array", "Dynamic Programming"],
    descriptionMd: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day. Return the maximum profit you can achieve.`,
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 2 and sell on day 5 (profit = 6 - 1 = 5)." },
      { input: "prices = [7,6,4,3,1]", output: "0" },
    ],
    constraintsMd: `- \`1 <= prices.length <= 10^5\`
- \`0 <= prices[i] <= 10^4\``,
    functionName: "maxProfit",
    params: [{ name: "prices", type: "list_int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass",
      javascript: "var maxProfit = function(prices) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[7, 1, 5, 3, 6, 4]], expected: 5, isExample: true },
      { inputArgs: [[7, 6, 4, 3, 1]], expected: 0, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Single Pass Tracking Min Price`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-5",
    slug: "valid-anagram",
    number: 5,
    title: "Valid Anagram",
    difficulty: "easy",
    topics: ["Hash Table", "String", "Sorting"],
    descriptionMd: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true" },
      { input: 's = "rat", t = "car"', output: "false" },
    ],
    constraintsMd: `- \`1 <= s.length, t.length <= 5 * 10^4\`
- \`s\` and \`t\` consist of lowercase English letters.`,
    functionName: "isAnagram",
    params: [
      { name: "s", type: "string" },
      { name: "t", type: "string" },
    ],
    returnType: "boolean",
    starterCode: {
      python: "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        pass",
      javascript: "var isAnagram = function(s, t) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["anagram", "nagaram"], expected: true, isExample: true },
      { inputArgs: ["rat", "car"], expected: false, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Frequency Counter Table`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-6",
    slug: "maximum-subarray",
    number: 6,
    title: "Maximum Subarray",
    difficulty: "easy",
    topics: ["Array", "Dynamic Programming", "Divide and Conquer"],
    descriptionMd: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1]", output: "1" },
    ],
    constraintsMd: `- \`1 <= nums.length <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\``,
    functionName: "maxSubArray",
    params: [{ name: "nums", type: "list_int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        pass",
      javascript: "var maxSubArray = function(nums) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, isExample: true },
      { inputArgs: [[1]], expected: 1, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Kadane's Algorithm ($O(N)$ Time)`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-7",
    slug: "climbing-stairs",
    number: 7,
    title: "Climbing Stairs",
    difficulty: "easy",
    topics: ["Dynamic Programming", "Math", "Memoization"],
    descriptionMd: `You are climbing a staircase. It takes \`n\` steps to reach the top. Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      { input: "n = 2", output: "2", explanation: "1. 1 step + 1 step\n2. 2 steps" },
      { input: "n = 3", output: "3" },
    ],
    constraintsMd: `- \`1 <= n <= 45\``,
    functionName: "climbStairs",
    params: [{ name: "n", type: "int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
      javascript: "var climbStairs = function(n) {\n    \n};",
    },
    testCases: [
      { inputArgs: [2], expected: 2, isExample: true },
      { inputArgs: [3], expected: 3, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Fibonacci State Transition`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-8",
    slug: "binary-search",
    number: 8,
    title: "Binary Search",
    difficulty: "easy",
    topics: ["Binary Search", "Array"],
    descriptionMd: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. Return its index or \`-1\`.`,
    examples: [
      { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
      { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" },
    ],
    constraintsMd: `- \`1 <= nums.length <= 10^4\`
- \`-10^4 < nums[i], target < 10^4\`
- All the integers in \`nums\` are **unique**.`,
    functionName: "search",
    params: [
      { name: "nums", type: "list_int" },
      { name: "target", type: "int" },
    ],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      javascript: "var search = function(nums, target) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[-1, 0, 3, 5, 9, 12], 9], expected: 4, isExample: true },
      { inputArgs: [[-1, 0, 3, 5, 9, 12], 2], expected: -1, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Classic Binary Search ($O(\\log N)$)`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-9",
    slug: "invert-binary-tree",
    number: 9,
    title: "Invert Binary Tree",
    difficulty: "easy",
    topics: ["Tree", "DFS", "BFS"],
    descriptionMd: `Given the \`root\` of a binary tree, invert the tree, and return its root.`,
    examples: [
      { input: "root = [4,2,7,1,3,6,9]", output: "[4,7,2,9,6,3,1]" },
      { input: "root = [2,1,3]", output: "[2,3,1]" },
      { input: "root = []", output: "[]" },
    ],
    constraintsMd: `- The number of nodes in the tree is in range \`[0, 100]\`.
- \`-100 <= Node.val <= 100\``,
    functionName: "invertTree",
    params: [{ name: "root", type: "tree_node" }],
    returnType: "tree_node",
    starterCode: {
      python: "class Solution:\n    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:\n        pass",
      javascript: "var invertTree = function(root) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1], isExample: true },
      { inputArgs: [[2, 1, 3]], expected: [2, 3, 1], isExample: true },
      { inputArgs: [[]], expected: [], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Recursive DFS Swap`,
    userStatus: "todo",
  },
  {
    id: "coding-easy-10",
    slug: "lowest-common-ancestor-of-a-bst",
    number: 10,
    title: "Lowest Common Ancestor of a Binary Search Tree",
    difficulty: "easy",
    topics: ["Tree", "BST", "DFS"],
    descriptionMd: `Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.`,
    examples: [
      { input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8", output: "6" },
      { input: "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4", output: "2" },
    ],
    constraintsMd: `- The number of nodes is in range \`[2, 10^5]\`.
- \`-10^9 <= Node.val <= 10^9\`
- All \`Node.val\` are **unique**.`,
    functionName: "lowestCommonAncestor",
    params: [
      { name: "root", type: "tree_node" },
      { name: "p", type: "int" },
      { name: "q", type: "int" },
    ],
    returnType: "tree_node",
    starterCode: {
      python: "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        pass",
      javascript: "var lowestCommonAncestor = function(root, p, q) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], expected: 6, isExample: true },
      { inputArgs: [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], expected: 2, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: BST Traversal`,
    userStatus: "todo",
  },

  // 10 Medium Problems
  {
    id: "coding-med-11",
    slug: "longest-substring-without-repeating-characters",
    number: 11,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    topics: ["Hash Table", "String", "Sliding Window"],
    descriptionMd: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: "1" },
      { input: 's = "pwwkew"', output: "3" },
    ],
    constraintsMd: `- \`0 <= s.length <= 5 * 10^4\``,
    functionName: "lengthOfLongestSubstring",
    params: [{ name: "s", type: "string" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass",
      javascript: "var lengthOfLongestSubstring = function(s) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["abcabcbb"], expected: 3, isExample: true },
      { inputArgs: ["bbbbb"], expected: 1, isExample: true },
      { inputArgs: ["pwwkew"], expected: 3, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Sliding Window with Hash Map`,
    userStatus: "todo",
  },
  {
    id: "coding-med-12",
    slug: "container-with-most-water",
    number: 12,
    title: "Container With Most Water",
    difficulty: "medium",
    topics: ["Array", "Two Pointers", "Greedy"],
    descriptionMd: `You are given an integer array \`height\` of length \`n\`. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.`,
    examples: [
      { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
      { input: "height = [1,1]", output: "1" },
    ],
    constraintsMd: `- \`n == height.length\`
- \`2 <= n <= 10^5\`
- \`0 <= height[i] <= 10^4\``,
    functionName: "maxArea",
    params: [{ name: "height", type: "list_int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        pass",
      javascript: "var maxArea = function(height) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49, isExample: true },
      { inputArgs: [[1, 1]], expected: 1, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Two Pointers Shrinking Window`,
    userStatus: "todo",
  },
  {
    id: "coding-med-13",
    slug: "3sum",
    number: 13,
    title: "3Sum",
    difficulty: "medium",
    topics: ["Array", "Two Pointers", "Sorting"],
    descriptionMd: `Given an integer array nums, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.`,
    examples: [
      { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
      { input: "nums = [0,1,1]", output: "[]" },
    ],
    constraintsMd: `- \`3 <= nums.length <= 3000\`
- \`-10^5 <= nums[i] <= 10^5\``,
    functionName: "threeSum",
    params: [{ name: "nums", type: "list_int" }],
    returnType: "list_list_int",
    starterCode: {
      python: "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
      javascript: "var threeSum = function(nums) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[-1, 0, 1, 2, -1, -4]], expected: [[-1, -1, 2], [-1, 0, 1]], isExample: true },
      { inputArgs: [[0, 1, 1]], expected: [], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Sort + Two Pointers`,
    userStatus: "todo",
  },
  {
    id: "coding-med-14",
    slug: "product-of-array-except-self",
    number: 14,
    title: "Product of Array Except Self",
    difficulty: "medium",
    topics: ["Array", "Prefix Sum"],
    descriptionMd: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.`,
    examples: [
      { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
    ],
    constraintsMd: `- \`2 <= nums.length <= 10^5\`
- \`-30 <= nums[i] <= 30\``,
    functionName: "productExceptSelf",
    params: [{ name: "nums", type: "list_int" }],
    returnType: "list_int",
    starterCode: {
      python: "class Solution:\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\n        pass",
      javascript: "var productExceptSelf = function(nums) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 2, 3, 4]], expected: [24, 12, 8, 6], isExample: true },
      { inputArgs: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Prefix and Suffix Products`,
    userStatus: "todo",
  },
  {
    id: "coding-med-15",
    slug: "group-anagrams",
    number: 15,
    title: "Group Anagrams",
    difficulty: "medium",
    topics: ["Array", "Hash Table", "String", "Sorting"],
    descriptionMd: `Given an array of strings \`strs\`, group the **anagrams** together. You can return the answer in **any order**.`,
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' },
    ],
    constraintsMd: `- \`1 <= strs.length <= 10^4\`
- \`0 <= strs[i].length <= 100\``,
    functionName: "groupAnagrams",
    params: [{ name: "strs", type: "list_string" }],
    returnType: "list_list_string",
    starterCode: {
      python: "class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        pass",
      javascript: "var groupAnagrams = function(strs) {\n    \n};",
    },
    testCases: [
      { inputArgs: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]], isExample: true },
      { inputArgs: [[""]], expected: [[""]], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Categorize by Sorted String or Character Count`,
    userStatus: "todo",
  },
  {
    id: "coding-med-16",
    slug: "rotate-image",
    number: 16,
    title: "Rotate Image",
    difficulty: "medium",
    topics: ["Array", "Math", "Matrix"],
    descriptionMd: `You are given an \`n x n\` 2D \`matrix\` representing an image, rotate the image by **90 degrees (clockwise)** in-place.`,
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[[7,4,1],[8,5,2],[9,6,3]]" },
    ],
    constraintsMd: `- \`n == matrix.length == matrix[i].length\`
- \`1 <= n <= 20\``,
    functionName: "rotate",
    params: [{ name: "matrix", type: "list_list_int" }],
    returnType: "list_list_int",
    returnIndex: 0,
    starterCode: {
      python: "class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        \"\"\"\n        Do not return anything, modify matrix in-place instead.\n        \"\"\"\n        pass",
      javascript: "var rotate = function(matrix) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Transpose then Reverse Rows`,
    userStatus: "todo",
  },
  {
    id: "coding-med-17",
    slug: "add-two-numbers",
    number: 17,
    title: "Add Two Numbers",
    difficulty: "medium",
    topics: ["Linked List", "Math", "Recursion"],
    descriptionMd: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in **reverse order**. Add the two numbers and return the sum as a linked list.`,
    examples: [
      { input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]", explanation: "342 + 465 = 807." },
    ],
    constraintsMd: `- The number of nodes in each linked list is in range \`[1, 100]\`.
- \`0 <= Node.val <= 9\``,
    functionName: "addTwoNumbers",
    params: [
      { name: "l1", type: "list_node" },
      { name: "l2", type: "list_node" },
    ],
    returnType: "list_node",
    starterCode: {
      python: "class Solution:\n    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      javascript: "var addTwoNumbers = function(l1, l2) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[2, 4, 3], [5, 6, 4]], expected: [7, 0, 8], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Elementary Addition with Carry Pointer`,
    userStatus: "todo",
  },
  {
    id: "coding-med-18",
    slug: "number-of-islands",
    number: 18,
    title: "Number of Islands",
    difficulty: "medium",
    topics: ["Array", "DFS", "BFS", "Matrix", "Graph"],
    descriptionMd: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.`,
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: "1" },
    ],
    constraintsMd: `- \`m == grid.length\`
- \`n == grid[i].length\`
- \`1 <= m, n <= 300\``,
    functionName: "numIslands",
    params: [{ name: "grid", type: "list_list_string" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def numIslands(self, grid: List[List[str]]) -> int:\n        pass",
      javascript: "var numIslands = function(grid) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[["1", "1", "1", "1", "0"], ["1", "1", "0", "1", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "0", "0", "0"]]], expected: 1, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: DFS / BFS Flood Fill`,
    userStatus: "todo",
  },
  {
    id: "coding-med-19",
    slug: "coin-change",
    number: 19,
    title: "Coin Change",
    difficulty: "medium",
    topics: ["Array", "Dynamic Programming", "BFS"],
    descriptionMd: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money. Return the fewest number of coins that you need to make up that amount.`,
    examples: [
      { input: "coins = [1,2,5], amount = 11", output: "3", explanation: "11 = 5 + 5 + 1" },
      { input: "coins = [2], amount = 3", output: "-1" },
    ],
    constraintsMd: `- \`1 <= coins.length <= 12\`
- \`1 <= coins[i] <= 2^31 - 1\`
- \`0 <= amount <= 10^4\``,
    functionName: "coinChange",
    params: [
      { name: "coins", type: "list_int" },
      { name: "amount", type: "int" },
    ],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass",
      javascript: "var coinChange = function(coins, amount) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 2, 5], 11], expected: 3, isExample: true },
      { inputArgs: [[2], 3], expected: -1, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Bottom-up Dynamic Programming`,
    userStatus: "todo",
  },
  {
    id: "coding-med-20",
    slug: "top-k-frequent-elements",
    number: 20,
    title: "Top K Frequent Elements",
    difficulty: "medium",
    topics: ["Array", "Hash Table", "Divide and Conquer", "Sorting", "Heap", "Bucket Sort"],
    descriptionMd: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in **any order**.`,
    examples: [
      { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
      { input: "nums = [1], k = 1", output: "[1]" },
    ],
    constraintsMd: `- \`1 <= nums.length <= 10^5\`
- \`-10^4 <= nums[i] <= 10^4\`
- \`k\` is in the range \`[1, the number of unique elements in the array]\`.`,
    functionName: "topKFrequent",
    params: [
      { name: "nums", type: "list_int" },
      { name: "k", type: "int" },
    ],
    returnType: "list_int",
    starterCode: {
      python: "class Solution:\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n        pass",
      javascript: "var topKFrequent = function(nums, k) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2], isExample: true },
      { inputArgs: [[1], 1], expected: [1], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Bucket Sort / Min-Heap`,
    userStatus: "todo",
  },

  // 10 Hard Problems
  {
    id: "coding-hard-21",
    slug: "median-of-two-sorted-arrays",
    number: 21,
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    topics: ["Binary Search", "Array", "Divide and Conquer"],
    descriptionMd: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the **median** of the two sorted arrays in $O(\\log(m+n))$.`,
    examples: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.00000" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.50000" },
    ],
    constraintsMd: `- \`0 <= m, n <= 1000\`
- \`1 <= m + n <= 2000\``,
    functionName: "findMedianSortedArrays",
    params: [
      { name: "nums1", type: "list_int" },
      { name: "nums2", type: "list_int" },
    ],
    returnType: "float",
    starterCode: {
      python: "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        pass",
      javascript: "var findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 3], [2]], expected: 2.0, isExample: true },
      { inputArgs: [[1, 2], [3, 4]], expected: 2.5, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Binary Search Partitioning`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-22",
    slug: "trapping-rain-water",
    number: 22,
    title: "Trapping Rain Water",
    difficulty: "hard",
    topics: ["Two Pointers", "Stack", "Array", "Dynamic Programming"],
    descriptionMd: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
    examples: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraintsMd: `- \`n == height.length\`
- \`1 <= n <= 2 * 10^4\`
- \`0 <= height[i] <= 10^5\``,
    functionName: "trap",
    params: [{ name: "height", type: "list_int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass",
      javascript: "var trap = function(height) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6, isExample: true },
      { inputArgs: [[4, 2, 0, 3, 2, 5]], expected: 9, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Two Pointers`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-23",
    slug: "merge-k-sorted-lists",
    number: 23,
    title: "Merge k Sorted Lists",
    difficulty: "hard",
    topics: ["Heap", "Linked List", "Divide and Conquer"],
    descriptionMd: `You are given an array of \`k\` linked-lists \`lists\`, each linked-list is sorted in ascending order. Merge all into one sorted linked-list.`,
    examples: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
    ],
    constraintsMd: `- \`k == lists.length\`
- \`0 <= k <= 10^4\``,
    functionName: "mergeKLists",
    params: [{ name: "lists", type: "list_list_node_nullable" }],
    returnType: "list_node",
    starterCode: {
      python: "class Solution:\n    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n        pass",
      javascript: "var mergeKLists = function(lists) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Priority Queue / Divide and Conquer`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-24",
    slug: "longest-increasing-path-in-a-matrix",
    number: 24,
    title: "Longest Increasing Path in a Matrix",
    difficulty: "hard",
    topics: ["DFS", "Memoization", "Matrix", "Graph"],
    descriptionMd: `Given an \`m x n\` integers matrix, return the length of the longest increasing path in \`matrix\`.`,
    examples: [
      { input: "matrix = [[9,9,4],[6,6,8],[2,1,1]]", output: "4", explanation: "Longest path is [1, 2, 6, 9]." },
    ],
    constraintsMd: `- \`m == matrix.length\`
- \`n == matrix[i].length\`
- \`1 <= m, n <= 200\``,
    functionName: "longestIncreasingPath",
    params: [{ name: "matrix", type: "list_list_int" }],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:\n        pass",
      javascript: "var longestIncreasingPath = function(matrix) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], expected: 4, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: DFS with Memoization`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-25",
    slug: "edit-distance",
    number: 25,
    title: "Edit Distance",
    difficulty: "hard",
    topics: ["Dynamic Programming", "String"],
    descriptionMd: `Given two strings \`word1\` and \`word2\`, return the minimum number of operations required to convert \`word1\` to \`word2\`.`,
    examples: [
      { input: 'word1 = "horse", word2 = "ros"', output: "3" },
    ],
    constraintsMd: `- \`0 <= word1.length, word2.length <= 500\``,
    functionName: "minDistance",
    params: [
      { name: "word1", type: "string" },
      { name: "word2", type: "string" },
    ],
    returnType: "int",
    starterCode: {
      python: "class Solution:\n    def minDistance(self, word1: str, word2: str) -> int:\n        pass",
      javascript: "var minDistance = function(word1, word2) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["horse", "ros"], expected: 3, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: 2D Dynamic Programming (Levenshtein)`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-26",
    slug: "serialize-and-deserialize-binary-tree",
    number: 26,
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "hard",
    topics: ["Tree", "BFS", "Design", "String"],
    descriptionMd: `Design an algorithm to serialize and deserialize a binary tree.`,
    examples: [
      { input: "root = [1,2,3,null,null,4,5]", output: "[1,2,3,null,null,4,5]" },
    ],
    constraintsMd: `- Number of nodes in range \`[0, 10^4]\`.`,
    functionName: "serialize",
    params: [{ name: "root", type: "tree_node" }],
    returnType: "tree_node",
    starterCode: {
      python: "class Codec:\n    def serialize(self, root):\n        pass\n    def deserialize(self, data):\n        pass",
      javascript: "var serialize = function(root) {};\nvar deserialize = function(data) {};",
    },
    testCases: [
      { inputArgs: [[1, 2, 3, null, null, 4, 5]], expected: [1, 2, 3, null, null, 4, 5], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Preorder / BFS Serialization`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-27",
    slug: "sliding-window-maximum",
    number: 27,
    title: "Sliding Window Maximum",
    difficulty: "hard",
    topics: ["Monotonic Deque", "Sliding Window", "Queue", "Array"],
    descriptionMd: `You are given an array of integers \`nums\`, there is a sliding window of size \`k\` moving from left to right. Return the max sliding window.`,
    examples: [
      { input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", output: "[3,3,5,5,6,7]" },
    ],
    constraintsMd: `- \`1 <= nums.length <= 10^5\`
- \`1 <= k <= nums.length\``,
    functionName: "maxSlidingWindow",
    params: [
      { name: "nums", type: "list_int" },
      { name: "k", type: "int" },
    ],
    returnType: "list_int",
    starterCode: {
      python: "class Solution:\n    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n        pass",
      javascript: "var maxSlidingWindow = function(nums, k) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[1, 3, -1, -3, 5, 3, 6, 7], 3], expected: [3, 3, 5, 5, 6, 7], isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Monotonically Decreasing Deque`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-28",
    slug: "minimum-window-substring",
    number: 28,
    title: "Minimum Window Substring",
    difficulty: "hard",
    topics: ["Sliding Window", "Hash Table", "String"],
    descriptionMd: `Given two strings \`s\` and \`t\`, return the **minimum window substring** of \`s\` such that every character in \`t\` is included in the window.`,
    examples: [
      { input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"' },
      { input: 's = "a", t = "a"', output: '"a"' },
    ],
    constraintsMd: `- \`1 <= s.length, t.length <= 10^5\``,
    functionName: "minWindow",
    params: [
      { name: "s", type: "string" },
      { name: "t", type: "string" },
    ],
    returnType: "string",
    starterCode: {
      python: "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        pass",
      javascript: "var minWindow = function(s, t) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["ADOBECODEBANC", "ABC"], expected: "BANC", isExample: true },
      { inputArgs: ["a", "a"], expected: "a", isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: Sliding Window with Character Counts`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-29",
    slug: "word-search-ii",
    number: 29,
    title: "Word Search II",
    difficulty: "hard",
    topics: ["Trie", "Backtracking", "Matrix", "DFS"],
    descriptionMd: `Given an \`m x n\` \`board\` of characters and a list of strings \`words\`, return all words on the board.`,
    examples: [
      { input: 'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]', output: '["eat","oath"]' },
    ],
    constraintsMd: `- \`1 <= m, n <= 12\``,
    functionName: "findWords",
    params: [
      { name: "board", type: "list_list_string" },
      { name: "words", type: "list_string" },
    ],
    returnType: "list_string",
    starterCode: {
      python: "class Solution:\n    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n        pass",
      javascript: "var findWords = function(board, words) {\n    \n};",
    },
    testCases: [
      { inputArgs: [[["o", "a", "a", "n"], ["e", "t", "a", "e"], ["i", "h", "k", "r"], ["i", "f", "l", "v"]], ["oath", "pea", "eat", "rain"]], expected: ["eat", "oath"], isExample: true },
    ],
    timeLimitMs: 3000,
    editorialMd: `### Approach: Trie + Backtracking DFS`,
    userStatus: "todo",
  },
  {
    id: "coding-hard-30",
    slug: "regular-expression-matching",
    number: 30,
    title: "Regular Expression Matching",
    difficulty: "hard",
    topics: ["Dynamic Programming", "Recursion", "String"],
    descriptionMd: `Given an input string \`s\` and a pattern \`p\`, implement regular expression matching with support for \`'.'\` and \`'*'\`.`,
    examples: [
      { input: 's = "aa", p = "a"', output: "false" },
      { input: 's = "aa", p = "a*"', output: "true" },
      { input: 's = "ab", p = ".*"', output: "true" },
    ],
    constraintsMd: `- \`1 <= s.length <= 20\`
- \`1 <= p.length <= 20\``,
    functionName: "isMatch",
    params: [
      { name: "s", type: "string" },
      { name: "p", type: "string" },
    ],
    returnType: "boolean",
    starterCode: {
      python: "class Solution:\n    def isMatch(self, s: str, p: str) -> bool:\n        pass",
      javascript: "var isMatch = function(s, p) {\n    \n};",
    },
    testCases: [
      { inputArgs: ["aa", "a"], expected: false, isExample: true },
      { inputArgs: ["aa", "a*"], expected: true, isExample: true },
      { inputArgs: ["ab", ".*"], expected: true, isExample: true },
    ],
    timeLimitMs: 2000,
    editorialMd: `### Approach: 2D Dynamic Programming`,
    userStatus: "todo",
  },
];

export const MOCK_TOPIC_COUNTS: TopicCount[] = [
  { name: "Array", count: 12 },
  { name: "Dynamic Programming", count: 8 },
  { name: "String", count: 7 },
  { name: "Hash Table", count: 6 },
  { name: "Two Pointers", count: 5 },
  { name: "Tree", count: 4 },
  { name: "DFS", count: 4 },
  { name: "Divide and Conquer", count: 4 },
  { name: "Linked List", count: 3 },
  { name: "Binary Search", count: 3 },
  { name: "Matrix", count: 3 },
  { name: "Stack", count: 2 },
  { name: "Heap", count: 2 },
  { name: "Sliding Window", count: 2 },
  { name: "Recursion", count: 2 },
  { name: "BST", count: 1 },
  { name: "Monotonic Deque", count: 1 },
  { name: "Trie", count: 1 },
];
