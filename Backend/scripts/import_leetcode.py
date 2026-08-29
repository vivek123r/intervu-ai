"""LeetCode Dataset Ingestion Script.

Downloads and normalizes the full LeetCode problems dataset from
https://github.com/neenza/leetcode-problems into Intervu AI's MongoDB database.

Usage:
  uv run python -m scripts.import_leetcode
  uv run python -m scripts.import_leetcode --limit 100
"""

import argparse
import ast
import asyncio
import contextlib
import json
import logging
import re
from pathlib import Path
from typing import Any

import httpx

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo
from app.schemas.common import CheckerKind, CodingDifficulty, ParamType

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("import_leetcode")

DATASET_URL = (
    "https://raw.githubusercontent.com/neenza/leetcode-problems/master/merged_problems.json"
)
CACHE_DIR = Path(__file__).resolve().parent.parent / ".data"
CACHE_FILE = CACHE_DIR / "leetcode_problems.json"


def map_type_to_param_type(type_str: str) -> ParamType:
    """Map string representation of Python/LeetCode type annotation to ParamType enum."""
    t = type_str.strip().lower()
    # Normalize Optional[...] and Union[..., None]
    t = re.sub(r"optional\[(.*)\]", r"\1", t)
    t = re.sub(r"union\[(.*),\s*none\]", r"\1", t)
    t = re.sub(r"union\[none,\s*(.*)\]", r"\1", t)
    t = t.replace("typing.", "").strip()

    if t in ("int", "integer"):
        return ParamType.INT
    if t in ("float", "double"):
        return ParamType.FLOAT
    if t in ("str", "string"):
        return ParamType.STRING
    if t in ("bool", "boolean"):
        return ParamType.BOOLEAN
    if t in ("list[int]", "list_int", "vector<int>"):
        return ParamType.LIST_INT
    if t in ("list[float]", "list_float", "vector<double>", "vector<float>"):
        return ParamType.LIST_FLOAT
    if t in ("list[str]", "list[string]", "list_string", "vector<string>"):
        return ParamType.LIST_STRING
    if t in ("list[bool]", "list_boolean", "vector<bool>"):
        return ParamType.LIST_BOOLEAN
    if t in ("list[list[int]]", "list_list_int", "vector<vector<int>>"):
        return ParamType.LIST_LIST_INT
    if t in ("list[list[str]]", "list[list[string]]", "list_list_string", "vector<vector<string>>"):
        return ParamType.LIST_LIST_STRING
    if "listnode" in t and ("list[listnode]" in t or "list[optional[listnode]]" in t):
        return ParamType.LIST_LIST_NODE_NULLABLE
    if "listnode" in t:
        return ParamType.LIST_NODE
    if "treenode" in t:
        return ParamType.TREE_NODE

    # Fallback heuristics
    if "list[list[" in t or "[][]" in t:
        return ParamType.LIST_LIST_INT
    if "list[" in t or "[]" in t or "vector" in t:
        return ParamType.LIST_INT
    return ParamType.STRING


def extract_python_sig(python3_code: str) -> tuple[str, list[dict[str, Any]], ParamType, int | None]:
    """Parse python3 starter snippet AST to extract function_name, params, return_type, and return_index."""
    fn_name = "solve"
    params: list[dict[str, Any]] = []
    return_type = ParamType.STRING
    return_index: int | None = None

    if not python3_code or not python3_code.strip():
        return fn_name, params, return_type, return_index

    try:
        # Wrap in pass if function body is empty
        code_to_parse = python3_code
        if not re.search(r"pass|\.\.\.|return", code_to_parse):
            code_to_parse += "\n        pass"

        tree = ast.parse(code_to_parse)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name != "__init__":
                fn_name = node.name
                for arg in node.args.args:
                    if arg.arg == "self":
                        continue
                    arg_name = arg.arg
                    arg_type_str = ast.unparse(arg.annotation) if arg.annotation else "str"
                    p_type = map_type_to_param_type(arg_type_str)
                    params.append({"name": arg_name, "type": p_type.value})

                if node.returns:
                    ret_str = ast.unparse(node.returns).strip()
                    if ret_str in ("None", "NoneType"):
                        # In-place modification (e.g. rotate array, move zeroes)
                        return_index = 0
                        return_type = (
                            ParamType(params[0]["type"]) if params else ParamType.STRING
                        )
                    else:
                        return_type = map_type_to_param_type(ret_str)
                break
    except Exception as e:
        logger.debug("AST signature parsing fallback for %s: %s", python3_code[:30], e)
        # Regex fallback
        match = re.search(r"def\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*,\s*([^)]*)\)", python3_code)
        if match:
            fn_name = match.group(1)
            raw_args = match.group(2).split(",")
            for raw_arg in raw_args:
                parts = raw_arg.strip().split(":")
                if parts and parts[0].strip():
                    p_name = parts[0].strip()
                    p_type = map_type_to_param_type(parts[1] if len(parts) > 1 else "str")
                    params.append({"name": p_name, "type": p_type.value})

    return fn_name, params, return_type, return_index


def parse_literal_value(raw_val: str) -> Any:
    """Safely parse literal value string from example."""
    clean = raw_val.strip()
    if clean.lower() == "true":
        return True
    if clean.lower() == "false":
        return False
    if clean.lower() == "null" or clean.lower() == "none":
        return None

    try:
        return json.loads(clean)
    except Exception:
        pass

    try:
        return ast.literal_eval(clean)
    except Exception:
        pass

    # Remove quotes if present
    if (clean.startswith('"') and clean.endswith('"')) or (clean.startswith("'") and clean.endswith("'")):
        return clean[1:-1]
    return clean


def parse_example_block(example_text: str, param_names: list[str]) -> tuple[list[Any], Any, str | None]:
    """Extract input_args, expected output, and explanation from example text."""
    input_args: list[Any] = []
    expected: Any = None
    explanation: str | None = None

    lines = [item.strip() for item in example_text.split("\n") if item.strip()]
    input_str = ""
    output_str = ""
    explanation_parts: list[str] = []

    for line in lines:
        if line.startswith("Input:") or line.startswith("input:"):
            input_str = line.split(":", 1)[1].strip()
        elif line.startswith("Output:") or line.startswith("output:"):
            output_str = line.split(":", 1)[1].strip()
        elif line.startswith("Explanation:") or line.startswith("explanation:"):
            explanation_parts.append(line.split(":", 1)[1].strip())
        elif explanation_parts:
            explanation_parts.append(line)

    if explanation_parts:
        explanation = " ".join(explanation_parts)

    # Parse output
    if output_str:
        expected = parse_literal_value(output_str)

    # Parse input args
    if input_str:
        # Match parameter assignments like `nums = [2,7,11,15], target = 9`
        # Split by top-level commas outside of brackets/quotes
        arg_tokens = []
        current = []
        depth = 0
        in_quote = False
        quote_char = ""

        for char in input_str:
            if char in ('"', "'") and not in_quote:
                in_quote = True
                quote_char = char
            elif in_quote and char == quote_char:
                in_quote = False
            elif not in_quote:
                if char in ("[", "(", "{"):
                    depth += 1
                elif char in ("]", ")", "}"):
                    depth -= 1
                elif char == "," and depth == 0:
                    arg_tokens.append("".join(current).strip())
                    current = []
                    continue
            current.append(char)
        if current:
            arg_tokens.append("".join(current).strip())

        for token in arg_tokens:
            if "=" in token:
                val_part = token.split("=", 1)[1].strip()
                input_args.append(parse_literal_value(val_part))
            else:
                input_args.append(parse_literal_value(token))

    return input_args, expected, explanation


async def download_dataset(force_download: bool = False) -> list[dict[str, Any]]:
    """Download or load cached merged_problems.json."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if CACHE_FILE.exists() and not force_download:
        logger.info("Loading cached dataset from %s", CACHE_FILE)
        with open(CACHE_FILE, encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            if isinstance(data, list):
                return data

    logger.info("Downloading LeetCode problems dataset from %s...", DATASET_URL)
    async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
        resp = await client.get(DATASET_URL)
        resp.raise_for_status()
        raw_text = resp.text

    logger.info("Saving dataset cache to %s (%d MB)", CACHE_FILE, len(raw_text) // (1024 * 1024))
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        f.write(raw_text)

    data = json.loads(raw_text)
    if isinstance(data, dict) and "questions" in data:
        return data["questions"]
    if isinstance(data, list):
        return data
    raise ValueError("Unexpected dataset JSON format")


def transform_problem(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Transform raw neenza problem item to Intervu AI CodingProblem dictionary."""
    slug = raw.get("problem_slug") or raw.get("slug")
    if not slug:
        return None

    frontend_id_str = str(raw.get("frontend_id") or raw.get("problem_id") or "0")
    try:
        number = int(frontend_id_str)
    except ValueError:
        number = 0

    title = raw.get("title") or slug.replace("-", " ").title()
    raw_diff = str(raw.get("difficulty") or "Medium").strip().lower()
    difficulty = (
        CodingDifficulty.EASY.value
        if raw_diff == "easy"
        else CodingDifficulty.HARD.value
        if raw_diff == "hard"
        else CodingDifficulty.MEDIUM.value
    )

    topics = list(raw.get("topics") or [])
    description_md = str(raw.get("description") or "").strip()

    constraints_list = list(raw.get("constraints") or [])
    constraints_md = (
        "\n".join(f"- `{c}`" if not c.startswith("-") else c for c in constraints_list)
        if constraints_list
        else "- `1 <= n <= 10^5`"
    )

    code_snippets = raw.get("code_snippets") or {}
    py_code = code_snippets.get("python3") or code_snippets.get("python") or ""
    js_code = code_snippets.get("javascript") or code_snippets.get("typescript") or ""

    fn_name, params, return_type, return_index = extract_python_sig(py_code)
    param_names = [p["name"] for p in params]

    # Process examples and test cases
    raw_examples = raw.get("examples") or []
    examples: list[dict[str, Any]] = []
    test_cases: list[dict[str, Any]] = []

    for ex in raw_examples:
        ex_text = ex.get("example_text") or ""
        if not ex_text:
            continue
        inp_args, expected, explanation = parse_example_block(ex_text, param_names)

        # Formulate formatted string for examples
        inp_str_repr = (
            ", ".join(f"{p} = {json.dumps(a)}" for p, a in zip(param_names, inp_args, strict=False))
            if inp_args
            else ex_text
        )
        out_str_repr = json.dumps(expected) if expected is not None else ""

        ex_dict: dict[str, Any] = {
            "input": inp_str_repr,
            "output": out_str_repr,
        }
        if explanation:
            ex_dict["explanation"] = explanation
        examples.append(ex_dict)

        if inp_args:
            test_cases.append({
                "input_args": inp_args,
                "expected": expected,
                "is_example": True,
            })

    # Starter codes
    starter_code: dict[str, str] = {}
    if py_code:
        starter_code["python"] = py_code
    else:
        param_sig = ", ".join(f"{p['name']}: {p['type']}" for p in params)
        starter_code["python"] = f"class Solution:\n    def {fn_name}(self, {param_sig}) -> {return_type.value}:\n        pass"

    if js_code:
        starter_code["javascript"] = js_code
    else:
        js_params = ", ".join(param_names)
        starter_code["javascript"] = f"/**\n * @return {{{return_type.value}}}\n */\nvar {fn_name} = function({js_params}) {{\n    \n}};"

    # Hints & Editorial
    hints = list(raw.get("hints") or [])
    solutions_html = str(raw.get("solutions") or "").strip()
    editorial_parts = []
    if hints:
        editorial_parts.append("### Hints\n" + "\n".join(f"- {h}" for h in hints))
    if solutions_html:
        editorial_parts.append("### Approach & Solution\n" + solutions_html)
    if not editorial_parts:
        editorial_parts.append("### Approach\nAnalyze time & space complexity, considering optimal data structures.")
    editorial_md = "\n\n".join(editorial_parts)

    problem_doc: dict[str, Any] = {
        "_id": f"lc-{number}" if number > 0 else f"lc-{slug}",
        "slug": slug,
        "number": number,
        "title": title,
        "difficulty": difficulty,
        "topics": topics,
        "description_md": description_md,
        "examples": examples,
        "constraints_md": constraints_md,
        "function_name": fn_name,
        "params": params,
        "return_type": return_type.value,
        "checker": CheckerKind.EXACT.value,
        "starter_code": starter_code,
        "test_cases": test_cases,
        "time_limit_ms": 2000,
        "editorial_md": editorial_md,
    }
    if return_index is not None:
        problem_doc["return_index"] = return_index

    return problem_doc


async def import_leetcode_problems(limit: int | None = None, force_download: bool = False) -> int:
    """Download, parse, and upsert all LeetCode problems into MongoDB."""
    settings = get_settings()
    mongo.connect(settings)
    with contextlib.suppress(Exception):
        await mongo.db.coding_problems.drop_index("number_1")
    await ensure_indexes(mongo.db)

    raw_questions = await download_dataset(force_download=force_download)
    total_raw = len(raw_questions)
    logger.info("Loaded %d raw LeetCode problems from dataset.", total_raw)

    if limit and limit > 0:
        raw_questions = raw_questions[:limit]

    collection = mongo.db["coding_problems"]
    upserted_count = 0
    skipped_count = 0

    batch_docs: list[dict[str, Any]] = []

    for raw in raw_questions:
        try:
            doc = transform_problem(raw)
            if not doc:
                skipped_count += 1
                continue

            batch_docs.append(doc)
        except Exception as e:
            logger.warning("Error transforming problem %s: %s", raw.get("problem_slug"), e)
            skipped_count += 1

    logger.info("Transformed %d problems successfully. Upserting into MongoDB...", len(batch_docs))

    # Perform batch upserts
    for idx, doc in enumerate(batch_docs):
        doc_copy = dict(doc)
        doc_id = doc_copy.pop("_id")
        await collection.update_one(
            {"slug": doc["slug"]},
            {"$set": doc_copy, "$setOnInsert": {"_id": doc_id}},
            upsert=True,
        )
        upserted_count += 1
        if (idx + 1) % 250 == 0 or (idx + 1) == len(batch_docs):
            logger.info("Progress: %d/%d problems upserted...", idx + 1, len(batch_docs))

    total_in_db = await collection.count_documents({})
    logger.info("✅ Finished! Upserted %d problems (Skipped %d). Total in DB: %d", upserted_count, skipped_count, total_in_db)

    mongo.close()
    return upserted_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Import LeetCode dataset into Intervu AI")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of problems to import (for testing)")
    parser.add_argument("--force-download", "-f", action="store_true", help="Force re-downloading merged_problems.json")
    args = parser.parse_args()

    asyncio.run(import_leetcode_problems(limit=args.limit, force_download=args.force_download))


if __name__ == "__main__":
    main()
