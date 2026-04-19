import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { AgentDeps } from '../agents/types.js';

/**
 * Optional IMAP ingester. Invoked by a cron inside the worker when a
 * mailbox is configured. Left here as a runnable module; wire it up
 * behind a feature flag once real credentials are available.
 */
export async function ingestMailbox(
  deps: AgentDeps,
  opts: { host: string; port: number; secure: boolean; user: string; pass: string; mailboxId: string; tenantId: string },
): Promise<number> {
  const client = new ImapFlow({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
  });
  let count = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const msg of client.fetch({ seen: false }, { source: true, envelope: true, uid: true })) {
        const parsed = await simpleParser(msg.source as Buffer);
        await deps.api.post('/api/emails/ingest', {
          mailboxId: opts.mailboxId,
          messageId: parsed.messageId ?? `uid-${msg.uid}`,
          fromAddr: parsed.from?.value?.[0]?.address ?? '',
          toAddrs: (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : []).flatMap((t: any) =>
            (t.value ?? []).map((v: any) => v.address),
          ),
          subject: parsed.subject ?? '(kein Betreff)',
          receivedAt: parsed.date,
          bodyText: parsed.text,
          bodyHtml: parsed.html || undefined,
          hasAttachments: (parsed.attachments?.length ?? 0) > 0,
        });
        // Trigger orchestrator pipeline
        await deps.api.post('/api/agents/dispatch', {
          agentKey: 'orchestrator',
          trigger: 'email.ingested',
          triggerRef: parsed.messageId,
          input: { emailId: parsed.messageId },
        });
        await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true });
        count += 1;
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return count;
}
