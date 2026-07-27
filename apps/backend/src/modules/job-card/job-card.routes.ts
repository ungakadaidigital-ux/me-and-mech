import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { createJobCardSchema, updateJobCardStatusSchema, addJobCardItemSchema } from './job-card.validation';
import {
  listJobCards,
  getJobCard,
  createJobCard,
  updateJobCardStatus,
  addJobCardItem,
  removeJobCardItem,
} from './job-card.controller';

export const jobCardRouter = Router();

jobCardRouter.get('/jobs', authenticate, attachRepositories, asyncHandler(listJobCards));
jobCardRouter.get('/jobs/:id', authenticate, attachRepositories, asyncHandler(getJobCard));

jobCardRouter.post(
  '/jobs',
  authenticate,
  attachRepositories,
  subscriptionGuard, // "create new job cards" is explicitly locked post-trial
  authorize('job_card:write'),
  validate(createJobCardSchema),
  asyncHandler(createJobCard),
);

jobCardRouter.patch(
  '/jobs/:id/status',
  authenticate,
  attachRepositories,
  authorize('job_card:write'),
  validate(updateJobCardStatusSchema),
  asyncHandler(updateJobCardStatus),
);

jobCardRouter.post(
  '/jobs/:id/items',
  authenticate,
  attachRepositories,
  authorize('job_card:write'),
  validate(addJobCardItemSchema),
  asyncHandler(addJobCardItem),
);

jobCardRouter.delete(
  '/jobs/:id/items/:itemId',
  authenticate,
  attachRepositories,
  authorize('job_card:write'),
  asyncHandler(removeJobCardItem),
);
