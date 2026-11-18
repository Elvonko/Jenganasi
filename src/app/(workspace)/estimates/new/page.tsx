import { ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { createEstimateAction } from "@/app/estimates/actions";
import { EstimateForm } from "@/app/estimates/estimate-form";
import { getCompanyContext } from "@/lib/company-context";
import { listProjects } from "@/lib/project-service";
import { listCompanyTemplates } from "@/lib/company-template-service";

export default async function NewEstimatePage() {
  const context = await getCompanyContext("estimates:create");
  const [projects, templates] = await Promise.all([
    listProjects(context.actor),
    listCompanyTemplates(context.actor),
  ]);
  const estimateTemplates = templates
    .filter((template) => template.templateType === "estimate")
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="page-stack narrow-page">
      <div className="breadcrumbs">
        <Link href="/estimates">Estimates &amp; BOQ</Link>
        <span>/</span>
        <span>New estimate</span>
      </div>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ESTIMATE SETUP</p>
            <h1>Create an estimate</h1>
            <p className="muted">
              Choose a project and name this cost plan. Start from an optional
              template or add BOQ items after creation.
            </p>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><FolderKanban size={22} aria-hidden="true" /></span>
            <h3>Create a project first.</h3>
            <p>Every estimate belongs to a project in your company workspace.</p>
            <Link className="button button-secondary" href="/projects/new">
              Create a project <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <EstimateForm
            projects={projects.map(({ id, projectCode, name }) => ({
              id,
              projectCode,
              name,
            }))}
            action={createEstimateAction}
            templates={estimateTemplates}
          />
        )}
      </section>
    </div>
  );
}
