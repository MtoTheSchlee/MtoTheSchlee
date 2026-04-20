# KK-OS – Operatives Betriebssystem für Küchen Klaus

> Board-Oberfläche als Steuerzentrale. Darunter CRM, DMS, Mail-Automation,
> AB-Abgleich, Terminmanagement, Controlling, Social-Media-Studio und
> ein zuschaltbares Jarvis-Sprachmodul (STT/TTS, optional Voice Clone).
>
> **Local-first testbar, server-ready skalierbar.**

## Dokumentation

Die ausführliche Architektur und das Datenmodell stehen in [`docs/`](./docs).
Startpunkt: [`docs/00-overview.md`](./docs/00-overview.md).

| Datei | Inhalt |
|---|---|
| [`docs/01-requirements.md`](./docs/01-requirements.md) | Phase 1 – Anforderungen, Risiken, Annahmen |
| [`docs/02-architecture.md`](./docs/02-architecture.md) | Phase 2 – Zielarchitektur lokal + Server |
| [`docs/03-data-model.md`](./docs/03-data-model.md) | Phase 3 – Datenmodell & Relationen |
| [`docs/04-workflows.md`](./docs/04-workflows.md) | Phase 4 – Operative und Sprach-Flows |
| [`docs/05-ui-ux.md`](./docs/05-ui-ux.md) | Phase 5 – UI/UX-Konzept |
| [`docs/06-mvp-plan.md`](./docs/06-mvp-plan.md) | Phase 6 – MVP-Plan (Must/Should/Nice) |
| [`docs/08-roadmap.md`](./docs/08-roadmap.md) | Phase 8 – Roadmap, Tests, Deployment |
| [`docs/adr/`](./docs/adr) | Architecture Decision Records |

## Repository-Struktur

```
apps/
  api/         – NestJS API (REST + WS) + Prisma schema
  web/         – Next.js 14 Frontend (App Router, Tailwind)
  worker/      – BullMQ worker: Mail, AB, Akte, Termin, Controlling,
                 Social, Speech, Orchestrator
packages/
  shared/      – Enums, events, Ampel-Logik, IDs, Unit-Tests
  speech/      – Adapter-Schicht für STT, TTS, VoiceClone, CommandRouter
  llm/         – LLM-Gateway mit PII-Redactor, Provider-Selector,
                 Budget-Guard (Anthropic, OpenAI, Noop-Fallback)
infra/
  compose/     – docker-compose.yml (Postgres, Redis, MinIO, MailHog, STT, TTS)
  stt-service/ – faster-whisper FastAPI sidecar
  tts-service/ – Chatterbox Multilingual FastAPI sidecar (stub-fähig)
docs/          – Architektur, Datenmodell, Workflows, MVP, ADRs
```

## Voraussetzungen

- Node.js ≥ 20, pnpm ≥ 9
- Docker (für Compose-Stack)

## Schnellstart (lokaler Pilotbetrieb)

```bash
cp .env.example .env

# 1) Infrastruktur starten
pnpm compose:up

# 2) Abhängigkeiten installieren
pnpm install

# 3) Prisma-Client erzeugen und Schema migrieren
pnpm --filter @kk/api exec prisma migrate dev --name init
pnpm --filter @kk/api exec tsx prisma/seed.ts

# 4) API, Worker und Web parallel starten
pnpm dev
```

Offene URLs:

| Zweck | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:4000/api |
| MailHog | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| STT-Sidecar | http://localhost:9010 |
| TTS-Sidecar | http://localhost:9020 |

Default-Login: `owner@kuechen-klaus.de` / `kkos-dev-pass` (nur lokal).

## Tests

```bash
# Alle Workspace-Tests (Vitest)
pnpm -r test

# End-to-End gegen laufenden Stack (Playwright + Chromium)
pnpm --filter @kk/web test:e2e
```

Abgedeckt: Ampel-Logik, AB-Matcher (Kernlogik der AB-Prüfung),
Mail-Classifier (Regex-Baseline), AB-Parser, Speech-Command-Router
(Regex + Layered), PII-Redactor.

## Feature-Flags

| Flag | Default | Bedeutung |
|---|---|---|
| `FEATURE_VOICE` | `true` | Sprachmodul (Jarvis) sichtbar |
| `FEATURE_VOICE_CLONE` | `false` | Voice-Cloning-Endpoints (MFA+Consent) |
| `FEATURE_SOCIAL_STUDIO` | `true` | Social-Studio aktiv |
| `FEATURE_PII_REDACTOR` | `true` | PII-Redactor im LLM-Gateway |

## Agenten im Überblick

| Agent | Queue | Zweck |
|---|---|---|
| `orchestrator` | `orchestrator.plan` | plant Folge-Agenten je Event |
| `mail` | `mail.classify` | klassifiziert eingehende E-Mails |
| `ab` | `ab.extract` | extrahiert + triggert Match + Discrepancies |
| `kundenakte` | `doc.classify` | ordnet Mails/Docs Kunden/Projekten zu |
| `termin` | `appointment.suggest` | erzeugt Terminvorschläge aus Mails |
| `controlling` | `controlling.compute` | KPI-Snapshot alle 15 Minuten |
| `social` | `social.ideate` | generiert Post-Entwürfe zu Projekten |
| `speech` | `speech.stt` / `speech.tts` | Sprach-Pipelines |

Idempotenz pro `(tenantId, agent, triggerRef)` über SHA-256-Key.

## Sprachmodul

- Standard-STT: `faster-whisper` (Container `infra/stt-service`)
- Standard-TTS: Chatterbox Multilingual (Container `infra/tts-service` mit
  funktionierendem Stub falls Modell lokal fehlt)
- Adapter: `packages/speech` mit `SpeechToTextService`,
  `TextToSpeechService`, `VoiceCloneService`, `VoiceCommandRouter`.
- Backend-Wechsel rein per ENV (`SPEECH_STT_BACKEND`, `SPEECH_TTS_BACKEND`).
- Voice Clone: ADR-003 – Opt-in, MFA, Watermark, Auditpflicht.
- **Audio-Capture im Browser**: Voice-Bar im Footer (MediaRecorder →
  `/api/speech/transcribe`). Degradiert sauber, wenn das STT-Sidecar
  offline ist — die Tastatur-Eingabe bleibt nutzbar.

## AB-Pipeline

Zwei Wege, aus einer Auftragsbestätigung eine Ampel zu machen:

1. **Drag&Drop** eines PDF auf `/ab` → API extrahiert Text mit
   pdfjs-dist, `parseAbBasic` (shared) liefert Positionen, `AbMatcher`
   vergleicht mit der Bestellung, Discrepancies landen als Karten im
   Board.
2. **Automatisch aus E-Mails**: Klassifikator setzt `ab`, Worker-Agent
   lädt die PDF-Anhänge über `/api/emails/:id/attachments/:aid/download`
   und delegiert an `/api/ab/from-email/:emailId` — exakt derselbe Pfad
   wie beim manuellen Upload.

Ohne MinIO läuft der Flow mit Filesystem-Storage (`STORAGE_BACKEND=fs`).

## Row-Level-Security (optional)

`prisma/migrations/20260420210000_optional_rls` legt Policies an, ohne
RLS zu erzwingen. Produktionsaktivierung in zwei Schritten:

```bash
# 1. Policies sind bereits nach `prisma migrate deploy` da.
# 2. RLS scharfschalten (läuft als DB-Owner):
psql "$DATABASE_URL" -f scripts/enable-rls.sql

# 3. API + Worker auf die kkos_app-Rolle umstellen und
#    ENABLE_RLS=true setzen. Die TenantMiddleware schreibt
#    app.current_tenant pro Request.
```

## Serverbetrieb

Architektur, Sicherheits- und Betriebsaspekte stehen in
[`docs/02-architecture.md`](./docs/02-architecture.md#24-lokaler-betrieb-vs-serverbetrieb).
Kernpunkte:

- Managed Postgres + Backup/PITR, Redis-Replica, S3-kompatibler Storage.
- Traefik/Caddy als Reverse-Proxy, TLS mit Let's Encrypt.
- Row-Level-Security auf Postgres-Ebene, SSO (OIDC/SAML), MFA.
- Horizontale Skalierung für API und Worker.
- Beobachtbarkeit: pino-Logs, OpenTelemetry, Prometheus, Loki/Grafana.

## Roadmap

Siehe [`docs/08-roadmap.md`](./docs/08-roadmap.md).
