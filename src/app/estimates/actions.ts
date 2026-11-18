"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanyContext } from "@/lib/company-context";
import {
  addEstimateLineItem,
  createEstimate,
  estimateInputSchema,
  estimateLineItemInputSchema,
  estimateStatusSchema,
  removeEstimateLineItem,
  updateEstimateStatus,
} from "@/lib/estimate-service";

export type EstimateFormState = {
  error?: string;
};

const uuidSchema = z.string().uuid();

export async function createEstimateAction(
  _previousState: EstimateFormState,
  formData: FormData,
): Promise<EstimateFormState> {
  const parsed = estimateInputSchema.safeParse({
    projectId: formData.get("projectId"),
    templateId: formData.get("templateId") ?? "",
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the estimate details." };
  }

  const { actor } = await getCompanyContext("estimates:create");
  const estimate = await createEstimate(actor, parsed.data);
  redirect(`/estimates/${estimate.id}`);
}

export async function addEstimateLineItemAction(
  _previousState: EstimateFormState,
  formData: FormData,
): Promise<EstimateFormState> {
  const estimateId = formData.get("estimateId");
  if (typeof estimateId !== "string" || !uuidSchema.safeParse(estimateId).success) {
    return { error: "Estimate not found." };
  }

  const parsed = estimateLineItemInputSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    unitRate: formData.get("unitRate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the BOQ item details." };
  }

  const { actor } = await getCompanyContext("estimates:update");
  await addEstimateLineItem(actor, estimateId, parsed.data);
  revalidatePath(`/estimates/${estimateId}`);
  return {};
}

export async function removeEstimateLineItemAction(
  formData: FormData,
): Promise<void> {
  const estimateId = formData.get("estimateId");
  const itemId = formData.get("itemId");
  if (
    typeof estimateId !== "string" ||
    !uuidSchema.safeParse(estimateId).success ||
    typeof itemId !== "string" ||
    !uuidSchema.safeParse(itemId).success
  ) {
    redirect("/estimates");
  }

  const { actor } = await getCompanyContext("estimates:update");
  const removed = await removeEstimateLineItem(actor, estimateId, itemId);
  if (!removed) {
    throw new Error("BOQ item no longer exists on this estimate.");
  }
  revalidatePath(`/estimates/${estimateId}`);
}

export async function updateEstimateStatusAction(
  formData: FormData,
): Promise<void> {
  const estimateId = formData.get("estimateId");
  const status = estimateStatusSchema.safeParse(formData.get("status"));
  if (
    typeof estimateId !== "string" ||
    !uuidSchema.safeParse(estimateId).success ||
    !status.success
  ) {
    redirect("/estimates");
  }

  const { actor } = await getCompanyContext("estimates:update");
  const estimate = await updateEstimateStatus(actor, estimateId, status.data);
  if (!estimate) {
    redirect("/estimates");
  }

  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath("/estimates");
  redirect(`/estimates/${estimateId}`);
}
