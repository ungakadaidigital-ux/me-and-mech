import type { Repositories } from '../../db/repository-factory';
import type { JobCardStatus } from '@me-and-mech/shared';
import { ValidationError, NotFoundError } from '../../lib/errors';
import type { CreateJobCardInput, AddJobCardItemInput } from './job-card.validation';

/**
 * PKG-027 — Job Card Management Module.
 *
 * Status state machine (matches the locked job_card_status enum from
 * migration 005: draft → in_progress → invoiced → paid). This route layer
 * only ever allows a DIRECT transition into 'in_progress' from 'draft' —
 * 'invoiced' and 'paid' are side effects of the invoice module (PKG-028),
 * never something this endpoint sets directly. That keeps "an invoice
 * exists for this job" and "job_cards.status = invoiced" from being able
 * to drift out of sync via two different write paths.
 */
const ALLOWED_TRANSITIONS: Record<JobCardStatus, JobCardStatus[]> = {
  draft: ['in_progress'],
  in_progress: [], // forward movement from here only happens via invoice generation
  invoiced: [],
  paid: [],
};

export class JobCardService {
  constructor(private readonly repos: Repositories) {}

  async list(workshopId: string, page: number, limit: number) {
    return this.repos.jobCards.findMany(workshopId, { page, limit, orderBy: { column: 'created_at', ascending: false } });
  }

  async getById(workshopId: string, id: string) {
    const jobCard = await this.repos.jobCards.findByIdOrThrow(id, workshopId, 'Job card');
    const items = await this.repos.jobCards.findItems(id);
    return { ...jobCard, items };
  }

  async create(workshopId: string, input: CreateJobCardInput) {
    const customer = await this.repos.customers.findById(input.customer_id, workshopId);
    if (!customer) throw new NotFoundError('Customer');

    const vehicle = await this.repos.vehicles.findById(input.vehicle_id, workshopId);
    if (!vehicle) throw new NotFoundError('Vehicle');
    if (vehicle.customerId !== input.customer_id) {
      throw new ValidationError('Vehicle does not belong to the specified customer');
    }

    const jobCard = await this.repos.jobCards.create({
      workshop_id: workshopId,
      customer_id: input.customer_id,
      vehicle_id: input.vehicle_id,
      job_date: input.job_date,
      job_type: input.job_type,
      km: input.km,
      notes: input.notes,
      status: 'draft', // explicit — the state machine depends on this; DB default (migration 005) exists as a backstop, not the source of truth
    });

    const items = [];
    for (const item of input.items ?? []) {
      items.push(await this.repos.jobCards.addItem({ job_card_id: jobCard.id, ...item }));
    }

    return { ...jobCard, items };
  }

  async updateStatus(workshopId: string, id: string, nextStatus: JobCardStatus) {
    const jobCard = await this.repos.jobCards.findByIdOrThrow(id, workshopId, 'Job card');

    if (!ALLOWED_TRANSITIONS[jobCard.status].includes(nextStatus)) {
      throw new ValidationError(
        `Cannot transition job card from "${jobCard.status}" to "${nextStatus}"`,
        { currentStatus: jobCard.status, requestedStatus: nextStatus },
      );
    }

    return this.repos.jobCards.update(id, workshopId, { status: nextStatus });
  }

  async addItem(workshopId: string, jobCardId: string, input: AddJobCardItemInput) {
    const jobCard = await this.repos.jobCards.findByIdOrThrow(jobCardId, workshopId, 'Job card');
    if (jobCard.status === 'invoiced' || jobCard.status === 'paid') {
      throw new ValidationError('Cannot add items to a job card that has already been invoiced');
    }
    return this.repos.jobCards.addItem({ job_card_id: jobCardId, ...input });
  }

  async removeItem(workshopId: string, jobCardId: string, itemId: string) {
    const jobCard = await this.repos.jobCards.findByIdOrThrow(jobCardId, workshopId, 'Job card');
    if (jobCard.status === 'invoiced' || jobCard.status === 'paid') {
      throw new ValidationError('Cannot remove items from a job card that has already been invoiced');
    }
    await this.repos.jobCards.removeItem(itemId);
  }
}
