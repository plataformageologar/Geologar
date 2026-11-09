import type { Tables } from "@/types/database.types";

import {
  isUuid,
  normalizeDoi,
  normalizeText,
  parsePublicationYear,
  parseSortOrder,
  validateExternalUrl,
  validateSlug,
  validateText,
  type TextRule,
} from "./validation";

/**
 * Campos de `publications` editáveis pelo CMS. Devem coincidir com os GRANTs
 * da migration enable_publications_institutions_settings_cms e com os
 * parâmetros da função save_publication.
 *
 * Título, autores, resumo e citação são gravados como digitados (sem mudar
 * capitalização, idioma ou a ordem dos autores).
 */
export const publicationTextRules = {
  title: { max: 400, required: true },
  authors: { max: 2000, required: true },
  publication_venue: { max: 300 },
  abstract: { max: 10000, multiline: true },
  citation: { max: 2000, multiline: true },
} satisfies Record<string, TextRule>;

/** Limite de vínculos por tipo (o mesmo da função save_publication). */
export const MAX_PUBLICATION_LINKS = 100;

export type PublicationRecord = Pick<
  Tables<"publications">,
  | "title"
  | "slug"
  | "authors"
  | "publication_venue"
  | "publication_year"
  | "doi"
  | "external_url"
  | "abstract"
  | "citation"
  | "sort_order"
  | "is_featured"
  | "is_published"
>;

export type PublicationFormValues = {
  title: string;
  slug: string;
  authors: string;
  publication_venue: string;
  publication_year: string;
  doi: string;
  external_url: string;
  abstract: string;
  citation: string;
  sort_order: string;
  is_featured: boolean;
  is_published: boolean;
  /** Ids dos projetos e linhas marcados, em ordem estável. */
  project_ids: string[];
  research_line_ids: string[];
};

export type PublicationField = keyof PublicationFormValues;
export type PublicationFieldErrors = Partial<Record<PublicationField, string>>;

export const emptyPublicationValues: PublicationFormValues = {
  title: "",
  slug: "",
  authors: "",
  publication_venue: "",
  publication_year: "",
  doi: "",
  external_url: "",
  abstract: "",
  citation: "",
  sort_order: "0",
  is_featured: false,
  // Conteúdo novo começa como rascunho.
  is_published: false,
  project_ids: [],
  research_line_ids: [],
};

export function toPublicationFormValues(
  record: PublicationRecord,
  projectIds: string[],
  researchLineIds: string[],
): PublicationFormValues {
  return {
    title: record.title,
    slug: record.slug,
    authors: record.authors,
    publication_venue: record.publication_venue ?? "",
    publication_year: record.publication_year === null ? "" : String(record.publication_year),
    doi: record.doi ?? "",
    external_url: record.external_url ?? "",
    abstract: record.abstract ?? "",
    citation: record.citation ?? "",
    sort_order: String(record.sort_order),
    is_featured: record.is_featured,
    is_published: record.is_published,
    project_ids: [...projectIds].sort(),
    research_line_ids: [...researchLineIds].sort(),
  };
}

export function readPublicationForm(formData: FormData): PublicationFormValues {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  const ids = (field: string) =>
    formData.getAll(field).filter((value): value is string => typeof value === "string");
  return {
    title: text("title"),
    slug: text("slug"),
    authors: text("authors"),
    publication_venue: text("publication_venue"),
    publication_year: text("publication_year"),
    doi: text("doi"),
    external_url: text("external_url"),
    abstract: text("abstract"),
    citation: text("citation"),
    sort_order: text("sort_order"),
    is_featured: formData.get("is_featured") === "on",
    is_published: formData.get("is_published") === "on",
    project_ids: ids("project_ids"),
    research_line_ids: ids("research_line_ids"),
  };
}

function parseLinkIds(values: string[], known: Set<string> | undefined) {
  const ids = [...new Set(values)].sort();
  const valid =
    ids.length <= MAX_PUBLICATION_LINKS && ids.every(isUuid) && (!known || ids.every((id) => known.has(id)));
  return { ids, valid };
}

/**
 * Normaliza e valida. `knownProjectIds`/`knownLineIds` (opcionais, no
 * servidor) recusam registros inexistentes; o banco também recusa (FK)
 * dentro da mesma transação.
 */
export function parsePublicationValues(
  values: PublicationFormValues,
  {
    knownProjectIds,
    knownLineIds,
  }: { knownProjectIds?: Set<string>; knownLineIds?: Set<string> } = {},
): {
  data: PublicationRecord;
  projectIds: string[];
  researchLineIds: string[];
  errors: PublicationFieldErrors;
} {
  const errors: PublicationFieldErrors = {};

  const text = (field: keyof typeof publicationTextRules) => {
    const rule: TextRule = publicationTextRules[field];
    const value = normalizeText(values[field], rule.multiline);
    const error = validateText(value, rule);
    if (error) errors[field] = error;
    return value;
  };

  const title = text("title") ?? "";
  const authors = text("authors") ?? "";
  if (errors.authors === "Preencha este campo.") {
    errors.authors = "Informe os autores, na ordem e grafia da publicação.";
  }

  const slug = normalizeText(values.slug)?.toLowerCase() ?? null;
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;

  const year = parsePublicationYear(values.publication_year);
  if (year.error) errors.publication_year = year.error;

  const doi = normalizeDoi(normalizeText(values.doi));
  if (doi.error) errors.doi = doi.error;

  const externalUrl = normalizeText(values.external_url);
  const urlError = validateExternalUrl(externalUrl);
  if (urlError) errors.external_url = urlError;

  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  const projects = parseLinkIds(values.project_ids, knownProjectIds);
  if (!projects.valid) {
    errors.project_ids = "Um dos projetos selecionados não existe mais. Recarregue a página e selecione novamente.";
  }
  const lines = parseLinkIds(values.research_line_ids, knownLineIds);
  if (!lines.valid) {
    errors.research_line_ids =
      "Uma das linhas selecionadas não existe mais. Recarregue a página e selecione novamente.";
  }

  const data: PublicationRecord = {
    title,
    slug: slug ?? "",
    authors,
    publication_venue: text("publication_venue"),
    publication_year: year.value,
    doi: doi.value,
    external_url: externalUrl,
    abstract: text("abstract"),
    citation: text("citation"),
    sort_order: sortOrder.value,
    is_featured: values.is_featured,
    is_published: values.is_published,
  };
  return { data, projectIds: projects.ids, researchLineIds: lines.ids, errors };
}

/** Link externo da publicação: URL informada ou, na falta, o DOI. */
export function publicationResourceHref(record: { external_url: string | null; doi: string | null }) {
  if (record.external_url) return record.external_url;
  return record.doi ? `https://doi.org/${record.doi}` : null;
}
