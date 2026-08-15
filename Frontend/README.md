# Intervu AI

Intervu AI is an interview operating system that turns upcoming calendar events into
role-specific preparation, adaptive mock interviews, answer-level coaching, and measurable
improvement.

This repository is the **web frontend only** — a Next.js application. The backend is a
separate project; the contract between the two (every endpoint and WebSocket message this
frontend needs) is fully specified in [docs/API-CONTRACT.md](./docs/API-CONTRACT.md). Until
that backend exists or is reachable, [MSW](https://mswjs.io) intercepts all network traffic in
the browser and serves realistic fixtures over the same contract, so the product is fully
demonstrable on its own.

## What is included

- Premium responsive landing, authentication, and three-step onboarding.
- Dashboard, interview calendar/agenda, selected-interview workspace, preparation plan,
  resume/JD analysis, questions, flashcards, profile, integrations, and settings.
- Immersive interview room with real Web Audio visualization when microphone access is
  available, typed-transcript fallback, adaptive-question architecture, analysis transition,
  and detailed reports.
- Redux Toolkit + RTK Query as the single state and data-fetching layer — see
  [docs/STATE-MANAGEMENT.md](./docs/STATE-MANAGEMENT.md).
- MSW-backed demo mode: every screen works against realistic fixtures with no backend running.
- A typed WebSocket client for live interview sessions, consistent API error handling, and a
  Tailwind-based design system built on the tokens in [DESIGN.md](./DESIGN.md).

## Repository

```text
src/app/          Next.js App Router — thin route shells
src/store/        Redux Toolkit store, hooks, listener middleware, persistence
src/services/     RTK Query API layer + the realtime WebSocket client
src/features/     One directory per product area (components, hooks, slices)
src/components/   ui/ (design-system primitives) and layout/ (shell, nav, command palette)
src/types/        Domain types + wire contracts (REST and realtime)
src/mocks/        MSW handlers and fixtures
docs/             Architecture, state management, API contract, implementation plan, design direction
DESIGN.md         Design tokens and system
PRODUCT.md        Product vision, users, principles
```

The key records are [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md),
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and
[docs/STATE-MANAGEMENT.md](./docs/STATE-MANAGEMENT.md).

## Quick start

Requirements: Node.js 22+, pnpm 11+.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open `http://localhost:3000`. With the default `.env.example` settings
(`NEXT_PUBLIC_API_MOCKING=enabled`, `NEXT_PUBLIC_AUTH_MODE=mock`), the app runs entirely against
MSW-served fixtures — no backend, Firebase project, or provider credentials required. The UI
labels its fixtures as demo/sample data.

To point the app at a real backend once one exists, set `NEXT_PUBLIC_API_MOCKING=` (empty/unset)
and `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` to its address — no frontend code changes
required as long as it implements [docs/API-CONTRACT.md](./docs/API-CONTRACT.md).

## Configuration

The root [.env.example](./.env.example) documents every setting.

### Firebase authentication

```env
NEXT_PUBLIC_AUTH_MODE=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

The browser sends a Firebase ID token as `Authorization: Bearer …` on every API request; the
backend verifies it and resolves an internal user id. This frontend never trusts a
client-supplied user id for anything.

### Backend endpoints

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Architecture rules

- `app/` routes render feature components and own no logic themselves.
- `features/*` may import `components/ui`, `lib`, `types`, `services`, `store` — never each
  other. Shared surface moves up to `components/ui`.
- Server data lives only in the RTK Query cache; a Redux slice never duplicates it.
- Resume and job-description text is treated as untrusted document content wherever it's
  rendered or referenced.
- HTTP is the source of truth after a WebSocket reconnect.

See [docs/STATE-MANAGEMENT.md](./docs/STATE-MANAGEMENT.md) for the full state-ownership rules
and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the rest.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four run together as `pnpm quality`, and on every push via `.github/workflows/ci.yml`.

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

- Production configuration rejects mock auth (`NEXT_PUBLIC_AUTH_MODE=mock`) and demo mode
  (`NEXT_PUBLIC_DEMO_MODE=true`).
- `NEXT_PUBLIC_API_MOCKING` must be unset/disabled in any deployed environment — MSW is a
  development and test tool, never a production data source.
- Provider credentials (Firebase, and anything the backend needs) belong only in server-side
  secret storage; this repository only ever holds `NEXT_PUBLIC_*` values, which are public by
  definition.
- Keep CORS origins explicit on the backend and use HTTPS/WSS endpoints.
