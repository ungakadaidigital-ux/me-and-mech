import type { SupabaseClient } from '@supabase/supabase-js';
import type { VoiceSession } from '@me-and-mech/shared';
import { rowToCamel } from '../../lib/case-mapping';

export interface VoiceSessionInsert {
  workshop_id: string;
  job_card_id?: string;
  audio_storage_url?: string;
  transcript?: string;
  confidence?: number;
  engine: 'sarvam_saarika_v2' | 'expo_speech_totext';
}

export class VoiceSessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(payload: VoiceSessionInsert): Promise<VoiceSession> {
    const { data, error } = await this.client.from('voice_sessions').insert(payload).select().single();
    if (error) throw error;
    return rowToCamel<VoiceSession>(data) as VoiceSession;
  }
}
