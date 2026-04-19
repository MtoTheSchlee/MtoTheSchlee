import { z } from 'zod';
import {
  AB_STATUS,
  AGENT_KEYS,
  BOARD_OBJECT_KIND,
  DISCREPANCY_STATE,
  DISCREPANCY_TYPE,
  EMAIL_CLASSIFICATION,
  SPEECH_INTENTS,
} from './enums.js';

// Events used between API, Worker and Web (via WS/SSE).
// Keep this file side-effect free; it is imported by browser bundles.

export const EmailIngestedEvent = z.object({
  type: z.literal('email.ingested'),
  tenantId: z.string().uuid(),
  emailId: z.string().uuid(),
  mailboxId: z.string().uuid(),
  receivedAt: z.string().datetime(),
});

export const EmailClassifiedEvent = z.object({
  type: z.literal('email.classified'),
  tenantId: z.string().uuid(),
  emailId: z.string().uuid(),
  classification: z.enum(EMAIL_CLASSIFICATION),
  confidence: z.number().min(0).max(1),
});

export const AbMatchedEvent = z.object({
  type: z.literal('ab.matched'),
  tenantId: z.string().uuid(),
  orderConfirmationId: z.string().uuid(),
  orderId: z.string().uuid().nullable(),
  status: z.enum(AB_STATUS),
  ampel: z.enum(['green', 'yellow', 'red']),
  discrepancyCount: z.number().int().min(0),
});

export const DiscrepancyChangedEvent = z.object({
  type: z.literal('discrepancy.changed'),
  tenantId: z.string().uuid(),
  discrepancyId: z.string().uuid(),
  state: z.enum(DISCREPANCY_STATE),
  discrepancyType: z.enum(DISCREPANCY_TYPE),
});

export const BoardCardChangedEvent = z.object({
  type: z.literal('board.card.changed'),
  tenantId: z.string().uuid(),
  boardId: z.string().uuid(),
  cardId: z.string().uuid(),
  objectKind: z.enum(BOARD_OBJECT_KIND),
  change: z.enum(['created', 'moved', 'updated', 'deleted']),
});

export const AgentRunEvent = z.object({
  type: z.literal('agent.run'),
  tenantId: z.string().uuid(),
  runId: z.string().uuid(),
  agentKey: z.enum(AGENT_KEYS),
  state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
});

export const SpeechCommandEvent = z.object({
  type: z.literal('speech.command'),
  tenantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  intent: z.enum(SPEECH_INTENTS),
  params: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
});

export const KKEvent = z.discriminatedUnion('type', [
  EmailIngestedEvent,
  EmailClassifiedEvent,
  AbMatchedEvent,
  DiscrepancyChangedEvent,
  BoardCardChangedEvent,
  AgentRunEvent,
  SpeechCommandEvent,
]);
export type KKEvent = z.infer<typeof KKEvent>;
