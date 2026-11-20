# JengaNasi

JengaNasi is an original construction-management SaaS for East African builders, contractors and project teams. It is being developed incrementally; only the company onboarding and project foundation described in [implementation status](./docs/IMPLEMENTATION_STATUS.md) is in the first milestone.

## Stack

- Next.js App Router, React and TypeScript
- Tailwind CSS and original JengaNasi interface styles
- Better Auth for email/password sessions
- Drizzle ORM with `node-postgres` against PostgreSQL (local or managed)
- Set `DATABASE_URL` to a PostgreSQL connection string before running the app

## Local development

Requirements: Node.js 20.9 or newer, npm and a PostgreSQL server.

1. Install packages:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env.local`, set `DATABASE_URL` to your PostgreSQL connection string, and set `BETTER_AUTH_SECRET` to at least 32 random characters (never commit this file):

   ```powershell
   Copy-Item .env.example .env.local
   Add-Content .env.local "BETTER_AUTH_SECRET=$([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)))"
   ```

3. Apply the migrations (this records each applied file and checksum in the `_migrations` ledger):

   ```powershell
   npm run db:migrate
   ```

4. Start the application:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000`, register an account, verify your email, create a company workspace and add a project.

Email verification is required. In development, verification and password-reset emails are printed to the dev-server console (no SMTP needed). In production, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM`; the app fails fast when a mail must be sent without SMTP in production. Password recovery is available at `/forgot-password` and `/reset-password`.

Set `BETTER_AUTH_TRUSTED_ORIGINS` to a comma-separated list of any additional origins allowed to call the auth API. Authentication rate limits are stored in the `rate_limit` table so they are shared across instances.

Migrations are **not** applied by the application at runtime. The app only verifies that every migration in `src/db/migrations/` is present and unchanged in the `_migrations` ledger, and fails fast with a clear error otherwise. Run `npm run db:migrate` as a separate deploy step before starting the app. Never edit a migration that has already been applied — add a new one instead. Use a dedicated database per environment; production should use a managed PostgreSQL service with backups and TLS.

## Backup and restore

```powershell
npm run db:backup
npm run db:restore -- .backups/<backup-file>.dump
```

`npm run db:drill` runs both steps in one command. `db:backup` writes a custom-format `pg_dump` archive under `.backups/` (gitignored). `db:restore` restores it into a temporary database, verifies the migration ledger and table count, then drops that database — it never touches your working database. To restore over the configured database, add `--replace --confirm` after first taking a fresh backup. See [deployment guide](./docs/DEPLOYMENT_GUIDE.md) for tool-path configuration and scheduling responsibilities.

## M-Pesa subscriptions

Annual Pro and Business plans are paid in KES through Safaricom Daraja STK Push from `/billing`. Configure `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE` and a publicly reachable `MPESA_CALLBACK_URL` ending in `/api/mpesa/callback`. Sandbox is the default; set `MPESA_ENVIRONMENT=production` only with live credentials.

Payments are stored in `mpesa_payment`, and the company's active plan is activated only after the callback is verified against a Daraja status query and the amount matches the invoice. Auto-renew is stored as explicit consent on `subscription`; run `npm run billing:renew` from a daily scheduler to send STK pushes for subscriptions nearing expiry (configurable with `MPESA_RENEWAL_WINDOW_DAYS`). This is a consent-based renewal using STK Push rather than Safaricom's limited native recurring-payments API; the `MpesaClient` abstraction can be extended if that API becomes available.

## Security, observability and storage

- **MFA:** owners/admins can enrol an authenticator app under Settings → Security. The `two-factor` plugin adds TOTP with backup codes. Production policy should require enrolment before granting owner/admin roles.
- **Abuse limits:** company creation (5/hour/user) and invitation creation (20/hour/user) reuse the `rate_limit` table.
- **Observability:** structured JSON logs with redaction and an `x-request-id` on every response (from `src/proxy.ts`). Client error boundaries post sanitised reports to `/api/telemetry`, which logs them with a reference ID. Set `SENTRY_DSN` and install `@sentry/node` to forward errors externally.
- **Media storage:** configure the `OBJECT_STORAGE_*` variables to store uploads in any S3-compatible service (AWS S3, R2, MinIO) and serve them via short-lived signed URLs. Without configuration, uploads continue in Postgres `bytea` (or in-memory during tests).

## In-app help

Signed-in users can open `/help` for a role-aware help centre. It shows a contractor/staff guide by default for internal members and a customer/client guide for users whose only memberships are `client`; either audience can be selected manually with the switcher. Links appear in the workspace sidebar, the client portal header and the billing page. Help content lives in `src/lib/help-content.ts`.

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Project documentation

- [Product analysis](./docs/PRODUCT_ANALYSIS.md)
- [Feature matrix](./docs/FEATURE_MATRIX.md)
- [User workflows](./docs/USER_WORKFLOWS.md)
- [Technical architecture](./docs/TECHNICAL_ARCHITECTURE.md)
- [Database design](./docs/DATABASE_DESIGN.md)
- [Development roadmap](./docs/DEVELOPMENT_ROADMAP.md)
- [Deployment guide](./docs/DEPLOYMENT_GUIDE.md)
- [API documentation](./docs/API_DOCUMENTATION.md)
- [Known issues](./docs/KNOWN_ISSUES.md)
