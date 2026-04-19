# Phase 6 – MVP-Plan

Ziel: **in 6–8 Wochen echte Prozesse bei Küchen Klaus mit KK-OS
spiegeln können.** Priorisierung nach Nutzen × Aufwand. Alles, was
nicht zwingend ist, wandert hinter Feature-Flags.

## 6.1 Must-have (MVP – lokal lauffähig, Pilot)

1. **Monorepo + Docker-Compose-Stack** (Postgres, Redis, MinIO,
   MailHog, STT-Stub, TTS-Stub, API, Web, Worker).
2. **Auth mit Rollen** (owner, planner, purchaser, installer,
   marketer, auditor, agent, voice_operator), Seed-User.
3. **CRM-Grundgerüst:** `customers`, `projects` mit Stage-Machine.
4. **Lieferanten + Bestellungen + Bestellmatrix-Grundansicht.**
5. **DMS-Grundgerüst:** Upload, Klassifikations-Metadaten,
   Versionierung; S3-kompatibel über MinIO.
6. **E-Mail-Ingest + Klassifikation (regex-Basismodell)**, mit
   IMAP-Adapter und MailHog-Adapter für Tests.
7. **AB-Prüf-Pipeline v1:** PDF-Anhang-Extraktion via Sidecar,
   regelbasierter Matcher, Ampel-Logik, `discrepancy_cases`.
8. **Board-Engine:** Boards, Listen, Karten; Karten sind polymorphe
   Prozessobjekte (Projekt, AB, Mail, Abweichung, Termin).
9. **Termine:** manuelles Anlegen, Vorschläge aus Mails
   (TerminAgent), Wochen- und Projekt-Timeline.
10. **Controlling-Minimal:** Anzahl offene Fälle, Durchlaufzeit,
    Abweichungsquote je Lieferant, Reklamationsquote 30 Tage.
11. **Agenten-Runtime:** BullMQ, Orchestrator, MailAgent, ABAgent,
    TerminAgent, ControllingAgent, KundenaktenAgent, ein minimaler
    SocialAgent (Ideen-Entwürfe).
12. **Audit-Log + „Zu prüfen"-Queue**.
13. **Realtime:** Board-Updates via WebSocket.
14. **Sprachmodul MINIMAL:** STT + TTS hinter Adaptern,
    Push-to-Talk-Bar, nur Standard-Stimmen. Voice Clone = Flag AUS.
15. **Basis-UI:** Dashboard, Board, Inbox, Kundenakte, Bestellmatrix,
    Termine, Agenten-Monitoring, Jarvis-Bar.

## 6.2 Should-have (direkt nach MVP)

- **LLM-Extraktion für ABs** als zweite Stufe, Konfidenz-basiert.
- **E-Mail-Antworten** direkt aus der Akte (SMTP-Adapter).
- **Kalender-Sync** (CalDAV, M365).
- **Voice-Command-Router v1** mit 8–12 Intents.
- **Rentabilitätsberechnung** mit importierten Kostendaten.
- **Social-Studio Freigabeworkflow** mit Rollenfreigabe.
- **Mandantenfähigkeit produktiv** (Row-Level-Security einschalten).
- **SSO (OIDC)** für Serverbetrieb.
- **Lieferanten-Templates** für häufige AB-Layouts (Nobilia, Häcker,
  Schüller, Siemens, Neff).

## 6.3 Nice-to-have (später / Roadmap)

- **Voice Clone mit Einwilligungsworkflow** (Feature-Flag, MFA, Watermark).
- **PWA / Offline-Plantafel für Montage**.
- **Volltext + Vector-Suche global** über E-Mails, Dokumente, Karten.
- **KI-Zusammenfassungen pro Projekt für Stand-ups**.
- **Integrationen:** DATEV-Export, CARAT/KPS-Planungsimport,
  WhatsApp-Business-Inbox.
- **Predictive Alerts** (Lieferverzug-Wahrscheinlichkeit pro Lieferant).

## 6.4 Reihenfolge (Sprint-Slices)

1. **Sprint 0 – Fundament (1 Woche):** Monorepo, Compose, Prisma-
   Schema, Auth-Skeleton, Seeds, CI (lint/test/typecheck).
2. **Sprint 1 – CRM + DMS + Board:** CRUD für Kunden/Projekte,
   Upload → MinIO, Board-Engine mit polymorphen Karten.
3. **Sprint 2 – Mail + Ingest + Klassifikation:** IMAP-Adapter, Mail-
   Center UI, regelbasierte Klassifikation, Zuweisung (manuell + Agent).
4. **Sprint 3 – AB-Pipeline:** PDF-Parser-Sidecar, Extract + Match,
   Ampel, Bestellmatrix-View, Discrepancy-UI.
5. **Sprint 4 – Termine + Controlling-Basis:** Kalender-Modul,
   Termin-Vorschläge aus Mails, erste KPIs und Dashboards.
6. **Sprint 5 – Sprachmodul minimal:** STT/TTS-Adapter, WS-Stream,
   Command-Router v0 (hardcoded Intents), Jarvis-Bar.
7. **Sprint 6 – Härtung + Pilot:** Audit-Log vollständig, DLQ-UI,
   Health-Banner, Rollen schärfen, erste Pilotnutzer.

Nach Sprint 6: realer Testbetrieb mit Küchen Klaus, Feedback, dann
Should-haves und Server-Migration.

## 6.5 Akzeptanzkriterien MVP

- E-Mail mit AB trifft ein → innerhalb von < 60s existiert eine
  Board-Karte mit Ampel und verknüpfter Kundenakte.
- „Zu prüfen"-Queue wird zu < 5 % jeder ingest-Welle größer als
  automatisch zuweisbar sein (bei sauberen Stammdaten).
- Ein Planer kann per Voice „zeig mir offene Aufträge Nobilia" sagen
  und bekommt eine korrekt gefilterte Board-Ansicht mit gesprochener
  Zusammenfassung zurück.
- Alle automatischen Aktionen sind im Audit-Log erkennbar rückverfolgbar.
- System lässt sich auf Server migrieren, ohne Code-Änderung, nur via
  Env- und Compose/K8s-Manifest-Anpassung.
