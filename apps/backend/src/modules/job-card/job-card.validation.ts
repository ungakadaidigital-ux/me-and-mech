import { z } from 'zod';

export const createJobCardSchema = z.object({
  customer_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  job_date: z.string().optional(),
  job_type: z.string().min(2),
  km: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        item_type: z.enum(['labour', 'part']),
        description: z.string().min(1),
        quantity: z.number().positive(),
        rate: z.string(), // string, per locked "money travels as strings" rule
      }),
    )
    .optional()
    .default([]),
});

export const updateJobCardStatusSchema = z.object({
  status: z.enum(['draft', 'in_progress']), // invoiced/paid are set by the invoice module, never directly here
});

export const addJobCardItemSchema = z.object({
  item_type: z.enum(['labour', 'part']),
  description: z.string().min(1),
  quantity: z.number().positive(),
  rate: z.string(),
});

export type CreateJobCardInput = z.infer<typeof createJobCardSchema>;
export type UpdateJobCardStatusInput = z.infer<typeof updateJobCardStatusSchema>;
export type AddJobCardItemInput = z.infer<typeof addJobCardItemSchema>;
