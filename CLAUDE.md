# Hinweise für spätere Arbeit an KK-OS

Dieses Repo enthält KK-OS, ein Monorepo für ein operatives
Betriebssystem. Die vollständige Architektur und das Datenmodell stehen
in [`docs/`](./docs). Lies vor Änderungen mindestens
`docs/00-overview.md`, `docs/02-architecture.md` und die relevanten
ADRs in `docs/adr/`.

## Grundregeln

- **Adapter statt Kopplung.** STT/TTS/LLM/IMAP sind hinter Interfaces in
  `packages/speech` bzw. im Worker. Keine harte Modellwahl.
- **Agenten sind Services.** Jeder Agent hat Input/Output-Schema,
  Idempotenz, Retry, Audit. Worker-Code liegt unter `apps/worker/src/agents/`.
- **`tenant_id` ist Pflichtfeld.** Durchgehend im Modell und in API-
  Signaturen. Produktiv mit Row-Level-Security.
- **Voice Clone** bleibt hinter `FEATURE_VOICE_CLONE` + MFA + Consent.
  Siehe ADR-003.
- **Nichts Stilles.** Automatische Aktionen sind auditierbar, umkehrbar
  und eskalieren bei Unsicherheit in die „Zu prüfen"-Queue.

## Lokaler Dev-Zyklus

```bash
scripts/dev-up.sh
pnpm dev
```

## Typische Aufgaben

- Neuen Agent hinzufügen: `apps/worker/src/agents/<name>.agent.ts`,
  Queue in `apps/api/src/agents/queue.service.ts` registrieren.
- Neue Kartenart: `BoardObjectKind` in `packages/shared/src/enums.ts`
  und Prisma-Enum `BoardObjectKind` synchron halten.
- Neuer Speech-Backend: `packages/speech/src/registry.ts` erweitern,
  Contract-Test schreiben.
