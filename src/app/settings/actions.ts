"use server";

import { revalidatePath } from "next/cache";
import { getCompanyContext } from "@/lib/company-context";
import {
  companySettingsSchema,
  updateCompanySettings,
} from "@/lib/company-settings-service";
import {
  companyTemplateInputSchema,
  createCompanyTemplate,
  deleteCompanyTemplate,
  DuplicateCompanyTemplateError,
} from "@/lib/company-template-service";
import { z } from "zod";

export type CompanySettingsFormState = {
  error?: string;
  success?: string;
};

export type CompanyTemplateFormState = {
  error?: string;
  success?: string;
};

function splitTemplateTitles(value: FormDataEntryValue | null): string[] {
  return typeof value === "string"
    ? value.split(/\r?\n/).map((title) => title.trim()).filter(Boolean)
    : [];
}

async function saveTemplate(
  input: unknown,
): Promise<CompanyTemplateFormState> {
  const parsed = companyTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the template details.",
    };
  }

  const { actor } = await getCompanyContext("settings:update");
  try {
    await createCompanyTemplate(actor, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateCompanyTemplateError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/projects/new");
  revalidatePath("/estimates/new");
  return { success: "Template saved." };
}

export async function saveProjectTemplate(
  _previousState: CompanyTemplateFormState,
  formData: FormData,
): Promise<CompanyTemplateFormState> {
  const tasks = splitTemplateTitles(formData.get("taskTitles")).map((title) => ({
    title,
    description: "",
  }));
  const milestones = splitTemplateTitles(formData.get("milestoneTitles")).map(
    (title) => ({ title }),
  );
  return saveTemplate({
    templateType: "project",
    name: formData.get("name"),
    data: { tasks, milestones },
  });
}

export async function saveEstimateTemplate(
  _previousState: CompanyTemplateFormState,
  formData: FormData,
): Promise<CompanyTemplateFormState> {
  const categories = formData.getAll("category");
  const descriptions = formData.getAll("description");
  const units = formData.getAll("unit");
  const quantities = formData.getAll("quantity");
  const unitRates = formData.getAll("unitRate");
  const lengths = [
    categories.length,
    descriptions.length,
    units.length,
    quantities.length,
    unitRates.length,
  ];
  if (lengths.some((length) => length !== lengths[0])) {
    return { error: "Complete each cost item before saving the template." };
  }

  const entries = categories.map((category, index) => {
    const description = descriptions[index];
    const unit = units[index];
    const quantity = quantities[index];
    const unitRate = unitRates[index];
    if (
      typeof category !== "string" ||
      typeof description !== "string" ||
      typeof unit !== "string" ||
      typeof quantity !== "string" ||
      !quantity.trim() ||
      typeof unitRate !== "string" ||
      !unitRate.trim()
    ) {
      return null;
    }
    return {
      category,
      description,
      unit,
      quantity: Number(quantity),
      unitRate: Number(unitRate),
    };
  });
  if (entries.some((entry) => entry === null)) {
    return { error: "Complete each cost item before saving the template." };
  }
  const lineItems = entries.filter(
    (entry): entry is NonNullable<typeof entry> => entry !== null,
  );

  return saveTemplate({
    templateType: "estimate",
    name: formData.get("name"),
    data: { lineItems },
  });
}

export async function deleteCompanyTemplateAction(
  formData: FormData,
): Promise<void> {
  const templateId = z.string().uuid().safeParse(formData.get("templateId"));
  if (!templateId.success) {
    throw new Error("Choose a valid template to delete.");
  }
  const { actor } = await getCompanyContext("settings:update");
  const deleted = await deleteCompanyTemplate(actor, templateId.data);
  if (!deleted) {
    throw new Error("Template not found or no longer available.");
  }
  revalidatePath("/settings");
  revalidatePath("/projects/new");
  revalidatePath("/estimates/new");
}

export async function saveCompanySettings(
  _previousState: CompanySettingsFormState,
  formData: FormData,
): Promise<CompanySettingsFormState> {
  const parsed = companySettingsSchema.safeParse({
    name: formData.get("name"),
    countryCode: formData.get("countryCode"),
    currencyCode: formData.get("currencyCode"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the company settings.",
    };
  }

  const { actor } = await getCompanyContext("settings:update");
  const company = await updateCompanySettings(actor, parsed.data);
  if (!company) {
    return { error: "Company settings could not be saved." };
  }

  revalidatePath("/overview");
  revalidatePath("/reports");
  revalidatePath("/settings");
  return { success: "Company settings saved." };
}
