import { Router } from 'express';

import {
  getCustomer,
  listCustomers,
  predictCustomer,
} from '../controllers/customer.controller.js';

const router = Router();

router.get('/', listCustomers);
router.post('/:customerId/predict', predictCustomer);
router.get('/:customerId', getCustomer);

export default router;
