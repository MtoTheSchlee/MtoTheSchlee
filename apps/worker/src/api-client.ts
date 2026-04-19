import { request } from 'undici';

/**
 * Minimal API client. We talk back to the NestJS API instead of sharing
 * the Prisma client to keep the process boundary clean. This also lets us
 * swap out the worker runtime (Python, Rust) later without DB coupling.
 */
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tenantId: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return { 'content-type': 'application/json', 'x-tenant-id': this.tenantId, ...extra };
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await request(new URL(path, this.baseUrl), {
      method: 'POST',
      body: JSON.stringify(body),
      headers: this.headers(),
    });
    if (res.statusCode >= 400) throw new Error(`POST ${path} ${res.statusCode}`);
    return (await res.body.json()) as T;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await request(new URL(path, this.baseUrl), {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: this.headers(),
    });
    if (res.statusCode >= 400) throw new Error(`PATCH ${path} ${res.statusCode}`);
    return (await res.body.json()) as T;
  }

  async get<T>(path: string): Promise<T> {
    const res = await request(new URL(path, this.baseUrl), { headers: this.headers() });
    if (res.statusCode >= 400) throw new Error(`GET ${path} ${res.statusCode}`);
    return (await res.body.json()) as T;
  }

  // Helpers for typed agent ↔ API hand-offs.
  markRun(runId: string, state: string, patch?: { output?: any; error?: any }) {
    return this.patch(`/api/agents/runs/${runId}/state`, { state, ...patch });
  }
  event(runId: string, kind: string, payload?: unknown) {
    return this.post(`/api/agents/runs/${runId}/events`, { kind, payload });
  }
}
