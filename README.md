# NotaryHub

NotaryHub is a multi-tenant operations platform for legal notarisation offices, branches, staff, and customers. The repository contains a React/Vite frontend, an Express API, PostgreSQL schemas, JWT authentication, role and tenant authorization, document and certificate workflows, queue operations, appointments, notifications, invoicing, uploads, analytics, and Gemini-powered document features.

## Requirements

Use Node.js 22 or newer and PostgreSQL 16 or newer. The integration suites require the PostgreSQL client command `psql`. A Gemini API key is required only for AI document drafting, chat, and OCR. SMTP credentials are required for production email delivery; local tests can set `TEST_SKIP_EMAIL_INIT=true`.

## Local setup

Copy the environment template and replace all placeholder secrets:

```bash
cp .env.example .env
npm ci
```

Create the database configured by `DATABASE_URL`, then apply the schema files in dependency order:

```bash
for schema in \
  src/db/schema.sql \
  src/db/schema_tenants.sql \
  src/db/schema_full.sql \
  src/db/schema_appointments.sql \
  src/db/schema_queue.sql \
  src/db/schema_uploads.sql \
  src/db/schema_permissions.sql \
  src/db/schema_invoices.sql \
  src/db/schema_platform_settings.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$schema"
done
```

Start the full local application with:

```bash
npm run dev
```

The local server listens on `http://localhost:3000`. It serves the Vite frontend during development and exposes the API under `/api/*`.

## Available checks

The type checker and production build are:

```bash
npm run lint
npm run build
```

The integration suites use `TEST_DATABASE_URL`. They no longer depend on a particular checkout directory or a locally running PostgreSQL cluster command. For example:

```bash
TEST_DATABASE_URL="$DATABASE_URL" bash ./test_auth.sh
TEST_DATABASE_URL="$DATABASE_URL" bash ./test_schema.sh
```

Every integration suite validates that `psql` is installed and that the configured database is reachable before changing data. If the prerequisite check fails, the script exits with an actionable message instead of producing misleading functional failures.

## Frontend/API topology

Frontend API calls use relative `/api/*` paths by default, which is correct when the frontend and API share an origin. If the API is deployed separately, set `VITE_API_BASE_URL` before building the frontend:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

The shared client applies that base URL to authentication, refresh, and all other API calls. Cross-origin deployments must configure the API's `APP_URL`, CORS, and secure cookie settings consistently.

## Vercel deployment

The repository includes `api/index.ts`, which exports the Express application for Vercel, and a `vercel.json` configuration that builds the Vite frontend and routes `/api/*` requests to the Express function. Configure the following environment variables in the Vercel project before deploying:

```text
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
APP_URL
GEMINI_API_KEY                  # required for AI features
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM
VITE_API_BASE_URL               # leave empty for the same-origin Vercel API
```

After deployment, verify both the frontend and API before attempting login:

```bash
curl -fsS https://your-domain.example/api/health
```

The health response should report `status: "healthy"` and `database: "connected"`. The Vercel deployment should also be configured with a PostgreSQL provider that supports serverless connection pooling. See the [official Vercel Express documentation](https://vercel.com/docs/frameworks/backend/express) for the runtime model and deployment constraints.

## Continuous integration

GitHub Actions is configured in `.github/workflows/ci.yml`. It installs dependencies, runs the TypeScript check, builds the frontend and backend, provisions PostgreSQL 16 as a service, applies all schemas, and runs the integration suites on pushes and pull requests targeting `main`.

## Security notes

Never commit `.env`, database credentials, JWT secrets, Gemini keys, or SMTP passwords. Use long random JWT secrets outside local testing. Review `npm audit` findings before production releases and keep the lockfile updated through deliberate dependency-maintenance pull requests.
