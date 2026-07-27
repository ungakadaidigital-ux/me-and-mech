import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workshop } from '@me-and-mech/shared';
import { NotFoundError } from '../../lib/errors';
import { rowToCamel } from '../../lib/case-mapping';
import { encryptField, decryptField } from '../../lib/encryption';

const ENCRYPTED_FIELDS = ['gst_number', 'upi_id'] as const;

function decryptRow<T extends Record<string, any>>(row: T | null): T | null {
  if (!row) return row;
  const out = { ...row };
  for (const field of ENCRYPTED_FIELDS) {
    if (out[field]) {
      try {
        out[field] = decryptField(out[field]);
      } catch {
        // Pre-existing plaintext value from before encryption was wired in,
        // or a corrupt value — surface as-is rather than throwing and
        // breaking the whole read. Logged at the call site if needed.
      }
    }
  }
  return out;
}

function encryptPayload<T extends Record<string, any>>(payload: T): T {
  const out = { ...payload };
  for (const field of ENCRYPTED_FIELDS) {
    if (out[field]) out[field] = encryptField(out[field]);
  }
  return out;
}

type WorkshopRow = Workshop; // DB row shape matches the shared domain type 1:1 (snake_case mapping handled at query layer — see note below)

export interface WorkshopInsert {
  phone: string;
  shop_name: string;
  owner_name: string;
  city: string;
  address?: string;
  gst_number?: string;
  invoice_prefix: string;
}

export interface WorkshopUpdate {
  shop_name?: string;
  address?: string;
  gst_number?: string;
  upi_id?: string;
  workshop_size?: 'solo' | 'small' | 'large';
}

/**
 * Workshop has no `workshop_id` self-scoping (it IS the workshop) — so it
 * cannot extend BaseRepository's workshop_id-scoped methods directly.
 * It gets its own small repository instead of forcing an awkward fit.
 */
export class WorkshopRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<WorkshopRow | null> {
    const { data, error } = await this.client.from('workshops').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return rowToCamel<WorkshopRow>(decryptRow(data));
  }

  async findByIdOrThrow(id: string): Promise<WorkshopRow> {
    const row = await this.findById(id);
    if (!row) throw new NotFoundError('Workshop');
    return row;
  }

  async findByPhone(phone: string): Promise<WorkshopRow | null> {
    const { data, error } = await this.client.from('workshops').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return rowToCamel<WorkshopRow>(decryptRow(data));
  }

  async update(id: string, payload: WorkshopUpdate): Promise<WorkshopRow> {
    const { data, error } = await this.client.from('workshops').update(encryptPayload(payload)).eq('id', id).select().single();
    if (error) throw error;
    return rowToCamel<WorkshopRow>(decryptRow(data)) as WorkshopRow;
  }
}
