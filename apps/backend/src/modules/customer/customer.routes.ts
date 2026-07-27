import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { createCustomerSchema, updateCustomerSchema } from './customer.validation';
import { listCustomers, getCustomer, createCustomer, updateCustomer } from './customer.controller';

export const customerRouter = Router();

customerRouter.get('/customers', authenticate, attachRepositories, asyncHandler(listCustomers));
customerRouter.get('/customers/:id', authenticate, attachRepositories, asyncHandler(getCustomer));

customerRouter.post(
  '/customers',
  authenticate,
  attachRepositories,
  subscriptionGuard, // "add new customers" is explicitly locked post-trial
  authorize('customer:write'),
  validate(createCustomerSchema),
  asyncHandler(createCustomer),
);

customerRouter.put(
  '/customers/:id',
  authenticate,
  attachRepositories,
  authorize('customer:write'),
  validate(updateCustomerSchema),
  asyncHandler(updateCustomer),
);
