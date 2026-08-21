from app.schemas.coding import CodingProblem
from app.seed.coding.easy import EASY_PROBLEMS
from app.seed.coding.hard import HARD_PROBLEMS
from app.seed.coding.medium import MEDIUM_PROBLEMS

ALL_CODING_PROBLEMS: list[CodingProblem] = EASY_PROBLEMS + MEDIUM_PROBLEMS + HARD_PROBLEMS

__all__ = [
    "ALL_CODING_PROBLEMS",
    "EASY_PROBLEMS",
    "HARD_PROBLEMS",
    "MEDIUM_PROBLEMS",
]
