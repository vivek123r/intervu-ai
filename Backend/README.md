# Intervu AI — Backend

FastAPI + MongoDB implementation of [`../Frontend/docs/API-CONTRACT.md`](../Frontend/docs/API-CONTRACT.md),
developed independently of the frontend even though both live in this one repository. Every
endpoint and WebSocket message in that document is implemented here; if the two ever disagree,
the contract doc is source of truth — update it in the same change as the fix.

**Scope of this implementation:** every feature is wired end-to-end with deterministic, mocked
logic so the whole product runs against a real database. Real AI (adaptive questioning, resume
parsing, scoring) is intentionally **not** implemented — see [The AI seam](#the-ai-seam) below.
Real Google Calendar OAuth is also mocked (`connect` succeeds instantly instead of a real
authorization round trip).

## Quick start

Requirements: Python (via [uv](https://docs.astral.sh/uv/), which installs its own pinned
3.12), Docker (for MongoDB).

```bash
# from the repo root
docker compose up -d mongo        # MongoDB on :27017 (+ mongo-express UI on :8081)
cd Backend
cp .env.example .env
uv sync
uv run python -m scripts.seed     # idempotent — safe to re-run
uv run uvicorn app.main:app --reload --port 8000
```

Or, from the repo root: `make up && make seed && make api` (see the root
[Makefile](../Makefile)).

Verify: `curl -H "Authorization: Bearer demo-token" localhost:8000/api/v1/me` — with
`AUTH_MODE=mock` (the `.env.example` default), any request needs exactly that header; the
seeded demo user (`alex.morgan@example.com`) comes back. Point `Frontend/.env.local` at
`http://localhost:8000` (unset `NEXT_PUBLIC_API_MOCKING`) and every page should render
identically to MSW, since the seed data is a byte-for-byte port of `Frontend/src/mocks/fixtures.ts`.

## Directory structure

```text
app/
  main.py, config.py, lifespan.py, dependencies.py   App factory, settings, DI wiring
  core/          serialization.py (CamelModel), ids.py, timeutils.py, security.py, uploads.py
  db/            mongo.py (tz-aware client), indexes.py
  errors/        codes.py, exceptions.py, handlers.py  → the {error:{code,message,details,requestId}} envelope
  middleware/    request_context.py (X-Request-ID), security_headers.py
  schemas/       one CamelModel per wire entity — this IS the Mongo storage shape too (see below)
  repositories/  one class per collection; user-owned ones take user_id as a required argument
  services/      business logic + the mock-vs-real seam
  api/v1/        route handlers, one file per domain, mounted under /api/v1
  realtime/      the /ws/interviews/{sessionId} WebSocket (mounted at the app root, no prefix)
  ai/            provider.py (Protocol) + mock.py (DeterministicProvider) — see below
  seed/          fixtures.py — verbatim port of the frontend's demo data
scripts/seed.py  idempotent upsert of every fixture document by its literal _id
tests/contract/  one file per domain, asserting responses against the documented shapes
```

### Why no separate persistence-model layer

For nearly every entity, the wire shape *is* the storage shape, so `schemas/` holds one
`CamelModel` per entity — snake_case Python attributes, camelCase JSON both ways, `extra="ignore"`
so storage-only fields (`user_id`, `interview_id`, `firebase_uid`, …) never leak onto the wire
without a second parallel model tree to keep in sync. `repositories/base.py` owns the `_id`/`id`
swap and Mongo's naive-datetime quirk (`ensure_utc`) in one place.

### Correctness rules that aren't obvious from the code

- **zod's `.optional()` (frontend) means "key absent", not "key present and null."** Fields the
  frontend expects *omitted* when empty (`Interview.meetingUrl`, `PracticeSession.startedAt`,
  `NotificationItem.actionHref`, …) are declared via `omit_if_none` on the model — see
  `core/serialization.py`. Every other `None` field is serialized as `null` deliberately
  (`User.avatarUrl`, `ProcessingJob.resultId`, `DashboardOverview.nextInterview`).
- **`PracticeSession.status` (4 values) is a projection of the internal 10-value `SessionState`**
  — see `services/session_state.py`. `"created"` never appears on the wire.
- **Job status is derived from elapsed time, not a background task** (`services/jobs.py`). The
  actual work happens synchronously in the same request that returns the `202`; `GET /jobs/{id}`
  computes `processing`/`completed` from a wall-clock duration. This is reload-proof and
  worker-proof with zero infrastructure — a real queue is a drop-in upgrade behind the same
  `JobService` interface if the work ever stops being instant.
- **Three status vocabularies that look similar are never shared**: `InterviewRound.status`
  (`completed|current|pending`), `PreparationTask.status` (`pending|in_progress|completed`),
  `PreparationTimelineStep.status` (`complete|active|upcoming` — note `complete`, not
  `completed`). See `schemas/common.py`.

## The AI seam

`app/ai/provider.py` defines the `AIProvider` Protocol: `generate_questions`, `score_answer`,
`generate_report`. `app/ai/mock.py`'s `DeterministicProvider` is the only implementation —
fixed question bank, a word-count scoring formula, templated report content. To add real AI,
implement the Protocol and swap the binding in `app/dependencies.py`
(`get_ai_provider`/`_ai_provider`); nothing in `services/practice.py` or the realtime layer
needs to change. The scripted WebSocket flow in `app/realtime/connection.py` only translates
whatever the provider returns into envelopes — it has no question-selection or scoring logic of
its own, on purpose.

## Testing

```bash
uv run pytest          # tests/contract/*, against mongomock — no Docker required
uv run ruff check .
uv run mypy app
```

All three run together via `make quality` (root Makefile), alongside the frontend's own gates.
`tests/conftest.py` swaps in `mongomock-motor` (`Mongo.override_for_testing`), so the suite runs
in well under a second and never touches the real database.

## Environment

See [`.env.example`](.env.example). The only ones worth calling out:

- `AUTH_MODE=mock` accepts exactly the literal token `demo-token` and resolves the seeded demo
  user — no Firebase project needed for local development. Set `firebase` and the
  `FIREBASE_*` credentials to verify real ID tokens instead.
- `MONGODB_URL` / `MONGODB_DB` — point at the Docker Compose Mongo by default.
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unused while calendar OAuth is mocked; they're
  wired through config for whenever that's implemented for real.

## Known gaps (by design, not oversight)

- No real Google Calendar OAuth, STT/TTS, resume parsing, or adaptive AI — see [The AI
  seam](#the-ai-seam) and the Calendar section of API-CONTRACT.md.
- `answer.partial_transcript` is never sent over the WebSocket — there's no streaming STT
  provider behind the mock.
- Rate limiting is not implemented (`RATE_LIMIT_ENABLED` exists in config as a future flag).
- Single-worker `uvicorn` assumed; nothing here requires it, but nothing has been load-tested
  against multiple workers either.
