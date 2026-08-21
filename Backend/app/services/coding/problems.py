from typing import Literal, cast

from app.repositories.coding_problems import CodingProblemRepository
from app.repositories.coding_submissions import CodingSubmissionRepository
from app.schemas.coding import (
    CodingProblem,
    ProblemDetail,
    ProblemListResponse,
    ProblemSummary,
    TestCase,
    TopicCount,
)
from app.schemas.common import CodingDifficulty


class CodingProblemService:
    def __init__(
        self,
        problems: CodingProblemRepository,
        submissions: CodingSubmissionRepository,
    ) -> None:
        self.problems = problems
        self.submissions = submissions

    async def list_problems(
        self,
        user_id: str,
        difficulty: CodingDifficulty | None = None,
        topics: list[str] | None = None,
        status: Literal["solved", "attempted", "todo"] | None = None,
        search: str | None = None,
        sort_by: str = "number",
        sort_dir: int = 1,
        limit: int = 50,
        offset: int = 0,
    ) -> ProblemListResponse:
        docs, total = await self.problems.list_problems(
            difficulty=difficulty,
            topics=topics,
            search=search,
            sort_by=sort_by,
            sort_dir=sort_dir,
            limit=limit,
            offset=offset,
        )

        user_statuses = await self.submissions.get_user_problem_statuses(user_id)
        acceptance_rates = await self.submissions.get_acceptance_rates()

        items: list[ProblemSummary] = []
        for doc in docs:
            slug = doc["slug"]
            user_status = user_statuses.get(slug, "todo")
            if status and user_status != status:
                continue

            acc_rate = acceptance_rates.get(slug, 0.0)
            items.append(
                ProblemSummary(
                    slug=slug,
                    number=doc["number"],
                    title=doc["title"],
                    difficulty=CodingDifficulty(doc["difficulty"]),
                    topics=doc.get("topics", []),
                    acceptance_rate=acc_rate,
                    status=cast(Literal["solved", "attempted", "todo"], user_status),
                )
            )

        if status:
            total = len(items)

        return ProblemListResponse(items=items, total=total)

    async def get_problem(self, slug: str, user_id: str) -> ProblemDetail | None:
        doc = await self.problems.get_by_slug(slug)
        if not doc:
            return None

        user_statuses = await self.submissions.get_user_problem_statuses(user_id)
        user_status = user_statuses.get(slug, "todo")

        # Strip non-example test cases so hidden test cases are never leaked to client
        raw_test_cases = doc.get("test_cases") or doc.get("testCases") or []
        example_cases = [
            TestCase(
                input_args=tc.get("input_args", tc.get("inputArgs", [])),
                expected=tc.get("expected"),
                is_example=True,
            )
            for tc in raw_test_cases
            if tc.get("is_example") or tc.get("isExample")
        ]

        # If none marked as example, include at most first 2 as fallback examples
        if not example_cases and raw_test_cases:
            example_cases = [
                TestCase(
                    input_args=tc.get("input_args", tc.get("inputArgs", [])),
                    expected=tc.get("expected"),
                    is_example=True,
                )
                for tc in raw_test_cases[:2]
            ]

        doc_copy = dict(doc)
        doc_copy.pop("testCases", None)
        doc_copy["test_cases"] = example_cases
        doc_copy["user_status"] = user_status
        return ProblemDetail.model_validate(doc_copy)

    async def get_internal_problem(self, slug: str) -> CodingProblem | None:
        doc = await self.problems.get_by_slug(slug)
        if not doc:
            return None
        return CodingProblem.model_validate(doc)

    async def get_topics(self) -> list[TopicCount]:
        raw_topics = await self.problems.get_topics_with_counts()
        return [TopicCount(name=t["name"], count=t["count"]) for t in raw_topics]
