import type { SupabaseClient } from '@supabase/supabase-js';
import type { Invoice, PaymentStatus } from '@me-and-mech/shared';
import { BaseRepository } from './base.repository';
import { AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { rowToCamel } from '../../lib/case-mapping';

export interface InvoiceInsert {
  workshop_id: string;
  job_card_id: string;
  invoice_number: string;
  payment_status?: PaymentStatus;
}

export interface InvoiceUpdate {
  pdf_url?: string;
  whatsapp_sent?: boolean;
  sent_at?: string;
  payment_status?: PaymentStatus;
  paid_at?: string;
}

export interface InvoiceLineItemInsert {
  invoice_id: string;
  description: string;
  quantity: number;
  rate: string;
}

export class InvoiceRepository extends BaseRepository<Invoice, InvoiceInsert, InvoiceUpdate> {
  constructor(client: SupabaseClient) {
    super(client, 'invoices');
  }

  async findByJobCard(jobCardId: string): Promise<Invoice | null> {
    const { data, error } = await this.client
      .from('invoices')
      .select('*')
      .eq('job_card_id', jobCardId)
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<Invoice>(data);
  }

  /**
   * Marking PAID is the one operation that must never be blocked by
   * subscription state (locked trial/read-only rule) — this method has no
   * subscription-guard dependency by design. The guard is applied at the
   * route/middleware layer for *other* mutations, not here.
   */
  async markPaid(id: string, workshopId: string): Promise<Invoice> {
    const { data, error } = await this.client
      .from('invoices')
      .update({ payment_status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workshop_id', workshopId)
      .select()
      .single();
    if (error) {
      throw new AppError(ErrorCode.INTERNAL, `Failed to mark invoice paid: ${error.message}`, 500);
    }
    return rowToCamel<Invoice>(data) as Invoice;
  }

  async addLineItem(item: InvoiceLineItemInsert) {
    const { data, error } = await this.client.from('invoice_line_items').insert(item).select().single();
    if (error) throw error; // DB trigger (019) also blocks this if invoice is already PAID
    return rowToCamel(data);
  }
}
