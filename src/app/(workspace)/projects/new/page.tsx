import Link from "next/link";
import { ProjectForm } from "@/app/projects/project-form";
import { createProject } from "@/app/projects/actions";
import { getCompanyContext } from "@/lib/company-context";
import { listCustomers } from "@/lib/customer-service";
import { listCompanyTemplates } from "@/lib/company-template-service";
import { getPricingPlan } from "@/lib/pricing";
import { getProjectUsage } from "@/lib/project-service";

export default async function NewProjectPage() {
  const context = await getCompanyContext("projects:create");
  const [customers, templates, projectUsage] = await Promise.all([
    listCustomers(context.actor),
    listCompanyTemplates(context.actor),
    getProjectUsage(context.actor),
  ]);
  const plan = getPricingPlan(context.company.planCode);
  const atProjectLimit =
    plan.projectLimit !== null && projectUsage >= plan.projectLimit;
  const projectTemplates = templates
    .filter((template) => template.templateType === "project")
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="page-stack narrow-page">
      <div className="breadcrumbs">
        <Link href="/projects">Projects</Link>
        <span>/</span>
        <span>New project</span>
      </div>
      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PROJECT SETUP</p>
            <h1>Create a project</h1>
            <p className="muted">
              Start with the essentials. You can refine the project as the work
              takes shape.
            </p>
          </div>
        </div>
        {atProjectLimit ? (
          <div className="project-limit-notice" role="status">
            <h2>You’ve reached your {plan.name} project limit.</h2>
            <p>
              Your plan includes {plan.projectLimit} project. Archived projects
              also count toward this allowance.
            </p>
            <Link className="button button-primary" href="/pricing">
              Compare plans
            </Link>
          </div>
        ) : (
          <ProjectForm
            action={createProject}
            customers={customers}
            templates={projectTemplates}
            submitLabel="Create project"
          />
        )}
      </section>
    </div>
  );
}
