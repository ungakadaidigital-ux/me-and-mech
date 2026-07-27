import type { Request, Response } from 'express';
import { VehicleService } from './vehicle.service';
import { ValidationError } from '../../lib/errors';

export async function listVehicles(req: Request, res: Response) {
  const service = new VehicleService(req.repos);
  const customerId = req.query.customer_id;
  if (typeof customerId !== 'string') {
    throw new ValidationError('customer_id query parameter is required');
  }
  const vehicles = await service.listByCustomer(req.auth!.workshopId, customerId);
  res.json({ success: true, data: vehicles });
}

export async function getVehicle(req: Request, res: Response) {
  const service = new VehicleService(req.repos);
  const vehicle = await service.getById(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: vehicle });
}

export async function createVehicle(req: Request, res: Response) {
  const service = new VehicleService(req.repos);
  const vehicle = await service.create(req.auth!.workshopId, req.body);
  res.status(201).json({ success: true, data: vehicle });
}

export async function updateVehicle(req: Request, res: Response) {
  const service = new VehicleService(req.repos);
  const vehicle = await service.update(req.auth!.workshopId, req.params.id, req.body);
  res.json({ success: true, data: vehicle });
}
