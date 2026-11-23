import { createPublicClient } from "@/lib/supabase/public";

import { isValidSlug, logQueryError } from "./shared";

export type SitemapEntry = { path: string; lastModified?: string };

/** Páginas fixas do site público (sempre no ar). */
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/rede",
  "/pesquisa",
  "/projetos",
  "/publicacoes",
  "/instituicoes",
  "/contato",
] as const;

type Row = { slug: string; updated_at: string };

/**
 * Endereços publicados para o sitemap.xml, lidos com o cliente anônimo (o RLS
 * só devolve o que é público). Uma falha numa lista é registrada e a lista
 * fica de fora: o sitemap nunca inclui rascunhos nem derruba a resposta.
 */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const supabase = createPublicClient();
  const [lines, projects, pages] = await Promise.all([
    supabase.from("research_lines").select("slug, updated_at").eq("is_published", true).returns<Row[]>(),
    supabase.from("projects").select("slug, updated_at").eq("is_published", true).returns<Row[]>(),
    supabase.from("custom_pages").select("slug, updated_at").eq("status", "published").returns<Row[]>(),
  ]);

  const entries: SitemapEntry[] = STATIC_SITEMAP_PATHS.map((path) => ({ path }));
  const add = (scope: string, prefix: string, result: { data: Row[] | null; error: unknown }) => {
    if (result.error || !result.data) {
      logQueryError(`${scope} (sitemap)`, result.error);
      return;
    }
    for (const row of result.data) {
      if (isValidSlug(row.slug)) entries.push({ path: `${prefix}/${row.slug}`, lastModified: row.updated_at });
    }
  };
  add("linhas de pesquisa", "/pesquisa", lines);
  add("projetos", "/projetos", projects);
  add("páginas personalizadas", "/paginas", pages);
  return entries;
}
