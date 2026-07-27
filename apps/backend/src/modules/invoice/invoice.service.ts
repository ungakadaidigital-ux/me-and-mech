import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repositories } from '../../db/repository-factory';
import { getAdminClient } from '../../db/admin-client';
import { ValidationError, AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { WATI_TEMPLATES } from '../../config/wati-templates';
import type { NotificationService } from '../notification/notification.service';
import { generateInvoicePdf } from '../pdf/invoice-pdf';
import { uploadInvoicePdf, getSignedInvoicePdfUrl } from '../pdf/pdf-storage';
import { logger } from '../../lib/logger';
import { captureEvent } from '../../lib/posthog';

/**
 * PKG-028 — Invoice Management Module.
 *
 * Invoice numbering uses the workshop_invoice_counters table + RPC
 * (migration 028) — an atomic UPDATE...RETURNING, never MAX(invoice_number)+1
 * (the locked spec calls out MAX+1 by name as unsafe under concurrency).
 * That RPC touches a table with zero client RLS policies, so this one step
 * goes through an admin-privileged client; everything else in this service
 * uses the normal RLS-scoped repos, same as every other module.
 *
 * The admin client is constructor-injected (defaulting to the real
 * getAdminClient() via the controller) rather than imported and called
 * internally — this keeps the elevated-privilege boundary explicit at the
 * call site and makes the service testable against a fake client without
 * fighting ES module export immutability.
 */
export class InvoiceService {
  private readonly adminClient: SupabaseClient;

  constructor(
    private readonly repos: Repositories,
    adminClient?: SupabaseClient,
  ) {
    this.adminClient = adminClient ?? getAdminClient();
  }

  async getById(workshopId: string, id: string) {
    return this.repos.invoices.findByIdOrThrow(id, workshopId, 'Invoice');
  }

  /**
   * Generates an invoice from an in_progress job card: snapshots its
   * items into invoice_line_items (immutable copy — see migration 008's
   * comment on why this isn't just a reference back to job_card_items),
   * then transitions the job card to 'invoiced'. This is the ONLY code
   * path allowed to make that specific transition — the job-card route
   * layer's state machine (job-card.service.ts) intentionally does not
   * allow a client to PATCH status directly to 'invoiced'.
   */
  async generateFromJobCard(workshopId: string, jobCardId: string) {
    const jobCard = await this.repos.jobCards.findByIdOrThrow(jobCardId, workshopId, 'Job card');

    if (jobCard.status !== 'in_progress') {
      throw new ValidationError(
        `Cannot generate an invoice from a job card in status "${jobCard.status}" — it must be "in_progress"`,
      );
    }

    const existingInvoice = await this.repos.invoices.findByJobCard(jobCardId);
    if (existingInvoice) {
      throw new ValidationError('An invoice already exists for this job card', { invoiceId: existingInvoice.id });
    }

    const items = await this.repos.jobCards.findItems(jobCardId);
    if (items.length === 0) {
      throw new ValidationError('Cannot generate an invoice for a job card with no items');
    }

    const workshop = await this.repos.workshops.findByIdOrThrow(workshopId);
    const year = new Date().getFullYear();

    const admin = this.adminClient;
    const { data: invoiceNumber, error: numberError } = await admin.rpc('next_invoice_number', {
      p_workshop_id: workshopId,
      p_prefix: workshop.invoicePrefix,
      p_year: year,
    });
    if (numberError) {
      throw new AppError(ErrorCode.INTERNAL, `Invoice numbering failed: ${numberError.message}`, 500);
    }

    const invoice = await this.repos.invoices.create({
      workshop_id: workshopId,
      job_card_id: jobCardId,
      invoice_number: invoiceNumber as string,
      payment_status: 'PENDING', // explicit — DB default (migration 007) exists as a backstop, not the source of truth
    });

    for (const item of items) {
      await this.repos.invoices.addLineItem({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
      });
    }

    // Direct repository call, deliberately bypassing JobCardService's
    // route-level state machine — see class comment above.
    await this.repos.jobCards.update(jobCardId, workshopId, { status: 'invoiced' });

    // PKG-046 — generate and store the PDF. Failure here does NOT roll
    // back the invoice (the invoice record + line items are the source
    // of truth; the PDF is a derived artifact that can be regenerated on
    // demand via getPdfUrl() if this step fails) — logged, not thrown.
    try {
      const customer = await this.repos.customers.findById(jobCard.customerId, workshopId);
      const vehicle = await this.repos.vehicles.findById(jobCard.vehicleId, workshopId);
      const lineItems = await getAdminClient()
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      const pdfBuffer = await generateInvoicePdf({
        workshop,
        invoice,
        lineItems: (lineItems.data ?? []) as any,
        customerName: customer?.name ?? '',
        customerPhone: customer?.phone ?? '',
        vehicleNumber: vehicle?.vehicleNumber ?? '',
      });
      const storagePath = await uploadInvoicePdf(workshopId, invoice.id, pdfBuffer);
      await this.repos.invoices.update(invoice.id, workshopId, { pdf_url: storagePath });
    } catch (err) {
      logger.error({ err: (err as Error).message, invoiceId: invoice.id }, 'Invoice PDF generation failed (non-fatal, invoice still created)');
    }

    captureEvent(workshopId, 'invoice_generated', { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });

    return invoice;
  }

  /** Returns a fresh 1hr signed URL for the invoice PDF, regenerating the
   * PDF first if it was never successfully created (see the try/catch
   * above — PDF generation is best-effort at creation time). */
  async getPdfUrl(workshopId: string, invoiceId: string): Promise<string> {
    const invoice = await this.repos.invoices.findByIdOrThrow(invoiceId, workshopId, 'Invoice');
    if (!invoice.pdfUrl) {
      throw new AppError(ErrorCode.INTERNAL, 'Invoice PDF was not generated — contact support', 500);
    }
    return getSignedInvoicePdfUrl(invoice.pdfUrl);
  }

  /**
   * Marking an invoice PAID must NEVER be gated by subscriptionGuard,
   * under any subscription status — this is the one write path that's
   * always available, even to a read_only workshop. Enforced by NOT
   * attaching subscriptionGuard to this route (invoice.routes.ts), not by
   * anything in this method — flagging it here too since it's easy to
   * "fix" by someone who didn't read the routes file.
   */
  async markPaid(workshopId: string, invoiceId: string) {
    const invoice = await this.repos.invoices.findByIdOrThrow(invoiceId, workshopId, 'Invoice');
    if (invoice.paymentStatus === 'PAID') {
      return invoice; // idempotent — marking an already-PAID invoice PAID again is a no-op, not an error
    }
    const updated = await this.repos.invoices.markPaid(invoiceId, workshopId);
    await this.repos.jobCards.update(invoice.jobCardId, workshopId, { status: 'paid' });
    captureEvent(workshopId, 'invoice_paid', { invoiceId });
    return updated;
  }

  /**
   * "WhatsApp invoice delivery" is explicitly on the locked list of actions
   * blocked for a read_only workshop — subscriptionGuard is attached at
   * the route layer (invoice.routes.ts), not checked here.
   */
  async sendWhatsApp(workshopId: string, invoiceId: string, customerPhone: string, notificationService: NotificationService) {
    const invoice = await this.repos.invoices.findByIdOrThrow(invoiceId, workshopId, 'Invoice');
    const workshop = await this.repos.workshops.findByIdOrThrow(workshopId);

    const result = await notificationService.queueWhatsApp({
      workshopId,
      phone: customerPhone,
      templateId: WATI_TEMPLATES.INVOICE_DELIVERY,
      variables: [
        { key: 'shop_name', value: workshop.shopName },
        { key: 'invoice_number', value: invoice.invoiceNumber },
      ],
    });

    if (result.sent) {
      await this.repos.invoices.update(invoiceId, workshopId, { whatsapp_sent: true, sent_at: new Date().toISOString() });
    }

    return result;
  }
}
