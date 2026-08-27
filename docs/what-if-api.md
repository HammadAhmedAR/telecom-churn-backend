# What-If simulation API

`POST /api/customers/:customerId/simulate` requires a CRM JWT and calculates a
hypothetical churn probability without changing the customer or stored
baseline risk.

The request must contain at least one effective change and may contain only:

- `contract`: `Month-to-month`, `One year`, or `Two year`
- `monthlyCharges`: a finite non-negative JSON number
- `techSupport`: `Yes`, `No`, or `No internet service`
- `onlineSecurity`: `Yes`, `No`, or `No internet service`

```json
{
  "contract": "One year",
  "monthlyCharges": 65.5,
  "techSupport": "Yes",
  "onlineSecurity": "Yes"
}
```

Fields are optional individually. Only fields present in the request appear in
`overrides`. For customers without internet service, the two internet add-ons
must remain `No internet service`; that category is rejected for customers who
do have internet service.

The backend merges validated overrides into a temporary plain copy of the real
customer, maps the complete 19-feature profile through the existing ML mapper,
and obtains the simulated probability from the trained XGBoost service.

```json
{
  "customerId": "3668-QPYBK",
  "baseline": {
    "churnRisk": 0.592,
    "riskLevel": "MEDIUM"
  },
  "simulation": {
    "churnRisk": 0.07592320442199707,
    "riskLevel": "LOW"
  },
  "riskChange": -0.5160767955780029,
  "overrides": {
    "contract": "Two year",
    "monthlyCharges": 65,
    "techSupport": "Yes",
    "onlineSecurity": "Yes"
  },
  "model": "XGBoost"
}
```

The baseline is the stored four-decimal CRM probability. `riskChange` is
`simulation.churnRisk - baseline.churnRisk`; it is a model comparison, not a
causal explanation. LOW, MEDIUM, and HIGH use the existing application display
thresholds.

Simulation never saves the temporary profile, overwrites `churnRisk`, creates
a retention action, or writes simulation history.
