"use server";

import { revalidatePath } from "next/cache";
import { getCompanyContext } from "@/lib/company-context";
import { MpesaClient, mpesaConfigFromEnv } from "@/lib/mpesa/client";
import { isPaidPlanId, type PaidPlanId } from "@/lib/pricing";
import { initiateCheckout, setAutoRenew } from "@/lib/subscription-service";

export type CheckoutFormState = {
  error?: string;
  checkoutRequestId?: string;
};

export async function startMpesaCheckout(
  _previous: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const planId = String(formData.get("planId") ?? "");
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const autoRenew = formData.get("autoRenew") === "on";
  if (!isPaidPlanId(planId as PaidPlanId)) {
    return { error: "Choose a paid plan to continue." };
  }

  const { actor } = await getCompanyContext("settings:update");
  try {
    const client = new MpesaClient(mpesaConfigFromEnv());
    const result = await initiateCheckout(
      actor,
      planId as PaidPlanId,
      phoneNumber,
      autoRenew,
      client,
    );
    revalidatePath("/billing");
    return { checkoutRequestId: result.checkoutRequestId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn't start the M-Pesa payment. Try again.",
    };
  }
}

export async function updateAutoRenew(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "true";
  const { actor } = await getCompanyContext("settings:update");
  await setAutoRenew(actor, enabled);
  revalidatePath("/billing");
}
