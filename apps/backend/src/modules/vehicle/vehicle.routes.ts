import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { createVehicleSchema, updateVehicleSchema } from './vehicle.validation';
import { listVehicles, getVehicle, createVehicle, updateVehicle } from './vehicle.controller';

export const vehicleRouter = Router();

vehicleRouter.get('/vehicles', authenticate, attachRepositories, asyncHandler(listVehicles));
vehicleRouter.get('/vehicles/:id', authenticate, attachRepositories, asyncHandler(getVehicle));

vehicleRouter.post(
  '/vehicles',
  authenticate,
  attachRepositories,
  subscriptionGuard, // "add new vehicles" is explicitly locked post-trial
  authorize('vehicle:write'),
  validate(createVehicleSchema),
  asyncHandler(createVehicle),
);

vehicleRouter.put(
  '/vehicles/:id',
  authenticate,
  attachRepositories,
  authorize('vehicle:write'),
  validate(updateVehicleSchema),
  asyncHandler(updateVehicle),
);
