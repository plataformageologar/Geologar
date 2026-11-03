import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { PublicationSummary } from "@/types/content";

import { contentTags, logQueryError } from "./shared";

async function fetchRecentPublications(limit: number) {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.publications);

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
