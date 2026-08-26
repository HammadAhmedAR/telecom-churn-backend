import { Router } from 'express';

import { getCustomer, listCustomers } from '../controllers/customer.controller.js';

const router = Router();

router.get('/', listCustomers);
router.get('/:customerId', getCustomer);

export default router;
