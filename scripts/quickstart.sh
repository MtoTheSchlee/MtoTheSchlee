#!/usr/bin/env bash
# Bring up KK-OS from a fresh clone in one command.
#
# Usage:
#   scripts/quickstart.sh           # full setup + start
#   scripts/quickstart.sh fixtures  # just reseed demo data against a running DB
#   scripts/quickstart.sh start     # just start API/web/worker (assumes install+migrate)
#
# Requires: node 20+, pnpm 9, running Postgres 16 on localhost:5432 with a
# `kkos` database owned by user `kkos` password `kkos`, and a running Redis.
# See README for the Docker alternative.
set -euo pipefail
cd "$(dirname "$0")/.."

STEP() { echo; echo "━━━ $* ━━━"; }

setup() {
  STEP "1) .env"
  [ -f .env ] || cp .env.example .env
  [ -L apps/api/.env ] || ln -sf ../../.env apps/api/.env
  if [ ! -f apps/web/.env.local ]; then
    cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000001
API_PUBLIC_URL=http://localhost:4000
EOF
  fi

  STEP "2) dependencies"
  pnpm install

  STEP "3) shared packages"
  pnpm --filter @kk/shared --filter @kk/speech --filter @kk/llm build

  STEP "4) prisma migrate"
  pnpm --filter @kk/api exec prisma migrate deploy

  STEP "5) seed + demo fixtures"
  pnpm --filter @kk/api exec tsx prisma/seed.ts
  pnpm --filter @kk/api exec tsx ../../scripts/demo-fixtures.ts

  STEP "6) build apps"
  pnpm --filter @kk/api exec nest build
  pnpm --filter @kk/worker build
  pnpm --filter @kk/web build
}

fixtures() {
  STEP "Reseed demo data"
  pnpm --filter @kk/api exec tsx prisma/seed.ts
  pnpm --filter @kk/api exec tsx ../../scripts/demo-fixtures.ts
}

start() {
  STEP "Killing stale processes"
  pkill -9 -f 'dist/src/main' 2>/dev/null || true
  pkill -9 -f 'next-server' 2>/dev/null || true
  pkill -9 -f 'dist/main.js' 2>/dev/null || true
  sleep 2

  mkdir -p .runtime
  STEP "Start API on :4000  (log .runtime/api.log)"
  (cd apps/api && STORAGE_BACKEND=fs node dist/src/main.js > ../../.runtime/api.log 2>&1 &)

  STEP "Start worker  (log .runtime/worker.log)"
  (cd apps/worker && node dist/main.js > ../../.runtime/worker.log 2>&1 &)

  STEP "Start web on :3000  (log .runtime/web.log)"
  (cd apps/web && pnpm exec next start -p 3000 > ../../.runtime/web.log 2>&1 &)

  sleep 6
  echo
  echo "Health:"
  curl -s -o /dev/null -w "  API :4000 → %{http_code}\n" http://localhost:4000/api/healthz || true
  curl -s -o /dev/null -w "  Web :3000 → %{http_code}\n" http://localhost:3000/ || true
  echo
  echo "Login: owner@kuechen-klaus.de / kkos-dev-pass"
  echo "Logs:  tail -f .runtime/{api,worker,web}.log"
  echo "Stop:  scripts/quickstart.sh stop"
}

stop() {
  STEP "Stopping KK-OS"
  pkill -9 -f 'dist/src/main' 2>/dev/null || true
  pkill -9 -f 'next-server' 2>/dev/null || true
  pkill -9 -f 'dist/main.js' 2>/dev/null || true
  echo "done."
}

case "${1:-full}" in
  full)     setup; start;;
  setup)    setup;;
  fixtures) fixtures;;
  start)    start;;
  stop)     stop;;
  *) echo "usage: $0 {full|setup|fixtures|start|stop}"; exit 1;;
esac
