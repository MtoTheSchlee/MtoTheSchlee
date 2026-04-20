# ADR-003 – Voice Clone nur mit Opt-in, MFA, Watermark

**Status:** accepted · **Datum:** Sprint 0

## Kontext
Stimmklon-Technologie ist missbrauchsrelevant (Identitätsdiebstahl,
Betrug, Ruf-Schaden). Wir brauchen einen belastbaren Rahmen, bevor
das Feature überhaupt aktivierbar ist.

## Entscheidung
1. **Feature-Flag** `FEATURE_VOICE_CLONE` standardmäßig AUS.
2. **Opt-in pro Profil** mit separater Einwilligung als versioniertem
   Dokument (`documents.kind='contract'`), referenziert in
   `voice_profiles.consent_document_id`.
3. **MFA** ist Pflicht für Profilerstellung, -aktivierung und jede
   Clone-basierte Ausgabe.
4. **Akustisches Watermark** auf jeder Clone-Ausgabe, Metadaten
   `tts_jobs.options.watermark=true`.
5. **Zweckbindung:** Nur Zwecke aus `voice_profiles.purpose`
   (`self_tts`, `character_voice`, `experiment`). Export/Versand an
   externe Systeme gesperrt ohne explizite Zusatzfreigabe.
6. **Kill-Switch:** Profil kann jederzeit `revoked` werden; alle
   zugehörigen Audio-Artefakte + Embeddings werden kaskadiert
   gelöscht.
7. **Audit-Pflicht:** Jeder Clone-Call wird mit Nutzer, Grund, Zweck,
   Zeit, Transcript-Hash geloggt.
8. **Schulung:** Nutzer mit `voice_operator`-Rolle müssen
   Kurz-Einweisung quittieren (dokumentenbasiert).

## Konsequenzen
- Höhere Implementierungskomplexität, aber rechtlich und ethisch
  tragbar.
- Ohne MFA/Consent kein Feature sichtbar.
- Audit ermöglicht Nachweisführung.
