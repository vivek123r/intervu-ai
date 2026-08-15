from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.analytics import AnalyticsOverview
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(user: CurrentUser, session: DbSession) -> AnalyticsOverview:
    return await AnalyticsService(session).overview(user)
