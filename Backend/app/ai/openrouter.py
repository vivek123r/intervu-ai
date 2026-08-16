import json
import logging
from typing import Any

import httpx

from app.ai.mock import DeterministicProvider
from app.core.ids import IdPrefix, new_id
from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question

logger = logging.getLogger(__name__)

_FILLER_WORDS = ("um", "uh", "like", "you know", "actually", "basically", "literally")


class OpenRouterAIProvider:
    """Production AI provider powered by OpenRouter LLM APIs (e.g. DeepSeek, Gemini, etc.).

    Implements AIProvider protocol with fallback to DeterministicProvider if network,
    rate-limit, or token errors occur.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "deepseek/deepseek-chat",
        base_url: str = "https://openrouter.ai/api/v1",
        timeout_seconds: float = 30.0,
    ) -> None:
        self.api_key = api_key.strip()
        self.model = model.strip() or "deepseek/deepseek-chat"
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self._fallback = DeterministicProvider()

    def _call_llm(self, messages: list[dict[str, str]], temperature: float = 0.7) -> str | None:
        """Synchronous call to OpenRouter chat completion endpoint."""
        if not self.api_key:
            return None

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://intervu-ai.local",
            "X-Title": "Intervu AI",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.warning(
                        "OpenRouter API returned status %d: %s",
                        response.status_code,
                        response.text,
                    )
                    return None
                data = response.json()
                choices = data.get("choices") or []
                if choices and "message" in choices[0]:
                    content = choices[0]["message"].get("content")
                    return str(content) if content is not None else None
                return None
        except Exception as e:
            logger.warning("OpenRouter API request failed: %s", e)
            return None

    def generate_questions(
        self,
        config: PracticeConfig,
        count: int,
        resume_context: dict[str, Any] | None = None,
    ) -> list[Question]:
        """Generate role-specific and company-tailored interview questions."""
        system_prompt = (
            "You are a principal technical interviewer designing an interview.\n"
            "Generate realistic, challenging, and clear interview questions.\n"
            "If candidate resume context is provided, formulate questions that directly probe\n"
            "their stated technical background, projects, and architectural choices.\n"
            "Return valid JSON matching this schema:\n"
            '{"questions": [{"text": "...", "category": "...", "topic": "...", '
            '"difficulty": "easy|normal|hard|brutal"}]}'
        )
        focus_str = (
            ", ".join(config.focus_areas) if config.focus_areas else "Core technical competency"
        )
        resume_info = ""
        if resume_context:
            skills = ", ".join(resume_context.get("parsed_skills", []))
            highlights = "; ".join(resume_context.get("key_highlights", []))
            summary = resume_context.get("summary", "")
            resume_info = (
                f"\n- Candidate Background: {summary}\n"
                f"- Candidate Stated Skills: {skills}\n"
                f"- Candidate Key Highlights: {highlights}\n"
            )

        user_prompt = (
            f"Generate exactly {count} distinct interview questions for:\n"
            f"- Role: {config.role}\n"
            f"- Company: {config.company}\n"
            f"- Interview Type: {config.type.value}\n"
            f"- Target Difficulty: {config.difficulty.value}\n"
            f"- Focus Areas: {focus_str}\n"
            f"- Interviewer Style: {config.interviewer_style}\n"
            f"{resume_info}\n"
            "Ensure the questions probe deep practical understanding and problem solving."
        )

        raw_json = self._call_llm(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
        )

        if raw_json:
            try:
                parsed = json.loads(raw_json)
                q_list = parsed.get("questions") or []
                if isinstance(q_list, list) and len(q_list) > 0:
                    results: list[Question] = []
                    default_topic = config.focus_areas[0] if config.focus_areas else "General"
                    for item in q_list[:count]:
                        diff = item.get("difficulty", config.difficulty.value).lower()
                        if diff not in ("easy", "normal", "hard", "brutal"):
                            diff = config.difficulty.value
                        results.append(
                            Question(
                                id=new_id(IdPrefix.QUESTION),
                                text=item.get("text", "").strip(),
                                category=item.get("category", "Technical").strip(),
                                topic=item.get("topic", default_topic).strip(),
                                difficulty=diff,
                            )
                        )
                    if len(results) >= count:
                        return results
            except Exception as parse_err:
                logger.warning("Failed to parse OpenRouter question output: %s", parse_err)

        return self._fallback.generate_questions(config, count, resume_context)

    def score_answer(self, question: Question, transcript: str) -> float:
        """Score an individual answer on a 0.0 to 10.0 scale using semantic evaluation."""
        if not transcript.strip():
            return 3.0

        system_prompt = (
            "You are a strict, fair hiring bar raiser. Evaluate the candidate's answer.\n"
            "Score on a 0.0 to 10.0 scale where:\n"
            "0-4 = Inaccurate, superficial, or irrelevant;\n"
            "5-6 = Basic understanding with gaps;\n"
            "7-8 = Strong hireable response with concrete examples and trade-offs;\n"
            "9-10 = Exceptional, staff-level depth and clarity.\n"
            'Return valid JSON: {"score": float, "reasoning": "string"}'
        )
        user_prompt = (
            f"Question ({question.category} - {question.topic} - {question.difficulty.value}):\n"
            f'"{question.text}"\n\n'
            f"Candidate Transcript:\n"
            f'"{transcript}"\n\n'
            "Score the answer."
        )

        raw_json = self._call_llm(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )

        if raw_json:
            try:
                parsed = json.loads(raw_json)
                score_val = float(parsed.get("score", 7.0))
                return round(max(1.0, min(10.0, score_val)), 1)
            except Exception as parse_err:
                logger.warning("Failed to parse OpenRouter score output: %s", parse_err)

        return self._fallback.score_answer(question, transcript)

    def generate_report(
        self, config: PracticeConfig, answers: list[SessionAnswer]
    ) -> dict[str, Any]:
        """Synthesize multi-dimensional performance intelligence and structured feedback."""
        if not answers:
            return self._fallback.generate_report(config, answers)

        total_words = sum(len(a.transcript.split()) for a in answers)
        total_seconds = sum(a.duration_seconds for a in answers)
        average_wpm = round((total_words / total_seconds) * 60) if total_seconds else 0

        fillers: dict[str, int] = {}
        for a in answers:
            lowered = a.transcript.lower()
            for filler in _FILLER_WORDS:
                occurrences = lowered.count(filler)
                if occurrences:
                    fillers[filler] = fillers.get(filler, 0) + occurrences

        system_prompt = (
            "You are a principal interview coach reviewing a candidate's completed mock session.\n"
            "Provide insightful, high-signal, actionable feedback.\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "overall": int (0-100),\n'
            '  "technical": int (0-100),\n'
            '  "communication": int (0-100),\n'
            '  "structure": int (0-100),\n'
            '  "clarity": int (0-100),\n'
            '  "relevance": int (0-100),\n'
            '  "depth": int (0-100),\n'
            '  "summary": "string (2-3 concise sentences)",\n'
            '  "weak_topics": ["string"],\n'
            '  "strengths": ["string", "string"],\n'
            '  "recommended_actions": ["string", "string"],\n'
            '  "answers": [\n'
            "    {\n"
            '      "question": "string",\n'
            '      "answer": "string",\n'
            '      "score": float (0-10),\n'
            '      "strengths": ["string"],\n'
            '      "missing": ["string"],\n'
            '      "better_structure": ["string", "string", "string", "string"]\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        answers_summary = [
            {
                "question": a.question,
                "answer": a.transcript,
                "score": a.score,
                "duration_seconds": a.duration_seconds,
            }
            for a in answers
        ]

        user_prompt = (
            f"Role: {config.role} at {config.company}\n"
            f"Interview Type: {config.type.value}, Difficulty: {config.difficulty.value}\n"
            f"Focus Areas: {', '.join(config.focus_areas)}\n\n"
            f"Session Answers:\n{json.dumps(answers_summary, indent=2)}\n\n"
            "Synthesize the comprehensive performance report."
        )

        raw_json = self._call_llm(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
        )

        if raw_json:
            try:
                parsed = json.loads(raw_json)
                overall = int(parsed.get("overall", 75))
                summary_text = str(
                    parsed.get("summary")
                    or "Good foundational answers with clear real-world examples."
                )
                avg_ans_sec = round(total_seconds / len(answers)) if answers else 0
                return {
                    "overall": max(0, min(100, overall)),
                    "technical": max(0, min(100, int(parsed.get("technical", overall)))),
                    "communication": max(0, min(100, int(parsed.get("communication", overall)))),
                    "structure": max(0, min(100, int(parsed.get("structure", overall)))),
                    "clarity": max(0, min(100, int(parsed.get("clarity", overall)))),
                    "relevance": max(0, min(100, int(parsed.get("relevance", overall)))),
                    "depth": max(0, min(100, int(parsed.get("depth", overall)))),
                    "summary": summary_text,
                    "speech": {
                        "average_wpm": average_wpm,
                        "filler_count": sum(fillers.values()),
                        "fillers": fillers,
                        "long_pauses": 0,
                        "longest_pause": 0.0,
                        "average_answer_seconds": avg_ans_sec,
                    },
                    "weak_topics": (
                        parsed.get("weak_topics") or config.focus_areas[:3] or ["System design"]
                    ),
                    "strengths": (
                        parsed.get("strengths")
                        or ["Clear technical communication", "Structured thinking"]
                    ),
                    "recommended_actions": (
                        parsed.get("recommended_actions")
                        or [
                            "Practice articulating edge cases upfront",
                            "Quantify business and latency impacts in examples",
                        ]
                    ),
                    "answers": [
                        {
                            "question": item.get("question", a.question),
                            "answer": item.get("answer", a.transcript),
                            "score": float(item.get("score", a.score)),
                            "strengths": item.get("strengths") or ["Addressed the core prompt"],
                            "missing": item.get("missing") or ["Deeper trade-off analysis"],
                            "better_structure": (
                                item.get("better_structure")
                                or ["Context", "Action", "Trade-off", "Impact"]
                            ),
                        }
                        for item, a in zip(parsed.get("answers", []), answers, strict=False)
                    ]
                    if parsed.get("answers")
                    else [
                        {
                            "question": a.question,
                            "answer": a.transcript,
                            "score": a.score,
                            "strengths": ["Answered the prompt directly"],
                            "missing": ["Explicit trade-off analysis"],
                            "better_structure": ["Situation", "Action", "Result", "Reflection"],
                        }
                        for a in answers
                    ],
                }
            except Exception as parse_err:
                logger.warning("Failed to parse OpenRouter report output: %s", parse_err)

        return self._fallback.generate_report(config, answers)

    def parse_resume(self, text: str) -> dict[str, Any]:
        """Extract comprehensive skills, summary, all highlights, roles, education, and projects."""
        if not text.strip():
            return self._fallback.parse_resume(text)

        system_prompt = (
            "You are an exhaustive, precision technical resume parser.\n"
            "Analyze the candidate's resume and extract ALL structured information. "
            "DO NOT OMIT OR SKIP ANY DETAILS.\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "parsed_skills": ["string (EVERY skill, language, DB, tool, infra)"],\n'
            '  "summary": "string (executive summary covering seniority & domains)",\n'
            '  "key_highlights": ["string (ALL metrics, scale, throughput, achievements)"],\n'
            '  "experience_points": ["string (ALL roles, companies, responsibilities)"],\n'
            '  "domain_strengths": ["string (ALL architectural & technical domains)"],\n'
            '  "education": ["string (ALL degrees, universities, graduation years)"],\n'
            '  "certifications": ["string (ALL certifications, credentials, licenses)"],\n'
            '  "projects": ["string (ALL personal, academic, open source projects)"]\n'
            "}"
        )
        user_prompt = (
            f"Candidate Resume Content:\n{text[:35000]}\n\n"
            "Extract the complete structured profile. Be thorough and include every single "
            "detail, skill, project, and metric without omitting anything."
        )

        raw_json = self._call_llm(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )

        if raw_json:
            try:
                parsed = json.loads(raw_json)
                skills = parsed.get("parsed_skills")
                if isinstance(skills, list) and len(skills) > 0:
                    return {
                        "parsed_skills": [str(s).strip() for s in skills if str(s).strip()],
                        "summary": str(
                            parsed.get("summary")
                            or "Experienced engineer with a strong track record."
                        ),
                        "key_highlights": [
                            str(h).strip()
                            for h in parsed.get("key_highlights", [])
                            if str(h).strip()
                        ],
                        "experience_points": [
                            str(e).strip()
                            for e in parsed.get("experience_points", [])
                            if str(e).strip()
                        ],
                        "domain_strengths": [
                            str(d).strip()
                            for d in parsed.get("domain_strengths", [])
                            if str(d).strip()
                        ],
                        "education": [
                            str(ed).strip() for ed in parsed.get("education", []) if str(ed).strip()
                        ],
                        "certifications": [
                            str(c).strip()
                            for c in parsed.get("certifications", [])
                            if str(c).strip()
                        ],
                        "projects": [
                            str(p).strip() for p in parsed.get("projects", []) if str(p).strip()
                        ],
                    }
            except Exception as parse_err:
                logger.warning("Failed to parse OpenRouter resume output: %s", parse_err)

        return self._fallback.parse_resume(text)
