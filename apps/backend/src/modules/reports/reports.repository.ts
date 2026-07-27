import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * PKG-035 — Reports & Analytics Module.
 * Aggregate queries don't fit the row-shaped BaseRepository pattern
 * cleanly, so this repository is hand-rolled rather than extending it —
 * same reasoning as WorkshopRepository in Part 2.
 */
export class ReportsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async revenueSummary(workshopId: string, sinceIso: string) {
    const { data, error } = await this.client
      .from('invoices')
      .select('payment_status')
      .eq('workshop_id', workshopId)
      .gte('created_at', sinceIso);
    if (error) throw error;

    const rows = data ?? [];
    return {
      totalInvoices: rows.length,
      paidCount: rows.filter((r: any) => r.payment_status === 'PAID').length,
      pendingCount: rows.filter((r: any) => r.payment_status === 'PENDING').length,
    };
  }

  async jobCardCounts(workshopId: string, sinceIso: string) {
    const { data, error } = await this.client
      .from('job_cards')
      .select('status')
      .eq('workshop_id', workshopId)
      .gte('created_at', sinceIso);
    if (error) throw error;

    const rows = data ?? [];
    const byStatus: Record<string, number> = {};
    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    }
    return { total: rows.length, byStatus };
  }

  /** "Time saved" is voice-usage count as a proxy — the actual minutes-saved
   * estimate is a product/marketing calculation (voice sessions * avg manual
   * entry time), computed on the mobile client from this raw count, not here. */
  async voiceUsageCount(workshopId: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.client
      .from('voice_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .gte('created_at', sinceIso);
    if (error) throw error;
    return count ?? 0;
  }

  async topCustomers(workshopId: string, limit: number) {
    const { data, error } = await this.client
      .from('job_cards')
      .select('customer_id, customers(name)')
      .eq('workshop_id', workshopId);
    if (error) throw error;

    const counts = new Map<string, { name: string; count: number }>();
    for (const row of (data ?? []) as any[]) {
      const existing = counts.get(row.customer_id);
      const name = row.customers?.name ?? 'Unknown';
      counts.set(row.customer_id, { name, count: (existing?.count ?? 0) + 1 });
    }

    return [...counts.entries()]
      .map(([customerId, v]) => ({ customerId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
