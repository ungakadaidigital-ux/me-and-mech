import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { asyncHandler } from '../../middleware/error-handler';

export const reportsRouter = Router();

function sinceParam(req: any): string {
  const days = Number(req.query.days) || 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

reportsRouter.get(
  '/reports/revenue',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const data = await req.repos.reports.revenueSummary(req.auth!.workshopId, sinceParam(req));
    res.json({ success: true, data });
  }),
);

reportsRouter.get(
  '/reports/job-cards',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const data = await req.repos.reports.jobCardCounts(req.auth!.workshopId, sinceParam(req));
    res.json({ success: true, data });
  }),
);

reportsRouter.get(
  '/reports/voice-usage',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const count = await req.repos.reports.voiceUsageCount(req.auth!.workshopId, sinceParam(req));
    res.json({ success: true, data: { voiceSessionCount: count } });
  }),
);

reportsRouter.get(
  '/reports/top-customers',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const data = await req.repos.reports.topCustomers(req.auth!.workshopId, limit);
    res.json({ success: true, data });
  }),
);
