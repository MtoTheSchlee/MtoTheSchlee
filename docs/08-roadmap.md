# Phase 8 – Roadmap

## Status-Übersicht (Stand iter7)

| Bereich | Stand |
|---|---|
| Monorepo + Tooling | ✅ pnpm, tsc, Nest, Next, Vitest, Playwright, GitHub Actions |
| Datenmodell | ✅ Alle 25+ Prisma-Entities + zwei Migrationen (init + optional_rls) |
| API | ✅ 18 Module, REST + WS + SSE, JWT-Auth, RBAC-Guards |
| Agenten | ✅ 8 Agenten (Mail, AB, Kundenakte, Termin, Controlling, Social, Speech, Orchestrator) |
| AB-Pipeline | ✅ E-Mail → PDF-Anhang → pdfjs → Parser → Matcher → Ampel (automatisch) |
| AB-Upload UI | ✅ Drag&Drop auf `/ab`, Triage-Hinweis bei unresolved |
| Board | ✅ Drag&Drop mit optimistischem Update, polymorphe Prozess-Karten |
| Controlling | ✅ SVG-Charts (Stacked Bars, Sparkline), Scorecards, Cycle-Time |
| Suche / Cmd+K | ✅ Globale Suche + Command Palette |
| Audio-Capture | ✅ MediaRecorder im Voice-Bar, POST /speech/transcribe |
| Voice Command Router | ✅ Regex + Layered-LLM-Adapter |
| Voice Clone (ADR-003) | ✅ API + Service-Facade hinter Feature-Flag, MFA-Pflicht |
| LLM Gateway | ✅ Anthropic, OpenAI, Noop-Fallback, PII-Redactor, Budget-Guard |
| Row-Level-Security | ✅ Optionale Migration + TenantMiddleware (`ENABLE_RLS=true`) |
| Storage | ✅ MinIO + Filesystem-Fallback |
| Tests | ✅ 55 Tests (16 API, 6 Worker, 12 Shared, 5 LLM, 6 Speech, 8 E2E) |
| Screenshots | ✅ 14 Seiten dokumentiert unter `docs/screenshots/` |

## Kurzfristig (nächste Pilot-Vorbereitung)

- **Echte IMAP-Postfächer verdrahten**: das Skelett in `apps/worker/src/imap/imap-ingest.ts` braucht einen Cron und Mailbox-Credentials in der DB. Test gegen ein Vorproduktions-Postfach von Küchen Klaus.
- **LLM-Extraktion für heterogene AB-Layouts**: zweite Parser-Stufe, die `parseAbBasic` ergänzt, wenn der Regex-Parser 0 Positionen liefert. Schema-validierte JSON-Antwort, Fallback auf „Zu prüfen".
- **Speech-Sidecars auf GPU-Node**: faster-whisper + Chatterbox-Multilingual produktiv hochziehen (`infra/stt-service`, `infra/tts-service`).
- **PII-Redactor-Testsuite**: deutsche Namenskorpusse, IBAN-Varianten, Telefonnummer-Formate.

## Mittelfristig (Multi-Mandant-Produktion)

- **SSO**: OIDC-Adapter für Auth (Keycloak, Auth0 oder Azure AD). Refresh-Token-Rotation.
- **MFA**: TOTP per `@kk/shared` + WebAuthn zweiter Faktor für `voice_operator` und `owner`.
- **Kalender-Sync**: CalDAV + Microsoft Graph für Termine. Push-Events aus dem Worker.
- **E-Mail-Antworten direkt aus der Akte**: SMTP-Adapter mit Signatur-Handling und Anhang-Uploads.
- **Predictive Alerts**: Lieferverzug-Wahrscheinlichkeit je Lieferant (logistische Regression auf deviation_rate × reliability_score).
- **Full-Text + Vector Search**: `tsvector` auf E-Mails/Dokumenten, `pgvector` für semantische AB-Duplikate.

## Querschnittsthemen

### Tests
- Zusätzliche E2E-Suites: Voice-Recording (Mock-Mic), AB-Upload-Dropzone, Rollen-Matrix.
- Contract-Tests für STT/TTS/LLM-Adapter.
- Load-Test (k6) gegen API + WS mit realistischen Queue-Lasten.

### Sicherheit
- RLS produktiv aktivieren (`scripts/enable-rls.sql` ausführen + API auf `kkos_app`-Rolle umstellen).
- Pen-Test vor Serverbetrieb-Start.
- Regelmäßige Dependency-Scans (osv-scanner, trivy).
- Secret-Scanning (gitleaks) in CI, pre-commit.
- Voice-Clone-Richtlinie, signierte Einwilligung, Watermark, MFA (bereits im Code; Prozess-Dokumentation noch offen).

### Datenschutz
- DSGVO-Lösch- und Exportfunktionen pro Kunde und pro Nutzer.
- Retention-Policies konfigurierbar (Mails, Rohaudio, Transkripte).
- Datenkataloge: welches Feld hält welche PII.
- Auftragsverarbeitungsverträge mit externen Providern (LLM, STT/TTS, Storage, Mail-Gateway).

### Deployment
- GitOps: eine Branch = eine Umgebung (dev, stage, prod).
- Blue/Green oder Canary für API/Worker.
- DB-Migrationen strikt rückwärtskompatibel, Pre-/Post-Deploy-Steps getrennt.
- Backups täglich + PITR; quartalsweise Restore-Übung.

### Automatisierung (später)
- Auto-Replies mit menschlicher Freigabeschleife.
- Auto-Bestellungs-Vorschläge aus Bedarfen.
- Lieferanten-Scorecards als Feedback-Loop in Bestellplanung.
