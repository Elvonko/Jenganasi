import Link from "next/link";
import {
  deleteCompanyTemplateAction,
  saveCompanySettings,
  saveEstimateTemplate,
  saveProjectTemplate,
} from "@/app/settings/actions";
import { CompanySettingsForm } from "@/app/settings/company-settings-form";
import { EstimateTemplateForm } from "@/app/settings/estimate-template-form";
import { ProjectTemplateForm } from "@/app/settings/project-template-form";
import { getCompanyContext } from "@/lib/company-context";
import { listCompanyTemplates } from "@/lib/company-template-service";
import { hasPermission } from "@/lib/permissions";

export default async function SettingsPage() {
  const context = await getCompanyContext("settings:read");
  const canUpdate = hasPermission(context.actor.role, "settings:update");
  const templates = await listCompanyTemplates(context.actor);
  const projectTemplates = templates.filter(
    (template) => template.templateType === "project",
  );
  const estimateTemplates = templates.filter(
    (template) => template.templateType === "estimate",
  );

  return (
    <div className="page-stack narrow-page">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">WORKSPACE PREFERENCES</p>
          <h1>Settings</h1>
          <p className="muted">
            Manage the company profile, regional defaults, and reusable project and estimate templates.
          </p>
        </div>
      </section>
      {(context.actor.role === "owner" || context.actor.role === "admin") && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SECURITY</p>
              <h2>Two-factor authentication</h2>
              <p className="muted">Protect your owner/admin account with an authenticator app.</p>
            </div>
            <Link className="button button-secondary" href="/settings/mfa">
              Manage MFA
            </Link>
          </div>
        </section>
      )}
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">COMPANY PROFILE</p>
            <h2>{context.company.name}</h2>
          </div>
        </div>
        {canUpdate ? (
          <CompanySettingsForm
            action={saveCompanySettings}
            initial={{
              name: context.company.name,
              countryCode: context.company.countryCode,
              currencyCode: context.company.currencyCode,
              timezone: context.company.timezone,
            }}
          />
        ) : (
          <dl className="detail-list">
            <div><dt>Country</dt><dd>{context.company.countryCode}</dd></div>
            <div><dt>Reporting currency</dt><dd>{context.company.currencyCode}</dd></div>
            <div><dt>Time zone</dt><dd>{context.company.timezone}</dd></div>
          </dl>
        )}
      </section>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REUSABLE WORKFLOWS</p>
            <h2>Project templates</h2>
            <p className="muted">
              Start new projects with a consistent task and milestone checklist.
            </p>
          </div>
        </div>
        {canUpdate && <ProjectTemplateForm action={saveProjectTemplate} />}
        <div className="template-list">
          {projectTemplates.length === 0 ? (
            <p className="muted">No project templates yet.</p>
          ) : projectTemplates.map((template) => (
            <div className="template-list-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <p className="muted">
                  {template.data.tasks.length} tasks · {template.data.milestones.length} milestones
                </p>
              </div>
              {canUpdate && (
                <form action={deleteCompanyTemplateAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button className="button button-secondary">Delete</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BILL OF QUANTITIES</p>
            <h2>Estimate templates</h2>
            <p className="muted">
              Reuse common cost items when preparing a project estimate.
            </p>
          </div>
        </div>
        {canUpdate && <EstimateTemplateForm action={saveEstimateTemplate} />}
        <div className="template-list">
          {estimateTemplates.length === 0 ? (
            <p className="muted">No estimate templates yet.</p>
          ) : estimateTemplates.map((template) => (
            <div className="template-list-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <p className="muted">{template.data.lineItems.length} BOQ items</p>
              </div>
              {canUpdate && (
                <form action={deleteCompanyTemplateAction}>
                  <input type="hidden" name="templateId" value={template.id} />
                  <button className="button button-secondary">Delete</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
