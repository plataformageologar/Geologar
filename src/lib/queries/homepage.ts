import { cache } from "react";

import { fallbackHomepageContent } from "@/data/site";
import { createPublicClient } from "@/lib/supabase/public";
import type { HomepageContent } from "@/types/content";

import type { SectionsData } from "@/components/site/page-sections";
import { SECTION_ANCHORS } from "@/lib/site/anchors";

import { getHomepageInstitutionGroups } from "./institutions";
import { getFeaturedProjects } from "./projects";
import { getRecentPublications } from "./publications";
import { getHomepageResearchLines } from "./research-lines";
import { logQueryError, resolveImageSrc } from "./shared";
import { getPageSections, getPillars, type RenderSection } from "./site-config";

async function fetchHomepageContent() {
  // Registro único, garantido pelo índice homepage_content_singleton.
  const { data, error } = await createPublicClient()
    .from("homepage_content")
    .select(
      "hero_title, hero_description, hero_image_path, hero_image_alt, hero_primary_cta_label, hero_primary_cta_href, hero_secondary_cta_label, hero_secondary_cta_href, about_title, about_description, cooperation_title, cooperation_description, cooperation_cta_label, cooperation_cta_href",
    )
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Textos da homepage; usa o fallback do briefing se o registro não puder ser lido. */
export async function getHomepageContent(): Promise<HomepageContent> {
  try {
    const content = await fetchHomepageContent();
    if (!content) {
      logQueryError("homepage_content", "registro inexistente; usando fallback");
      return fallbackHomepageContent;
    }
    return { ...content, hero_image_path: resolveImageSrc(content.hero_image_path) };
  } catch (error) {
    logQueryError("homepage_content", error);
    return fallbackHomepageContent;
  }
}

/** Dados das seções configuráveis (homepage e /rede), lidos em paralelo. */
export async function getSectionsData(options: { researchLineLimit: number }): Promise<SectionsData> {
  const [homepage, researchLines, projects, publications, institutionGroups, pillars] = await Promise.all([
    getHomepageContent(),
    // Até 12 itens: o limite exibido é escolhido em cada seção.
    getHomepageResearchLines(options.researchLineLimit),
    getFeaturedProjects(12),
    getRecentPublications(12),
    getHomepageInstitutionGroups(),
    getPillars(),
  ]);
  const institutions = Object.fromEntries(
    institutionGroups.flatMap((group) => group.institutions.map((institution) => [institution.id, institution])),
  );
  return { homepage, researchLines, projects, publications, institutionGroups, pillars, institutions };
}

/**
 * Todo o conteúdo da homepage, carregado em paralelo. `cache` garante uma única
 * leitura por requisição, compartilhada pelos metadados e pela página.
 */
export const getHomepageData = cache(async () => {
  const [data, sections] = await Promise.all([getSectionsData({ researchLineLimit: 12 }), getPageSections("home")]);

  // Seções renderizadas (ids usados nas âncoras da navegação e dos CTAs).
  const anchors = new Set<string>();
  const present: Record<string, boolean> = {
    about: Boolean(data.homepage.about_title),
    research: data.researchLines.length > 0,
    projects: data.projects.length > 0,
    publications: data.publications.length > 0,
    institutions: data.institutionGroups.length > 0,
    cooperation: Boolean(data.homepage.cooperation_title),
  };
  for (const section of sections) {
    const anchor = SECTION_ANCHORS[section.section_type];
    if (anchor && present[section.section_type]) anchors.add(anchor);
  }

  return { data, sections, anchors };
});

export type { RenderSection };

export { isLinkAvailable, withAvailableHeroLinks } from "@/lib/site/anchors";
