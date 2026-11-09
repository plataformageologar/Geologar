import type { Tables } from "@/types/database.types";

import {
  isUuid,
  normalizeText,
  parseSortOrder,
  validateExternalUrl,
  validateSlug,
  validateText,
  type TextRule,
} from "./validation";

// Instituições -------------------------------------------------------------------

/**
 * Campos de `institutions` editáveis pelo CMS (GRANTs da migration
 * enable_publications_institutions_settings_cms). logo_path fica fora: o
 * envio de logotipos chega com a biblioteca de mídia.
 */
export const institutionTextRules = {
  name: { max: 300, required: true },
  acronym: { max: 40 },
  description: { max: 4000, multiline: true },
  logo_alt: { max: 200 },
  city: { max: 120 },
  state: { max: 120 },
  country: { max: 120 },
} satisfies Record<string, TextRule>;

export type InstitutionRecord = Pick<
  Tables<"institutions">,
  | "category_id"
  | "name"
  | "acronym"
  | "description"
  | "logo_alt"
  | "website_url"
  | "city"
  | "state"
  | "country"
  | "sort_order"
  | "is_featured"
  | "is_published"
>;

export type InstitutionFormValues = {
  category_id: string;
  name: string;
  acronym: string;
  description: string;
  logo_alt: string;
  website_url: string;
  city: string;
  state: string;
  country: string;
  sort_order: string;
  is_featured: boolean;
  is_published: boolean;
};

export type InstitutionField = keyof InstitutionFormValues;
export type InstitutionFieldErrors = Partial<Record<InstitutionField, string>>;

export const emptyInstitutionValues: InstitutionFormValues = {
  category_id: "",
  name: "",
  acronym: "",
  description: "",
  logo_alt: "",
  website_url: "",
  city: "",
  state: "",
  country: "",
  sort_order: "0",
  is_featured: false,
  is_published: false,
};

export function toInstitutionFormValues(record: InstitutionRecord): InstitutionFormValues {
  return {
    category_id: record.category_id,
    name: record.name,
    acronym: record.acronym ?? "",
    description: record.description ?? "",
    logo_alt: record.logo_alt ?? "",
    website_url: record.website_url ?? "",
    city: record.city ?? "",
    state: record.state ?? "",
    country: record.country ?? "",
    sort_order: String(record.sort_order),
    is_featured: record.is_featured,
    is_published: record.is_published,
  };
}

export function readInstitutionForm(formData: FormData): InstitutionFormValues {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    category_id: text("category_id"),
    name: text("name"),
    acronym: text("acronym"),
    description: text("description"),
    logo_alt: text("logo_alt"),
    website_url: text("website_url"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    sort_order: text("sort_order"),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
  };
}

/**
 * `hasLogo`: o texto alternativo só existe (e é obrigatório, pela constraint
 * institutions_logo_alt) quando há logotipo. `knownCategoryIds` (servidor)
 * recusa categorias inexistentes; a FK também recusa.
 */
export function parseInstitutionValues(
  values: InstitutionFormValues,
  { hasLogo, knownCategoryIds }: { hasLogo: boolean; knownCategoryIds?: Set<string> },
): { data: InstitutionRecord; errors: InstitutionFieldErrors } {
  const errors: InstitutionFieldErrors = {};

  const text = (field: keyof typeof institutionTextRules, required = false) => {
    const rule: TextRule = institutionTextRules[field];
    const value = normalizeText(values[field], rule.multiline);
    const error = validateText(value, { ...rule, required: rule.required || required });
    if (error) errors[field] = error;
    return value;
  };

  const categoryId = values.category_id.trim();
  if (!isUuid(categoryId) || (knownCategoryIds && !knownCategoryIds.has(categoryId))) {
    errors.category_id = categoryId === "" ? "Selecione a categoria." : "A categoria selecionada não existe mais.";
  }

  const websiteUrl = normalizeText(values.website_url);
  const urlError = validateExternalUrl(websiteUrl);
  if (urlError) errors.website_url = urlError;

  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  const data: InstitutionRecord = {
    category_id: categoryId,
    name: text("name") ?? "",
    acronym: text("acronym"),
    description: text("description"),
    logo_alt: hasLogo ? text("logo_alt", true) : null,
    website_url: websiteUrl,
    city: text("city"),
    state: text("state"),
    country: text("country"),
    sort_order: sortOrder.value,
    is_featured: values.is_featured,
    is_published: values.is_published,
  };
  return { data, errors };
}

// Categorias -----------------------------------------------------------------------

export const categoryTextRules = {
  name: { max: 120, required: true },
  description: { max: 1000, multiline: true },
} satisfies Record<string, TextRule>;

export type CategoryRecord = Pick<Tables<"institution_categories">, "name" | "slug" | "description" | "sort_order">;

export type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
};

export type CategoryField = keyof CategoryFormValues;
export type CategoryFieldErrors = Partial<Record<CategoryField, string>>;

export const emptyCategoryValues: CategoryFormValues = { name: "", slug: "", description: "", sort_order: "0" };

export function toCategoryFormValues(record: CategoryRecord): CategoryFormValues {
  return {
    name: record.name,
    slug: record.slug,
    description: record.description ?? "",
    sort_order: String(record.sort_order),
  };
}

export function readCategoryForm(formData: FormData): CategoryFormValues {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    sort_order: text("sort_order"),
  };
}

export function parseCategoryValues(values: CategoryFormValues): {
  data: CategoryRecord;
  errors: CategoryFieldErrors;
} {
  const errors: CategoryFieldErrors = {};
  const text = (field: keyof typeof categoryTextRules) => {
    const rule: TextRule = categoryTextRules[field];
    const value = normalizeText(values[field], rule.multiline);
    const error = validateText(value, rule);
    if (error) errors[field] = error;
    return value;
  };

  const name = text("name") ?? "";
  const slug = normalizeText(values.slug)?.toLowerCase() ?? null;
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;
  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  return {
    data: { name, slug: slug ?? "", description: text("description"), sort_order: sortOrder.value },
    errors,
  };
}

/** "Cidade, UF, País" com os campos preenchidos. */
export function formatInstitutionPlace(record: {
  city: string | null;
  state: string | null;
  country: string | null;
}) {
  return [record.city, record.state, record.country].filter(Boolean).join(", ");
}
