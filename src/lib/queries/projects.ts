import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { ProjectDetail, ProjectStatus, ProjectSummary } from "@/types/content";

import {
  byPublicationOrder,
  publicationListColumns,
  toPublicationListItem,
} from "./publications";
import {
  byEditorialOrder,
  failQuery,
  isValidSlug,
  logQueryError,
  onlyPublished,
  resolveImageSrc,
  uniqueBySlug,
} from "./shared";

export const PROJECTS_PAGE_SIZE = 12;

/** Colunas dos cards de projeto (listagens e relacionamentos). */
export const projectSummaryColumns =
  "slug, title, short_description, image_path, image_alt, project_status, result_or_contribution, sort_order, is_published" as const;

type ProjectSummaryRow = ProjectSummary & { sort_order: number; is_published: boolean };

export function toProjectSummary(row: ProjectSummaryRow): ProjectSummary {
  return {
    slug: row.slug,
    title: row.title,
    short_description: row.short_description,
    image_path: resolveImageSrc(row.image_path),
    image_alt: row.image_alt,
    project_status: row.project_status,
    result_or_contribution: row.result_or_contribution,
  };
}

async function fetchFeaturedProjects(limit: number) {
  const { data, error } = await createPublicClient()
    .from("projects")
    .select(
      "slug, title, short_description, image_path, image_alt, project_status, result_or_contribution",
    )
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("sort_order")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Projetos publicados e marcados como destaque. */
export async function getFeaturedProjects(limit = 3): Promise<ProjectSummary[]> {
  try {
    const projects = await fetchFeaturedProjects(limit);
    return projects.map((project) => ({
      ...project,
      image_path: resolveImageSrc(project.image_path),
    }));
  } catch (error) {
    logQueryError("projects", error);
    return [];
  }
}

export type ProjectStatusCounts = Record<ProjectStatus, number>;

/** Quantidade de projetos publicados por situação (decide se o filtro aparece). */
export async function getProjectStatusCounts(): Promise<ProjectStatusCounts> {
  const { data, error } = await createPublicClient()
    .from("projects")
    .select("project_status")
    .eq("is_published", true);

  if (error) failQuery("project status counts", error);

  const counts: ProjectStatusCounts = { ongoing: 0, completed: 0 };
  for (const { project_status } of data) {
    if (project_status === "ongoing" || project_status === "completed") {
      counts[project_status] += 1;
    }
  }
  return counts;
}

export type ProjectPage = {
  items: ProjectSummary[];
  total: number;
  /** Página solicitada além da última (a rota responde 404). */
  outOfRange: boolean;
};

/**
 * Listagem paginada de /projetos. Ordem: `sort_order`, projetos em andamento
 * antes dos concluídos e, por fim, título.
 */
export async function getPublishedProjects({
  status,
  page,
}: {
  status?: ProjectStatus;
  page: number;
}): Promise<ProjectPage> {
  const from = (page - 1) * PROJECTS_PAGE_SIZE;

  let query = createPublicClient()
    .from("projects")
    .select(projectSummaryColumns, { count: "exact" })
    .eq("is_published", true);
  if (status) query = query.eq("project_status", status);

  const { data, error, count } = await query
    .order("sort_order")
    // "ongoing" > "completed": ordem decrescente traz os em andamento primeiro.
    .order("project_status", { ascending: false })
    .order("title")
    .range(from, from + PROJECTS_PAGE_SIZE - 1);

  // PGRST103: intervalo além do total de registros.
  if (error?.code === "PGRST103") return { items: [], total: 0, outOfRange: true };
  if (error) failQuery("projects", error);

  return {
    items: data.map(toProjectSummary),
    total: count ?? data.length,
    outOfRange: data.length === 0 && page > 1,
  };
}

const RELATED_PROJECTS_LIMIT = 3;

/**
 * Projeto publicado com linhas de pesquisa, publicações e projetos
 * relacionados, em uma única consulta. `null` quando o slug não existe ou o
 * projeto não está publicado. `cache` compartilha a leitura entre
 * `generateMetadata` e a página.
 */
export const getProjectBySlug = cache(async (slug: string): Promise<ProjectDetail | null> => {
  if (!isValidSlug(slug)) return null;

  const { data, error } = await createPublicClient()
    .from("projects")
    .select(
      `${projectSummaryColumns}, description, start_date, end_date, coordination, funding, external_url, project_research_lines (research_line:research_lines (slug, title, sort_order, is_published, project_research_lines (project:projects (${projectSummaryColumns})))), publication_projects (publication:publications (${publicationListColumns}))`,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) failQuery(`project ${slug}`, error);
  if (!data) return null;

  const researchLines = onlyPublished(
    data.project_research_lines.map(({ research_line }) => research_line),
  ).sort(byEditorialOrder);

  const relatedProjects = uniqueBySlug(
    onlyPublished(
      researchLines.flatMap((line) => line.project_research_lines.map(({ project }) => project)),
    ).filter((project) => project.slug !== data.slug),
  )
    .sort(byEditorialOrder)
    .slice(0, RELATED_PROJECTS_LIMIT)
    .map(toProjectSummary);

  const publications = onlyPublished(
    data.publication_projects.map(({ publication }) => publication),
  )
    .sort(byPublicationOrder)
    .map(toPublicationListItem);

  return {
    ...toProjectSummary(data),
    description: data.description,
    start_date: data.start_date,
    end_date: data.end_date,
    coordination: data.coordination,
    funding: data.funding,
    external_url: data.external_url,
    researchLines: researchLines.map(({ slug, title }) => ({ slug, title })),
    publications,
    relatedProjects,
  };
});
