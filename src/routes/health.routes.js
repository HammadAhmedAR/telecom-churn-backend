import { Router } from 'express';

import sequelize from '../config/database.js';

const router = Router();

router.get('/', async (_request, response, next) => {
  try {
    await sequelize.authenticate();

    response.json({
      status: 'ok',
      service: 'telecom-churn-backend',
      database: 'connected',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
