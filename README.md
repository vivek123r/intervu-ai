# Intervu AI

Intervu AI is an interview operating system that turns upcoming calendar events into
role-specific preparation, adaptive mock interviews, answer-level coaching, and measurable
improvement.

This repository holds two independently developed projects, side by side:

```text
Frontend/   Next.js + React + Redux Toolkit/RTK Query — see Frontend/README.md
Backend/    FastAPI + MongoDB, implementing Frontend/docs/API-CONTRACT.md — see Backend/README.md
```

Neither depends on the other to run. The frontend works fully demonstrable on its own
([MSW](https://mswjs.io) serves realistic fixtures over the exact same contract the backend
implements); the backend can be exercised on its own via its contract tests or `curl`. The seam
between them — every endpoint and WebSocket message — is
[`Frontend/docs/API-CONTRACT.md`](Frontend/docs/API-CONTRACT.md), the single source of truth
either side updates in the same change if it needs to deviate.

## Quick start (both together)

Requirements: Node.js 22+, pnpm 11+, [uv](https://docs.astral.sh/uv/), Docker.

```bash
docker compose up -d          # MongoDB (+ mongo-express UI at :8081)
make seed                     # idempotent — seeds Backend/'s MongoDB from the frontend's fixtures
make api                      # FastAPI on :8000, in one terminal
make web                      # Next.js on :3000, in another
```

Open `http://localhost:3000`. `Frontend/.env.local` already points at `http://localhost:8000`
with `NEXT_PUBLIC_API_MOCKING` unset, so the app talks to the real backend — every page should
render identically to the frontend's own MSW-mocked demo mode, since the seed data is a
byte-for-byte port of `Frontend/src/mocks/fixtures.ts`.

To run the frontend alone with no backend or Docker at all, see
[`Frontend/README.md`](Frontend/README.md)'s quick start (`NEXT_PUBLIC_API_MOCKING=enabled`).

See the [Makefile](Makefile) for the individual commands each of these wraps.

## Quality gates

```bash
make lint       # ruff (Backend) + eslint (Frontend)
make test       # pytest (Backend, against mongomock) + vitest (Frontend)
make quality    # the above, plus mypy and a production Next.js build
```

Each side also has its own gate command — `Backend/README.md`'s Testing section and
`Frontend/README.md`'s Quality gates section.

## Where to look next

- [`Frontend/PRODUCT.md`](Frontend/PRODUCT.md) — product vision, users, principles.
- [`Frontend/DESIGN.md`](Frontend/DESIGN.md) — design tokens and system.
- [`Frontend/docs/ARCHITECTURE.md`](Frontend/docs/ARCHITECTURE.md) — frontend architecture and
  state ownership.
- [`Frontend/docs/API-CONTRACT.md`](Frontend/docs/API-CONTRACT.md) — the full REST + WebSocket
  contract both projects are built against.
- [`Backend/README.md`](Backend/README.md) — backend architecture, the AI seam, and what's
  deliberately mocked versus real.
