from __future__ import annotations

from pydantic import BaseModel, Field


class CursorPage[ItemT](BaseModel):
    items: list[ItemT]
    next_cursor: str | None = None
    has_more: bool = False


class MessageResponse(BaseModel):
    message: str


class JobAccepted(BaseModel):
    job_id: str
    status: str = "queued"
    progress: int = Field(default=0, ge=0, le=100)
