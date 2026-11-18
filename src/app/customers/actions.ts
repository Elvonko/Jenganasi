"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanyContext } from "@/lib/company-context";
import {
  createCustomer as createCustomerRecord,
  customerInputSchema,
  customerStatusSchema,
  setCustomerStatus as setCustomerStatusRecord,
  updateCustomer as updateCustomerRecord,
} from "@/lib/customer-service";

export type CustomerFormState = {
  error?: string;
};

function parseCustomerForm(formData: FormData) {
  return customerInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
}

export async function createCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the customer details.",
    };
  }

  const { actor } = await getCompanyContext("customers:create");
  const customer = await createCustomerRecord(actor, parsed.data);
  revalidatePath("/customers");
  revalidatePath("/projects/new");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) {
    return { error: "Customer not found." };
  }

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the customer details.",
    };
  }

  const { actor } = await getCompanyContext("customers:update");
  const customer = await updateCustomerRecord(actor, id, parsed.data);
  if (!customer) {
    return { error: "Customer not found or no longer available." };
  }
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return {};
}

export async function setCustomerStatus(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const status = customerStatusSchema.safeParse(formData.get("status"));
  if (
    typeof id !== "string" ||
    !z.string().uuid().safeParse(id).success ||
    !status.success
  ) {
    redirect("/customers");
  }

  const { actor } = await getCompanyContext("customers:archive");
  const customer = await setCustomerStatusRecord(actor, id, status.data);
  if (!customer) {
    redirect("/customers");
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/projects/new");
  redirect(`/customers/${id}`);
}
