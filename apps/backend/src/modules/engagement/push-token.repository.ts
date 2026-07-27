import type { SupabaseClient } from '@supabase/supabase-js';
import { rowsToCamel } from '../../lib/case-mapping';

export class PushTokenRepository {
  constructor(private readonly client: SupabaseClient) {}

  async register(workshopId: string, fcmToken: string): Promise<void> {
    // Upsert on fcm_token (unique) — same device re-registering just
    // updates last_seen_at rather than erroring or duplicating.
    const { error } = await this.client
      .from('push_tokens')
      .upsert({ workshop_id: workshopId, fcm_token: fcmToken, last_seen_at: new Date().toISOString() }, { onConflict: 'fcm_token' });
    if (error) throw error;
  }

  async findByWorkshop(workshopId: string) {
    const { data, error } = await this.client.from('push_tokens').select('*').eq('workshop_id', workshopId);
    if (error) throw error;
    return rowsToCamel<{ fcmToken: string }>(data);
  }
}
