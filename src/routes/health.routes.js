import { Router } from 'express';

import sequelize from '../config/database.js';
import { checkMlHealth } from '../services/mlClient.service.js';

const router = Router();

router.get('/ml', async (_request, response, next) => {
  try {
    const health = await checkMlHealth();
    response.json({
      status: 'ok',
      mlService: 'connected',
      modelLoaded: health.model_loaded,
    });
  } catch (error) {
    next(error);
  }
});

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
