import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { attachRepositories } from '../../middleware/attach-repositories';
import { subscriptionGuard } from '../../middleware/subscription-guard';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/error-handler';
import { createInventorySchema, updateInventorySchema, adjustStockSchema } from './inventory.validation';

export const inventoryRouter = Router();

inventoryRouter.get(
  '/inventory',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await req.repos.inventory.findMany(req.auth!.workshopId, { page, limit });
    res.json({ success: true, data: result });
  }),
);

inventoryRouter.get(
  '/inventory/low-stock',
  authenticate,
  attachRepositories,
  asyncHandler(async (req, res) => {
    const items = await req.repos.inventory.findLowStock(req.auth!.workshopId);
    res.json({ success: true, data: items });
  }),
);

inventoryRouter.post(
  '/inventory',
  authenticate,
  attachRepositories,
  subscriptionGuard,
  authorize('inventory:write'),
  validate(createInventorySchema),
  asyncHandler(async (req, res) => {
    const item = await req.repos.inventory.create({ workshop_id: req.auth!.workshopId, ...req.body });
    res.status(201).json({ success: true, data: item });
  }),
);

inventoryRouter.put(
  '/inventory/:id',
  authenticate,
  attachRepositories,
  authorize('inventory:write'),
  validate(updateInventorySchema),
  asyncHandler(async (req, res) => {
    const item = await req.repos.inventory.update(req.params.id, req.auth!.workshopId, req.body);
    res.json({ success: true, data: item });
  }),
);

inventoryRouter.post(
  '/inventory/:id/adjust',
  authenticate,
  attachRepositories,
  authorize('inventory:write'),
  validate(adjustStockSchema),
  asyncHandler(async (req, res) => {
    const item = await req.repos.inventory.adjustStock(
      req.auth!.workshopId,
      req.params.id,
      req.body.quantity_change,
      req.body.transaction_type,
      req.body.job_card_id,
    );
    res.json({ success: true, data: item });
  }),
);
