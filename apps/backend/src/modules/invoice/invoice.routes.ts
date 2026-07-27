import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { markPaidSchema } from './invoice.validation';
import { getInvoice, generateInvoice, markInvoicePaid, sendInvoiceWhatsApp, getInvoicePdf } from './invoice.controller';

export const invoiceRouter = Router();

invoiceRouter.get('/invoices/:id', authenticate, attachRepositories, asyncHandler(getInvoice));
invoiceRouter.get('/invoices/:id/pdf', authenticate, attachRepositories, asyncHandler(getInvoicePdf));

invoiceRouter.post(
  '/jobs/:jobCardId/invoice',
  authenticate,
  attachRepositories,
  subscriptionGuard, // "generate new invoices" is explicitly locked post-trial
  authorize('invoice:write'),
  asyncHandler(generateInvoice),
);

invoiceRouter.post(
  '/invoices/:id/send-whatsapp',
  authenticate,
  attachRepositories,
  subscriptionGuard, // "WhatsApp invoice delivery" is explicitly locked post-trial
  authorize('invoice:write'),
  asyncHandler(sendInvoiceWhatsApp),
);

// NO subscriptionGuard here — deliberately. Marking PAID (collecting money
// owed) must work even for a read_only workshop; this is the one write the
// locked trial/read-only spec never blocks. See invoice.service.ts's
// markPaid() comment for the same warning at the logic layer.
invoiceRouter.post(
  '/invoices/:id/mark-paid',
  authenticate,
  attachRepositories,
  authorize('invoice:write'),
  validate(markPaidSchema),
  asyncHandler(markInvoicePaid),
);
