
from app.schemas.coding import CodingProblem, FunctionParam, ProblemExample, TestCase
from app.schemas.common import CheckerKind, CodingDifficulty, ParamType

EASY_PROBLEMS: list[CodingProblem] = [
    CodingProblem(
        id="coding-easy-1",
        slug="two-sum",
        number=1,
        title="Two Sum",
        difficulty=CodingDifficulty.EASY,
        topics=["Array", "Hash Table"],
        description_md="""Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.""",
        examples=[
            ProblemExample(
                input="nums = [2,7,11,15], target = 9",
                output="[0,1]",
                explanation="Because nums[0] + nums[1] == 9, we return [0, 1].",
            ),
            ProblemExample(
                input="nums = [3,2,4], target = 6",
                output="[1,2]",
                explanation="nums[1] + nums[2] == 6, so we return [1, 2].",
            ),
            ProblemExample(
                input="nums = [3,3], target = 6",
                output="[0,1]",
            ),
        ],
        constraints_md="""- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- `-10^9 <= target <= 10^9`
- Only one valid answer exists.""",
        function_name="twoSum",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="target", type=ParamType.INT),
        ],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[2, 7, 11, 15], 9], expected=[0, 1], is_example=True),
            TestCase(input_args=[[3, 2, 4], 6], expected=[1, 2], is_example=True),
            TestCase(input_args=[[3, 3], 6], expected=[0, 1], is_example=True),
            TestCase(input_args=[[-1, -2, -3, -4, -5], -8], expected=[2, 4], is_example=False),
            TestCase(input_args=[[0, 4, 3, 0], 0], expected=[0, 3], is_example=False),
            TestCase(input_args=[[1, 5, 8, 10, 14], 15], expected=[1, 3], is_example=False),
            TestCase(
                input_args=[[100, 200, 300, 400, 500], 700], expected=[2, 3], is_example=False
            ),
            TestCase(
                input_args=[list(range(1, 1001)), 1999], expected=[998, 999], is_example=False
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: One-Pass Hash Table

While iterating through the array, we can check if the complement `target - num` already exists in a hash map. If it exists, we return its index along with the current index. Otherwise, we record the current number and its index.

#### Complexity Analysis
- **Time Complexity:** $O(N)$ where $N$ is the number of elements in `nums`. We traverse the list once and hash map lookups take $O(1)$ on average.
- **Space Complexity:** $O(N)$ to store up to $N$ elements in the hash map.

#### Reference Implementation

**Python 3:**
```python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
```

**JavaScript:**
```javascript
var twoSum = function(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) {
            return [seen.get(comp), i];
        }
        seen.set(nums[i], i);
    }
    return [];
};
```""",
    ),
    CodingProblem(
        id="coding-easy-2",
        slug="valid-parentheses",
        number=2,
        title="Valid Parentheses",
        difficulty=CodingDifficulty.EASY,
        topics=["Stack", "String"],
        description_md="""Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.""",
        examples=[
            ProblemExample(input='s = "()"', output="true"),
            ProblemExample(input='s = "()[]{}"', output="true"),
            ProblemExample(input='s = "(]"', output="false"),
            ProblemExample(input='s = "([])"', output="true"),
        ],
        constraints_md="""- `1 <= s.length <= 10^4`
- `s` consists of parentheses only `'()[]{}'`.""",
        function_name="isValid",
        params=[FunctionParam(name="s", type=ParamType.STRING)],
        return_type=ParamType.BOOLEAN,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
            "javascript": "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["()"], expected=True, is_example=True),
            TestCase(input_args=["()[]{}"], expected=True, is_example=True),
            TestCase(input_args=["(]"], expected=False, is_example=True),
            TestCase(input_args=["([])"], expected=True, is_example=True),
            TestCase(input_args=["["], expected=False, is_example=False),
            TestCase(input_args=["]"], expected=False, is_example=False),
            TestCase(input_args=["{[]}"], expected=True, is_example=False),
            TestCase(input_args=["((((({{{[[[()]]]}}})))))"], expected=True, is_example=False),
            TestCase(input_args=["((((({{{[[[()]]]}}}))))"], expected=False, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Stack

We use a stack to push matching closing brackets when encountering opening brackets. When a closing bracket is met, we pop from the stack and verify that it matches.

#### Complexity Analysis
- **Time Complexity:** $O(N)$ where $N$ is the length of string `s`.
- **Space Complexity:** $O(N)$ for the stack storage in the worst case.""",
    ),
    CodingProblem(
        id="coding-easy-3",
        slug="merge-two-sorted-lists",
        number=3,
        title="Merge Two Sorted Lists",
        difficulty=CodingDifficulty.EASY,
        topics=["Linked List", "Recursion"],
        description_md="""You are given the heads of two sorted linked lists `list1` and `list2`.

Merge the two lists into one **sorted** list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.""",
        examples=[
            ProblemExample(input="list1 = [1,2,4], list2 = [1,3,4]", output="[1,1,2,3,4,4]"),
            ProblemExample(input="list1 = [], list2 = []", output="[]"),
            ProblemExample(input="list1 = [], list2 = [0]", output="[0]"),
        ],
        constraints_md="""- The number of nodes in both lists is in the range `[0, 50]`.
- `-100 <= Node.val <= 100`
- Both `list1` and `list2` are sorted in **non-decreasing** order.""",
        function_name="mergeTwoLists",
        params=[
            FunctionParam(name="list1", type=ParamType.LIST_NODE),
            FunctionParam(name="list2", type=ParamType.LIST_NODE),
        ],
        return_type=ParamType.LIST_NODE,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
            "javascript": "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} list1\n * @param {ListNode} list2\n * @return {ListNode}\n */\nvar mergeTwoLists = function(list1, list2) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[1, 2, 4], [1, 3, 4]], expected=[1, 1, 2, 3, 4, 4], is_example=True
            ),
            TestCase(input_args=[[], []], expected=[], is_example=True),
            TestCase(input_args=[[], [0]], expected=[0], is_example=True),
            TestCase(input_args=[[5], [1, 2, 4]], expected=[1, 2, 4, 5], is_example=False),
            TestCase(
                input_args=[[-10, -5, 0], [-2, 3, 8]],
                expected=[-10, -5, -2, 0, 3, 8],
                is_example=False,
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Iterative with Sentinel Dummy Node

Maintain a `dummy` node and advance whichever list pointer holds the smaller value.

#### Complexity Analysis
- **Time Complexity:** $O(N + M)$ where $N$ and $M$ are the lengths of the two lists.
- **Space Complexity:** $O(1)$ additional space.""",
    ),
    CodingProblem(
        id="coding-easy-4",
        slug="best-time-to-buy-and-sell-stock",
        number=4,
        title="Best Time to Buy and Sell Stock",
        difficulty=CodingDifficulty.EASY,
        topics=["Array", "Dynamic Programming"],
        description_md="""You are given an array `prices` where `prices[i]` is the price of a given stock on the $i^{\\text{th}}$ day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.""",
        examples=[
            ProblemExample(
                input="prices = [7,1,5,3,6,4]",
                output="5",
                explanation="Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
            ),
            ProblemExample(
                input="prices = [7,6,4,3,1]",
                output="0",
                explanation="In this case, no transactions are done and the max profit = 0.",
            ),
        ],
        constraints_md="""- `1 <= prices.length <= 10^5`
- `0 <= prices[i] <= 10^4`""",
        function_name="maxProfit",
        params=[FunctionParam(name="prices", type=ParamType.LIST_INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} prices\n * @return {number}\n */\nvar maxProfit = function(prices) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[7, 1, 5, 3, 6, 4]], expected=5, is_example=True),
            TestCase(input_args=[[7, 6, 4, 3, 1]], expected=0, is_example=True),
            TestCase(input_args=[[2, 4, 1]], expected=2, is_example=False),
            TestCase(input_args=[[3, 2, 6, 5, 0, 3]], expected=4, is_example=False),
            TestCase(input_args=[[1, 2]], expected=1, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: One Pass (Running Minimum)

Track the minimum price seen so far and compute the profit if sold today.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-easy-5",
        slug="valid-anagram",
        number=5,
        title="Valid Anagram",
        difficulty=CodingDifficulty.EASY,
        topics=["String", "Hash Table"],
        description_md="""Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.

An **Anagram** is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.""",
        examples=[
            ProblemExample(input='s = "anagram", t = "nagaram"', output="true"),
            ProblemExample(input='s = "rat", t = "car"', output="false"),
        ],
        constraints_md="""- `1 <= s.length, t.length <= 5 * 10^4`
- `s` and `t` consist of lowercase English letters.""",
        function_name="isAnagram",
        params=[
            FunctionParam(name="s", type=ParamType.STRING),
            FunctionParam(name="t", type=ParamType.STRING),
        ],
        return_type=ParamType.BOOLEAN,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        pass",
            "javascript": "/**\n * @param {string} s\n * @param {string} t\n * @return {boolean}\n */\nvar isAnagram = function(s, t) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=["anagram", "nagaram"], expected=True, is_example=True),
            TestCase(input_args=["rat", "car"], expected=False, is_example=True),
            TestCase(input_args=["a", "ab"], expected=False, is_example=False),
            TestCase(input_args=["listen", "silent"], expected=True, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Frequency Array / Counter

Count character frequencies for both strings.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$ since alphabet size is bounded (26 letters).""",
    ),
    CodingProblem(
        id="coding-easy-6",
        slug="maximum-subarray",
        number=6,
        title="Maximum Subarray",
        difficulty=CodingDifficulty.EASY,
        topics=["Array", "Dynamic Programming"],
        description_md="""Given an integer array `nums`, find the subarray with the largest sum, and return its sum.""",
        examples=[
            ProblemExample(
                input="nums = [-2,1,-3,4,-1,2,1,-5,4]",
                output="6",
                explanation="The subarray [4,-1,2,1] has the largest sum 6.",
            ),
            ProblemExample(input="nums = [1]", output="1"),
            ProblemExample(input="nums = [5,4,-1,7,8]", output="23"),
        ],
        constraints_md="""- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`""",
        function_name="maxSubArray",
        params=[FunctionParam(name="nums", type=ParamType.LIST_INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @return {number}\n */\nvar maxSubArray = function(nums) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected=6, is_example=True),
            TestCase(input_args=[[1]], expected=1, is_example=True),
            TestCase(input_args=[[5, 4, -1, 7, 8]], expected=23, is_example=True),
            TestCase(input_args=[[-1]], expected=-1, is_example=False),
            TestCase(input_args=[[-2, -1]], expected=-1, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Kadane's Algorithm

Maintain `curr_sum = max(num, curr_sum + num)` and update `max_sum`.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-easy-7",
        slug="climbing-stairs",
        number=7,
        title="Climbing Stairs",
        difficulty=CodingDifficulty.EASY,
        topics=["Dynamic Programming", "Math"],
        description_md="""You are climbing a staircase. It takes `n` steps to reach the top.

Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?""",
        examples=[
            ProblemExample(input="n = 2", output="2", explanation="1 step + 1 step OR 2 steps."),
            ProblemExample(input="n = 3", output="3", explanation="1+1+1, 1+2, 2+1."),
        ],
        constraints_md="""- `1 <= n <= 45`""",
        function_name="climbStairs",
        params=[FunctionParam(name="n", type=ParamType.INT)],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
            "javascript": "/**\n * @param {number} n\n * @return {number}\n */\nvar climbStairs = function(n) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[2], expected=2, is_example=True),
            TestCase(input_args=[3], expected=3, is_example=True),
            TestCase(input_args=[1], expected=1, is_example=False),
            TestCase(input_args=[4], expected=5, is_example=False),
            TestCase(input_args=[5], expected=8, is_example=False),
            TestCase(input_args=[35], expected=14930352, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Fibonacci DP

`dp[i] = dp[i-1] + dp[i-2]`.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(1)$ with two variables.""",
    ),
    CodingProblem(
        id="coding-easy-8",
        slug="binary-search",
        number=8,
        title="Binary Search",
        difficulty=CodingDifficulty.EASY,
        topics=["Binary Search", "Array"],
        description_md="""Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.

You must write an algorithm with $O(\\log n)$ runtime complexity.""",
        examples=[
            ProblemExample(
                input="nums = [-1,0,3,5,9,12], target = 9",
                output="4",
                explanation="9 exists in nums and its index is 4",
            ),
            ProblemExample(
                input="nums = [-1,0,3,5,9,12], target = 2",
                output="-1",
                explanation="2 does not exist in nums so return -1",
            ),
        ],
        constraints_md="""- `1 <= nums.length <= 10^4`
- `-10^4 < nums[i], target < 10^4`
- All integers in `nums` are **unique**.
- `nums` is sorted in ascending order.""",
        function_name="search",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="target", type=ParamType.INT),
        ],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
            "javascript": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nvar search = function(nums, target) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[-1, 0, 3, 5, 9, 12], 9], expected=4, is_example=True),
            TestCase(input_args=[[-1, 0, 3, 5, 9, 12], 2], expected=-1, is_example=True),
            TestCase(input_args=[[5], 5], expected=0, is_example=False),
            TestCase(input_args=[[5], -5], expected=-1, is_example=False),
            TestCase(
                input_args=[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10], expected=9, is_example=False
            ),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Binary Search

Binary search with `mid = low + (high - low) // 2`.

#### Complexity Analysis
- **Time:** $O(\\log N)$
- **Space:** $O(1)$""",
    ),
    CodingProblem(
        id="coding-easy-9",
        slug="invert-binary-tree",
        number=9,
        title="Invert Binary Tree",
        difficulty=CodingDifficulty.EASY,
        topics=["Tree", "DFS"],
        description_md="""Given the `root` of a binary tree, invert the tree, and return its root.""",
        examples=[
            ProblemExample(input="root = [4,2,7,1,3,6,9]", output="[4,7,2,9,6,3,1]"),
            ProblemExample(input="root = [2,1,3]", output="[2,3,1]"),
            ProblemExample(input="root = []", output="[]"),
        ],
        constraints_md="""- The number of nodes in the tree is in the range `[0, 100]`.
- `-100 <= Node.val <= 100`""",
        function_name="invertTree",
        params=[FunctionParam(name="root", type=ParamType.TREE_NODE)],
        return_type=ParamType.TREE_NODE,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\nclass Solution:\n    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:\n        pass",
            "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.left = (left===undefined ? null : left)\n *     this.right = (right===undefined ? null : right)\n * }\n */\n/**\n * @param {TreeNode} root\n * @return {TreeNode}\n */\nvar invertTree = function(root) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[4, 2, 7, 1, 3, 6, 9]], expected=[4, 7, 2, 9, 6, 3, 1], is_example=True
            ),
            TestCase(input_args=[[2, 1, 3]], expected=[2, 3, 1], is_example=True),
            TestCase(input_args=[[]], expected=[], is_example=True),
            TestCase(input_args=[[1, 2]], expected=[1, None, 2], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: Recursive DFS

Swap `root.left` and `root.right`, then recursively invert children.

#### Complexity Analysis
- **Time:** $O(N)$
- **Space:** $O(H)$ recursion stack.""",
    ),
    CodingProblem(
        id="coding-easy-10",
        slug="lowest-common-ancestor-of-a-bst",
        number=10,
        title="Lowest Common Ancestor of a Binary Search Tree",
        difficulty=CodingDifficulty.EASY,
        topics=["Tree", "BST"],
        description_md="""Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.

According to the definition of LCA on Wikipedia: “The lowest common ancestor is defined between two nodes `p` and `q` as the lowest node in `T` that has both `p` and `q` as descendants (where we allow **a node to be a descendant of itself**).”""",
        examples=[
            ProblemExample(
                input="root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8",
                output="6",
                explanation="The LCA of nodes 2 and 8 is 6.",
            ),
            ProblemExample(
                input="root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4",
                output="2",
                explanation="The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself according to the LCA definition.",
            ),
        ],
        constraints_md="""- The number of nodes in the tree is in the range `[2, 10^5]`.
- `-10^9 <= Node.val <= 10^9`
- All `Node.val` are **unique**.
- `p != q` and `p` and `q` will exist in the BST.""",
        function_name="lowestCommonAncestor",
        params=[
            FunctionParam(name="root", type=ParamType.TREE_NODE),
            FunctionParam(name="p", type=ParamType.INT),
            FunctionParam(name="q", type=ParamType.INT),
        ],
        return_type=ParamType.INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, x):\n#         self.val = x\n#         self.left = None\n#         self.right = None\n\nclass Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        pass",
            "javascript": "/**\n * Definition for a binary tree node.\n * function TreeNode(val) {\n *     this.val = val;\n *     this.left = this.right = null;\n * }\n */\n/**\n * @param {TreeNode} root\n * @param {TreeNode} p\n * @param {TreeNode} q\n * @return {TreeNode}\n */\nvar lowestCommonAncestor = function(root, p, q) {\n    \n};",
        },
        test_cases=[
            TestCase(
                input_args=[[6, 2, 8, 0, 4, 7, 9, None, None, 3, 5], 2, 8],
                expected=6,
                is_example=True,
            ),
            TestCase(
                input_args=[[6, 2, 8, 0, 4, 7, 9, None, None, 3, 5], 2, 4],
                expected=2,
                is_example=True,
            ),
            TestCase(input_args=[[2, 1], 2, 1], expected=2, is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="""### Approach: BST Property

If both `p` and `q` are greater than `root.val`, LCA is in right subtree. If both are smaller, LCA is in left subtree. Otherwise, current node is the split point (LCA).

#### Complexity Analysis
- **Time:** $O(H)$ where $H$ is tree height.
- **Space:** $O(1)$ iterative.""",
    ),
]
