# JengaNasi Development Roadmap

This roadmap is staged to create a secure, useful vertical slice before broad module coverage. A milestone is complete only when persistence, authorization, validation and tests exist for its stated scope.

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 1. Product discovery | Public evidence, assumptions, feature matrix, personas/workflows | Source limitations and requirement provenance are documented |
| 2. Technical/data foundation | Modular monolith, schema/migrations, tenant design, security boundaries | Migrations apply; tenant-aware constraints and auth design reviewed |
| 3. Design system and app shell | Original brand, responsive navigation, dashboard primitives | Keyboard/mobile review; no copied layouts/assets |
| 4. Company onboarding and tenancy | Registration, company, membership, invitation/role foundation | Tenant isolation tests pass for reads, writes and list/search |
| 5. Core projects | Customer/project CRUD, assignment, tasks/milestones | Company-scoped customers and project links, project CRUD, internal-member task assignment, ordered project phases with task grouping and progress, task/milestone tracking, cycle-safe task dependencies, reusable project templates, role checks, validation, audit events and tenant tests are in place |
| 6. Sales, estimates and BOQ | Lead pipeline, revisioned quote/BOQ and approval | Initial tenant-scoped estimate/BOQ workflow and reusable estimate templates are in place; revisions, client decisions and approval-to-budget traceability remain |
| 7. Budget and job costing | Budget, commitments, bills, invoices, payments and reporting | Reconciliation, rounding, idempotency and audit tests |
| 8. Procurement and inventory | Supplier, PO, receipt, stock movements | Approval limits, discrepancy handling and stock invariants |
| 9. Subcontractor and client portals | Explicit external identity, published records and decisions | Adversarial access tests across projects and tenants |
| 10. Site, quality and safety | Daily logs, inspections, defects, incidents and corrective actions | Mobile flow, attachment access and state transitions tested |
| 11. Documents and collaboration | Secure files, versions, discussions, notifications | Signed links, visibility, delivery retries and retention verified |
| 12. Reporting | Reconciled dashboards, date filters, export | Initial tenant-scoped project/task/milestone/estimate summary and audited recent activity are in place; date filters, drill-downs and exports remain |
| 13. Localization and integrations | KES/tax configuration, M-Pesa test-mode, email/storage adapters | Callback signature/idempotency tests; no live credentials in repo |
| 14. SaaS operations | Subscription entitlements, billing, platform administration | Tenant plan limits and operator actions audited |
| 15. Production readiness | Security review, load/recovery, deployment and support | Restore rehearsal, monitoring, incident process and release checklist |

## First implementation milestone

1. Establish an isolated repository and record the architecture assumptions.
2. Build an original responsive shell using JengaNasi colors and typography.
3. Implement company onboarding, authenticated memberships and tenant-aware project CRUD.
4. Add automated tests proving a user cannot read or mutate another company's project.
5. Run lint, type-check, tests and production build; document any incomplete integration or environment dependency.

Later phases and follow-on work within phase 6 are deliberately not represented as delivered by the initial shell.
