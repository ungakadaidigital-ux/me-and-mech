import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { validate } from '../../middleware/validate';
import { verifyQStashSignature } from '../../middleware/verify-qstash';
import { rateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../middleware/error-handler';
import { RATE_LIMITS } from '@me-and-mech/shared';
import { ReferralService } from './referral.service';
import { RewardWorkerService } from './reward-worker.service';

export const referralRouter = Router();

const referralApplyRateLimit = rateLimit({
  limit: RATE_LIMITS.referralApply.limit,
  windowMs: RATE_LIMITS.referralApply.windowHours * 60 * 60_000,
});

referralRouter.get(
  '/referral/me',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const service = new ReferralService(req.repos);
    const status = await service.getMyStatus(req.auth!.workshopId);
    res.json({ success: true, data: status });
  }),
);

referralRouter.post(
  '/referral/apply',
  authenticate,
  attachRepositories,
  referralApplyRateLimit, // PKG-052: 3/24h — abuse prevention
  validate(z.object({ code: z.string().min(6) })),
  asyncHandler(async (req, res) => {
    const service = new ReferralService(req.repos);
    const entry = await service.applyCode(req.auth!.workshopId, req.body.code);
    res.status(201).json({ success: true, data: entry });
  }),
);

// GATED — QStash-invoked only, never a direct client route.
referralRouter.post(
  '/internal/referral-reward-worker',
  verifyQStashSignature,
  validate(z.object({ referral_entry_id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await new RewardWorkerService().processMilestone(req.body.referral_entry_id);
    res.status(200).json({ success: true }); // 200 immediately, per the locked async-worker pattern
  }),
);
