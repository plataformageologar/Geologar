import { createPublicClient } from "@/lib/supabase/public";
import type { InstitutionGroup } from "@/types/content";

import { logQueryError, resolveImageSrc } from "./shared";

async function fetchHomepageInstitutions(limit: number) {
  // Uma única consulta com a categoria embutida (sem N+1).
  const { data, error } = await createPublicClient()
    .from("institutions")
    .select(
      "id, name, acronym, logo_path, logo_alt, website_url, category:institution_categories (slug, name, sort_order)",
    )
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order")
    .order("name")
    .limit(limit);

  if (error) throw error;
  return data;
}

/** Instituições publicadas (destaques primeiro), agrupadas por categoria. */
export async function getHomepageInstitutionGroups(limit = 24): Promise<InstitutionGroup[]> {
  try {
    const institutions = await fetchHomepageInstitutions(limit);
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
  } catch (error) {
    logQueryError("institutions", error);
    return [];
  }
}
