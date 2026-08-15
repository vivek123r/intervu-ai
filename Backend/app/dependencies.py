from typing import Annotated

from fastapi import Depends, Header

from app.ai.mock import DeterministicProvider
from app.ai.provider import AIProvider
from app.config import Settings, get_settings
from app.core.security import extract_bearer_token, resolve_identity
from app.db.mongo import MongoDatabase, mongo
from app.repositories.analytics import AnalyticsRepository
from app.repositories.calendar import CalendarConnectionRepository
from app.repositories.documents import JobDescriptionRepository, ResumeRepository
from app.repositories.history import HistoryRepository
from app.repositories.interviews import InterviewRepository
from app.repositories.jobs import JobRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.preparation import (
    PreparationPlanRepository,
    PreparationTaskRepository,
    QuestionRepository,
)
from app.repositories.reports import ReportRepository
from app.repositories.tickets import SocketTicketRepository
from app.repositories.users import UserRepository
from app.schemas.users import User
from app.services.analytics import AnalyticsService
from app.services.calendar import CalendarService
from app.services.dashboard import DashboardService
from app.services.documents import DocumentService
from app.services.history import HistoryService
from app.services.interviews import InterviewService
from app.services.jobs import JobService
from app.services.notifications import NotificationService
from app.services.practice import PracticeService
from app.services.preparation import PreparationService
from app.services.users import UserService

_ai_provider = DeterministicProvider()


def get_ai_provider() -> AIProvider:
    return _ai_provider


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]


def get_db() -> MongoDatabase:
    return mongo.db


DbDep = Annotated[MongoDatabase, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_user_repository(db: DbDep) -> UserRepository:
    return UserRepository(db)


UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]


def get_user_service(users: UserRepositoryDep) -> UserService:
    return UserService(users)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


async def get_current_user(
    settings: SettingsDep,
    user_service: UserServiceDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = extract_bearer_token(authorization)
    identity = await resolve_identity(token, settings)
    return await user_service.get_or_provision(identity)


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_interview_repository(db: DbDep) -> InterviewRepository:
    return InterviewRepository(db)


InterviewRepositoryDep = Annotated[InterviewRepository, Depends(get_interview_repository)]


def get_interview_service(interviews: InterviewRepositoryDep) -> InterviewService:
    return InterviewService(interviews)


InterviewServiceDep = Annotated[InterviewService, Depends(get_interview_service)]


def get_job_repository(db: DbDep) -> JobRepository:
    return JobRepository(db)


JobRepositoryDep = Annotated[JobRepository, Depends(get_job_repository)]


def get_job_service(jobs: JobRepositoryDep) -> JobService:
    return JobService(jobs)


JobServiceDep = Annotated[JobService, Depends(get_job_service)]


def get_preparation_task_repository(db: DbDep) -> PreparationTaskRepository:
    return PreparationTaskRepository(db)


def get_question_repository(db: DbDep) -> QuestionRepository:
    return QuestionRepository(db)


def get_preparation_plan_repository(db: DbDep) -> PreparationPlanRepository:
    return PreparationPlanRepository(db)


def get_preparation_service(
    tasks: Annotated[PreparationTaskRepository, Depends(get_preparation_task_repository)],
    questions: Annotated[QuestionRepository, Depends(get_question_repository)],
    plans: Annotated[PreparationPlanRepository, Depends(get_preparation_plan_repository)],
) -> PreparationService:
    return PreparationService(tasks, questions, plans)


PreparationServiceDep = Annotated[PreparationService, Depends(get_preparation_service)]


def get_analytics_repository(db: DbDep) -> AnalyticsRepository:
    return AnalyticsRepository(db)


AnalyticsRepositoryDep = Annotated[AnalyticsRepository, Depends(get_analytics_repository)]


def get_analytics_service(analytics: AnalyticsRepositoryDep) -> AnalyticsService:
    return AnalyticsService(analytics)


AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]


def get_dashboard_service(
    interviews: InterviewServiceDep,
    preparation: PreparationServiceDep,
    analytics: AnalyticsServiceDep,
) -> DashboardService:
    return DashboardService(interviews, preparation, analytics)


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]


def get_calendar_connection_repository(db: DbDep) -> CalendarConnectionRepository:
    return CalendarConnectionRepository(db)


CalendarConnectionRepositoryDep = Annotated[
    CalendarConnectionRepository, Depends(get_calendar_connection_repository)
]


def get_calendar_service(
    connections: CalendarConnectionRepositoryDep, jobs: JobServiceDep
) -> CalendarService:
    return CalendarService(connections, jobs)


CalendarServiceDep = Annotated[CalendarService, Depends(get_calendar_service)]


def get_resume_repository(db: DbDep) -> ResumeRepository:
    return ResumeRepository(db)


def get_job_description_repository(db: DbDep) -> JobDescriptionRepository:
    return JobDescriptionRepository(db)


def get_document_service(
    resumes: Annotated[ResumeRepository, Depends(get_resume_repository)],
    job_descriptions: Annotated[JobDescriptionRepository, Depends(get_job_description_repository)],
) -> DocumentService:
    return DocumentService(resumes, job_descriptions)


DocumentServiceDep = Annotated[DocumentService, Depends(get_document_service)]


def get_notification_repository(db: DbDep) -> NotificationRepository:
    return NotificationRepository(db)


NotificationRepositoryDep = Annotated[
    NotificationRepository, Depends(get_notification_repository)
]


def get_notification_service(notifications: NotificationRepositoryDep) -> NotificationService:
    return NotificationService(notifications)


NotificationServiceDep = Annotated[NotificationService, Depends(get_notification_service)]


def get_history_repository(db: DbDep) -> HistoryRepository:
    return HistoryRepository(db)


HistoryRepositoryDep = Annotated[HistoryRepository, Depends(get_history_repository)]


def get_history_service(history: HistoryRepositoryDep) -> HistoryService:
    return HistoryService(history)


HistoryServiceDep = Annotated[HistoryService, Depends(get_history_service)]


def get_practice_session_repository(db: DbDep) -> PracticeSessionRepository:
    return PracticeSessionRepository(db)


def get_report_repository(db: DbDep) -> ReportRepository:
    return ReportRepository(db)


def get_socket_ticket_repository(db: DbDep) -> SocketTicketRepository:
    return SocketTicketRepository(db)


SocketTicketRepositoryDep = Annotated[
    SocketTicketRepository, Depends(get_socket_ticket_repository)
]


def get_practice_service(
    sessions: Annotated[PracticeSessionRepository, Depends(get_practice_session_repository)],
    reports: Annotated[ReportRepository, Depends(get_report_repository)],
    tickets: SocketTicketRepositoryDep,
    ai: AIProviderDep,
    jobs: JobServiceDep,
) -> PracticeService:
    return PracticeService(sessions, reports, tickets, ai, jobs)


PracticeServiceDep = Annotated[PracticeService, Depends(get_practice_service)]
