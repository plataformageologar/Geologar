import type { Tables } from "@/types/database.types";

import {
  isUuid,
  normalizeText,
  parseSortOrder,
  validateDate,
  validateExternalUrl,
  validateSlug,
  validateText,
  type TextRule,
} from "./validation";

/**
 * Campos de `projects` editáveis pelo CMS. Devem coincidir com os GRANTs da
 * migration enable_research_lines_projects_cms e com os parâmetros da função
 * save_project.
 */
export const projectTextRules = {
  title: { max: 200, required: true },
  short_description: { max: 400, multiline: true },
  description: { max: 10000, multiline: true },
  image_alt: { max: 200 },
  coordination: { max: 1000, multiline: true },
  funding: { max: 1000, multiline: true },
  result_or_contribution: { max: 4000, multiline: true },
} satisfies Record<string, TextRule>;

/** Valores aceitos pela constraint projects_status_check. */
export const projectStatuses = ["ongoing", "completed"] as const;
export type ProjectStatusValue = (typeof projectStatuses)[number];

export const projectStatusOptions: { value: ProjectStatusValue; label: string }[] = [
  { value: "ongoing", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
];

export const projectStatusLabel: Record<string, string> = {
  ongoing: "Em andamento",
  completed: "Concluído",
};

/** Limite de linhas por projeto (o mesmo da função save_project). */
export const MAX_PROJECT_RESEARCH_LINES = 100;

export type ProjectRecord = Pick<
  Tables<"projects">,
  | "title"
  | "slug"
  | "short_description"
  | "description"
  | "image_alt"
  | "project_status"
  | "start_date"
  | "end_date"
  | "coordination"
  | "funding"
  | "result_or_contribution"
  | "external_url"
  | "sort_order"
  | "is_featured"
  | "is_published"
>;

export type ProjectFormValues = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  image_alt: string;
  project_status: string;
  start_date: string;
  end_date: string;
  coordination: string;
  funding: string;
  result_or_contribution: string;
  external_url: string;
  sort_order: string;
  is_featured: boolean;
  is_published: boolean;
  /** Ids das linhas de pesquisa marcadas, em ordem estável. */
  research_line_ids: string[];
};

export type ProjectField = keyof ProjectFormValues;
export type ProjectFieldErrors = Partial<Record<ProjectField, string>>;

export const emptyProjectValues: ProjectFormValues = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  image_alt: "",
  project_status: "",
  start_date: "",
  end_date: "",
  coordination: "",
  funding: "",
  result_or_contribution: "",
  external_url: "",
  sort_order: "0",
  is_featured: false,
  is_published: false,
  research_line_ids: [],
};

export function toProjectFormValues(
  record: ProjectRecord,
  researchLineIds: string[],
): ProjectFormValues {
  return {
    title: record.title,
    slug: record.slug,
    short_description: record.short_description ?? "",
    description: record.description ?? "",
    image_alt: record.image_alt ?? "",
    project_status: record.project_status,
    start_date: record.start_date ?? "",
    end_date: record.end_date ?? "",
    coordination: record.coordination ?? "",
    funding: record.funding ?? "",
    result_or_contribution: record.result_or_contribution ?? "",
    external_url: record.external_url ?? "",
    sort_order: String(record.sort_order),
    is_featured: record.is_featured,
    is_published: record.is_published,
    research_line_ids: [...researchLineIds].sort(),
  };
}

export function readProjectForm(formData: FormData): ProjectFormValues {
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
    project_status: text("project_status"),
    start_date: text("start_date"),
    end_date: text("end_date"),
    coordination: text("coordination"),
    funding: text("funding"),
    result_or_contribution: text("result_or_contribution"),
    external_url: text("external_url"),
    sort_order: text("sort_order"),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
    research_line_ids: formData
      .getAll("research_line_ids")
      .filter((value): value is string => typeof value === "string"),
  };
}

function isProjectStatus(value: string): value is ProjectStatusValue {
  return (projectStatuses as readonly string[]).includes(value);
}

/**
 * Normaliza e valida. `knownLineIds` (opcional, no servidor) recusa linhas
 * que não existem; o banco também recusa (FK) dentro da mesma transação.
 */
export function parseProjectValues(
  values: ProjectFormValues,
  { hasImage, knownLineIds }: { hasImage: boolean; knownLineIds?: Set<string> },
): { data: ProjectRecord; researchLineIds: string[]; errors: ProjectFieldErrors } {
  const errors: ProjectFieldErrors = {};

  const text = (field: keyof typeof projectTextRules, required = false) => {
    const rule: TextRule = projectTextRules[field];
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

  const status = values.project_status;
  if (!isProjectStatus(status)) errors.project_status = "Selecione a situação do projeto.";

  const startDate = normalizeText(values.start_date);
  const endDate = normalizeText(values.end_date);
  const startError = validateDate(startDate);
  const endError = validateDate(endDate);
  if (startError) errors.start_date = startError;
  if (endError) errors.end_date = endError;
  // Datas ISO (AAAA-MM-DD) comparam corretamente como texto.
  if (!startError && !endError && startDate && endDate && endDate < startDate) {
    errors.end_date = "A data de término deve ser igual ou posterior à data de início.";
  }

  const externalUrl = normalizeText(values.external_url);
  const urlError = validateExternalUrl(externalUrl);
  if (urlError) errors.external_url = urlError;

  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  const researchLineIds = [...new Set(values.research_line_ids)].sort();
  if (
    researchLineIds.length > MAX_PROJECT_RESEARCH_LINES ||
    !researchLineIds.every(isUuid) ||
    (knownLineIds && !researchLineIds.every((id) => knownLineIds.has(id)))
  ) {
    errors.research_line_ids =
      "Uma das linhas selecionadas não existe mais. Recarregue a página e selecione novamente.";
  }

  const data: ProjectRecord = {
    title,
    slug: slug ?? "",
    short_description: shortDescription,
    description: text("description"),
    image_alt: hasImage ? text("image_alt", true) : null,
    project_status: status,
    start_date: startError ? null : startDate,
    end_date: endError ? null : endDate,
    coordination: text("coordination"),
    funding: text("funding"),
    result_or_contribution: text("result_or_contribution"),
    external_url: externalUrl,
    sort_order: sortOrder.value,
    is_featured: values.is_featured,
    is_published: values.is_published,
  };
  return { data, researchLineIds, errors };
}
