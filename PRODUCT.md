# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Monorepo with a Next.js, React, and TypeScript web application plus a Python FastAPI API.
- Tailwind CSS, Motion for React, Lucide icons, Firebase Authentication, and a centralized typed API client on the web.
- PostgreSQL, SQLAlchemy 2.x, Alembic, Pydantic v2, Redis, and a simple Python background worker on the API.
- OpenRouter behind a provider abstraction, with `deepseek/deepseek-v4-flash` as the configured default and a deterministic mock provider when no API key exists.
- WebSockets for live interview sessions; Web Audio API and MediaRecorder in the browser; replaceable speech-to-text and text-to-speech provider interfaces on the backend.
- Assumption: pnpm manages the JavaScript workspace and uv manages Python dependencies because no package-manager constraint was supplied.
- Open decision: production hosting, object storage, email/push delivery, and speech vendors remain provider-neutral.

## Users

Primary users are job candidates with upcoming interviews who need focused preparation tied to a real role, company, round, resume, job description, and date. They use the product before and between interviews to decide what to practice next, rehearse realistic conversations, understand weaknesses, and measure improvement.

## Product Purpose

Intervu AI turns an upcoming calendar event into a continuously improving interview-preparation loop: detect and confirm the interview, attach resume and job context, generate a time-aware plan, run an adaptive mock interview, analyze observable answer and speech quality, target weak areas, and repeat before the real event. Success means the user always understands the next best action and can see credible evidence of improvement.

## Positioning

Intervu AI is an interview operating system rather than a question bank or generic AI chat. Its distinctive mechanism joins calendar awareness, role-specific evidence, adaptive follow-up questioning, deterministic speech analytics, answer-level coaching, weak-topic prioritization, and readiness planning into one stateful workflow for each real interview.

## Operating Context

- Users authenticate with Google through Firebase, then separately authorize read-only Google Calendar access.
- Calendar events are normalized, cheaply filtered, optionally AI-classified, and always confirmed by the user before becoming interviews.
- A confirmed interview connects company, role, round, schedule, resume, job description, preparation tasks, mock sessions, reports, and notifications.
- Live sessions use concise questions, microphone input, transcription, adaptive follow-ups, recovery after refresh or socket loss, and delayed deep analysis.
- The product uses realistic synthetic fixtures when integrations are unavailable, clearly labeled as sample data and never presented as customer evidence.

## Capabilities and Constraints

- Required routes cover marketing, authentication, onboarding, dashboard, interviews, preparation, practice, live mock sessions, reports, analytics, questions, flashcards, profile, and settings.
- The backend owns authorization, state transitions, timers, calculations, validation, analytics, limits, database writes, OAuth credentials, and workflow control.
- AI is split into specialized, schema-validated agents and never directly controls application state, SQL, secrets, permissions, or destructive actions.
- Firebase ID tokens are verified server-side and mapped to internal UUID users.
- Google Calendar refresh tokens stay encrypted server-side and never reach browser storage or API responses.
- The application must boot and remain useful with `AI_PROVIDER=mock`, no OpenRouter key, no calendar connection, worker restarts, speech failure, browser refreshes, or WebSocket interruptions.
- PostgreSQL stores UTC, timezone-aware timestamps and domain entities with ownership enforcement, constraints, useful indexes, and migration-managed schemas.
- Long work runs through background jobs with persistent progress; APIs return consistent errors and use versioned `/api/v1` routes.
- No fabricated medical or psychological confidence diagnosis. Coaching may discuss clarity, pace, consistency, hesitation, relevance, depth, and answer structure.

## Brand Commitments

- Product name: Intervu AI.
- Identity: black, charcoal, white, and luminous dimensional gold; polished dark materials, restrained gold glass, subtle reflections, cinematic line fields, sparse particles, and refined typography.
- Product references: Linear, Apple, Arc, Vercel, high-end financial terminals, and a futuristic operating system, synthesized into an original identity rather than copied.
- Gold communicates importance and progress; it is not ambient decoration on every element.
- Avoid generic SaaS dashboards, crypto aesthetics, excessive neon, card mosaics, stock AI robots, gratuitous gradients, omnipresent glass, and effects that impair usability.
- Voice is calm, specific, direct, professional, and action-oriented.

## Evidence on Hand

- The product and backend specifications in the initiating brief are the sole source of truth.
- There are no existing logos, licensed typefaces, screenshots, customer testimonials, production metrics, pricing claims, or integration credentials. Future work must not fabricate them.
- Sample companies, interviews, scores, and transcripts may be used only as clearly identified demonstration data.

## Product Principles

1. Every screen makes the next best action obvious.
2. Preparation is anchored to the user's actual interview context, not generic question volume.
3. AI handles semantic judgment; deterministic application code owns state, security, scoring, statistics, and limits.
4. The live interview feels focused and human; detailed scoring waits until the session ends.
5. The system degrades gracefully and preserves user work through provider and connection failures.

## Accessibility & Inclusion

The web experience must provide semantic HTML, keyboard navigation, visible focus states, screen-reader labels, WCAG-compliant contrast, 44px touch targets, captions, clear microphone and calendar permission recovery, and reduced-motion alternatives for parallax, particles, progress animation, and page transitions.
