import type { SupabaseClient } from '@supabase/supabase-js';
import type { JobCard, JobCardItem, JobCardStatus } from '@me-and-mech/shared';
import { BaseRepository } from './base.repository';
import { rowToCamel, rowsToCamel } from '../../lib/case-mapping';

export interface JobCardInsert {
  workshop_id: string;
  customer_id: string;
  vehicle_id: string;
  job_date?: string;
  job_type: string;
  km?: number;
  notes?: string;
  status?: JobCardStatus;
}

export interface JobCardUpdate {
  status?: JobCardStatus;
  km?: number;
  notes?: string;
}

export interface JobCardItemInsert {
  job_card_id: string;
  item_type: 'labour' | 'part';
  description: string;
  quantity: number;
  rate: string;
}

export class JobCardRepository extends BaseRepository<JobCard, JobCardInsert, JobCardUpdate> {
  constructor(client: SupabaseClient) {
    super(client, 'job_cards');
  }

  /** Job card count in a rolling window — used by the referral success
   * trigger (PKG-034) to check the "3 job cards within 7 days" condition. */
  async countSince(workshopId: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.client
      .from('job_cards')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .gte('created_at', sinceIso);
    if (error) throw error;
    return count ?? 0;
  }

  async addItem(item: JobCardItemInsert): Promise<JobCardItem> {
    const { data, error } = await this.client.from('job_card_items').insert(item).select().single();
    if (error) throw error;
    return rowToCamel<JobCardItem>(data) as JobCardItem;
  }

  async findItems(jobCardId: string): Promise<JobCardItem[]> {
    const { data, error } = await this.client.from('job_card_items').select('*').eq('job_card_id', jobCardId);
    if (error) throw error;
    return rowsToCamel<JobCardItem>(data);
  }

  async removeItem(itemId: string): Promise<void> {
    const { error } = await this.client.from('job_card_items').delete().eq('id', itemId);
    if (error) throw error;
  }
}
