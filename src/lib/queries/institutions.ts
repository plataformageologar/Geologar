import { createPublicClient } from "@/lib/supabase/public";
import type { InstitutionGroup } from "@/types/content";

import { failQuery, logQueryError, resolveImageSrc } from "./shared";

async function fetchPublishedInstitutions(limit: number) {
  // Uma única consulta com a categoria embutida (sem N+1).
  const { data, error } = await createPublicClient()
    .from("institutions")
    .select(
      "id, name, acronym, description, logo_path, logo_alt, website_url, category:institution_categories (slug, name, sort_order)",
    )
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("name")
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Agrupa por categoria, na ordem da categoria e, em empate, pelo nome. */
function groupByCategory(
  institutions: Awaited<ReturnType<typeof fetchPublishedInstitutions>>,
): InstitutionGroup[] {
  const groups = new Map<string, InstitutionGroup & { order: number }>();

  for (const { category, ...institution } of institutions) {
    const group = groups.get(category.slug) ?? {
      category: { slug: category.slug, name: category.name },
      institutions: [],
      order: category.sort_order,
    };
    group.institutions.push({
      ...institution,
      logo_path: resolveImageSrc(institution.logo_path),
    });
    groups.set(category.slug, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.category.name.localeCompare(b.category.name, "pt-BR"))
    .map(({ category, institutions }) => ({ category, institutions }));
}

/** Instituições publicadas (destaques primeiro), agrupadas por categoria. */
export async function getHomepageInstitutionGroups(limit = 24): Promise<InstitutionGroup[]> {
  try {
    return groupByCategory(await fetchPublishedInstitutions(limit));
  } catch (error) {
    logQueryError("institutions", error);
    return [];
  }
}

/** Todas as instituições publicadas (/instituicoes); falhas chegam a `error.tsx`. */
export async function getPublishedInstitutionGroups(): Promise<InstitutionGroup[]> {
  try {
    return groupByCategory(await fetchPublishedInstitutions(500));
  } catch (error) {
    failQuery("institutions", error);
  }
}
