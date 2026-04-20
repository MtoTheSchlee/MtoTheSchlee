const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function tenantHeader(): Record<string, string> {
  const tid = process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  return { 'x-tenant-id': tid };
}

/**
 * Auth + tenant headers for every call. JWT comes from the login flow
 * (sessionStorage). For local dev without a real login, the SSR/service
 * role header acts as an escape hatch - accepted by AuthGuard because
 * AUTH_ALLOW_SERVICE_HEADER defaults to on in local mode.
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = tenantHeader();
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('kkos.token');
    if (token) headers.authorization = `Bearer ${token}`;
  }
  // Service role is only honored by AuthGuard when enabled locally; it
  // gives un-authenticated browser sessions enough scope to click through
  // the demo. Remove in production.
  if (process.env.NEXT_PUBLIC_DEV_SERVICE_ROLE) {
    headers['x-service-role'] = process.env.NEXT_PUBLIC_DEV_SERVICE_ROLE;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} ${res.status}`);
  return res.json();
}
