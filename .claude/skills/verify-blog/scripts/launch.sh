#!/usr/bin/env bash
# Builds the site and serves dist on port 4321. Never the dev server.
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$SKILL/../../.." && pwd)"
PORT="${PORT:-4321}"
STATE="$SKILL/.state"
mkdir -p "$STATE"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "port $PORT is in use. Not starting a second server. Stop that one first." >&2
  exit 1
fi

cd "$ROOT"
pnpm build >"$STATE/build.log" 2>&1 || { tail -30 "$STATE/build.log" >&2; exit 1; }
nohup pnpm exec serve dist -p "$PORT" >"$STATE/serve.log" 2>&1 &
echo $! >"$STATE/serve.pid"

for _ in $(seq 1 40); do
  if curl -fsS "http://localhost:$PORT/pagefind/pagefind.js" -o /dev/null 2>/dev/null; then
    echo "ready: http://localhost:$PORT (pid $(cat "$STATE/serve.pid"))"
    exit 0
  fi
  sleep 0.5
done
echo "server did not answer in 20s. See $STATE/serve.log" >&2
exit 1
