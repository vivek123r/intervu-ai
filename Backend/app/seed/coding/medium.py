
from app.schemas.coding import CodingProblem, FunctionParam, ProblemExample, TestCase
from app.schemas.common import CheckerKind, CodingDifficulty, ParamType

MEDIUM_PROBLEMS: list[CodingProblem] = [
    CodingProblem(
        id="coding-med-11",
        slug="longest-substring-without-repeating-characters",
        number=11,
        title="Longest Substring Without Repeating Characters",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Sliding Window", "Hash Table", "String"],
        description_md="""Given a string `s`, find the length of the **longest substring** without repeating characters.""",
        examples=[
            ProblemExample(
                input='s = "abcabcbb"',
                output="3",
                explanation='The answer is "abc", with the length of 3.',
            ),
            ProblemExample(
                input='s = "bbbbb"',
                output="1",
                explanation='The answer is "b", with the length of 1.',
            ),
            ProblemExample(
                input='s = "pwwkew"',
                output="3",
                explanation='The answer is "wke", with the length of 3. Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.',
            ),
        ],
        constraints_md="""- `0 <= s.length <= 5 * 10^4`
- `s` consists of English letters, digits, symbols and spaces.""",
        function_name="lengthOfLongestSubstring",
        params=[FunctionParam(name="s", type=ParamType.STRING)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass",
            "javascript": "/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["abcabcbb"], expected=3, is_example=True),
            TestCase(input_args=["bbbbb"], expected=1, is_example=True),
            TestCase(input_args=["pwwkew"], expected=3, is_example=True),
            TestCase(input_args=[""], expected=0, is_example=False),
            TestCase(input_args=[" "], expected=1, is_example=False),
            TestCase(input_args=["au"], expected=2, is_example=False),
            TestCase(input_args=["dvdf"], expected=3, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Sliding Window with Hash Map

Maintain a sliding window `[left, right]` and a hash map of character to last seen index.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(\\min(N, M))$ where $M$ is alphabet size.""",
    ),
    CodingProblem(
        id="coding-med-12",
        slug="container-with-most-water",
        number=12,
        title="Container With Most Water",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Two Pointers", "Array", "Greedy"],
        description_md="""You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the $i^{\\text{th}}$ line are `(i, 0)` and `(i, height[i])`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.""",
        examples=[
            ProblemExample(
                input="height = [1,8,6,2,5,4,8,3,7]",
                output="49",
                explanation="The max area is between index 1 and index 8: min(8, 7) * (8 - 1) = 49.",
            ),
            ProblemExample(input="height = [1,1]", output="1"),
        ],
        constraints_md="""- `n == height.length`
- `2 <= n <= 10^5`
- `0 <= height[i] <= 10^4`""",
        function_name="maxArea",
        params=[FunctionParam(name="height", type=ParamType.LIST_INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} height\n * @return {number}\n */\nvar maxArea = function(height) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected=49, is_example=True),
            TestCase(input_args=[[1, 1]], expected=1, is_example=True),
            TestCase(input_args=[[4, 3, 2, 1, 4]], expected=16, is_example=False),
            TestCase(input_args=[[1, 2, 1]], expected=2, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Two Pointers

Start with pointers at both ends and continuously move the pointer pointing to the shorter line inward.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-med-13",
        slug="3sum",
        number=13,
        title="3Sum",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Two Pointers", "Sorting", "Array"],
        description_md="""Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.

Notice that the solution set must not contain duplicate triplets.""",
        examples=[
            ProblemExample(input="nums = [-1,0,1,2,-1,-4]", output="[[-1,-1,2],[-1,0,1]]"),
            ProblemExample(input="nums = [0,1,1]", output="[]"),
            ProblemExample(input="nums = [0,0,0]", output="[[0,0,0]]"),
        ],
        constraints_md="""- `3 <= nums.length <= 3000`
- `-10^5 <= nums[i] <= 10^5`""",
        function_name="threeSum",
        params=[FunctionParam(name="nums", type=ParamType.LIST_INT)],
        return_type=ParamType.LIST_LIST_INT,
        checker=CheckerKind.UNORDERED,
        starter_code={
            "python": "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nvar threeSum = function(nums) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[-1, 0, 1, 2, -1, -4]],
                expected=[[-1, -1, 2], [-1, 0, 1]],
                is_example=True,
            ),
            TestCase(input_args=[[0, 1, 1]], expected=[], is_example=True),
            TestCase(input_args=[[0, 0, 0]], expected=[[0, 0, 0]], is_example=True),
            TestCase(
                input_args=[[-2, 0, 1, 1, 2]], expected=[[-2, 0, 2], [-2, 1, 1]], is_example=False
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Sort + Two Pointers

Sort array. Fix first element `nums[i]`, skip duplicates, and run two pointers `left, right` on remaining suffix.

#### Complexity Analysis
- **Time:** $O(N^2)$
- **Space:** $O(1)$ excluding output.""",
    ),
    CodingProblem(
        id="coding-med-14",
        slug="product-of-array-except-self",
        number=14,
        title="Product of Array Except Self",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Array", "Prefix Sum"],
        description_md="""Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.

The product of any prefix or suffix of `nums` is **guaranteed** to fit in a **32-bit** integer.

You must write an algorithm that runs in $O(n)$ time and without using the division operation.""",
        examples=[
            ProblemExample(input="nums = [1,2,3,4]", output="[24,12,8,6]"),
            ProblemExample(input="nums = [-1,1,0,-3,3]", output="[0,0,9,0,0]"),
        ],
        constraints_md="""- `2 <= nums.length <= 10^5`
- `-30 <= nums[i] <= 30`""",
        function_name="productExceptSelf",
        params=[FunctionParam(name="nums", type=ParamType.LIST_INT)],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @return {number[]}\n */\nvar productExceptSelf = function(nums) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[1, 2, 3, 4]], expected=[24, 12, 8, 6], is_example=True),
            TestCase(input_args=[[-1, 1, 0, -3, 3]], expected=[0, 0, 9, 0, 0], is_example=True),
            TestCase(input_args=[[4, 5]], expected=[5, 4], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Left and Right Product Arrays

Prefix products followed by suffix products in $O(1)$ extra space.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$ extra space.""",
    ),
    CodingProblem(
        id="coding-med-15",
        slug="group-anagrams",
        number=15,
        title="Group Anagrams",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Hash Table", "String", "Sorting"],
        description_md="""Given an array of strings `strs`, group the **anagrams** together. You can return the answer in **any order**.""",
        examples=[
            ProblemExample(
                input='strs = ["eat","tea","tan","ate","nat","bat"]',
                output='[["bat"],["nat","tan"],["ate","eat","tea"]]',
            ),
            ProblemExample(input='strs = [""]', output='[[""]]'),
            ProblemExample(input='strs = ["a"]', output='[["a"]]'),
        ],
        constraints_md="""- `1 <= strs.length <= 10^4`
- `0 <= strs[i].length <= 100`
- `strs[i]` consists of lowercase English letters.""",
        function_name="groupAnagrams",
        params=[FunctionParam(name="strs", type=ParamType.LIST_STRING)],
        return_type=ParamType.LIST_LIST_STRING,
        checker=CheckerKind.UNORDERED,
        starter_code={
            "python": "class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        pass",
            "javascript": "/**\n * @param {string[]} strs\n * @return {string[][]}\n */\nvar groupAnagrams = function(strs) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[["eat", "tea", "tan", "ate", "nat", "bat"]],
                expected=[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]],
                is_example=True,
            ),
            TestCase(input_args=[[""]], expected=[[""]], is_example=True),
            TestCase(input_args=[["a"]], expected=[["a"]], is_example=True),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Hash Map by Sorted String / Character Counts

Key is sorted tuple of characters or character counts array.

#### Complexity Analysis
- **Time:** $O(N \\cdot K \\log K)$ where $K$ is max word length.
- **Space:** $O(N \\cdot K)$.""",
    ),
    CodingProblem(
        id="coding-med-16",
        slug="rotate-image",
        number=16,
        title="Rotate Image",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Matrix", "Math"],
        description_md="""You are given an `n x n` 2D `matrix` representing an image, rotate the image by **90 degrees (clockwise)**.

You have to rotate the image **in-place**, which means you have to modify the input 2D matrix directly. **DO NOT** allocate another 2D matrix and do the rotation.""",
        examples=[
            ProblemExample(
                input="matrix = [[1,2,3],[4,5,6],[7,8,9]]", output="[[7,4,1],[8,5,2],[9,6,3]]"
            ),
            ProblemExample(
                input="matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
                output="[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
            ),
        ],
        constraints_md="""- `n == matrix.length == matrix[i].length`
- `1 <= n <= 20`
- `-1000 <= matrix[i][j] <= 1000`""",
        function_name="rotate",
        params=[FunctionParam(name="matrix", type=ParamType.LIST_LIST_INT)],
        return_type=ParamType.LIST_LIST_INT,
        return_index=0,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": 'class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        """\n        Do not return anything, modify matrix in-place instead.\n        """\n        pass',
            "javascript": "/**\n * @param {number[][]} matrix\n * @return {void} Do not return anything, modify matrix in-place instead.\n */\nvar rotate = function(matrix) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
                expected=[[7, 4, 1], [8, 5, 2], [9, 6, 3]],
                is_example=True,
            ),
            TestCase(
                input_args=[[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]],
                expected=[[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]],
                is_example=True,
            ),
            TestCase(input_args=[[[1]]], expected=[[[1]]], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Transpose and Reflect

1. Transpose the matrix: swap `matrix[i][j]` with `matrix[j][i]`.
2. Reverse each row.

#### Complexity Analysis
- **Time:** $O(N^2)$
- **Space:** $O(1)$ in-place.""",
    ),
    CodingProblem(
        id="coding-med-17",
        slug="add-two-numbers",
        number=17,
        title="Add Two Numbers",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Linked List", "Math", "Recursion"],
        description_md="""You are given two **non-empty** linked lists representing two non-negative integers. The digits are stored in **reverse order**, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.""",
        examples=[
            ProblemExample(
                input="l1 = [2,4,3], l2 = [5,6,4]", output="[7,0,8]", explanation="342 + 465 = 807."
            ),
            ProblemExample(input="l1 = [0], l2 = [0]", output="[0]"),
            ProblemExample(
                input="l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]", output="[8,9,9,9,0,0,0,1]"
            ),
        ],
        constraints_md="""- The number of nodes in each linked list is in the range `[1, 100]`.
- `0 <= Node.val <= 9`
- It is guaranteed that the list represents a number that does not have leading zeros.""",
        function_name="addTwoNumbers",
        params=[
            FunctionParam(name="l1", type=ParamType.LIST_NODE),
            FunctionParam(name="l2", type=ParamType.LIST_NODE),
        ],
        return_type=ParamType.LIST_NODE,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
            "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} l1\n * @param {ListNode} l2\n * @return {ListNode}\n */\nvar addTwoNumbers = function(l1, l2) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[2, 4, 3], [5, 6, 4]], expected=[7, 0, 8], is_example=True),
            TestCase(input_args=[[0], [0]], expected=[0], is_example=True),
            TestCase(
                input_args=[[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]],
                expected=[8, 9, 9, 9, 0, 0, 0, 1],
                is_example=True,
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Elementary Addition with Carry

Simulate addition column by column, maintaining a carry variable.

#### Complexity Analysis
- **Time:** $O(\\max(N, M))$
- **Space:** $O(1)$ additional.""",
    ),
    CodingProblem(
        id="coding-med-18",
        slug="number-of-islands",
        number=18,
        title="Number of Islands",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Graph", "DFS", "BFS", "Matrix"],
        description_md="""Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.

An **island** is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.""",
        examples=[
            ProblemExample(
                input='grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
                output="1",
            ),
            ProblemExample(
                input='grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
                output="3",
            ),
        ],
        constraints_md="""- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 300`
- `grid[i][j]` is `'0'` or `'1'`.""",
        function_name="numIslands",
        params=[FunctionParam(name="grid", type=ParamType.LIST_LIST_STRING)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def numIslands(self, grid: List[List[str]]) -> int:\n        pass",
            "javascript": "/**\n * @param {character[][]} grid\n * @return {number}\n */\nvar numIslands = function(grid) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[
                    [
                        ["1", "1", "1", "1", "0"],
                        ["1", "1", "0", "1", "0"],
                        ["1", "1", "0", "0", "0"],
                        ["0", "0", "0", "0", "0"],
                    ]
                ],
                expected=1,
                is_example=True,
            ),
            TestCase(
                input_args=[
                    [
                        ["1", "1", "0", "0", "0"],
                        ["1", "1", "0", "0", "0"],
                        ["0", "0", "1", "0", "0"],
                        ["0", "0", "0", "1", "1"],
                    ]
                ],
                expected=3,
                is_example=True,
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: DFS / BFS Flood Fill

Traverse each cell. Whenever a `'1'` is found, increment island count and run DFS/BFS to sink the island (mark visited cells as `'0'`).

#### Complexity Analysis
- **Time:** $O(M \\times N)$
- **Space:** $O(M \\times N)$ recursion/queue stack in worst case.""",
    ),
    CodingProblem(
        id="coding-med-19",
        slug="coin-change",
        number=19,
        title="Coin Change",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Dynamic Programming", "BFS"],
        description_md="""You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.

You may assume that you have an infinite number of each kind of coin.""",
        examples=[
            ProblemExample(
                input="coins = [1,2,5], amount = 11", output="3", explanation="11 = 5 + 5 + 1"
            ),
            ProblemExample(input="coins = [2], amount = 3", output="-1"),
            ProblemExample(input="coins = [1], amount = 0", output="0"),
        ],
        constraints_md="""- `1 <= coins.length <= 12`
- `1 <= coins[i] <= 2^31 - 1`
- `0 <= amount <= 10^4`""",
        function_name="coinChange",
        params=[
            FunctionParam(name="coins", type=ParamType.LIST_INT),
            FunctionParam(name="amount", type=ParamType.INT),
        ],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nvar coinChange = function(coins, amount) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[1, 2, 5], 11], expected=3, is_example=True),
            TestCase(input_args=[[2], 3], expected=-1, is_example=True),
            TestCase(input_args=[[1], 0], expected=0, is_example=True),
            TestCase(input_args=[[186, 419, 83, 408], 6249], expected=20, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Bottom-up DP

`dp[i] = min(dp[i], dp[i - c] + 1)` for each coin `c`.

#### Complexity Analysis
- **Time:** $O(S \\times N)$ where $S$ is amount and $N$ is coin count.
- **Space:** $O(S)$.""",
    ),
    CodingProblem(
        id="coding-med-20",
        slug="top-k-frequent-elements",
        number=20,
        title="Top K Frequent Elements",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Heap", "Hash Table", "Bucket Sort"],
        description_md="""Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in **any order**.""",
        examples=[
            ProblemExample(input="nums = [1,1,1,2,2,3], k = 2", output="[1,2]"),
            ProblemExample(input="nums = [1], k = 1", output="[1]"),
        ],
        constraints_md="""- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`
- `k` is in the range `[1, the number of unique elements in the array]`.
- It is **guaranteed** that the answer is **unique**.""",
        function_name="topKFrequent",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="k", type=ParamType.INT),
        ],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.UNORDERED,
        starter_code={
            "python": "class Solution:\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number[]}\n */\nvar topKFrequent = function(nums, k) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[1, 1, 1, 2, 2, 3], 2], expected=[1, 2], is_example=True),
            TestCase(input_args=[[1], 1], expected=[1], is_example=True),
            TestCase(input_args=[[4, 1, -1, 2, -1, 2, 3], 2], expected=[-1, 2], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Bucket Sort / Min-Heap

Count frequencies with a hash map, then use bucket sort index by frequency or a min-heap of size $K$.

#### Complexity Analysis
- **Time:** $O(N)$ with bucket sort.
- **Space:** $O(N)$.""",
    ),
]
