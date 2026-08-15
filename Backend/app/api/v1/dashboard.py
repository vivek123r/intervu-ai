from fastapi import APIRouter

from app.dependencies import CurrentUser, DashboardServiceDep
from app.schemas.dashboard import DashboardOverview

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    current_user: CurrentUser, dashboard: DashboardServiceDep
) -> DashboardOverview:
    return await dashboard.get_overview(current_user.id)
