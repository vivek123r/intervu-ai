function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

function TreeNode(val, left, right) {
  this.val = val === undefined ? 0 : val;
  this.left = left === undefined ? null : left;
  this.right = right === undefined ? null : right;
}

function listToNode(vals) {
  if (!vals || vals.length === 0) return null;
  const dummy = new ListNode(0);
  let curr = dummy;
  for (const v of vals) {
    curr.next = new ListNode(v);
    curr = curr.next;
  }
  return dummy.next;
}

function nodeToList(head) {
  const result = [];
  let curr = head;
  const visited = new Set();
  while (curr !== null && curr !== undefined) {
    if (visited.has(curr)) break;
    visited.add(curr);
    result.push(curr.val);
    curr = curr.next;
  }
  return result;
}

function treeFromList(vals) {
  if (!vals || vals.length === 0 || vals[0] === null || vals[0] === undefined) return null;
  const root = new TreeNode(vals[0]);
  const queue = [root];
  let i = 1;
  while (queue.length > 0 && i < vals.length) {
    const curr = queue.shift();
    if (i < vals.length) {
      const val = vals[i++];
      if (val !== null && val !== undefined) {
        curr.left = new TreeNode(val);
        queue.push(curr.left);
      }
    }
    if (i < vals.length) {
      const val = vals[i++];
      if (val !== null && val !== undefined) {
        curr.right = new TreeNode(val);
        queue.push(curr.right);
      }
    }
  }
  return root;
}

function treeToList(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node) {
      result.push(node.val);
      queue.push(node.left);
      queue.push(node.right);
    } else {
      result.push(null);
    }
  }
  while (result.length > 0 && result[result.length - 1] === null) {
    result.pop();
  }
  return result;
}
