import { PostHog } from 'posthog-node';
import { env } from '../config/env';

/**
 * PKG-048 — PostHog Product Analytics. Server-side capture for events
 * that originate in backend logic (not user taps) — e.g. referral
 * milestone crossed, subscription state changes, invoice generated.
 * Client-side taps are captured directly from the mobile app instead
 * (see apps/mobile/src/config/posthog.ts) — don't duplicate the same
 * event from both sides.
 */
let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!env.POSTHOG_API_KEY) return null; // analytics optional in dev
  if (!client) {
    client = new PostHog(env.POSTHOG_API_KEY, { host: 'https://app.posthog.com' });
  }
  return client;
}

export function captureEvent(workshopId: string, event: string, properties?: Record<string, unknown>) {
  const posthog = getClient();
  if (!posthog) return;
  posthog.capture({ distinctId: workshopId, event, properties });
}

/** Call once at process shutdown so buffered events flush before exit. */
export async function shutdownPostHog() {
  await client?.shutdown();
}
