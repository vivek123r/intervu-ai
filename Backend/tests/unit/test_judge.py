from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.config import Settings
from app.schemas.coding import CodingProblem, FunctionParam, ProblemExample, TestCase
from app.schemas.common import (
    CheckerKind,
    CodingDifficulty,
    CodingLanguage,
    ParamType,
    SubmissionStatus,
)
from app.services.coding.judge import JudgeService, PistonClient


class FakePistonClient(PistonClient):
    def __init__(self, execute_result: dict[str, Any] | None = None) -> None:
        super().__init__("http://fake-piston:2000")
        self.execute_result = execute_result or {}
        self.last_execute_call: dict[str, Any] = {}

    async def execute(
        self,
        language: str,
        files: list[dict[str, str]],
        stdin: str = "",
        compile_timeout_ms: int = 10000,
        run_timeout_ms: int = 20000,
        run_memory_limit: int = 536870912,
    ) -> dict[str, Any]:
        self.last_execute_call = {
            "language": language,
            "files": files,
            "stdin": stdin,
        }
        return self.execute_result


@pytest.fixture
def sample_problem() -> CodingProblem:
    return CodingProblem(
        id="p1",
        slug="two-sum",
        number=1,
        title="Two Sum",
        difficulty=CodingDifficulty.EASY,
        topics=["Array", "Hash Table"],
        description_md="Given an array of integers `nums` and an integer `target`...",
        examples=[ProblemExample(input="nums = [2,7,11,15], target = 9", output="[0,1]")],
        constraints_md="2 <= nums.length <= 10^4",
        function_name="twoSum",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="target", type=ParamType.INT),
        ],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
            "javascript": "var twoSum = function(nums, target) {\n    \n};",
        },
        test_cases=[
            TestCase(input_args=[[2, 7, 11, 15], 9], expected=[0, 1], is_example=True),
            TestCase(input_args=[[3, 2, 4], 6], expected=[1, 2], is_example=True),
            TestCase(input_args=[[3, 3], 6], expected=[0, 1], is_example=False),
        ],
        time_limit_ms=2000,
        editorial_md="# Two Sum Editorial",
    )


@pytest.mark.asyncio
async def test_compose_code_python(sample_problem: CodingProblem):
    settings = Settings()
    judge = JudgeService(settings, FakePistonClient())
    user_code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]"
    filename, code = judge.compose_code(sample_problem, CodingLanguage.PYTHON, user_code)

    assert filename == "solution.py"
    assert "class ListNode:" in code
    assert "class Solution:" in code
    assert "twoSum" in code
    assert "__PARAM_TYPES__" not in code


@pytest.mark.asyncio
async def test_compose_code_javascript(sample_problem: CodingProblem):
    settings = Settings()
    judge = JudgeService(settings, FakePistonClient())
    user_code = "var twoSum = function(nums, target) { return [0, 1]; };"
    filename, code = judge.compose_code(sample_problem, CodingLanguage.JAVASCRIPT, user_code)

    assert filename == "solution.js"
    assert "function ListNode" in code
    assert "var twoSum =" in code
    assert "__PARAM_TYPES__" not in code


@pytest.mark.asyncio
async def test_execute_run_success(sample_problem: CodingProblem):
    fake_piston = FakePistonClient(
        {
            "compile": {"code": 0},
            "run": {
                "code": 0,
                "stdout": '{"index": 0, "result": [0, 1], "debugOutput": "hi", "runtimeMs": 5}\n{"index": 1, "result": [1, 2], "debugOutput": "", "runtimeMs": 3}\n',
            },
        }
    )
    settings = Settings()
    judge = JudgeService(settings, fake_piston)

    test_cases = sample_problem.test_cases[:2]
    res = await judge.execute_run(
        sample_problem,
        CodingLanguage.PYTHON,
        "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
        test_cases,
    )

    assert res.compile_error is None
    assert len(res.results) == 2
    assert res.results[0].passed is True
    assert res.results[0].debug_output == "hi"
    assert res.results[1].passed is True


@pytest.mark.asyncio
async def test_execute_run_compile_error(sample_problem: CodingProblem):
    fake_piston = FakePistonClient(
        {
            "compile": {"code": 1, "stderr": "SyntaxError: invalid syntax"},
            "run": {},
        }
    )
    settings = Settings()
    judge = JudgeService(settings, fake_piston)

    res = await judge.execute_run(
        sample_problem,
        CodingLanguage.PYTHON,
        "def twoSum invalid syntax",
        sample_problem.test_cases[:1],
    )

    assert res.compile_error == "SyntaxError: invalid syntax"
    assert len(res.results) == 0


@pytest.mark.asyncio
async def test_execute_run_runtime_error(sample_problem: CodingProblem):
    fake_piston = FakePistonClient(
        {
            "compile": {"code": 0},
            "run": {
                "code": 0,
                "stdout": '{"index": 0, "error": "ZeroDivisionError: division by zero", "debugOutput": ""}\n',
            },
        }
    )
    settings = Settings()
    judge = JudgeService(settings, fake_piston)

    res = await judge.execute_run(
        sample_problem,
        CodingLanguage.PYTHON,
        "class Solution:\n    def twoSum(self, nums, target):\n        1/0",
        sample_problem.test_cases[:1],
    )

    assert res.compile_error is None
    assert len(res.results) == 1
    assert res.results[0].passed is False
    assert "ZeroDivisionError" in str(res.results[0].error)


@pytest.mark.asyncio
async def test_judge_submission_accepted(sample_problem: CodingProblem):
    fake_piston = FakePistonClient(
        {
            "compile": {"code": 0},
            "run": {
                "code": 0,
                "stdout": '{"index": 0, "result": [0, 1], "runtimeMs": 4}\n{"index": 1, "result": [1, 2], "runtimeMs": 6}\n{"index": 2, "result": [0, 1], "runtimeMs": 3}\n',
            },
        }
    )
    submissions_mock = AsyncMock()
    settings = Settings()
    judge = JudgeService(settings, fake_piston, submissions=submissions_mock)

    await judge.judge_submission(
        "sub-123",
        sample_problem,
        CodingLanguage.PYTHON,
        "code...",
    )

    submissions_mock.update.assert_called_once()
    call_args = submissions_mock.update.call_args[0]
    assert call_args[0] == "sub-123"
    updates = call_args[1]
    assert updates["status"] == SubmissionStatus.ACCEPTED.value
    assert updates["passed_count"] == 3
    assert updates["total_count"] == 3


@pytest.mark.asyncio
async def test_judge_submission_wrong_answer(sample_problem: CodingProblem):
    fake_piston = FakePistonClient(
        {
            "compile": {"code": 0},
            "run": {
                "code": 0,
                "stdout": '{"index": 0, "result": [0, 1], "runtimeMs": 4}\n{"index": 1, "result": [99, 99], "runtimeMs": 5}\n',
            },
        }
    )
    submissions_mock = AsyncMock()
    settings = Settings()
    judge = JudgeService(settings, fake_piston, submissions=submissions_mock)

    await judge.judge_submission(
        "sub-123",
        sample_problem,
        CodingLanguage.PYTHON,
        "code...",
    )

    submissions_mock.update.assert_called_once()
    updates = submissions_mock.update.call_args[0][1]
    assert updates["status"] == SubmissionStatus.WRONG_ANSWER.value
    assert updates["passed_count"] == 1
    assert updates["first_failure"]["expected"] == [1, 2]
    assert updates["first_failure"]["actual"] == [99, 99]
