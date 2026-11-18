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

5. Open `http://localhost:3000`, register an account, create a company workspace and add a project.

Migrations are **not** applied by the application at runtime. The app only verifies that every migration in `src/db/migrations/` is present and unchanged in the `_migrations` ledger, and fails fast with a clear error otherwise. Run `npm run db:migrate` as a separate deploy step before starting the app. Never edit a migration that has already been applied — add a new one instead. Use a dedicated database per environment; production should use a managed PostgreSQL service with backups and TLS.

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
