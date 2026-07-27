import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { requestTimeout } from '../../middleware/request-timeout';
import { rateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../middleware/error-handler';
import { RATE_LIMITS } from '@me-and-mech/shared';
import { trialGate } from './trial-gate';
import { transcribeVoice } from './voice.controller';

export const voiceRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max, per locked spec
});

const voiceRateLimit = rateLimit({
  limit: RATE_LIMITS.voiceTranscribe.limit,
  windowMs: RATE_LIMITS.voiceTranscribe.windowMinutes * 60_000,
});

voiceRouter.post(
  '/voice/transcribe',
  requestTimeout(45_000), // voice pipeline (Sarvam retries + GPT extraction) needs more than the 30s global default
  authenticate,
  attachRepositories,
  voiceRateLimit, // PKG-052: 20/hour, per-endpoint — separate from and tighter than the global default
  subscriptionGuard, // read_only/expired blocked, same as any other creation action
  trialGate, // ADDITIONALLY blocked for trial — see trial-gate.ts. Order matters: cheaper auth checks first.
  authorize('job_card:write'),
  upload.single('audio'),
  asyncHandler(transcribeVoice),
);
