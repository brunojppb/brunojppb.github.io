#!/usr/bin/env bash
# Stops the server that launch.sh started. Keeps runs/ (the evidence).
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="$SKILL/.state/serve.pid"
if [ -f "$PIDFILE" ]; then
  pid="$(cat "$PIDFILE")"
  pkill -P "$pid" 2>/dev/null
  kill "$pid" 2>/dev/null
  rm -f "$PIDFILE"
  echo "stopped pid $pid"
else
  echo "no pid file. Nothing to stop."
fi
