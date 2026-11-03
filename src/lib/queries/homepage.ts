import { cacheLife, cacheTag } from "next/cache";

import { fallbackHomepageContent, mainNavigation } from "@/data/site";
import { createPublicClient } from "@/lib/supabase/public";
import type { HomepageContent, NavItem } from "@/types/content";

import { getHomepageInstitutionGroups } from "./institutions";
import { getFeaturedProjects } from "./projects";
import { getRecentPublications } from "./publications";
import { getHomepageResearchLines } from "./research-lines";
import { contentTags, logQueryError, resolveImageSrc } from "./shared";

async function fetchHomepageContent() {
  "use cache";
  cacheLife("content");
  cacheTag(contentTags.homepage);

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

/** Todo o conteúdo da homepage, carregado em paralelo. */
export async function getHomepageData() {
  const [content, researchLines, projects, publications, institutionGroups] =
    await Promise.all([
      getHomepageContent(),
      getHomepageResearchLines(),
      getFeaturedProjects(),
      getRecentPublications(),
      getHomepageInstitutionGroups(),
    ]);

  // Seções renderizadas (ids usados nas âncoras da navegação e dos CTAs).
  const sections = new Set<string>();
  if (content.about_title) sections.add("a-rede");
  if (researchLines.length > 0) sections.add("pesquisa");
  if (projects.length > 0) sections.add("projetos");
  if (publications.length > 0) sections.add("publicacoes");
  if (institutionGroups.length > 0) sections.add("instituicoes");
  if (content.cooperation_title) sections.add("contato");

  return { content, researchLines, projects, publications, institutionGroups, sections };
}

/** Mantém o link apenas se não apontar para uma seção ausente da homepage. */
export function isLinkAvailable(href: string, sections: Set<string>) {
  return !href.startsWith("/#") || sections.has(href.slice(2));
}

/** Navegação principal sem itens que levariam a seções não renderizadas. */
export async function getMainNavigation(): Promise<NavItem[]> {
  const { sections } = await getHomepageData();
  return mainNavigation.filter((item) => isLinkAvailable(item.href, sections));
}
