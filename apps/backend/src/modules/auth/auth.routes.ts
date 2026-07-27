import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/error-handler';
import { rateLimit } from '../../middleware/rate-limit';
import { RATE_LIMITS } from '@me-and-mech/shared';
import { requestOtp, verifyOtp } from './otp.service';
import { issueSession, refreshSession, revokeSession } from './session.service';
import { mintOnboardingProof } from '../../lib/jwt';
import { getAdminClient } from '../../db/admin-client';
import { ValidationError } from '../../lib/errors';

export const authRouter = Router();

const requestOtpLimiter = rateLimit({
  limit: RATE_LIMITS.requestOtp.limit,
  windowMs: RATE_LIMITS.requestOtp.windowMinutes * 60_000,
});
const verifyOtpLimiter = rateLimit({
  limit: RATE_LIMITS.verifyOtp.limit,
  windowMs: RATE_LIMITS.verifyOtp.windowMinutes * 60_000,
});

const requestOtpSchema = z.object({ phone: z.string().min(10) });
const verifyOtpSchema = z.object({ phone: z.string().min(10), otp: z.string().length(6) });
const refreshSchema = z.object({ refreshToken: z.string().min(10) });

authRouter.post(
  '/auth/request-otp',
  requestOtpLimiter,
  asyncHandler(async (req, res) => {
    const { phone } = requestOtpSchema.parse(req.body);
    const result = await requestOtp(phone);
    res.json({ success: true, message: 'OTP sent', expires_in: result.expiresIn });
  }),
);

authRouter.post(
  '/auth/verify-otp',
  verifyOtpLimiter,
  asyncHandler(async (req, res) => {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid request body', parsed.error.flatten());
    const { otp } = parsed.data;

    const { phone } = await verifyOtp(parsed.data.phone, otp);

    const supabase = getAdminClient();
    const { data: existingUser } = await supabase
      .from('users')
      .select('*, workshops!inner(subscription_status, trial_ends_at)')
      .eq('phone', phone)
      .maybeSingle();

    if (!existingUser) {
      const onboardingToken = mintOnboardingProof(phone);
      return res.json({ isNewUser: true, onboardingToken, phone });
    }

    const session = await issueSession({
      userId: existingUser.id,
      workshopId: existingUser.workshop_id,
      appRole: existingUser.role,
      subscriptionStatus: (existingUser as any).workshops.subscription_status,
      trialEndsAt: (existingUser as any).workshops.trial_ends_at,
    });

    res.json({ isNewUser: false, session, userId: existingUser.id, workshopId: existingUser.workshop_id });
  }),
);

authRouter.post(
  '/auth/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await refreshSession(refreshToken);
    res.json({ accessToken: result.accessToken, expiresAt: Date.now() + result.expiresIn * 1000 });
  }),
);

authRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await revokeSession(refreshToken);
    res.json({ success: true });
  }),
);
