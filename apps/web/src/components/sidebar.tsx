'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Dashboard' },
  { href: '/board/operations', label: 'Board' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/customers', label: 'Kunden' },
  { href: '/suppliers', label: 'Lieferanten' },
  { href: '/ab', label: 'AB-Prüfung' },
  { href: '/appointments', label: 'Termine' },
  { href: '/controlling', label: 'Controlling' },
  { href: '/social', label: 'Social-Studio' },
  { href: '/agents', label: 'Agenten' },
  { href: '/voice', label: 'Jarvis' },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 border-r border-border bg-surface h-screen sticky top-0 flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <div className="text-sm text-muted">Küchen Klaus</div>
        <div className="text-lg font-semibold">KK-OS</div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {NAV.map((n) => {
          const active = path === n.href || (n.href !== '/' && path?.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`block px-3 py-2 rounded text-sm ${
                active ? 'bg-bg text-text' : 'text-muted hover:text-text hover:bg-bg'
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 text-xs text-muted border-t border-border">
        v0.1 • lokal
      </div>
    </aside>
  );
}
