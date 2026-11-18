# JengaNasi Database Design

PostgreSQL is the target relational store. This is the initial logical design; schema migrations and domain workflows are authoritative as they are implemented. All IDs should be opaque UUIDs, timestamps UTC, and tenant-owned relationships constrained by `company_id`.

## Identity and tenant

| Entity | Important fields and constraints |
|---|---|
| `users` | `id`, normalized unique `email`, password hash managed by identity provider, verification/MFA state, created/updated timestamps |
| `companies` | `id`, legal/display name, country, currency, timezone, date/number format, status, created/updated timestamps |
| `branches` | `id`, `company_id`, name, location, status; unique company/name where appropriate |
| `memberships` | `id`, `company_id`, `user_id`, role/status, created/revoked timestamps; unique active company/user |
| `invitations` | company, normalized email, role, token hash, expiry, inviter, accepted/revoked timestamps |
| `roles` / `permissions` | system-defined permission keys and optional company-defined roles; no role name alone is a security check |
| `audit_events` | tenant, actor, action, resource type/id, timestamp, request ID, redacted before/after metadata, reason |
| `subscriptions` / `plans` | provider reference, status, period and entitlement snapshot; provider secrets are not stored here |

## Projects and operating records

`projects` belongs to a company and may reference a branch and customer. It has a stable project number, name, location, status, currency, dates and optional manager. The initial child relations are:

- `project_members` and external `project_participants` with explicit party type, role and state.
- `phases`, `tasks`, `task_dependencies`, `milestones` and `resource_assignments`.
- `project_notes`, `threads`, `messages`, `comments` and `notifications`.
- `daily_logs`, `log_attendance`, `log_deliveries`, `log_weather`, `log_delays` and `log_attachments`.
- `documents`, `document_versions`, `folders`, `document_shares` and `approvals`.
- `inspections`, `checklist_items`, `issues`, `incidents`, `risks` and `corrective_actions`.

For tenant consistency, use a unique `(company_id, id)` key on parent entities and composite foreign keys such as `(company_id, project_id)` from children. Do not allow arbitrary project IDs to cross company boundaries.

## Sales, estimates and scope changes

- `customers` and `contacts` are tenant-scoped; contacts may relate to more than one customer through a join table.
- `leads`, `lead_activities`, `opportunities`, `follow_ups` and `proposals` store pipeline history and ownership.
- `estimates` have immutable `estimate_revisions`; each revision has `estimate_lines` with unit, quantity/rate precision, component costs, markup, discounts, tax snapshot and calculated total.
- `boqs` have immutable `boq_revisions`, `boq_sections` and `boq_items`. BOQ imports are staged and validated before applying.
- `selections` and `selection_options` record the presented catalog item and client decision.
- `change_orders` have revisioned lines, schedule impact, status and approval events; only an approved revision can affect authorized budget/scope.
- Conversions reference source revision IDs; avoid copying totals without provenance.

## Finance, procurement and inventory

- `cost_codes` and `budget_versions` define planned allocations.
- `purchase_orders`, `purchase_order_revisions`, `purchase_order_lines`, `supplier_bills`, `customer_invoices`, `payments` and `retentions` represent commercial documents and lifecycle.
- `financial_events` record posted commitments, actuals, receivables, settlements, fees and reversals. Posted events are append-only.
- `suppliers`, `supplier_quotes`, `materials`, `units_of_measure`, `goods_receipts`, `stock_locations` and `stock_movements` support purchasing and stock control.
- Each financial or stock record includes tenant and relevant project/cost-code references; amounts carry currency; quantities carry normalized units.
- Payment/provider events include provider name, external event ID, idempotency key and verification status. Unique constraints prevent duplicate posting.

## Subcontractor and customer access

- `subcontractors` are tenant supplier/business records, not user accounts. `subcontractor_users` links identities to businesses.
- `subcontractor_assignments` links company, project, subcontractor, scope and dates.
- `subcontractor_claims` link to assignments and supporting documents.
- Client identity is linked to customer/project participants; a user may see only specifically published project records.

## Localization and financial conventions

- Currency: ISO-4217 code plus integer minor units for settled monetary amounts; maintain decimal precision for estimate rates/quantities.
- Units: company-configurable display labels mapped to normalized unit identifiers and conversion rules.
- Tax: company tax profiles with effective dates; issued records retain a tax snapshot.
- Dates: UTC storage; company timezone for display and date-only operational fields.
- Avoid floating-point arithmetic for money.

## Indexing, lifecycle and retention

- Index tenant-first lookup paths: `(company_id, status)`, `(company_id, project_id, created_at)`, `(company_id, due_date)`.
- Unique constraints apply within company for human-readable project numbers, codes and slugs.
- Add full-text search only over authorized materialized/search records; apply tenant and permission filters before returning matches.
- Soft deletion is for recoverable setup/catalog records only. Financial approvals, audit events, stock movements and issued document revisions are retained and corrected through compensating records.
- Define retention, privacy export/deletion and backup policies before production; legal retention requirements vary by market.

## Migration and transaction rules

1. Every schema change is versioned, reviewed and reversible where safe.
2. Foreign keys and unique constraints express business invariants in the database.
3. Multi-record domain transitions (approval, receiving, payment reconciliation) execute in transactions.
4. Database roles are least-privilege; migration credentials are separate from runtime credentials.
5. Seed data contains no real people, secrets or production customer data.
