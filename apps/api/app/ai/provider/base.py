from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


@dataclass(frozen=True, slots=True)
class AIMessage:
    role: Literal["system", "user", "assistant"]
    content: str


@dataclass(frozen=True, slots=True)
class AIUsageData:
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass(frozen=True, slots=True)
class AIResponse[SchemaT: BaseModel]:
    content: str
    parsed: SchemaT | None
    provider: str
    model: str
    latency_ms: int
    usage: AIUsageData


class AIProvider(Protocol):
    async def generate(
        self,
        messages: list[AIMessage],
        *,
        schema: type[SchemaT] | None = None,
        temperature: float | None = None,
        model: str | None = None,
    ) -> AIResponse[SchemaT]: ...
