/**
 * Conteúdo validado no briefing da homepage (ainda sujeito à revisão final
 * da equipe GeoLogar). Será substituído por consultas ao Supabase.
 *
 * Não acrescentar aqui conteúdo não confirmado — use `placeholders.ts`.
 */
import type {
  HomepageContent,
  NavItem,
  ResearchLineSummary,
  SiteSettings,
  SocialLink,
} from "@/types/content";

export const siteSettings: SiteSettings = {
  site_name: "GeoLogar",
  institutional_name:
    "Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade",
  contact_email: null,
  contact_phone: null,
  address: null,
  city: null,
  state: null,
  country: null,
};

// Nenhuma rede social confirmada até o momento.
export const socialLinks: SocialLink[] = [];

// As páginas internas ainda não existem: a navegação usa as seções da homepage.
export const mainNavigation: NavItem[] = [
  { label: "Início", href: "/" },
  { label: "A Rede", href: "/#a-rede" },
  { label: "Pesquisa", href: "/#pesquisa" },
  { label: "Projetos", href: "/#projetos" },
  { label: "Publicações", href: "/#publicacoes" },
  { label: "Contato", href: "/#contato" },
];

export const homepageContent: HomepageContent = {
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
  // Aguarda o canal oficial de contato (/contato ou e-mail institucional).
  cooperation_cta_href: null,
};

// Os pilares ainda não existem no schema; permanecem como conteúdo estático.
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

export const researchLines: ResearchLineSummary[] = [
  {
    slug: "geologia-e-geodiversidade",
    title: "Geologia e Geodiversidade",
    short_description:
      "Estudos sobre os materiais, processos e diversidade geológica dos territórios.",
    image_path: null,
    image_alt: null,
  },
  {
    slug: "recursos-minerais",
    title: "Recursos Minerais",
    short_description:
      "Pesquisa sobre recursos minerais, seu aproveitamento e uso responsável.",
    image_path: null,
    image_alt: null,
  },
  {
    slug: "geologia-ambiental",
    title: "Geologia Ambiental",
    short_description:
      "Investigação das relações entre processos geológicos, ambiente e sociedade.",
    image_path: null,
    image_alt: null,
  },
  {
    slug: "sustentabilidade-e-economia-circular",
    title: "Sustentabilidade e Economia Circular",
    short_description:
      "Desenvolvimento de soluções para uso eficiente de recursos e valorização de resíduos.",
    image_path: null,
    image_alt: null,
  },
  {
    slug: "patrimonio-geologico",
    title: "Patrimônio Geológico",
    short_description:
      "Identificação, valorização e conservação de locais de interesse geológico.",
    image_path: null,
    image_alt: null,
  },
  {
    slug: "geotecnologias-e-geoprocessamento",
    title: "Geotecnologias e Geoprocessamento",
    short_description:
      "Aplicação de ferramentas de análise espacial ao estudo e à gestão do território.",
    image_path: null,
    image_alt: null,
  },
];
