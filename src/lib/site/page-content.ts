import { isLocalImagePath, isMediaObjectName } from "@/lib/media/config";
import { normalizeText, validateText, type TextRule } from "@/lib/admin/validation";

/**
 * Título, introdução e metadados das páginas internas (tabela page_content;
 * admin e editor). Os valores padrão são os textos que estavam no código e
 * as seeds da migration.
 */

export const PAGE_CONTENT_KEYS = ["rede", "pesquisa", "projetos", "publicacoes", "instituicoes", "contato"] as const;
export type PageContentKey = (typeof PAGE_CONTENT_KEYS)[number];

/**
 * Páginas com textos editáveis no CMS. A antiga página /contato redireciona
 * para o contato do rodapé (formulário desativado por decisão de escopo): os
 * textos dela ficam guardados no banco, sem edição, para uma reativação.
 */
export const EDITABLE_PAGE_CONTENT_KEYS = PAGE_CONTENT_KEYS.filter(
  (key): key is Exclude<PageContentKey, "contato"> => key !== "contato",
);

export const PAGE_CONTENT_LABELS: Record<PageContentKey, { label: string; path: string }> = {
  rede: { label: "A Rede", path: "/rede" },
  pesquisa: { label: "Pesquisa", path: "/pesquisa" },
  projetos: { label: "Projetos", path: "/projetos" },
  publicacoes: { label: "Publicações", path: "/publicacoes" },
  instituicoes: { label: "Instituições", path: "/instituicoes" },
  contato: { label: "Contato", path: "/contato" },
};

export const pageContentFields = [
  "eyebrow",
  "title",
  "description",
  "seo_title",
  "seo_description",
  "seo_image_path",
] as const;

export type PageContentField = (typeof pageContentFields)[number];
export type PageContentRecord = Record<PageContentField, string | null>;
export type PageContentValues = Record<PageContentField, string>;
export type PageContentFieldErrors = Partial<Record<PageContentField, string>>;

export const PAGE_CONTENT_RULES = {
  eyebrow: { max: 60 },
  title: { max: 160 },
  description: { max: 1000, multiline: true },
  seo_title: { max: 70 },
  seo_description: { max: 200, multiline: true },
} satisfies Record<Exclude<PageContentField, "seo_image_path">, TextRule>;

export function isPageContentKey(value: unknown): value is PageContentKey {
  return typeof value === "string" && (PAGE_CONTENT_KEYS as readonly string[]).includes(value);
}

export function toPageContentValues(record: PageContentRecord): PageContentValues {
  return Object.fromEntries(pageContentFields.map((field) => [field, record[field] ?? ""])) as PageContentValues;
}

/** `currentImage`: imagem gravada (aceita sem alteração, inclusive arquivo local). */
export function validatePageContent(
  raw: unknown,
  currentImage: string | null,
): { data: PageContentRecord; errors: PageContentFieldErrors } {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const errors: PageContentFieldErrors = {};
  const data = {} as PageContentRecord;

  for (const field of Object.keys(PAGE_CONTENT_RULES) as (keyof typeof PAGE_CONTENT_RULES)[]) {
    const rule: TextRule = PAGE_CONTENT_RULES[field];
    const rawValue = source[field];
    const value = normalizeText(typeof rawValue === "string" ? rawValue : "", rule.multiline);
    const error = validateText(value, rule);
    if (error) errors[field] = error;
    data[field] = value;
  }

  const image = normalizeText(typeof source.seo_image_path === "string" ? source.seo_image_path : "");
  if (image === null) data.seo_image_path = null;
  else if (isMediaObjectName(image) || (image === currentImage && isLocalImagePath(image))) {
    data.seo_image_path = image;
  } else {
    data.seo_image_path = null;
    errors.seo_image_path = "Selecione uma imagem da biblioteca de mídia.";
  }

  return { data, errors };
}

/** Textos que estavam no código (fallback quando o banco não responde). */
export const DEFAULT_PAGE_CONTENT: Record<PageContentKey, PageContentRecord> = {
  rede: {
    eyebrow: "A Rede",
    title: null,
    description: null,
    seo_title: "A Rede",
    seo_description: null,
    seo_image_path: null,
  },
  pesquisa: {
    eyebrow: "Pesquisa",
    title: "Linhas de pesquisa",
    description: "Conheça as linhas de pesquisa da rede e os projetos e publicações associados a cada uma.",
    seo_title: "Pesquisa",
    seo_description: "Linhas de pesquisa da GeoLogar, com os projetos e as publicações associados a cada uma.",
    seo_image_path: null,
  },
  projetos: {
    eyebrow: "Projetos",
    title: "Projetos de pesquisa",
    description: "Conheça os projetos da rede, seus objetivos e resultados.",
    seo_title: "Projetos",
    seo_description: "Projetos de pesquisa desenvolvidos pela GeoLogar e seus resultados.",
    seo_image_path: null,
  },
  publicacoes: {
    eyebrow: "Publicações",
    title: "Publicações",
    description: "Produção científica da rede, organizada por ano de publicação.",
    seo_title: "Publicações",
    seo_description: "Artigos, livros e demais publicações científicas da GeoLogar.",
    seo_image_path: null,
  },
  instituicoes: {
    eyebrow: "Instituições",
    title: "Instituições",
    description: "Instituições e parceiros que integram ou colaboram com a rede.",
    seo_title: "Instituições",
    seo_description: "Instituições e parceiros que integram ou colaboram com a GeoLogar.",
    seo_image_path: null,
  },
  contato: {
    eyebrow: "Contato",
    title: "Entre em contato com a GeoLogar",
    description: null,
    seo_title: "Contato",
    seo_description: "Fale com a GeoLogar: formulário e canais oficiais de contato.",
    seo_image_path: null,
  },
};

/**
 * Textos de /rede e /contato vazios continuam ligados à homepage
 * (apresentação da rede e chamada para cooperação), como antes.
 */
export const PAGE_CONTENT_FALLBACK_HINTS: Partial<Record<PageContentKey, Partial<Record<PageContentField, string>>>> = {
  rede: {
    title: "Vazio: usa o título da apresentação da rede (homepage).",
    description: "Vazio: usa o texto da apresentação da rede (homepage).",
    seo_description: "Vazio: usa o texto da apresentação da rede.",
  },
  contato: {
    description: "Vazio: usa o texto da chamada para cooperação (homepage).",
  },
};

/** Título usado quando o campo está vazio (mesmo texto que estava no código). */
export const PAGE_TITLE_FALLBACKS: Record<PageContentKey, string> = {
  rede: "A Rede",
  pesquisa: "Linhas de pesquisa",
  projetos: "Projetos de pesquisa",
  publicacoes: "Publicações",
  instituicoes: "Instituições",
  contato: "Entre em contato com a GeoLogar",
};

/**
 * Cabeçalho de uma página interna: campos vazios usam os textos da homepage
 * (A Rede e Contato) ou o título padrão. Usado pelo site e pelo editor.
 */
export function resolvePageHeader(
  key: PageContentKey,
  record: Pick<PageContentRecord, "eyebrow" | "title" | "description">,
  homepage?: { about_title: string | null; about_description: string | null; cooperation_description: string | null },
) {
  const title = record.title ?? (key === "rede" ? (homepage?.about_title ?? null) : null) ?? PAGE_TITLE_FALLBACKS[key];
  const description =
    record.description ??
    (key === "rede"
      ? (homepage?.about_description ?? null)
      : key === "contato"
        ? (homepage?.cooperation_description ?? null)
        : null);
  return { eyebrow: record.eyebrow ?? undefined, title, description };
}
