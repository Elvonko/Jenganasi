import { Archive, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveProject, updateProject } from "@/app/projects/actions";
import { ProjectForm } from "@/app/projects/project-form";
import {
  assignProjectTask,
  createProjectTaskDependency,
  createProjectPhaseAction,
  createProjectMilestoneAction,
  createProjectTaskAction,
  updateProjectPhaseStatus,
  updateProjectTaskPhase,
  updateProjectMilestoneStatus,
  updateProjectTaskStatus,
  removeProjectTaskDependency,
} from "@/app/projects/work-actions";
import { ProjectWorkForm } from "@/app/projects/project-work-form";
import { ClientProjectAccessPanel } from "@/components/client-project-access-panel";
import { ProjectProgressMedia } from "@/components/project-progress-media";
import { getCompanyContext } from "@/lib/company-context";
import { getCustomer, listCustomers } from "@/lib/customer-service";
import { hasPermission } from "@/lib/permissions";
import { getProject } from "@/lib/project-service";
import {
  listPendingClientInvitations,
  listProjectClientAccess,
  listProjectMedia,
} from "@/lib/project-media-service";
import {
  listProjectAssignees,
  listProjectPhases,
  listProjectMilestones,
  listProjectTasks,
} from "@/lib/project-work-service";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

function canAddPrerequisite(
  predecessorTaskId: string,
  successorTaskId: string,
  tasks: Awaited<ReturnType<typeof listProjectTasks>>,
): boolean {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const pending = [successorTaskId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const currentTaskId = pending.pop();
    if (!currentTaskId || visited.has(currentTaskId)) continue;
    if (currentTaskId === predecessorTaskId) return false;
    visited.add(currentTaskId);
    pending.push(
      ...(taskById.get(currentTaskId)?.successors.map(({ taskId }) => taskId) ??
        []),
    );
  }
  return true;
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const context = await getCompanyContext("projects:read");
  const project = await getProject(context.actor, id);

  if (!project) {
    notFound();
  }

  const canUpdate = hasPermission(context.actor.role, "projects:update");
  const [tasks, milestones, phases, assignees, media, clientAccess, invitations] =
    await Promise.all([
    listProjectTasks(context.actor, project.id),
    listProjectMilestones(context.actor, project.id),
    listProjectPhases(context.actor, project.id),
    canUpdate
      ? listProjectAssignees(context.actor)
      : Promise.resolve([]),
    listProjectMedia(context.actor, project.id),
    canUpdate
      ? listProjectClientAccess(context.actor, project.id)
      : Promise.resolve([]),
    canUpdate
      ? listPendingClientInvitations(context.actor, project.id)
      : Promise.resolve([]),
  ]);
  const canArchive = hasPermission(context.actor.role, "projects:archive");
  const canReadCustomers = hasPermission(context.actor.role, "customers:read");
  const [customers, customer] = await Promise.all([
    canUpdate ? listCustomers(context.actor, true) : Promise.resolve([]),
    canReadCustomers && project.customerId
      ? getCustomer(context.actor, project.customerId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="page-stack narrow-page">
      <div className="breadcrumbs">
        <Link href="/projects">Projects</Link>
        <span>/</span>
        <span>{project.projectCode}</span>
      </div>
      <section className="project-detail-hero">
        <div>
          <span className={`status-pill status-${project.status}`}>
            {project.status.replaceAll("_", " ")}
          </span>
          <h1>{project.name}</h1>
          <p className="detail-project-code">{project.projectCode}</p>
        </div>
        <div className="detail-meta">
          <span><MapPin size={16} aria-hidden="true" />{project.location || "Location not set"}</span>
          <span>
            <CalendarDays size={16} aria-hidden="true" />
            {project.targetDate ? `Target ${project.targetDate}` : "No target date"}
          </span>
          {customer && (
            <span>
              Customer{" "}
              <Link href={`/customers/${customer.id}`}>{customer.name}</Link>
            </span>
          )}
        </div>
      </section>

      <ProjectProgressMedia
        canUpload={canUpdate}
        items={media}
        projectId={project.id}
      />

      {canUpdate && (
        <ClientProjectAccessPanel
          clients={clientAccess}
          invitations={invitations}
          customerEmail={customer?.email ?? null}
          projectId={project.id}
        />
      )}

      <section className="panel form-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PROJECT DETAILS</p>
            <h2>Keep the project record current.</h2>
          </div>
        </div>
        {canUpdate ? (
          <ProjectForm
            action={updateProject}
            initial={project}
            customers={customers}
            submitLabel="Save changes"
          />
        ) : (
          <dl className="detail-list">
            <div><dt>Location</dt><dd>{project.location || "Not set"}</dd></div>
            <div><dt>Status</dt><dd>{project.status.replaceAll("_", " ")}</dd></div>
            <div><dt>Progress</dt><dd>{project.progressPercent}%</dd></div>
            <div><dt>Start</dt><dd>{project.startDate ?? "Not set"}</dd></div>
            <div><dt>Target completion</dt><dd>{project.targetDate ?? "Not set"}</dd></div>
            {customer && <div><dt>Customer</dt><dd>{customer.name}</dd></div>}
          </dl>
        )}
      </section>

      <section className="panel project-work-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PROJECT PLAN</p>
            <h2>Phases <span className="work-count">{phases.length}</span></h2>
          </div>
        </div>
        {phases.length === 0 ? (
          <p className="work-empty">
            No phases yet. Add phases to organize work from kickoff through handover.
          </p>
        ) : (
          <ol className="project-phase-list">
            {phases.map((phase) => {
              const progress = phase.taskCount
                ? Math.round((phase.completedTaskCount / phase.taskCount) * 100)
                : 0;
              return (
                <li className="project-phase-item" key={phase.id}>
                  <div className="project-phase-copy">
                    <div className="project-phase-title">
                      <span className="phase-order">{phase.position}</span>
                      <strong>{phase.name}</strong>
                      <span className={`work-status status-${phase.status}`}>
                        {phase.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    {phase.description && <p>{phase.description}</p>}
                    <span className="work-item-date">
                      {phase.targetDate ? `Target ${phase.targetDate}` : "No target date"}
                      {" · "}{phase.completedTaskCount}/{phase.taskCount} tasks complete
                    </span>
                    <div
                      className="phase-progress-track"
                      role="progressbar"
                      aria-label={`${phase.name} task progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {canUpdate && (
                    <form action={updateProjectPhaseStatus}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="phaseId" value={phase.id} />
                      <select
                        name="status"
                        defaultValue={phase.status}
                        aria-label={`Status for ${phase.name}`}
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button className="button button-tertiary" type="submit">Save</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {canUpdate && (
          <ProjectWorkForm
            projectId={project.id}
            mode="phase"
            action={createProjectPhaseAction}
          />
        )}
      </section>

      <div className="project-work-grid">
        <section className="panel project-work-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PROJECT WORK</p>
              <h2>Tasks <span className="work-count">{tasks.length}</span></h2>
            </div>
          </div>
          {tasks.length === 0 ? (
            <p className="work-empty">No tasks yet. Add the next piece of work to keep the team aligned.</p>
          ) : (
            <ul className="project-work-list">
              {tasks.map((task) => (
                <li className="project-work-item" key={task.id}>
                  <div className="work-item-copy">
                    <strong>{task.title}</strong>
                    {task.description && <p>{task.description}</p>}
                    <span className="work-item-date">
                      {task.phaseName ? `Phase: ${task.phaseName}` : "No phase"}
                    </span>
                    <span className="work-item-date">
                      {task.dueDate ? `Due ${task.dueDate}` : "No due date"}
                    </span>
                    <span className="work-item-date">
                      {task.assignedTo
                        ? `Assigned to ${task.assigneeName ?? "former team member"}`
                        : "Unassigned"}
                    </span>
                    {task.predecessors.length > 0 && (
                      <span className="work-item-date">
                        Depends on: {task.predecessors
                          .map(({ title, status }) => `${title} (${status.replaceAll("_", " ")})`)
                          .join(", ")}
                      </span>
                    )}
                    {task.successors.length > 0 && (
                      <span className="work-item-date">
                        Blocks: {task.successors.map(({ title }) => title).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="work-task-controls">
                    {canUpdate ? (
                      <>
                        <form
                          action={updateProjectTaskStatus}
                          className="work-status-form"
                        >
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input
                            type="hidden"
                            name="taskId"
                            value={task.id}
                          />
                          <label
                            className="sr-only"
                            htmlFor={`task-status-${task.id}`}
                          >
                            Status for {task.title}
                          </label>
                          <select
                            id={`task-status-${task.id}`}
                            name="status"
                            defaultValue={task.status}
                            aria-label={`Status for ${task.title}`}
                          >
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            className="button button-tertiary"
                            type="submit"
                          >
                            Save
                          </button>
                        </form>
                        <form
                          action={assignProjectTask}
                          className="work-status-form"
                        >
                          <input
                            type="hidden"
                            name="projectId"
                            value={project.id}
                          />
                          <input
                            type="hidden"
                            name="taskId"
                            value={task.id}
                          />
                          <label
                            className="sr-only"
                            htmlFor={`task-assignee-${task.id}`}
                          >
                            Assignee for {task.title}
                          </label>
                          <select
                            id={`task-assignee-${task.id}`}
                            name="assigneeId"
                            defaultValue={task.assignedTo ?? ""}
                            aria-label={`Assignee for ${task.title}`}
                          >
                            <option value="">Unassigned</option>
                            {assignees.map((assignee) => (
                              <option key={assignee.id} value={assignee.id}>
                                {assignee.name}
                              </option>
                            ))}
                            {task.assignedTo &&
                              !assignees.some(
                                ({ id: assigneeId }) =>
                                  assigneeId === task.assignedTo,
                              ) && (
                                <option value={task.assignedTo}>
                                  {task.assigneeName ?? "Former team member"}
                                </option>
                              )}
                          </select>
                          <button
                            className="button button-tertiary"
                            type="submit"
                          >
                            Assign
                          </button>
                        </form>
                        <form
                          action={updateProjectTaskPhase}
                          className="work-status-form"
                        >
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <label className="sr-only" htmlFor={`task-phase-${task.id}`}>
                            Phase for {task.title}
                          </label>
                          <select
                            id={`task-phase-${task.id}`}
                            name="phaseId"
                            defaultValue={task.phaseId ?? ""}
                            aria-label={`Phase for ${task.title}`}
                          >
                            <option value="">No phase</option>
                            {phases.map((phase) => (
                              <option key={phase.id} value={phase.id}>{phase.name}</option>
                            ))}
                          </select>
                          <button className="button button-tertiary" type="submit">
                            Phase
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className={`work-status status-${task.status}`}>
                        {task.status.replaceAll("_", " ")}
                      </span>
                    )}
                    {canUpdate && tasks.length > 1 && (
                      <form
                        action={createProjectTaskDependency}
                        className="work-status-form"
                      >
                        <input type="hidden" name="projectId" value={project.id} />
                        <input type="hidden" name="successorTaskId" value={task.id} />
                        <label className="sr-only" htmlFor={`task-dependency-${task.id}`}>
                          Prerequisite for {task.title}
                        </label>
                        <select
                          id={`task-dependency-${task.id}`}
                          name="predecessorTaskId"
                          defaultValue=""
                          required
                          aria-label={`Prerequisite for ${task.title}`}
                        >
                          <option value="" disabled>
                            Depends on…
                          </option>
                          {tasks
                            .filter(
                              (candidate) =>
                                candidate.id !== task.id &&
                                !task.predecessors.some(
                                  ({ taskId }) => taskId === candidate.id,
                                ) &&
                                canAddPrerequisite(
                                  candidate.id,
                                  task.id,
                                  tasks,
                                ),
                            )
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.title}
                              </option>
                            ))}
                        </select>
                        <button
                          className="button button-tertiary"
                          type="submit"
                          disabled={
                            !tasks.some(
                              (candidate) =>
                                candidate.id !== task.id &&
                                !task.predecessors.some(
                                  ({ taskId }) => taskId === candidate.id,
                                ) &&
                                canAddPrerequisite(
                                  candidate.id,
                                  task.id,
                                  tasks,
                                ),
                            )
                          }
                        >
                          Add link
                        </button>
                      </form>
                    )}
                    {canUpdate && task.predecessors.map((predecessor) => (
                      <form
                        action={removeProjectTaskDependency}
                        className="work-status-form"
                        key={predecessor.dependencyId}
                      >
                        <input type="hidden" name="projectId" value={project.id} />
                        <input
                          type="hidden"
                          name="dependencyId"
                          value={predecessor.dependencyId}
                        />
                        <button
                          className="button button-tertiary"
                          type="submit"
                          aria-label={`Remove prerequisite ${predecessor.title} from ${task.title}`}
                        >
                          Remove link
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canUpdate && (
            <ProjectWorkForm
              projectId={project.id}
              mode="task"
              assignees={assignees}
              phases={phases}
              action={createProjectTaskAction}
            />
          )}
        </section>

        <section className="panel project-work-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PROJECT TIMELINE</p>
              <h2>Milestones <span className="work-count">{milestones.length}</span></h2>
            </div>
          </div>
          {milestones.length === 0 ? (
            <p className="work-empty">No milestones yet. Add key dates to make project progress visible.</p>
          ) : (
            <ul className="project-work-list">
              {milestones.map((milestone) => (
                <li className="project-work-item milestone-item" key={milestone.id}>
                  <div className="milestone-marker" aria-hidden="true">
                    <span className={milestone.status === "completed" ? "milestone-marker-complete" : ""} />
                  </div>
                  <div className="work-item-copy">
                    <strong>{milestone.title}</strong>
                    <span className="work-item-date">
                      {milestone.targetDate ? `Target ${milestone.targetDate}` : "No target date"}
                    </span>
                  </div>
                  {canUpdate ? (
                    <form action={updateProjectMilestoneStatus}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={milestone.status === "completed" ? "planned" : "completed"}
                      />
                      <button
                        className="button button-tertiary"
                        type="submit"
                        aria-label={
                          milestone.status === "completed"
                            ? `Reopen ${milestone.title}`
                            : `Complete ${milestone.title}`
                        }
                      >
                        {milestone.status === "completed" ? "Reopen" : "Complete"}
                      </button>
                    </form>
                  ) : (
                    <span className={`work-status status-${milestone.status}`}>
                      {milestone.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canUpdate && (
            <ProjectWorkForm
              projectId={project.id}
              mode="milestone"
              action={createProjectMilestoneAction}
            />
          )}
        </section>
      </div>

      {canArchive && (
        <section className="archive-panel">
          <div>
            <span className="archive-icon"><Archive size={17} aria-hidden="true" /></span>
            <div>
              <strong>Archive this project</strong>
              <p>Archived projects are hidden from the active register and preserved.</p>
            </div>
          </div>
          <form action={archiveProject}>
            <input type="hidden" name="id" value={project.id} />
            <button className="button button-danger" type="submit">
              Archive project
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
