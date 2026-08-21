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

echo "==> Starting Services (docker compose)…"
docker compose up -d --wait --remove-orphans

echo "==> Ensuring Piston runtimes are installed…"
runtimes=$(curl -s http://localhost:2000/api/v2/runtimes 2>/dev/null || echo "[]")
if ! echo "$runtimes" | grep -q '"language":"python"'; then
  echo "==> Installing Python in Piston..."
  curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"python","version":"3.12.0"}' > /dev/null
fi
if ! echo "$runtimes" | grep -q '"language":"javascript"'; then
  echo "==> Installing Node.js in Piston..."
  curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"node","version":"20.11.1"}' > /dev/null
fi

echo "==> Seeding only coding questions into MongoDB…"
(cd Backend && uv run python -m scripts.seed --coding-only)


pids=()
cleanup() {
  echo
  echo "==> Stopping API and web…"
  for pid in "${pids[@]}"; do
    kill -TERM "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM HUP EXIT

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
