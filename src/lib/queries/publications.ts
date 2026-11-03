import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type {
  ProjectLink,
  PublicationListItem,
  PublicationSummary,
  ResearchLineLink,
} from "@/types/content";

import { failQuery, logQueryError, onlyPublished } from "./shared";

export const PUBLICATIONS_PAGE_SIZE = 20;

/** Colunas de publicação usadas nas listagens (com os projetos associados). */
export const publicationListColumns =
  "slug, title, authors, publication_venue, publication_year, doi, external_url, sort_order, is_published, publication_projects (project:projects (slug, title, is_published))" as const;

type PublicationListRow = PublicationSummary & {
  sort_order: number;
  is_published: boolean;
  publication_projects: {
    project: (ProjectLink & { is_published: boolean }) | null;
  }[];
};

/** Converte a linha do banco, mantendo só os projetos publicados. */
export function toPublicationListItem(row: PublicationListRow): PublicationListItem {
  const projects = onlyPublished(row.publication_projects.map(({ project }) => project))
    .map(({ slug, title }) => ({ slug, title }))
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  return {
    slug: row.slug,
    title: row.title,
    authors: row.authors,
    publication_venue: row.publication_venue,
    publication_year: row.publication_year,
    doi: row.doi,
    external_url: row.external_url,
    projects,
  };
}

/** Mais recentes primeiro; sem ano ao final; depois ordem editorial. */
export function byPublicationOrder(
  a: { publication_year: number | null; sort_order: number; title: string },
  b: { publication_year: number | null; sort_order: number; title: string },
) {
  return (
    (b.publication_year ?? -Infinity) - (a.publication_year ?? -Infinity) ||
    a.sort_order - b.sort_order ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}

async function fetchRecentPublications(limit: number) {
  const { data, error } = await createPublicClient()
    .from("publications")
    .select(
      "slug, title, authors, publication_venue, publication_year, doi, external_url",
    )
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("publication_year", { ascending: false, nullsFirst: false })
    .order("sort_order")
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Publicações publicadas: destaques, depois as mais recentes. */
export async function getRecentPublications(limit = 5): Promise<PublicationSummary[]> {
  try {
    return await fetchRecentPublications(limit);
  } catch (error) {
    logQueryError("publications", error);
    return [];
  }
}

/**
 * Termo de busca seguro para o filtro `or()` do PostgREST: remove caracteres
 * com significado na sintaxe (vírgula, parênteses, aspas, curingas, `:` e `\`).
 */
export function normalizeSearchTerm(value: string | undefined) {
  return (value ?? "")
    .replace(/[,()*%:"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export type PublicationFilters = {
  year?: number;
  line?: string;
  q?: string;
  page: number;
};

export type PublicationPage = {
  items: PublicationListItem[];
  total: number;
  /** Página solicitada além da última (a rota responde 404). */
  outOfRange: boolean;
};

/** Ids das publicações publicadas ligadas a uma linha publicada (vazio se a linha não existir). */
async function fetchPublicationIdsByLine(lineSlug: string) {
  const { data, error } = await createPublicClient()
    .from("research_lines")
    .select("publication_research_lines (publication_id)")
    .eq("slug", lineSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data?.publication_research_lines.map((row) => row.publication_id) ?? [];
}

/** Listagem paginada de /publicacoes com filtros por ano, linha e busca textual. */
export async function getPublishedPublications(
  filters: PublicationFilters,
): Promise<PublicationPage> {
  const empty = { items: [], total: 0, outOfRange: filters.page > 1 };
  const from = (filters.page - 1) * PUBLICATIONS_PAGE_SIZE;

  try {
    const lineIds = filters.line ? await fetchPublicationIdsByLine(filters.line) : null;
    if (lineIds && lineIds.length === 0) return empty;

    let query = createPublicClient()
      .from("publications")
      .select(publicationListColumns, { count: "exact" })
      .eq("is_published", true);

    if (filters.year) query = query.eq("publication_year", filters.year);
    if (lineIds) query = query.in("id", lineIds);
    if (filters.q) {
      query = query.or(`title.ilike."%${filters.q}%",authors.ilike."%${filters.q}%"`);
    }

    const { data, error, count } = await query
      .order("publication_year", { ascending: false, nullsFirst: false })
      .order("sort_order")
      .order("title")
      .range(from, from + PUBLICATIONS_PAGE_SIZE - 1);

    // PGRST103: intervalo além do total de registros.
    if (error?.code === "PGRST103") return { ...empty, outOfRange: true };
    if (error) throw error;

    const total = count ?? data.length;
    return {
      items: data.map(toPublicationListItem),
      total,
      outOfRange: data.length === 0 && filters.page > 1,
    };
  } catch (error) {
    failQuery("publications", error);
  }
}

export type PublicationFilterOptions = {
  years: number[];
  researchLines: ResearchLineLink[];
};

/** Opções dos filtros: só anos e linhas que têm publicações publicadas. */
export const getPublicationFilterOptions = cache(
  async (): Promise<PublicationFilterOptions> => {
    const client = createPublicClient();
    const [years, lines] = await Promise.all([
      client
        .from("publications")
        .select("publication_year")
        .eq("is_published", true)
        .not("publication_year", "is", null)
        .order("publication_year", { ascending: false }),
      // `!inner` descarta linhas sem publicação visível (o RLS da tabela de
      // relacionamento já exige os dois lados publicados).
      client
        .from("research_lines")
        .select("slug, title, publication_research_lines!inner (publication_id)")
        .eq("is_published", true)
        .order("sort_order")
        .order("title")
        .limit(1, { referencedTable: "publication_research_lines" }),
    ]);

    if (years.error) failQuery("publication years", years.error);
    if (lines.error) failQuery("publication research lines", lines.error);

    return {
      years: [
        ...new Set(
          years.data.flatMap((row) => (row.publication_year ? [row.publication_year] : [])),
        ),
      ],
      researchLines: lines.data.map(({ slug, title }) => ({ slug, title })),
    };
  },
);
