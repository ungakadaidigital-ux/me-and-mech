import { describe, it, expect, beforeEach } from 'vitest';
import { FakeSupabaseClient } from '../fakes/fake-supabase-client';
import { createRepositories } from '../../src/db/repository-factory';
import { CustomerService } from '../../src/modules/customer/customer.service';
import { VehicleService } from '../../src/modules/vehicle/vehicle.service';
import { JobCardService } from '../../src/modules/job-card/job-card.service';
import { InvoiceService } from '../../src/modules/invoice/invoice.service';

/**
 * PKG-029 — Core Module Integration Tests.
 * Exercises the complete operational flow against the fake in-memory
 * client (see fake-supabase-client.ts for what this does and does not
 * verify). InvoiceService reaches for the real admin client internally for
 * the invoice-numbering RPC — we substitute a fake admin client via the
 * module below so the same next_invoice_number logic (migration 028) runs
 * against fake storage instead of a real database.
 */

const WORKSHOP_ID = 'workshop-1';

function setupFakeAdmin(fakeDb: FakeSupabaseClient) {
  // Mirrors migration 028's next_invoice_number function.
  const counters = new Map<string, number>();
  fakeDb.registerRpc('next_invoice_number', (args) => {
    const key = `${args.p_workshop_id}:${args.p_year}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return `${args.p_prefix}-${args.p_year}-${String(next).padStart(3, '0')}`;
  });
}

describe('Core module integration — full service flow', () => {
  let db: FakeSupabaseClient;
  let repos: ReturnType<typeof createRepositories>;
  let customerService: CustomerService;
  let vehicleService: VehicleService;
  let jobCardService: JobCardService;
  let invoiceService: InvoiceService;

  beforeEach(() => {
    db = new FakeSupabaseClient();
    setupFakeAdmin(db);

    db.seed('workshops', [
      {
        id: WORKSHOP_ID,
        phone: '+919840012345',
        shop_name: 'Test Workshop',
        owner_name: 'Test Owner',
        city: 'Coimbatore',
        invoice_prefix: 'TW',
        subscription_status: 'trial',
      },
    ]);

    repos = createRepositories(db as any);
    customerService = new CustomerService(repos);
    vehicleService = new VehicleService(repos);
    jobCardService = new JobCardService(repos);
    invoiceService = new InvoiceService(repos, db as any); // fake admin client injected directly
  });

  it('runs the complete flow: customer → vehicle → job card → invoice → payment', async () => {
    // 1. Create customer with Indian mobile
    const customer = await customerService.create(WORKSHOP_ID, {
      name: 'ராஜேஷ்',
      phone: '9000000001',
    });
    expect(customer.phone).toBe('+919000000001');

    // Duplicate phone → ConflictError
    await expect(customerService.create(WORKSHOP_ID, { name: 'Someone Else', phone: '9000000001' })).rejects.toMatchObject({
      statusCode: 409,
    });

    // 2. Add vehicle with TN plate → verify normalization
    const vehicle = await vehicleService.create(WORKSHOP_ID, {
      customer_id: customer.id,
      vehicle_number: 'tn 37 ab 1234',
      make: 'Hero',
      model: 'Splendor',
    });
    expect(vehicle.vehicleNumber).toBe('TN37AB1234');

    // 3. Create job card (status: draft)
    const jobCard = await jobCardService.create(WORKSHOP_ID, {
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      job_type: 'general_service',
      items: [{ item_type: 'labour', description: 'Engine oil change', quantity: 1, rate: '500' }],
    });
    expect(jobCard.status).toBe('draft');
    expect(jobCard.items).toHaveLength(1);

    // 4. Valid transition: draft → in_progress
    const inProgress = await jobCardService.updateStatus(WORKSHOP_ID, jobCard.id, 'in_progress');
    expect(inProgress.status).toBe('in_progress');

    // 5. Invalid transition blocked: in_progress → draft
    await expect(jobCardService.updateStatus(WORKSHOP_ID, jobCard.id, 'draft' as any)).rejects.toMatchObject({
      statusCode: 400,
    });

    // 6. Add another service item
    await jobCardService.addItem(WORKSHOP_ID, jobCard.id, {
      item_type: 'part',
      description: 'Brake pad',
      quantity: 2,
      rate: '250',
    });

    // 7. Generate invoice — verify invoice number format and job card transition
    const invoice = await invoiceService.generateFromJobCard(WORKSHOP_ID, jobCard.id);
    expect(invoice.invoiceNumber).toMatch(/^TW-\d{4}-\d{3}$/);
    expect(invoice.paymentStatus).toBe('PENDING');

    const jobCardAfterInvoice = await jobCardService.getById(WORKSHOP_ID, jobCard.id);
    expect(jobCardAfterInvoice.status).toBe('invoiced');

    // 8. Cannot generate a second invoice for the same job card
    await expect(invoiceService.generateFromJobCard(WORKSHOP_ID, jobCard.id)).rejects.toMatchObject({ statusCode: 400 });

    // 9. Cannot add items to an already-invoiced job card
    await expect(
      jobCardService.addItem(WORKSHOP_ID, jobCard.id, { item_type: 'part', description: 'Late add', quantity: 1, rate: '10' }),
    ).rejects.toMatchObject({ statusCode: 400 });

    // 10. Mark invoice PAID
    const paidInvoice = await invoiceService.markPaid(WORKSHOP_ID, invoice.id);
    expect(paidInvoice.paymentStatus).toBe('PAID');

    const jobCardAfterPayment = await jobCardService.getById(WORKSHOP_ID, jobCard.id);
    expect(jobCardAfterPayment.status).toBe('paid');

    // 11. Marking PAID again is idempotent, not an error
    const paidAgain = await invoiceService.markPaid(WORKSHOP_ID, invoice.id);
    expect(paidAgain.paymentStatus).toBe('PAID');
  });

  it('rejects invoice generation for a job card still in draft', async () => {
    const customer = await customerService.create(WORKSHOP_ID, { name: 'Test', phone: '9000000002' });
    const vehicle = await vehicleService.create(WORKSHOP_ID, { customer_id: customer.id, vehicle_number: 'TN37CD5678' });
    const jobCard = await jobCardService.create(WORKSHOP_ID, {
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      job_type: 'general_service',
      items: [{ item_type: 'labour', description: 'Test', quantity: 1, rate: '100' }],
    });

    await expect(invoiceService.generateFromJobCard(WORKSHOP_ID, jobCard.id)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects invoice generation for a job card with no items', async () => {
    const customer = await customerService.create(WORKSHOP_ID, { name: 'Test', phone: '9000000003' });
    const vehicle = await vehicleService.create(WORKSHOP_ID, { customer_id: customer.id, vehicle_number: 'TN37EF9012' });
    const jobCard = await jobCardService.create(WORKSHOP_ID, {
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      job_type: 'general_service',
    });
    await jobCardService.updateStatus(WORKSHOP_ID, jobCard.id, 'in_progress');

    await expect(invoiceService.generateFromJobCard(WORKSHOP_ID, jobCard.id)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('invoice numbers increment sequentially per workshop, never collide', async () => {
    const customer = await customerService.create(WORKSHOP_ID, { name: 'Test', phone: '9000000004' });
    const invoiceNumbers: string[] = [];

    for (let i = 0; i < 3; i++) {
      const vehicle = await vehicleService.create(WORKSHOP_ID, {
        customer_id: customer.id,
        vehicle_number: `TN37ZZ000${i}`,
      });
      const jobCard = await jobCardService.create(WORKSHOP_ID, {
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        job_type: 'general_service',
        items: [{ item_type: 'labour', description: 'Test', quantity: 1, rate: '100' }],
      });
      await jobCardService.updateStatus(WORKSHOP_ID, jobCard.id, 'in_progress');
      const invoice = await invoiceService.generateFromJobCard(WORKSHOP_ID, jobCard.id);
      invoiceNumbers.push(invoice.invoiceNumber);
    }

    expect(invoiceNumbers).toEqual([
      expect.stringMatching(/-001$/),
      expect.stringMatching(/-002$/),
      expect.stringMatching(/-003$/),
    ]);
    expect(new Set(invoiceNumbers).size).toBe(3); // no collisions
  });
});
