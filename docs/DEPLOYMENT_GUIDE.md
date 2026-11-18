# Deployment Guide

## Status

Deployment is not configured. This guide describes prerequisites and safe deployment expectations; it is not evidence that a production deployment has occurred.

The application connects to PostgreSQL through `DATABASE_URL` using the `node-postgres` driver. Provision a managed PostgreSQL instance with TLS and backups before launch; the connection string is read at server startup and is required. Project progress uploads are currently stored in the database, with a 10 MB limit for images/documents and 20 MB for videos. Before production, move file bytes to private object storage and add a dedicated migration command, email delivery service and download authorization.

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

## Local development

Copy `.env.example` to `.env.local`, set `DATABASE_URL` to a local PostgreSQL connection string and `BETTER_AUTH_SECRET` to a random value, then run the documented development command. The schema is applied automatically on the first request in development; production should apply it in a dedicated migration step before deploying the application.
