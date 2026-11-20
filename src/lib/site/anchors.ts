import type { HomepageContent } from "@/types/content";

import type { SectionType } from "./sections";

/**
 * Âncoras (id) das seções nativas da homepage, usadas por links "/#…" do
 * banner e da navegação. Módulo puro: usado pelo site e pelo editor visual.
 */
export const SECTION_ANCHORS: Partial<Record<SectionType, string>> = {
  about: "a-rede",
  research: "pesquisa",
  projects: "projetos",
  publications: "publicacoes",
  institutions: "instituicoes",
  cooperation: "contato",
};

/**
 * Mantém o link apenas se não apontar para uma âncora de seção ausente da
 * homepage (ex.: valores antigos como "/#pesquisa"). Rotas e URLs externas
 * são mantidas.
 */
export function isLinkAvailable(href: string, sections: Set<string>) {
  return !href.startsWith("/#") || sections.has(href.slice(2));
}

/** Textos do banner sem os CTAs que apontam para seções ausentes. */
export function withAvailableHeroLinks(content: HomepageContent, sections: Set<string>): HomepageContent {
  const available = (href: string | null) => (href && isLinkAvailable(href, sections) ? href : null);
  return {
    ...content,
    hero_primary_cta_href: available(content.hero_primary_cta_href),
    hero_secondary_cta_href: available(content.hero_secondary_cta_href),
  };
}
