from app.repositories.coding_drafts import CodeDraftRepository
from app.repositories.coding_problems import CodingProblemRepository
from app.schemas.coding import DraftResponse
from app.schemas.common import CodingLanguage


class CodeDraftService:
    def __init__(
        self,
        drafts: CodeDraftRepository,
        problems: CodingProblemRepository,
    ) -> None:
        self.drafts = drafts
        self.problems = problems

    async def get_draft(self, user_id: str, slug: str, language: CodingLanguage) -> DraftResponse:
        doc = await self.drafts.get(user_id, slug, language)
        if doc:
            return DraftResponse(
                language=CodingLanguage(doc["language"]),
                code=doc["code"],
                updated_at=doc.get("updated_at"),
            )

        # Fallback to starter code
        problem = await self.problems.get_by_slug(slug)
        starter = ""
        if problem and "starter_code" in problem:
            lang_key = language.value if hasattr(language, "value") else str(language)
            starter = problem["starter_code"].get(lang_key, "")

        return DraftResponse(
            language=language,
            code=starter,
            updated_at=None,
        )

    async def save_draft(
        self, user_id: str, slug: str, language: CodingLanguage, code: str
    ) -> DraftResponse:
        doc = await self.drafts.upsert(user_id, slug, language, code)
        return DraftResponse(
            language=CodingLanguage(doc["language"]),
            code=doc["code"],
            updated_at=doc.get("updated_at"),
        )
