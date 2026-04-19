import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Sidebar } from '@/components/sidebar';
import { VoiceBar } from '@/components/voice-bar';

export const metadata: Metadata = {
  title: 'KK-OS – Küchen Klaus',
  description: 'Operative Schaltzentrale für Küchen Klaus',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen flex">
        <Providers>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-6 overflow-y-auto">{children}</main>
            <VoiceBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
