# Intervu AI architecture

## Decision summary

Intervu AI is a pnpm monorepo with a Next.js web application and a FastAPI API. PostgreSQL owns durable product state, Redis owns ephemeral coordination and background jobs, Firebase owns identity verification, Google OAuth owns Calendar authorization, and AI providers sit behind a typed provider interface. The application remains fully demonstrable with mock identity, mock calendar, mock speech, and `MockAIProvider`.

The primary launch slice is:

`sign in → connect calendar → confirm interview → attach resume/JD → generate plan → run adaptive mock → receive report → practice weak answers`

## Repository topology

```text
apps/
  web/                 Next.js App Router, React, TypeScript
  api/                 FastAPI, SQLAlchemy 2, Alembic, ARQ
packages/
  shared-types/        Stable WebSocket and domain contracts
docker-compose.yml     PostgreSQL, Redis, API, worker
```

The frontend and backend deploy independently. The root workspace coordinates linting, tests, builds, and type generation.

## Runtime boundaries

```text
Browser
  ├─ Next.js UI and Web Audio capture
  ├─ Firebase client authentication
  └─ typed HTTP/WebSocket client
        ↓
FastAPI
  ├─ API validation and ownership checks
  ├─ domain services and deterministic calculations
  ├─ provider/integration adapters
  ├─ PostgreSQL repositories
  ├─ Redis/ARQ jobs
  └─ typed WebSocket session gateway
```

Route handlers validate, authorize, call one service, and serialize a schema. They never contain persistence rules, score calculations, provider prompts, OAuth token logic, or state transitions.

## Backend layers

- `api/v1`: thin HTTP routers.
- `realtime`: explicit WebSocket envelopes and session gateway.
- `schemas`: Pydantic request, response, job, and AI contracts.
- `services`: business workflows and transaction boundaries.
- `repositories`: scoped persistence only.
- `models`: SQLAlchemy entities, constraints, and indexes.
- `ai`: provider interface, specialized agents, context builder, prompt versions, orchestrator.
- `integrations`: Calendar, file storage, Firebase, speech abstractions.
- `analytics`: deterministic speech, score, readiness, trend, and weakness calculations.
- `workers`: ARQ jobs and progress publication.

## Identity and authorization

The browser obtains a Firebase ID token and sends it as `Authorization: Bearer …`. FastAPI verifies the token with Firebase Admin, then resolves an internal UUID user. Every owned query is scoped by that UUID. Development mode supports a deterministic demo principal only when `AUTH_MODE=mock`; production rejects mock mode.

Firebase sign-in and Google Calendar consent are separate. Calendar OAuth state is signed and short-lived. Access and refresh tokens are encrypted with a server-held Fernet key, never returned to the browser, and masked in logs.

## Calendar synchronization

`CalendarProvider` normalizes external events before domain logic sees them. Google is the first adapter; Outlook can be added later without changing interview detection.

Synchronization is idempotent on `(provider, provider_event_id)`. A cheap heuristic ranks candidates first. Only ambiguous candidates reach the AI classifier. Detection creates a candidate with confidence and evidence; it never silently confirms an interview for the user.

## Data model

Primary aggregates:

- User, CalendarConnection
- Interview, InterviewRound
- Resume, JobDescription
- PreparationPlan, PreparationTask
- MockInterviewSession, SessionQuestion, InterviewAnswer
- AnswerEvaluation, SpeechMetrics, InterviewReport
- TopicPerformance, ProcessingJob, Notification, AIUsage

UUIDs are primary keys. Timestamps are timezone-aware UTC. External event timezone is preserved for display and sync semantics. JSONB is reserved for genuinely variable structured outputs, not for relationships such as interview rounds or answers.

## AI architecture

`AIProvider.generate()` accepts messages plus an optional Pydantic schema. `MockAIProvider` returns deterministic, realistic fixtures. `OpenRouterAIProvider` owns authentication, model selection, timeout, bounded retry, response parsing, and usage metadata. Business code depends only on the interface.

Specialized agents own narrow responsibilities:

- interview classification and planning
- resume and JD analysis
- preparation planning
- question generation
- lightweight answer evaluation
- follow-up decision
- final coaching report

Python owns authorization, timers, workflow, limits, state, score weights, metrics, persistence, and allowed transitions. Model output is untrusted until validated. Resume/JD text is delimited as untrusted document content. Prompt IDs are versioned and included in persisted AI usage metadata.

## Live interview lifecycle

```text
CREATED → READY → INTRODUCTION → RESUME → TECHNICAL
        → BEHAVIORAL → CANDIDATE_QUESTIONS → WRAP_UP
        → PROCESSING → COMPLETED
```

Optional sections may be skipped through explicit Python transitions. A model cannot choose arbitrary state. Each root question permits at most two follow-ups by default, and section/question/duration limits are enforced before an AI decision is applied.

After an answer completes, the API persists it, performs a lightweight evaluation/follow-up decision, and emits the next question. Detailed evaluation, speech metrics, topic aggregation, and report work happen independently or after completion. Session state and the current question are durable, enabling browser refresh and WebSocket reconnection.

## Realtime contract

Every WebSocket message uses `{ type, request_id?, payload, sent_at }`. Client events include answer start/partial/completion, control commands, and heartbeat. Server events include session/section changes, questions, thinking state, warnings, analysis progress, completion, and typed errors.

The frontend socket client owns authentication, heartbeat, exponential reconnect, event parsing, and resume. HTTP remains the source of truth after reconnect.

## Background jobs

ARQ is used because it is small, async-native, and sufficient for the MVP. Jobs include calendar sync, document parsing, preparation generation, report generation, analytics aggregation, and reminders. Each long operation has a `ProcessingJob` record with monotonic progress and idempotency key.

## Files and speech

`FileStorage` supports local development and object storage later. Upload validation checks extension, MIME, size, and randomizes storage names. Parsed document structures are cached and reused.

The browser uses MediaRecorder/Web Audio for capture and visualization. STT and TTS are provider interfaces. The development implementation accepts typed transcripts and mock speech. Raw PCM is never sent to the language model.

## Failure behavior

- Missing AI key: deterministic mock provider; all core flows remain usable.
- AI outage: preserve session, emit retriable error, and allow resume.
- Calendar disconnected/expired: retain existing interviews and provide reconnect.
- Redis unavailable: readiness endpoint reports degraded; durable HTTP reads continue.
- Worker restart: queued/idempotent jobs resume safely.
- WebSocket loss: current question and answer history restore over HTTP.

## Testing and quality gates

- Unit: detection, role match, state machine, fillers, scores, readiness, trends.
- Service: interview ownership/CRUD, preparation generation, session progression.
- API: auth, calendar, documents, sessions, reports, errors, idempotency.
- UI: routing, setup/session/report flow, empty/error/loading states, accessibility.
- Browser: desktop and mobile visual checks, keyboard navigation, reduced motion, microphone denial.

Required gates: format, lint, typecheck, tests, Alembic head check, production builds, and browser smoke passes.
