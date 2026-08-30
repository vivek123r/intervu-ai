import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo
from app.dependencies import close_ai_provider
from app.schemas.common import AnswerAnalysisStatus

logger = logging.getLogger(__name__)


async def _fail_stranded_analyses() -> None:
    """Marks answers whose background scoring never finished as failed.

    `AnalysisRegistry` is in-process, so a restart loses every scheduled task. The
    answers those tasks would have scored stay `pending` forever, and a later
    `drain()` returns instantly because the registry is empty — so a report would
    be generated over answers that were never scored, with no sign anything went
    wrong. Degrading them to `failed` at startup makes the shortfall visible via
    `InterviewReport.unscored_answer_count`.
    """
    # Rewrites the whole `answers` array per session rather than using positional
    # array filters, which mongomock (the test double) doesn't implement. Safe
    # here specifically because this runs at startup, before anything is serving.
    swept = 0
    cursor = mongo.db.practice_sessions.find(
        {"answers.analysis_status": AnswerAnalysisStatus.PENDING}
    )
    async for doc in cursor:
        answers = doc.get("answers") or []
        for answer in answers:
            if answer.get("analysis_status") == AnswerAnalysisStatus.PENDING:
                answer["analysis_status"] = AnswerAnalysisStatus.FAILED
        await mongo.db.practice_sessions.update_one(
            {"_id": doc["_id"]}, {"$set": {"answers": answers}}
        )
        swept += 1

    if swept:
        logger.warning(
            "Marked stranded pending analyses as failed in %d session(s) after restart.",
            swept,
        )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if not mongo.is_connected:
        mongo.connect(settings)
    await ensure_indexes(mongo.db)
    await _fail_stranded_analyses()
    yield
    await close_ai_provider()
    mongo.close()
