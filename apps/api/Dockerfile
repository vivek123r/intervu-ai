FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN pip install --no-cache-dir uv==0.8.11

COPY pyproject.toml ./

FROM base AS development
RUN uv sync --all-extras --no-install-project
COPY . .
RUN uv sync --all-extras
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM base AS production
RUN uv sync --no-dev --no-install-project
COPY . .
RUN uv sync --no-dev
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
