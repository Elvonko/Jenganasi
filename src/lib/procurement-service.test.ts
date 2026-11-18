import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { after, before, test } from "node:test";

const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const testSchema = `test_${randomUUID().replace(/-/g, "")}`;

let db: typeof import("@/db/client").db;
let client: typeof import("@/db/client").client;
let users: typeof import("@/db/schema").users;
let companies: typeof import("@/db/schema").companies;
let createSupplier: typeof import("@/lib/procurement-service").createSupplier;
let listSuppliers: typeof import("@/lib/procurement-service").listSuppliers;
let createPurchaseOrder: typeof import("@/lib/procurement-service").createPurchaseOrder;
let listPurchaseOrders: typeof import("@/lib/procurement-service").listPurchaseOrders;
let updatePurchaseOrderStatus: typeof import("@/lib/procurement-service").updatePurchaseOrderStatus;
let purchaseOrderInputSchema: typeof import("@/lib/procurement-service").purchaseOrderInputSchema;

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
  const database = await import("@/db/client");
  const schema = await import("@/db/schema");
  const service = await import("@/lib/procurement-service");
  db = database.db;
  client = database.client;
  users = schema.users;
  companies = schema.companies;
  createSupplier = service.createSupplier;
  listSuppliers = service.listSuppliers;
  createPurchaseOrder = service.createPurchaseOrder;
  listPurchaseOrders = service.listPurchaseOrders;
  updatePurchaseOrderStatus = service.updatePurchaseOrderStatus;
  purchaseOrderInputSchema = service.purchaseOrderInputSchema;
  await database.ensureDatabase();
});

after(async () => {
  await client?.end();
  if (baseDatabaseUrl) {
    const cleanupPool = new Pool({ connectionString: baseDatabaseUrl });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    } finally {
      await cleanupPool.end();
    }
  }
});

test("procurement is tenant-scoped and enforces the approval-to-receipt workflow", async () => {
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();
  const companyId = randomUUID();
  const otherCompanyId = randomUUID();
  await db.insert(users).values([
    { id: ownerId, name: "Owner", email: `${ownerId}@example.test` },
    { id: otherOwnerId, name: "Other owner", email: `${otherOwnerId}@example.test` },
  ]);
  await db.insert(companies).values([
    { id: companyId, name: "Company A", slug: `company-a-${companyId}` },
    { id: otherCompanyId, name: "Company B", slug: `company-b-${otherCompanyId}` },
  ]);

  const owner = { userId: ownerId, companyId, role: "owner" as const };
  const otherOwner = {
    userId: otherOwnerId,
    companyId: otherCompanyId,
    role: "owner" as const,
  };
  const supplier = await createSupplier(owner, {
    name: "Northside Building Supplies",
    email: null,
    phone: "",
    category: "Materials",
  });
  const otherSupplier = await createSupplier(otherOwner, {
    name: "Different Company Supplier",
    email: null,
    phone: "",
    category: "",
  });
  assert.deepEqual(
    (await listSuppliers(owner)).map(({ id }) => id),
    [supplier.id],
  );

  const parsedOrder = purchaseOrderInputSchema.parse({
    supplierId: supplier.id,
    projectId: "",
    description: "Cement and reinforcement steel",
    amountCents: "1250.50",
    expectedDelivery: "",
  });
  assert.equal(parsedOrder.amountCents, 125050);
  assert.equal(
    purchaseOrderInputSchema.safeParse({
      supplierId: supplier.id,
      projectId: "",
      description: "Cement and reinforcement steel",
      amountCents: "21474836.48",
      expectedDelivery: "",
    }).success,
    false,
  );

  const purchaseOrder = await createPurchaseOrder(owner, parsedOrder);
  assert.ok(purchaseOrder);
  assert.equal(purchaseOrder.status, "pending_approval");
  assert.equal(
    await createPurchaseOrder(owner, {
      ...parsedOrder,
      supplierId: otherSupplier.id,
    }),
    null,
  );
  await assert.rejects(
    updatePurchaseOrderStatus(
      { ...owner, role: "procurement_officer" },
      purchaseOrder.id,
      "approved",
    ),
    /procurement:approve/,
  );

  await updatePurchaseOrderStatus(owner, purchaseOrder.id, "approved");
  await updatePurchaseOrderStatus(
    { ...owner, role: "procurement_officer" },
    purchaseOrder.id,
    "ordered",
  );
  await updatePurchaseOrderStatus(
    { ...owner, role: "storekeeper" },
    purchaseOrder.id,
    "received",
  );

  const [finalOrder] = await listPurchaseOrders(owner);
  assert.equal(finalOrder?.status, "received");
  assert.equal(finalOrder?.supplierName, supplier.name);
});
