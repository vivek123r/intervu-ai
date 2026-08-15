from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import mongo
from app.main import create_app

MOCK_AUTH_HEADERS = {"Authorization": "Bearer demo-token"}


@pytest.fixture
def db() -> Iterator[AsyncIOMotorDatabase]:
    database = AsyncMongoMockClient()["intervu-test"]
    mongo.override_for_testing(database)
    yield database
    mongo.close()


@pytest.fixture
def client(db: AsyncIOMotorDatabase) -> Iterator[TestClient]:
    with TestClient(create_app()) as test_client:
        yield test_client
