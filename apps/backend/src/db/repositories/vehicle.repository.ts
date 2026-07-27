import type { SupabaseClient } from '@supabase/supabase-js';
import type { Vehicle } from '@me-and-mech/shared';
import { BaseRepository } from './base.repository';
import { rowToCamel, rowsToCamel } from '../../lib/case-mapping';

export interface VehicleInsert {
  workshop_id: string;
  customer_id: string;
  vehicle_number: string;
  make?: string;
  model?: string;
  year?: number;
  fuel_type?: string;
  colour?: string;
}

export interface VehicleUpdate {
  make?: string;
  model?: string;
  year?: number;
  fuel_type?: string;
  colour?: string;
}

export class VehicleRepository extends BaseRepository<Vehicle, VehicleInsert, VehicleUpdate> {
  constructor(client: SupabaseClient) {
    super(client, 'vehicles');
  }

  async findByCustomer(workshopId: string, customerId: string): Promise<Vehicle[]> {
    const { data, error } = await this.client
      .from('vehicles')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('customer_id', customerId);
    if (error) throw error;
    return rowsToCamel<Vehicle>(data);
  }

  async findByVehicleNumber(workshopId: string, vehicleNumber: string): Promise<Vehicle | null> {
    const { data, error } = await this.client
      .from('vehicles')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('vehicle_number', vehicleNumber)
      .maybeSingle();
    if (error) throw error;
    return rowToCamel<Vehicle>(data);
  }
}
