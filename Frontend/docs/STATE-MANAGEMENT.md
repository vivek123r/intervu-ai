# State management conventions

This document is the reference for how state is organized in this codebase. Read it before
adding a new slice, a new RTK Query endpoint, or a new feature directory. It exists because the
project's first implementation put all client state — server data, UI state, and everything
else — into one React Context object, and that does not hold up as the app grows: every
consumer re-rendered on any change, server data had no loading/error/staleness model, and there
was no rule stopping the same fact from being stored in two places at once. Redux Toolkit +
RTK Query fixes this by giving each kind of state exactly one legal home.

## The three-tier rule

| Kind of state | Home | Examples | Never |
|---|---|---|---|
| Server data | **RTK Query cache** | interviews, tasks, reports, analytics, notifications, calendar connection | Copied into a slice "for convenience" |
| Cross-screen client state | **Redux slice** | auth session, live practice session (timer, mic permission, recording state, socket status), UI (modal/palette open), preferences | Server-owned fields (an interview's `readiness`, a report's scores) |
| Screen-local ephemeral | **`useState`** | form drafts, hover, accordion/tab selection, "copied!" toast timers | Anything another screen needs to read |

The single rule that matters most: **if the backend can tell you this value, RTK Query owns
it — a slice must never hold a duplicate.** The moment a slice starts caching server data by
hand, it silently reintroduces the exact bug class this migration removed: two sources of truth
that drift apart. When you're unsure which tier something belongs in, ask "does this outlive a
page navigation, and could a second tab / a refresh legitimately see a different value from the
server?" — if yes, it's server data.

## Directory layout

```text
src/store/
  index.ts                 configureStore, RootState/AppDispatch types
  hooks.ts                 useAppSelector / useAppDispatch — always import from here, never
                            from "react-redux" directly, so the store's types stay attached
  listener-middleware.ts   side effects: persistence, cross-slice reactions
  persistence.ts           the localStorage allow-list (see Persistence, below)

src/services/
  api/
    base-api.ts            ONE createApi instance — baseQuery, tagTypes, error normalization
    interviews.api.ts       injectEndpoints({ ... }) — one file per domain
    preparation.api.ts
    practice.api.ts
    analytics.api.ts
    calendar.api.ts
    documents.api.ts
    system.api.ts           notifications, jobs, /me
  socket/
    interview-socket.ts     realtime session client (see Realtime, below)

src/features/
  auth/            auth.slice.ts, components/, hooks/
  interviews/      components/, hooks/           (no slice — pure RTK Query feature)
  preparation/     components/, hooks/
  practice/        session.slice.ts, components/, hooks/
  analytics/       components/, hooks/
  questions/       components/, hooks/
  flashcards/      components/, hooks/
  settings/        components/, hooks/
  notifications/   components/, hooks/
  ui/              ui.slice.ts, preferences.slice.ts

src/components/
  ui/              design-system primitives — feature-agnostic, reusable everywhere
  layout/          app-shell, marketing-nav, command-palette

src/types/         domain.ts (camelCase domain model), api.ts, realtime.ts, contracts/ (zod)
src/mocks/         MSW handlers + fixtures
```

Slice files (`auth.slice.ts`, `session.slice.ts`, `ui.slice.ts`, `preferences.slice.ts`) are
created when the feature that needs them is migrated, per the Slices section below — the tree
above shows their eventual home, not a claim that all of them exist yet.

**`src/app/*/page.tsx` files are thin shells.** A route file imports and renders one feature
component; it does not fetch data, hold state, or contain markup beyond composing feature
components. If a `page.tsx` is more than ~15 lines, logic that belongs in `features/` has leaked
into the route.

## The feature import boundary

`features/*` may import from `components/ui`, `lib`, `types`, `services`, `store`.
**`features/*` must never import from another `features/*` directory.** If two features need
the same component or hook, that thing moves up to `components/ui` (or `lib` for a pure
function) — it was never feature-specific to begin with. This is what keeps the codebase
modular as it grows: a feature can be deleted, rewritten, or handed to a different set of files
without hunting for cross-feature imports.

Enforce this with a lint rule rather than code review memory — add an `eslint-plugin-boundaries`
config (or a `no-restricted-imports` pattern per feature) so a cross-feature import fails
`pnpm lint`, not just review.

## RTK Query conventions

- **One `createApi` instance** (`src/services/api/base-api.ts`), with every domain's endpoints
  added via `injectEndpoints`. This keeps a single cache and a single `tagTypes` registry while
  still letting each feature own its own endpoint file.
- **`fetchBaseQuery`** with `prepareHeaders` attaching `Authorization: Bearer <firebase id
  token>` and `X-Request-ID`. Errors are normalized to the `ApiErrorEnvelope` shape from
  [src/types/api.ts](../src/types/api.ts) so every endpoint's `error` has the same shape
  regardless of what the backend actually returned.
- **`transformResponse` is where wire data becomes domain data.** Even though the contract in
  [docs/API-CONTRACT.md](./API-CONTRACT.md) specifies camelCase end to end (removing the
  snake_case mapping this project used to need), `transformResponse` is still the right place to
  parse each response against a `zod` schema from `src/types/contracts/`. A backend that drifts
  from the contract should produce a loud parse error in development, not a silently-`undefined`
  field three components downstream.
- **Tag every entity, invalidate precisely.** e.g. `confirmInterview` invalidates
  `["Interview", "Analytics"]` because confirming changes both the interview list and dashboard
  aggregates; it does not invalidate `"Preparation"`, which confirming an interview doesn't
  touch. Over-invalidating causes redundant refetches; under-invalidating causes stale UI — both
  are bugs, so pick tags by tracing what the backend actually recomputes, not by habit.
- **Never write a `useEffect` + `useState` to fetch something RTK Query can fetch.** If you find
  yourself doing that, an endpoint is missing — add it to the relevant `*.api.ts` file instead.

## Slices

A slice exists only for state with no server representation, and is created only when its
owning feature is migrated and genuinely needs one — an empty slice with no dispatcher is dead
code, not architecture. The interviews + dashboard migration in
[docs/IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) Phase 1 needed **zero** slices, which is
the expected outcome, not an exception — see the worked example at the end of this document.
The planned slices below get created as the feature that needs them migrates:

- **`auth.slice.ts`** — `user`, `status` (`idle | authenticating | authenticated |
  unauthenticated`), `onboardingCompleted`. The Firebase ID token itself is never stored in
  Redux — it's read fresh via the Firebase SDK inside `prepareHeaders` each request.
- **`practice/session.slice.ts`** — the live mock-interview state that genuinely has no server
  form: elapsed timer, mic permission, recording state, partial-transcript buffer, socket
  connection status, current question index while a question is in flight. (The session's
  durable data — questions asked, answers given, final report — is server data and lives in
  RTK Query, fetched via `GET /sessions/{id}`.)
- **`ui.slice.ts`** — command palette open/closed, active modal, toast queue.
- **`preferences.slice.ts`** — theme/motion/notification preferences. The only slice that is
  fully persisted (see below).

Colocate `selectX` functions in the slice file that owns the state. Use `createSelector` for
anything derived (e.g. `selectUnreadNotificationCount` over the notifications RTK Query cache)
so components subscribe to a narrow, memoized value instead of re-rendering on every store
change — this is the direct fix for the old Context store's whole-tree re-render problem.

## Persistence

A listener-middleware entry (`src/store/listener-middleware.ts` +
`src/store/persistence.ts`) matches only `preferences/*` and `auth/onboardingCompleted`-type
actions and writes an explicit allow-list to `localStorage`. This replaces the old approach of
serializing the entire state tree on every change — RTK Query's cache, the practice session
slice, and UI state are deliberately **not** persisted; a refresh should refetch from the
network (or MSW), not resurrect a stale local copy. No `redux-persist` — the allow-list is a
few lines and avoids that library's rehydration-timing and SSR interactions.

## Realtime integration

The WebSocket session client does not maintain its own parallel state tree. It binds into the
RTK Query cache via `onCacheEntryAdded` on the `getSession` endpoint: when the cache entry for a
session is created, open the socket; on each server event, either call `updateCachedData` (for
anything that changes what `GET /sessions/{id}` would itself return — a new question, a section
change, completion) or dispatch to `practice/session.slice` (for client-only state — the
"interviewer thinking" indicator, socket connection status, a warning banner). This means the
live interview screen and every other screen read the same cache, and a refresh or reconnect is
just a refetch, not a special case. See
[docs/API-CONTRACT.md](./API-CONTRACT.md#websocket-contract-live-interview) for the full event
list and [docs/ARCHITECTURE.md](./ARCHITECTURE.md#realtime-session) for the reconnect contract.

## Testing

Use a `renderWithProviders(ui, { preloadedState })` helper that wraps a component in a real
`<Provider store={configureTestStore(preloadedState)}>` with MSW handling any RTK Query calls it
triggers — not a hand-mocked store or a snapshot of `useSelector`. This catches the actual
wiring (selectors, tag invalidation, loading states) instead of only the component's render
output. Slice reducers and selectors get plain unit tests, since they're pure functions.

## Worked example: `features/interviews`

This is the reference implementation the rest of the app's feature migrations should match:

1. `src/services/api/interviews.api.ts` — `injectEndpoints` for `getDashboardOverview`,
   `getInterviews`, `getInterview`, `createInterview`, `updateInterview`, `deleteInterview`,
   `confirmInterview`, each `transformResponse`-validated against
   `src/types/contracts/interview.ts`, tagged `"Interview"` (+ `"Analytics"` where confirming or
   creating changes dashboard aggregates).
2. `src/features/interviews/components/` — `interview-list.tsx`, `interview-detail.tsx`,
   `add-interview-modal.tsx`, `interview-card.tsx` — each calls the generated hooks
   (`useGetInterviewsQuery`, `useCreateInterviewMutation`, ...) directly. No slice exists for
   this feature because there is no client-only state to hold — form drafts inside the add
   modal are local `useState`.
3. `src/app/(product)/interviews/page.tsx` — renders `<InterviewList />` and nothing else.

No new slice was needed for this feature — that's the expected outcome for most of them.
`practice` is the exception because a live session genuinely has client-only state that outlives
a single component.
