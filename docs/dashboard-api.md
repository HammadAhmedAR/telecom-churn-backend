# Dashboard summary API

`GET /api/dashboard/summary` returns the PostgreSQL-backed metrics required by
the CRM dashboard. It does not require FastAPI at request time because batch
inference has already stored each customer's XGBoost class-1 probability in
`customers.churnRisk`.

```json
{
  "totalCustomers": 7043,
  "highRiskCustomers": 1746,
  "averageChurnRisk": 0.39162219224762174,
  "retentionActions": 0,
  "riskDistribution": {
    "low": 3789,
    "medium": 1508,
    "high": 1746
  },
  "highRiskQueue": [
    {
      "customerId": "7216-EWTRS",
      "contract": "Month-to-month",
      "internetService": "Fiber optic",
      "monthlyCharges": 100.8,
      "tenure": 1,
      "churnRisk": 0.9812,
      "riskLevel": "HIGH"
    }
  ]
}
```

All metrics are calculated when requested; the example above records the
validated database state on 27 August 2026 and is not hardcoded application
data. PostgreSQL performs the counts, average, filtering, ordering, and limit.
Only the five required queue projections are returned.

`averageChurnRisk`, `monthlyCharges`, and `churnRisk` are JSON numbers rather
than Sequelize DECIMAL strings. The average is null when there are no scored
customers, counts are zero when their tables are empty, and the queue is empty
when no high-risk customer exists.

Risk levels are application display categories derived from the stored model
probability:

- LOW: below 0.40
- MEDIUM: at least 0.40 and below 0.70
- HIGH: at least 0.70

`retentionActions` is the live count of rows in `retention_actions`; no fixture
or inferred action count is used. Frontend integration is outside the scope of
this endpoint.
