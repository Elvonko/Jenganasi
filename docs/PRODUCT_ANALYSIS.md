# JengaNasi Product Analysis

## Purpose and scope

JengaNasi is a multi-tenant construction operations platform for residential builders, general contractors, remodelers, developers, subcontractors and their clients. The initial market is Kenya and East Africa; international use must be possible without baking Kenyan assumptions into the data model.

The product brief is the source of JengaNasi requirements. Buildertrend is used only as a public product-category reference. JengaNasi must have its own brand, workflows, copy and interface.

## Public-product observations

Reviewed on 30 October 2026:

- The [Buildertrend homepage](https://buildertrend.com/) publicly groups its offering into sales management, project management, financial management and communication management. Its navigation links to CRM, client portal, proposals, change orders, plans/specifications, schedules, bids, estimates, job-costing budgets, daily logs, subcontractor portal and integrations.
- The homepage describes schedules, change orders, daily logs and punch lists as connected project workflows, and promotes job costing, forecasting, work-in-progress reporting and bill capture as financial capabilities. These are vendor descriptions, not independently verified implementation details.
- The public [client portal page](https://buildertrend.com/communication/construction-client-portal/) describes project updates, messaging, schedules, daily logs, photos, delay flags, selections, invoices and payment collection as collaboration surfaces.
- The public [pricing guide](https://buildertrend.com/construction-software-pricing/) describes Buildertrend's pricing as a custom quote, with consultation needed for exact cost. It does not publish a universal fixed price on that page.
- Individual feature pages were intermittently unavailable to the research browser. No restricted service, account or source code was accessed. The vendor claims above are deliberately limited to accessible public marketing material.

## Product implications for JengaNasi

1. Treat the project as connected business operations, not a collection of unrelated CRUD screens. Estimates, approved variations, budgets, commitments and actual costs must reconcile.
2. Provide distinct experiences for company staff, clients and subcontractors while keeping a shared, permission-checked project record.
3. Design for mobile site use, low-bandwidth conditions and auditability from the start.
4. Make KES, metric units, configurable tax, local payment rails and regional date/number formats first-class configuration, not assumptions embedded in arithmetic.
5. Start with a narrow, production-shaped vertical slice. Do not market a module as complete until its persistence, authorization, error handling and key workflows are tested.

## User groups and core outcomes

| User group | Primary outcome |
|---|---|
| Company owner / administrator | Control company setup, people, roles, settings and business performance |
| Project manager | Keep scope, schedule, budget, approvals and communications aligned |
| Site supervisor | Record progress, workforce, deliveries, delays, photos and issues from site |
| Accountant | Reconcile commitments, bills, receipts, invoices, payments and job costs |
| Procurement officer / storekeeper | Source, receive, issue and account for project materials |
| Sales representative | Qualify leads, follow up and turn approved proposals into work |
| Subcontractor | See assigned scope, schedule, documents and claims for their work only |
| Client | Follow assigned projects, review authorized information and make decisions |
| SaaS operator | Operate tenant lifecycle and platform health without unrestricted routine access to tenant data |

## Product boundaries and assumptions

- A company is the tenant boundary. A user may belong to more than one company through explicit memberships.
- Project access is narrower than company membership when a role or project assignment requires it.
- Monetary amounts are stored as integer minor units with an ISO currency code; conversions and rounding rules are explicit.
- Tax rates and tax calculation methods are company-configurable and versioned for financial documents.
- M-Pesa, banks, messaging, email and object storage are integrations. Credentials stay server-side and no live payment is enabled without owner configuration and provider verification.
- Pricing and subscription packaging are JengaNasi decisions. Buildertrend pricing is not copied.
- This initial analysis is not a legal, tax, accounting or security certification.

## Product success measures

- A new company can onboard staff and start a project without cross-tenant exposure.
- Teams can trace a project from estimate and approval through budget, procurement and actual costs.
- Clients and subcontractors can complete assigned actions without receiving broad company access.
- Site staff can record a daily log on a phone with recoverable validation and upload errors.
- Financial totals reconcile to their source line items and changes have an audit trail.
- Operational flows pass role and tenant-isolation tests before release.

## Research limitations

This is an initial public-site review, not exhaustive competitive research. Public marketing pages describe categories and examples but do not reveal internal workflows, complete product behavior, private pricing, API contracts or security design. The feature matrix therefore labels the requested JengaNasi capabilities as requirements and makes no claim that every one is present in the reference product.
