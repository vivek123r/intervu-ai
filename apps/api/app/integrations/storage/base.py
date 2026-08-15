from __future__ import annotations

from typing import Protocol


class FileStorage(Protocol):
    async def put(self, *, key: str, content: bytes) -> str: ...

    async def read(self, key: str) -> bytes: ...

    async def delete(self, key: str) -> None: ...
