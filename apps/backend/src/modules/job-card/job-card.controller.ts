import type { Request, Response } from 'express';
import { JobCardService } from './job-card.service';
import { ReferralService } from '../referral/referral.service';

export async function listJobCards(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await service.list(req.auth!.workshopId, page, limit);
  res.json({ success: true, data: result });
}

export async function getJobCard(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  const jobCard = await service.getById(req.auth!.workshopId, req.params.id);
  res.json({ success: true, data: jobCard });
}

export async function createJobCard(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  const jobCard = await service.create(req.auth!.workshopId, req.body);

  // Best-effort, fire-and-forget-but-awaited (not blocking the response
  // shape) referral success check — see referral.service.ts for why this
  // is deliberately non-throwing.
  new ReferralService(req.repos).checkAndMarkSuccess(req.auth!.workshopId).catch(() => {});

  res.status(201).json({ success: true, data: jobCard });
}

export async function updateJobCardStatus(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  const jobCard = await service.updateStatus(req.auth!.workshopId, req.params.id, req.body.status);
  res.json({ success: true, data: jobCard });
}

export async function addJobCardItem(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  const item = await service.addItem(req.auth!.workshopId, req.params.id, req.body);
  res.status(201).json({ success: true, data: item });
}

export async function removeJobCardItem(req: Request, res: Response) {
  const service = new JobCardService(req.repos);
  await service.removeItem(req.auth!.workshopId, req.params.id, req.params.itemId);
  res.status(204).send();
}
