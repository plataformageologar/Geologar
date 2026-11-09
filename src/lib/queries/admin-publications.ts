import type { PublicationRecord } from "@/lib/admin/publications";
import { isUuid } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

import { ilikeAny, type AdminResult } from "./admin-content";
import { logQueryError } from "./shared";

/**
 * Leituras do CMS de publicações, com a sessão do usuário (a policy
 * "CMS staff can read all publications" libera rascunhos só para vínculos
 * ativos). O site público continua usando createPublicClient.
 */

export const ADMIN_PUBLICATIONS_PAGE_SIZE = 10;

export type PublicationListFilters = {
  search?: string;
  published?: boolean;
  year?: number;
  page: number;
};

export type PublicationListItem = {
  id: string;
  title: string;
  authors: string;
  publication_year: number | null;
  publication_venue: string | null;
  doi: string | null;
  external_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  updated_at: string;
  projectCount: number;
  lineCount: number;
};


/**
 * Listagem paginada no banco: ano mais recente primeiro (sem ano por
 * último), depois ordem editorial e título.
 */
export async function getPublicationsForAdmin(
  filters: PublicationListFilters,
): Promise<AdminResult<{ items: PublicationListItem[]; total: number; outOfRange: boolean }>> {
  const supabase = await createClient();
  const from = (filters.page - 1) * ADMIN_PUBLICATIONS_PAGE_SIZE;

  let query = supabase
    .from("publications")
    .select(
      "id, title, authors, publication_year, publication_venue, doi, external_url, is_published, is_featured, updated_at, publication_projects (count), publication_research_lines (count)",
      { count: "exact" },
    );
  if (filters.search) {
    query = query.or(ilikeAny(["title", "authors"], filters.search));
  }
  if (filters.published !== undefined) query = query.eq("is_published", filters.published);
  if (filters.year !== undefined) query = query.eq("publication_year", filters.year);

  const { data, error, count } = await query
    .order("publication_year", { ascending: false, nullsFirst: false })
    .order("sort_order")
    .order("title")
    .range(from, from + ADMIN_PUBLICATIONS_PAGE_SIZE - 1);

  if (error?.code === "PGRST103") {
    return { status: "ready", data: { items: [], total: 0, outOfRange: true } };
  }
  if (error) {
    logQueryError("publications (CMS)", error);
    return { status: "error" };
  }

  const items = data.map(({ publication_projects, publication_research_lines, ...publication }) => ({
    ...publication,
    projectCount: publication_projects[0]?.count ?? 0,
    lineCount: publication_research_lines[0]?.count ?? 0,
  }));
  return {
    status: "ready",
    data: { items, total: count ?? items.length, outOfRange: items.length === 0 && filters.page > 1 },
  };
}

/** Anos com publicações (inclusive rascunhos), do mais recente ao mais antigo. */
export async function getPublicationYears(): Promise<AdminResult<number[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publications")
    .select("publication_year")
    .not("publication_year", "is", null)
    .order("publication_year", { ascending: false })
    .limit(5000);

  if (error) {
    logQueryError("publication years (CMS)", error);
    return { status: "error" };
  }
  const years = [...new Set(data.map((row) => row.publication_year).filter((year) => year !== null))];
  return { status: "ready", data: years };
}

export const publicationEditColumns =
  "id, title, slug, authors, publication_venue, publication_year, doi, external_url, abstract, citation, sort_order, is_featured, is_published, published_at, updated_at";

export type PublicationForEdit = {
  id: string;
  record: PublicationRecord;
  projectIds: string[];
  researchLineIds: string[];
  updatedAt: string;
  publishedAt: string | null;
};

export async function getPublicationForEdit(id: string): Promise<AdminResult<PublicationForEdit | null>> {
  if (!isUuid(id)) return { status: "ready", data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publications")
    .select(
      `${publicationEditColumns}, publication_projects (project_id), publication_research_lines (research_line_id)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("publication (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };

  const {
    id: publicationId,
    updated_at,
    published_at,
    publication_projects,
    publication_research_lines,
    ...record
  } = data;
  return {
    status: "ready",
    data: {
      id: publicationId,
      record,
      projectIds: publication_projects.map((link) => link.project_id),
      researchLineIds: publication_research_lines.map((link) => link.research_line_id),
      updatedAt: updated_at,
      publishedAt: published_at,
    },
  };
}

export type ProjectOption = { id: string; title: string; is_published: boolean };

/** Todos os projetos (inclusive rascunhos) para o formulário de publicação. */
export async function getProjectOptions(): Promise<AdminResult<ProjectOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, is_published")
    .order("sort_order")
    .order("title")
    .limit(1000);

  if (error) {
    logQueryError("project options (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data };
}
