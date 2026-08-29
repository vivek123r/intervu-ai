import logging

from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.completions import CompletionInsightRepository
from app.repositories.conversations import ReportConversationRepository
from app.repositories.history import HistoryRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.schemas.history import HistorySession

logger = logging.getLogger(__name__)

_NOT_FOUND_MESSAGE = "That session is no longer in your history."


class HistoryService:
    def __init__(
        self,
        history: HistoryRepository,
        reports: ReportRepository,
        sessions: PracticeSessionRepository,
        insights: CompletionInsightRepository,
        conversations: ReportConversationRepository,
    ) -> None:
        self._history = history
        self._reports = reports
        self._sessions = sessions
        self._insights = insights
        self._conversations = conversations

    async def list_for_user(self, user_id: str) -> list[HistorySession]:
        docs = await self._history.list_for_user(user_id)
        return [HistorySession(**doc) for doc in docs]

    async def delete(self, user_id: str, entry_id: str) -> None:
        """Deletes the history row **and everything it points at**.

        The UI promises this "removes the log and its analysis" and "cannot be
        undone". Deleting only the `interview_history` row left the report, the
        practice session (every raw transcript plus the full interviewer log),
        the completion insight and the post-interview Q&A thread in place and
        still fetchable by id — the user merely lost the link to them. Every
        delete below is scoped by `user_id`, so a guessed id can't reach another
        person's records.
        """
        row = await self._history.delete(user_id, entry_id)
        if row is None:
            raise NotFoundError(ErrorCode.HISTORY_SESSION_NOT_FOUND, _NOT_FOUND_MESSAGE)

        report_id = row.get("report_id")
        if not report_id:
            # A row with no report (an abandoned session) has nothing downstream.
            return

        report = await self._reports.delete(user_id, report_id)
        await self._insights.delete(user_id, report_id)
        await self._conversations.delete(user_id, report_id)

        session_id = (report or {}).get("session_id")
        if session_id:
            await self._sessions.delete(user_id, session_id)
        else:
            # The history row survived its report. The transcripts live on the
            # session, so losing this link means they'd never be reachable for
            # deletion again — worth knowing about.
            logger.warning(
                "History %s deleted but report %s was already gone; "
                "its practice session may still hold transcripts.",
                entry_id,
                report_id,
            )
