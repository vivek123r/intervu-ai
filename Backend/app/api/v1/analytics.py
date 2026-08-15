from fastapi import APIRouter

from app.dependencies import AnalyticsServiceDep, CurrentUser
from app.schemas.analytics import AnalyticsOverview

router = APIRouter(tags=["analytics"])


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    current_user: CurrentUser, analytics: AnalyticsServiceDep
) -> AnalyticsOverview:
    return await analytics.get_overview(current_user.id)
