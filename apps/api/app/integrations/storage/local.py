from __future__ import annotations

import asyncio
from pathlib import Path


class LocalFileStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _resolve(self, key: str) -> Path:
        candidate = (self.root / key).resolve()
        if self.root not in candidate.parents:
            raise ValueError("Storage key escapes the configured root")
        return candidate

    async def put(self, *, key: str, content: bytes) -> str:
        path = self._resolve(key)

        def write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)

        await asyncio.to_thread(write)
        return key

    async def read(self, key: str) -> bytes:
        return await asyncio.to_thread(self._resolve(key).read_bytes)

    async def delete(self, key: str) -> None:
        path = self._resolve(key)

        def remove() -> None:
            if path.exists():
                path.unlink()

        await asyncio.to_thread(remove)
