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

## Import IBM Telco customers

Use the standard IBM Telco Customer Churn CSV containing 7,043 customer rows.
Start PostgreSQL and run the migrations before importing:

```powershell
docker compose up -d postgres
npm run db:migrate
npm run db:import-customers -- "path/to/WA_Fn-UseC_-Telco-Customer-Churn.csv"
```

Alternatively, set `TELCO_CSV_PATH` in `.env` and run
`npm run db:import-customers`. The import stops if the customers table is
already populated. Both the compact CSV headers (`customerID`, `tenure`) and
the expanded IBM export headers (`CustomerID`, `Tenure Months`) are supported.
If the source is an Excel workbook, export its customer sheet to CSV first.
Historical `Churn`/`Churn Label` values are not imported; `churnRisk`
intentionally remains null until ML batch inference is implemented.

## ML service integration

Configure FastAPI through `ML_SERVICE_URL` and `ML_REQUEST_TIMEOUT_MS`. Start
the sibling ML service from its repository root with:

```powershell
.\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```

Then check `GET /api/health/ml` or request one non-persisted prediction with
`POST /api/customers/:customerId/predict`. Run `npm run check:ml-integration`
for the mapper, risk-boundary, and response-validation checks. The exact
contract is documented in `docs/ml-integration.md`.

Populate baseline churn scores deliberately with `npm run ml:batch`. The job
processes only customers whose `churnRisk` is null, using batches of 100 and
five concurrent ML requests by default. Use `npm run ml:batch -- --limit=10`
for a controlled sample. Successful values are real XGBoost class-1
probabilities stored to four decimal places; rerunning the normal command does
not overwrite populated scores.
