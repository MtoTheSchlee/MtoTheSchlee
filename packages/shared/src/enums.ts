// Canonical enums shared by API, Worker and Web.
// Keep in sync with prisma/schema.prisma enums.

export const ROLES = [
  'owner',
  'planner',
  'purchaser',
  'installer',
  'marketer',
  'auditor',
  'agent',
  'voice_operator',
] as const;
export type Role = (typeof ROLES)[number];

export const PROJECT_STAGES = [
  'lead',
  'planning',
  'quoted',
  'won',
  'in_execution',
  'delivered',
  'completed',
  'lost',
  'on_hold',
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const ORDER_STATUS = [
  'draft',
  'sent',
  'confirmed',
  'partially_confirmed',
  'delivered',
  'partially_delivered',
  'invoiced',
  'closed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const AB_STATUS = [
  'received',
  'parsed',
  'matched',
  'deviating',
  'accepted',
  'rejected',
] as const;
export type AbStatus = (typeof AB_STATUS)[number];

export const DISCREPANCY_TYPE = [
  'missing_position',
  'wrong_qty',
  'price_delta',
  'date_delta',
  'unexpected_position',
  'ambiguous',
] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPE)[number];

export const DISCREPANCY_STATE = [
  'open',
  'in_progress',
  'waiting_supplier',
  'resolved',
  'wontfix',
] as const;
export type DiscrepancyState = (typeof DISCREPANCY_STATE)[number];

export const EMAIL_CLASSIFICATION = [
  'ab',
  'quote',
  'invoice',
  'delivery_date',
  'complaint',
  'customer_request',
  'promo',
  'unknown',
] as const;
export type EmailClassification = (typeof EMAIL_CLASSIFICATION)[number];

export const BOARD_OBJECT_KIND = [
  'generic',
  'project',
  'order',
  'order_confirmation',
  'discrepancy',
  'email',
  'appointment',
  'complaint',
  'social_post',
  'voice_session',
] as const;
export type BoardObjectKind = (typeof BOARD_OBJECT_KIND)[number];

export const APPOINTMENT_KIND = [
  'consultation',
  'measurement',
  'delivery',
  'installation',
  'rework',
  'complaint_visit',
  'internal',
] as const;
export type AppointmentKind = (typeof APPOINTMENT_KIND)[number];

export const AGENT_KEYS = [
  'mail',
  'ab',
  'kundenakte',
  'termin',
  'controlling',
  'social',
  'speech',
  'orchestrator',
] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

export const SPEECH_INTENTS = [
  'open_board',
  'find_email',
  'create_appointment',
  'read_discrepancies',
  'draft_social_post',
  'summarize_project',
  'unknown',
] as const;
export type SpeechIntent = (typeof SPEECH_INTENTS)[number];

export const VOICE_PROFILE_STATE = [
  'draft',
  'pending_consent',
  'active',
  'suspended',
  'revoked',
] as const;
export type VoiceProfileState = (typeof VOICE_PROFILE_STATE)[number];
