import { env } from '../config/env';
import { logger } from './logger';

/**
 * Publishes a job to QStash, which will retry delivery on failure and
 * enforces the deduplication window via `deduplicationId`. Used for the
 * referral reward worker (PKG-034) and any other fire-and-forget internal
 * work that needs retry safety beyond a single in-process call.
 */
export async function publishToQStash(targetUrl: string, body: Record<string, unknown>, deduplicationId?: string): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.QSTASH_TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (deduplicationId) headers['Upstash-Deduplication-Id'] = deduplicationId;

  const response = await fetch(`https://qstash.upstash.io/v2/publish/${targetUrl}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    logger.error({ status: response.status, targetUrl }, 'QStash publish failed');
  }
}
