# Intervu AI

Intervu AI is a full-stack interview operating system that turns upcoming calendar events into role-specific preparation, adaptive mock interviews, answer-level coaching, and measurable improvement.

The repository contains a launch-oriented Next.js application and a modular FastAPI backend. It boots without external credentials in deterministic demo mode; Firebase, Google Calendar, and OpenRouter can be enabled later without changing routes or frontend flows.

## What is included

- Premium responsive landing, authentication, and three-step onboarding.
- Dashboard, interview calendar/agenda, selected-interview workspace, preparation plan, resume/JD analysis, questions, flashcards, profile, integrations, and settings.
- Immersive interview room with real Web Audio visualization when microphone access is available, typed-transcript fallback, adaptive-question architecture, analysis transition, and detailed reports.
- FastAPI, SQLAlchemy 2, PostgreSQL, Alembic, Redis/ARQ, Firebase verification, encrypted Google OAuth credentials, Calendar normalization/detection, document processing, analytics, reports, and typed WebSockets.
- Provider-neutral AI orchestration with deterministic `MockAIProvider` and `OpenRouterAIProvider`.
- Shared WebSocket contracts, consistent API errors, rate limiting, request IDs, security headers, tests, Docker development services, and an initial migration.

## Repository

```text
apps/web                 Next.js 16, React 19, TypeScript, Motion
apps/api                 FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, ARQ
packages/shared-types    Shared realtime and API contracts
docs                     Architecture, implementation, and visual direction
docker-compose.yml       PostgreSQL, Redis, API, and worker
```

The key design and architecture records are [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Quick start

Requirements: Node.js 22+, pnpm 11+, Docker with Compose, and optionally Python 3.13 with `uv` for running the API outside Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d --build postgres redis api worker
pnpm dev:web
```

Open:

- Web: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/v1/health`
- Readiness: `http://localhost:8000/api/v1/health/ready`

The default configuration uses mock auth, mock Calendar data, mock speech, and deterministic mock AI. No provider key is required. The UI labels its fixtures as demo/sample data.

To run only the backing services and start the API manually:

```bash
make infra
cd apps/api
uv sync --all-extras
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Configuration

The root [.env.example](./.env.example) documents every setting. When running Next.js outside a container, expose the frontend variables through the process environment or an `apps/web/.env.local` file.

### Real OpenRouter AI

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<your-key>
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
```

Optional workload-specific model variables are `AI_MODEL_INTERVIEW`, `AI_MODEL_ANALYSIS`, `AI_MODEL_PREPARATION`, and `AI_MODEL_CLASSIFICATION`. Routes and agent services do not change when the provider changes.

### Firebase authentication

Set the Firebase Admin values for the API:

```env
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Set the public Firebase web-app values for Next.js:

```env
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

The browser sends a Firebase ID token. The API verifies it and resolves an internal UUID user; frontend-supplied user IDs are never trusted.

### Google Calendar

Calendar consent is deliberately separate from Firebase sign-in. Configure a Google OAuth client and callback:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/calendar/callback
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.readonly
APP_ENCRYPTION_KEY=<long-random-secret>
OAUTH_STATE_SECRET=<different-long-random-secret>
```

Refresh tokens are encrypted server-side, excluded from API responses and logs, and never stored in browser storage.

### Frontend endpoints

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Architecture rules

- API handlers validate, authorize, call a service, and serialize a schema.
- Services own business workflows and transaction boundaries.
- Repositories own persistence and always scope user-owned data.
- Python owns state, authorization, timers, scores, statistics, limits, and allowed transitions.
- Specialized agents own semantic tasks and consume only the `AIProvider` interface.
- Model output is schema-validated and never executes SQL, accesses secrets, or changes application state directly.
- Resume and job-description text are treated as untrusted document content.
- HTTP is the source of truth after a WebSocket reconnect.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the data model, AI roles, session state machine, failure behavior, and realtime contract.

## Quality gates

Frontend and shared packages:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Backend inside the reproducible Docker environment:

```bash
make backend-quality
```

That gate runs Ruff formatting/linting, strict mypy, and pytest. Migration state can be checked with:

```bash
docker compose run --rm api uv run alembic check
```

The backend gate creates and uses a dedicated `intervu_test` database; it never truncates the
development database. After configuring OpenRouter, the launch-slice smoke runner can exercise
identity, interview creation, resume/JD analysis, preparation, adaptive questioning, evaluation,
report recovery, and analytics against a running API:

```bash
docker compose exec api uv run python scripts/smoke_launch_flow.py \
  --base-url http://localhost:8000
```

The runner creates clearly synthetic records and never reads or prints provider credentials.

## Core product routes

```text
/
/login
/onboarding
/dashboard
/interviews
/interviews/[id]
/interviews/[id]/prepare
/interviews/[id]/mock
/practice
/practice/setup
/practice/session
/practice/results/[id]
/analytics
/questions
/flashcards
/profile
/settings
/settings/integrations
```

## Production notes

- Production configuration rejects mock auth and default encryption secrets.
- Use a managed PostgreSQL database, managed Redis, and durable object storage before launch.
- Keep CORS origins explicit and use HTTPS/WSS endpoints.
- Run Alembic migrations as a release step; the application does not use `create_all()` as a production migration strategy.
- Provider credentials belong only in server-side secret storage.
- Replace local document storage and mock speech providers through their existing interfaces when vendors are selected.
