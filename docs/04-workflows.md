# Phase 4 – Workflow-Design

Jeder Flow ist als Event-Sequenz beschrieben. Jeder Schritt hat einen
verantwortlichen Service/Agent, einen Input, einen Output und ein
Fehlerverhalten.

## 4.1 Flow A – E-Mail-Ingest bis Board-Karte

```
┌────────────┐    imap.push    ┌──────────────┐
│  Postfach  │ ───────────────▶│ MailIngest   │
└────────────┘                 │   Service    │
                               └──────┬───────┘
       idempotent via message-id      │ emails.insert
                                      ▼
                               ┌──────────────┐  event:email.ingested
                               │  emails      │────────────────────────┐
                               └──────┬───────┘                        │
                                      │                                ▼
                      ┌───────────────┴───────────┐          ┌──────────────────┐
                      │  MailAgent.classify       │          │ Orchestrator     │
                      │  (regex + LLM)            │          │ entscheidet next │
                      └───────────────┬───────────┘          └──────┬───────────┘
                                      │                             │
                                      │ classification + confidence │
                                      ▼                             ▼
                      ┌───────────────────────────┐   ┌────────────────────────┐
                      │  Klassifikation = AB      │   │  Klassifikation ≠ AB   │
                      │  → ABExtractAgent          │   │  → Zuweisungs-Flow      │
                      └───────────────┬───────────┘   └──────────┬─────────────┘
                                      ▼                          ▼
                             (siehe Flow B)              (Flow C – Assign)
```

- **Fehlerfälle:** IMAP-Fehler → Retry mit Backoff, Mailbox-Health-
  Banner. LLM-Timeout → Regex-Fallback, niedrigere Confidence, Mail
  landet in „Triage".
- **Audit:** jeder Schritt schreibt `email_events` + `agent_events`.

## 4.2 Flow B – AB-Abgleich

```
email(kind=ab) ──▶ ABExtractAgent
  1. holt PDF-Anhang, OCR falls nötig (pdfplumber → tika → LLM-Fallback)
  2. parst Positionen in kanonisches Schema (siehe 3.3 order_confirmation_items)
  3. speichert order_confirmations + parsed_payload (source=truth)

ABExtractAgent ──▶ ABMatchAgent
  1. identifiziert Kandidaten-Order anhand ab_number, project_code,
     Lieferant, Betreff, Positionen, Historie
  2. verknüpft order_confirmation.order_id (falls Score hoch)
  3. diffs pro Position: Menge, Preis, Datum, fehlend, unerwartet, ambiguous
  4. erzeugt discrepancy_cases + setzt ampel
  5. erzeugt/aktualisiert board_card (object_kind=order_confirmation)
  6. bei ampel=red: Notification an assignee (Einkauf), +Push in Voice-Digest
```

- **Abweichungsstufen** parametrisierbar pro Lieferant (`suppliers.config`).
- **Nichts wird still akzeptiert.** „Grün" ist eine bewusste Entscheidung
  durch Einkauf (Button „AB akzeptieren") → Order-Status wird angepasst.

## 4.3 Flow C – Zuweisung E-Mail → Akte

```
MailAgent.assign:
  1. Sucht Kundenreferenz (Volltext + Fuzzy über customers, projects,
     E-Mail-Historie, Betreff-Muster).
  2. Score > 0.85 → automatische Zuweisung.
  3. Score zwischen 0.5–0.85 → Vorschlag, landet in „Zu prüfen"-Liste.
  4. Score < 0.5 → manuelle Triage.
Kundenakten-Agent legt Anhänge als documents ab (kind aus Klassifikator)
und markiert `to_review=true` wenn Zuordnung unsicher.
```

## 4.4 Flow D – Termin-Erkennung

```
MailAgent sieht Muster (Lieferung am …, Aufmaß am …) →
  TerminAgent baut appointment_suggestion →
  Planer sieht Vorschlag im Board + Kalender-Spalte „Vorschläge" →
  Accept ⇒ appointments.insert, External-Calendar-Sync optional →
  Reject ⇒ suggestion.state=rejected, Reason ins Audit
```

Niemals automatisch in fremde Kalender schreiben. Zustimmung zwingend.

## 4.5 Flow E – Controlling

```
CronController (alle 15 min):
  - recompute metrics_daily (rollup aus orders, discrepancies, emails,
    appointments, projects)
  - profitability_metrics aus abgeschlossenen Aufträgen
  - Health-Metriken pro Lieferant (on_time %, deviation_rate)
Output: Dashboards lesen aus metrics_daily; Diagramme serverseitig
gerendert für Voice-Zusammenfassungen.
```

## 4.6 Flow F – Social-Media-Ideen

```
Trigger: project.stage == completed ∨ event.kind==store_event
SocialAgent:
  1. zieht Projektdetails, Fotos, Stilrichtung, Region.
  2. erzeugt Content-Entwürfe je Kanal (Copy + Visual-Hinweise).
  3. legt social_posts (state=idea/draft), board_card (object_kind=social_post).
  4. Freigabeschritt: Marketing bearbeitet → owner approves → scheduled.
```

## 4.7 Flow G – Sprach-Session (Jarvis)

```
UI → WebSocket /speech
  1. Client fordert session an (consent snapshot wird gelesen).
  2. Browser streamt PCM-Frames (binary WS) an API.
  3. API proxyt zu STT-Service (faster-whisper), liefert partials zurück.
  4. STT-Final → transcripts.insert → VoiceCommandRouter.
  5. Router klassifiziert Intent (LLM + Regex + slot-filling).
  6. Dispatch an Fach-Agent (z. B. „offene Abweichungen" → ABReportAgent).
  7. Agent liefert strukturierte Antwort (Text + Karten-Refs + Kontext).
  8. TTSJob wird (falls aktiv) gestartet: Chatterbox Multilingual;
     optional voice_profile_id (nur bei active voice_profile + MFA).
  9. Audio-Chunks streamen über WS; UI spielt sie ab.
 10. Jeder Schritt schreibt speech_commands, stt_jobs, tts_jobs,
     agent_runs, audit_log. Session-Ende: Retention-Policy greift.
```

**Missbrauchsschutz Voice Clone**
- Einwilligungsdokument wird als `documents` mit Version gespeichert,
  `voice_profiles.consent_document_id` verweist darauf.
- TTS mit Clone markiert Output akustisch (unhörbares Watermark) und
  setzt Metadaten `metadata.watermark=true`.
- Alle Clone-Nutzungen werden im Audit-Log mit Zweck protokolliert.
- MFA-Check bei Profil-Erstellung, bei jeder Nutzung ist `tenant_id +
  user_id` im Token zwingend.

## 4.8 Flow H – Manuelle Korrektur

- Jeder automatische Schritt ist reversibel. Discrepancy schließen mit
  Begründung, Zuweisung umschreiben, Termin-Vorschlag ablehnen, Mail
  reklassifizieren. Alle Änderungen ins Audit-Log.
- „Zu prüfen"-Queue ist Pflicht-Triage jeden Morgen, Dashboard-Widget
  zählt offene Items.

## 4.9 Flow I – Fehler und Degradation

- Agent-Run fällt → landet in DLQ, Board zeigt rote Karte „System-
  vorfall", Operator kann replay anstoßen.
- LLM-Gateway offline → Agenten laufen in deterministischem Modus,
  Konfidenzen fallen, Items landen in „Zu prüfen".
- IMAP offline → Alarm-Banner + Retry-Job; keine stille Löschung.
- STT/TTS offline → UI deaktiviert Voice, Tasteneingabe bleibt.
