import json
import logging
from pathlib import Path
from typing import Any, cast

import httpx

from app.config import Settings
from app.repositories.coding_submissions import CodingSubmissionRepository
from app.schemas.coding import (
    CodingProblem,
    FirstFailureDetail,
    RunCodeResponse,
    RunResultItem,
    TestCase,
)
from app.schemas.common import (
    CodingLanguage,
    SubmissionStatus,
)
from app.services.coding.checkers import check_result

logger = logging.getLogger(__name__)

HARNESS_DIR = Path(__file__).parent / "harnesses"
PYTHON_PRELUDE = (HARNESS_DIR / "python" / "prelude.py").read_text(encoding="utf-8")
PYTHON_DRIVER_TPL = (HARNESS_DIR / "python" / "driver.py.tpl").read_text(encoding="utf-8")
JS_PRELUDE = (HARNESS_DIR / "javascript" / "prelude.js").read_text(encoding="utf-8")
JS_DRIVER_TPL = (HARNESS_DIR / "javascript" / "driver.js.tpl").read_text(encoding="utf-8")


class PistonClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def execute(
        self,
        language: str,
        files: list[dict[str, str]],
        stdin: str = "",
        compile_timeout_ms: int = 5000,
        run_timeout_ms: int = 3000,
        run_memory_limit: int = 536870912,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/execute"
        # Language alias mapping for Piston ("python" or "javascript")
        piston_lang = "python" if language == "python" else "javascript"
        safe_compile_timeout = min(compile_timeout_ms, 10000)
        safe_run_timeout = min(run_timeout_ms, 10000)
        payload = {
            "language": piston_lang,
            "version": "*",
            "files": files,
            "stdin": stdin,
            "compile_timeout": safe_compile_timeout,
            "run_timeout": safe_run_timeout,
            "run_memory_limit": run_memory_limit,
        }
        async with httpx.AsyncClient(timeout=safe_run_timeout / 1000.0 + 5.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code >= 400:
                logger.error("Piston returned %s: %s", resp.status_code, resp.text)
                try:
                    err_json = resp.json()
                    msg = err_json.get("message", resp.text)
                except Exception:
                    msg = resp.text
                raise RuntimeError(f"Piston execution error ({resp.status_code}): {msg}")
            return cast(dict[str, Any], resp.json())

    async def check_runtimes(self) -> list[dict[str, Any]]:
        url = f"{self.base_url}/runtimes"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return cast(list[dict[str, Any]], resp.json())


class JudgeService:
    def __init__(
        self,
        settings: Settings,
        piston_client: PistonClient,
        submissions: CodingSubmissionRepository | None = None,
    ) -> None:
        self.settings = settings
        self.piston = piston_client
        self.submissions = submissions

    def compose_code(
        self,
        problem: CodingProblem,
        language: CodingLanguage,
        user_code: str,
    ) -> tuple[str, str]:
        param_types = [
            p.type.value if hasattr(p.type, "value") else str(p.type) for p in problem.params
        ]
        return_type = (
            problem.return_type.value
            if hasattr(problem.return_type, "value")
            else str(problem.return_type)
        )
        return_index_str = str(problem.return_index) if problem.return_index is not None else "None"
        is_codec_str = (
            "True" if problem.slug == "serialize-and-deserialize-binary-tree" else "False"
        )

        if language == CodingLanguage.PYTHON:
            filename = "solution.py"
            driver = (
                PYTHON_DRIVER_TPL.replace("__PARAM_TYPES__", json.dumps(param_types))
                .replace("__RETURN_TYPE__", return_type)
                .replace("__FUNCTION_NAME__", problem.function_name)
                .replace("__RETURN_INDEX__", return_index_str)
                .replace("__IS_CODEC__", is_codec_str)
            )
            full_code = f"{PYTHON_PRELUDE}\n\n# User Code\n{user_code}\n\n# Driver\n{driver}"
        else:
            filename = "solution.js"
            driver = (
                JS_DRIVER_TPL.replace("__PARAM_TYPES__", json.dumps(param_types))
                .replace("__RETURN_TYPE__", return_type)
                .replace("__FUNCTION_NAME__", problem.function_name)
                .replace(
                    "__RETURN_INDEX__",
                    "null" if problem.return_index is None else str(problem.return_index),
                )
                .replace(
                    "__IS_CODEC__",
                    "true" if problem.slug == "serialize-and-deserialize-binary-tree" else "false",
                )
            )
            full_code = f"{JS_PRELUDE}\n\n// User Code\n{user_code}\n\n// Driver\n{driver}"

        return filename, full_code

    async def execute_run(
        self,
        problem: CodingProblem,
        language: CodingLanguage,
        user_code: str,
        test_cases: list[TestCase],
    ) -> RunCodeResponse:
        filename, full_code = self.compose_code(problem, language, user_code)
        stdin_payload = json.dumps({"cases": [tc.input_args for tc in test_cases]})

        try:
            piston_res = await self.piston.execute(
                language=language.value if hasattr(language, "value") else str(language),
                files=[{"name": filename, "content": full_code}],
                stdin=stdin_payload,
                compile_timeout_ms=self.settings.judge_compile_timeout_ms,
                run_timeout_ms=self.settings.judge_run_timeout_ms,
                run_memory_limit=self.settings.judge_memory_limit_bytes,
            )
        except Exception as e:
            logger.error("Judge execution error: %s", e)
            return RunCodeResponse(
                results=[],
                compile_error=f"Judge Service Error: {e}",
            )

        # Check compile stage
        compile_stage = piston_res.get("compile")
        if compile_stage and compile_stage.get("code") != 0:
            return RunCodeResponse(
                results=[],
                compile_error=compile_stage.get("stderr")
                or compile_stage.get("output")
                or "Compilation failed",
            )

        run_stage = piston_res.get("run", {})
        run_code = run_stage.get("code", 0)
        run_signal = run_stage.get("signal")
        run_stdout = run_stage.get("stdout", "")
        run_stderr = run_stage.get("stderr", "")

        # Signal check (TLE or OOM)
        if run_signal in ("SIGKILL", "SIGXCPU", "SIGTERM") or (run_code != 0 and not run_stdout):
            error_msg = run_stderr or f"Execution terminated (signal: {run_signal or run_code})"
            results = [
                RunResultItem(
                    index=i,
                    input_args=tc.input_args,
                    expected=tc.expected,
                    actual=None,
                    passed=False,
                    debug_output="",
                    error=error_msg,
                )
                for i, tc in enumerate(test_cases)
            ]
            return RunCodeResponse(results=results)

        # Parse protocol JSON lines
        lines = [line.strip() for line in run_stdout.split("\n") if line.strip()]
        parsed_results: dict[int, dict[str, Any]] = {}
        for line in lines:
            try:
                data = json.loads(line)
                if isinstance(data, dict) and "index" in data:
                    parsed_results[data["index"]] = data
            except json.JSONDecodeError:
                continue

        results = []
        for i, tc in enumerate(test_cases):
            case_data = parsed_results.get(i)
            if case_data is None:
                results.append(
                    RunResultItem(
                        index=i,
                        input_args=tc.input_args,
                        expected=tc.expected,
                        actual=None,
                        passed=False,
                        debug_output="",
                        error=run_stderr or "No output returned for this case",
                    )
                )
            elif "error" in case_data:
                results.append(
                    RunResultItem(
                        index=i,
                        input_args=tc.input_args,
                        expected=tc.expected,
                        actual=None,
                        passed=False,
                        debug_output=case_data.get("debugOutput", ""),
                        error=case_data["error"],
                        runtime_ms=case_data.get("runtimeMs"),
                    )
                )
            else:
                actual = case_data.get("result")
                passed = (
                    check_result(problem.checker, actual, tc.expected, tc.input_args)
                    if tc.expected is not None
                    else True
                )
                results.append(
                    RunResultItem(
                        index=i,
                        input_args=tc.input_args,
                        expected=tc.expected,
                        actual=actual,
                        passed=passed,
                        debug_output=case_data.get("debugOutput", ""),
                        runtime_ms=case_data.get("runtimeMs"),
                    )
                )

        return RunCodeResponse(results=results)

    async def judge_submission(
        self,
        submission_id: str,
        problem: CodingProblem,
        language: CodingLanguage,
        user_code: str,
    ) -> None:
        if not self.submissions:
            return

        filename, full_code = self.compose_code(problem, language, user_code)
        all_cases = problem.test_cases
        stdin_payload = json.dumps({"cases": [tc.input_args for tc in all_cases]})

        try:
            piston_res = await self.piston.execute(
                language=language.value if hasattr(language, "value") else str(language),
                files=[{"name": filename, "content": full_code}],
                stdin=stdin_payload,
                compile_timeout_ms=self.settings.judge_compile_timeout_ms,
                run_timeout_ms=self.settings.judge_run_timeout_ms,
                run_memory_limit=self.settings.judge_memory_limit_bytes,
            )
        except Exception as e:
            logger.error("Submission judge execution failed: %s", e)
            await self.submissions.update(
                submission_id,
                {
                    "status": SubmissionStatus.RUNTIME_ERROR.value,
                    "passed_count": 0,
                    "total_count": len(all_cases),
                    "compile_stderr": f"Judge error: {e}",
                },
            )
            return

        # Check compile stage
        compile_stage = piston_res.get("compile")
        if compile_stage and compile_stage.get("code") != 0:
            stderr = (
                compile_stage.get("stderr") or compile_stage.get("output") or "Compilation failed"
            )
            await self.submissions.update(
                submission_id,
                {
                    "status": SubmissionStatus.COMPILE_ERROR.value,
                    "passed_count": 0,
                    "total_count": len(all_cases),
                    "compile_stderr": stderr,
                },
            )
            return

        run_stage = piston_res.get("run", {})
        run_code = run_stage.get("code", 0)
        run_signal = run_stage.get("signal")
        run_stdout = run_stage.get("stdout", "")
        run_stderr = run_stage.get("stderr", "")

        # Signal check (TLE or OOM)
        if run_signal in ("SIGKILL", "SIGXCPU", "SIGTERM") or (run_code != 0 and not run_stdout):
            await self.submissions.update(
                submission_id,
                {
                    "status": SubmissionStatus.TIME_LIMIT_EXCEEDED.value,
                    "passed_count": 0,
                    "total_count": len(all_cases),
                    "compile_stderr": "Time Limit Exceeded",
                },
            )
            return

        # Parse protocol JSON lines
        lines = [line.strip() for line in run_stdout.split("\n") if line.strip()]
        parsed_results: dict[int, dict[str, Any]] = {}
        for line in lines:
            try:
                data = json.loads(line)
                if isinstance(data, dict) and "index" in data:
                    parsed_results[data["index"]] = data
            except json.JSONDecodeError:
                continue

        passed_count = 0
        max_runtime_ms = 0
        first_failure: FirstFailureDetail | None = None
        verdict = SubmissionStatus.ACCEPTED

        for i, tc in enumerate(all_cases):
            case_data = parsed_results.get(i)
            if case_data is None:
                if verdict == SubmissionStatus.ACCEPTED:
                    verdict = SubmissionStatus.RUNTIME_ERROR
                    first_failure = FirstFailureDetail(
                        input_args=tc.input_args,
                        expected=tc.expected,
                        error=run_stderr or "Execution terminated unexpectedly",
                    )
                break

            runtime = case_data.get("runtimeMs", 0)
            if runtime > max_runtime_ms:
                max_runtime_ms = runtime

            if "error" in case_data:
                if verdict == SubmissionStatus.ACCEPTED:
                    verdict = SubmissionStatus.RUNTIME_ERROR
                    first_failure = FirstFailureDetail(
                        input_args=tc.input_args,
                        expected=tc.expected,
                        debug_output=case_data.get("debugOutput", ""),
                        error=case_data["error"],
                    )
                break

            actual = case_data.get("result")
            passed = check_result(problem.checker, actual, tc.expected, tc.input_args)
            if passed:
                passed_count += 1
            else:
                if verdict == SubmissionStatus.ACCEPTED:
                    verdict = SubmissionStatus.WRONG_ANSWER
                    first_failure = FirstFailureDetail(
                        input_args=tc.input_args,
                        expected=tc.expected,
                        actual=actual,
                        debug_output=case_data.get("debugOutput", ""),
                    )
                break

        await self.submissions.update(
            submission_id,
            {
                "status": verdict.value,
                "passed_count": passed_count,
                "total_count": len(all_cases),
                "runtime_ms": max_runtime_ms,
                "first_failure": first_failure.model_dump(by_alias=True) if first_failure else None,
            },
        )
