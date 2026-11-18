# Deployment Guide

## Status

Deployment is not configured. This guide describes prerequisites and safe deployment expectations; it is not evidence that a production deployment has occurred.

The application connects to PostgreSQL through `DATABASE_URL` using the `node-postgres` driver. Provision a managed PostgreSQL instance with TLS and backups before launch; the connection string is read at server startup and is required. Migrations are applied by the separate `npm run db:migrate` command, which records each file and its checksum in the `_migrations` ledger under an advisory lock. Run it as a deploy step before starting app instances; the app itself only verifies migration state at startup. Project progress uploads are currently stored in the database, with a 10 MB limit for images/documents and 20 MB for videos. Before production, move file bytes to private object storage and add email delivery and download authorization.

## Required configuration

Use the deployment platform's secret manager for database credentials, authentication/session secret, email, object storage, monitoring and payment credentials. Never commit production values. Keep `.env.local` ignored and provide only a placeholder `.env.example`.

Configure separate development, preview and production databases and provider credentials. Use TLS for application and database connections. Do not use production customer data in previews.

## Release sequence

1. Build and run lint, type-check, unit/integration and tenant-isolation tests.
2. Review migration SQL and backup the target database.
3. Apply backward-compatible migrations using a dedicated migration identity.
4. Deploy the application with least-privilege runtime credentials.
5. Run health checks and a tenant-isolation smoke test with synthetic accounts.
6. Observe error, latency, queue and integration metrics; roll back the application or use a reviewed forward-fix if data migration is irreversible.

## Production essentials before launch

- Managed PostgreSQL with encryption, network restrictions, automated backups and tested restore procedures.
- Private object storage, lifecycle policy, virus/content validation and short-lived signed downloads.
- HTTPS, secure cookies, rate limits, email verification, account recovery and operator MFA.
- Structured logs with secrets/PII redaction, request IDs, error monitoring and alerting.
- Durable background queue/outbox, retry limits, dead-letter inspection and idempotent provider callbacks.
- Documented incident response, access review, support procedure, privacy and retention policy.
- Payment integration remains in sandbox until provider approval, reconciliation and finance controls are signed off.

## Backup and restore

`npm run db:backup [file]` writes a custom-format `pg_dump` archive (default: `.backups/jenganasi-<timestamp>.dump`). The `.backups/` directory is gitignored. The Postgres client tools are resolved from `PG_DUMP_PATH` / `PG_RESTORE_PATH`, `PG_BIN_DIR`, common installation paths, or `PATH`. Passwords are supplied through `PGPASSWORD` rather than the command line.

`npm run db:drill` backs up to `.backups/latest.dump` and immediately runs the drill. `npm run db:restore -- <file>` performs a **non-destructive restore drill**: it creates a temporary database, restores the archive, verifies the `_migrations` ledger and table count, and drops the temporary database. Use this regularly to prove a backup is restorable. To restore over the configured database, use `npm run db:restore -- <file> --replace --confirm` — this is destructive and should follow a fresh backup.

Automated scheduling, offsite storage and retention remain the deployment platform's responsibility.

## Local development

Copy `.env.example` to `.env.local`, set `DATABASE_URL` to a local PostgreSQL connection string and `BETTER_AUTH_SECRET` to a random value. Run `npm run db:migrate` once before starting the app; the app only verifies migration state at startup.
