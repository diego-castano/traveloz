#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="${PNPM_HOME:-$HOME/Library/pnpm}:$PATH"

if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

# Local workaround for this machine: Prisma is stable using the binary engine.
export PRISMA_CLIENT_ENGINE_TYPE="binary"

pnpm exec next dev &
NEXT_PID=$!

cleanup() {
  kill "$NEXT_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Wait until Next is reachable, then warm the login route so the first
# browser visit doesn't pay the compile cost.
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:3000/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:3000/login" >/dev/null 2>&1 || true

wait "$NEXT_PID"
