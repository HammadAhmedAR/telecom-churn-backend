# telecom-churn-backend
Node.js and Express backend for the Intelligent CRM System with Integrated Predictive Analytics for Telecom Churn Management.

## Local development

1. Copy `.env.example` to `.env` and set the database password.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install dependencies with `npm install`.
4. Start the API with `npm run dev`.

The health endpoint is available at `GET http://localhost:5000/api/health`.

Database schema changes are managed with Sequelize CLI migrations. Use
`npm run db:migrate` once migrations are added.
