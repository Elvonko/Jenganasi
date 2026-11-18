# JengaNasi Technical Architecture

## Initial decisions

| Concern | Initial direction | Rationale / constraint |
|---|---|---|
| Web application | Next.js App Router, React, TypeScript | One codebase for responsive staff/client experiences and server-rendered pages |
| UI | Tailwind CSS, accessible reusable components, original JengaNasi tokens | Matches the requested stack and avoids reproducing reference-product layouts |
| API | Typed server actions for same-origin UI mutations; Route Handlers for external/mobile/provider APIs | Keep authorization close to data operations; expose versioned REST where clients need it |
| Identity | Server-managed secure sessions, verified email and password hashing via a maintained auth library | Avoid a home-grown identity implementation; support MFA readiness and account recovery |
| Database | PostgreSQL with explicit migrations, foreign keys, transactions and tenant-aware indexes, accessed through `DATABASE_URL` | Relational workflows, auditable constraints and production portability across local and managed PostgreSQL |
| Data access | Typed ORM/query layer; every tenant query carries an authorized company context | Centralize schema and migrations without treating ORM usage as tenant authorization |
| File storage | Private S3-compatible bucket; metadata in PostgreSQL; short-lived signed downloads | Keep file bytes out of application database and protect project documents |
| Background work | Durable job queue/outbox for email, notifications, exports and payment events | Retryable integration work without duplicate business effects |
| Payments | Server-only provider adapters, beginning with test-mode M-Pesa Daraja after core ledger flows | Credentials and callback verification remain server-side |
| Observability | Structured redacted logs, request IDs, error monitoring and audit events | Diagnose failures without logging passwords, tokens or payment secrets |

The data layer uses the Drizzle `node-postgres` driver against the PostgreSQL instance configured by `DATABASE_URL`, so the same code runs against local and managed PostgreSQL. Provisioning, TLS, backups and a deployment-time migration process remain operational work rather than application-code concerns. Package/library choices must be verified against installed versions before implementation. Do not adopt a framework-specific convenience layer as the sole security boundary.

## Application layers

1. **Presentation**: responsive pages, forms and tables; never decide access based on UI state.
2. **Request boundary**: validate session, input schema, rate limits and Origin/CSRF requirements.
3. **Application services**: implement domain transitions (approve estimate, post receipt, reconcile payment) and require an authorized company/project context.
4. **Data layer**: parameterized queries, explicit tenant filters, foreign keys and transactions.
5. **Integration adapters**: email, object storage, M-Pesa, bank, WhatsApp and future mobile APIs.
6. **Outbox/worker**: durable delivery and callback processing with idempotency keys and bounded retries.

## Tenant and authorization model

- Every tenant-owned entity includes `company_id`; composite keys/foreign keys should prevent a child from referencing another tenant's parent.
- A request's active company is accepted only if the authenticated user has a current membership. Client input is a selector, not proof of membership.
- Authorization checks combine company membership, role/permission, project assignment, record state and publication status.
- Client and subcontractor users use explicit relationships and restricted serializers/read models, not internal employee roles.
- Tenant-scoped repositories require company context and should not expose unscoped `findById` helpers to route code.
- Add PostgreSQL row-level security as defense in depth after service-level checks and connection pooling behavior are verified. It is not a substitute for application checks.
- Cross-tenant administration is exceptional, separately authorized, reason-coded and audited.

## Financial correctness

- Store money as integer minor units plus ISO-4217 currency; reject cross-currency totals unless a dated exchange rate is explicit.
- Use decimal quantity/rates with declared precision and deterministic rounding at defined boundaries.
- Snapshot tax identity/rate/method on issued financial documents.
- Separate estimate, approved budget, commitment, accrued/actual cost, invoice, payment and retention values.
- Use transactions and idempotency keys for postings and callbacks. Corrections use reversal/adjustment events, not destructive edits.

## Security and operations

- Hash passwords with an established password hashing implementation; protect sessions with secure, HttpOnly, SameSite cookies and rotation/revocation.
- Validate all external input; use parameterized SQL; escape output; use CSRF/Origin controls for cookie-authenticated mutations.
- Enforce tenant and role authorization on every read, mutation, export and signed-file URL.
- Apply rate limits to authentication, invitation, upload and public callback endpoints.
- Restrict uploads by size and content type, scan where available, store privately and use opaque object keys.
- Keep secrets in deployment secret storage; never expose keys in client bundles, logs or committed env files.
- Maintain audit records for membership, approval, financial, permission and operator events.
- Treat audit records as append-only; application mutations should write their audit event in the same transaction as the business change.
- Backups must be encrypted, access-controlled and periodically restore-tested.

## Deployment shape

Start with a modular monolith and managed PostgreSQL. Separate workers only when throughput or reliability needs justify it. Use environment-specific configuration, automated migrations with review, health checks, TLS, backups and staged rollout. Keep an API boundary suitable for later mobile clients.

## Architecture decisions to revisit

- Company/branch hierarchy and whether branches need separate permissions or ledgers.
- Tenant isolation via shared database/row-level security versus schema/database per large tenant.
- Offline site capture and conflict resolution requirements.
- Event/ledger detail required for accounting exports and statutory reporting.
- Queue, email, storage, monitoring and deployment vendors.
- SaaS entitlement and pricing model after customer discovery.
