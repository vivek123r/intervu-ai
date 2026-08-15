from datetime import UTC
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import Settings

Doc = dict[str, Any]
MongoDatabase = AsyncIOMotorDatabase[Doc]


class Mongo:
    """Process-wide Motor client, connected once during the app lifespan."""

    def __init__(self) -> None:
        self._client: AsyncIOMotorClient[Doc] | None = None
        self._db: MongoDatabase | None = None

    def connect(self, settings: Settings) -> None:
        # tz_aware+UTC: Motor returns naive datetimes otherwise, which silently
        # shift every timestamp once re-serialized (see core/timeutils.py).
        self._client = AsyncIOMotorClient(settings.mongodb_url, tz_aware=True, tzinfo=UTC)
        self._db = self._client[settings.mongodb_db]

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
        self._client = None
        self._db = None

    def override_for_testing(self, db: MongoDatabase) -> None:
        """Test seam: inject a mongomock database so lifespan skips a real connect."""
        self._client = None
        self._db = db

    @property
    def is_connected(self) -> bool:
        return self._db is not None

    @property
    def db(self) -> MongoDatabase:
        if self._db is None:
            raise RuntimeError("Mongo is not connected — app lifespan hasn't started")
        return self._db


mongo = Mongo()
