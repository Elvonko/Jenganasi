# Implementation Status

Last updated: 2026-11-05

## Current milestone

**Milestone 1 — isolated repository, original application shell and tenant-safe company/project foundation**

| Area | Status | Evidence / next action |
|---|---|---|
| Repository boundary | Complete | Standalone Git repository initialized in `jenganasi` |
| Product research and planning | Complete (initial) | Requested documents added; public research limitations are recorded |
| Stack scaffold and original shell | Complete (initial) | Responsive Next.js, TypeScript and Tailwind application shell with dashboard and project views |
| Authentication | Complete (hardened) | Better Auth email/password with required email verification, password reset, SMTP delivery (dev log transport), trusted origins, database-backed rate limits, security headers and invitation revocation; operator MFA remains open |
| Company membership | Complete (initial) | Company onboarding, owner membership, active-company selector and role checks |
| Database/migrations | Complete (adapter + ledger) | Drizzle `node-postgres` adapter driven by `DATABASE_URL`; `npm run db:migrate` applies checksummed migrations under an advisory lock, and the app verifies migration state at startup; `npm run db:backup` and a non-destructive `npm run db:restore` drill are available |
| Project CRUD | Complete (initial) | Tenant-scoped create/read/update/archive service and pages, with transactional audit events |
| Customer records | Complete (initial) | Company-scoped customer register, create/edit/archive/restore, validation, role checks and transactional audit events; inactive records preserve project links |
| Customer-project links | Complete (initial) | Project forms select active company customers; server-side validation prevents cross-company/inactive assignment, and project detail displays the linked customer |
| Project tasks, phases, milestones and schedule dependencies | Complete (initial) | Ordered project phases with target dates, phase status and task completion progress; tasks can be assigned to phases and internal members; project-scoped predecessor links support adding/removing dependencies, cycle detection, tenant-scoped listing, role checks, database constraints and transactional audit events |
| Tenant-isolation tests | Complete (initial) | Integration test covers customer/project/task assignment company boundaries, role denial and authentication session-cookie retrieval |
| Estimates & BOQ | Complete (initial) | Tenant-scoped estimates linked to active projects, itemized quantities and unit rates, status workflow, company-scoped estimate templates that seed BOQ lines, audit events and cross-company authorization tests |
| Reports | Complete (initial) | Tenant-scoped project progress, task/milestone completion, untaxed estimate values by status, and recent audit activity; date filtering, exports and financial actuals remain future work |
| Company settings and templates | Complete (initial) | Owner/admin-editable company profile, regional defaults, reusable company-scoped project task/milestone and estimate BOQ templates, transactional audit history, and creation-time snapshots |
| Deployment / CI / health | Complete (local) | Standalone Docker image, compose stack with a separate migration step, GitHub Actions CI, and liveness/readiness endpoints; no production deployment or monitoring/alerting integration yet |
| Remaining construction modules | Not implemented | Remaining work in roadmap phases 5 onward |

## Completion policy

A screen alone does not establish a feature as complete. Each implemented slice must include persistence, backend authorization, validation, error handling and focused tests; the production deployment workflow remains incomplete until managed infrastructure and operational acceptance are in place.

## Initial research sources

- [Buildertrend homepage](https://buildertrend.com/)
- [Buildertrend client portal page](https://buildertrend.com/communication/construction-client-portal/)
- [Buildertrend public pricing guide](https://buildertrend.com/construction-software-pricing/)

Direct loads of several other public feature pages failed in the research browser. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).
