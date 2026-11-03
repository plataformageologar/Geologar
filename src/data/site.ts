/**
 * Conteúdo que ainda não tem estrutura no banco, e fallbacks editoriais
 * usados apenas se o Supabase estiver indisponível ou sem o registro.
 */
import type { HomepageContent, NavItem, SiteSettings } from "@/types/content";

// As páginas internas ainda não existem: a navegação usa as seções da homepage.
// Itens de seções sem conteúdo são removidos em `getMainNavigation()`.
export const mainNavigation: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "A Rede", href: "/#a-rede" },
  { label: "Pesquisa", href: "/#pesquisa" },
  { label: "Projetos", href: "/#projetos" },
  { label: "Publicações", href: "/#publicacoes" },
  { label: "Contato", href: "/#contato" },
];

// Os pilares não existem no schema; permanecem como conteúdo estático.
export const pillars = [
  {
    id: "pesquisa",
    title: "Pesquisa",
    description: "Desenvolvimento de estudos e projetos científicos.",
  },
  {
    id: "formacao",
    title: "Formação",
    description: "Integração entre pesquisa, ensino e formação acadêmica.",
  },
  {
    id: "territorio",
    title: "Território",
    description:
      "Conhecimento da geodiversidade, dos recursos naturais e do patrimônio geológico.",
  },
  {
    id: "cooperacao",
    title: "Cooperação",
    description:
      "Articulação entre instituições e parceiros nacionais e internacionais.",
  },
] as const;

export type Pillar = (typeof pillars)[number];

/** Fallback de `site_settings`: apenas a identificação institucional. */
export const fallbackSiteSettings: SiteSettings = {
  site_name: "GeoLogar",
  institutional_name:
    "Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade",
  short_description: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  city: null,
  state: null,
  country: null,
};

/**
 * Fallback de `homepage_content`: textos aprovados do briefing (os mesmos da
 * migration de conteúdo inicial). Usado só quando a leitura falha ou o
 * registro não existe, para a homepage não ficar sem apresentação.
 */
export const fallbackHomepageContent: HomepageContent = {
  hero_title: "Geociências conectando território, ciência e sociedade",
  hero_description:
    "A GeoLogar conecta pesquisadores e instituições para compreender o território, valorizar os recursos naturais e desenvolver soluções sustentáveis.",
  hero_image_path: null,
  hero_image_alt: null,
  hero_primary_cta_label: "Explore nossas pesquisas",
  hero_primary_cta_href: "/#pesquisa",
  hero_secondary_cta_label: "Conheça a rede",
  hero_secondary_cta_href: "/#a-rede",
  about_title: "Uma rede para produzir e compartilhar conhecimento",
  about_description:
    "A GeoLogar é uma rede interdisciplinar dedicada à produção, integração e divulgação do conhecimento em Geociências. Reúne pesquisadores, estudantes e instituições para desenvolver pesquisas, formar pessoas e ampliar a cooperação em recursos naturais e sustentabilidade.",
  cooperation_title: "Vamos conectar conhecimento e novas possibilidades",
  cooperation_description:
    "Entre em contato para conhecer a rede, propor projetos e explorar oportunidades de cooperação em Geociências e sustentabilidade.",
  cooperation_cta_label: "Fale com a GeoLogar",
  cooperation_cta_href: null,
};
