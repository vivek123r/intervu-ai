.PHONY: up down dev api web seed test lint quality

up:
	docker compose up -d

down:
	docker compose down

dev:
	./dev.sh

api:
	cd Backend && uv run uvicorn app.main:app --reload --port 8000

web:
	cd Frontend && pnpm dev

seed:
	cd Backend && uv run python -m scripts.seed

test:
	cd Backend && uv run pytest
	cd Frontend && pnpm test

lint:
	cd Backend && uv run ruff check .
	cd Frontend && pnpm lint

quality: lint test
	cd Backend && uv run mypy app
	cd Frontend && pnpm typecheck && pnpm build
