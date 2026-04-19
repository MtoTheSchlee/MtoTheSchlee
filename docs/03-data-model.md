# Phase 3 – Datenmodell

Alle Tabellen besitzen implizit `tenant_id UUID`, `created_at`,
`updated_at`, `created_by`, `updated_by`. Weiche Löschung über
`deleted_at` wo sinnvoll. Statusfelder sind Enums, nicht Strings.

## 3.1 Identität & Rechte

### `users`
`id UUID pk, tenant_id, email UNIQUE(tenant), name, password_hash,
status {active, invited, disabled}, mfa_enabled BOOL, last_login_at`

### `roles`
`id UUID pk, tenant_id, key {owner, planner, purchaser, installer,
marketer, auditor, agent, voice_operator}, name, permissions JSONB`

### `user_roles`
`user_id FK, role_id FK, scope JSONB` (z. B. Filiale, Projektbereich).

### `audit_log`
`id, tenant_id, actor_user_id, actor_agent_run_id, action, entity,
entity_id, before JSONB, after JSONB, ip, user_agent, created_at,
hash_prev, hash_self` (optionale Hash-Chain für Tamper-Evidence).

## 3.2 CRM

### `customers`
`id, tenant_id, type {private, b2b}, salutation, first_name, last_name,
company, email, phone, address JSONB, notes, consent JSONB,
source {web, walkin, referral, campaign, other}`

### `projects`
`id, tenant_id, customer_id FK, code (z. B. KK-2026-0142), title,
stage {lead, planning, quoted, won, in_execution, delivered, completed,
lost, on_hold}, budget NUMERIC, planner_user_id FK, started_at,
completed_at`

Index: `(tenant_id, code)` unique.

## 3.3 Lieferanten & Bestellungen

### `suppliers`
`id, tenant_id, name, type {cabinets, appliances, countertops, sinks,
accessories, service, other}, contact JSONB, delivery_terms, notes,
reliability_score NUMERIC`

### `orders`  (interne Bestellungen an Lieferanten)
`id, tenant_id, project_id FK, supplier_id FK, order_number,
status {draft, sent, confirmed, partially_confirmed, delivered,
partially_delivered, invoiced, closed, cancelled},
ordered_at, expected_delivery_at, total_net NUMERIC`

### `order_items`
`id, order_id FK, position_no, sku, description, qty NUMERIC,
unit, unit_price_net NUMERIC, requested_delivery_at,
attributes JSONB`

### `order_confirmations`  (AB vom Lieferanten)
`id, tenant_id, project_id FK, supplier_id FK, order_id FK nullable,
email_id FK nullable, document_id FK, ab_number, confirmed_at,
status {received, parsed, matched, deviating, accepted, rejected},
parsed_payload JSONB, ampel {green, yellow, red}`

### `order_confirmation_items`
`id, order_confirmation_id FK, position_no, sku, description, qty,
unit, unit_price_net, confirmed_delivery_at, attributes JSONB`

### `discrepancy_cases`
`id, tenant_id, project_id FK, order_id FK, order_confirmation_id FK,
type {missing_position, wrong_qty, price_delta, date_delta,
unexpected_position, ambiguous}, severity {low, medium, high},
state {open, in_progress, waiting_supplier, resolved, wontfix},
assignee_user_id FK, diff JSONB, resolution_note, resolved_at`

## 3.4 DMS / Kundenordner

### `documents`
`id, tenant_id, project_id FK nullable, customer_id FK nullable,
supplier_id FK nullable, kind {quote, order, ab, invoice,
delivery_note, installation_sheet, photo, contract, note, other},
title, mime, size_bytes, storage_key, checksum, version INT,
parent_document_id FK nullable, source {upload, email, agent, scan},
classification_confidence NUMERIC, to_review BOOL, metadata JSONB`

### `document_tags`
`document_id FK, tag TEXT` (pg_trgm-Index).

## 3.5 E-Mail

### `mailboxes`
`id, tenant_id, display_name, address, protocol {imap, ews, gmail},
host, port, username, password_enc, folders JSONB,
state {active, disabled, error}, last_sync_at, last_error`

### `emails`
`id, tenant_id, mailbox_id FK, message_id UNIQUE(tenant,mailbox),
thread_id, in_reply_to, direction {in, out}, from_addr, to_addrs[],
cc_addrs[], bcc_addrs[], subject, received_at, sent_at,
classification {ab, quote, invoice, delivery_date, complaint,
customer_request, promo, unknown}, classification_confidence,
project_id FK nullable, customer_id FK nullable, supplier_id FK nullable,
status {new, triaged, assigned, answered, archived}, raw_headers JSONB,
body_text, body_html, body_redacted, has_attachments BOOL`

Indexe: `(tenant_id, classification, received_at DESC)`,
`(tenant_id, project_id)`, FTS-Index über `body_text + subject`.

### `email_attachments`
`id, email_id FK, filename, mime, size_bytes, storage_key,
document_id FK nullable` (Link zur DMS-Version nach Ablage).

### `email_events`
`id, email_id FK, kind {ingested, classified, extracted, assigned,
commented, replied, archived}, payload JSONB, actor_user_id,
actor_agent_run_id, at`

## 3.6 Board

### `boards`
`id, tenant_id, key {operations, orders, mail, social, complaints, …},
name, description, visibility {tenant, team, private}, owner_user_id,
config JSONB`

### `board_lists`
`id, board_id FK, name, order_index, wip_limit INT nullable, rules JSONB`

### `board_cards`
`id, board_id FK, list_id FK, title, summary, priority {low, med, high,
urgent}, due_at, assignee_user_id, watchers[] FK, labels[] TEXT,
status {open, blocked, in_progress, done, cancelled},
object_kind {generic, project, order, order_confirmation,
discrepancy, email, appointment, complaint, social_post, voice_session},
object_id UUID nullable, order_index, metadata JSONB`

Constraint: `object_kind + object_id` eindeutig pro Board falls gesetzt
(eine Karte pro Prozessobjekt pro Board).

### `board_card_events`
`id, card_id FK, kind, payload JSONB, actor, at` (Historie).

### `tasks`  (generische Teilaufgaben unter Karten/Projekten)
`id, tenant_id, parent_kind {card, project, order, discrepancy},
parent_id, title, assignee_user_id, due_at,
state {open, in_progress, blocked, done}, priority, notes`

## 3.7 Termine

### `appointments`
`id, tenant_id, project_id FK nullable, customer_id FK nullable,
kind {consultation, measurement, delivery, installation, rework,
complaint_visit, internal}, title, start_at, end_at,
location JSONB, participants JSONB (user_ids, externals),
state {proposed, confirmed, moved, cancelled, done}, source {manual,
email_suggestion, agent}, external_calendar_ref TEXT`

### `appointment_suggestions`  (aus Mail-Agent)
`id, tenant_id, source_email_id FK, proposed JSONB, score NUMERIC,
state {new, accepted, rejected, merged}, accepted_appointment_id FK`

## 3.8 Social Media

### `social_posts`
`id, tenant_id, project_id FK nullable, channel {instagram, facebook,
linkedin, tiktok, web}, content_text, media_refs[] document_id,
scheduled_at, state {idea, draft, review, approved, scheduled,
published, archived}, approvals JSONB, metrics JSONB,
created_by_agent_run_id FK nullable`

## 3.9 Controlling / KPIs

### `profitability_metrics`
`id, tenant_id, project_id FK, revenue_net NUMERIC, cost_goods NUMERIC,
cost_labor NUMERIC, cost_other NUMERIC, margin_net NUMERIC,
computed_at, source_run_id FK`

### `metrics_daily`
`date, tenant_id, key, value NUMERIC, dims JSONB`
(abgeleitet, z. B. `ab_deviation_rate`, `cycle_time_days`,
`open_cases`, `complaint_rate_30d`).

## 3.10 Agenten

### `agents`  (Registry)
`id, tenant_id nullable (global), key {mail, ab, kundenakte, termin,
controlling, social, speech, orchestrator}, display_name, version,
enabled BOOL, config JSONB`

### `agent_runs`
`id, tenant_id, agent_key, trigger {event, cron, manual, voice},
trigger_ref, input JSONB, output JSONB, state {queued, running,
succeeded, failed, cancelled}, started_at, finished_at,
error JSONB, parent_run_id FK, idempotency_key UNIQUE(tenant, key)`

### `agent_events`
`id, run_id FK, kind {log, progress, decision, tool_call, tool_result},
payload JSONB, at`

## 3.11 Sprachmodul

### `voice_profiles`  (für Stimmklon)
`id, tenant_id, user_id FK, name, consent_document_id FK,
consent_signed_at, samples_storage_keys[], embedding_key,
state {draft, pending_consent, active, suspended, revoked},
purpose {self_tts, character_voice, experiment},
watermarking BOOL DEFAULT true, kms_key_id, created_by, revoked_at`

### `speech_sessions`
`id, tenant_id, user_id FK, started_at, ended_at,
mode {push_to_talk, continuous, dictation}, locale, device_info JSONB,
consent_snapshot JSONB`

### `stt_jobs`
`id, tenant_id, session_id FK nullable, audio_storage_key, mime,
duration_ms, model, language, state {queued, running, done, failed},
partials_count, final_text, final_confidence, cost_ms, error`

### `transcripts`
`id, tenant_id, session_id FK, stt_job_id FK, text, segments JSONB
(word timestamps), speaker_labels JSONB nullable, created_at`

### `tts_jobs`
`id, tenant_id, session_id FK nullable, text, voice_profile_id FK
nullable, model, audio_storage_key, mime, duration_ms,
state {queued, running, done, failed}, options JSONB, cost_ms, error`

### `speech_commands`
`id, tenant_id, session_id FK, source_transcript_id FK,
intent {open_board, find_email, create_appointment, read_discrepancies,
draft_social_post, summarize_project, unknown}, params JSONB,
dispatched_run_id FK nullable, state {new, routed, completed, failed},
confidence NUMERIC`

## 3.12 Suchschicht

- FTS (`tsvector`) auf `emails.body_text + subject`, `customers`,
  `projects`, `documents.title + metadata`, `board_cards.title + summary`.
- `pgvector`-Index auf `documents.embedding`, `emails.embedding`,
  `projects.embedding` für semantische Suche.

## 3.13 Relationen (verdichtet)

```
customers 1─* projects 1─* orders 1─* order_items
                              │
                              └─* order_confirmations 1─* order_confirmation_items
                                          │
                                          └─* discrepancy_cases
projects 1─* documents       projects 1─* appointments
emails *─1 mailboxes         emails 1─* email_attachments
emails *─1 projects (optional)    emails *─1 customers/suppliers
boards 1─* board_lists 1─* board_cards ─polymorph─> object_kind/object_id
agents 1─* agent_runs 1─* agent_events
speech_sessions 1─* stt_jobs, tts_jobs, transcripts, speech_commands
```

## 3.14 Statusmatrizen (Auszug)

**Order-Statusfluss**
```
draft → sent → confirmed | partially_confirmed → delivered |
partially_delivered → invoiced → closed
                          └─► cancelled (jederzeit mit Grund)
```

**AB-Ampel-Logik**
```
keine Abweichung                       → green
gleiche Pos., Preis ±ε, Datum ±2d      → yellow
fehlende Pos. / Mengenabweichung / neue Pos. / Preisdelta > ε / Datum > 2d → red
```

`ε` und Toleranztage sind pro Lieferant konfigurierbar (`suppliers.config`).

**Discrepancy-State**
```
open → in_progress → (waiting_supplier) → resolved | wontfix
```

**Voice-Profile**
```
draft → pending_consent → active → (suspended) → revoked
```
