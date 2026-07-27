import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * PKG-032 — Firebase Cloud Messaging, via the official firebase-admin SDK
 * (not a hand-rolled HTTP call — Google deprecated the legacy server-key
 * HTTP API this would otherwise use). Service account JSON is base64-decoded
 * from FIREBASE_SERVICE_ACCOUNT_JSON at first use.
 */
let initialized = false;

function ensureInitialized() {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }
  const decoded = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(decoded);
  initializeApp({ credential: cert(serviceAccount) });
  initialized = true;
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; messageId?: string }> {
  try {
    ensureInitialized();
    const messageId = await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
    });
    return { success: true, messageId };
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Stale/uninstalled-app tokens are expected in steady state — log at
    // warn, not error, and let the caller decide whether to prune the token.
    if (code === 'messaging/registration-token-not-registered') {
      logger.warn('Push failed — token no longer registered (app uninstalled or token rotated)');
    } else {
      logger.error({ err: (err as Error).message, code }, 'Push notification failed');
    }
    return { success: false };
  }
}
