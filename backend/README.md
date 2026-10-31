# Brightloop backend

The backend uses PostgreSQL 16 and Prisma. Run these commands from `backend/`.

## Local setup

1. Install Node.js 20 or newer and Docker Desktop.
2. Install packages and create local configuration:

   ```powershell
   npm install
   Copy-Item .env.example .env
   ```

3. Change `POSTGRES_PASSWORD`, `DATABASE_URL`, and both JWT secrets in `.env`.
   Set `SEED_ADMIN_PASSWORD` to a development-only password with at least 16
   characters.
4. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

5. Apply the checked-in migrations, generate the Prisma Client, and seed sample
   records:

   ```powershell
   npm run prisma:migrate:deploy
   npm run prisma:generate
   npm run db:seed
   ```

6. Start the API:

   ```powershell
   npm run start:dev
   ```

The API listens on port 3000 by default. The readiness endpoint is
`http://localhost:3000/api/v1/health`; it verifies database connectivity.
Development CORS allows both `http://localhost:5173` and
`http://127.0.0.1:5173`; set `CORS_ORIGINS` to the exact trusted frontend
origins when deploying.

## API and authentication

The REST API is rooted at `/api/v1`. Authenticated requests use a bearer access
token and select their workspace with `X-Workspace-Id`. JSON responses use a
`data` property; paginated collection responses also include `meta`.

`POST /api/v1/auth/login` accepts `{ "email": "...", "password": "..." }`,
returns the access token and user/workspace context, and sets an HttpOnly,
SameSite=Lax refresh cookie. Send the access token as a bearer token; use
`POST /api/v1/auth/refresh` to rotate the cookie and obtain a fresh access
token, and `POST /api/v1/auth/logout` to revoke the refresh session.
Passwords are stored as salted scrypt hashes. Self-service account creation is
not enabled; invited users register through
`POST /api/v1/workspaces/invitations/accept` with an invitation token, full name,
and password.
Login is limited to five requests per minute, invitation acceptance to ten per
minute, refresh to thirty per minute, and password recovery to five requests per
hour (forgot) or per minute (reset). The in-memory throttle store is suitable
for one process; multi-instance deployments should configure a shared store.

The frontend Axios client supports the API path, credentialed refresh cookie,
in-memory access token, login, refresh, logout, and invitation registration.
Set `VITE_API_BASE_URL` when the backend is hosted somewhere other than
`http://localhost:3000/api/v1`.

The API includes authentication, users and preferences, workspaces and member
invitations, products and plans, customers, quotations, subscriptions,
invoices, discounts, payments, dashboard and reports, settings, notifications,
and search.

Password reset links use `PASSWORD_RESET_URL`. In development, the link is
written to the backend log. Production startup requires `PASSWORD_RESET_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` to
deliver reset emails.

## Database commands

- `npm run prisma:validate` validates the Prisma data model.
- `npm run prisma:migrate:deploy` applies checked-in migrations in a deployed
  environment.
- `npm run db:seed` idempotently adds/updates demo workspace, user, products,
  variants, plans, customers, and tax settings.
- `npm run db:smoke` tests the configured database connection and performs
  create/read/update/delete checks, then removes its temporary records.
- `npm run prisma:studio` opens Prisma Studio.

Database credentials are read from `DATABASE_URL`; do not commit `.env`.
The development seed administrator uses the email and password configured by
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. The seed stores a salted scrypt
hash, not the plaintext password.
