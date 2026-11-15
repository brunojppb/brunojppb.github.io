#!/usr/bin/env bash
# Read-only. Exit 0 means the server on 4321 is ours, current, and serves the Pagefind index.
PORT="${PORT:-4321}"
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$SKILL/../../.." && pwd)"
PIDFILE="$SKILL/.state/serve.pid"
fail=0
say() { echo "$1"; }

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  say "ok   server pid $(cat "$PIDFILE") is alive"
else
  say "FAIL no server started by launch.sh. Run scripts/launch.sh"; fail=1
fi

owner="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)"
if [ -z "$owner" ]; then say "FAIL nothing listens on $PORT"; fail=1
else say "ok   port $PORT is owned by pid $owner (a child of the saved pid is normal)"; fi

if [ -d "$ROOT/dist" ] && [ -n "$(find "$ROOT/src" "$ROOT/package.json" -newer "$ROOT/dist/index.html" -type f 2>/dev/null | head -1)" ]; then
  say "FAIL dist is older than src. Rebuild with scripts/launch.sh"; fail=1
else
  say "ok   dist is not older than src"
fi

if [ -f "$ROOT/dist/pagefind/pagefind.js" ]; then say "ok   dist/pagefind/pagefind.js exists"
else say "FAIL dist/pagefind/pagefind.js is missing. Rebuild with scripts/launch.sh"; fail=1; fi

n="$(curl -fsS "http://localhost:$PORT/pagefind/pagefind-entry.json" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Object.values(JSON.parse(s).languages).reduce((a,l)=>a+l.page_count,0))}catch{console.log(0)}})')"
if [ "${n:-0}" -gt 0 ]; then say "ok   the server indexes $n pages"
else say "FAIL /pagefind/pagefind-entry.json is missing or empty"; fail=1; fi
exit $fail
