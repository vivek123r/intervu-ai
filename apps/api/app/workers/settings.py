from __future__ import annotations

from typing import ClassVar

from arq.connections import RedisSettings

from app.config import get_settings
from app.workers.tasks import processing_heartbeat_job, worker_health_job


class WorkerSettings:
    functions: ClassVar[list[object]] = [processing_heartbeat_job, worker_health_job]
    redis_settings = RedisSettings.from_dsn(get_settings().redis_url)
    job_timeout = 600
    max_jobs = 10
    keep_result = 3_600
    health_check_interval = 30
