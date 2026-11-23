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
    | "media"
    | "demo"
    | "history"
    | "visual-editor"
    | "custom-pages"
    | "sections"
    | "pillars"
    | "page-texts"
    | "navigation"
    | "appearance"
    | "site-settings"
    | "social-links"
    | "users"
    | "profile";
  label: string;
  href?: string;
  /** Destaca o item apenas na rota exata (ex.: /admin). */
  exact?: boolean;
  /** Só aparece para administradores (a página também verifica no servidor). */
  adminOnly?: boolean;
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
      { id: "research-lines", label: "Linhas de pesquisa", href: "/admin/linhas-de-pesquisa" },
      { id: "projects", label: "Projetos", href: "/admin/projetos" },
      { id: "publications", label: "Publicações", href: "/admin/publicacoes" },
      { id: "institutions", label: "Instituições", href: "/admin/instituicoes" },
      { id: "media", label: "Biblioteca de mídia", href: "/admin/midias" },
    ],
  },
  {
    title: "Site",
    items: [
      { id: "visual-editor", label: "Editor visual", href: "/admin/editor?pagina=%2F" },
      { id: "custom-pages", label: "Páginas", href: "/admin/paginas" },
      { id: "sections", label: "Seções e blocos", href: "/admin/secoes" },
      { id: "pillars", label: "Pilares da rede", href: "/admin/pilares" },
      { id: "page-texts", label: "Textos das páginas", href: "/admin/textos-das-paginas" },
      { id: "navigation", label: "Navegação", href: "/admin/navegacao" },
      { id: "appearance", label: "Aparência", href: "/admin/aparencia" },
    ],
  },
  {
    title: "Revisão",
    items: [
      { id: "history", label: "Histórico de versões", href: "/admin/historico" },
      { id: "demo", label: "Prévia de demonstração", href: "/admin/demonstracao" },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "site-settings", label: "Informações institucionais", href: "/admin/configuracoes" },
      { id: "social-links", label: "Redes sociais", href: "/admin/redes-sociais" },
      { id: "users", label: "Usuários e permissões", href: "/admin/usuarios", adminOnly: true },
    ],
  },
  { title: "Conta", items: [{ id: "profile", label: "Meu perfil", href: "/admin/perfil" }] },
];
