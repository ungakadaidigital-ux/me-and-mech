import type { Request, Response } from 'express';
import { CustomerService } from './customer.service';

export async function listCustomers(req: Request, res: Response) {
  const service = new CustomerService(req.repos);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const result = await service.list(req.auth!.workshopId, page, limit, search);
  res.json({ success: true, data: result });
}

export async function getCustomer(req: Request, res: Response) {
  const service = new CustomerService(req.repos);
  const customer = await service.getById(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: customer });
}

export async function createCustomer(req: Request, res: Response) {
  const service = new CustomerService(req.repos);
  const customer = await service.create(req.auth!.workshopId, req.body);
  res.status(201).json({ success: true, data: customer });
}

export async function updateCustomer(req: Request, res: Response) {
  const service = new CustomerService(req.repos);
  const customer = await service.update(req.auth!.workshopId, req.params.id, req.body);
  res.json({ success: true, data: customer });
}
