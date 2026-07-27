import type { Request, Response } from 'express';
import { WorkshopService } from './workshop.service';
import { recordSecurityEvent, SecurityAuditEvent } from '../../lib/security-audit';

export async function getMyWorkshop(req: Request, res: Response) {
  const service = new WorkshopService(req.repos);
  const workshop = await service.getProfile(req.auth!.workshopId);
  res.json({ success: true, data: workshop });
}

export async function updateMyWorkshop(req: Request, res: Response) {
  const service = new WorkshopService(req.repos);
  const workshop = await service.updateProfile(req.auth!.workshopId, req.body);
  recordSecurityEvent({
    event: SecurityAuditEvent.WORKSHOP_SETTINGS_CHANGED,
    workshopId: req.auth!.workshopId,
    actorUserId: req.auth!.userId,
    entityType: 'workshop',
    entityId: req.auth!.workshopId,
    metadata: { fieldsChanged: Object.keys(req.body) },
  });
  res.json({ success: true, data: workshop });
}
