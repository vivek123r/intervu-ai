# Intervu AI implementation plan

This plan covers the frontend repository only. The backend now lives in a separate project and
implements [docs/API-CONTRACT.md](./API-CONTRACT.md); it is out of scope here.

## Phase 1 — Frontend foundation (state management + architecture restructure)

- Flatten the repository to a single Next.js app; remove the FastAPI backend and pnpm workspace.
- Redux Toolkit store: typed hooks and the RTK Query middleware. Listener middleware and a
  persistence allow-list are added in Phase 2 alongside the first slice that actually needs
  persisting (`preferences.slice.ts`) — an empty persistence layer with nothing to persist isn't
  built ahead of need.
- RTK Query: one base API, `injectEndpoints` per domain, contract validation via `zod`.
- MSW: handlers + fixtures serving [docs/API-CONTRACT.md](./API-CONTRACT.md) over the real
  endpoint shapes, so the app runs convincingly with no backend present.
- Tailwind v4 `@theme` block exposing the existing design tokens as utilities; `class-variance-
  authority` primitives for the existing button/surface components.
- CI running `pnpm quality` on every push.

See [docs/STATE-MANAGEMENT.md](./STATE-MANAGEMENT.md) for the conventions this phase
establishes — every later phase follows them rather than re-deciding state ownership per
feature.

## Phase 2 — Feature migration

Move each feature off the old `product-store.tsx` Context and onto RTK Query + (only where
genuinely needed) a Redux slice, one vertical slice at a time so the app stays runnable
throughout:

1. **Interviews + dashboard** — reference implementation; see the worked example in
   docs/STATE-MANAGEMENT.md.
2. **Preparation** — plan generation, task toggling, resume/JD upload and analysis.
3. **Practice** — session setup, the live interview room, results/report. The one feature that
   gains a slice (`practice/session.slice.ts`) for client-only realtime state.
4. **Analytics** — dashboard aggregates, topic performance, trends.
5. **Questions, flashcards** — read-mostly, likely RTK Query with no slice.
6. **Settings, profile, integrations** — `/me`, calendar connection.

`src/lib/product-store.tsx` is deleted once its last consumer is migrated — not before, so the
app never has a broken intermediate state.

## Phase 3 — Realtime session

Wire `src/services/socket/interview-socket.ts` into the RTK Query cache via
`onCacheEntryAdded` on `getSession` (depends on Phase 2's practice migration landing first).
Covered in detail in docs/STATE-MANAGEMENT.md's Realtime integration section and
docs/ARCHITECTURE.md's Realtime session section.

## Phase 4 — Design system completion

- Build the primitives pages currently hand-roll inline: `Input`, `Textarea`, `Select`, `Field`,
  `Card`, `Badge`, `Chip`, `Toast`, `Tooltip`, `Skeleton`, `EmptyState`, `ErrorState`.
- Wire `<ErrorState>`/`<Skeleton>`/`<EmptyState>` to RTK Query's `isLoading`/`isError` so every
  screen handles those states consistently instead of assuming data is always present.
- Migrate each feature's CSS Module to Tailwind utilities as that feature is touched in Phase 2
  — not as a separate big-bang rewrite. Compare against `.impeccable/mocks/*.png` (the approved
  design references) after each migration.

## Phase 5 — Test backfill and hardening

- Slice reducer/selector unit tests.
- Component tests via `renderWithProviders` + MSW (see docs/STATE-MANAGEMENT.md's Testing
  section) for every migrated feature — loading/empty/error states as first-class cases.
- Socket reconnect/backoff and server-event → cache-update mapping tests.
- Responsive and accessibility audit against docs/DESIGN-DIRECTION.md's breakpoints and
  accessibility floor.
- Remove `packages/shared-types`-era leftovers and confirm `pnpm quality` is green with no
  `product-store` references remaining anywhere in `src/`.
