# Internal CRM authentication

Authentication uses a short login flow for CRM users. It does not provide
registration, refresh tokens, OAuth, or advanced role authorization.

Configure these values in the ignored local `.env` file:

```env
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
DEMO_USER_NAME=Demo Account Manager
DEMO_USER_EMAIL=manager@example.com
DEMO_USER_PASSWORD=change_me_locally
```

Use a long private value for `JWT_SECRET` and a local password that is not
committed. Create the demo account idempotently with:

```powershell
npm run db:seed-demo-user
```

The password is stored only as a bcrypt hash with cost 10. Running the command
again detects the existing email and does not create a duplicate.

Log in with `POST /api/auth/login`:

```json
{
  "email": "manager@example.com",
  "password": "your local demo password"
}
```

A successful response contains an expiring JWT and the safe user fields `id`,
`name`, `email`, and `role`. Send the token to protected routes as:

```http
Authorization: Bearer <token>
```

All `/api/customers` and `/api/dashboard` routes require a valid token. Login,
`GET /api/health`, and `GET /api/health/ml` remain public. Valid tokens attach
`{ id, role }` to `req.user`, allowing future retention actions to use the
authenticated user's ID rather than accepting an arbitrary user ID.
