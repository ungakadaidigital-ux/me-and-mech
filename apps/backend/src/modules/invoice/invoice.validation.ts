import { z } from 'zod';

export const markPaidSchema = z.object({
  payment_method: z.enum(['cash', 'upi', 'card']).optional(),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;
