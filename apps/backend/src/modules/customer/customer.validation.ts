import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
