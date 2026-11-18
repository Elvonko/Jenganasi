"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanyContext } from "@/lib/company-context";
import {
  createPurchaseOrder as createPurchaseOrderRecord,
  createSupplier as createSupplierRecord,
  purchaseOrderInputSchema,
  purchaseOrderStatusSchema,
  supplierInputSchema,
  updatePurchaseOrderStatus as updatePurchaseOrderStatusRecord,
} from "@/lib/procurement-service";

export type ProcurementFormState = {
  error?: string;
};

export async function createSupplier(
  _previousState: ProcurementFormState,
  formData: FormData,
): Promise<ProcurementFormState> {
  const parsed = supplierInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    category: formData.get("category") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the supplier details.",
    };
  }

  const { actor } = await getCompanyContext("procurement:create");
  await createSupplierRecord(actor, parsed.data);
  revalidatePath("/procurement");
  redirect("/procurement");
}

export async function createPurchaseOrder(
  _previousState: ProcurementFormState,
  formData: FormData,
): Promise<ProcurementFormState> {
  const parsed = purchaseOrderInputSchema.safeParse({
    supplierId: formData.get("supplierId"),
    projectId: formData.get("projectId") ?? "",
    description: formData.get("description"),
    amountCents: formData.get("amount"),
    expectedDelivery: formData.get("expectedDelivery") ?? "",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the purchase request.",
    };
  }

  const { actor } = await getCompanyContext("procurement:create");
  const purchaseOrder = await createPurchaseOrderRecord(actor, parsed.data);
  if (!purchaseOrder) {
    return {
      error: "The selected supplier or project is no longer available.",
    };
  }
  revalidatePath("/procurement");
  redirect("/procurement");
}

export async function updatePurchaseOrderStatus(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const status = purchaseOrderStatusSchema.safeParse(formData.get("status"));
  if (
    typeof id !== "string" ||
    !z.string().uuid().safeParse(id).success ||
    !status.success
  ) {
    redirect("/procurement");
  }

  const { actor } = await getCompanyContext("procurement:read");
  const purchaseOrder = await updatePurchaseOrderStatusRecord(
    actor,
    id,
    status.data,
  );
  if (!purchaseOrder) {
    redirect("/procurement");
  }
  revalidatePath("/procurement");
  redirect("/procurement");
}
