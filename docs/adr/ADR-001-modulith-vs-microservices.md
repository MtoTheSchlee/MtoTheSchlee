# ADR-001 – Modulith statt Microservices für KK-OS

**Status:** accepted · **Datum:** Sprint 0

## Kontext
Das System besteht aus vielen Bounded Contexts (CRM, DMS, Mail, AB,
Termine, Agenten, Sprache). Die Versuchung, jeden Kontext als
eigenen Service zu betreiben, ist groß, erzeugt aber bei einer
Team-Größe < 10 Personen unverhältnismäßigen Betriebsaufwand
(Service-Discovery, Schema-Kopplung, verteilte Transaktionen,
Observability-Mehrfachaufwand).

## Entscheidung
Wir betreiben KK-OS als **Modulith**: ein API-Prozess (NestJS, klare
Modul-Grenzen), ein Worker-Prozess (BullMQ), dazu Sidecars nur für
klar isolierte Fähigkeiten (STT, TTS, LLM-Gateway, Tika, pdfplumber).
Grenzen sind im Code über Modul-/Package-Linien streng, nicht über
Netzwerk.

## Konsequenzen
- Einfaches Deployment, schnelle lokale Entwicklung.
- Kopplungen sichtbar durch Imports; Architektur-Linting möglich.
- Horizontale Skalierung über API- und Worker-Replikate.
- Migration in echte Services später möglich, weil Modulgrenzen
  gepflegt werden und Events/DTOs typisiert sind.
