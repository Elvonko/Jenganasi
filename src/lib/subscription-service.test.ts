import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { after, before, test } from "node:test";
import { applyMigrations, scopedConnectionString } from "@/db/migrate";
import { companies, memberships, users, type MpesaPayment } from "@/db/schema";
import type { MpesaClient } from "@/lib/mpesa/client";
import { getPricingPlan } from "@/lib/pricing";
import type {
  BillingActor,
  MpesaCallback,
} from "@/lib/subscription-service";

const baseDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const testSchema = `billing_${randomUUID().replace(/-/g, "")}`;

let db: typeof import("@/db/client").db;
let client: typeof import("@/db/client").client;
let service: typeof import("@/lib/subscription-service");
let scopedPool: Pool;

before(async () => {
  if (!baseDatabaseUrl) throw new Error("Set DATABASE_URL to run billing tests.");
  const setup = new Pool({ connectionString: baseDatabaseUrl });
  try {
    await setup.query(`CREATE SCHEMA "${testSchema}"`);
  } finally {
    await setup.end();
  }
  process.env.DATABASE_SCHEMA = testSchema;

  const database = await import("@/db/client");
  db = database.db;
  client = database.client;
  await applyMigrations(database.client);
  service = await import("@/lib/subscription-service");
  scopedPool = new Pool({
    connectionString: scopedConnectionString(baseDatabaseUrl, testSchema),
  });
});

after(async () => {
  await scopedPool?.end();
  await client?.end();
  if (baseDatabaseUrl) {
    const cleanup = new Pool({ connectionString: baseDatabaseUrl });
    try {
      await cleanup.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    } finally {
      await cleanup.end();
    }
  }
});

function mockMpesa(amount: number, resultCode = "0") {
  const calls: { amount: number; phone: string }[] = [];
  const mpesa = {
    stkPush: async (input: { amountKes: number; phoneNumber: string }) => {
      calls.push({ amount: input.amountKes, phone: input.phoneNumber });
      return {
        merchantRequestId: `merchant-${randomUUID()}`,
        checkoutRequestId: `checkout-${randomUUID()}`,
        responseCode: "0",
        responseDescription: "Accepted",
        customerMessage: "Check your phone.",
      };
    },
    queryStkStatus: async () => ({
      resultCode,
      resultDesc: resultCode === "0" ? "Ok" : "Cancelled",
      amount,
      mpesaReceiptNumber: resultCode === "0" ? "ABC123XYZ" : undefined,
    }),
  } as unknown as MpesaClient;
  return { mpesa, calls };
}

function callback(
  checkoutRequestId: string,
  resultCode: number,
  amount: number,
): MpesaCallback {
  return {
    Body: {
      stkCallback: {
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: resultCode === 0 ? "Ok" : "Cancelled",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: "ABC123XYZ" },
            { Name: "PhoneNumber", Value: "254712345678" },
          ],
        },
      },
    },
  };
}

async function createOwner(name: string): Promise<BillingActor> {
  const userId = randomUUID();
  const companyId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name,
    email: `${userId}@example.test`,
  });
  await db.insert(companies).values({
    id: companyId,
    name: `${name} Company`,
    slug: `${name.toLowerCase()}-${companyId}`,
  });
  await db.insert(memberships).values({
    id: randomUUID(),
    companyId,
    userId,
    role: "owner",
  });
  return { userId, companyId, role: "owner" };
}

async function planCodeFor(companyId: string): Promise<string | undefined> {
  const [company] = await db
    .select({ planCode: companies.planCode })
    .from(companies)
    .where(eq(companies.id, companyId));
  return company?.planCode;
}

test("M-Pesa checkout activates the plan exactly once", async () => {
  const actor = await createOwner("Billing");
  const amount = getPricingPlan("pro").priceKesPerYear;
  const { mpesa, calls } = mockMpesa(amount);

  await assert.rejects(
    service.initiateCheckout(
      { ...actor, role: "client" },
      "pro",
      "0712345678",
      false,
      mpesa,
    ),
    /cannot manage billing/,
  );

  const checkout = await service.initiateCheckout(
    actor,
    "pro",
    "0712345678",
    true,
    mpesa,
  );
  assert.equal(calls[0]?.amount, amount);
  assert.equal(calls[0]?.phone, "254712345678");

  const pending: MpesaPayment | null = await service.getCheckoutStatus(
    actor,
    checkout.checkoutRequestId,
  );
  assert.equal(pending?.status, "pending");
  assert.equal(pending?.amountKes, amount);

  const first = await service.applyMpesaCallback(
    callback(checkout.checkoutRequestId, 0, amount),
    mpesa,
  );
  assert.deepEqual(first, { accepted: true, processed: true });
  assert.equal(await planCodeFor(actor.companyId), "pro");

  const second = await service.applyMpesaCallback(
    callback(checkout.checkoutRequestId, 0, amount),
    mpesa,
  );
  assert.deepEqual(second, { accepted: true, processed: false });
  assert.equal((await service.listCompanyPayments(actor)).length, 1);

  await service.setAutoRenew(actor, false);
  assert.deepEqual(await service.listSubscriptionsDueForRenewal(365), []);
});

test("failed and mismatched payments do not upgrade the plan", async () => {
  const actor = await createOwner("Failed");
  const amount = getPricingPlan("business").priceKesPerYear;

  const failed = mockMpesa(amount, "1");
  const failedCheckout = await service.initiateCheckout(
    actor,
    "business",
    "254712345678",
    false,
    failed.mpesa,
  );
  await service.applyMpesaCallback(
    callback(failedCheckout.checkoutRequestId, 1, amount),
    failed.mpesa,
  );
  assert.equal(
    (await service.getCheckoutStatus(actor, failedCheckout.checkoutRequestId))?.status,
    "failed",
  );

  const mismatched = mockMpesa(amount - 1, "0");
  const mismatchCheckout = await service.initiateCheckout(
    actor,
    "business",
    "254712345678",
    false,
    mismatched.mpesa,
  );
  await service.applyMpesaCallback(
    callback(mismatchCheckout.checkoutRequestId, 0, amount - 1),
    mismatched.mpesa,
  );
  assert.equal(
    (await service.getCheckoutStatus(actor, mismatchCheckout.checkoutRequestId))?.status,
    "failed",
  );
  assert.equal(await planCodeFor(actor.companyId), "free");
});
