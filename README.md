# NotaryHub

NotaryHub is a multi-tenant notary-office operations platform. It provides tenant and branch administration, employee and customer portals, document workflows, appointments, queue management, notifications, invoicing, platform settings, audit logging, JWT authentication, and PostgreSQL-backed file metadata with local or mounted file storage.

## Prerequisites

Run NotaryHub with Node.js 20 or newer, npm, PostgreSQL 15 or newer, and a writable upload directory. A local development database can use the credentials referenced by the regression scripts, but production deployments must use unique credentials and managed secrets.

## Local setup

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

The development server serves the Vite frontend and API at `http://localhost:3000`. For API-only test runs, set `API_ONLY=true`; for production, build first with `npm run build` and start with `npm start`.

## PostgreSQL and migrations

The application uses PostgreSQL through the `pg` driver. Database changes are managed by `node-pg-migrate`; the migration history is recorded in `pgmigrations`, and NotaryHub also maintains an explicit `schema_version` table for operator visibility.

The first migration preserves the existing schema dependency order:

1. `src/db/schema.sql` — extensions, auth tables, enum foundations, and shared triggers.
2. `src/db/schema_tenants.sql` — branches and employees.
3. `src/db/schema_full.sql` — company profiles, customers, documents, subscriptions, payments, audit logs, and notifications.
4. `src/db/schema_appointments.sql` — appointments.
5. `src/db/schema_queue.sql` — queue tickets.
6. `src/db/schema_uploads.sql` — upload metadata.
7. `src/db/schema_permissions.sql` — dynamic permissions.
8. `src/db/schema_invoices.sql` — customer invoices and invoice items, including the invoice permission enum extension.
9. `src/db/schema_platform_settings.sql` — platform feature switches.

Run migrations with `npm run migrate`. Never apply individual schema files manually in production. To inspect the current history, query `SELECT * FROM pgmigrations ORDER BY id;` and `SELECT * FROM schema_version ORDER BY version;`. The legacy SQL files remain as migration inputs and should only be changed together with a new migration that describes the resulting upgrade.

## Environment variables

The minimum production configuration is shown below. Secrets must be supplied through the deployment secret manager and must not be committed.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_ACCESS_SECRET` | Yes | Secret for short-lived access tokens. |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh-token signing and rotation. |
| `APP_URL` | Yes | Canonical frontend/API origin used by CORS and generated links. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `NODE_ENV` | No | Use `production` to enable secure cookies and production serving. |
| `UPLOAD_DIR` | No | Writable file-storage root; defaults to `./uploads`. Use a persistent volume in production. |
| `JWT_ACCESS_EXPIRES` | No | Access-token lifetime; defaults to `15m`. |
| `JWT_REFRESH_EXPIRES` | No | Refresh-token lifetime; defaults to `7d`. |
| `GEMINI_API_KEY` | No | Enables the protected AI drafting, chat, and OCR endpoints. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | No | Outbound email and verification/reset messages. |
| `BCRYPT_ROUNDS` | No | Password hashing cost; use the environment default unless load testing requires a deliberate change. |
| `TOTP_ISSUER` | No | Issuer label for authenticator-app enrollment. |
| `EMAIL_VERIFY_TTL`, `PASSWORD_RESET_TTL` | No | One-time token lifetimes. |
| `API_ONLY` | No | Set to `true` for API-only CI/test mode. |
| `TEST_SKIP_EMAIL_INIT`, `TEST_SKIP_RATE_LIMIT` | No | Test-only switches; never set them in production. |

## Seed users and test data

The regression fixtures expect the development seed data supplied with the repository. Common development accounts include `admin@notaryhub.local`, `admin@bosaso-notary.com`, `admin@puntland-legal.com`, and `m.vance@bosaso-notary.com`. The fixture password is `Admin@2026!`. Treat these credentials as development-only and rotate or remove them before deployment.

## Test suites

Each logical fix has a dedicated test script following the repository convention. Run the full regression suite after every change:

```bash
for test in test_auth.sh test_tenants.sh test_documents.sh test_queue.sh \
  test_notifications.sh test_permissions.sh test_invoices.sh \
  test_certificates.sh test_platform_settings.sh test_schema.sh; do
  bash "$test" || exit 1
done
```

The scripts require a running PostgreSQL instance and, for API tests, a server started with the test environment variables. `npm run lint` performs the TypeScript check, while `npm run build` validates both the Vite frontend and bundled server.

## Architecture overview

The HTTP process is `server.ts`, an Express application that loads environment configuration, applies CORS, Helmet security headers, JSON parsing, cookies, general API rate limiting, health checks, and route modules. Authentication uses short-lived bearer access tokens and a rotated, database-backed refresh token in an `HttpOnly`, `SameSite=Lax` cookie. Refresh requests also require a same-origin double-submit CSRF token.

The frontend is a Vite React application under `src/`. `SaaSDashboard.tsx` owns authentication and role selection, and role portals are loaded with `React.lazy()` so an authenticated user does not download every portal bundle. API wrappers under `src/api/` call the Express routes under `src/routes/`; database access is concentrated in `src/db/` and feature services under `src/services/`.

File uploads are validated by server-side magic bytes for PDF, JPEG, and PNG content. The file is written before its metadata row is inserted, and any failed insert triggers a compensating delete. Downloads are tenant- and role-scoped and return `X-Content-Type-Options: nosniff`.

## Deployment

Build in a clean environment with `npm ci && npm run build`. Provision PostgreSQL, set the required secrets, mount a persistent directory at `UPLOAD_DIR`, run `npm run migrate`, and start with `NODE_ENV=production npm start`. Place the service behind TLS termination and a reverse proxy that forwards the original scheme and client IP correctly. Set `APP_URL` to the public HTTPS origin, configure a restrictive CORS origin, and monitor `/api/health` plus application logs.

Do not use the test switches in production. Back up PostgreSQL and the upload volume together, because the database stores upload metadata and the filesystem stores the corresponding bytes. Deploy migrations before starting application instances that depend on new tables or columns, and roll out application code only after the migration succeeds.

## Security and operational rules

Production refresh cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`; the readable CSRF cookie is paired with an `X-CSRF-Token` header on refresh. Helmet supplies baseline security headers, while the API limiter protects general `/api` traffic in addition to the stricter authentication limiters. Access checks remain tenant-scoped in route handlers and services.

Never add UI controls for integrations that have no backend implementation. If an external provider is out of scope, the capability should be absent or explicitly unavailable rather than represented by a non-persistent toggle.
