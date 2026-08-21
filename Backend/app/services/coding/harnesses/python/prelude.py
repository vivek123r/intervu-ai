from __future__ import annotations

import collections


class ListNode:
    def __init__(self, val: int = 0, next: ListNode | None = None):
        self.val = val
        self.next = next

    def __repr__(self) -> str:
        return f"ListNode({self.val})"


class TreeNode:
    def __init__(
        self,
        val: int = 0,
        left: TreeNode | None = None,
        right: TreeNode | None = None,
    ):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self) -> str:
        return f"TreeNode({self.val})"


def list_to_node(vals: list[int] | None) -> ListNode | None:
    if not vals:
        return None
    dummy = ListNode(0)
    curr = dummy
    for v in vals:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next


def node_to_list(head: ListNode | None) -> list[int]:
    result = []
    curr = head
    visited = set()
    while curr is not None:
        if id(curr) in visited:
            break  # Cycle detected guard
        visited.add(id(curr))
        result.append(curr.val)
        curr = curr.next
    return result


def tree_from_list(vals: list[int | None] | None) -> TreeNode | None:
    if not vals:
        return None
    root_val = vals[0]
    if root_val is None:
        return None
    root = TreeNode(root_val)
    queue = collections.deque([root])
    i = 1
    n = len(vals)
    while queue and i < n:
        curr = queue.popleft()
        if i < n:
            val = vals[i]
            i += 1
            if val is not None:
                curr.left = TreeNode(val)
                queue.append(curr.left)
        if i < n:
            val = vals[i]
            i += 1
            if val is not None:
                curr.right = TreeNode(val)
                queue.append(curr.right)
    return root


def tree_to_list(root: TreeNode | None) -> list[int | None]:
    if not root:
        return []
    result: list[int | None] = []
    queue: collections.deque[TreeNode | None] = collections.deque([root])
    while queue:
        node = queue.popleft()
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result
