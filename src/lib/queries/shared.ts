/**
 * Utilitários comuns às funções de leitura de conteúdo público.
 */

/**
 * Registra a falha no servidor (logs do Worker). Nunca é exibida ao
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
