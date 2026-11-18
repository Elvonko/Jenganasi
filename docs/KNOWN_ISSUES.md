# Known Issues and Open Questions

Last updated: 2026-10-30

## Current blockers / limitations

- The public research browser could load the Buildertrend homepage, pricing guide and client portal page but returned errors for several linked feature pages. The feature matrix records the brief's scope and labels public evidence separately.
- The app now uses PostgreSQL through `DATABASE_URL`, with a checksummed `_migrations` ledger applied by `npm run db:migrate`. Local backup (`npm run db:backup`) and a verified non-destructive restore drill (`npm run db:restore`) exist, but managed provisioning, scheduled/offsite backups, deployment configuration and a production restore rehearsal are still not implemented.
- Better Auth email/password authentication and local signed-session retrieval are covered by integration tests, but email verification and production mail delivery are not configured.
- Object storage, payment-provider credentials, subscriptions and the remaining construction-management modules have not been implemented.
- The initial dashboard/project slice is not yet production-ready; deployment operations, backups, security assessment and end-to-end acceptance remain future work.

## Product questions to resolve before the affected workflows

- Company/branch hierarchy, multi-currency reporting and fiscal year rules.
- Kenyan tax/VAT calculation, retention practices, invoice numbering and accounting export requirements with qualified local review.
- M-Pesa transaction types, reconciliation process, callback retry windows and settlement accounting.
- Offline site-log scope, media upload behavior and conflict resolution.
- Subscription packaging, entitlements, trial/cancellation rules and payment provider.
- Data residency, retention, backup objectives and support access process.
- Client/subcontractor invitation, identity recovery and MFA policy.

## Risk controls

- Keep live payment processing disabled until business onboarding, provider verification, callback validation, idempotency and reconciliation are tested.
- Do not use public demo data as real customer data.
- Do not rely on client-side controls for tenant or role authorization.
- Do not describe the product as production-ready until security, backup/restore and operational acceptance are verified.
