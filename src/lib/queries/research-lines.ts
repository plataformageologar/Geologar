import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { ResearchLineDetail, ResearchLineSummary } from "@/types/content";

import { projectSummaryColumns, toProjectSummary } from "./projects";
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

const researchLineSummaryColumns = "slug, title, short_description, image_path, image_alt" as const;

async function fetchHomepageResearchLines(limit: number) {
  const { data, error } = await createPublicClient()
    .from("research_lines")
    .select(researchLineSummaryColumns)
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("title")
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Linhas publicadas para a homepage: destaques primeiro, depois `sort_order`. */
export async function getHomepageResearchLines(limit = 6): Promise<ResearchLineSummary[]> {
  try {
    const lines = await fetchHomepageResearchLines(limit);
    return lines.map((line) => ({ ...line, image_path: resolveImageSrc(line.image_path) }));
  } catch (error) {
    logQueryError("research_lines", error);
    return [];
  }
}

/** Todas as linhas publicadas (/pesquisa), por `sort_order` e título. */
export const getPublishedResearchLines = cache(async (): Promise<ResearchLineSummary[]> => {
  const { data, error } = await createPublicClient()
    .from("research_lines")
    .select(researchLineSummaryColumns)
    .eq("is_published", true)
    .order("sort_order")
    .order("title");

  if (error) failQuery("research_lines", error);
  return data.map((line) => ({ ...line, image_path: resolveImageSrc(line.image_path) }));
});

/**
 * Linha publicada com seus projetos e publicações, em uma única consulta.
 * As publicações reúnem as ligadas diretamente à linha e as dos projetos da
 * linha, sem repetição. `null` quando o slug não existe ou não está publicado.
 */
export const getResearchLineBySlug = cache(
  async (slug: string): Promise<ResearchLineDetail | null> => {
    if (!isValidSlug(slug)) return null;

    const { data, error } = await createPublicClient()
      .from("research_lines")
      .select(
        `${researchLineSummaryColumns}, description, project_research_lines (project:projects (${projectSummaryColumns}, publication_projects (publication:publications (${publicationListColumns})))), publication_research_lines (publication:publications (${publicationListColumns}))`,
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) failQuery(`research line ${slug}`, error);
    if (!data) return null;

    const projects = uniqueBySlug(
      onlyPublished(data.project_research_lines.map(({ project }) => project)),
    ).sort(byEditorialOrder);

    const publications = uniqueBySlug(
      onlyPublished([
        ...data.publication_research_lines.map(({ publication }) => publication),
        ...projects.flatMap((project) =>
          project.publication_projects.map(({ publication }) => publication),
        ),
      ]),
    )
      .sort(byPublicationOrder)
      .map(toPublicationListItem);

    return {
      slug: data.slug,
      title: data.title,
      short_description: data.short_description,
      description: data.description,
      image_path: resolveImageSrc(data.image_path),
      image_alt: data.image_alt,
      projects: projects.map(toProjectSummary),
      publications,
    };
  },
);
