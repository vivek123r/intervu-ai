from __future__ import annotations

import json
from time import perf_counter
from typing import Any

import httpx
from pydantic import ValidationError
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.ai.provider.base import AIMessage, AIResponse, AIUsageData, SchemaT
from app.config import Settings
from app.exceptions import AIInvalidResponse, AIProviderUnavailable


class _TransientProviderError(Exception):
    pass


class OpenRouterAIProvider:
    endpoint = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        if not settings.openrouter_api_key:
            raise AIProviderUnavailable("OpenRouter is selected but no API key is configured.")
        self._settings = settings
        self._client = client or httpx.AsyncClient(timeout=settings.ai_request_timeout_seconds)

    async def generate(
        self,
        messages: list[AIMessage],
        *,
        schema: type[SchemaT] | None = None,
        temperature: float | None = None,
        model: str | None = None,
    ) -> AIResponse[SchemaT]:
        started = perf_counter()
        chosen_model = model or self._settings.openrouter_model
        payload: dict[str, Any] = {
            "model": chosen_model,
            "messages": [
                {"role": message.role, "content": message.content} for message in messages
            ],
            "temperature": temperature if temperature is not None else 0.2,
        }
        if schema:
            payload["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": schema.__name__,
                    "strict": True,
                    "schema": schema.model_json_schema(),
                },
            }

        retryer = AsyncRetrying(
            stop=stop_after_attempt(self._settings.ai_max_retries + 1),
            wait=wait_exponential(multiplier=0.35, min=0.35, max=2.5),
            retry=retry_if_exception_type((_TransientProviderError, httpx.TransportError)),
            reraise=True,
        )
        try:
            async for attempt in retryer:
                with attempt:
                    response = await self._client.post(
                        self.endpoint,
                        headers={
                            "Authorization": f"Bearer {self._settings.openrouter_api_key}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": self._settings.web_origin,
                            "X-Title": "Intervu AI",
                        },
                        json=payload,
                    )
                    if response.status_code in {408, 409, 429, 500, 502, 503, 504}:
                        raise _TransientProviderError(
                            f"Transient provider status {response.status_code}"
                        )
                    if response.is_error:
                        raise AIProviderUnavailable(
                            "OpenRouter rejected the request.",
                            details={"status_code": response.status_code},
                        )
                    body = response.json()
        except (_TransientProviderError, httpx.TransportError, httpx.TimeoutException) as exc:
            raise AIProviderUnavailable() from exc

        try:
            content = str(body["choices"][0]["message"]["content"])
            parsed = self._parse(content, schema) if schema else None
            usage = body.get("usage") or {}
        except (KeyError, IndexError, TypeError, ValidationError, json.JSONDecodeError) as exc:
            raise AIInvalidResponse(details={"provider": "openrouter"}) from exc
        return AIResponse(
            content=content,
            parsed=parsed,
            provider="openrouter",
            model=str(body.get("model") or chosen_model),
            latency_ms=round((perf_counter() - started) * 1000),
            usage=AIUsageData(
                input_tokens=int(usage.get("prompt_tokens") or 0),
                output_tokens=int(usage.get("completion_tokens") or 0),
            ),
        )

    @staticmethod
    def _parse(content: str, schema: type[SchemaT]) -> SchemaT:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```json").removeprefix("```")
            cleaned = cleaned.removesuffix("```").strip()
        return schema.model_validate_json(cleaned)

    async def close(self) -> None:
        await self._client.aclose()
