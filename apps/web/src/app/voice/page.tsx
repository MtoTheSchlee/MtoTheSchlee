'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export default function VoiceConsolePage() {
  const health = useQuery({ queryKey: ['speech.health'], queryFn: () => apiGet<any>('/api/speech/health') });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Jarvis-Konsole</h1>
      <section className="surface p-4">
        <h2 className="font-medium mb-2">Backend-Health</h2>
        <pre className="text-xs text-muted overflow-x-auto">{JSON.stringify(health.data, null, 2)}</pre>
      </section>
      <section className="surface p-4">
        <h2 className="font-medium mb-2">Hinweise</h2>
        <ul className="list-disc pl-6 text-sm muted-text space-y-1">
          <li>Voice Bar unten im Fenster. Beispiel-Befehle: „zeig mir offene Aufträge", „was fehlt bei Auftrag KK-2026-0142".</li>
          <li>Voice Cloning ist per Feature-Flag <code>FEATURE_VOICE_CLONE</code> standardmäßig AUS.</li>
          <li>Aktivierung nur mit signierter Einwilligung und MFA (ADR-003).</li>
        </ul>
      </section>
    </div>
  );
}
