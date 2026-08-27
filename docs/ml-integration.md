# Express to FastAPI ML integration

## Service contract

The local ML service runs at `http://127.0.0.1:8000` and loads the serialized
XGBoost pipeline once at startup.

- `GET /health` returns `{"status":"ok","model_loaded":true}` when ready.
- `POST /predict` accepts exactly 19 raw fields and returns `prediction`,
  `label`, `churn_probability`, and `model`.

A successful prediction response has this contract:

```json
{
  "prediction": 1,
  "label": "churn",
  "churn_probability": 0.5919564962387085,
  "model": "XGBoost"
}
```

`prediction` is 0 or 1, `label` and `model` are non-empty strings, and
`churn_probability` is a finite number from 0 through 1.

The backend sends these mappings:

| Customer attribute | FastAPI field | API type |
|---|---|---|
| `tenure` | `tenure_months` | non-negative integer |
| `monthlyCharges` | `monthly_charges` | non-negative number |
| `totalCharges` | `total_charges` | non-negative number or null |
| `gender` | `gender` | category string |
| `seniorCitizen` | `senior_citizen` | `Yes` or `No` |
| `partner` | `partner` | `Yes` or `No` |
| `dependents` | `dependents` | `Yes` or `No` |
| `phoneService` | `phone_service` | `Yes` or `No` |
| `multipleLines` | `multiple_lines` | category string |
| `internetService` | `internet_service` | category string |
| `onlineSecurity` | `online_security` | category string |
| `onlineBackup` | `online_backup` | category string |
| `deviceProtection` | `device_protection` | category string |
| `techSupport` | `tech_support` | category string |
| `streamingTV` | `streaming_tv` | category string |
| `streamingMovies` | `streaming_movies` | category string |
| `contract` | `contract` | category string |
| `paperlessBilling` | `paperless_billing` | `Yes` or `No` |
| `paymentMethod` | `payment_method` | category string |

The mapper converts Sequelize decimal strings to JSON numbers. A database
`totalCharges` value of null is sent as JSON null, which FastAPI accepts and
the saved Python pipeline imputes. Express does not perform encoding, scaling,
imputation, or feature ordering for the fitted model.

## Backend responses

`POST /api/customers/:customerId/predict` returns the validated ML result using
camelCase names. `churnProbability` is the real XGBoost class-1 probability.
`riskLevel` is a CRM interpretation added by Express:

```json
{
  "customerId": "3668-QPYBK",
  "prediction": 1,
  "label": "churn",
  "churnProbability": 0.5919564962387085,
  "riskLevel": "MEDIUM",
  "model": "XGBoost"
}
```

- `LOW`: 0.00 through values below 0.40
- `MEDIUM`: 0.40 through values below 0.70
- `HIGH`: 0.70 through 1.00

`GET /api/health/ml` checks both the FastAPI process and loaded-model status.
The core `GET /api/health` endpoint remains independent of ML availability.

Connection failures, timeouts, and not-ready models map to HTTP 503. FastAPI
request rejection and invalid upstream responses map to controlled HTTP 502
responses. Python error bodies and stack traces are not returned to clients.

The single-customer endpoint remains non-persisting. It can be used to obtain a
fresh prediction without changing the stored baseline score.

## Batch inference

Run the explicit command below while PostgreSQL and FastAPI are healthy:

```powershell
npm run ml:batch
```

The job performs an ML health preflight, then uses ID-based keyset pagination
to fetch only customers where `churnRisk IS NULL`. It processes batches of 100
with five concurrent FastAPI requests by default. These values can be changed
with `ML_BATCH_SIZE` and `ML_BATCH_CONCURRENCY`.

Each valid XGBoost class-1 probability is persisted to the existing
`customers.churnRisk` `DECIMAL(5,4)` column with a conditional `IS NULL`
update. No label, risk category, model name, transformed feature, or historical
IBM churn value is stored. The database therefore retains four decimal places;
the API serializer returns that stored value as a number.

An isolated customer failure is logged and left null while other customers
continue. Connection failures, timeouts, and other systemic ML availability
failures stop the run to avoid thousands of guaranteed failures. Completed
rows remain committed, failed or unprocessed rows remain null, and the next run
selects only those null rows. No long-running transaction wraps HTTP inference.

For controlled validation, a positive limit is supported:

```powershell
npm run ml:batch -- --limit=10
```

The validated full run on 27 August 2026 produced:

| Result | Count |
|---|---:|
| Total customers | 7,043 |
| Populated `churnRisk` | 7,043 |
| Remaining null | 0 |
| LOW (`p < 0.40`) | 3,789 |
| MEDIUM (`0.40 <= p < 0.70`) | 1,508 |
| HIGH (`p >= 0.70`) | 1,746 |

Stored probabilities ranged from 0.0012 to 0.9812. A subsequent normal batch
run found zero unscored customers and performed no predictions or updates.
