import { z } from 'zod';

export const createInventorySchema = z.object({
  name: z.string().min(2),
  quantity: z.number().int().nonnegative().optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
  cost_price: z.string().optional(),
  selling_price: z.string().optional(),
});

export const updateInventorySchema = z.object({
  name: z.string().min(2).optional(),
  low_stock_threshold: z.number().int().nonnegative().optional(),
  cost_price: z.string().optional(),
  selling_price: z.string().optional(),
});

export const adjustStockSchema = z.object({
  quantity_change: z.number().int().refine((v) => v !== 0, 'quantity_change cannot be zero'),
  transaction_type: z.enum(['stock_in', 'stock_out']),
  job_card_id: z.string().uuid().optional(),
});
