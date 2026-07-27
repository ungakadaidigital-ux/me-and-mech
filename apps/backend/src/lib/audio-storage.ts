import { getAdminClient } from '../db/admin-client';
import { AppError } from './errors';
import { ErrorCode } from '@me-and-mech/shared';

const BUCKET = 'voice-sessions';

/**
 * PKG-030 — audio is uploaded to Supabase Storage under
 * voice-sessions/{workshopId}/{sessionId}.{ext}, and MUST be deleted
 * within 24 hours. This service only handles upload; deletion is a
 * scheduled job (see the pg_cron note in migration 020) that lists and
 * removes objects older than 24h — implemented as a QStash-scheduled call
 * to a small cleanup endpoint, since Storage deletion needs the Storage
 * API, not raw SQL.
 *
 * Bucket setup note: the `voice-sessions` bucket itself (private, with a
 * lifecycle policy) must be created once via the Supabase dashboard or
 * `supabase storage` CLI — bucket creation isn't expressed as a SQL
 * migration in this codebase, since it's an infra/dashboard-level object,
 * not a table.
 */
export async function uploadTempAudio(workshopId: string, sessionId: string, buffer: Buffer, extension: string): Promise<string> {
  const path = `${workshopId}/${sessionId}.${extension}`;
  const supabase = getAdminClient();

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: extension === 'wav' ? 'audio/wav' : 'audio/m4a',
    upsert: false,
  });

  if (error) {
    throw new AppError(ErrorCode.INTERNAL, `Audio upload failed: ${error.message}`, 500);
  }

  return path;
}

export async function deleteAudio(path: string): Promise<void> {
  const supabase = getAdminClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
