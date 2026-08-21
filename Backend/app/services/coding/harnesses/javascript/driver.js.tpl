const fs = require("fs");

const originalStdoutWrite = process.stdout.write.bind(process.stdout);

function findNode(root, val) {
  if (!root) return null;
  if (root.val === val) return root;
  const left = findNode(root.left, val);
  if (left) return left;
  return findNode(root.right, val);
}

function deserializeArg(arg, paramType) {
  if (arg === null || arg === undefined) return null;
  if (paramType === "list_node") return listToNode(arg);
  if (paramType === "tree_node") return treeFromList(arg);
  if (paramType === "list_list_node_nullable") {
    return arg.map((item) => (item !== null && item !== undefined ? listToNode(item) : null));
  }
  return arg;
}

function serializeRet(ret, returnType) {
  if (ret === null || ret === undefined) return null;
  if (returnType === "list_node") return nodeToList(ret);
  if (returnType === "tree_node") return treeToList(ret);
  if (returnType === "list_list_node_nullable") {
    return ret.map((item) => (item !== null && item !== undefined ? nodeToList(item) : null));
  }
  return ret;
}

function runAll() {
  const paramTypes = __PARAM_TYPES__;
  const returnType = "__RETURN_TYPE__";
  const functionName = "__FUNCTION_NAME__";
  const returnIndex = __RETURN_INDEX__;
  const isCodec = __IS_CODEC__;

  let rawInput = "";
  try {
    rawInput = fs.readFileSync(0, "utf-8").trim();
  } catch (e) {
    return;
  }
  if (!rawInput) return;

  const data = JSON.parse(rawInput);
  const cases = data.cases || [];

  for (let i = 0; i < cases.length; i++) {
    const caseArgs = cases[i];
    let debugLogs = [];
    const origLog = console.log;
    console.log = (...args) => {
      debugLogs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    };

    const startTime = process.hrtime.bigint();
    try {
      let result;
      if (isCodec) {
        const root = treeFromList(caseArgs[0]);
        const serialized = serialize(root);
        const deserialized = deserialize(serialized);
        result = treeToList(deserialized);
      } else if (functionName === "lowestCommonAncestor" && caseArgs.length === 3) {
        const root = treeFromList(caseArgs[0]);
        const pVal = caseArgs[1];
        const qVal = caseArgs[2];
        const pNode = findNode(root, pVal) || new TreeNode(pVal);
        const qNode = findNode(root, qVal) || new TreeNode(qVal);
        const fn = typeof lowestCommonAncestor === "function" ? lowestCommonAncestor : (new Solution()).lowestCommonAncestor;
        const ret = fn(root, pNode, qNode);
        result = ret ? ret.val : null;
      } else {
        const deserializedArgs = caseArgs.map((arg, idx) =>
          idx < paramTypes.length ? deserializeArg(arg, paramTypes[idx]) : arg
        );
        let fn;
        if (typeof globalThis[functionName] === "function") {
          fn = globalThis[functionName];
        } else if (typeof eval === "function") {
          try {
            fn = eval(functionName);
          } catch (e) {}
        }
        if (!fn && typeof Solution === "function") {
          const solInstance = new Solution();
          if (typeof solInstance[functionName] === "function") {
            fn = solInstance[functionName].bind(solInstance);
          }
        }
        if (!fn) {
          throw new Error(`Function ${functionName} is not defined`);
        }

        const ret = fn(...deserializedArgs);
        if (returnIndex !== null && returnIndex !== undefined) {
          result = serializeRet(deserializedArgs[returnIndex], returnType);
        } else {
          result = serializeRet(ret, returnType);
        }
      }

      console.log = origLog;
      const endTime = process.hrtime.bigint();
      const elapsedMs = Number((endTime - startTime) / BigInt(1000000));
      const line = JSON.stringify({
        index: i,
        result: result,
        debugOutput: debugLogs.join("\n"),
        runtimeMs: elapsedMs,
      });
      originalStdoutWrite(line + "\n");
    } catch (err) {
      console.log = origLog;
      const endTime = process.hrtime.bigint();
      const elapsedMs = Number((endTime - startTime) / BigInt(1000000));
      const line = JSON.stringify({
        index: i,
        error: err && err.message ? err.message : String(err),
        debugOutput: debugLogs.join("\n"),
        runtimeMs: elapsedMs,
      });
      originalStdoutWrite(line + "\n");
    }
  }
}

runAll();
