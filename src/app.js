import cors from 'cors';
import express from 'express';

import customerRouter from './routes/customer.routes.js';
import healthRouter from './routes/health.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  }),
);
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/customers', customerRouter);

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found' });
});

app.use((error, _request, response, _next) => {
  if (error.statusCode === 400) {
    response.status(400).json({ message: error.message });
    return;
  }

  console.error('Unexpected application error:', error.message);
  response.status(500).json({ message: 'Internal server error' });
});

export default app;
