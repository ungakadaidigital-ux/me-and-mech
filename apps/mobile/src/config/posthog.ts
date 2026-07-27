import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

let client: PostHog | null = null;

/** Client-side taps and screen views — server-side business events are
 * captured from the backend (lib/posthog.ts), not duplicated here. */
export async function initPostHog(): Promise<PostHog | null> {
  const apiKey = (Constants.expoConfig?.extra as any)?.posthogApiKey;
  if (!apiKey) return null;

  client = await PostHog.initAsync(apiKey, { host: 'https://app.posthog.com' });
  return client;
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  client?.capture(event, properties);
}

export function identifyWorkshop(workshopId: string) {
  client?.identify(workshopId);
}
