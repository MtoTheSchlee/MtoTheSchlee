#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[dev-up] .env created from .env.example"
fi

echo "[dev-up] starting docker stack"
docker compose -f infra/compose/docker-compose.yml --env-file .env up -d

echo "[dev-up] installing node deps"
pnpm install

echo "[dev-up] running prisma migrate + seed"
pnpm --filter @kk/api exec prisma migrate deploy || pnpm --filter @kk/api exec prisma migrate dev --name init
pnpm --filter @kk/api exec tsx prisma/seed.ts

echo "[dev-up] done. run 'pnpm dev' to start api + web + worker"
