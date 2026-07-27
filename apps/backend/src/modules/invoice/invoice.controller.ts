import type { Request, Response } from 'express';
import { InvoiceService } from './invoice.service';
import { NotificationService } from '../notification/notification.service';
import { ValidationError } from '../../lib/errors';

export async function getInvoice(req: Request, res: Response) {
  const service = new InvoiceService(req.repos);
  const invoice = await service.getById(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: invoice });
}

export async function generateInvoice(req: Request, res: Response) {
  const service = new InvoiceService(req.repos);
  const invoice = await service.generateFromJobCard(req.auth!.workshopId, req.params.jobCardId);
  res.status(201).json({ success: true, data: invoice });
}

export async function markInvoicePaid(req: Request, res: Response) {
  const service = new InvoiceService(req.repos);
  const invoice = await service.markPaid(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: invoice });
}

export async function getInvoicePdf(req: Request, res: Response) {
  const service = new InvoiceService(req.repos);
  const url = await service.getPdfUrl(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: { url } });
}
export async function sendInvoiceWhatsApp(req: Request, res: Response) {
  const phone = req.body?.customer_phone;
  if (typeof phone !== 'string') {
    throw new ValidationError('customer_phone is required');
  }
  const service = new InvoiceService(req.repos);
  const result = await service.sendWhatsApp(req.auth!.workshopId, req.params.id, phone, new NotificationService());
  res.json({ success: true, data: result });
}
