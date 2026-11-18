import "server-only";

import { randomUUID } from "node:crypto";
import {
  and,
  desc,
  eq,
  isNotNull,
  lte,
} from "drizzle-orm";
import { db, ensureDatabase } from "@/db/client";
import {
  auditEvents,
  companies,
  mpesaPayments,
  subscriptions,
  type MpesaPayment,
  type Subscription,
} from "@/db/schema";
import { hasPermission, type MemberRole } from "@/lib/permissions";
import {
  getPricingPlan,
  isPaidPlanId,
  type PaidPlanId,
} from "@/lib/pricing";
import {
  MpesaClient,
  normalizeMsisdn,
} from "./mpesa/client";

export type BillingActor = {
  userId: string;
  companyId: string;
  role: MemberRole;
};

export type MpesaCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID: string;
      ResultCode: number | string;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: { Name: string; Value?: string | number }[];
      };
    };
  };
};

export type CallbackResult = { accepted: true; processed: boolean };

type StkCallback = NonNullable<
  NonNullable<MpesaCallback["Body"]>["stkCallback"]
>;

function assertPermission(actor: BillingActor): void {
  if (!hasPermission(actor.role, "settings:update")) {
    throw new Error(`Role "${actor.role}" cannot manage billing.`);
  }
}

async function getSubscription(companyId: string): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.companyId, companyId))
    .limit(1);
  return rows[0];
}

export async function getCompanySubscription(actor: BillingActor) {
  assertPermission(actor);
  await ensureDatabase();
  return getSubscription(actor.companyId) ?? null;
}

export async function listCompanyPayments(
  actor: BillingActor,
  limit = 20,
): Promise<MpesaPayment[]> {
  assertPermission(actor);
  await ensureDatabase();
  return db
    .select()
    .from(mpesaPayments)
    .where(eq(mpesaPayments.companyId, actor.companyId))
    .orderBy(desc(mpesaPayments.initiatedAt))
    .limit(limit);
}

export async function getCheckoutStatus(
  actor: BillingActor,
  checkoutRequestId: string,
): Promise<MpesaPayment | null> {
  assertPermission(actor);
  await ensureDatabase();
  const rows = await db
    .select()
    .from(mpesaPayments)
    .where(
      and(
        eq(mpesaPayments.companyId, actor.companyId),
        eq(mpesaPayments.checkoutRequestId, checkoutRequestId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type CheckoutResult = {
  paymentId: string;
  checkoutRequestId: string;
};

export async function initiateCheckout(
  actor: BillingActor,
  planId: PaidPlanId,
  phoneNumber: string,
  autoRenew: boolean,
  client: MpesaClient,
): Promise<CheckoutResult> {
  assertPermission(actor);
  await ensureDatabase();
  const plan = getPricingPlan(planId);
  if (!isPaidPlanId(planId)) {
    throw new Error("Choose a paid plan to check out.");
  }
  const msisdn = normalizeMsisdn(phoneNumber);
  const now = new Date();

  await db.transaction(async (transaction) => {
    const existing = await getSubscription(actor.companyId);
    if (existing) {
      await transaction
        .update(subscriptions)
        .set({
          planCode: planId,
          msisdn,
          autoRenew,
          autoRenewConsentAt: autoRenew ? now : null,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing.id));
    } else {
      await transaction.insert(subscriptions).values({
        id: randomUUID(),
        companyId: actor.companyId,
        planCode: planId,
        status: "pending",
        msisdn,
        createdBy: actor.userId,
        autoRenew,
        autoRenewConsentAt: autoRenew ? now : null,
      });
    }
    await transaction.insert(auditEvents).values({
      id: randomUUID(),
      companyId: actor.companyId,
      actorUserId: actor.userId,
      action: "subscription.checkout_started",
      resourceType: "subscription",
      resourceId: actor.companyId,
      metadata: { planCode: planId, amountKes: plan.priceKesPerYear },
    });
  });

  const subscription = await getSubscription(actor.companyId);
  const [payment] = await db
    .insert(mpesaPayments)
    .values({
      id: randomUUID(),
      companyId: actor.companyId,
      subscriptionId: subscription?.id ?? null,
      initiatedBy: actor.userId,
      planCode: planId,
      amountKes: plan.priceKesPerYear,
      phoneNumber: msisdn,
      status: "pending",
    })
    .returning();

  try {
    const result = await client.stkPush({
      amountKes: plan.priceKesPerYear,
      phoneNumber: msisdn,
      accountReference: `JGN-${actor.companyId.slice(0, 8)}`,
      transactionDesc: `JengaNasi ${plan.name} annual plan`,
    });
    await db
      .update(mpesaPayments)
      .set({
        merchantRequestId: result.merchantRequestId,
        checkoutRequestId: result.checkoutRequestId,
      })
      .where(eq(mpesaPayments.id, payment.id));
    return { paymentId: payment.id, checkoutRequestId: result.checkoutRequestId };
  } catch (error) {
    await db
      .update(mpesaPayments)
      .set({
        status: "failed",
        resultDesc: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      })
      .where(eq(mpesaPayments.id, payment.id));
    throw error;
  }
}

function callbackMetadata(callback: StkCallback) {
  const items = callback?.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((item) => item.Name === name)?.Value;
  return {
    amount: Number(find("Amount") ?? 0),
    receipt: find("MpesaReceiptNumber")?.toString(),
    phone: find("PhoneNumber")?.toString(),
  };
}

export async function applyMpesaCallback(
  payload: MpesaCallback,
  client: MpesaClient | null,
): Promise<CallbackResult> {
  await ensureDatabase();
  const callback = payload.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return { accepted: true, processed: false };

  const [payment] = await db
    .select()
    .from(mpesaPayments)
    .where(eq(mpesaPayments.checkoutRequestId, callback.CheckoutRequestID))
    .limit(1);
  if (!payment || payment.status !== "pending") {
    return { accepted: true, processed: false };
  }

  const metadata = callbackMetadata(callback);
  let resultCode = String(callback.ResultCode);
  let receipt = metadata.receipt;
  let phone = metadata.phone;
  let amount = metadata.amount;

  if (client) {
    let verified;
    try {
      verified = await client.queryStkStatus(callback.CheckoutRequestID);
    } catch {
      return { accepted: true, processed: false };
    }
    resultCode = verified.resultCode;
    if (verified.amount !== undefined) amount = verified.amount;
    if (verified.mpesaReceiptNumber) receipt = verified.mpesaReceiptNumber;
    if (verified.phoneNumber) phone = verified.phoneNumber;
  }

  const paid = resultCode === "0";
  const amountMatches = amount === payment.amountKes;
  const finalStatus = paid && amountMatches ? "success" : "failed";
  const description =
    !paid ? callback.ResultDesc ?? "Payment was not completed."
      : !amountMatches ? "Paid amount did not match the invoice."
        : callback.ResultDesc ?? "Payment received.";

  await db.transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(mpesaPayments)
      .where(eq(mpesaPayments.id, payment.id))
      .for("update")
      .limit(1);
    if (!current || current.status !== "pending") return;

    await transaction
      .update(mpesaPayments)
      .set({
        status: finalStatus,
        resultCode,
        resultDesc: description,
        mpesaReceiptNumber: receipt ?? null,
        phoneNumber: phone ?? payment.phoneNumber,
        completedAt: new Date(),
      })
      .where(eq(mpesaPayments.id, payment.id));

    if (finalStatus !== "success") return;

    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const [existing] = await transaction
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.companyId, payment.companyId))
      .limit(1);
    if (existing) {
      await transaction
        .update(subscriptions)
        .set({
          planCode: payment.planCode,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id));
    }
    await transaction
      .update(companies)
      .set({ planCode: payment.planCode, updatedAt: new Date() })
      .where(eq(companies.id, payment.companyId));

    const actorUserId = existing?.createdBy ?? payment.initiatedBy;
    if (actorUserId) {
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        companyId: payment.companyId,
        actorUserId,
        action: "subscription.activated",
        resourceType: "subscription",
        resourceId: payment.companyId,
        metadata: {
          planCode: payment.planCode,
          amountKes: payment.amountKes,
          receipt: receipt ?? "",
        },
      });
    }
  });

  return { accepted: true, processed: true };
}

export async function setAutoRenew(
  actor: BillingActor,
  enabled: boolean,
): Promise<void> {
  assertPermission(actor);
  await ensureDatabase();
  const subscription = await getSubscription(actor.companyId);
  if (!subscription || !subscription.msisdn || subscription.status !== "active") {
    throw new Error("Complete a paid subscription before enabling auto-renew.");
  }
  await db
    .update(subscriptions)
    .set({
      autoRenew: enabled,
      autoRenewConsentAt: enabled ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));
}

export async function listSubscriptionsDueForRenewal(
  days = 7,
): Promise<Subscription[]> {
  await ensureDatabase();
  const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.autoRenew, true),
        isNotNull(subscriptions.currentPeriodEnd),
        lte(subscriptions.currentPeriodEnd, deadline),
      ),
    );
}

export async function initiateRenewal(
  subscription: Subscription,
  client: MpesaClient,
): Promise<CheckoutResult> {
  const plan = getPricingPlan(subscription.planCode);
  if (!isPaidPlanId(subscription.planCode) || !subscription.msisdn) {
    throw new Error("Subscription is not eligible for renewal.");
  }
  const [payment] = await db
    .insert(mpesaPayments)
    .values({
      id: randomUUID(),
      companyId: subscription.companyId,
      subscriptionId: subscription.id,
      initiatedBy: subscription.createdBy,
      planCode: subscription.planCode,
      amountKes: plan.priceKesPerYear,
      phoneNumber: subscription.msisdn,
      status: "pending",
      metadata: { renewal: true },
    })
    .returning();
  const result = await client.stkPush({
    amountKes: plan.priceKesPerYear,
    phoneNumber: subscription.msisdn,
    accountReference: `JGN-${subscription.companyId.slice(0, 8)}`,
    transactionDesc: `JengaNasi ${plan.name} renewal`,
  });
  await db
    .update(mpesaPayments)
    .set({
      merchantRequestId: result.merchantRequestId,
      checkoutRequestId: result.checkoutRequestId,
    })
    .where(eq(mpesaPayments.id, payment.id));
  return { paymentId: payment.id, checkoutRequestId: result.checkoutRequestId };
}
