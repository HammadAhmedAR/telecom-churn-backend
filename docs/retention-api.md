# Retention actions API

Retention actions are internal CRM records selected by authenticated staff.
They do not modify customer services, generate recommendations, or contact the
customer. Every route requires `Authorization: Bearer <token>`.

Valid action types are:

- `Offer Loyalty Discount`
- `Offer Contract Upgrade`
- `Add Tech Support Package`
- `Assign Account Manager`
- `Schedule Retention Follow-Up`

The only supported status is `Logged`, which is also the default. Notes are
optional, trimmed, and limited to 500 characters.

## Create an action

`POST /api/customers/:customerId/retention-actions` uses the telecom customer
identifier from the URL and the employee ID from the JWT. Client-supplied
`userId` and other unsupported fields are rejected.

```json
{
  "actionType": "Offer Loyalty Discount",
  "notes": "Customer requested a lower monthly rate.",
  "status": "Logged"
}
```

Success returns HTTP 201 with the shared action shape:

```json
{
  "id": 1,
  "customerId": "3668-QPYBK",
  "actionType": "Offer Loyalty Discount",
  "notes": "Customer requested a lower monthly rate.",
  "status": "Logged",
  "performedBy": {
    "id": 5,
    "name": "Demo Account Manager",
    "role": "account_manager"
  },
  "createdAt": "2026-08-27T00:00:00.000Z"
}
```

## Read actions

- `GET /api/customers/:customerId/retention-actions` returns that customer's
  newest actions.
- `GET /api/retention-actions` returns the global newest-action list.

Both support `page` and `limit`, defaulting to 1 and 10, with a maximum limit
of 100. The global route also supports case-insensitive telecom customer-ID
`search`, exact `actionType`, and exact `status=Logged` filters. Filters combine
with AND.

Responses contain `data` and `pagination` with `page`, `limit`, `total`, and
`totalPages`. Customer and user associations are loaded with Sequelize joins;
user passwords and internal customer IDs are never returned.

The dashboard summary counts the same `retention_actions` table, so its
`retentionActions` metric updates automatically after a successful creation.
