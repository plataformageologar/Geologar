import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/lib/queries/sitemap";
import { absoluteUrl } from "@/lib/site/url";

// Lido a cada requisição, como o restante do site (sem ISR/cache incremental).
export const dynamic = "force-dynamic";

/** Somente conteúdo publicado: páginas fixas, linhas, projetos e páginas personalizadas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  return entries.map((entry) => ({
    url: absoluteUrl(entry.path),
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
  }));
}
