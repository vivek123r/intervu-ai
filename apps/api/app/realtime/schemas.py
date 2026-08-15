from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class SocketEnvelope(BaseModel):
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    sent_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    request_id: str | None = None
