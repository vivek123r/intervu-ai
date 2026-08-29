from typing import ClassVar, Literal

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime

ConversationSpeaker = Literal["candidate", "assistant"]


class ConversationTurn(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"question_id"})

    speaker: ConversationSpeaker
    text: str
    # The report question this turn is grounded in/asking about, if any — lets the
    # results screen open the panel pre-seeded from a specific question's "Why this
    # score?" / "What's a better answer?" action.
    question_id: str | None = None
    created_at: UtcDatetime


class ReportConversation(CamelModel):
    report_id: str
    turns: list[ConversationTurn]


class ReportChatRequest(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"question_id"})

    message: str
    question_id: str | None = None


class ReportChatResponse(CamelModel):
    """The assistant's reply plus the full thread so far — the panel never has to
    reconcile an optimistic local turn against a subsequent GET."""

    reply: ConversationTurn
    turns: list[ConversationTurn]
