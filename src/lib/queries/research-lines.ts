import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { ResearchLineSummary } from "@/types/content";

import { contentTags, logQueryError, resolveImageSrc } from "./shared";

async function fetchHomepageResearchLines(limit: number) {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.researchLines);

  const { data, error } = await createPublicClient()
    .from("research_lines")
    .select("slug, title, short_description, image_path, image_alt")
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
