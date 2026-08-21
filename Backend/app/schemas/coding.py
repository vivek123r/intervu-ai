from typing import Any, ClassVar, Literal

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import (
    CheckerKind,
    CodingDifficulty,
    CodingLanguage,
    ParamType,
    SubmissionStatus,
)


class TestCase(CamelModel):
    __test__ = False
    input_args: list[Any]
    expected: Any
    is_example: bool = False


class FunctionParam(CamelModel):
    name: str
    type: ParamType


class ProblemExample(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"explanation"})

    input: str
    output: str
    explanation: str | None = None


class CodingProblem(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"return_index"})

    id: str
    slug: str
    number: int
    title: str
    difficulty: CodingDifficulty
    topics: list[str]
    description_md: str
    examples: list[ProblemExample]
    constraints_md: str
    function_name: str
    params: list[FunctionParam]
    return_type: ParamType
    return_index: int | None = None
    checker: CheckerKind = CheckerKind.EXACT
    starter_code: dict[str, str]
    test_cases: list[TestCase]
    time_limit_ms: int = 2000
    editorial_md: str


class ProblemSummary(CamelModel):
    slug: str
    number: int
    title: str
    difficulty: CodingDifficulty
    topics: list[str]
    acceptance_rate: float
    status: Literal["solved", "attempted", "todo"]


class ProblemDetail(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"return_index"})

    id: str
    slug: str
    number: int
    title: str
    difficulty: CodingDifficulty
    topics: list[str]
    description_md: str
    examples: list[ProblemExample]
    constraints_md: str
    function_name: str
    params: list[FunctionParam]
    return_type: ParamType
    return_index: int | None = None
    starter_code: dict[str, str]
    test_cases: list[TestCase]
    time_limit_ms: int
    editorial_md: str
    user_status: Literal["solved", "attempted", "todo"] = "todo"


class ProblemListResponse(CamelModel):
    items: list[ProblemSummary]
    total: int


class TopicCount(CamelModel):
    name: str
    count: int


class FirstFailureDetail(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"actual", "error"})

    input_args: list[Any]
    expected: Any
    actual: Any | None = None
    debug_output: str = ""
    error: str | None = None


class CodingSubmission(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset(
        {"runtime_ms", "compile_stderr", "first_failure"}
    )

    id: str
    user_id: str
    problem_slug: str
    language: CodingLanguage
    code: str
    status: SubmissionStatus
    passed_count: int
    total_count: int
    runtime_ms: int | None = None
    compile_stderr: str | None = None
    first_failure: FirstFailureDetail | None = None
    created_at: UtcDatetime


class CodingSubmissionSummary(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"runtime_ms"})

    id: str
    problem_slug: str
    language: CodingLanguage
    status: SubmissionStatus
    passed_count: int
    total_count: int
    runtime_ms: int | None = None
    created_at: UtcDatetime


class CodeDraft(CamelModel):
    id: str
    user_id: str
    problem_slug: str
    language: CodingLanguage
    code: str
    updated_at: UtcDatetime


class RunTestCaseInput(CamelModel):
    input_args: list[Any]


class RunCodeRequest(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"test_cases"})

    language: CodingLanguage
    code: str
    test_cases: list[RunTestCaseInput] | None = None


class RunResultItem(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset(
        {"expected", "actual", "error", "runtime_ms"}
    )

    index: int
    input_args: list[Any]
    expected: Any | None = None
    actual: Any | None = None
    passed: bool
    debug_output: str = ""
    error: str | None = None
    runtime_ms: int | None = None


class RunCodeResponse(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"compile_error"})

    results: list[RunResultItem]
    compile_error: str | None = None


class SubmitCodeRequest(CamelModel):
    language: CodingLanguage
    code: str


class SubmitCodeResponse(CamelModel):
    submission_id: str


class SaveDraftRequest(CamelModel):
    language: CodingLanguage
    code: str


class DraftResponse(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"updated_at"})

    language: CodingLanguage
    code: str
    updated_at: UtcDatetime | None = None


class TopicStat(CamelModel):
    topic: str
    solved: int
    total: int


class RecentSubmissionStat(CamelModel):
    id: str
    problem_slug: str
    problem_title: str
    difficulty: CodingDifficulty
    status: SubmissionStatus
    language: CodingLanguage
    created_at: UtcDatetime


class CodingStats(CamelModel):
    total_solved: int
    total_problems: int
    easy_solved: int
    easy_total: int
    medium_solved: int
    medium_total: int
    hard_solved: int
    hard_total: int
    acceptance_rate: float
    topic_stats: list[TopicStat]
    recent_submissions: list[RecentSubmissionStat]
