import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { updateWorkshopSchema } from './workshop.validation';
import { getMyWorkshop, updateMyWorkshop } from './workshop.controller';

export const workshopRouter = Router();

// GET is a read — authenticate + attachRepositories only, no subscription
// guard (reads are never blocked) and no RBAC beyond "you're logged in".
workshopRouter.get('/workshop/me', authenticate, attachRepositories, asyncHandler(getMyWorkshop));

workshopRouter.patch(
  '/workshop/me',
  authenticate,
  attachRepositories,
  authorize('workshop:update'),
  validate(updateWorkshopSchema),
  asyncHandler(updateMyWorkshop),
);
