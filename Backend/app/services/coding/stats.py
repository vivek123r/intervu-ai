from app.core.timeutils import ensure_utc
from app.repositories.coding_problems import CodingProblemRepository
from app.repositories.coding_submissions import CodingSubmissionRepository
from app.schemas.coding import (
    CodingStats,
    RecentSubmissionStat,
    TopicStat,
)
from app.schemas.common import CodingDifficulty, SubmissionStatus


class CodingStatsService:
    def __init__(
        self,
        problems: CodingProblemRepository,
        submissions: CodingSubmissionRepository,
    ) -> None:
        self.problems = problems
        self.submissions = submissions

    async def get_stats(self, user_id: str) -> CodingStats:
        difficulty_counts = await self.problems.count_by_difficulty()
        all_problems, total_problems = await self.problems.list_problems(limit=1000)

        solved_slugs = await self.submissions.get_user_solved_slugs(user_id)
        user_submissions = await self.submissions.list_by_user(user_id, limit=1000)

        # Build map of slug to problem doc
        slug_map = {p["slug"]: p for p in all_problems}

        easy_solved = 0
        medium_solved = 0
        hard_solved = 0

        topic_totals: dict[str, int] = {}
        topic_solved_map: dict[str, int] = {}

        for p in all_problems:
            slug = p["slug"]
            diff = p["difficulty"]
            is_solved = slug in solved_slugs

            if is_solved:
                if diff == "easy":
                    easy_solved += 1
                elif diff == "medium":
                    medium_solved += 1
                elif diff == "hard":
                    hard_solved += 1

            for t in p.get("topics", []):
                topic_totals[t] = topic_totals.get(t, 0) + 1
                if is_solved:
                    topic_solved_map[t] = topic_solved_map.get(t, 0) + 1

        topic_stats = [
            TopicStat(
                topic=t,
                solved=topic_solved_map.get(t, 0),
                total=count,
            )
            for t, count in sorted(topic_totals.items(), key=lambda x: (-x[1], x[0]))
        ]

        total_sub_count = len(user_submissions)
        accepted_sub_count = sum(
            1 for s in user_submissions if s.get("status") == SubmissionStatus.ACCEPTED.value
        )
        acceptance_rate = (
            round((accepted_sub_count / total_sub_count) * 100.0, 1) if total_sub_count > 0 else 0.0
        )

        recent_submissions: list[RecentSubmissionStat] = []
        for s in user_submissions[:10]:
            slug = s.get("problem_slug", "")
            prob = slug_map.get(slug)
            recent_submissions.append(
                RecentSubmissionStat(
                    id=s["id"],
                    problem_slug=slug,
                    problem_title=prob["title"] if prob else slug,
                    difficulty=CodingDifficulty(prob["difficulty"])
                    if prob
                    else CodingDifficulty.EASY,
                    status=SubmissionStatus(s.get("status", SubmissionStatus.JUDGING.value)),
                    language=s.get("language", "python"),
                    created_at=ensure_utc(s["created_at"]),
                )
            )

        return CodingStats(
            total_solved=len(solved_slugs),
            total_problems=total_problems,
            easy_solved=easy_solved,
            easy_total=difficulty_counts.get("easy", 0),
            medium_solved=medium_solved,
            medium_total=difficulty_counts.get("medium", 0),
            hard_solved=hard_solved,
            hard_total=difficulty_counts.get("hard", 0),
            acceptance_rate=acceptance_rate,
            topic_stats=topic_stats,
            recent_submissions=recent_submissions,
        )
