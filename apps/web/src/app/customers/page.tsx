'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

export default function CustomersPage() {
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => apiGet<any[]>('/api/customers') });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kunden</h1>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Firma</th>
              <th className="text-left p-2">E-Mail</th>
              <th className="text-left p-2">Typ</th>
            </tr>
          </thead>
          <tbody>
            {(customers.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-bg">
                <td className="p-2">
                  <Link href={`/customers/${c.id}`} className="hover:text-accent">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-2">{c.company}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
