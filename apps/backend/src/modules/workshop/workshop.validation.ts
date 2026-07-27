import { z } from 'zod';

export const updateWorkshopSchema = z.object({
  shop_name: z.string().min(2).optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  upi_id: z.string().optional(),
  workshop_size: z.enum(['solo', 'small', 'large']).optional(),
});

export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;
