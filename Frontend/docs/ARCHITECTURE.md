# Intervu AI architecture

## Decision summary

Intervu AI's frontend is a standalone Next.js application, developed and deployed independently
of its backend even though both live in this one repository — `Frontend/` here, `Backend/` (a
FastAPI + MongoDB service) as its sibling. The seam between them is
[docs/API-CONTRACT.md](./API-CONTRACT.md) — every endpoint and WebSocket message this frontend
needs, specified independently of the backend's implementation, and implemented against it in
[`Backend/app/`](../../Backend/app). See [`Backend/README.md`](../../Backend/README.md) for that
side's own architecture notes.

The frontend remains fully demonstrable without a running backend: [MSW](https://mswjs.io)
intercepts every request at the network layer and serves realistic fixtures over the exact
contract in API-CONTRACT.md, so the UI, the RTK Query layer, and the realtime session flow are
all exercised the same way they are against the real backend.

The primary launch slice is:

`sign in → connect calendar → confirm interview → attach resume/JD → generate plan → run adaptive mock → receive report → practice weak answers`

## Repository topology

```text
src/
  app/          Next.js App Router — routes are thin shells only (see below)
  store/        Redux Toolkit store, typed hooks, listener middleware, persistence
  services/
    api/        RTK Query — one base API, endpoints injected per domain
    socket/     Realtime session client (WebSocket)
  features/     One directory per product area — components, hooks, slices
  components/
    ui/         Design-system primitives (feature-agnostic, reusable everywhere)
    layout/     App shell, marketing nav, command palette
  types/        Domain types + wire contracts (REST + realtime), shared across the app
  mocks/        MSW handlers + fixtures — the network-level stand-in for the backend
  lib/          cn, env access, formatters — small framework-free helpers
docs/           This file, API-CONTRACT.md, IMPLEMENTATION-PLAN.md, DESIGN-DIRECTION.md
DESIGN.md       Design tokens and system (source of truth for src/app/globals.css)
PRODUCT.md      Product vision, users, principles
```

See [docs/STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) for the full state-ownership rules and
the `features/*` import boundary. In short: `app/` routes render feature components and own no
logic themselves; `features/*` may import `components/ui`, `lib`, `types`, `services`, `store`,
but never each other.

## Runtime boundaries

```text
Browser
  ├─ Next.js UI (App Router, React 19)
  ├─ Redux Toolkit store (client + UI state)
  ├─ RTK Query (all server state — the only cache for backend data)
  ├─ Web Audio / MediaRecorder (microphone capture + visualization)
  ├─ Firebase client SDK (identity)
  └─ typed WebSocket client (live interview session)
        ↓  HTTPS / WSS, contract defined in docs/API-CONTRACT.md
Backend (../Backend — FastAPI + MongoDB, developed independently of this app)
```

In development, `NEXT_PUBLIC_API_MOCKING=enabled` routes that same arrow into
[src/mocks/](../src/mocks/) instead of a real network call — the app cannot tell the
difference, which is the point.

## State ownership

Three kinds of state exist in this app, and each has exactly one home:

| Kind | Home | Examples |
|---|---|---|
| Server data | RTK Query cache | interviews, tasks, reports, analytics, notifications |
| Cross-screen client state | Redux slice | auth session, live practice session, UI (modals/palette), preferences |
| Screen-local ephemeral | `useState` | form drafts, hover, accordion open |

The rule that matters most: **RTK Query data is never copied into a slice.** Full detail,
including the listener-middleware persistence policy and the feature-slice import boundary,
lives in [docs/STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md).

## Identity and authorization

The browser obtains a Firebase ID token client-side and sends it as
`Authorization: Bearer …` on every request (see `prepareHeaders` in
[src/services/api/base-api.ts](../src/services/api/base-api.ts)). Token verification, internal
user resolution, and ownership scoping are the backend's responsibility — this repository never
trusts a client-supplied user id for anything, and never renders data as if it were
authoritative before the backend has confirmed it.

`NEXT_PUBLIC_AUTH_MODE=mock` sends a fixed demo token for local development without Firebase
configured; production must set it to `firebase` and provide real project credentials.

Google Calendar consent is a separate OAuth grant from Firebase sign-in, initiated by
`POST /calendar/connect` and completed by a backend redirect — the frontend never sees or
stores calendar access/refresh tokens. See API-CONTRACT.md's Calendar section.

## Realtime session

The frontend owns: WebSocket authentication (via a short-lived ticket, never a raw Firebase
token in the connection URL), a 20s heartbeat, capped exponential-backoff reconnect, envelope
parsing, and resuming session state after a reconnect. All of this lives in
[src/services/socket/interview-socket.ts](../src/services/socket/interview-socket.ts).

**HTTP is the source of truth after a WebSocket reconnect.** On reconnect, the client refetches
`GET /sessions/{id}` before trusting any further socket event — it never reconstructs session
history from the socket alone. Socket events are bound into the RTK Query cache via
`onCacheEntryAdded` (see [docs/STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md)), so the live
interview reads from the same cache as every other screen instead of a parallel state tree.

Full message contract — every client and server event, with payload shapes — is in
[docs/API-CONTRACT.md](./API-CONTRACT.md#websocket-contract-live-interview).

## Design system

[DESIGN.md](../DESIGN.md) is the token source of truth (colors, type scale, radii, spacing,
component specs); [docs/DESIGN-DIRECTION.md](./DESIGN-DIRECTION.md) is the applied visual
thesis and layout grammar. Both are implemented as:

- CSS custom properties in [src/app/globals.css](../src/app/globals.css) (`--color-*`,
  `--radius-*`, `--shadow-*`, `--space-*`), and
- a Tailwind v4 `@theme` block that exposes those same properties as utilities, so new
  components are built from Tailwind classes plus the shared [`cn()`](../src/lib/cn.ts) helper
  and [class-variance-authority](https://cva.style) variants rather than bespoke CSS Modules.

Existing CSS Modules (`product.module.css`, `practice.module.css`, `landing.module.css`,
`auth.module.css`) are migrated to Tailwind utilities incrementally, feature by feature, rather
than in one pass — the design is already reviewed and shipping
(`.impeccable/review/finish-review.md`), so a wholesale rewrite is unjustified visual risk.
Canvas/motion primitives (`ambient-field`, `waveform`, `ai-orb`, `score-ring`, `sparkline`) stay
as drawing code — they were never CSS-Module candidates.

## Failure behavior

- Missing/misconfigured backend: MSW mocking (`NEXT_PUBLIC_API_MOCKING=enabled`) keeps every
  flow usable with realistic fixtures.
- Backend outage (mocking disabled, real backend unreachable): RTK Query surfaces `isError`;
  screens render the shared `<ErrorState>` primitive with retry, never a blank or frozen screen.
- Calendar disconnected/expired: existing interviews are retained; the integrations screen
  offers reconnect.
- WebSocket loss: current question and answer history restore over HTTP on reconnect (see
  Realtime session, above).
- Reduced motion / no microphone: every animated primitive respects `prefers-reduced-motion`
  (`MotionConfig reducedMotion="user"` in [src/app/providers.tsx](../src/app/providers.tsx));
  the interview room falls back to a typed-transcript flow when microphone access is denied.

## Testing and quality gates

- Unit: slice reducers, selectors, formatters.
- Integration: components rendered against MSW + a real store (`renderWithProviders`), covering
  loading/empty/error states as first-class cases, not afterthoughts.
- Realtime: socket reconnect/backoff and server-event → cache-update mapping, against a mock
  WebSocket.
- UI/browser: routing, setup → session → report flow, keyboard navigation, reduced motion,
  microphone denial, responsive breakpoints from DESIGN-DIRECTION.md.

Required local gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (bundled as
`pnpm quality`). CI runs the same gate on every push — see `.github/workflows/ci.yml`.
