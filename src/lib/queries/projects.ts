import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { ProjectSummary } from "@/types/content";

import { contentTags, logQueryError, resolveImageSrc } from "./shared";

async function fetchFeaturedProjects(limit: number) {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.projects);

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
