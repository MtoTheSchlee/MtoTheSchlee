# ADR-002 – Austauschbare Speech-Backends

**Status:** accepted · **Datum:** Sprint 0

## Kontext
STT- und TTS-Landschaft bewegt sich schnell (faster-whisper,
whisper.cpp, Qwen3-TTS, Chatterbox Multilingual, kommerzielle APIs).
Eine harte Kopplung an ein Backend erzeugt Lock-in und verhindert
Optimierung zwischen Latenz, Qualität, Kosten, Datenschutz.

## Entscheidung
Wir definieren Interfaces (`SpeechToTextService`,
`TextToSpeechService`, `VoiceCloneService`) mit stabilen Contracts
und einer Adapter-Registry. Default-Adapter: faster-whisper (STT),
Chatterbox Multilingual (TTS). Jede Adapter-Implementierung spricht
HTTP/WebSocket gegen einen containerisierten Service. Modell- und
Adapter-Wahl ist Konfigurationsfrage (`SPEECH_STT_BACKEND`,
`SPEECH_TTS_BACKEND`).

## Konsequenzen
- Backend-Wechsel ohne Code-Änderung im Kern.
- Contract-Tests sichern Kompatibilität.
- Leistungs-/Kosten-Benchmarks einfach möglich.
- Pflicht: Telemetrie (Latenz, Fehler) pro Adapter normiert.
