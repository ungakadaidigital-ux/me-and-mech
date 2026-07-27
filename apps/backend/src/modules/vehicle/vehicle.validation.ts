import { z } from 'zod';

export const createVehicleSchema = z.object({
  customer_id: z.string().uuid(),
  vehicle_number: z.string().min(6),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1980).max(2100).optional(),
  fuel_type: z.string().optional(),
  colour: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1980).max(2100).optional(),
  fuel_type: z.string().optional(),
  colour: z.string().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
