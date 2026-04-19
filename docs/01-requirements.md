# Phase 1 – Anforderungsanalyse

## 1.1 Geschäftskontext

Küchen Klaus ist ein mittelständisches Küchenstudio. Der operative Alltag
besteht aus einer Kette eng verzahnter Prozesse, die heute über getrennte
Werkzeuge laufen (E-Mail, Excel, Ordnerstrukturen, Papier, Kalender). Das
verursacht Medienbrüche, unentdeckte Abweichungen in Auftragsbestätigungen,
verspätete Reaktionen auf Lieferantenfehler und intransparente KPIs.

KK-OS bündelt diese Prozesse in einer Schaltzentrale. Ziel ist **weniger
Werkzeuge, mehr Überblick, messbar kürzere Durchlaufzeiten, weniger stille
Fehler**.

## 1.2 Kernmodule

| Modul | Zweck |
|---|---|
| Board / Kommandozentrale | Prozessvisualisierung, Triage, Eskalation |
| Kunden & Projekte (CRM) | Kundenstamm, Auftragsakten, Historie |
| Lieferanten & Bestellungen | Einkaufs- und Statusmatrix pro Projekt |
| Auftragsbestätigungen (AB) | Extraktion, Abgleich, Abweichungs-Tickets |
| DMS / Kundenordner | Dokumente, Anhänge, Versionen, Ablageregeln |
| E-Mail-Center | IMAP/SMTP-Bridge, Klassifikation, Zuweisung |
| Termine | Beratung, Aufmaß, Lieferung, Montage, Reklamation |
| Controlling | KPIs, Durchlaufzeit, Abweichungsquote, Rentabilität |
| Social-Media-Studio | Ideen, Redaktionsplanung, Freigaben |
| Agenten-Schicht | Mail, AB, Akte, Termin, Controlling, Social, Speech, Orchestrator |
| Sprachmodul (Jarvis) | STT, TTS, optional Voice Clone, Command Routing |
| Auth, Rollen, Audit | Rechte, Zugriffsprotokolle, DSGVO |

## 1.3 Nutzerrollen (initial)

- **Inhaber / GF:** alles, Controlling, Freigaben.
- **Verkauf / Planer:** Kundenprojekte, Termine, Angebote.
- **Einkauf / Disposition:** Bestellungen, ABs, Lieferanten.
- **Montage / Service:** Termine, Nacharbeit, Reklamationen.
- **Marketing:** Social-Media-Studio, Freigabe durch GF.
- **Agent / System:** technischer User für automatisierte Vorgänge.
- **Auditor (read-only):** Zugriff auf Logs ohne Schreibrechte.

## 1.4 Funktionale Anforderungen (verdichtet)

- Karten sind Prozessobjekte (Auftrag, Abweichung, Mail-Vorgang, Reklamation,
  Termin, Post). WIP-Limits pro Liste. Swimlanes nach Verantwortlichkeit.
- E-Mail-Ingest aus mehreren Postfächern, IMAP-push wenn möglich, sonst Poll.
  Klassifikator mit Labels (AB, Angebot, Rechnung, Liefertermin, Reklamation,
  Kundenfrage, Spam/Werbung, Unklar). Relevante Felder extrahieren.
- AB-Abgleich auf Positionsebene gegen interne Bestellung. Ampel-Logik.
  Jede Abweichung ist ein eigener bearbeitbarer Fall.
- Kundenakte automatisch befüllt; unsichere Zuordnung in „Zu prüfen".
- Bestell- und Statusmatrix pro Auftrag: bestellt / bestätigt / offen / im
  Versand / geliefert / montiert / reklamiert.
- Termine mit Kunden, Mitarbeitern, Ressourcen; Vorschläge aus E-Mails.
- Controlling-Dashboards mit Durchlaufzeit, Abweichungsquote je Lieferant,
  offene Fälle, Reklamationsquote, Rentabilität je Auftrag (soweit Daten).
- Social-Media-Studio mit Ideengenerierung aus abgeschlossenen Projekten.
- Sprachmodul mit STT/TTS, optional Voice Clone, Command Routing zu Agenten,
  jederzeit deaktivierbar.
- Vollständiger Audit-Trail: wer, wann, was, aus welchem Agent-Run.

## 1.5 Nicht-funktionale Anforderungen

- **Lokaler Pilotbetrieb:** `docker compose up` startet API, Worker, DB,
  Queue, Objektspeicher, Mailcatcher, optional STT/TTS-Dummies. Keine
  externen Abhängigkeiten außer optional SMTP/IMAP.
- **Serverbetrieb:** horizontale Skalierung API + Worker, Postgres mit
  Backup, Object-Storage (S3-kompatibel), TLS, SSO-ready, Realtime via
  WebSockets oder SSE.
- **Realtime** für Board-Updates, Mail-Eingang, Abweichungs-Alarme,
  Sprach-Session.
- **Erweiterbarkeit:** neue Agenten, neue Kartentypen, neue Dokumenttypen
  ohne Schema-Breakage (JSONB-Payloads + typisierte Views).
- **Datenschutz / DSGVO:** Löschkonzept pro Kunde, Zweckbindung je Feld,
  Einwilligung für Voice-Profile, Verschlüsselung at-rest und in-transit.
- **Beobachtbarkeit:** strukturierte Logs, Metriken, Trace-IDs pro
  Agent-Run und Speech-Session.

## 1.6 Abhängigkeiten

- IMAP/SMTP-Zugang zu den Postfächern von Küchen Klaus.
- Reale Beispiele für ABs (Nobilia, Häcker, Schüller, Bauknecht, Siemens,
  Neff, Blanco, Blum) – ohne diese keine belastbare Extraktions-Baseline.
- Bestelldaten: Import aus vorhandenem Warenwirtschafts-/Planungssystem
  (z. B. CARAT, KPS, Compusoft) – Adapter nötig.
- Optional Kalender-Sync (CalDAV / Google / Microsoft 365).
- Optional: Cloud-LLM-API für starke Extraktion (sonst lokales Modell).

## 1.7 Risiken und technische Herausforderungen

| Risiko | Wirkung | Abfederung |
|---|---|---|
| ABs kommen als PDF mit heterogenem Layout | Extraktion fehlerhaft | Hybrid-Pipeline: pdfplumber/Tika + layoutbasiert + LLM-Fallback, pro Lieferant Templates lernen |
| Unscharfe Kundenzuordnung aus Mail-Inhalt | falsche Ablage, DSGVO-Risiko | Confidence-Schwelle, „Zu prüfen"-Queue, nie autom. über Schwellwert-X hinweg |
| IMAP-Drift (Ordner-Umzüge, Filter) | verlorene Mails | idempotenter Ingest per Message-ID + UID + History, Wiederaufnahme-Cursor |
| Falsche Termin-Extraktion aus Mails | fehlerhafte Kalender-Einträge | nur Vorschlag, nie Hard-Create; Bestätigung durch Mensch |
| Voice Clone Missbrauch | Identitätsmissbrauch, Haftung | Opt-in, Watermarking der Ausgabe, signierte Einwilligungsquittung, Zugriff nur mit MFA, Profile sind mandantengebunden |
| Latenz im Sprachmodus | unbrauchbare UX | STT-Streaming, TTS-Chunks, Warmpool, lokaler Pfad bevorzugt |
| Datenschutz bei Cloud-LLM | Kundendaten exfiltriert | PII-Redactor vor jedem externen Call, lokaler Modus als Default für sensible Felder |
| Kopplung an ein LLM/STT/TTS | Lock-in | strenge Adapter, Config-driven Selection, Contract-Tests |
| Mehrmandantigkeit (später) | Daten-Leak zwischen Filialen | `tenant_id` konsequent, Row-Level-Security in Postgres |
| Offline-Fall Montage | keine Datenupdates | lokale PWA-Cache-Schicht + Resync-Queue (Roadmap) |

## 1.8 Explizite Annahmen

- (A1) Ein Mandant zum Start („Küchen Klaus"), Multi-Tenant-Schema aber
  vorbereitet (`tenant_id` überall).
- (A2) Deutsch als Primärsprache für UI, Mail-Klassifikation, STT/TTS.
- (A3) Postgres als führende OLTP-Datenbank; keine separate Dokumenten-DB.
- (A4) S3-kompatibler Object-Storage (lokal MinIO, produktiv beliebig).
- (A5) Kein Echtzeit-ERP-Ersatz; bestehende Warenwirtschaft bleibt Quelle
  der Wahrheit für Bestellungen, KK-OS ist Überlagerung + Automation.
- (A6) STT Default `faster-whisper` (lokal), TTS Default Chatterbox
  Multilingual; beide austauschbar.
- (A7) LLM-Calls laufen über einen internen `llm-gateway` mit Provider-
  Selector, PII-Redactor, Caching und Budget-Guard.
- (A8) Voice Clone ist standardmäßig **AUS**, hinter Feature-Flag, mit
  Einwilligungsworkflow.

## 1.9 Datenschutz und Sicherheit (Highlights)

- **Mail-Inhalte** gelten als personenbezogen. Speicherung verschlüsselt,
  Zugriffe geloggt, Retention konfigurierbar pro Mandant.
- **Voice-Profile** sind besonders schützenswert. Eigene Tabelle mit
  getrennten Keys (Envelope Encryption), explizite Einwilligung als
  signiertes Artefakt, Löschung kaskadiert inkl. abgeleiteter Embeddings.
- **Audit-Log** ist append-only, Hash-Chain optional für Tamper-Evidence.
- **Rechtesystem** ist rollenbasiert mit Fall-weisen Freigaben (z. B.
  Marketing sieht keine Lieferantenpreise).
- **Exportfähigkeit** pro Kunde (DSGVO Art. 20) und Löschkonzept (Art. 17).
