.PHONY: infra api worker migrate backend-quality web quality

infra:
	docker compose up -d postgres redis

api:
	docker compose up api

worker:
	docker compose up worker

migrate:
	docker compose run --rm api uv run alembic upgrade head

backend-quality:
	docker compose up -d postgres redis
	docker compose exec -T postgres sh -c "psql -U intervu -d postgres -Atc \"SELECT 1 FROM pg_database WHERE datname='intervu_test'\" | grep -q '^1$$' || createdb -U intervu intervu_test"
	docker compose run --rm -T -e ENVIRONMENT=test -e AI_PROVIDER=mock -e DATABASE_URL=postgresql+asyncpg://intervu:intervu@postgres:5432/intervu_test -e REDIS_URL=redis://redis:6379/14 api sh -c "uv run alembic upgrade head && uv run ruff format --check . && uv run ruff check . && uv run mypy app tests scripts && uv run pytest && uv run alembic check"

web:
	pnpm dev:web

quality:
	pnpm quality
	$(MAKE) backend-quality
