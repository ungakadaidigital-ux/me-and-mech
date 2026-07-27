import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import { rowToCamel } from '../../lib/case-mapping';

export interface InventoryItem {
  id: string;
  workshopId: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice?: string;
  sellingPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryInsert {
  workshop_id: string;
  name: string;
  quantity?: number;
  low_stock_threshold?: number;
  cost_price?: string;
  selling_price?: string;
}

export interface InventoryUpdate {
  name?: string;
  low_stock_threshold?: number;
  cost_price?: string;
  selling_price?: string;
}

export class InventoryRepository extends BaseRepository<InventoryItem, InventoryInsert, InventoryUpdate> {
  constructor(client: SupabaseClient) {
    super(client, 'inventory');
  }

  async findLowStock(workshopId: string): Promise<InventoryItem[]> {
    // Can't express "quantity <= low_stock_threshold" as a simple .lte()
    // (that compares against a literal, not another column) — fetch and
    // filter in application code. Fine at MVP inventory-list scale.
    const { data, error } = await this.client.from('inventory').select('*').eq('workshop_id', workshopId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => rowToCamel<InventoryItem>(row) as InventoryItem)
      .filter((item) => item.quantity <= item.lowStockThreshold);
  }

  /** Adjusts stock and logs the transaction — NOT atomic across the two
   * tables via this client-side call (PostgREST has no client transaction,
   * same limitation noted in PKG-011). For MVP volume this is acceptable;
   * if it becomes a real race (concurrent stock adjustments), wrap both
   * writes in an RPC function like migration 027's onboarding transaction. */
  async adjustStock(
    workshopId: string,
    inventoryId: string,
    quantityChange: number,
    transactionType: 'stock_in' | 'stock_out',
    jobCardId?: string,
  ): Promise<InventoryItem> {
    const current = await this.findByIdOrThrow(inventoryId, workshopId, 'Inventory item');
    const newQuantity = current.quantity + quantityChange;

    const { data, error } = await this.client
      .from('inventory')
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('id', inventoryId)
      .eq('workshop_id', workshopId)
      .select()
      .single();
    if (error) throw error;

    await this.client.from('inventory_transactions').insert({
      workshop_id: workshopId,
      inventory_id: inventoryId,
      job_card_id: jobCardId,
      transaction_type: transactionType,
      quantity_change: quantityChange,
    });

    return rowToCamel<InventoryItem>(data) as InventoryItem;
  }
}
