import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import { after, before, test } from "node:test";

const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const testSchema = `test_${randomUUID().replace(/-/g, "")}`;

let db: typeof import("@/db/client").db;
let client: typeof import("@/db/client").client;
let ensureDatabase: typeof import("@/db/client").ensureDatabase;
let users: typeof import("@/db/schema").users;
let companies: typeof import("@/db/schema").companies;
let memberships: typeof import("@/db/schema").memberships;
let auditEvents: typeof import("@/db/schema").auditEvents;
let listEstimates: typeof import("@/lib/estimate-service").listEstimates;
let getEstimate: typeof import("@/lib/estimate-service").getEstimate;
let createEstimate: typeof import("@/lib/estimate-service").createEstimate;
let addEstimateLineItem: typeof import("@/lib/estimate-service").addEstimateLineItem;
let removeEstimateLineItem: typeof import("@/lib/estimate-service").removeEstimateLineItem;
let updateEstimateStatus: typeof import("@/lib/estimate-service").updateEstimateStatus;
let calculateEstimateTotal: typeof import("@/lib/estimate-service").calculateEstimateTotal;
let listProjects: typeof import("@/lib/project-service").listProjects;
let getProject: typeof import("@/lib/project-service").getProject;
let createProject: typeof import("@/lib/project-service").createProject;
let updateProject: typeof import("@/lib/project-service").updateProject;
let archiveProject: typeof import("@/lib/project-service").archiveProject;
let listProjectTasks: typeof import("@/lib/project-work-service").listProjectTasks;
let listProjectPhases: typeof import("@/lib/project-work-service").listProjectPhases;
let createProjectPhase: typeof import("@/lib/project-work-service").createProjectPhase;
let updateProjectPhaseStatus: typeof import("@/lib/project-work-service").updateProjectPhaseStatus;
let updateProjectTaskPhase: typeof import("@/lib/project-work-service").updateProjectTaskPhase;
let createProjectTask: typeof import("@/lib/project-work-service").createProjectTask;
let createProjectTaskDependency: typeof import("@/lib/project-work-service").createProjectTaskDependency;
let removeProjectTaskDependency: typeof import("@/lib/project-work-service").removeProjectTaskDependency;
let updateProjectTaskStatus: typeof import("@/lib/project-work-service").updateProjectTaskStatus;
let assignProjectTask: typeof import("@/lib/project-work-service").assignProjectTask;
let listProjectAssignees: typeof import("@/lib/project-work-service").listProjectAssignees;
let listProjectMilestones: typeof import("@/lib/project-work-service").listProjectMilestones;
let createProjectMilestone: typeof import("@/lib/project-work-service").createProjectMilestone;
let updateProjectMilestoneStatus: typeof import("@/lib/project-work-service").updateProjectMilestoneStatus;
let projectTaskInputSchema: typeof import("@/lib/project-work-service").projectTaskInputSchema;
let projectTaskAssignmentInputSchema: typeof import("@/lib/project-work-service").projectTaskAssignmentInputSchema;
let projectTaskDependencyInputSchema: typeof import("@/lib/project-work-service").projectTaskDependencyInputSchema;
let listCustomers: typeof import("@/lib/customer-service").listCustomers;
let getCustomer: typeof import("@/lib/customer-service").getCustomer;
let createCustomer: typeof import("@/lib/customer-service").createCustomer;
let updateCustomer: typeof import("@/lib/customer-service").updateCustomer;
let setCustomerStatus: typeof import("@/lib/customer-service").setCustomerStatus;
let customerInputSchema: typeof import("@/lib/customer-service").customerInputSchema;
let getCompanyReport: typeof import("@/lib/report-service").getCompanyReport;
let updateCompanySettings: typeof import("@/lib/company-settings-service").updateCompanySettings;
let companySettingsSchema: typeof import("@/lib/company-settings-service").companySettingsSchema;
let createCompanyTemplate: typeof import("@/lib/company-template-service").createCompanyTemplate;
let deleteCompanyTemplate: typeof import("@/lib/company-template-service").deleteCompanyTemplate;
let listCompanyTemplates: typeof import("@/lib/company-template-service").listCompanyTemplates;
let companyTemplateInputSchema: typeof import("@/lib/company-template-service").companyTemplateInputSchema;
let inviteClientToProject: typeof import("@/lib/project-media-service").inviteClientToProject;
let acceptClientInvitation: typeof import("@/lib/project-media-service").acceptClientInvitation;
let listClientProjects: typeof import("@/lib/project-media-service").listClientProjects;
let getClientProject: typeof import("@/lib/project-media-service").getClientProject;
let addProjectMedia: typeof import("@/lib/project-media-service").addProjectMedia;
let listProjectMedia: typeof import("@/lib/project-media-service").listProjectMedia;
let listClientProjectMedia: typeof import("@/lib/project-media-service").listClientProjectMedia;
let getProjectMediaForUser: typeof import("@/lib/project-media-service").getProjectMediaForUser;

before(async () => {
  if (!baseDatabaseUrl) {
    throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run integration tests.");
  }
  const setupPool = new Pool({ connectionString: baseDatabaseUrl });
  try {
    await setupPool.query(`CREATE SCHEMA "${testSchema}"`);
  } finally {
    await setupPool.end();
  }
  process.env.DATABASE_SCHEMA = testSchema;
  process.env.BETTER_AUTH_SECRET = randomUUID() + randomUUID();
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  const database = await import("@/db/client");
  const schema = await import("@/db/schema");
  const service = await import("@/lib/project-service");
  const workService = await import("@/lib/project-work-service");
  const customerService = await import("@/lib/customer-service");
  const reportService = await import("@/lib/report-service");
  const companySettingsService = await import("@/lib/company-settings-service");
  const companyTemplateService = await import("@/lib/company-template-service");
  const projectMediaService = await import("@/lib/project-media-service");
  const estimateService = await import("@/lib/estimate-service");
  const authModule = await import("@/lib/auth");

  db = database.db;
  client = database.client;
  ensureDatabase = database.ensureDatabase;
  users = schema.users;
  companies = schema.companies;
  memberships = schema.memberships;
  auditEvents = schema.auditEvents;
  listEstimates = estimateService.listEstimates;
  getEstimate = estimateService.getEstimate;
  createEstimate = estimateService.createEstimate;
  addEstimateLineItem = estimateService.addEstimateLineItem;
  removeEstimateLineItem = estimateService.removeEstimateLineItem;
  updateEstimateStatus = estimateService.updateEstimateStatus;
  calculateEstimateTotal = estimateService.calculateEstimateTotal;
  listProjects = service.listProjects;
  getProject = service.getProject;
  createProject = service.createProject;
  updateProject = service.updateProject;
  archiveProject = service.archiveProject;
  listProjectTasks = workService.listProjectTasks;
  listProjectPhases = workService.listProjectPhases;
  createProjectPhase = workService.createProjectPhase;
  updateProjectPhaseStatus = workService.updateProjectPhaseStatus;
  updateProjectTaskPhase = workService.updateProjectTaskPhase;
  createProjectTask = workService.createProjectTask;
  createProjectTaskDependency = workService.createProjectTaskDependency;
  removeProjectTaskDependency = workService.removeProjectTaskDependency;
  updateProjectTaskStatus = workService.updateProjectTaskStatus;
  assignProjectTask = workService.assignProjectTask;
  listProjectAssignees = workService.listProjectAssignees;
  listProjectMilestones = workService.listProjectMilestones;
  createProjectMilestone = workService.createProjectMilestone;
  updateProjectMilestoneStatus = workService.updateProjectMilestoneStatus;
  projectTaskInputSchema = workService.projectTaskInputSchema;
  projectTaskAssignmentInputSchema = workService.projectTaskAssignmentInputSchema;
  projectTaskDependencyInputSchema = workService.projectTaskDependencyInputSchema;
  listCustomers = customerService.listCustomers;
  getCustomer = customerService.getCustomer;
  createCustomer = customerService.createCustomer;
  updateCustomer = customerService.updateCustomer;
  setCustomerStatus = customerService.setCustomerStatus;
  customerInputSchema = customerService.customerInputSchema;
  getCompanyReport = reportService.getCompanyReport;
  updateCompanySettings = companySettingsService.updateCompanySettings;
  companySettingsSchema = companySettingsService.companySettingsSchema;
  createCompanyTemplate = companyTemplateService.createCompanyTemplate;
  deleteCompanyTemplate = companyTemplateService.deleteCompanyTemplate;
  listCompanyTemplates = companyTemplateService.listCompanyTemplates;
  companyTemplateInputSchema = companyTemplateService.companyTemplateInputSchema;
  inviteClientToProject = projectMediaService.inviteClientToProject;
  acceptClientInvitation = projectMediaService.acceptClientInvitation;
  listClientProjects = projectMediaService.listClientProjects;
  getClientProject = projectMediaService.getClientProject;
  addProjectMedia = projectMediaService.addProjectMedia;
  listProjectMedia = projectMediaService.listProjectMedia;
  listClientProjectMedia = projectMediaService.listClientProjectMedia;
  getProjectMediaForUser = projectMediaService.getProjectMediaForUser;
  await ensureDatabase();
  const signupResponse = await authModule.auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "First Owner",
        email: `owner-${randomUUID()}@example.test`,
        password: `Construction-${randomUUID()}-9`,
      }),
    }),
  );
  assert.equal(signupResponse.status, 200);
  const account = (await signupResponse.json()) as {
    user: { id: string };
  };
  assert.ok(account.user.id);
  const cookie = signupResponse.headers.get("set-cookie");
  assert.ok(cookie);
  const sessionResponse = await authModule.auth.handler(
    new Request("http://localhost:3000/api/auth/get-session", {
      headers: { cookie: cookie.split(";")[0] },
    }),
  );
  assert.equal(sessionResponse.status, 200);
  const session = (await sessionResponse.json()) as {
    user?: { id: string };
  } | null;
  assert.equal(session?.user?.id, account.user.id);
});

after(async () => {
  if (client) {
    await client.end();
  }
  if (baseDatabaseUrl) {
    const cleanupPool = new Pool({ connectionString: baseDatabaseUrl });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    } finally {
      await cleanupPool.end();
    }
  }
});

test("company-scoped project operations enforce tenant and role boundaries", async () => {
  const ownerAId = randomUUID();
  const ownerBId = randomUUID();
  const supervisorAId = randomUUID();
  const clientAId = randomUUID();
  const companyAId = randomUUID();
  const companyBId = randomUUID();

  await db.insert(users).values([
    {
      id: ownerAId,
      name: "Owner A",
      email: `${ownerAId}@example.test`,
    },
    {
      id: ownerBId,
      name: "Owner B",
      email: `${ownerBId}@example.test`,
    },
    {
      id: supervisorAId,
      name: "Site Supervisor A",
      email: `${supervisorAId}@example.test`,
    },
    {
      id: clientAId,
      name: "Client A",
      email: `${clientAId}@example.test`,
    },
  ]);
  await db.insert(companies).values([
    {
      id: companyAId,
      name: "Company A",
      slug: `company-a-${companyAId}`,
    },
    {
      id: companyBId,
      name: "Company B",
      slug: `company-b-${companyBId}`,
    },
  ]);
  await db.insert(memberships).values([
    {
      id: randomUUID(),
      companyId: companyAId,
      userId: ownerAId,
      role: "owner",
    },
    {
      id: randomUUID(),
      companyId: companyBId,
      userId: ownerBId,
      role: "owner",
    },
    {
      id: randomUUID(),
      companyId: companyAId,
      userId: supervisorAId,
      role: "site_supervisor",
    },
    {
      id: randomUUID(),
      companyId: companyAId,
      userId: clientAId,
      role: "client",
    },
  ]);

  const ownerA = {
    userId: ownerAId,
    companyId: companyAId,
    role: "owner" as const,
  };
  const ownerB = {
    userId: ownerBId,
    companyId: companyBId,
    role: "owner" as const,
  };
  const customerInput = (name: string) =>
    customerInputSchema.parse({
      name,
      email: `${name.toLowerCase().replaceAll(" ", ".")}@example.test`,
      phone: "+254 700 000 000",
      address: "Nairobi",
    });
  const customerA = await createCustomer(ownerA, customerInput("Customer A"));
  const alternateCustomer = await createCustomer(
    ownerA,
    customerInput("Alternate Customer"),
  );
  const customerB = await createCustomer(ownerB, customerInput("Customer B"));

  assert.equal((await listCustomers(ownerA)).length, 2);
  assert.equal((await listCustomers(ownerA))[0]?.projectCount, 0);
  assert.equal(await getCustomer(ownerB, customerA.id), null);
  assert.equal(
    await updateCustomer(ownerB, customerA.id, customerInput("Cross-tenant edit")),
    null,
  );
  assert.equal(await setCustomerStatus(ownerB, customerA.id, "inactive"), null);
  await assert.rejects(
    listCustomers({ userId: ownerAId, companyId: companyAId, role: "storekeeper" }),
    /cannot perform customers:read/,
  );
  assert.equal(
    customerInputSchema.safeParse({
      name: "Valid Name",
      email: "not-an-email",
    }).success,
    false,
  );

  const project = await createProject(ownerA, {
    name: "Ridgeview Family Home",
    location: "Nairobi",
    customerId: customerA.id,
    status: "planned",
    progressPercent: 0,
    startDate: "",
    targetDate: "",
  });

  assert.equal((await listProjects(ownerA)).length, 1);
  assert.equal(
    (await listCustomers(ownerA)).find(({ id }) => id === customerA.id)
      ?.projectCount,
    1,
  );
  assert.equal((await listProjects(ownerB)).length, 0);
  assert.equal(await getProject(ownerB, project.id), null);
  await assert.rejects(
    createProject(ownerA, {
      name: "Cross-company customer",
      location: "",
      customerId: customerB.id,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    /active customer from this company/,
  );
  assert.equal(
    (await updateProject(ownerA, project.id, {
      name: project.name,
      location: project.location,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }))?.customerId,
    customerA.id,
  );
  await updateCustomer(ownerA, customerA.id, customerInput("Updated Customer A"));
  assert.equal(
    (await getCustomer(ownerA, customerA.id))?.name,
    "Updated Customer A",
  );
  assert.equal((await setCustomerStatus(ownerA, customerA.id, "inactive"))?.status, "inactive");
  assert.equal((await getProject(ownerA, project.id))?.customerId, customerA.id);
  assert.equal(
    (await updateProject(ownerA, project.id, {
      name: project.name,
      location: project.location,
      customerId: customerA.id,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }))?.customerId,
    customerA.id,
  );
  await assert.rejects(
    createProject(ownerA, {
      name: "Inactive customer assignment",
      location: "",
      customerId: customerA.id,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    /active customer from this company/,
  );
  const reassigned = await updateProject(ownerA, project.id, {
    name: project.name,
    location: project.location,
    customerId: alternateCustomer.id,
    status: "planned",
    progressPercent: 0,
    startDate: "",
    targetDate: "",
  });
  assert.equal(reassigned?.customerId, alternateCustomer.id);
  await assert.rejects(
    updateProject(ownerA, project.id, {
      name: project.name,
      location: project.location,
      customerId: customerA.id,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    /active customer from this company/,
  );
  assert.equal((await setCustomerStatus(ownerA, customerA.id, "active"))?.status, "active");
  assert.equal((await listCustomers(ownerA)).length, 2);
  const customerAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, customerA.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    customerAudit.map((event) => event.action),
    [
      "customer.created",
      "customer.updated",
      "customer.archived",
      "customer.restored",
    ],
  );

  const task = await createProjectTask(ownerA, {
    projectId: project.id,
    title: "Inspect foundation reinforcement",
    description: "Check bar spacing before the pour.",
    dueDate: "2026-11-15",
  });
  assert.equal((await listProjectTasks(ownerA, project.id))[0]?.id, task.id);
  assert.equal((await listProjectTasks(ownerA, project.id))[0]?.assigneeName, null);
  assert.equal((await listProjectTasks(ownerA, project.id))[0]?.phaseName, null);
  assert.deepEqual(await listProjectTasks(ownerB, project.id), []);
  const foundationPhase = await createProjectPhase(ownerA, {
    projectId: project.id,
    name: "Foundation works",
    description: "Excavation, reinforcement and concrete.",
    targetDate: "2026-11-25",
  });
  assert.equal(foundationPhase.position, 1);
  assert.deepEqual(
    (await listProjectPhases(ownerA, project.id)).map(
      ({ name, taskCount, completedTaskCount }) => ({
        name,
        taskCount,
        completedTaskCount,
      }),
    ),
    [{ name: "Foundation works", taskCount: 0, completedTaskCount: 0 }],
  );
  assert.deepEqual(await listProjectPhases(ownerB, project.id), []);
  assert.equal(
    (await updateProjectPhaseStatus(
      ownerA,
      project.id,
      foundationPhase.id,
      "in_progress",
    ))?.status,
    "in_progress",
  );
  assert.equal(
    await updateProjectPhaseStatus(
      ownerB,
      project.id,
      foundationPhase.id,
      "completed",
    ),
    null,
  );
  assert.equal(
    (
      await updateProjectTaskPhase(ownerA, project.id, task.id, foundationPhase.id)
    )?.phaseId,
    foundationPhase.id,
  );
  assert.equal((await listProjectTasks(ownerA, project.id))[0]?.phaseName, "Foundation works");
  assert.deepEqual(
    (await listProjectPhases(ownerA, project.id)).map(
      ({ taskCount, completedTaskCount }) => ({ taskCount, completedTaskCount }),
    ),
    [{ taskCount: 1, completedTaskCount: 0 }],
  );
  const dependentTask = await createProjectTask(ownerA, {
    projectId: project.id,
    title: "Pour foundation concrete",
    description: "",
    dueDate: "",
  });
  assert.equal(
    projectTaskDependencyInputSchema.safeParse({
      projectId: project.id,
      predecessorTaskId: task.id,
      successorTaskId: dependentTask.id,
    }).success,
    true,
  );
  const taskDependency = await createProjectTaskDependency(ownerA, {
    projectId: project.id,
    predecessorTaskId: task.id,
    successorTaskId: dependentTask.id,
  });
  const tasksWithDependencies = await listProjectTasks(ownerA, project.id);
  assert.deepEqual(
    tasksWithDependencies.find(({ id }) => id === dependentTask.id)?.predecessors
      .map(({ taskId, title }) => ({ taskId, title })),
    [{ taskId: task.id, title: task.title }],
  );
  assert.deepEqual(
    tasksWithDependencies.find(({ id }) => id === task.id)?.successors
      .map(({ taskId, title }) => ({ taskId, title })),
    [{ taskId: dependentTask.id, title: dependentTask.title }],
  );
  assert.deepEqual(await listProjectTasks(ownerB, project.id), []);
  await assert.rejects(
    createProjectTaskDependency(ownerA, {
      projectId: project.id,
      predecessorTaskId: task.id,
      successorTaskId: dependentTask.id,
    }),
    /dependency already exists/,
  );
  await assert.rejects(
    createProjectTaskDependency(ownerA, {
      projectId: project.id,
      predecessorTaskId: dependentTask.id,
      successorTaskId: task.id,
    }),
    /schedule cycle/,
  );
  await assert.rejects(
    createProjectTaskDependency(ownerA, {
      projectId: project.id,
      predecessorTaskId: task.id,
      successorTaskId: task.id,
    }),
    /cannot depend on itself/,
  );
  await assert.rejects(
    createProjectTaskDependency(
      { userId: clientAId, companyId: companyAId, role: "client" },
      {
        projectId: project.id,
        predecessorTaskId: task.id,
        successorTaskId: dependentTask.id,
      },
    ),
    /cannot perform projects:update/,
  );
  assert.equal(
    await removeProjectTaskDependency(ownerB, project.id, taskDependency.id),
    false,
  );
  assert.equal(
    await removeProjectTaskDependency(ownerA, project.id, taskDependency.id),
    true,
  );
  assert.equal(
    await removeProjectTaskDependency(ownerA, project.id, taskDependency.id),
    false,
  );
  assert.deepEqual(
    (await listProjectTasks(ownerA, project.id)).find(
      ({ id }) => id === dependentTask.id,
    )?.predecessors,
    [],
  );
  const assignees = await listProjectAssignees(ownerA);
  assert.ok(assignees.some(({ id }) => id === supervisorAId));
  assert.ok(assignees.every(({ id }) => id !== ownerBId && id !== clientAId));
  assert.equal(
    projectTaskAssignmentInputSchema.safeParse({
      projectId: project.id,
      taskId: task.id,
      assigneeId: "not-a-uuid",
    }).success,
    false,
  );
  assert.equal(
    (
      await assignProjectTask(ownerA, project.id, task.id, supervisorAId)
    )?.assignedTo,
    supervisorAId,
  );
  assert.equal(
    (await listProjectTasks(ownerA, project.id))[0]?.assigneeName,
    "Site Supervisor A",
  );
  await assert.rejects(
    assignProjectTask(ownerA, project.id, task.id, ownerBId),
    /internal team member from this company/,
  );
  await assert.rejects(
    assignProjectTask(ownerA, project.id, task.id, clientAId),
    /internal team member from this company/,
  );
  await assert.rejects(
    assignProjectTask(
      { userId: ownerAId, companyId: companyAId, role: "accountant" },
      project.id,
      task.id,
      supervisorAId,
    ),
    /cannot perform projects:update/,
  );
  assert.equal(
    (await assignProjectTask(ownerA, project.id, task.id, null))?.assignedTo,
    null,
  );
  await assignProjectTask(ownerA, project.id, task.id, supervisorAId);
  assert.equal(
    await updateProjectTaskStatus(ownerB, project.id, task.id, "completed"),
    null,
  );
  assert.equal(
    (await updateProjectTaskStatus(ownerA, project.id, task.id, "in_progress"))
      ?.status,
    "in_progress",
  );
  assert.deepEqual(
    (await listProjectPhases(ownerA, project.id)).map(
      ({ taskCount, completedTaskCount }) => ({ taskCount, completedTaskCount }),
    ),
    [{ taskCount: 1, completedTaskCount: 0 }],
  );
  assert.equal(
    projectTaskInputSchema.safeParse({
      projectId: project.id,
      title: "  ",
      description: "",
      dueDate: "not-a-date",
    }).success,
    false,
  );
  await assert.rejects(
    createProjectTask(
      { userId: ownerAId, companyId: companyAId, role: "accountant" },
      { projectId: project.id, title: "Read-only role task", description: "", dueDate: "" },
    ),
    /cannot perform projects:update/,
  );
  await assert.rejects(
    createProjectTask(ownerB, {
      projectId: project.id,
      title: "Cross-company task",
      description: "",
      dueDate: "",
    }),
    /Project not found/,
  );

  const milestone = await createProjectMilestone(ownerA, {
    projectId: project.id,
    title: "Foundation complete",
    targetDate: "2026-11-20",
  });
  assert.equal((await listProjectMilestones(ownerA, project.id))[0]?.id, milestone.id);
  assert.deepEqual(await listProjectMilestones(ownerB, project.id), []);
  assert.equal(
    (
      await updateProjectMilestoneStatus(
        ownerA,
        project.id,
        milestone.id,
        "completed",
      )
    )?.status,
    "completed",
  );

  const estimate = await createEstimate(ownerA, {
    projectId: project.id,
    name: "Initial build estimate",
  });
  await assert.rejects(
    updateEstimateStatus(ownerA, estimate.id, "sent"),
    /at least one BOQ item/,
  );
  const concrete = await addEstimateLineItem(ownerA, estimate.id, {
    category: "materials",
    description: "Ready-mix concrete",
    unit: "m³",
    quantity: 2.5,
    unitRate: 120.5,
  });
  const labour = await addEstimateLineItem(ownerA, estimate.id, {
    category: "labour",
    description: "Concrete placement crew",
    unit: "day",
    quantity: 1,
    unitRate: 40,
  });

  assert.equal((await listEstimates(ownerA)).length, 1);
  assert.equal((await listEstimates(ownerA))[0]?.total, 341.25);
  assert.deepEqual(calculateEstimateTotal([concrete, labour]), 341.25);
  assert.equal(await getEstimate(ownerB, estimate.id), null);
  assert.equal((await listEstimates(ownerB)).length, 0);
  await assert.rejects(
    removeEstimateLineItem(ownerB, estimate.id, concrete.id),
    /Estimate not found/,
  );
  assert.equal(await removeEstimateLineItem(ownerA, estimate.id, labour.id), true);
  assert.equal((await listEstimates(ownerA))[0]?.total, 301.25);
  const companyReport = await getCompanyReport(ownerA);
  assert.equal(companyReport.projects.length, 1);
  assert.equal(companyReport.projectStatusCounts.planned, 1);
  assert.equal(companyReport.averageProgress, 0);
  assert.equal(companyReport.taskCount, 2);
  assert.equal(companyReport.completedTaskCount, 0);
  assert.equal(companyReport.milestoneCount, 1);
  assert.equal(companyReport.completedMilestoneCount, 1);
  assert.equal(companyReport.estimateCount, 1);
  assert.equal(companyReport.estimatedTotal, 301.25);
  assert.equal(companyReport.estimateTotalsByStatus.draft, 301.25);
  assert.equal((await getCompanyReport(ownerB)).projects.length, 0);
  await assert.rejects(
    getCompanyReport({
      userId: clientAId,
      companyId: companyAId,
      role: "client",
    }),
    /cannot perform reports:read/,
  );

  const updatedSettings = await updateCompanySettings(
    ownerA,
    companySettingsSchema.parse({
      name: "Company A Construction",
      countryCode: "KE",
      currencyCode: "USD",
      timezone: "Africa/Nairobi",
    }),
  );
  assert.equal(updatedSettings?.name, "Company A Construction");
  assert.equal(updatedSettings?.currencyCode, "USD");
  const [unmodifiedCompanyB] = await db
    .select({ name: companies.name, currencyCode: companies.currencyCode })
    .from(companies)
    .where(eq(companies.id, companyBId));
  assert.equal(unmodifiedCompanyB?.name, "Company B");
  assert.equal(unmodifiedCompanyB?.currencyCode, "KES");
  await assert.rejects(
    updateCompanySettings(
      { userId: supervisorAId, companyId: companyAId, role: "site_supervisor" },
      companySettingsSchema.parse({
        name: "Unauthorized settings edit",
        countryCode: "KE",
        currencyCode: "KES",
        timezone: "Africa/Nairobi",
      }),
    ),
    /cannot perform settings:update/,
  );
  assert.equal(
    companySettingsSchema.safeParse({
      name: "Valid Company",
      countryCode: "KE",
      currencyCode: "INVALID",
      timezone: "Africa/Nairobi",
    }).success,
    false,
  );
  const settingsAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.action, "company.settings_updated"),
      ),
    );
  assert.equal(settingsAudit.length, 1);

  await assert.rejects(
    addEstimateLineItem(
      { userId: ownerBId, companyId: companyBId, role: "client" },
      estimate.id,
      {
        category: "other",
        description: "Unauthorized line",
        unit: "item",
        quantity: 1,
        unitRate: 1,
      },
    ),
    /cannot perform estimates:update/,
  );
  const sentEstimate = await updateEstimateStatus(ownerA, estimate.id, "sent");
  assert.equal(sentEstimate?.status, "sent");
  await assert.rejects(
    addEstimateLineItem(ownerA, estimate.id, {
      category: "materials",
      description: "Late addition",
      unit: "bag",
      quantity: 1,
      unitRate: 10,
    }),
    /Only draft estimates can be edited/,
  );
  const approvedEstimate = await updateEstimateStatus(
    ownerA,
    estimate.id,
    "approved",
  );
  assert.equal(approvedEstimate?.status, "approved");
  await assert.rejects(
    updateEstimateStatus(ownerA, estimate.id, "draft"),
    /status change is not allowed/,
  );
  assert.equal(
    await updateProject(ownerB, project.id, {
      name: "Unauthorized edit",
      location: "",
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    null,
  );
  assert.equal(await archiveProject(ownerB, project.id), false);

  await assert.rejects(
    createProject(
      { userId: ownerBId, companyId: companyBId, role: "client" },
      {
        name: "Forbidden project",
        location: "",
        status: "planned",
        progressPercent: 0,
        startDate: "",
        targetDate: "",
      },
    ),
    /cannot perform projects:create/,
  );

  const completed = await updateProject(ownerA, project.id, {
    name: project.name,
    location: project.location,
    status: "completed",
    progressPercent: 45,
    startDate: "",
    targetDate: "",
  });
  assert.equal(completed?.progressPercent, 100);
  assert.equal(await archiveProject(ownerA, project.id), true);
  assert.equal(await getProject(ownerA, project.id), null);
  assert.equal((await listProjects(ownerA)).length, 0);
  assert.deepEqual(await listProjectTasks(ownerA, project.id), []);
  assert.deepEqual(await listProjectMilestones(ownerA, project.id), []);

  const projectAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, project.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    projectAudit.map((event) => event.action),
    [
      "project.created",
      "project.updated",
      "project.updated",
      "project.updated",
      "project.updated",
      "project.archived",
    ],
  );

  const workAudit = await db
    .select({ action: auditEvents.action, resourceId: auditEvents.resourceId })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, task.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    workAudit.map((event) => event.action),
    [
      "project.task.created",
      "project.task.phase_updated",
      "project.task.assigned",
      "project.task.unassigned",
      "project.task.assigned",
      "project.task.status_updated",
    ],
  );

  const milestoneAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, milestone.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    milestoneAudit.map((event) => event.action),
    ["project.milestone.created", "project.milestone.status_updated"],
  );
  const phaseAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, foundationPhase.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    phaseAudit.map(({ action }) => action),
    ["project.phase.created", "project.phase.status_updated"],
  );

  const projectTemplate = await createCompanyTemplate(ownerA, {
    templateType: "project",
    name: "Residential build",
    data: {
      tasks: [
        { title: "Prepare the site", description: "Confirm access and utilities." },
        { title: "Inspect the foundation", description: "" },
      ],
      milestones: [{ title: "Foundation complete" }],
    },
  });
  const estimateTemplate = await createCompanyTemplate(ownerA, {
    templateType: "estimate",
    name: "Standard shell",
    data: {
      lineItems: [
        {
          category: "materials",
          description: "Ready-mix concrete",
          unit: "m³",
          quantity: 3.5,
          unitRate: 125.25,
        },
        {
          category: "labour",
          description: "Masonry crew",
          unit: "day",
          quantity: 2,
          unitRate: 80,
        },
      ],
    },
  });
  assert.equal((await listCompanyTemplates(ownerA)).length, 2);
  assert.deepEqual(await listCompanyTemplates(ownerB), []);
  await assert.rejects(
    createCompanyTemplate(ownerA, {
      templateType: "project",
      name: "Residential build",
      data: { tasks: [], milestones: [] },
    }),
    /already exists/,
  );
  assert.equal(
    companyTemplateInputSchema.safeParse({
      templateType: "estimate",
      name: "Invalid costs",
      data: {
        lineItems: [
          {
            category: "materials",
            description: "Invalid quantity",
            unit: "bag",
            quantity: 0,
            unitRate: -1,
          },
        ],
      },
    }).success,
    false,
  );
  await assert.rejects(
    createCompanyTemplate(
      { userId: supervisorAId, companyId: companyAId, role: "site_supervisor" },
      {
        templateType: "project",
        name: "Unauthorized template",
        data: { tasks: [], milestones: [] },
      },
    ),
    /cannot perform settings:update/,
  );

  await assert.rejects(
    createProject(ownerA, {
      name: "Missing template should roll back",
      location: "",
      templateId: randomUUID(),
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    /project template from your company/,
  );
  assert.equal((await listProjects(ownerA)).length, 0);

  const templateProject = await createProject(ownerA, {
    name: "Templated residential build",
    location: "",
    templateId: projectTemplate.id,
    status: "planned",
    progressPercent: 0,
    startDate: "",
    targetDate: "",
  });
  assert.deepEqual(
    (await listProjectTasks(ownerA, templateProject.id)).map(({ title }) => title),
    ["Prepare the site", "Inspect the foundation"],
  );
  assert.deepEqual(
    (await listProjectMilestones(ownerA, templateProject.id)).map(({ title }) => title),
    ["Foundation complete"],
  );
  await assert.rejects(
    createProject(ownerB, {
      name: "Cross-company template use",
      location: "",
      templateId: projectTemplate.id,
      status: "planned",
      progressPercent: 0,
      startDate: "",
      targetDate: "",
    }),
    /project template from your company/,
  );
  assert.equal((await listProjects(ownerB)).length, 0);

  const templatedEstimate = await createEstimate(ownerA, {
    projectId: templateProject.id,
    templateId: estimateTemplate.id,
    name: "Standard shell estimate",
  });
  const loadedTemplateEstimate = await getEstimate(ownerA, templatedEstimate.id);
  assert.deepEqual(
    loadedTemplateEstimate?.items.map(({ description, quantity, unitRate }) => ({
      description,
      quantity,
      unitRate,
    })),
    [
      { description: "Ready-mix concrete", quantity: 3.5, unitRate: 125.25 },
      { description: "Masonry crew", quantity: 2, unitRate: 80 },
    ],
  );
  await assert.rejects(
    createEstimate(ownerB, {
      projectId: templateProject.id,
      templateId: estimateTemplate.id,
      name: "Cross-company estimate",
    }),
    /active project in your company/,
  );
  const companyBProject = await createProject(ownerB, {
    name: "Company B project",
    location: "",
    status: "planned",
    progressPercent: 0,
    startDate: "",
    targetDate: "",
  });
  const companyBTask = await createProjectTask(ownerB, {
    projectId: companyBProject.id,
    title: "Company B excavation",
    description: "",
    dueDate: "",
  });
  await assert.rejects(
    createProjectTaskDependency(ownerB, {
      projectId: companyBProject.id,
      predecessorTaskId: dependentTask.id,
      successorTaskId: companyBTask.id,
    }),
    /both tasks from this project/,
  );
  const companyBPhase = await createProjectPhase(ownerB, {
    projectId: companyBProject.id,
    name: "Company B phase",
    description: "",
    targetDate: "",
  });
  assert.notEqual(companyBProject.id, project.id);
  assert.equal(companyBPhase.projectId, companyBProject.id);
  const templatedTask = (await listProjectTasks(ownerA, templateProject.id))[0];
  assert.ok(templatedTask);
  await assert.rejects(
    updateProjectTaskPhase(
      ownerA,
      templateProject.id,
      templatedTask.id,
      companyBPhase.id,
    ),
    /phase from this project/,
  );
  await assert.rejects(
    createEstimate(ownerB, {
      projectId: companyBProject.id,
      templateId: estimateTemplate.id,
      name: "Cross-company template estimate",
    }),
    /estimate template from your company/,
  );
  assert.equal((await listEstimates(ownerB)).length, 0);

  assert.equal(await deleteCompanyTemplate(ownerA, projectTemplate.id), true);
  assert.equal(await deleteCompanyTemplate(ownerA, estimateTemplate.id), true);
  assert.equal(await deleteCompanyTemplate(ownerB, projectTemplate.id), false);
  assert.equal((await listProjectTasks(ownerA, templateProject.id)).length, 2);
  assert.equal(
    (await getEstimate(ownerA, templatedEstimate.id))?.items.length,
    2,
  );
  const templateRecordAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceType, "company_template"),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    templateRecordAudit.map(({ action }) => action),
    [
      "company.project_template.created",
      "company.estimate_template.created",
      "company.project_template.deleted",
      "company.estimate_template.deleted",
    ],
  );
  const templateAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, templateProject.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    templateAudit.map(({ action }) => action),
    ["project.created", "project.template_applied"],
  );
  const estimateTemplateAudit = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.companyId, companyAId),
        eq(auditEvents.resourceId, templatedEstimate.id),
      ),
    )
    .orderBy(auditEvents.occurredAt);
  assert.deepEqual(
    estimateTemplateAudit.map(({ action }) => action),
    ["estimate.created", "estimate.template_applied"],
  );

  const portalProject = await updateProject(ownerA, templateProject.id, {
    name: templateProject.name,
    location: "Nairobi",
    customerId: customerA.id,
    status: "in_progress",
    progressPercent: 45,
    startDate: "",
    targetDate: "",
  });
  assert.ok(portalProject);
  const invitation = await inviteClientToProject(ownerA, portalProject.id);
  await assert.rejects(
    acceptClientInvitation(
      { id: clientAId, email: "someone-else@example.test" },
      invitation.token,
    ),
    /email address this project invitation was sent to/,
  );
  await acceptClientInvitation(
    { id: clientAId, email: invitation.email },
    invitation.token,
  );
  await assert.rejects(
    acceptClientInvitation(
      { id: clientAId, email: invitation.email },
      invitation.token,
    ),
    /email address this project invitation was sent to/,
  );

  const sampleImage = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
  ]);
  const hiddenUpdate = await addProjectMedia(ownerA, portalProject.id, {
    fileName: "team-only.png",
    contentType: "image/png",
    category: "image",
    fileSize: sampleImage.byteLength,
    data: sampleImage,
    caption: "Team review",
    isShared: false,
  });
  const sharedUpdate = await addProjectMedia(ownerA, portalProject.id, {
    fileName: "foundation.png",
    contentType: "image/png",
    category: "image",
    fileSize: sampleImage.byteLength,
    data: sampleImage,
    caption: "Foundation complete",
    isShared: true,
  });
  assert.equal((await listProjectMedia(ownerA, portalProject.id)).length, 2);
  assert.deepEqual(
    (await listClientProjectMedia(clientAId, portalProject.id)).map(
      ({ id }) => id,
    ),
    [sharedUpdate.id],
  );
  assert.equal(
    await getProjectMediaForUser(clientAId, portalProject.id, hiddenUpdate.id),
    null,
  );
  assert.deepEqual(
    (
      await getProjectMediaForUser(
        clientAId,
        portalProject.id,
        sharedUpdate.id,
      )
    )?.data,
    sampleImage,
  );
  assert.deepEqual(await listClientProjects(clientAId), [
    {
      id: portalProject.id,
      companyName: "Company A Construction",
      projectCode: portalProject.projectCode,
      name: portalProject.name,
      location: "Nairobi",
      status: "in_progress",
      progressPercent: 45,
      targetDate: null,
    },
  ]);
  assert.equal(await getClientProject(clientAId, companyBProject.id), null);
});
