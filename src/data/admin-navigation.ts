/**
 * Módulos da área administrativa (arquitetura do CMS). Itens sem `href`
 * ainda não existem: aparecem como "Em breve", sem link.
 */
export type AdminNavItem = {
  id:
    | "overview"
    | "homepage"
    | "research-lines"
    | "projects"
    | "publications"
    | "institutions"
    | "site-settings"
    | "social-links"
    | "profile";
  label: string;
  href?: string;
  /** Destaca o item apenas na rota exata (ex.: /admin). */
  exact?: boolean;
};

export type AdminNavSection = {
  title?: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavSection[] = [
  { items: [{ id: "overview", label: "Visão geral", href: "/admin", exact: true }] },
  {
    title: "Conteúdo",
    items: [
      { id: "homepage", label: "Homepage", href: "/admin/homepage" },
      { id: "research-lines", label: "Linhas de pesquisa" },
      { id: "projects", label: "Projetos" },
      { id: "publications", label: "Publicações" },
      { id: "institutions", label: "Instituições" },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "site-settings", label: "Informações institucionais" },
      { id: "social-links", label: "Redes sociais" },
    ],
  },
  { title: "Conta", items: [{ id: "profile", label: "Meu perfil", href: "/admin/perfil" }] },
];
