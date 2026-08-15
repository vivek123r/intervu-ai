# Intervu AI — API contract

This document specifies every HTTP endpoint and WebSocket message the Intervu AI frontend
requires from the backend. The backend is now built and versioned as a **separate project**
— this repository contains no server code. This contract is the seam between the two: the
frontend's [RTK Query](../src/services/api/) layer is written against exactly the shapes
documented here, and its [MSW](../src/mocks/) mocks simulate them byte-for-byte. Implement the
backend to this document (in any language/framework) and the two projects integrate with zero
frontend changes beyond flipping `NEXT_PUBLIC_API_MOCKING` off.

If a real backend needs to deviate from this contract, update this file in the same change —
it is the source of truth, not the old FastAPI implementation this project used to contain.

## Conventions

- **All JSON — request bodies, response bodies, and WebSocket payloads — uses camelCase field
  names.** There is no snake_case anywhere on the wire. This is a deliberate frontend-driven
  choice: earlier revisions of this project paired a Python/Pydantic backend (snake_case) with
  a TypeScript frontend (camelCase) and paid for a translation layer at every boundary. Building
  the backend fresh removes the reason for that layer to exist at all.
- **IDs** are opaque strings (UUIDs recommended). Never assume they are sortable or numeric.
- **Timestamps** are ISO-8601 with an explicit UTC offset (`2026-08-18T10:30:00.000Z`). Where an
  interview's original calendar timezone matters for display, it travels separately as an IANA
  zone string (`timezone: "Asia/Kolkata"`), never by shifting the timestamp itself.
- **Auth**: every request except `POST /auth/session` (if the backend issues its own session)
  carries `Authorization: Bearer <Firebase ID token>`. The backend verifies it with Firebase
  Admin and resolves an internal user id; every owned resource is scoped to that id. A
  `mock`-mode backend accepts a fixed `demo-token` and resolves a deterministic demo user — see
  `NEXT_PUBLIC_AUTH_MODE` in [.env.example](../.env.example).
- **Request tracing**: the client sends `X-Request-ID: <uuid>` on every call. Echo it back in
  `error.requestId` on failures so a report can be traced end-to-end.
- **Errors** always use this envelope, regardless of status code:

  ```json
  {
    "error": {
      "code": "INTERVIEW_NOT_FOUND",
      "message": "Human-readable, safe to display.",
      "details": {},
      "requestId": "3f9c2b1a-..."
    }
  }
  ```

  `code` is a stable `SCREAMING_SNAKE_CASE` string the frontend can switch on; `message` is
  fallback display copy, not a debugging string. See [src/types/api.ts](../src/types/api.ts).
- **Ownership**: every resource below (interviews, resumes, sessions, reports, ...) belongs to
  exactly one user. A request for another user's resource returns `404`, never `403` — existence
  of another user's data should not be observable.
- **Idempotency**: calendar sync and any endpoint that creates a resource from an external event
  must be idempotent on a natural key (see each section). Retried requests must not create
  duplicates.
- **Pagination is out of scope for this revision.** All list endpoints below return full
  collections. The data volumes at this product's scale (a user's own interviews, tasks,
  sessions) do not warrant it yet; if that changes, add cursor pagination (`?cursor=&limit=`)
  as an additive change, not a breaking one.

## Domain types

Response bodies are structurally typed against [src/lib/domain.ts](../src/lib/domain.ts)
(moving to `src/types/domain.ts` — see [docs/ARCHITECTURE.md](ARCHITECTURE.md)): `Interview`,
`InterviewRound`, `PreparationTask`, `TopicMetric`, `Question`, `SessionAnswer`,
`PracticeConfig`, `PracticeSession`, `AnswerReview`, `InterviewReport`, `NotificationItem`.
This document defines the additional types those files don't yet cover — `User`,
`CalendarConnection`, `Resume`, `JobDescriptionAnalysis`, `ProcessingJob` — which belong in the
same file once implementation starts.

---

## Auth & profile

### `GET /me`

Returns the signed-in user's profile. Backs the profile page and the app shell's identity
chip.

**Response `200`**

```jsonc
{
  "id": "user_...",
  "email": "alex.morgan@example.com",
  "displayName": "Alex Morgan",
  "avatarUrl": null,
  "timezone": "Asia/Kolkata",
  "targetRole": "Senior Backend Engineer",
  "experienceLevel": "mid" | "senior" | "staff" | "early",
  "preferredLanguage": "English",
  "skills": ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "AWS"],
  "onboardingCompleted": true,
  "createdAt": "2026-01-04T09:00:00.000Z"
}
```

### `PATCH /me`

Partial update. Body is any subset of `displayName`, `timezone`, `targetRole`,
`experienceLevel`, `preferredLanguage`, `skills`. Returns the full updated `User`.

---

## Interviews

Backs `/dashboard`, `/interviews`, `/interviews/[id]`, and the add-interview modal.

### `GET /dashboard/overview`

One call for the whole dashboard — avoids a waterfall of `GET /interviews` +
`GET /analytics/overview` + task lookups on the highest-traffic screen.

**Response `200`**

```jsonc
{
  "nextInterview": { /* Interview, see below — the soonest upcoming/confirmed one */ },
  "upcomingInterviews": [ /* Interview[], next 3, soonest first */ ],
  "todayTasks": [ /* PreparationTask[], day === current prep day */ ],
  "weakTopics": [ /* TopicMetric[], lowest-scoring 3 */ ],
  "streakDays": 12,
  "scoreTrend": [64, 67, 66, 72, 75, 74, 79, 82, 84, 87],
  "readinessDeltaThisWeek": 11
}
```

### `GET /interviews`

Returns `Interview[]` — every interview owned by the user, any status. The frontend sorts and
filters client-side (calendar month/week/agenda views); no query params needed.

### `POST /interviews`

Creates an interview manually (the "Add interview" modal — see
[add-interview-modal.tsx](../src/components/product/add-interview-modal.tsx)).

**Request**

```jsonc
{
  "company": "Northstar Labs",
  "role": "Senior Backend Engineer",
  "type": "technical" | "behavioral" | "system_design" | "hiring_manager" | "recruiter",
  "scheduledAt": "2026-08-22T10:30:00.000Z",
  "timezone": "Asia/Kolkata"
}
```

**Response `201`**: the created `Interview`, with server-assigned `id`, `companyMark`
(derived), `status: "upcoming"`, `readiness: 0`, `preparationProgress: 0`, and a single seed
`InterviewRound`.

### `GET /interviews/{id}`

Returns one `Interview` including its full `rounds` array.

### `PATCH /interviews/{id}`

Partial update — reschedule, add a meeting URL, edit interviewers. Body is any subset of the
`Interview` fields excluding `id`, `status`, `readiness`, `preparationProgress` (those are
server-derived — see below). Returns the updated `Interview`.

### `DELETE /interviews/{id}`

Removes an interview and cascades to its preparation plan and any linked practice sessions.
`204` on success.

### `POST /interviews/{id}/confirm`

Confirms a calendar-detected candidate interview (see Calendar section) as real. Moves
`status` from `"detected"` to `"confirmed"`. This is the one action that turns an ambiguous
AI classification into a durable record — the backend must never call this automatically.
Returns the updated `Interview`.

**Where `readiness` and `preparationProgress` come from**: both are server-computed —
`preparationProgress` from completed vs. total `PreparationTask`s, `readiness` from a weighted
blend the backend owns (evidence signals: preparation completion, mock session scores, topic
coverage, recency, resume/JD match). The frontend only ever displays these; it must not
recompute or locally override them.

---

## Calendar

Backs `/settings/integrations`. Calendar consent is a separate OAuth grant from sign-in — see
[docs/ARCHITECTURE.md](ARCHITECTURE.md) for why, and never let this flow return access/refresh
tokens to the browser.

### `GET /calendar/connection`

**Response `200`**

```jsonc
{
  "connected": true,
  "provider": "google",
  "accountEmail": "alex.morgan@example.com",
  "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
  "lastSyncAt": "2026-08-15T02:12:00.000Z",
  "status": "healthy" | "expired" | "error"
}
```

When `connected: false`, all fields except `connected` are `null`.

### `POST /calendar/connect`

Starts the OAuth grant. Returns `{ "authorizationUrl": "https://accounts.google.com/..." }`;
the frontend does a full-page redirect to it. State must be signed and short-lived.

### `GET /calendar/callback`

Google's OAuth redirect target. Not called by the frontend directly — documented for
completeness. On success, redirects the browser to
`{NEXT_PUBLIC_APP_URL}/settings/integrations?calendarConnected=true`.

### `POST /calendar/sync`

Triggers a sync. Because sync can take longer than a request round-trip once real Google Calendar
and AI classification are involved, this returns a job, not the result:

**Response `202`**

```jsonc
{ "jobId": "job_...", "type": "calendar_sync" }
```

The frontend polls `GET /jobs/{jobId}` (see Notifications & jobs) until `status: "completed"`,
then refetches `GET /interviews`. Newly detected candidates appear with
`status: "detected"` and must go through `POST /interviews/{id}/confirm` before they count as
real interviews anywhere else in the product.

Sync is idempotent on `(provider, providerEventId)` — re-syncing the same calendar event must
update, not duplicate, the candidate interview.

### `DELETE /calendar/connection`

Disconnects and revokes provider access. Existing interviews are retained. `204` on success.

---

## Documents (resume & job description)

Backs `/profile` and the "Resume + JD intelligence" panel on
[the prepare page](../src/app/(product)/interviews/[id]/prepare/page.tsx).

### `POST /resumes`

`multipart/form-data`, field name `file`. Accepts PDF/DOCX up to 10MB (matches the client-side
copy already in the UI — enforce it server-side too, both extension/MIME and size).

**Response `201`**

```jsonc
{
  "id": "resume_...",
  "fileName": "alex-morgan-resume.pdf",
  "parsedSkills": ["Node.js", "PostgreSQL", "Redis", "..."],
  "uploadedAt": "2026-08-15T02:00:00.000Z"
}
```

Parsing that takes real time (OCR, LLM extraction) should follow the same job pattern as
calendar sync (`202` + `jobId`) rather than blocking the request — this spec allows either;
pick one and document the choice here once decided.

### `DELETE /resumes/{id}`

`204` on success.

### `POST /job-descriptions`

Analyzes a pasted job description against the user's most recent resume. This is the "Analyze
role" action.

**Request**

```jsonc
{ "interviewId": "interview_...", "text": "We are looking for a Senior Backend Engineer..." }
```

**Response `201`**

```jsonc
{
  "id": "jd_...",
  "overallMatch": 86,
  "summary": "Your strongest evidence fits the core of this role.",
  "skillMatrix": [
    { "skill": "Node.js", "candidateScore": 90, "roleScore": 90 },
    { "skill": "SQL", "candidateScore": 68, "roleScore": 85 }
  ],
  "createdAt": "2026-08-15T02:05:00.000Z"
}
```

`skillMatrix` drives the "You / Job / Gap" bars — see the prepare page's role-match section.
Treat resume and job-description text as **untrusted document content**: it is parsed and
summarized, never interpolated into a prompt that can grant the model new instructions or
tool access.

### `GET /job-descriptions/{id}`

Returns the same shape as the `POST` response, for re-rendering after navigation.

---

## Preparation

### `POST /interviews/{id}/prepare`

Generates (or regenerates) the preparation plan for an interview — tasks, question bank, and
the day-by-day timeline. Long-running; returns a job:

**Response `202`**: `{ "jobId": "job_...", "type": "preparation_generation" }`

### `GET /interviews/{id}/preparation`

**Response `200`**

```jsonc
{
  "tasks": [ /* PreparationTask[] */ ],
  "questions": [ /* Question[] */ ],
  "timeline": [
    { "day": 1, "label": "Day 1", "phase": "Foundation", "status": "complete" | "active" | "upcoming" }
  ]
}
```

### `PATCH /preparation/tasks/{id}`

Body: `{ "status": "pending" | "in_progress" | "completed" }`. Returns the updated
`PreparationTask`. Toggling this is what the dashboard's "today's plan" checklist and the
prepare page's "today's focus" sidebar both call.

---

## Practice sessions (adaptive mock interview)

Backs `/practice/setup`, the live interview room, and `/practice/results/[id]`. This is the
one area where realtime matters — see the WebSocket contract below for everything that happens
**during** a session. The REST endpoints here only create, start, and finalize it.

### `POST /sessions`

**Request**: a `PracticeConfig` —

```jsonc
{
  "role": "Senior Backend Engineer",
  "company": "Northstar Labs",
  "type": "technical",
  "difficulty": "easy" | "normal" | "hard" | "brutal",
  "duration": 30,
  "focusAreas": ["System design", "SQL"],
  "interviewerStyle": "Senior engineer"
}
```

**Response `201`**: a `PracticeSession` with `status: "ready"`, empty `questions`/`answers`,
no `startedAt`.

### `GET /sessions/{id}`

Returns the current `PracticeSession`. This is the source of truth after a page refresh or
WebSocket reconnect — the frontend's realtime layer treats this endpoint, not the socket, as
authoritative for "what question are we on."

### `POST /sessions/{id}/start`

Transitions `status` to `"active"` and begins the session state machine
(`CREATED → READY → INTRODUCTION → ...` — see [docs/ARCHITECTURE.md](ARCHITECTURE.md) for the
full lifecycle). Returns the updated session. The first question arrives over the WebSocket,
not in this response.

### `POST /sessions/{id}/answers`

Submits a completed answer outside the WebSocket path (fallback for when the socket is down, or
for a purely HTTP-driven client). Body matches `AnswerCompletedPayload` from
[src/types/realtime.ts](../src/types/realtime.ts). Returns the updated `PracticeSession`
(next question included if the backend already decided one; otherwise the client waits for the
socket's `question.created` event).

### `POST /sessions/{id}/complete`

Ends the session early or finalizes it after the last answer. Kicks off report generation as a
job:

**Response `202`**: `{ "jobId": "job_...", "type": "report_generation", "sessionId": "..." }`

The frontend polls `GET /jobs/{jobId}`, then calls `GET /sessions/{id}/report` once complete.

### `GET /sessions/{id}/report`

**Response `200`**: an `InterviewReport` (already fully specified in
[src/lib/domain.ts](../src/lib/domain.ts) — `overall`, `technical`, `communication`,
`structure`, `clarity`, `relevance`, `depth`, `summary`, `speech`, `weakTopics`, `strengths`,
`recommendedActions`, `answers[]`).

### `POST /sessions/{id}/socket-ticket`

Issues a short-lived, single-use ticket scoped to this session id, used as the WebSocket auth
credential (see below — a Firebase ID token is deliberately *not* accepted directly on the
socket URL, since query strings end up in server logs and browser history).

**Response `200`**: `{ "ticket": "wst_...", "expiresAt": "2026-08-15T02:31:00.000Z" }`

---

## Analytics

### `GET /analytics/overview`

Backs `/analytics`. One aggregate call; the page renders topline stats, two charts, five
micro-metric sparklines, per-topic breakdown, and recent session history from it.

**Response `200`**

```jsonc
{
  "overallScore": 87,
  "readinessScore": 85,
  "streakDays": 12,
  "improvementPercent": 23,
  "scoreTrend": [64, 67, 66, 72, 75, 74, 79, 82, 84, 87],
  "readinessTrend": [51, 55, 58, 61, 66, 70, 73, 78, 82, 85],
  "microMetrics": [
    { "key": "technical", "label": "Technical score", "value": 84, "delta": "+8", "trend": [70, 73, 72, 77, 80, 82, 84] },
    { "key": "structure", "label": "Answer structure", "value": 76, "delta": "+11", "trend": [58, 62, 64, 68, 71, 74, 76] },
    { "key": "pace", "label": "Speaking pace", "value": 137, "delta": "WPM", "trend": [144, 142, 139, 140, 138, 136, 137] },
    { "key": "fillers", "label": "Filler words", "value": 18, "delta": "-5", "trend": [31, 29, 26, 25, 23, 20, 18] },
    { "key": "practiceTime", "label": "Practice time", "value": 4.2, "delta": "+38m", "trend": [18, 24, 22, 31, 36, 41, 52] }
  ],
  "topicPerformance": [ /* TopicMetric[], all topics, ordered by weakness x role relevance x urgency */ ],
  "recentSessions": [
    { "reportId": "report_...", "company": "Northstar Labs", "mode": "System design mock", "score": 82, "completedAt": "2026-08-14T09:00:00.000Z" }
  ]
}
```

`microMetrics[].key` is a stable identifier for the frontend to key React lists and pick icons
by; add new metrics by appending, never by renaming an existing `key`.

---

## Notifications & background jobs

### `GET /notifications`

Returns `NotificationItem[]`, newest first.

### `POST /notifications/{id}/read`

Marks one notification read. Returns the updated `NotificationItem`. (The app shell currently
marks *all* notifications read on opening the popover — `PATCH /notifications/read-all` is a
reasonable addition if that stays the product behavior; not required for v1.)

### `GET /jobs/{id}`

Polling endpoint for every long-running operation this contract returns a `jobId` for
(calendar sync, preparation generation, report generation, resume parsing if applicable).

**Response `200`**

```jsonc
{
  "id": "job_...",
  "type": "calendar_sync" | "preparation_generation" | "report_generation" | "resume_parsing",
  "status": "queued" | "processing" | "completed" | "failed",
  "progress": 0.6,
  "resultId": "interview_... | plan_... | report_...",
  "error": null
}
```

The frontend polls this on an interval (recommend 1.5–2s) while `status` is `queued` or
`processing`, stops on `completed`/`failed`, and on `completed` fetches `resultId` from the
relevant resource endpoint.

---

## WebSocket contract (live interview)

`GET {NEXT_PUBLIC_WS_URL}/ws/interviews/{sessionId}?ticket={ticket}` — the ticket comes from
`POST /sessions/{id}/socket-ticket` above. This is the one place where AI output reaches the
browser in near-real-time; everything else in this document is plain request/response.

**Every frame, both directions, uses this envelope** (see
[src/types/realtime.ts](../src/types/realtime.ts)):

```jsonc
{ "type": "question.created", "payload": { /* ... */ }, "sentAt": "2026-08-15T02:10:00.000Z", "requestId": "..." }
```

### Client → server events

| `type` | `payload` | When |
|---|---|---|
| `heartbeat` | `{}` | Every 20s while connected |
| `session.start` | `{}` | Once, right after the socket opens |
| `answer.started` | `{ questionId }` | Candidate begins recording |
| `answer.partial_transcript` | `{ questionId, text }` | Streaming STT, if the provider supports partials |
| `answer.completed` | `AnswerCompletedPayload` — `questionId, transcript, startedAt, endedAt, durationMs, pauseMarkersMs?` | Candidate stops recording |
| `question.repeat` | `{ questionId }` | Candidate asks to repeat the current question |
| `session.end` | `{ reason: "candidate_ended" \| "time_limit" }` | Candidate ends early, or duration elapses |

### Server → client events

| `type` | `payload` | Notes |
|---|---|---|
| `heartbeat.ack` | `{}` | Reply to client heartbeat |
| `session.ready` | `{}` | Socket authenticated, session loaded |
| `session.started` | `{ state: SessionState }` | State machine entered `INTRODUCTION` |
| `section.changed` | `{ from: SessionState, to: SessionState }` | e.g. `TECHNICAL → BEHAVIORAL`. Only the backend state machine may drive this — see the "Python owns state" rule this project always followed. |
| `question.created` | `QuestionCreatedPayload` — `id, text, topic, difficulty, isFollowUp, position, totalPlanned` | New question ready to render |
| `question.started` | `{ questionId }` | Interviewer has finished "speaking" the question, candidate may answer |
| `interviewer.thinking` | `{}` | Show the AI-orb "thinking" state while a follow-up decision or evaluation runs |
| `interviewer.response` | `{ text }` | Any spoken interviewer line outside a question (acknowledgment, transition) |
| `session.warning` | `{ code, message }` | Non-fatal — e.g. approaching duration limit |
| `session.completed` | `{ reason }` | All sections done or ended early; frontend should call `POST /sessions/{id}/complete` if not already triggered server-side |
| `analysis.started` | `{ jobId }` | Post-session analysis kicked off |
| `analysis.progress` | `AnalysisProgressPayload` — `jobId, progress, phase, message` | `phase` is one of `transcript \| technical \| communication \| recommendations \| complete` |
| `analysis.completed` | `{ jobId, reportId }` | Frontend navigates to `/practice/results/{reportId}` |
| `error` | `ApiErrorEnvelope["error"]` shape | Typed, recoverable where possible |

### Connection semantics

- **HTTP is the source of truth after reconnect.** On reconnect, the frontend calls
  `GET /sessions/{id}` to resync current question/state before trusting any further socket
  events — never trust the socket alone to reconstruct history.
  frontend never needs to replay events itself.
- Reconnect uses capped exponential backoff (client already implements this — see
  [src/lib/api/socket.ts](../src/lib/api/socket.ts): 700ms base, ×2 per attempt, capped at 10s).
- Heartbeat interval is 20s; the backend should consider a connection dead after ~2 missed
  heartbeats and release any interviewer "thinking" lock so a reconnect doesn't get stuck.
- Each root question permits at most two follow-ups by default; section/question/duration
  limits are enforced by the backend before any AI-suggested transition is applied — the model
  proposes, the backend's state machine disposes. This project's original architecture called
  this out explicitly and it remains true regardless of what backend implements it.

---

## Cross-cutting requirements (not endpoint-specific)

- **Rate limiting**: return `429` with the standard error envelope and a `Retry-After` header.
  The frontend does not currently implement client-side backoff for `429`s beyond RTK Query's
  default retry — add one if a specific endpoint needs it once real limits are known.
- **CORS**: must allow `NEXT_PUBLIC_APP_URL`'s origin with credentials if cookies are ever used;
  currently auth is bearer-token only, so credentialed CORS is not required.
- **File upload limits**: enforce extension, MIME sniffing (not just declared `Content-Type`),
  and a 10MB size cap server-side for `POST /resumes` — the frontend's own limit is a UX hint,
  not a security boundary.
- **Security headers / CSP**: the frontend already sets its own response headers in
  [next.config.ts](../next.config.ts) (`X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`). The backend should mirror
  the same baseline for any response it serves directly (e.g. OAuth callback redirects).
- **Resume/JD content is untrusted**: never let parsed document text be interpolated into a
  prompt in a way that can execute instructions or invoke tools. Treat it as data, always.

## Open questions for the new backend project

These are called out rather than silently decided, since they materially affect implementation:

1. Does resume parsing block the `POST /resumes` response, or follow the async job pattern?
2. Is there a separate `POST /auth/session` exchange, or is the Firebase ID token sent on every
   request as this document currently assumes?
3. Should `PATCH /notifications/read-all` exist, or does the frontend call
   `POST /notifications/{id}/read` once per item on popover open?
4. STT/TTS provider choice affects whether `answer.partial_transcript` is ever actually sent —
   if the provider is turn-based only, the frontend must not assume partials arrive.
