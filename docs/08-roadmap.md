# Phase 8 – Roadmap

## Q1 – Pilot (lokal)
- Sprints 0–6 (siehe MVP-Plan).
- Erste reale Postfächer anbinden, 5–10 ABs pro Tag verarbeiten.
- Discrepancy-Statistiken erheben, Regeln pro Lieferant kalibrieren.

## Q2 – Serverbetrieb
- Infrastruktur: Postgres managed, Redis managed, Object Storage extern.
- SSO (OIDC) + MFA verpflichtend.
- Row-Level-Security in Postgres aktiv.
- Observability-Stack (Loki/Tempo/Grafana oder managed).
- Load-Test API + Worker, realistische Queue-Last.

## Q3 – Intelligenz-Ausbau
- LLM-Extraktion für heterogene ABs mit Lieferanten-Templates.
- Volltext + Vector-Suche über alle Entitäten.
- Voice-Command-Router v2 mit Slot-Filling, mehr Intents, Kontext-
  Gedächtnis pro Session.
- Voice Clone hinter Einwilligungs-Workflow aktivieren.
- Predictive Alerts (Lieferverzug, Eskalationsrisiko).

## Q4 – Skalierung
- Multi-Mandant produktiv (mehrere Filialen/Partner).
- Offline-PWA für Montageteams.
- DATEV / Warenwirtschaft Connector produktiv.
- Business-Intelligence auf ClickHouse/DuckDB.
- SLA-Management, Runbooks, Chaos-Tests.

## Querschnittsthemen

### Tests
- Unit (Vitest) – Domain-Logik, Parser, Matcher.
- Contract-Tests für Adapter (IMAP, STT, TTS, LLM).
- E2E (Playwright) – Golden-Paths: Mail→Board, AB-Pipeline, Voice-Flow.
- Load-Test (k6) – API + WS.
- Agent-Regressions-Suite mit gelabelten ABs und E-Mails.

### Sicherheit
- Pen-Test vor Serverbetrieb-Start.
- Bug-Bounty intern für Rollen-/RLS-Tests.
- Regelmäßige Abhängigkeits-Scans (osv-scanner, trivy).
- Secret-Scanning (gitleaks) in CI, pre-commit.
- Voice-Clone-Richtlinie, signierte Einwilligung, Watermark, MFA.

### Datenschutz
- DSGVO-Lösch- und Exportfunktionen pro Kunde und pro Nutzer.
- Retention-Policies konfigurierbar (Mails, Rohaudio, Transkripte).
- Datenkataloge: welches Feld hält welche PII.
- Auftragsverarbeitungsverträge mit externen Providern (LLM, STT/TTS,
  Storage, Mail-Gateway).

### Deployment
- GitOps: eine Branch = eine Umgebung (dev, stage, prod).
- Blue/Green oder Canary für API/Worker.
- DB-Migrationen strikt rückwärtskompatibel, Pre-/Post-Deploy-Steps
  getrennt.
- Backups täglich + PITR; quartalsweise Restore-Übung.

### Automatisierung (später)
- Auto-Replies mit menschlicher Freigabeschleife.
- Auto-Bestellungs-Vorschläge aus Bedarfen.
- Lieferanten-Scorecards als Feedback-Loop in Bestellplanung.
