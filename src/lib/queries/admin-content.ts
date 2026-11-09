import type { ProjectRecord } from "@/lib/admin/projects";
import type { ResearchLineRecord } from "@/lib/admin/research-lines";
import { isUuid } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

import { logQueryError, resolveImageSrc } from "./shared";

/**
 * Leituras do CMS para linhas de pesquisa e projetos, sempre com a sessão do
 * usuário: as policies "CMS staff can read all …" liberam rascunhos apenas
 * para vínculos ativos (admin/editor). As consultas do site público
 * (createPublicClient) continuam vendo somente o que está publicado.
 *
 * Falhas são informadas como `error` — nunca como lista vazia.
 */

export type AdminResult<T> = { status: "ready"; data: T } | { status: "error" };

// Linhas de pesquisa ---------------------------------------------------------------

export type ResearchLineListItem = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
  projectCount: number;
};

export async function getResearchLinesForAdmin(): Promise<AdminResult<ResearchLineListItem[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_lines")
    .select(
      "id, title, slug, is_published, is_featured, sort_order, updated_at, project_research_lines (count)",
    )
    .order("sort_order")
    .order("title")
    .limit(500);

  if (error) {
    logQueryError("research_lines (CMS)", error);
    return { status: "error" };
  }
  return {
    status: "ready",
    data: data.map(({ project_research_lines, ...line }) => ({
      ...line,
      projectCount: project_research_lines[0]?.count ?? 0,
    })),
  };
}

export const researchLineEditColumns =
  "id, title, slug, short_description, description, image_path, image_alt, sort_order, is_featured, is_published, published_at, updated_at";

export type ResearchLineForEdit = {
  id: string;
  record: ResearchLineRecord;
  updatedAt: string;
  publishedAt: string | null;
  hasImage: boolean;
  imageSrc: string | null;
};

/** `null`: id inválido ou registro inexistente (a página responde 404). */
export async function getResearchLineForEdit(
  id: string,
): Promise<AdminResult<ResearchLineForEdit | null>> {
  if (!isUuid(id)) return { status: "ready", data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_lines")
    .select(researchLineEditColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("research_line (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };

  const { image_path, updated_at, published_at, id: lineId, ...record } = data;
  return {
    status: "ready",
    data: {
      id: lineId,
      record,
      updatedAt: updated_at,
      publishedAt: published_at,
      hasImage: image_path !== null,
      imageSrc: resolveImageSrc(image_path),
    },
  };
}

export type ResearchLineOption = { id: string; title: string; is_published: boolean };

/** Todas as linhas (inclusive rascunhos) para o formulário de projeto. */
export async function getResearchLineOptions(): Promise<AdminResult<ResearchLineOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_lines")
    .select("id, title, is_published")
    .order("sort_order")
    .order("title")
    .limit(500);

  if (error) {
    logQueryError("research_line options (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data };
}

// Projetos ---------------------------------------------------------------------------

export const ADMIN_PROJECTS_PAGE_SIZE = 10;

export type ProjectListFilters = {
  search?: string;
  published?: boolean;
  status?: "ongoing" | "completed";
  page: number;
};

export type ProjectListItem = {
  id: string;
  title: string;
  slug: string;
  project_status: string;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
  researchLines: { id: string; title: string }[];
};

/** Escapa curingas do LIKE (`%`, `_`, `\`) e o atalho `*` do PostgREST. */
export function likePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&").replace(/\*/g, "")}%`;
}

/**
 * Busca em várias colunas com `or` do PostgREST. O valor vai entre aspas
 * (vírgulas e parênteses digitados não quebram o filtro).
 */
export function ilikeAny(columns: string[], search: string) {
  const value = `"${likePattern(search).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return columns.map((column) => `${column}.ilike.${value}`).join(",");
}

/** Listagem paginada, filtrada e buscada no banco (nunca tudo no navegador). */
export async function getProjectsForAdmin(
  filters: ProjectListFilters,
): Promise<AdminResult<{ items: ProjectListItem[]; total: number; outOfRange: boolean }>> {
  const supabase = await createClient();
  const from = (filters.page - 1) * ADMIN_PROJECTS_PAGE_SIZE;

  let query = supabase
    .from("projects")
    .select(
      "id, title, slug, project_status, is_published, is_featured, sort_order, updated_at, project_research_lines (research_line:research_lines (id, title, sort_order))",
      { count: "exact" },
    );
  if (filters.search) query = query.ilike("title", likePattern(filters.search));
  if (filters.published !== undefined) query = query.eq("is_published", filters.published);
  if (filters.status) query = query.eq("project_status", filters.status);

  const { data, error, count } = await query
    .order("sort_order")
    .order("title")
    .range(from, from + ADMIN_PROJECTS_PAGE_SIZE - 1);

  if (error?.code === "PGRST103") {
    return { status: "ready", data: { items: [], total: 0, outOfRange: true } };
  }
  if (error) {
    logQueryError("projects (CMS)", error);
    return { status: "error" };
  }

  const items = data.map(({ project_research_lines, ...project }) => ({
    ...project,
    researchLines: project_research_lines
      .map(({ research_line }) => research_line)
      .filter((line) => line !== null)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "pt-BR"))
      .map(({ id, title }) => ({ id, title })),
  }));

  return {
    status: "ready",
    data: { items, total: count ?? items.length, outOfRange: items.length === 0 && filters.page > 1 },
  };
}

export const projectEditColumns =
  "id, title, slug, short_description, description, image_path, image_alt, project_status, start_date, end_date, coordination, funding, result_or_contribution, external_url, sort_order, is_featured, is_published, published_at, updated_at";

export type ProjectForEdit = {
  id: string;
  record: ProjectRecord;
  researchLineIds: string[];
  updatedAt: string;
  publishedAt: string | null;
  hasImage: boolean;
  imageSrc: string | null;
};

export async function getProjectForEdit(id: string): Promise<AdminResult<ProjectForEdit | null>> {
  if (!isUuid(id)) return { status: "ready", data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`${projectEditColumns}, project_research_lines (research_line_id)`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logQueryError("project (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };

  const {
    image_path,
    updated_at,
    published_at,
    id: projectId,
    project_research_lines,
    ...record
  } = data;
  return {
    status: "ready",
    data: {
      id: projectId,
      record,
      researchLineIds: project_research_lines.map((link) => link.research_line_id),
      updatedAt: updated_at,
      publishedAt: published_at,
      hasImage: image_path !== null,
      imageSrc: resolveImageSrc(image_path),
    },
  };
}
