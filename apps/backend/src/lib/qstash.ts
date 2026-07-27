import { Client } from '@upstash/qstash';
import { env } from '../config/env';

const qstash = new Client({ token: env.QSTASH_TOKEN });

/**
 * Enqueues an internal job via QStash rather than calling the handler
 * in-process. This is what makes reward crediting, engagement triggers,
 * etc. genuinely async and retryable — QStash retries on failure and
 * respects the deduplicationId for exactly-the-kind-of-idempotency the
 * locked spec calls for (Layer 2 of the WhatsApp dedup, and the general
 * "webhook returns 200 immediately, worker does the real work" pattern).
 */
export async function enqueueInternalJob(path: string, body: Record<string, unknown>, opts?: { deduplicationId?: string; delaySeconds?: number }) {
  await qstash.publishJSON({
    url: `${env.API_BASE_URL}${path}`,
    body,
    deduplicationId: opts?.deduplicationId,
    delay: opts?.delaySeconds,
  });
}
