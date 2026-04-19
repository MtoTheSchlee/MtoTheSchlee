# Phase 5 – UI/UX-Konzept

## 5.1 Gestaltungsleitlinien

- **Informationsdichte vor Weißraum-Ästhetik.** Das System ist
  Werkzeug, nicht Landing Page. Dichte Tabellen, kompakte Karten,
  sichtbare Status.
- **Eine Seite, ein klarer Primärjob.** Alles andere ist Kontext.
- **Zustand ist überall sichtbar.** Ampel, Fortschritt, Owner, Deadline.
- **Tastatur vor Maus.** Command Palette (`Ctrl+K`) überall.
- **Voice Bar** ist immer erreichbar (Footer), aber nie aufdringlich.
- **Dark Mode Standard** für Dauerbetrieb, Light Mode optional.

## 5.2 Navigationsstruktur

```
┌── Dashboard (KPI, „Zu prüfen", Mein Tag)
├── Board
│    ├── Operations (Standard)
│    ├── ABs (AB-Prüfung)
│    ├── Mail-Triage
│    ├── Reklamationen
│    └── Social
├── Inbox  (Mail-Center)
├── Kunden
│    └── Kundenakte (Projekt-Tab-Unterseiten)
├── Lieferanten  (inkl. Bestellmatrix je Projekt)
├── Termine  (Kalender, Team, Timeline)
├── Controlling  (Dashboards, Rentabilität)
├── Social-Studio
├── Agenten  (Runs, DLQ, Health)
├── Sprache  (Jarvis-Konsole, Voice-Profile)
└── Einstellungen  (Mailboxen, Rollen, Integrationen, Flags)
```

## 5.3 Kern-Screens

### Dashboard
Grid aus Widgets: „Zu prüfen" (Anzahl, schneller Einstieg),
„Kritische Abweichungen (rot)", „Termine heute/morgen",
„Mail-Eingang (24h)", „Offene Aufträge nach Stage",
„Lieferanten-Alarmliste (on-time %)", „Agent-Health".

### Board-Ansicht
- Listen horizontal scrollbar, Karten kompakt mit Badges
  (Ampel, Priorität, Owner, Deadline, Kartenart-Icon).
- Swimlanes nach Owner/Team umschaltbar.
- Filter-Bar: Kunde, Lieferant, Projekt-Code, Mail-Thread, Datum.
- Live-Indikator (WS): andere Nutzer, die gerade Karten bewegen.
- Quick-Peek: Hover/Space öffnet seitlich Detailtab, Esc schließt.
- Karten zeigen Prozessobjekt-spezifische Felder:
  - `discrepancy`: Typ, Delta, betroffene Position, Lieferant.
  - `email`: Absender, Betreff, Klassifikation, Projekt-Bezug.
  - `appointment`: Kind, Start, Kunde, Monteur.

### Inbox / Mail-Center
Drei-Spalten: Filter (Klassifikation/Status) • Liste • Detail.
- Detail zeigt: Threading, Anhänge (mit DMS-Link),
  Extraktions-Ergebnis (strukturiert), Zuweisungs-Vorschläge, Reply.
- Ein-Klick-Aktion: „Als AB prüfen", „Zur Akte", „Termin vorschlagen".

### Kundenakte
Tabs: Übersicht, Dokumente, E-Mails, Bestellungen/ABs, Termine,
Abweichungen, Social, Verlauf (Audit).
- Kopfleiste: Kunde, Projekt-Stage, Planer, Gesamt-Ampel,
  zeitlicher Fortschritt.

### Bestellmatrix (Lieferanten pro Projekt)
Tabelle: Positionen × Status (bestellt/bestätigt/geliefert/offen)
mit Ampeln und Deltas. Zellenhover zeigt AB-Referenz.

### Termine
Drei Modi: Wochen-Team-Ansicht, auftragsbezogene Timeline,
Montage-Plantafel (Ressource = Monteur, Fahrzeug, Werkzeug).

### Controlling
Dashboards: Durchlaufzeit je Stage, Abweichungsquote je Lieferant,
Reklamationsquote, Rentabilität je Projekt (wenn Kostendaten vorhanden),
Engpass-Heatmap pro Woche/Team.

### Social-Studio
Kanban-Board mit Spalten Idee → Draft → Review → Approved → Scheduled →
Published. Karten zeigen Copy-Preview, Medien-Thumbnail, Kanal.

### Agenten-Monitoring
Tabelle laufender/abgeschlossener Runs, DLQ, Replay-Button,
Zeitreihen für Durchsatz, Fehlerquote, Latenz.

### Sprach-Konsole (Jarvis)
- Große Wellenform + Live-Transcript.
- Rechts: „Letzte Befehle", „Aktives Voice-Profil", „Ausgabe-Gerät".
- Einstellungen: Sprache, Backend (Whisper-Variante), Voice (Standard
  oder freigeschaltetes Profil), Filter (PII-Redactor an/aus).
- Voice-Profile-Manager mit Einwilligungs-Status.

## 5.4 Interaktionsmuster

- **Command Palette:** `Ctrl+K` öffnet, fuzzy über Kunden, Projekte,
  Board-Karten, Befehle („neuer Termin", „AB hochladen", „Jarvis: …").
- **Drag & Drop:** nur im Board und Social-Studio, mit optimistischem
  Update und Rollback bei Konflikt.
- **Inline-Edits** für Titel, Priorität, Deadline.
- **Keyboard-Shortcuts:** `J/K` Navigation, `Enter` Detail, `.` Quick-
  Menu, `!` Priorität, `#` Labels, `@` Zuweisung, `Space` Peek.

## 5.5 Feedback und Fehler

- Jede destruktive Aktion hat Undo-Toast (5 Sekunden).
- Optimistische Updates rollen bei Server-Fehler sichtbar zurück.
- Agent-Banner oben: „MailAgent pausiert – IMAP-Fehler", kein stiller
  Ausfall.

## 5.6 Barrierefreiheit

- Tastatur-Vollbedienung.
- Kontrast AA, Fokus-Styles konsistent.
- Live-Regions für Agent-Ereignisse und Sprachausgabe-Transkript
  (damit Screenreader TTS-Pfad kennen).
