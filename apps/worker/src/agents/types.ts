import type { Logger } from 'pino';
import type IORedis from 'ioredis';
import type { ApiClient } from '../api-client.js';

export interface AgentDeps {
  readonly connection: IORedis;
  readonly api: ApiClient;
  readonly log: Logger;
}

export interface AgentJobInput<T = unknown> {
  runId?: string;
  tenantId: string;
  input: T;
}
