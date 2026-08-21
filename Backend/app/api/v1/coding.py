import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Query

from app.core.timeutils import utcnow
from app.dependencies import (
    CodeDraftServiceDep,
    CodingProblemRepositoryDep,
    CodingProblemServiceDep,
    CodingStatsServiceDep,
    CodingSubmissionRepositoryDep,
    CurrentUser,
    JudgeServiceDep,
)
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.schemas.coding import (
    CodingProblem,
    CodingStats,
    CodingSubmission,
    CodingSubmissionSummary,
    DraftResponse,
    ProblemDetail,
    ProblemListResponse,
    RunCodeRequest,
    RunCodeResponse,
    SaveDraftRequest,
    SubmitCodeRequest,
    SubmitCodeResponse,
    TestCase,
    TopicCount,
)
from app.schemas.common import CodingDifficulty, CodingLanguage, SubmissionStatus

router = APIRouter(prefix="/coding", tags=["coding"])


@router.get("/problems", response_model=ProblemListResponse)
async def list_problems(
    current_user: CurrentUser,
    problem_service: CodingProblemServiceDep,
    difficulty: CodingDifficulty | None = None,
    topic: Annotated[list[str] | None, Query()] = None,
    status: Literal["solved", "attempted", "todo"] | None = None,
    search: str | None = None,
    sort_by: str = "number",
    sort_dir: int = 1,
    limit: int = 50,
    offset: int = 0,
) -> ProblemListResponse:
    return await problem_service.list_problems(
        user_id=current_user.id,
        difficulty=difficulty,
        topics=topic,
        status=status,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        limit=limit,
        offset=offset,
    )


@router.get("/topics", response_model=list[TopicCount])
async def get_topics(
    _current_user: CurrentUser,
    problem_service: CodingProblemServiceDep,
) -> list[TopicCount]:
    return await problem_service.get_topics()


@router.get("/stats", response_model=CodingStats)
async def get_stats(
    current_user: CurrentUser,
    stats_service: CodingStatsServiceDep,
) -> CodingStats:
    return await stats_service.get_stats(current_user.id)


@router.get("/problems/{slug}", response_model=ProblemDetail)
async def get_problem(
    slug: str,
    current_user: CurrentUser,
    problem_service: CodingProblemServiceDep,
) -> ProblemDetail:
    problem = await problem_service.get_problem(slug, current_user.id)
    if not problem:
        raise NotFoundError(ErrorCode.CODING_PROBLEM_NOT_FOUND, "Problem not found")
    return problem


@router.post("/problems/{slug}/run", response_model=RunCodeResponse)
async def run_code(
    slug: str,
    body: RunCodeRequest,
    _current_user: CurrentUser,
    problems_repo: CodingProblemRepositoryDep,
    judge_service: JudgeServiceDep,
) -> RunCodeResponse:
    problem_doc = await problems_repo.get_by_slug(slug)
    if not problem_doc:
        raise NotFoundError(ErrorCode.CODING_PROBLEM_NOT_FOUND, "Problem not found")
    problem = CodingProblem.model_validate(problem_doc)

    if body.test_cases:
        cases_to_run = [
            TestCase(input_args=tc.input_args, expected=None, is_example=False)
            for tc in body.test_cases[:5]
        ]
    else:
        cases_to_run = [tc for tc in problem.test_cases if tc.is_example] or problem.test_cases[:2]

    return await judge_service.execute_run(
        problem=problem,
        language=body.language,
        user_code=body.code,
        test_cases=cases_to_run,
    )


@router.post("/problems/{slug}/submissions", response_model=SubmitCodeResponse)
async def submit_code(
    slug: str,
    body: SubmitCodeRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    problems_repo: CodingProblemRepositoryDep,
    submissions_repo: CodingSubmissionRepositoryDep,
    judge_service: JudgeServiceDep,
) -> SubmitCodeResponse:
    problem_doc = await problems_repo.get_by_slug(slug)
    if not problem_doc:
        raise NotFoundError(ErrorCode.CODING_PROBLEM_NOT_FOUND, "Problem not found")
    problem = CodingProblem.model_validate(problem_doc)

    submission_id = str(uuid.uuid4())
    doc = {
        "id": submission_id,
        "user_id": current_user.id,
        "problem_slug": slug,
        "language": body.language.value if hasattr(body.language, "value") else str(body.language),
        "code": body.code,
        "status": SubmissionStatus.JUDGING.value,
        "passed_count": 0,
        "total_count": len(problem.test_cases),
        "runtime_ms": None,
        "compile_stderr": None,
        "first_failure": None,
        "created_at": utcnow(),
    }
    await submissions_repo.create(doc)

    background_tasks.add_task(
        judge_service.judge_submission,
        submission_id=submission_id,
        problem=problem,
        language=body.language,
        user_code=body.code,
    )

    return SubmitCodeResponse(submission_id=submission_id)


@router.get("/problems/{slug}/submissions", response_model=list[CodingSubmissionSummary])
async def list_problem_submissions(
    slug: str,
    current_user: CurrentUser,
    submissions_repo: CodingSubmissionRepositoryDep,
) -> list[CodingSubmissionSummary]:
    docs = await submissions_repo.list_by_problem(current_user.id, slug)
    return [CodingSubmissionSummary.model_validate(d) for d in docs]


@router.get("/submissions/{submission_id}", response_model=CodingSubmission)
async def get_submission(
    submission_id: str,
    current_user: CurrentUser,
    submissions_repo: CodingSubmissionRepositoryDep,
) -> CodingSubmission:
    doc = await submissions_repo.get(current_user.id, submission_id)
    if not doc:
        raise NotFoundError(ErrorCode.SUBMISSION_NOT_FOUND, "Submission not found")
    return CodingSubmission.model_validate(doc)


@router.put("/problems/{slug}/draft", response_model=DraftResponse)
async def save_draft(
    slug: str,
    body: SaveDraftRequest,
    current_user: CurrentUser,
    draft_service: CodeDraftServiceDep,
) -> DraftResponse:
    return await draft_service.save_draft(
        user_id=current_user.id,
        slug=slug,
        language=body.language,
        code=body.code,
    )


@router.get("/problems/{slug}/draft", response_model=DraftResponse)
async def get_draft(
    slug: str,
    current_user: CurrentUser,
    draft_service: CodeDraftServiceDep,
    language: CodingLanguage = CodingLanguage.PYTHON,
) -> DraftResponse:
    return await draft_service.get_draft(
        user_id=current_user.id,
        slug=slug,
        language=language,
    )
