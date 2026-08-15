#!/usr/bin/env bash
# One-command dev bootstrap: Mongo (docker) + seed + API + web, all in this terminal.
# Ctrl+C stops API and web; Mongo keeps running (use `make down` to stop it too).
set -eo pipefail
set -m # each background job gets its own process group, so we can kill it (and its children) cleanly

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f Backend/.env ]; then
  cp Backend/.env.example Backend/.env
  echo "==> Created Backend/.env from .env.example"
fi

if [ ! -f Frontend/.env.local ]; then
  cp Frontend/.env.example Frontend/.env.local
  echo "==> Created Frontend/.env.local from .env.example"
fi

echo "==> Starting MongoDB (docker compose)…"
docker compose up -d --wait

echo "==> Seeding database…"
(cd Backend && uv run python -m scripts.seed)

pids=()
cleanup() {
  echo
  echo "==> Stopping API and web…"
  for pid in "${pids[@]}"; do
    kill -TERM "-$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

echo "==> Starting API on http://localhost:8000"
(cd Backend && exec uv run uvicorn app.main:app --reload --port 8000) &
pids+=("$!")

echo "==> Starting web on http://localhost:3000"
(cd Frontend && exec pnpm dev) &
pids+=("$!")

cat <<EOF

  Mongo Express  http://localhost:8081
  API            http://localhost:8000
  Web            http://localhost:3000

  Press Ctrl+C to stop API + web.
EOF

wait
