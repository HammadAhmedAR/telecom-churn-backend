import cors from 'cors';
import express from 'express';

import authenticateJwt from './middleware/auth.middleware.js';
import authRouter from './routes/auth.routes.js';
import customerRouter from './routes/customer.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import healthRouter from './routes/health.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  }),
);
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/customers', authenticateJwt, customerRouter);
app.use('/api/dashboard', authenticateJwt, dashboardRouter);

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found' });
});

app.use((error, _request, response, _next) => {
  if (error.statusCode === 400) {
    response.status(400).json({ message: error.message });
    return;
  }

  if (
    error.code === 'ML_CONFIGURATION_ERROR'
    || error.code === 'ML_SERVICE_UNAVAILABLE'
    || error.code === 'ML_SERVICE_TIMEOUT'
  ) {
    console.error('ML service unavailable:', error.code, error.message);
    response.status(503).json({ message: 'Prediction service unavailable' });
    return;
  }

  if (error.code === 'ML_SERVICE_REQUEST_ERROR') {
    console.error('ML service rejected request:', error.status, error.message);
    response.status(502).json({ message: 'Prediction service rejected customer data' });
    return;
  }

  if (error.code === 'ML_SERVICE_INVALID_RESPONSE') {
    console.error('Invalid ML service response:', error.message);
    response.status(502).json({ message: 'Prediction service returned an invalid response' });
    return;
  }

  console.error('Unexpected application error:', error.message);
  response.status(500).json({ message: 'Internal server error' });
});

export default app;
