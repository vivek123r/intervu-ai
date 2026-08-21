from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_piston_client
from app.main import create_app
from app.repositories.coding_problems import CodingProblemRepository
from app.schemas.coding import CodingProblem, FunctionParam, ProblemExample, TestCase
from app.schemas.common import (
    CheckerKind,
    CodingDifficulty,
    ParamType,
    SubmissionStatus,
)
from app.services.coding.judge import PistonClient
from tests.conftest import MOCK_AUTH_HEADERS


class ContractFakePiston(PistonClient):
    def __init__(self) -> None:
        super().__init__("http://fake-piston:2000")

    async def execute(
        self,
        language: str,
        files: list[dict[str, str]],
        stdin: str = "",
        compile_timeout_ms: int = 10000,
        run_timeout_ms: int = 20000,
        run_memory_limit: int = 536870912,
    ) -> dict:
        return {
            "compile": {"code": 0},
            "run": {
                "code": 0,
                "stdout": '{"index": 0, "result": [0, 1], "runtimeMs": 4}\n{"index": 1, "result": [1, 2], "runtimeMs": 5}\n',
            },
        }


@pytest.fixture
def coding_client(db: AsyncIOMotorDatabase) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_piston_client] = lambda: ContractFakePiston()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def seed_problems(db: AsyncIOMotorDatabase) -> None:
    p1 = CodingProblem(
        id="prob-1",
        slug="two-sum",
        number=1,
        title="Two Sum",
        difficulty=CodingDifficulty.EASY,
        topics=["Array", "Hash Table"],
        description_md="Find two indices that add up to target.",
        examples=[ProblemExample(input="[2,7,11,15], 9", output="[0,1]")],
        constraints_md="2 <= nums.length <= 10^4",
        function_name="twoSum",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
            FunctionParam(name="target", type=ParamType.INT),
        ],
        return_type=ParamType.LIST_INT,
        checker=CheckerKind.EXACT,
        starter_code={
            "python": "class Solution:\n    def twoSum(self, nums, target):\n        pass",
            "javascript": "var twoSum = function(nums, target) {};",
        },
        test_cases=[
            TestCase(input_args=[[2, 7, 11, 15], 9], expected=[0, 1], is_example=True),
            TestCase(input_args=[[3, 2, 4], 6], expected=[1, 2], is_example=False),  # Hidden
        ],
        time_limit_ms=2000,
        editorial_md="Use a hash map.",
    )
    p2 = CodingProblem(
        id="prob-2",
        slug="3sum",
        number=15,
        title="3Sum",
        difficulty=CodingDifficulty.MEDIUM,
        topics=["Two Pointers", "Sorting"],
        description_md="Find all unique triplets...",
        examples=[ProblemExample(input="[-1,0,1,2,-1,-4]", output="[[-1,-1,2],[-1,0,1]]")],
        constraints_md="3 <= nums.length <= 3000",
        function_name="threeSum",
        params=[
            FunctionParam(name="nums", type=ParamType.LIST_INT),
        ],
        return_type=ParamType.LIST_LIST_INT,
        checker=CheckerKind.UNORDERED,
        starter_code={
            "python": "class Solution:\n    def threeSum(self, nums):\n        pass",
            "javascript": "var threeSum = function(nums) {};",
        },
        test_cases=[
            TestCase(
                input_args=[[-1, 0, 1, 2, -1, -4]],
                expected=[[-1, -1, 2], [-1, 0, 1]],
                is_example=True,
            ),
        ],
        time_limit_ms=2000,
        editorial_md="Sort and two-pointer.",
    )
    repo = CodingProblemRepository(db)
    await repo.upsert(p1.model_dump(by_alias=True))
    await repo.upsert(p2.model_dump(by_alias=True))


def test_list_coding_problems(coding_client: TestClient, seed_problems: None) -> None:
    res = coding_client.get("/api/v1/coding/problems", headers=MOCK_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["slug"] == "two-sum"
    assert data["items"][0]["status"] == "todo"


def test_list_coding_problems_filter_difficulty(
    coding_client: TestClient, seed_problems: None
) -> None:
    res = coding_client.get("/api/v1/coding/problems?difficulty=easy", headers=MOCK_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "two-sum"


def test_get_problem_detail_strips_hidden_testcases(
    coding_client: TestClient, seed_problems: None
) -> None:
    res = coding_client.get("/api/v1/coding/problems/two-sum", headers=MOCK_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["slug"] == "two-sum"
    assert data["title"] == "Two Sum"
    # Should only return the 1 example testcase, NEVER the hidden one
    assert len(data["testCases"]) == 1
    assert data["testCases"][0]["isExample"] is True


def test_run_code(coding_client: TestClient, seed_problems: None) -> None:
    payload = {
        "language": "python",
        "code": "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
    }
    res = coding_client.post(
        "/api/v1/coding/problems/two-sum/run",
        json=payload,
        headers=MOCK_AUTH_HEADERS,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["passed"] is True


def test_submit_code_and_poll(coding_client: TestClient, seed_problems: None) -> None:
    payload = {
        "language": "python",
        "code": "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]",
    }
    res = coding_client.post(
        "/api/v1/coding/problems/two-sum/submissions",
        json=payload,
        headers=MOCK_AUTH_HEADERS,
    )
    assert res.status_code == 200
    sub_id = res.json()["submissionId"]

    # Background task runs during test client response cycle
    sub_res = coding_client.get(
        f"/api/v1/coding/submissions/{sub_id}",
        headers=MOCK_AUTH_HEADERS,
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["id"] == sub_id
    assert sub_data["problemSlug"] == "two-sum"
    assert sub_data["status"] in (SubmissionStatus.ACCEPTED.value, SubmissionStatus.JUDGING.value)


def test_draft_roundtrip(coding_client: TestClient, seed_problems: None) -> None:
    # Save draft
    put_res = coding_client.put(
        "/api/v1/coding/problems/two-sum/draft",
        json={"language": "python", "code": "# My draft code"},
        headers=MOCK_AUTH_HEADERS,
    )
    assert put_res.status_code == 200
    assert put_res.json()["code"] == "# My draft code"

    # Get draft
    get_res = coding_client.get(
        "/api/v1/coding/problems/two-sum/draft?language=python",
        headers=MOCK_AUTH_HEADERS,
    )
    assert get_res.status_code == 200
    assert get_res.json()["code"] == "# My draft code"


def test_stats_endpoint(coding_client: TestClient, seed_problems: None) -> None:
    res = coding_client.get("/api/v1/coding/stats", headers=MOCK_AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["totalProblems"] == 2
    assert "topicStats" in data
