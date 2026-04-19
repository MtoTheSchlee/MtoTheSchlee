# Phase 2 – Zielarchitektur

## 2.1 Leitbild

KK-OS ist ein **Event-getriebenes Modulith** mit klar abgegrenzten
Bounded Contexts, das ein minimales Set an externen Abhängigkeiten hat und
lokal wie serverseitig mit identischem Code-Pfad läuft.

Wir bauen bewusst **nicht** mehrere Microservices: ein NestJS-API-Prozess
plus ein Worker-Prozess reichen bis tief in den Wachstumspfad. Die
Modultrennung erfolgt im Code (Domain-Module), nicht über Netzwerkgrenzen.
Externe Integrationen (IMAP, STT, TTS, LLM, OCR, Object Storage) sind
Adapter hinter Interfaces.

## 2.2 Systemübersicht

```
                 ┌─────────────────────────────────────────┐
                 │             Nutzer (Browser)            │
                 │  Next.js Web + Voice Bar (WebRTC/WS)    │
                 └───────────────┬─────────────────────────┘
                                 │  HTTPS + WS/SSE
                 ┌───────────────▼─────────────────────────┐
                 │            NestJS API Gateway           │
                 │  Auth/RBAC • REST • WS • SSE • Webhooks │
                 │  Domain Modules: Board, CRM, DMS, Mail, │
                 │  Orders, AB, Appointments, Social,      │
                 │  Metrics, Agents, Speech                │
                 └───┬─────────────┬──────────┬────────────┘
                     │             │          │
        ┌────────────▼──┐   ┌──────▼───────┐ ┌▼────────────┐
        │   Postgres    │   │   BullMQ     │ │  Object      │
        │ (Prisma, RLS) │   │ (Redis-based)│ │  Storage     │
        └──────┬────────┘   └──────┬───────┘ │  (S3/MinIO)  │
               │                   │         └──────────────┘
               │            ┌──────▼──────────────────────┐
               │            │        Agent Workers        │
               │            │  Mail • AB • Akte • Termin  │
               │            │  Controlling • Social •     │
               │            │  Speech • Orchestrator      │
               │            └─┬─────────┬─────────┬───────┘
               │              │         │         │
               │        ┌─────▼───┐ ┌───▼────┐ ┌──▼──────┐
               │        │ IMAP /  │ │  LLM   │ │ OCR /   │
               │        │ SMTP    │ │Gateway │ │ Parser  │
               │        └─────────┘ └────────┘ └─────────┘
               │                          │
               │                    ┌─────▼─────────────┐
               │                    │ STT / TTS / Clone │
               │                    │ (faster-whisper,  │
               │                    │  Chatterbox, …)   │
               │                    └───────────────────┘
               │
        ┌──────▼────────┐
        │  Full-Text /  │
        │  pgvector     │
        └───────────────┘
```

## 2.3 Komponenten

### Frontend – `apps/web` (Next.js 14 App Router + TS)

- React Server Components für Datenseiten; Client Components nur für
  Interaktion (Board Drag&Drop, Voice Bar, Live-Updates).
- State: React Query für Server-State, Zustand für UI-State, WS-Client
  für Board-Live-Patches.
- Design-System: Tailwind + Radix Primitives + shadcn-Muster.
- Voice Bar nutzt Browser-Mikrofon, streamt via WebSocket an API, API
  proxyt an STT-Service. TTS-Chunks werden als Audio-Stream zurückgereicht.

### API – `apps/api` (NestJS + TS + Prisma)

- Modulgrenzen 1:1 zum Datenmodell (Customers, Projects, Orders,
  Suppliers, AB, Discrepancies, Documents, Emails, Board, Tasks,
  Appointments, Metrics, Social, Agents, Speech, Users/Auth).
- Transport: REST (CRUD), WebSocket Gateway (Realtime), SSE (Stream für
  Agent-Runs und STT-Partials), Webhooks (Mail/Eingangssignale).
- Persistenz: Prisma → Postgres. `tenant_id` ist Pflichtfeld, durchgehend
  im Middleware-Scope; produktiv mit Postgres-Row-Level-Security.
- Authentifizierung: JWT (Access + Refresh), pluggable SSO-Adapter
  (SAML/OIDC) für Serverbetrieb.
- Observability: pino-Logs, OpenTelemetry-Traces, Prometheus-Metriken,
  Health-Endpoints (`/healthz`, `/readyz`).

### Worker – `apps/worker` (Node + BullMQ + TS)

- Ein Node-Prozess mit mehreren Queues: `mail.ingest`, `mail.classify`,
  `ab.extract`, `ab.match`, `doc.classify`, `appointment.suggest`,
  `controlling.compute`, `social.ideate`, `speech.stt`, `speech.tts`,
  `orchestrator.plan`.
- Jeder Agent hat: **Input-Schema, Output-Schema, Idempotency-Key,
  Retry-Policy, Timeout, Metrics, Audit-Log-Hook**.
- Worker kann horizontal skaliert werden; jede Queue hat Concurrency-
  Limits pro Worker.

### Datenhaltung

- **Postgres** (inkl. `pgvector` für Embeddings, `pg_trgm` für Fuzzy-Suche).
  Prisma ist Migrations- und Typquelle.
- **Redis** für BullMQ, Rate-Limits, kurzlebige Sitzungsdaten.
- **Object Storage** (S3-kompatibel, lokal MinIO) für Mail-Anhänge,
  PDF-ABs, Montagefotos, TTS-Ausgaben, STT-Rohaudio (nach Retention).
- **Optional ClickHouse/DuckDB** später für Controlling-Aggregate. Nicht
  im MVP.

### Integrationen

- **IMAP/SMTP** via `ImapFlow` + `nodemailer`. Adapter abstrahiert den
  konkreten Anbieter (Microsoft 365, Google, klassisches IMAP).
- **OCR/Parsing** hinter `DocumentParserService`: erste Schicht
  `pdfplumber`/`pdfminer` (via Python-Microservice) + `tika` (JVM-Service)
  in Compose, zweite Schicht LLM-Extraktion auf strukturiertem Output.
- **LLM Gateway** – eigener Dienst mit Provider-Selector, PII-Redactor,
  Prompt-Cache, Budget-Guard. Provider: Anthropic, OpenAI, lokale
  llama.cpp-Endpoints. Defaults konfigurierbar pro Funktion.
- **STT/TTS** hinter HTTP-Adapter-Interface; Default-Container im Compose:
  - STT: `faster-whisper` in eigenem Container, REST + WebSocket.
  - TTS: Chatterbox Multilingual in eigenem Container.
  - optional: `whisper.cpp`, Qwen3-TTS.

### Realtime

- WebSocket-Gateway in der API (Socket.IO) für Board-Updates,
  Mail-Eingang, AB-Alarme, Agent-Status.
- Separater WS-Endpoint für Sprachstream (binary frames, STT-Partials,
  TTS-Chunks). Keine Vermischung mit Control-Plane-WS.
- Fallback SSE für Agent-Run-Logs.

### Authentifizierung & RBAC

- Rollen: `owner`, `planner`, `purchaser`, `installer`, `marketer`,
  `auditor`, `agent`, `voice_operator` (darf Voice-Profile verwalten).
- Permission-Matrix pro Ressource und Feld (z. B. Lieferantenpreise nur
  für `purchaser`, `owner`).
- Voice-Profile und Voice-Clone stehen hinter zusätzlicher MFA-Policy.

## 2.4 Lokaler Betrieb vs. Serverbetrieb

| Thema | Lokal (Pilot) | Server (Produktiv) |
|---|---|---|
| Start | `docker compose up` | Orchestriert (Nomad/Swarm/K8s) |
| DB | Postgres-Container, `pgdata`-Volume | Managed Postgres + PITR-Backup |
| Redis | Container | Managed Redis mit Replica |
| Object Storage | MinIO | S3 / R2 / Wasabi |
| Mail | MailHog catcht alles, `imap-simulator` | Echtes IMAP/SMTP, SPF/DKIM |
| STT/TTS | Containerisierte Modelle, CPU | GPU-Node oder managed API |
| LLM | lokales Modell über Gateway oder Dev-Key | Enterprise-Provider-Keys |
| TLS | self-signed optional | Traefik/Caddy + Let's Encrypt |
| Auth | lokal seed-User | SSO (OIDC/SAML) |
| Realtime | Single-node Socket | Sticky-Session oder Redis-Adapter |
| Secrets | `.env` (gitignored) | Secret-Manager (Vault/SOPS/SSM) |
| Observability | pino stdout | Loki/Grafana/Tempo oder managed |
| RLS | aus (optional) | **an** pro Tenant |
| Backups | `pg_dump` manuell | täglich, off-site, getestet |

Der Code ist **identisch**, nur Konfiguration unterscheidet sich. Jede
Konfig-Variable ist in `.env.example` dokumentiert.

## 2.5 Stack-Entscheidungen (kurz begründet)

- **TypeScript überall** – ein Typsystem, geteilte Types über `packages/shared`.
- **NestJS** – DI, Modulgrenzen, WS + REST + SSE im selben Framework,
  stabile Boilerplate-Reduktion, gute Prisma-Integration.
- **Next.js App Router** – RSC reduzieren Client-JS, gute Streaming-
  Fähigkeiten für Agent-Runs.
- **Prisma + Postgres** – eine Schema-Wahrheit, Migrations, typsicher.
  Postgres deckt JSONB, Volltext, Vector, RLS.
- **BullMQ** – reif, gute Observability, keine zusätzlichen Infra-
  Komponenten außer Redis (das wir ohnehin brauchen).
- **MinIO** – drop-in S3, zero-config lokal.
- **Python-Sidecars** (`whisper`, `tika`, `pdfplumber`) nur wo nötig;
  Kommunikation via HTTP mit klaren Contracts.

## 2.6 Architecture Decision Records (ADR)

Relevante Entscheidungen werden als ADR in [`docs/adr/`](./adr) gepflegt.
Siehe [ADR-001](./adr/ADR-001-modulith-vs-microservices.md),
[ADR-002](./adr/ADR-002-speech-backends-pluggable.md),
[ADR-003](./adr/ADR-003-voice-clone-consent.md).

## 2.7 Deployment-Topologie (Server)

```
  Internet ─▶ Traefik/Caddy ─▶ Next.js (web)
                           ─▶ NestJS (api)       ─▶ Postgres
                           ─▶ WebSocket Gateway  ─▶ Redis
                           ─▶ STT/TTS Services   ─▶ Object Storage
                           ─▶ LLM Gateway        ─▶ Observability
           Background:    Worker(s) ◀─────────── Redis
```

Skalierung: API und Worker horizontal, Postgres vertikal + Read-Replica
später, STT/TTS GPU-Pool, Object Storage externer Service.

## 2.8 Sicherheitsarchitektur

- TLS everywhere, mTLS für interne Services optional.
- **PII-Redactor** im LLM-Gateway vor externem Versand (Namen, Adressen,
  IBAN, Telefon, E-Mail via regex + NER-Modell).
- Envelope Encryption für Voice-Profile und sensible Mail-Bodies.
- WAF/Ratelimit auf API-Gateway.
- Dependency-Scans (osv-scanner, npm audit) in CI.
- Secrets nie in Git; `gitleaks` pre-commit optional.
- Voice-Clone-Endpoints immer mit zusätzlicher MFA und signierter
  Einwilligungsreferenz.

## 2.9 Fehlerbehandlung und Degradation

- Jede Agent-Queue hat Dead-Letter-Queue mit Inspektor-UI.
- Fällt LLM-Gateway aus, laufen deterministische Extraktoren (Regex,
  Template) als Fallback weiter; Konfidenz sinkt, Fälle landen in
  „Zu prüfen".
- Fällt STT aus, bleibt UI mit Texteingabe nutzbar.
- Fällt IMAP aus, zeigt das Dashboard einen expliziten Health-Banner;
  kein stilles Weiterlaufen.
- Fällt die DB aus, wird der Worker gebremst (keine Silent-Drops).
