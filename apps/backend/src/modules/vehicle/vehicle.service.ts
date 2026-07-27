import type { Repositories } from '../../db/repository-factory';
import { isValidTnVehicleNumber } from '@me-and-mech/shared';
import { ValidationError, DuplicateVehicleNumberError, NotFoundError } from '../../lib/errors';
import type { CreateVehicleInput, UpdateVehicleInput } from './vehicle.validation';

function normalizePlate(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export class VehicleService {
  constructor(private readonly repos: Repositories) {}

  async listByCustomer(workshopId: string, customerId: string) {
    // Confirms the customer belongs to this workshop before listing —
    // otherwise a crafted customer_id from another workshop would 404
    // correctly via RLS anyway, but we want a clean NotFoundError, not a
    // silently-empty array that looks like "customer has no vehicles".
    await this.repos.customers.findByIdOrThrow(customerId, workshopId, 'Customer');
    return this.repos.vehicles.findByCustomer(workshopId, customerId);
  }

  async getById(workshopId: string, id: string) {
    return this.repos.vehicles.findByIdOrThrow(id, workshopId, 'Vehicle');
  }

  async create(workshopId: string, input: CreateVehicleInput) {
    if (!isValidTnVehicleNumber(input.vehicle_number)) {
      throw new ValidationError('Vehicle number must be a valid TN registration (e.g. TN01AB1234)');
    }
    const vehicleNumber = normalizePlate(input.vehicle_number);

    const customer = await this.repos.customers.findById(input.customer_id, workshopId);
    if (!customer) throw new NotFoundError('Customer');

    const existing = await this.repos.vehicles.findByVehicleNumber(workshopId, vehicleNumber);
    if (existing) throw new DuplicateVehicleNumberError({ existingVehicle: existing });

    return this.repos.vehicles.create({
      workshop_id: workshopId,
      customer_id: input.customer_id,
      vehicle_number: vehicleNumber,
      make: input.make,
      model: input.model,
      year: input.year,
      fuel_type: input.fuel_type,
      colour: input.colour,
    });
  }

  async update(workshopId: string, id: string, input: UpdateVehicleInput) {
    return this.repos.vehicles.update(id, workshopId, input);
  }
}
