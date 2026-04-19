# Küchen Klaus – Operatives Betriebssystem (KK-OS)

> Ein modulares Unternehmensbetriebssystem für ein mittelständisches Küchenstudio.
> Board-Oberfläche als Schaltzentrale, darunter CRM, DMS, E-Mail-Automation,
> AB-Abgleich, Terminmanagement, Controlling, Social-Media-Studio und
> zuschaltbares Jarvis-Sprachmodul mit optionalem Voice Cloning.

## Leitplanken

- **Local-first testbar, server-ready skalierbar.** Jede Komponente läuft
  unter Docker Compose auf einem Entwicklerrechner und ist ohne Refactor auf
  einen Produktivserver portierbar.
- **Board ist UI, nicht Datenmodell.** Karten sind Projektionen von echten
  Prozessobjekten (Aufträge, Lieferantenfälle, Abweichungen, Reklamationen,
  Termine, Posts). Das Board visualisiert, die Domäne entscheidet.
- **Agenten sind Services, keine Prompts.** Jeder Agent ist ein Worker mit
  klaren Inputs, Outputs, Triggern, Idempotenz-Schlüsseln und Audit-Trail.
- **Adapter statt Kopplung.** STT, TTS, LLM, IMAP, Storage sind hinter
  Interfaces. Backend-Wechsel (faster-whisper ↔ whisper.cpp, Chatterbox ↔
  Qwen3-TTS, OpenAI ↔ Anthropic ↔ lokales Modell) sind Konfigurationsfragen.
- **Audit, Rollen, Datenschutz als Grundschicht**, nicht als Nachrüstung.
- **Kein Feature wird produktionsreif ohne manuellen Korrekturpfad.**
  Automatisierung ist Vorschlag, Mensch entscheidet bei Unsicherheit.

## Dokumente

| Datei | Inhalt |
|---|---|
| [`01-requirements.md`](./01-requirements.md) | Phase 1 – Anforderungsanalyse |
| [`02-architecture.md`](./02-architecture.md) | Phase 2 – Zielarchitektur (lokal + Server) |
| [`03-data-model.md`](./03-data-model.md) | Phase 3 – Datenmodell, Relationen, Statusfelder |
| [`04-workflows.md`](./04-workflows.md) | Phase 4 – Operative Flows inkl. Sprachflows |
| [`05-ui-ux.md`](./05-ui-ux.md) | Phase 5 – UI/UX-Konzept der Schaltzentrale |
| [`06-mvp-plan.md`](./06-mvp-plan.md) | Phase 6 – MVP, Priorisierung, Reihenfolge |
| [`08-roadmap.md`](./08-roadmap.md) | Phase 8 – Ausbau, Tests, Sicherheit, Deployment |
| [`adr/`](./adr) | Architecture Decision Records |
