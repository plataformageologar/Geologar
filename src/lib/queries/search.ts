import { createPublicClient } from "@/lib/supabase/public";

import { normalizeSearchTerm } from "./publications";
import { logQueryError } from "./shared";

/**
 * Busca do site (Etapa 10.7): consulta simples por trecho de texto
 * (`ilike`) somente no conteúdo publicado — linhas de pesquisa, projetos,
 * publicações, páginas personalizadas e instituições. Sem serviço externo,
 * sem IA e sem índice próprio; as políticas RLS garantem que visitantes não
 * leem rascunhos. O termo passa por `normalizeSearchTerm`, que remove os
 * caracteres com significado na sintaxe de filtros do PostgREST.
 */

export const SEARCH_MIN_LENGTH = 2;
const PER_GROUP = 8;

export type SearchKind = "research" | "project" | "publication" | "page" | "institution";

export type SearchResult = {
  kind: SearchKind;
  title: string;
  description: string | null;
  href: string;
};

export type SearchGroup = { kind: SearchKind; label: string; results: SearchResult[] };

export const SEARCH_GROUP_LABELS: Record<SearchKind, string> = {
  research: "Linhas de pesquisa",
  project: "Projetos",
  publication: "Publicações",
  page: "Páginas",
  institution: "Instituições",
};

/** Normaliza o termo; vazio ou curto demais → null. */
export function parseSearchTerm(value: string | undefined): string | null {
  const term = normalizeSearchTerm(value);
  return term.length >= SEARCH_MIN_LENGTH ? term : null;
}

function excerpt(text: string | null | undefined, max = 180): string | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export async function searchSite(term: string): Promise<{ groups: SearchGroup[]; failed: boolean }> {
  const client = createPublicClient();
  const like = `%${term}%`;
  const pattern = (columns: string[]) => columns.map((column) => `${column}.ilike."${like}"`).join(",");

  const [research, projects, publications, pages, institutions] = await Promise.all([
    client
      .from("research_lines")
      .select("slug, title, short_description")
      .eq("is_published", true)
      .or(pattern(["title", "short_description", "description"]))
      .order("sort_order")
      .limit(PER_GROUP),
    client
      .from("projects")
      .select("slug, title, short_description")
      .eq("is_published", true)
      .or(pattern(["title", "short_description", "description"]))
      .order("sort_order")
      .limit(PER_GROUP),
    client
      .from("publications")
      .select("slug, title, authors, publication_venue, publication_year")
      .eq("is_published", true)
      .or(pattern(["title", "authors", "publication_venue"]))
      .order("publication_year", { ascending: false, nullsFirst: false })
      .limit(PER_GROUP),
    client
      .from("custom_pages")
      .select("slug, title, description")
      .eq("status", "published")
      .or(pattern(["title", "description"]))
      .order("title")
      .limit(PER_GROUP),
    client
      .from("institutions")
      .select("name, acronym, city, state, country")
      .eq("is_published", true)
      .or(pattern(["name", "acronym", "description"]))
      .order("sort_order")
      .limit(PER_GROUP),
  ]);

  let failed = false;
  const rows = <T,>(label: string, result: { data: T[] | null; error: unknown }): T[] => {
    if (result.error) {
      failed = true;
      logQueryError(`busca (${label})`, result.error);
      return [];
    }
    return result.data ?? [];
  };

  const groups: SearchGroup[] = [
    {
      kind: "research" as const,
      results: rows("research_lines", research).map((row) => ({
        kind: "research" as const,
        title: row.title,
        description: excerpt(row.short_description),
        href: `/pesquisa/${row.slug}`,
      })),
    },
    {
      kind: "project" as const,
      results: rows("projects", projects).map((row) => ({
        kind: "project" as const,
        title: row.title,
        description: excerpt(row.short_description),
        href: `/projetos/${row.slug}`,
      })),
    },
    {
      kind: "publication" as const,
      results: rows("publications", publications).map((row) => ({
        kind: "publication" as const,
        title: row.title,
        description: excerpt([row.authors, row.publication_venue, row.publication_year].filter(Boolean).join(" · ")),
        // Sem página própria: abre a listagem já filtrada pelo título.
        href: `/publicacoes?busca=${encodeURIComponent(normalizeSearchTerm(row.title))}`,
      })),
    },
    {
      kind: "page" as const,
      results: rows("custom_pages", pages).map((row) => ({
        kind: "page" as const,
        title: row.title,
        description: excerpt(row.description),
        href: `/paginas/${row.slug}`,
      })),
    },
    {
      kind: "institution" as const,
      results: rows("institutions", institutions).map((row) => ({
        kind: "institution" as const,
        title: row.acronym && !row.name.includes(row.acronym) ? `${row.name} (${row.acronym})` : row.name,
        description: excerpt([row.city, row.state, row.country].filter(Boolean).join(", ")),
        href: "/instituicoes",
      })),
    },
  ]
    .filter((group) => group.results.length > 0)
    .map((group) => ({ ...group, label: SEARCH_GROUP_LABELS[group.kind] }));

  return { groups, failed };
}
