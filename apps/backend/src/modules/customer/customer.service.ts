import type { Repositories } from '../../db/repository-factory';
import { isValidIndianPhone, normalizeIndianPhone } from '@me-and-mech/shared';
import { ConflictError, ValidationError } from '../../lib/errors';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.validation';

export class CustomerService {
  constructor(private readonly repos: Repositories) {}

  async list(workshopId: string, page: number, limit: number, search?: string) {
    if (search) {
      return this.repos.customers.search(workshopId, search, { page, limit });
    }
    return this.repos.customers.findMany(workshopId, { page, limit, orderBy: { column: 'created_at', ascending: false } });
  }

  async getById(workshopId: string, id: string) {
    return this.repos.customers.findByIdOrThrow(id, workshopId, 'Customer');
  }

  async create(workshopId: string, input: CreateCustomerInput) {
    if (!isValidIndianPhone(input.phone)) {
      throw new ValidationError('Phone must be a valid 10-digit Indian mobile number');
    }
    const phone = normalizeIndianPhone(input.phone);

    const existing = await this.repos.customers.findByPhone(workshopId, phone);
    if (existing) {
      throw new ConflictError('A customer with this phone number already exists', { existingCustomer: existing });
    }

    return this.repos.customers.create({ workshop_id: workshopId, name: input.name, phone, city: input.city, notes: input.notes });
  }

  async update(workshopId: string, id: string, input: UpdateCustomerInput) {
    if (input.phone) {
      if (!isValidIndianPhone(input.phone)) {
        throw new ValidationError('Phone must be a valid 10-digit Indian mobile number');
      }
      input.phone = normalizeIndianPhone(input.phone);
      const existing = await this.repos.customers.findByPhone(workshopId, input.phone);
      if (existing && existing.id !== id) {
        throw new ConflictError('A customer with this phone number already exists', { existingCustomer: existing });
      }
    }
    return this.repos.customers.update(id, workshopId, input);
  }
}
