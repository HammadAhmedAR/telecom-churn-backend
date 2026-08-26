# ML service integration boundary

## Verified ML repository state

The sibling `telecom-churn-ml-service` repository contains a trained and
serialized XGBoost pipeline at `models/churn_pipeline.joblib`, with metadata at
`models/churn_pipeline_metadata.json`. The fitted pipeline owns raw-value
preparation, missing-value handling, scaling, categorical encoding, and model
inference.

The authoritative raw feature contract contains 19 fields:

- `Tenure Months`, `Monthly Charges`, `Total Charges`
- `Gender`, `Senior Citizen`, `Partner`, `Dependents`
- `Phone Service`, `Multiple Lines`, `Internet Service`
- `Online Security`, `Online Backup`, `Device Protection`, `Tech Support`
- `Streaming TV`, `Streaming Movies`, `Contract`
- `Paperless Billing`, `Payment Method`

As of 26 August 2026, the ML repository has no FastAPI application, Pydantic
request schema, health endpoint, prediction endpoint, or HTTP response schema.
Its requirements do not include FastAPI or Uvicorn. Therefore the HTTP
prediction contract is pending and no customer-to-JSON mapper is implemented
in the backend.

## Backend infrastructure

The backend uses `ML_SERVICE_URL` and `ML_REQUEST_TIMEOUT_MS`. Its generic JSON
client provides timeout, connection failure, upstream 5xx, request 4xx, and
invalid/empty JSON error types. It does not assume endpoint paths or prediction
fields.

Before prediction integration can proceed, the ML repository must define and
implement:

1. the FastAPI startup command and port;
2. a health endpoint and response schema;
3. a prediction endpoint and Pydantic request schema for the 19 raw features;
4. the prediction response field containing class-1 probability;
5. validation/error response behavior, including handling of missing
   `Total Charges`.

Once those facts exist, the backend can add a customer payload mapper, typed
health/prediction client methods, and probability validation without
duplicating Python preprocessing.
