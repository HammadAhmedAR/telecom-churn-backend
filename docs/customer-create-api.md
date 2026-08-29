# Create customer API

`POST /api/customers` creates a model-compatible CRM customer and requires an
`Authorization: Bearer <token>` header.

The request must contain exactly these fields:

```text
customerId, gender, seniorCitizen, partner, dependents, tenure,
phoneService, multipleLines, internetService, onlineSecurity, onlineBackup,
deviceProtection, techSupport, streamingTV, streamingMovies, contract,
paperlessBilling, paymentMethod, monthlyCharges, totalCharges
```

`totalCharges` may be null, including for a new subscriber with `tenure: 0`.
Boolean and category values must match the existing Customer model. Internal
IDs, timestamps, churn labels, risk levels, prediction fields, and
`churnRisk` are rejected.

After validation and a duplicate-ID check, the backend sends the complete
temporary customer profile through the existing 19-field ML mapper and
FastAPI/XGBoost prediction path. Only after a valid probability is returned is
the customer inserted with that probability in `customers.churnRisk`.

Success returns HTTP 201 using the normal customer serializer. An existing
`customerId` returns HTTP 409 with `Customer ID already exists`. Validation
errors return HTTP 400. If FastAPI is unavailable, the request returns HTTP 503
and no customer row is created.
