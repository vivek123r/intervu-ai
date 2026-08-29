.PHONY: up down dev api web seed test lint quality e2e

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

seed-coding:
	cd Backend && uv run python -m scripts.seed --coding-only

import-leetcode:
	cd Backend && uv run python -m scripts.import_leetcode

test:
	cd Backend && uv run pytest
	cd Frontend && pnpm test

lint:
	cd Backend && uv run ruff check .
	cd Frontend && pnpm lint

quality: lint test
	cd Backend && uv run mypy app
	cd Frontend && pnpm typecheck && pnpm build

# Requires the stack already running (`make dev` or `make up && make api && make web`) —
# drives a full interview in a real browser against it. See Frontend/e2e/.
e2e:
	cd Frontend && pnpm e2e
