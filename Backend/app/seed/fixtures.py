"""Deterministic demo data — a verbatim port of Frontend/src/mocks/fixtures.ts so every
page renders identically whether it talks to MSW or to this backend. `scripts/seed.py`
upserts every document here by its literal `_id`; nothing here is randomly generated.

Collections are keyed exactly as `db/indexes.py` names them.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

DEMO_USER_ID = "user-demo-01"
DEMO_FIREBASE_UID = "demo-user"
NORTHSTAR_INTERVIEW_ID = "interview-northstar"
DEMO_SESSION_ID = "session-demo-01"
DEMO_REPORT_ID = "report-demo-01"

_ANCHOR = datetime(2026, 8, 15, 2, 30, 0, tzinfo=UTC)


def _in_hours(hours: float) -> datetime:
    return _ANCHOR + timedelta(hours=hours)


def _in_minutes(minutes: float) -> datetime:
    return _ANCHOR + timedelta(minutes=minutes)


USERS: list[dict[str, Any]] = [
    {
        "_id": DEMO_USER_ID,
        "firebase_uid": DEMO_FIREBASE_UID,
        "email": "alex.morgan@example.com",
        "display_name": "Alex Morgan",
        "avatar_url": None,
        "timezone": "Asia/Kolkata",
        "target_role": "Senior Backend Engineer",
        "experience_level": "senior",
        "preferred_language": "English",
        "skills": ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "AWS"],
        "onboarding_completed": False,
        "created_at": datetime(2026, 1, 4, 9, 0, 0, tzinfo=UTC),
    }
]

INTERVIEWS: list[dict[str, Any]] = [
    {
        "_id": NORTHSTAR_INTERVIEW_ID,
        "user_id": DEMO_USER_ID,
        "company": "Northstar Labs",
        "company_mark": "N",
        "role": "Senior Backend Engineer",
        "type": "system_design",
        "round": "System Design",
        "round_number": 3,
        "total_rounds": 4,
        "scheduled_at": _in_hours(62),
        "timezone": "Asia/Kolkata",
        "duration_minutes": 60,
        "meeting_url": "https://meet.google.com/demo-room",
        "recruiter": "Maya Chen",
        "interviewers": ["Elena Ruiz", "Jordan Kim"],
        "status": "upcoming",
        "readiness": 85,
        "preparation_progress": 68,
        "location": "Google Meet",
        "accent": "#f0b94c",
        "rounds": [
            {"id": "r1", "name": "Recruiter screen", "type": "recruiter", "status": "completed"},
            {"id": "r2", "name": "Coding", "type": "technical", "status": "completed"},
            {"id": "r3", "name": "System design", "type": "system_design", "status": "current"},
            {"id": "r4", "name": "Hiring manager", "type": "hiring_manager", "status": "pending"},
        ],
        "provider_event_id": None,
    },
    {
        "_id": "interview-lattice",
        "user_id": DEMO_USER_ID,
        "company": "Lattice Works",
        "company_mark": "L",
        "role": "Platform Engineer",
        "type": "technical",
        "round": "Technical deep dive",
        "round_number": 2,
        "total_rounds": 3,
        "scheduled_at": _in_hours(148),
        "timezone": "Asia/Kolkata",
        "duration_minutes": 75,
        "meeting_url": "https://zoom.us/j/demo",
        "recruiter": "Noah Williams",
        "interviewers": ["Priya Raman"],
        "status": "upcoming",
        "readiness": 71,
        "preparation_progress": 42,
        "location": "Zoom",
        "accent": "#9f7aea",
        "rounds": [
            {"id": "l1", "name": "Recruiter screen", "type": "recruiter", "status": "completed"},
            {"id": "l2", "name": "Technical deep dive", "type": "technical", "status": "current"},
            {"id": "l3", "name": "Team conversation", "type": "behavioral", "status": "pending"},
        ],
        "provider_event_id": None,
    },
    {
        "_id": "interview-atelier",
        "user_id": DEMO_USER_ID,
        "company": "Atelier Cloud",
        "company_mark": "A",
        "role": "Backend Engineer",
        "type": "behavioral",
        "round": "Hiring manager",
        "round_number": 4,
        "total_rounds": 4,
        "scheduled_at": _in_hours(222),
        "timezone": "Asia/Kolkata",
        "duration_minutes": 45,
        "meeting_url": None,
        "recruiter": "Sam Taylor",
        "interviewers": ["Avery Singh"],
        "status": "confirmed",
        "readiness": 64,
        "preparation_progress": 31,
        "location": "Microsoft Teams",
        "accent": "#62b8a9",
        "rounds": [
            {"id": "a1", "name": "Recruiter screen", "type": "recruiter", "status": "completed"},
            {"id": "a2", "name": "Coding", "type": "technical", "status": "completed"},
            {"id": "a3", "name": "Architecture", "type": "system_design", "status": "completed"},
            {"id": "a4", "name": "Hiring manager", "type": "hiring_manager", "status": "current"},
        ],
        "provider_event_id": None,
    },
]

_TASK_DEFAULTS = {"interview_id": NORTHSTAR_INTERVIEW_ID, "user_id": DEMO_USER_ID}

PREPARATION_TASKS: list[dict[str, Any]] = [
    {
        "_id": "task-isolation",
        **_TASK_DEFAULTS,
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Databases",
        "title": "Review transaction isolation",
        "description": (
            "Explain dirty, non-repeatable, and phantom reads with one production example."
        ),
        "estimated_minutes": 12,
        "status": "completed",
        "priority": "high",
    },
    {
        "_id": "task-acid",
        **_TASK_DEFAULTS,
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Databases",
        "title": "Practice ACID trade-offs",
        "description": "Answer five prompts and name the operational cost of stronger guarantees.",
        "estimated_minutes": 14,
        "status": "completed",
        "priority": "high",
    },
    {
        "_id": "task-cache",
        **_TASK_DEFAULTS,
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "System design",
        "title": "Defend a cache strategy",
        "description": "Cover invalidation, stampedes, stale reads, and graceful Redis failure.",
        "estimated_minutes": 18,
        "status": "in_progress",
        "priority": "high",
    },
    {
        "_id": "task-story",
        **_TASK_DEFAULTS,
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Behavioral",
        "title": "Tighten one impact story",
        "description": "Add a measurable result to the incident-response example in your resume.",
        "estimated_minutes": 10,
        "status": "pending",
        "priority": "normal",
    },
    {
        "_id": "task-mock",
        **_TASK_DEFAULTS,
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Mock",
        "title": "Complete a 10-minute pressure test",
        "description": "Use hard difficulty and focus on SQL plus distributed caching.",
        "estimated_minutes": 10,
        "status": "pending",
        "priority": "high",
    },
    {
        "_id": "task-company",
        **_TASK_DEFAULTS,
        "day": 2,
        "date_label": "Tomorrow",
        "phase": "Company + role",
        "category": "Company",
        "title": "Map the role to your strongest evidence",
        "description": "Connect three job requirements to concrete work from your resume.",
        "estimated_minutes": 20,
        "status": "pending",
        "priority": "normal",
    },
    {
        "_id": "task-design",
        **_TASK_DEFAULTS,
        "day": 3,
        "date_label": "Mon",
        "phase": "Core technical",
        "category": "System design",
        "title": "Design a resilient job queue",
        "description": "Practice constraints, delivery semantics, retries, and observability.",
        "estimated_minutes": 30,
        "status": "pending",
        "priority": "high",
    },
    {
        "_id": "task-final",
        **_TASK_DEFAULTS,
        "day": 4,
        "date_label": "Interview day",
        "phase": "Warm-up",
        "category": "Warm-up",
        "title": "Run the calm-start protocol",
        "description": "One concise story, one architecture trade-off, then stop preparing.",
        "estimated_minutes": 8,
        "status": "pending",
        "priority": "normal",
    },
]

PREPARATION_TIMELINE: list[dict[str, Any]] = [
    {"day": 1, "label": "Day 1", "phase": "Foundation", "status": "active"},
    {"day": 2, "label": "Day 2", "phase": "Company + role", "status": "upcoming"},
    {"day": 3, "label": "Day 3", "phase": "Core technical", "status": "upcoming"},
    {"day": 4, "label": "Day 4", "phase": "Mock + weak areas", "status": "upcoming"},
    {"day": 5, "label": "Interview", "phase": "Warm-up", "status": "upcoming"},
]

PREPARATION_PLANS: list[dict[str, Any]] = [
    {
        "_id": NORTHSTAR_INTERVIEW_ID,
        "user_id": DEMO_USER_ID,
        "timeline": PREPARATION_TIMELINE,
        "generated_at": _in_hours(-6),
    }
]

TOPIC_METRICS: list[dict[str, Any]] = [
    {"topic": "REST APIs", "score": 92, "trend": 4, "relevance": "high"},
    {"topic": "Node.js", "score": 89, "trend": 7, "relevance": "critical"},
    {"topic": "Data structures", "score": 86, "trend": 2, "relevance": "high"},
    {"topic": "Databases", "score": 78, "trend": 8, "relevance": "critical"},
    {"topic": "Cloud architecture", "score": 67, "trend": 5, "relevance": "high"},
    {"topic": "Networking", "score": 64, "trend": -1, "relevance": "normal"},
    {"topic": "System design", "score": 58, "trend": 11, "relevance": "critical"},
]

QUESTIONS: list[dict[str, Any]] = [
    {
        "_id": "q-cache",
        **_TASK_DEFAULTS,
        "text": (
            "You mentioned using Redis to reduce database load. Walk me through what you "
            "cached and how you kept it correct."
        ),
        "category": "Technical",
        "topic": "Caching",
        "difficulty": "hard",
        "follow_up": None,
    },
    {
        "_id": "q-cache-followup",
        **_TASK_DEFAULTS,
        "text": (
            "How did you handle cache invalidation, and what would the application do if "
            "Redis became unavailable?"
        ),
        "category": "Technical",
        "topic": "Caching",
        "difficulty": "hard",
        "follow_up": True,
    },
    {
        "_id": "q-queue",
        **_TASK_DEFAULTS,
        "text": (
            "Design a background-job system that can tolerate worker failures without "
            "processing a payment twice."
        ),
        "category": "System design",
        "topic": "Distributed systems",
        "difficulty": "hard",
        "follow_up": None,
    },
    {
        "_id": "q-incident",
        **_TASK_DEFAULTS,
        "text": (
            "Tell me about a production incident where your first hypothesis was wrong. "
            "How did you recover?"
        ),
        "category": "Behavioral",
        "topic": "Ownership",
        "difficulty": "normal",
        "follow_up": None,
    },
    {
        "_id": "q-index",
        **_TASK_DEFAULTS,
        "text": (
            "When can adding a database index make a system slower, and how would you "
            "validate the trade-off?"
        ),
        "category": "Technical",
        "topic": "Databases",
        "difficulty": "hard",
        "follow_up": None,
    },
]

NOTIFICATIONS: list[dict[str, Any]] = [
    {
        "_id": "note-tomorrow",
        "user_id": DEMO_USER_ID,
        "title": "Interview in under three days",
        "message": "Your system-design preparation is 58%. A focused 12-minute drill is ready.",
        "created_at": _in_minutes(-12),
        "read": False,
        "action_href": "/interviews/interview-northstar/prepare",
    },
    {
        "_id": "note-report",
        "user_id": DEMO_USER_ID,
        "title": "Analysis complete",
        "message": "Your backend mock report is ready, with three answers selected for retry.",
        "created_at": _in_hours(-3),
        "read": False,
        "action_href": f"/practice/results/{DEMO_REPORT_ID}",
    },
]

SCORE_TREND = [64, 67, 66, 72, 75, 74, 79, 82, 84, 87]
READINESS_TREND = [51, 55, 58, 61, 66, 70, 73, 78, 82, 85]

CALENDAR_CONNECTIONS: list[dict[str, Any]] = [
    {
        "_id": DEMO_USER_ID,
        "user_id": DEMO_USER_ID,
        "connected": False,
        "provider": None,
        "account_email": None,
        "scopes": [],
        "last_sync_at": None,
        "status": None,
        "access_token": None,
        "refresh_token": None,
    }
]

RESUMES: list[dict[str, Any]] = [
    {
        "_id": "resume-demo-01",
        "user_id": DEMO_USER_ID,
        "file_name": "Alex_Morgan_Backend_Resume.pdf",
        "parsed_skills": ["Node.js", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs"],
        "uploaded_at": _in_hours(-120),
    }
]

JOB_DESCRIPTIONS: list[dict[str, Any]] = [
    {
        "_id": "jd-demo-01",
        "user_id": DEMO_USER_ID,
        "interview_id": NORTHSTAR_INTERVIEW_ID,
        "overall_match": 86,
        "summary": "Your strongest evidence fits the core of this role.",
        "skill_matrix": [
            {"skill": "Node.js", "candidate_score": 90, "role_score": 90},
            {"skill": "REST APIs", "candidate_score": 92, "role_score": 85},
            {"skill": "SQL", "candidate_score": 68, "role_score": 85},
            {"skill": "Docker", "candidate_score": 55, "role_score": 75},
            {"skill": "AWS", "candidate_score": 42, "role_score": 70},
        ],
        "created_at": _in_hours(-2),
    }
]

ANALYTICS_OVERVIEWS: list[dict[str, Any]] = [
    {
        "_id": DEMO_USER_ID,
        "user_id": DEMO_USER_ID,
        "overall_score": 87,
        "readiness_score": 85,
        "streak_days": 12,
        "improvement_percent": 23,
        "score_trend": SCORE_TREND,
        "readiness_trend": READINESS_TREND,
        "micro_metrics": [
            {
                "key": "technical",
                "label": "Technical score",
                "value": 84,
                "delta": "+8",
                "trend": [70, 73, 72, 77, 80, 82, 84],
            },
            {
                "key": "structure",
                "label": "Answer structure",
                "value": 76,
                "delta": "+11",
                "trend": [58, 62, 64, 68, 71, 74, 76],
            },
            {
                "key": "pace",
                "label": "Speaking pace",
                "value": 137,
                "delta": "WPM",
                "trend": [144, 142, 139, 140, 138, 136, 137],
            },
            {
                "key": "fillers",
                "label": "Filler words",
                "value": 18,
                "delta": "-5",
                "trend": [31, 29, 26, 25, 23, 20, 18],
            },
            {
                "key": "practiceTime",
                "label": "Practice time",
                "value": 4.2,
                "delta": "+38m",
                "trend": [18, 24, 22, 31, 36, 41, 52],
            },
        ],
        "topic_performance": TOPIC_METRICS,
        "recent_sessions": [
            {
                "report_id": DEMO_REPORT_ID,
                "company": "Northstar Labs",
                "mode": "System design mock",
                "score": 82,
                "completed_at": _in_hours(-24),
            },
            {
                "report_id": "report-demo-02",
                "company": "Lattice Works",
                "mode": "Technical mock",
                "score": 79,
                "completed_at": _in_hours(-96),
            },
            {
                "report_id": "report-demo-03",
                "company": "Atelier Cloud",
                "mode": "Behavioral mock",
                "score": 76,
                "completed_at": _in_hours(-192),
            },
        ],
    }
]

_DEMO_QUESTIONS_ASKED = [
    {
        "id": "q-cache",
        "text": QUESTIONS[0]["text"],
        "category": "Technical",
        "topic": "Caching",
        "difficulty": "hard",
        "follow_up": None,
    },
    {
        "id": "q-incident",
        "text": QUESTIONS[3]["text"],
        "category": "Behavioral",
        "topic": "Ownership",
        "difficulty": "normal",
        "follow_up": None,
    },
]

PRACTICE_SESSIONS: list[dict[str, Any]] = [
    {
        "_id": DEMO_SESSION_ID,
        "user_id": DEMO_USER_ID,
        "interview_id": NORTHSTAR_INTERVIEW_ID,
        "state": "completed",
        "config": {
            "role": "Senior Backend Engineer",
            "company": "Northstar Labs",
            "type": "system_design",
            "difficulty": "hard",
            "duration": 30,
            "focus_areas": ["System design", "SQL"],
            "interviewer_style": "Senior engineer",
        },
        "questions": _DEMO_QUESTIONS_ASKED,
        "current_question_index": 1,
        "answers": [
            {
                "question_id": "q-cache",
                "question": "How did you keep cached data correct?",
                "transcript": (
                    "We cached the read-heavy account summary and invalidated it from the "
                    "write path. We used a short TTL as a backstop and bypassed Redis when "
                    "health checks failed."
                ),
                "duration_seconds": 96,
                "score": 8.2,
            },
            {
                "question_id": "q-incident",
                "question": "Describe a production incident where your first hypothesis was wrong.",
                "transcript": (
                    "I initially suspected a database regression, then used request traces "
                    "to isolate an upstream timeout. I coordinated a rollback and added an "
                    "alert for the saturation signal."
                ),
                "duration_seconds": 108,
                "score": 7.4,
            },
        ],
        "started_at": _in_hours(-24.5),
        "follow_ups_used": {"q-cache": 1},
    }
]

REPORTS: list[dict[str, Any]] = [
    {
        "_id": DEMO_REPORT_ID,
        "session_id": DEMO_SESSION_ID,
        "user_id": DEMO_USER_ID,
        "created_at": _in_hours(-24),
        "overall": 82,
        "technical": 84,
        "communication": 81,
        "structure": 76,
        "clarity": 88,
        "relevance": 86,
        "depth": 79,
        "summary": (
            "Your technical instincts are strong and your examples feel credible. The next "
            "gain is structural: state the decision, name the trade-off, then prove the "
            "outcome before adding implementation detail."
        ),
        "speech": {
            "average_wpm": 137,
            "filler_count": 18,
            "fillers": {"um": 7, "like": 4, "actually": 3, "basically": 2, "you know": 2},
            "long_pauses": 4,
            "longest_pause": 3.8,
            "average_answer_seconds": 102,
        },
        "weak_topics": ["System design", "SQL transactions", "Behavioral results"],
        "strengths": [
            "Used concrete production examples",
            "Explained failure modes without prompting",
            "Maintained a clear, steady speaking pace",
        ],
        "recommended_actions": [
            "Practice two system-design openings using constraints first",
            "Add measurable results to the incident-response story",
            "Re-answer the cache question in under 90 seconds",
        ],
        "answers": [
            {
                "question": "How did you keep cached data correct?",
                "answer": (
                    "We cached the read-heavy account summary and invalidated it from the "
                    "write path. We used a short TTL as a backstop and bypassed Redis when "
                    "health checks failed."
                ),
                "score": 8.2,
                "strengths": [
                    "Named the cached object and access pattern",
                    "Included a safe fallback path",
                    "Recognized TTL as a backstop rather than the strategy",
                ],
                "missing": [
                    "Stampede protection",
                    "Concurrent write ordering",
                    "Operational alert threshold",
                ],
                "better_structure": [
                    "Define the data and consistency need",
                    "Explain invalidation ownership",
                    "Describe failure behavior",
                    "Close with observed impact",
                ],
            },
            {
                "question": "Describe a production incident where your first hypothesis was wrong.",
                "answer": (
                    "I initially suspected a database regression, then used request traces "
                    "to isolate an upstream timeout. I coordinated a rollback and added an "
                    "alert for the saturation signal."
                ),
                "score": 7.4,
                "strengths": ["Owned the incorrect hypothesis", "Explained the diagnostic pivot"],
                "missing": [
                    "Measurable user impact",
                    "Time to recovery",
                    "Result after the alert was added",
                ],
                "better_structure": ["Situation", "Task", "Action", "Measurable result", "Lesson"],
            },
        ],
    }
]

# Collection name -> documents, in dependency order (users before interviews, etc.)
# so a future switch to ordered inserts-with-references stays safe.
SEED_DATA: dict[str, list[dict[str, Any]]] = {
    "users": USERS,
    "interviews": INTERVIEWS,
    "preparation_tasks": PREPARATION_TASKS,
    "questions": QUESTIONS,
    "preparation_plans": PREPARATION_PLANS,
    "calendar_connections": CALENDAR_CONNECTIONS,
    "resumes": RESUMES,
    "job_descriptions": JOB_DESCRIPTIONS,
    "notifications": NOTIFICATIONS,
    "analytics_overviews": ANALYTICS_OVERVIEWS,
    "practice_sessions": PRACTICE_SESSIONS,
    "reports": REPORTS,
}
