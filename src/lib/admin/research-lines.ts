import type { Tables } from "@/types/database.types";

import {
  normalizeText,
  parseSortOrder,
  slugify,
  validateSlug,
  validateText,
  type TextRule,
} from "./validation";

/**
 * Campos de `research_lines` editáveis pelo CMS. Devem coincidir com os
 * GRANTs da migration enable_research_lines_projects_cms (image_path,
 * published_at, id e datas ficam de fora).
 */
export const researchLineTextRules = {
  title: { max: 160, required: true },
  short_description: { max: 300, multiline: true },
  description: { max: 6000, multiline: true },
  image_alt: { max: 200 },
} satisfies Record<string, TextRule>;

export type ResearchLineRecord = Pick<
  Tables<"research_lines">,
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "image_alt"
  | "sort_order"
  | "is_featured"
  | "is_published"
>;

/** Valores do formulário: textos como digitados; `""` representa vazio. */
export type ResearchLineFormValues = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  image_alt: string;
  sort_order: string;
  is_featured: boolean;
  is_published: boolean;
};

export type ResearchLineField = keyof ResearchLineFormValues;
export type ResearchLineFieldErrors = Partial<Record<ResearchLineField, string>>;

export const emptyResearchLineValues: ResearchLineFormValues = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  image_alt: "",
  sort_order: "0",
  is_featured: false,
  // Conteúdo novo começa como rascunho.
  is_published: false,
};

export function toResearchLineFormValues(record: ResearchLineRecord): ResearchLineFormValues {
  return {
    title: record.title,
    slug: record.slug,
    short_description: record.short_description ?? "",
    description: record.description ?? "",
    image_alt: record.image_alt ?? "",
    sort_order: String(record.sort_order),
    is_featured: record.is_featured,
    is_published: record.is_published,
  };
}

/** Lê os valores enviados por um `<form>` (checkbox marcado = "on"). */
export function readResearchLineForm(formData: FormData): ResearchLineFormValues {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    title: text("title"),
    slug: text("slug"),
    short_description: text("short_description"),
    description: text("description"),
    image_alt: text("image_alt"),
    sort_order: text("sort_order"),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
  };
}

/**
 * Normaliza e valida. `hasImage`: o texto alternativo só existe (e é
 * obrigatório, pela constraint research_lines_image_alt) com imagem.
 * Para publicar, a descrição curta também é exigida: é o texto dos cards.
 */
export function parseResearchLineValues(
  values: ResearchLineFormValues,
  { hasImage }: { hasImage: boolean },
): { data: ResearchLineRecord; errors: ResearchLineFieldErrors } {
  const errors: ResearchLineFieldErrors = {};

  const text = (field: keyof typeof researchLineTextRules, required = false) => {
    const rule: TextRule = researchLineTextRules[field];
    const value = normalizeText(values[field], rule.multiline);
    const error = validateText(value, { ...rule, required: rule.required || required });
    if (error) errors[field] = error;
    return value;
  };

  const title = text("title") ?? "";
  const slug = normalizeText(values.slug)?.toLowerCase() ?? null;
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;

  const shortDescription = text("short_description", values.is_published);
  if (values.is_published && errors.short_description === "Preencha este campo.") {
    errors.short_description = "Preencha a descrição curta para publicar.";
  }

  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  const data: ResearchLineRecord = {
    title,
    slug: slug ?? "",
    short_description: shortDescription,
    description: text("description"),
    image_alt: hasImage ? text("image_alt", true) : null,
    sort_order: sortOrder.value,
    is_featured: values.is_featured,
    is_published: values.is_published,
  };
  return { data, errors };
}

export { slugify };
