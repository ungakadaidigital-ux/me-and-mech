import type { SupabaseClient } from '@supabase/supabase-js';
import type { Customer } from '@me-and-mech/shared';
import { BaseRepository, type FindOptions, type PaginatedResult } from './base.repository';
import { rowToCamel, rowsToCamel } from '../../lib/case-mapping';

export interface CustomerInsert {
  workshop_id: string;
  name: string;
  phone: string;
  city?: string;
  notes?: string;
}

export interface CustomerUpdate {
  name?: string;
  phone?: string;
  city?: string;
  notes?: string;
}

export class CustomerRepository extends BaseRepository<Customer, CustomerInsert, CustomerUpdate> {
  constructor(client: SupabaseClient) {
    super(client, 'customers');
  }

  async findByPhone(workshopId: string, phone: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('phone', phone)
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<Customer>(data);
  }

  async search(workshopId: string, query: string, options: FindOptions = {}): Promise<PaginatedResult<Customer>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.client
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('workshop_id', workshopId)
      .ilike('name', `%${query}%`)
      .range(from, to);

    if (error) throw error;
    return { items: rowsToCamel<Customer>(data), total: count ?? 0, page, limit };
  }
}
