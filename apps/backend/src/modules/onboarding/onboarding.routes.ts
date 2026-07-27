import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/error-handler';
import { AppError, ValidationError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { verifyOnboardingProof } from '../../lib/jwt';
import { onboardWorkshop } from './onboarding.service';
import { getAdminClient } from '../../db/admin-client';
import { issueSession } from '../auth/session.service';

export const onboardingRouter = Router();

/** Distinct from `authenticate` (PKG-019) — this checks a one-time
 * onboarding-proof token, not a full session access token. Scoped to this
 * router only. */
function requireOnboardingProof(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Missing onboarding proof token', 401));
  }
  try {
    const payload = verifyOnboardingProof(header.slice('Bearer '.length));
    (req as any).onboardingPhone = payload.phone;
    next();
  } catch {
    return next(new AppError(ErrorCode.AUTH_INSUFFICIENT_PERMISSION, 'Onboarding proof expired — please verify OTP again', 401));
  }
}

const onboardingSchema = z.object({
  shop_name: z.string().min(2),
  owner_name: z.string().min(2),
  city: z.string().min(2),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  invoice_prefix: z.string().min(2).max(10),
});

onboardingRouter.post(
  '/workshop',
  requireOnboardingProof,
  asyncHandler(async (req, res) => {
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid workshop registration data', parsed.error.flatten());

    const phone = (req as any).onboardingPhone as string;
    const result = await onboardWorkshop({
      phone,
      shopName: parsed.data.shop_name,
      ownerName: parsed.data.owner_name,
      city: parsed.data.city,
      address: parsed.data.address,
      gstNumber: parsed.data.gst_number,
      invoicePrefix: parsed.data.invoice_prefix,
    });

    const supabase = getAdminClient();
    const { data: workshop } = await supabase
      .from('workshops')
      .select('subscription_status, trial_ends_at')
      .eq('id', result.workshopId)
      .single();

    const session = await issueSession({
      userId: result.userId,
      workshopId: result.workshopId,
      appRole: 'OWNER',
      subscriptionStatus: workshop!.subscription_status,
      trialEndsAt: workshop!.trial_ends_at,
    });

    res.status(201).json({
      workshop: { id: result.workshopId, referralCode: result.referralCode },
      session,
    });
  }),
);
