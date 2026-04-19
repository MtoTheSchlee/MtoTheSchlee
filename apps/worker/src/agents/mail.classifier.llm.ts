import type { EmailClassification } from '@kk/shared';
import { EMAIL_CLASSIFICATION } from '@kk/shared';
import type { LlmGateway } from '@kk/llm';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['classification', 'confidence', 'rationale'],
  properties: {
    classification: { type: 'string', enum: [...EMAIL_CLASSIFICATION] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    rationale: { type: 'string' },
  },
} as const;

const SYSTEM = `Du klassifizierst deutsche Geschäfts-E-Mails eines Küchenstudios.
Antworte ausschließlich mit JSON nach Schema. Bewerte konservativ. Wenn
mehrere Labels passen, wähle das fachlich schwerwiegendste (Reklamation >
Rechnung > AB > Angebot > Liefertermin > Kundenanfrage > Werbung).
Unbekannt = 'unknown'. Persönliche Daten sind bereits redigiert.`;

export async function classifyWithLlm(
  gateway: LlmGateway,
  input: { tenantId: string; subject: string; bodyText: string; fromAddr: string },
): Promise<{ classification: EmailClassification; confidence: number; rationale: string } | null> {
  const user = [
    `Absender: ${input.fromAddr}`,
    `Betreff: ${input.subject}`,
    `Text:`,
    input.bodyText.slice(0, 4000),
  ].join('\n');

  const res = await gateway.chat(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    {
      tenantId: input.tenantId,
      purpose: 'mail.classify',
      jsonSchema: SCHEMA as any,
      temperature: 0.1,
      maxTokens: 256,
      cacheKey: `classify:${input.subject}:${input.fromAddr}`,
    },
  );
  if (!res.text && !res.json) return null;
  const raw = res.json ?? tryParseJson(res.text);
  if (!raw) return null;
  const p = raw as { classification?: string; confidence?: number; rationale?: string };
  if (!p.classification || !EMAIL_CLASSIFICATION.includes(p.classification as EmailClassification)) {
    return null;
  }
  return {
    classification: p.classification as EmailClassification,
    confidence: clamp(Number(p.confidence ?? 0), 0, 1),
    rationale: String(p.rationale ?? ''),
  };
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, isFinite(n) ? n : 0));
}
