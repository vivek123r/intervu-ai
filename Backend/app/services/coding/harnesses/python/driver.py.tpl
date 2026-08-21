import contextlib
import io
import json
import sys
import time
import traceback

def __find_node(root, val):
    if not root:
        return None
    if root.val == val:
        return root
    left = __find_node(root.left, val)
    if left:
        return left
    return __find_node(root.right, val)

def __deserialize_arg(arg, param_type):
    if arg is None:
        return None
    if param_type == "list_node":
        return list_to_node(arg)
    if param_type == "tree_node":
        return tree_from_list(arg)
    if param_type == "list_list_node_nullable":
        return [list_to_node(item) if item is not None else None for item in arg]
    return arg

def __serialize_ret(ret, return_type):
    if ret is None:
        return None
    if return_type == "list_node":
        return node_to_list(ret)
    if return_type == "tree_node":
        return tree_to_list(ret)
    if return_type == "list_list_node_nullable":
        return [node_to_list(item) if item is not None else None for item in ret]
    return ret

def __run_all():
    param_types = __PARAM_TYPES__
    return_type = "__RETURN_TYPE__"
    function_name = "__FUNCTION_NAME__"
    return_index = __RETURN_INDEX__
    is_codec = __IS_CODEC__

    raw_input = sys.stdin.read().strip()
    if not raw_input:
        return
    data = json.loads(raw_input)
    cases = data.get("cases", [])

    for i, case_args in enumerate(cases):
        stdout_buf = io.StringIO()
        start_time = time.perf_counter()
        try:
            with contextlib.redirect_stdout(stdout_buf):
                if is_codec:
                    codec = Codec()
                    root = tree_from_list(case_args[0])
                    serialized = codec.serialize(root)
                    deserialized = codec.deserialize(serialized)
                    result = tree_to_list(deserialized)
                elif function_name == "lowestCommonAncestor" and len(case_args) == 3:
                    root = tree_from_list(case_args[0])
                    p_val = case_args[1]
                    q_val = case_args[2]
                    p_node = __find_node(root, p_val) or TreeNode(p_val)
                    q_node = __find_node(root, q_val) or TreeNode(q_val)
                    sol = Solution()
                    ret = sol.lowestCommonAncestor(root, p_node, q_node)
                    result = ret.val if ret else None
                else:
                    deserialized_args = [
                        __deserialize_arg(arg, param_types[idx]) if idx < len(param_types) else arg
                        for idx, arg in enumerate(case_args)
                    ]
                    sol = Solution()
                    fn = getattr(sol, function_name)
                    ret = fn(*deserialized_args)
                    if return_index is not None:
                        result = __serialize_ret(deserialized_args[return_index], return_type)
                    else:
                        result = __serialize_ret(ret, return_type)
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            line = json.dumps({
                "index": i,
                "result": result,
                "debugOutput": stdout_buf.getvalue(),
                "runtimeMs": elapsed_ms
            })
            sys.__stdout__.write(line + "\n")
            sys.__stdout__.flush()
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            err_msg = f"{type(e).__name__}: {e}"
            line = json.dumps({
                "index": i,
                "error": err_msg,
                "debugOutput": stdout_buf.getvalue(),
                "runtimeMs": elapsed_ms
            })
            sys.__stdout__.write(line + "\n")
            sys.__stdout__.flush()

if __name__ == "__main__":
    __run_all()
