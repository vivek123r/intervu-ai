from typing import Annotated

from fastapi import Depends, Header

from app.ai.mock import DeterministicProvider
from app.ai.openrouter import OpenRouterAIProvider
from app.ai.provider import AIProvider
from app.config import Settings, get_settings
from app.core.security import extract_bearer_token, resolve_identity
from app.db.mongo import MongoDatabase, mongo
from app.repositories.analytics import AnalyticsRepository
from app.repositories.calendar import CalendarConnectionRepository
from app.repositories.coding_drafts import CodeDraftRepository
from app.repositories.coding_problems import CodingProblemRepository
from app.repositories.coding_submissions import CodingSubmissionRepository
from app.repositories.completions import CompletionInsightRepository
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
from app.services.coding.drafts import CodeDraftService
from app.services.coding.judge import JudgeService, PistonClient
from app.services.coding.problems import CodingProblemService
from app.services.coding.stats import CodingStatsService
from app.services.completion import CompletionService
from app.services.dashboard import DashboardService
from app.services.documents import DocumentService
from app.services.history import HistoryService
from app.services.interviews import InterviewService
from app.services.jobs import JobService
from app.services.notifications import NotificationService
from app.services.practice import PracticeService
from app.services.preparation import PreparationService
from app.services.users import UserService
from app.services.voice import VoiceService

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_ai_provider(settings: SettingsDep) -> AIProvider:
    should_use_openrouter = (
        settings.ai_provider == "openrouter" or settings.ai_provider != "mock"
    ) and bool(settings.openrouter_api_key)

    if should_use_openrouter and settings.openrouter_api_key:
        return OpenRouterAIProvider(
            api_key=settings.openrouter_api_key,
            model=settings.openrouter_model,
            base_url=settings.openrouter_base_url,
        )
    return DeterministicProvider()


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]


def get_db() -> MongoDatabase:
    return mongo.db


DbDep = Annotated[MongoDatabase, Depends(get_db)]


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
    ai: AIProviderDep,
) -> DocumentService:
    return DocumentService(resumes, job_descriptions, ai=ai)


DocumentServiceDep = Annotated[DocumentService, Depends(get_document_service)]


def get_notification_repository(db: DbDep) -> NotificationRepository:
    return NotificationRepository(db)


NotificationRepositoryDep = Annotated[NotificationRepository, Depends(get_notification_repository)]


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


SocketTicketRepositoryDep = Annotated[SocketTicketRepository, Depends(get_socket_ticket_repository)]


def get_practice_service(
    sessions: Annotated[PracticeSessionRepository, Depends(get_practice_session_repository)],
    reports: Annotated[ReportRepository, Depends(get_report_repository)],
    tickets: SocketTicketRepositoryDep,
    ai: AIProviderDep,
    jobs: JobServiceDep,
    resumes: Annotated[ResumeRepository, Depends(get_resume_repository)],
) -> PracticeService:
    return PracticeService(sessions, reports, tickets, ai, jobs, resumes=resumes)


PracticeServiceDep = Annotated[PracticeService, Depends(get_practice_service)]


def get_voice_service() -> VoiceService:
    return VoiceService()


VoiceServiceDep = Annotated[VoiceService, Depends(get_voice_service)]


def get_completion_insight_repository(db: DbDep) -> CompletionInsightRepository:
    return CompletionInsightRepository(db)


def get_completion_service(
    reports: Annotated[ReportRepository, Depends(get_report_repository)],
    sessions: Annotated[PracticeSessionRepository, Depends(get_practice_session_repository)],
    history: HistoryRepositoryDep,
    insights: Annotated[CompletionInsightRepository, Depends(get_completion_insight_repository)],
    ai: AIProviderDep,
) -> CompletionService:
    return CompletionService(reports, sessions, history, insights, ai)


CompletionServiceDep = Annotated[CompletionService, Depends(get_completion_service)]


# --- Coding Practice platform dependencies ---


def get_coding_problem_repository(db: DbDep) -> CodingProblemRepository:
    return CodingProblemRepository(db)


CodingProblemRepositoryDep = Annotated[
    CodingProblemRepository, Depends(get_coding_problem_repository)
]


def get_coding_submission_repository(db: DbDep) -> CodingSubmissionRepository:
    return CodingSubmissionRepository(db)


CodingSubmissionRepositoryDep = Annotated[
    CodingSubmissionRepository, Depends(get_coding_submission_repository)
]


def get_code_draft_repository(db: DbDep) -> CodeDraftRepository:
    return CodeDraftRepository(db)


CodeDraftRepositoryDep = Annotated[CodeDraftRepository, Depends(get_code_draft_repository)]


def get_piston_client(settings: SettingsDep) -> PistonClient:
    return PistonClient(settings.piston_base_url)


PistonClientDep = Annotated[PistonClient, Depends(get_piston_client)]


def get_judge_service(
    settings: SettingsDep,
    piston: PistonClientDep,
    submissions: CodingSubmissionRepositoryDep,
) -> JudgeService:
    return JudgeService(settings, piston, submissions=submissions)


JudgeServiceDep = Annotated[JudgeService, Depends(get_judge_service)]


def get_coding_problem_service(
    problems: CodingProblemRepositoryDep,
    submissions: CodingSubmissionRepositoryDep,
) -> CodingProblemService:
    return CodingProblemService(problems, submissions)


CodingProblemServiceDep = Annotated[CodingProblemService, Depends(get_coding_problem_service)]


def get_coding_stats_service(
    problems: CodingProblemRepositoryDep,
    submissions: CodingSubmissionRepositoryDep,
) -> CodingStatsService:
    return CodingStatsService(problems, submissions)


CodingStatsServiceDep = Annotated[CodingStatsService, Depends(get_coding_stats_service)]


def get_code_draft_service(
    drafts: CodeDraftRepositoryDep,
    problems: CodingProblemRepositoryDep,
) -> CodeDraftService:
    return CodeDraftService(drafts, problems)


CodeDraftServiceDep = Annotated[CodeDraftService, Depends(get_code_draft_service)]
