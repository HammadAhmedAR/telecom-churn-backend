import { Router } from 'express';

import { listRetentionActions } from '../controllers/retention.controller.js';

const router = Router();

router.get('/', listRetentionActions);

export default router;
