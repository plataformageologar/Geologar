/**
 * Fallbacks editoriais usados apenas se o Supabase estiver indisponível ou
 * sem o registro. Pilares, menus, seções e textos das páginas têm seus
 * próprios fallbacks em src/lib/site/ (iguais às seeds das migrations).
 */
import type { HomepageContent, SiteSettings } from "@/types/content";

/** Fallback de `site_settings`: apenas a identificação institucional. */
export const fallbackSiteSettings: SiteSettings = {
  site_name: "GeoLogar",
  institutional_name:
    "Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade",
  short_description: null,
  contact_email: null,
  contact_phone: null,
  contact_whatsapp: null,
  address: null,
  city: null,
  state: null,
  country: null,
  // Vazios: o site usa o logotipo e o ícone oficiais incluídos no código.
  logo_path: null,
  favicon_path: null,
  footer_description: null,
  footer_note: null,
  footer_nav_title: null,
  footer_contact_title: null,
  footer_social_title: null,
  footer_links_title: null,
  footer_logo_mode: "official",
  footer_logo_path: null,
  header_style: "solid",
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
  hero_primary_cta_href: "/pesquisa",
  hero_secondary_cta_label: "Conheça a rede",
  hero_secondary_cta_href: "/rede",
  about_title: "Uma rede para produzir e compartilhar conhecimento",
  about_description:
    "A GeoLogar é uma rede interdisciplinar dedicada à produção, integração e divulgação do conhecimento em Geociências. Reúne pesquisadores, estudantes e instituições para desenvolver pesquisas, formar pessoas e ampliar a cooperação em recursos naturais e sustentabilidade.",
  cooperation_title: "Vamos conectar conhecimento e novas possibilidades",
  cooperation_description:
    "Entre em contato para conhecer a rede, propor projetos e explorar oportunidades de cooperação em Geociências e sustentabilidade.",
  cooperation_cta_label: "Fale com a GeoLogar",
  cooperation_cta_href: "/#contato",
};
