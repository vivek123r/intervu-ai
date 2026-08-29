from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.dependencies import AnalyticsServiceDep, CurrentUser
from app.schemas.analytics import AnalyticsOverview

router = APIRouter(tags=["analytics"])

AnalyticsRange = Literal["7d", "30d", "3m", "all"]


@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    current_user: CurrentUser,
    analytics: AnalyticsServiceDep,
    # The UI's range tabs used to be inert — the value was held in React state and
    # never sent, so every range rendered identical data.
    range: Annotated[AnalyticsRange, Query()] = "all",
) -> AnalyticsOverview:
    return await analytics.get_overview(current_user.id, range)
