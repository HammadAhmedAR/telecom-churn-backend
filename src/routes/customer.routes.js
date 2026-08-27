import { Router } from 'express';

import {
  getCustomer,
  listCustomers,
  predictCustomer,
} from '../controllers/customer.controller.js';
import {
  createRetentionAction,
  listCustomerRetentionActions,
} from '../controllers/retention.controller.js';

const router = Router();

router.get('/', listCustomers);
router.post('/:customerId/retention-actions', createRetentionAction);
router.get('/:customerId/retention-actions', listCustomerRetentionActions);
router.post('/:customerId/predict', predictCustomer);
router.get('/:customerId', getCustomer);

export default router;
