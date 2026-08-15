from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    calendar,
    dashboard,
    documents,
    interviews,
    jobs,
    notifications,
    practice,
    preparation,
    system,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(system.router)
api_router.include_router(interviews.router)
api_router.include_router(preparation.router)
api_router.include_router(jobs.router)
api_router.include_router(analytics.router)
api_router.include_router(dashboard.router)
api_router.include_router(calendar.router)
api_router.include_router(documents.router)
api_router.include_router(notifications.router)
api_router.include_router(practice.router)
