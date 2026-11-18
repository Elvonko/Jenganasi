# JengaNasi User Workflows

These are target workflows for JengaNasi. They combine the project brief with the broad public product categories observed in the reference; they do not assert undocumented reference-product behavior.

## 1. Company onboarding and team access

1. A user registers with an email and strong password.
2. The user creates a company profile, choosing country, currency, timezone, date/number format and tax defaults.
3. The creator becomes the company owner through a membership record.
4. The owner invites colleagues, assigns least-privilege roles and optionally limits staff to projects.
5. Invited users accept with their own identity; removing a membership revokes access without deleting historical business records.
6. Every endpoint derives tenant membership from the authenticated server session, not a client-supplied tenant ID alone.

## 2. Lead to approved project

1. Sales captures a lead and contact details, source, status, next action and assigned representative.
2. Follow-ups create reminders and a communication timeline.
3. A qualified opportunity receives an estimate/BOQ and revisioned proposal.
4. The client can view only the issued proposal and explicitly shared documents.
5. Approval records who approved which revision and when; rejection returns the opportunity for follow-up.
6. Conversion creates a customer/project and starting budget by referencing approved scope rather than copying untraceable totals.

## 3. Estimate and BOQ to budget

1. An estimator selects a company template and works in a draft revision.
2. Each line records description, unit, quantity, labour/material/equipment/subcontract cost, rate source, markup, discount and tax treatment as applicable.
3. The application calculates line totals using documented precision and rounding rules.
4. Review checks missing rates, duplicate/invalid units, tax profile and margin thresholds.
5. Issuing freezes the revision and creates a client-visible quotation.
6. Approval records the approved revision; conversion to budget links budget lines to estimate lines and cost codes.

## 4. Project execution and schedule

1. PM creates project phases, tasks, dependencies, milestones, assignees and target dates.
2. Staff update progress and attach evidence; schedule changes are versioned and affected parties are notified.
3. Resource allocation checks project assignments and availability.
4. Delays remain visible with cause, owner, revised dates and mitigation actions.
5. Completion records outstanding defects, handover documents and final financial reconciliation.

## 5. Procurement to actual job cost

1. Site requests material against a project, budget/cost code and required date.
2. Procurement requests and compares supplier quotations.
3. An authorized approver approves a purchase order; changes after approval are revisioned.
4. Storekeeper records received quantity and discrepancies against the PO.
5. Stock receipt creates a traceable inventory movement; issue/transfer/consumption creates further movements.
6. Supplier bill is matched to PO and receipt. Payment recording reconciles to the supplier balance and project actuals.

## 6. Variation/change order

1. A client or staff member raises a change request linked to project scope.
2. PM assesses cost, tax, budget and schedule effects and creates a priced revision.
3. Client sees the proposal and approves or rejects the exact revision.
4. Approval updates authorized scope, budget and schedule through linked transactions.
5. Rejection preserves the request and its discussion without posting financial changes.

## 7. Daily site log and issue follow-up

1. Supervisor selects a project and date and records weather, work completed, workforce, equipment, deliveries, visitors, incidents, delays and notes.
2. Photos and evidence are attached to the relevant log/issue with access checks.
3. Supervisor submits the log; PM reviews and publishes a client-safe update.
4. Defects, safety issues and corrective actions receive a responsible person and due date.
5. Closure requires evidence and is retained in the audit history.

## 8. Client portal

1. Staff link the project to a customer with an email address and create a one-time invitation link for that address.
2. The client signs in or creates an account with the invited email address; accepting the link grants access only to that project.
3. Staff upload progress photos, videos and project files, adding an optional note and explicitly choosing whether each update is shared.
4. The client signs in to the client portal to view only their shared projects and published media; files download through an authenticated endpoint.
5. Staff can remove a client's project access. Uploads and access changes are recorded in the company audit log.

## 9. Subcontractor portal

1. Company staff link an external user to a subcontractor record and assign only relevant project scopes.
2. Subcontractor sees assigned schedule, instructions, drawings and document versions.
3. Subcontractor submits progress evidence or a payment claim.
4. PM reviews, accepts, returns or disputes the claim with a reason; finance records settlement separately.
5. Assignment revocation prevents future access but preserves the record and audit history.

## 10. Documents and revisions

1. Authorized user uploads a file into a company/project folder with classification and visibility.
2. Server checks file size/type and tenant/project authorization before storage.
3. New drawing/document revisions supersede, but do not erase, prior versions.
4. Reviewer approves or rejects the version; clients/subcontractors see only versions explicitly shared with them.
5. Downloads use short-lived signed URLs after the same server-side authorization check.

## 11. Invoice and payment reconciliation

1. Finance issues an invoice referencing approved scope, tax snapshot, currency and payment terms.
2. Client chooses an available method: M-Pesa (once enabled), bank transfer or another configured method.
3. A provider callback is authenticated, deduplicated and stored before applying the payment state transition.
4. Finance reconciles settlement, fees, withholding and retention as separate traceable entries.
5. An invoice is never marked paid from an unverified browser redirect.

## 12. Company performance reporting

1. Authorized manager selects a company/project, date range and report.
2. Metrics disclose currency, tax treatment, date basis and whether values are estimated, committed, invoiced or paid.
3. Drill-down returns only rows the user is authorized to access.
4. Export jobs re-check authorization at creation and download time and expire securely.
