
from app.schemas.coding import CodingProblem, FunctionParam, ProblemExample, TestCase
from app.schemas.common import CheckerKind, CodingDifficulty, ParamType

HARD_PROBLEMS: list[CodingProblem] = [
    CodingProblem(
        id="coding-hard-21",
        slug="median-of-two-sorted-arrays",
        number=21,
        title="Median of Two Sorted Arrays",
        difficulty=CodingDifficulty.HARD,
        topics=["Binary Search", "Array", "Divide and Conquer"],
        description_md="""Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the **median** of the two sorted arrays.

The overall run time complexity should be $O(\\log (m+n))$.""",
        examples=[
            ProblemExample(
                input="nums1 = [1,3], nums2 = [2]",
                output="2.00000",
                explanation="merged array = [1,2,3] and median is 2.",
            ),
            ProblemExample(
                input="nums1 = [1,2], nums2 = [3,4]",
                output="2.50000",
                explanation="merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
            ),
        ],
        constraints_md="""- `nums1.length == m`
- `nums2.length == n`
- `0 <= m <= 1000`
- `0 <= n <= 1000`
- `1 <= m + n <= 2000`
- `-10^6 <= nums1[i], nums2[i] <= 10^6`""",
        function_name="findMedianSortedArrays",
        params=[
            FunctionParam(name="nums1", type=ParamType.LIST_INT),
            FunctionParam(name="nums2", type=ParamType.LIST_INT),
        ],
        return_type=ParamType.FLOAT,
        checker=CheckerKind.FLOAT,
        starter_code={
            "python": "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        pass",
            "javascript": "/**\n * @param {number[]} nums1\n * @param {number[]} nums2\n * @return {number}\n */\nvar findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[1, 3], [2]], expected=2.0, is_example=True),
            TestCase(input_args=[[1, 2], [3, 4]], expected=2.5, is_example=True),
            TestCase(input_args=[[0, 0], [0, 0]], expected=0.0, is_example=False),
            TestCase(input_args=[[], [1]], expected=1.0, is_example=False),
            TestCase(input_args=[[2], []], expected=2.0, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Binary Search Partitioning

Partition both arrays such that the left half and right half contain equal number of elements and `maxLeft <= minRight`.

#### Complexity Analysis
- **Time:** $O(\\log(\\min(M, N)))$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-hard-22",
        slug="trapping-rain-water",
        number=22,
        title="Trapping Rain Water",
        difficulty=CodingDifficulty.HARD,
        topics=["Two Pointers", "Stack", "Array", "Dynamic Programming"],
        description_md="""Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.""",
        examples=[
            ProblemExample(
                input="height = [0,1,0,2,1,0,1,3,2,1,2,1]",
                output="6",
                explanation="The elevation map can trap 6 units of rain water.",
            ),
            ProblemExample(input="height = [4,2,0,3,2,5]", output="9"),
        ],
        constraints_md="""- `n == height.length`
- `1 <= n <= 2 * 10^4`
- `0 <= height[i] <= 10^5`""",
        function_name="trap",
        params=[FunctionParam(name="height", type=ParamType.LIST_INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} height\n * @return {number}\n */\nvar trap = function(height) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected=6, is_example=True
            ),
            TestCase(input_args=[[4, 2, 0, 3, 2, 5]], expected=9, is_example=True),
            TestCase(input_args=[[4, 2, 3]], expected=1, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Two Pointers

Maintain `left_max` and `right_max` pointers moving from ends towards each other.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-hard-23",
        slug="merge-k-sorted-lists",
        number=23,
        title="Merge k Sorted Lists",
        difficulty=CodingDifficulty.HARD,
        topics=["Heap", "Linked List", "Divide and Conquer"],
        description_md="""You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.""",
        examples=[
            ProblemExample(
                input="lists = [[1,4,5],[1,3,4],[2,6]]",
                output="[1,1,2,3,4,4,5,6]",
                explanation="The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerging them into one sorted list:\n1->1->2->3->4->4->5->6",
            ),
            ProblemExample(input="lists = []", output="[]"),
            ProblemExample(input="lists = [[]]", output="[]"),
        ],
        constraints_md="""- `k == lists.length`
- `0 <= k <= 10^4`
- `0 <= lists[i].length <= 500`
- `-10^4 <= lists[i][j] <= 10^4`
- `lists[i]` is sorted in **ascending order**.""",
        function_name="mergeKLists",
        params=[FunctionParam(name="lists", type=ParamType.LIST_LIST_NODE_NULLABLE)],
        return_type=ParamType.LIST_NODE,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n        pass",
            "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode[]} lists\n * @return {ListNode}\n */\nvar mergeKLists = function(lists) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[[1, 4, 5], [1, 3, 4], [2, 6]]],
                expected=[1, 1, 2, 3, 4, 4, 5, 6],
                is_example=True,
            ),
            TestCase(input_args=[[]], expected=[], is_example=True),
            TestCase(input_args=[[[]]], expected=[], is_example=True),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Priority Queue / Divide and Conquer

Insert heads of all $K$ lists into min-heap. Pop minimum and push its `next`.

#### Complexity Analysis
- **Time:** $O(N \\log K)$ where $N$ is total nodes.
- **Space:** $O(K)$ heap space.""",
    ),
    CodingProblem(
        id="coding-hard-24",
        slug="longest-increasing-path-in-a-matrix",
        number=24,
        title="Longest Increasing Path in a Matrix",
        difficulty=CodingDifficulty.HARD,
        topics=["DFS", "Memoization", "Matrix", "Graph"],
        description_md="""Given an `m x n` integers matrix, return the length of the longest increasing path in `matrix`.

From each cell, you can either move in four directions: left, right, up, or down. You may **not** move diagonally or move outside the boundary.""",
        examples=[
            ProblemExample(
                input="matrix = [[9,9,4],[6,6,8],[2,1,1]]",
                output="4",
                explanation="The longest increasing path is [1, 2, 6, 9].",
            ),
            ProblemExample(
                input="matrix = [[3,4,5],[3,2,6],[2,2,1]]",
                output="4",
                explanation="The longest increasing path is [3, 4, 5, 6].",
            ),
            ProblemExample(input="matrix = [[1]]", output="1"),
        ],
        constraints_md="""- `m == matrix.length`
- `n == matrix[i].length`
- `1 <= m, n <= 200`
- `0 <= matrix[i][j] <= 2^31 - 1`""",
        function_name="longestIncreasingPath",
        params=[FunctionParam(name="matrix", type=ParamType.LIST_LIST_INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:\n        pass",
            "javascript": "/**\n * @param {number[][]} matrix\n * @return {number}\n */\nvar longestIncreasingPath = function(matrix) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[[9, 9, 4], [6, 6, 8], [2, 1, 1]]], expected=4, is_example=True),
            TestCase(input_args=[[[3, 4, 5], [3, 2, 6], [2, 2, 1]]], expected=4, is_example=True),
            TestCase(input_args=[[[1]]], expected=1, is_example=True),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: DFS with Memoization

Each cell is a DAG node. Perform DFS with memo table `memo[r][c] = 1 + max(dfs(nr, nc))`.

#### Complexity Analysis
- **Time:** $O(M \\times N)$
- **Space:** $O(M \\times N)$.""",
    ),
    CodingProblem(
        id="coding-hard-25",
        slug="edit-distance",
        number=25,
        title="Edit Distance",
        difficulty=CodingDifficulty.HARD,
        topics=["Dynamic Programming", "String"],
        description_md="""Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.

You have the following three operations permitted on a word:
- Insert a character
- Delete a character
- Replace a character""",
        examples=[
            ProblemExample(
                input='word1 = "horse", word2 = "ros"',
                output="3",
                explanation="horse -> rorse (replace 'h' with 'r')\nrorse -> rose (remove 'r')\nrose -> ros (remove 'e')",
            ),
            ProblemExample(input='word1 = "intention", word2 = "execution"', output="5"),
        ],
        constraints_md="""- `0 <= word1.length, word2.length <= 500`
- `word1` and `word2` consist of lowercase English letters.""",
        function_name="minDistance",
        params=[
            FunctionParam(name="word1", type=ParamType.STRING),
            FunctionParam(name="word2", type=ParamType.STRING),
        ],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def minDistance(self, word1: str, word2: str) -> int:\n        pass",
            "javascript": "/**\n * @param {string} word1\n * @param {string} word2\n * @return {number}\n */\nvar minDistance = function(word1, word2) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["horse", "ros"], expected=3, is_example=True),
            TestCase(input_args=["intention", "execution"], expected=5, is_example=True),
            TestCase(input_args=["", ""], expected=0, is_example=False),
            TestCase(input_args=["a", ""], expected=1, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: 2D Dynamic Programming (Levenshtein Distance)

`dp[i][j] = dp[i-1][j-1]` if match, else `1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])`.

#### Complexity Analysis
- **Time:** $O(M \\times N)$
- **Space:** $O(M \\times N)$ or $O(\\min(M, N))$ space-optimized.""",
    ),
    CodingProblem(
        id="coding-hard-26",
        slug="serialize-and-deserialize-binary-tree",
        number=26,
        title="Serialize and Deserialize Binary Tree",
        difficulty=CodingDifficulty.HARD,
        topics=["Tree", "BFS", "Design", "String"],
        description_md="""Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment.

Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.""",
        examples=[
            ProblemExample(input="root = [1,2,3,null,null,4,5]", output="[1,2,3,null,null,4,5]"),
            ProblemExample(input="root = []", output="[]"),
        ],
        constraints_md="""- The number of nodes in the tree is in the range `[0, 10^4]`.
- `-1000 <= Node.val <= 1000`""",
        function_name="serialize",
        params=[FunctionParam(name="root", type=ParamType.TREE_NODE)],
        return_type=ParamType.TREE_NODE,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": '# Definition for a binary tree node.\n# class TreeNode(object):\n#     def __init__(self, x):\n#         self.val = x\n#         self.left = None\n#         self.right = None\n\nclass Codec:\n    def serialize(self, root):\n        """Encodes a tree to a single string."""\n        pass\n\n    def deserialize(self, data):\n        """Decodes your encoded data to tree."""\n        pass\n',
            "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val) {\n *     this.val = val;\n *     this.left = this.right = null;\n * }\n */\n\n/**\n * Encodes a tree to a single string.\n * @param {TreeNode} root\n * @return {string}\n */\nvar serialize = function(root) {\n    \n};\n\n/**\n * Decodes your encoded data to tree.\n * @param {string} data\n * @return {TreeNode}\n */\nvar deserialize = function(data) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[1, 2, 3, None, None, 4, 5]],
                expected=[1, 2, 3, None, None, 4, 5],
                is_example=True,
            ),
            TestCase(input_args=[[]], expected=[], is_example=True),
            TestCase(input_args=[[1]], expected=[1], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Preorder / BFS Serialization

Serialize tree preorder with delimiter (e.g. `"1,2,X,X,3,4,X,X,5,X,X"` where `X` represents null). Reconstruct recursively during deserialization.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(N)$.""",
    ),
    CodingProblem(
        id="coding-hard-27",
        slug="sliding-window-maximum",
        number=27,
        title="Sliding Window Maximum",
        difficulty=CodingDifficulty.HARD,
        topics=["Monotonic Deque", "Sliding Window", "Queue", "Array"],
        description_md="""You are given an array of integers `nums`, there is a sliding window of size `k` which is moving from the very left of the array to the very right. You can only see the `k` numbers in the window. Each time the sliding window moves right by one position.

Return the max sliding window.""",
        examples=[
            ProblemExample(
                input="nums = [1,3,-1,-3,5,3,6,7], k = 3",
                output="[3,3,5,5,6,7]",
                explanation="Window position                Max\n---------------               -----\n[1  3  -1] -3  5  3  6  7       3\n 1 [3  -1  -3] 5  3  6  7       3\n 1  3 [-1  -3  5] 3  6  7       5\n 1  3  -1 [-3  5  3] 6  7       5\n 1  3  -1  -3 [5  3  6] 7       6\n 1  3  -1  -3  5 [3  6  7]      7",
            ),
            ProblemExample(input="nums = [1], k = 1", output="[1]"),
        ],
        constraints_md="""- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
- `1 <= k <= nums.length`""",
        function_name="maxSlidingWindow",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="k", type=ParamType.INT),
        ],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number[]}\n */\nvar maxSlidingWindow = function(nums, k) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[1, 3, -1, -3, 5, 3, 6, 7], 3],
                expected=[3, 3, 5, 5, 6, 7],
                is_example=True,
            ),
            TestCase(input_args=[[1], 1], expected=[1], is_example=True),
            TestCase(input_args=[[9, 11], 2], expected=[11], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Monotonically Decreasing Deque

Keep indices in a deque maintaining strictly decreasing values. The front is always the window maximum.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(K)$.""",
    ),
    CodingProblem(
        id="coding-hard-28",
        slug="minimum-window-substring",
        number=28,
        title="Minimum Window Substring",
        difficulty=CodingDifficulty.HARD,
        topics=["Sliding Window", "Hash Table", "String"],
        description_md="""Given two strings `s` and `t` of lengths `m` and `n` respectively, return the **minimum window substring** of `s` such that every character in `t` (**including duplicates**) is included in the window. If there is no such substring, return the empty string `""`.""",
        examples=[
            ProblemExample(
                input='s = "ADOBECODEBANC", t = "ABC"',
                output='"BANC"',
                explanation="The minimum window substring \"BANC\" includes 'A', 'B', and 'C' from string t.",
            ),
            ProblemExample(input='s = "a", t = "a"', output='"a"'),
            ProblemExample(
                input='s = "a", t = "aa"',
                output='""',
                explanation="Both 'a's from t must be included in the window.",
            ),
        ],
        constraints_md="""- `m == s.length`
- `n == t.length`
- `1 <= m, n <= 10^5`
- `s` and `t` consist of uppercase and lowercase English letters.""",
        function_name="minWindow",
        params=[
            FunctionParam(name="s", type=ParamType.STRING),
            FunctionParam(name="t", type=ParamType.STRING),
        ],
        return_type=ParamType.STRING,
        checker=CheckerKind.CUSTOM_MIN_WINDOW,
        starter_code={
            "python": "class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        pass",
            "javascript": "/**\n * @param {string} s\n * @param {string} t\n * @return {string}\n */\nvar minWindow = function(s, t) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["ADOBECODEBANC", "ABC"], expected="BANC", is_example=True),
            TestCase(input_args=["a", "a"], expected="a", is_example=True),
            TestCase(input_args=["a", "aa"], expected="", is_example=True),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Sliding Window with Character Counts

Expand `right` until all required characters are satisfied, then contract `left` while maintaining condition.

#### Complexity Analysis
- **Time:** $O(|S| + |T|)$
- **Space:** $O(|S| + |T|)$.""",
    ),
    CodingProblem(
        id="coding-hard-29",
        slug="word-search-ii",
        number=29,
        title="Word Search II",
        difficulty=CodingDifficulty.HARD,
        topics=["Trie", "Backtracking", "Matrix", "DFS"],
        description_md="""Given an `m x n` `board` of characters and a list of strings `words`, return all words on the board.

Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.""",
        examples=[
            ProblemExample(
                input='board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]',
                output='["eat","oath"]',
            ),
            ProblemExample(input='board = [["a","b"],["c","d"]], words = ["abcb"]', output="[]"),
        ],
        constraints_md="""- `m == board.length`
- `n == board[i].length`
- `1 <= m, n <= 12`
- `board[i][j]` is a lowercase English letter.
- `1 <= words.length <= 3 * 10^4`
- `1 <= words[i].length <= 10`
- `words[i]` consists of lowercase English letters.
- All strings of `words` are unique.""",
        function_name="findWords",
        params=[
            FunctionParam(name="board", type=ParamType.LIST_LIST_STRING),
            FunctionParam(name="words", type=ParamType.LIST_STRING),
        ],
        return_type=ParamType.LIST_STRING,
        checker=CheckerKind.UNORDERED,
        starter_code={
            "python": "class Solution:\n    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:\n        pass",
            "javascript": "/**\n * @param {character[][]} board\n * @param {string[]} words\n * @return {string[]}\n */\nvar findWords = function(board, words) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[
                    [
                        ["o", "a", "a", "n"],
                        ["e", "t", "a", "e"],
                        ["i", "h", "k", "r"],
                        ["i", "f", "l", "v"],
                    ],
                    ["oath", "pea", "eat", "rain"],
                ],
                expected=["eat", "oath"],
                is_example=True,
            ),
            TestCase(
                input_args=[[["a", "b"], ["c", "d"]], ["abcb"]],
                expected=[],
                is_example=True,
            ),
        ],
        time_limit_ms=3000,
        editorial_md="""### Approach: Trie + Backtracking DFS

Insert dictionary words into a Trie. Traverse grid with DFS matching Trie prefix.

#### Complexity Analysis
- **Time:** $O(M \\times N \\times 4^L)$ where $L$ is max word length.
- **Space:** $O(\\sum \\text{len}(words))$ Trie size.""",
    ),
    CodingProblem(
        id="coding-hard-30",
        slug="regular-expression-matching",
        number=30,
        title="Regular Expression Matching",
        difficulty=CodingDifficulty.HARD,
        topics=["Dynamic Programming", "Recursion", "String"],
        description_md="""Given an input string `s` and a pattern `p`, implement regular expression matching with support for `'.'` and `'*'` where:
- `'.'` Matches any single character.
- `'*'` Matches zero or more of the preceding element.

The matching should cover the **entire** input string (not partial).""",
        examples=[
            ProblemExample(
                input='s = "aa", p = "a"',
                output="false",
                explanation='"a" does not match the entire string "aa".',
            ),
            ProblemExample(
                input='s = "aa", p = "a*"',
                output="true",
                explanation="'*' means zero or more of the preceding element, 'a'. Therefore, by repeating 'a' once, it becomes \"aa\".",
            ),
            ProblemExample(
                input='s = "ab", p = ".*"',
                output="true",
                explanation='".*" means "zero or more (*) of any character (.)".',
            ),
        ],
        constraints_md="""- `1 <= s.length <= 20`
- `1 <= p.length <= 20`
- `s` contains only lowercase English letters.
- `p` contains only lowercase English letters, `'.'`, and `'*'`.
- It is guaranteed for each appearance of the character `'*'`, there will be a previous valid character to match.""",
        function_name="isMatch",
        params=[
            FunctionParam(name="s", type=ParamType.STRING),
            FunctionParam(name="p", type=ParamType.STRING),
        ],
        return_type=ParamType.BOOLEAN,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def isMatch(self, s: str, p: str) -> bool:\n        pass",
            "javascript": "/**\n * @param {string} s\n * @param {string} p\n * @return {boolean}\n */\nvar isMatch = function(s, p) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["aa", "a"], expected=False, is_example=True),
            TestCase(input_args=["aa", "a*"], expected=True, is_example=True),
            TestCase(input_args=["ab", ".*"], expected=True, is_example=True),
            TestCase(input_args=["aab", "c*a*b"], expected=True, is_example=False),
            TestCase(input_args=["mississippi", "mis*is*p*."], expected=False, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: 2D Dynamic Programming

`dp[i][j]` represents if `s[:i]` matches `p[:j]`.
- If `p[j-1] == '*'`:
  - `dp[i][j] = dp[i][j-2]` (zero occurrences) OR `(matches(s[i-1], p[j-2]) and dp[i-1][j])` (one or more)
- Else:
  - `dp[i][j] = matches(s[i-1], p[j-1]) and dp[i-1][j-1]`

#### Complexity Analysis
- **Time:** $O(M \\times N)$
- **Space:** $O(M \\times N)$.""",
    ),
]
