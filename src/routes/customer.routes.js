import { Router } from 'express';

import {
  createCustomer,
  getCustomer,
  listCustomers,
  predictCustomer,
  simulateCustomer,
} from '../controllers/customer.controller.js';
import {
  createRetentionAction,
  listCustomerRetentionActions,
} from '../controllers/retention.controller.js';

const router = Router();

router.get('/', listCustomers);
router.post('/', createCustomer);
router.post('/:customerId/retention-actions', createRetentionAction);
router.get('/:customerId/retention-actions', listCustomerRetentionActions);
router.post('/:customerId/simulate', simulateCustomer);
router.post('/:customerId/predict', predictCustomer);
router.get('/:customerId', getCustomer);

export default router;
