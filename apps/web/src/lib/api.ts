const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function tenantHeader() {
  const tid = process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  return { 'x-tenant-id': tid };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: tenantHeader(), cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...tenantHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...tenantHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} ${res.status}`);
  return res.json();
}
