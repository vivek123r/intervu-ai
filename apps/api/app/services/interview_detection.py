from __future__ import annotations

from dataclasses import dataclass

from app.schemas.calendar import NormalizedCalendarEvent


@dataclass(frozen=True, slots=True)
class DetectionEvidence:
    score: float
    likely_candidate: bool
    evidence: list[str]


SIGNALS: dict[str, float] = {
    "interview": 0.42,
    "technical round": 0.32,
    "hr round": 0.30,
    "screening": 0.28,
    "recruiter": 0.25,
    "hiring": 0.22,
    "assessment": 0.24,
    "coding": 0.24,
    "manager discussion": 0.22,
    "final round": 0.30,
    "round 2": 0.12,
    "round 3": 0.12,
}


def detect_interview_candidate(
    event: NormalizedCalendarEvent, *, user_email: str
) -> DetectionEvidence:
    if event.is_all_day or event.status == "cancelled":
        return DetectionEvidence(score=0, likely_candidate=False, evidence=[])
    corpus = f"{event.title} {event.description}".casefold()
    score = 0.0
    evidence: list[str] = []
    for signal, weight in SIGNALS.items():
        if signal in corpus:
            score += weight
            evidence.append(f'text signal: "{signal}"')
    if event.meeting_url:
        score += 0.06
        evidence.append("video meeting link")
    organizer = (event.organizer_email or "").casefold()
    user_domain = user_email.casefold().split("@")[-1]
    organizer_domain = organizer.split("@")[-1] if "@" in organizer else ""
    if organizer_domain and organizer_domain != user_domain:
        score += 0.10
        evidence.append("external organizer")
    if len(event.attendee_emails) in {2, 3, 4, 5, 6}:
        score += 0.04
        evidence.append("small attendee group")
    score = round(min(score, 0.99), 2)
    return DetectionEvidence(score=score, likely_candidate=score >= 0.30, evidence=evidence)
