import { randomUUID } from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { getDb } from './db';
import { apiRequest } from '../api/client';
import { queryClient } from '../api/queryClient';

export type EntityType = 'customer' | 'vehicle' | 'job_card' | 'job_card_item';
export type Operation = 'create' | 'update';

interface QueuedMutation {
  id: string;
  entityType: EntityType;
  operation: Operation;
  payload: { path: string; method: 'POST' | 'PUT' | 'PATCH'; body: unknown };
  createdAt: string;
  attempts: number;
}

/**
 * PKG-040 — enqueues a mutation for later replay. The CALLER is
 * responsible for optimistically writing to the local cache tables
 * (cache_job_cards etc.) so the UI reflects the change immediately —
 * this module only owns the "does the server know about this yet" queue.
 */
export function enqueueMutation(entityType: EntityType, path: string, method: 'POST' | 'PUT' | 'PATCH', body: unknown): string {
  const db = getDb();
  const id = randomUUID();
  db.runSync(
    `INSERT INTO sync_queue (id, entity_type, operation, payload, created_at, attempts) VALUES (?, ?, ?, ?, ?, 0)`,
    [id, entityType, method === 'POST' ? 'create' : 'update', JSON.stringify({ path, method, body }), new Date().toISOString()],
  );
  return id;
}

export function getPendingCount(): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM sync_queue`);
  return row?.count ?? 0;
}

let syncing = false;

/**
 * Replays the queue in FIFO order (created_at ASC) — order matters, e.g.
 * a job card must reach the server before an item-add mutation targeting
 * it can succeed. Stops and preserves remaining queue entries on the
 * first failure that looks like "still offline" (network error), but
 * drops (with a logged last_error) mutations that fail with a definitive
 * 4xx from the server — retrying a 400 forever would never succeed and
 * would block everything queued behind it.
 */
export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (syncing) return { processed: 0, failed: 0 };
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { processed: 0, failed: 0 };

  syncing = true;
  let processed = 0;
  let failed = 0;

  try {
    const db = getDb();
    const rows = db.getAllSync<{ id: string; entity_type: EntityType; payload: string; attempts: number }>(
      `SELECT id, entity_type, payload, attempts FROM sync_queue ORDER BY created_at ASC`,
    );

    for (const row of rows) {
      const { path, method, body } = JSON.parse(row.payload) as QueuedMutation['payload'];
      try {
        await apiRequest(path, { method, body });
        db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [row.id]);
        processed++;
      } catch (err) {
        const message = (err as Error).message ?? 'unknown error';
        const isClientError = /^4\d\d/.test(String((err as any).statusCode ?? ''));

        if (isClientError) {
          // Won't succeed on retry — drop it, but keep the error visible
          // for support/debugging rather than silently discarding.
          db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [row.id]);
          failed++;
        } else {
          db.runSync(`UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`, [message, row.id]);
          break; // stop here, likely still offline or server is down — preserve order for the rest
        }
      }
    }

    if (processed > 0) {
      // Cached lists may now be stale relative to server-assigned IDs —
      // invalidate broadly rather than trying to patch individual entries.
      queryClient.invalidateQueries();
    }
  } finally {
    syncing = false;
  }

  return { processed, failed };
}

/** Call once at app startup — auto-syncs whenever connectivity is restored. */
export function startAutoSync() {
  processSyncQueue();
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) processSyncQueue();
  });
}
