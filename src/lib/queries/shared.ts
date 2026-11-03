/**
 * Utilitários comuns às funções de leitura de conteúdo público.
 */

/**
 * Tags de cache por tabela. O futuro CMS poderá invalidá-las após uma edição
 * (`revalidateTag`/`updateTag`) em vez de esperar a revalidação temporal.
 */
export const contentTags = {
  siteSettings: "site_settings",
  socialLinks: "social_links",
  homepage: "homepage_content",
  researchLines: "research_lines",
  projects: "projects",
  publications: "publications",
  institutions: "institutions",
} as const;

/**
 * Registra a falha no servidor (logs locais / do Netlify). Nunca é exibida ao
 * visitante: a interface recebe um fallback ou uma lista vazia.
 */
export function logQueryError(scope: string, error: unknown) {
  console.error(`[supabase] Falha ao carregar ${scope}:`, error);
}

/**
 * Converte um caminho de imagem do banco em `src` utilizável pelo next/image.
 *
 * Nesta etapa só são aceitos arquivos locais de `public/` (iniciados por "/").
 * O Supabase Storage ainda não foi configurado; valores em outro formato são
 * ignorados para não quebrar a página.
 */
export function resolveImageSrc(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") && !path.startsWith("//")) return path;

  if (process.env.NODE_ENV === "development") {
    console.warn(`[imagens] Caminho ignorado (Storage ainda não configurado): ${path}`);
  }
  return null;
}
