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
 * Para as páginas internas: registra a falha e a propaga até `error.tsx`, para
 * que um erro de banco não seja apresentado como "nenhum registro". A
 * mensagem não chega ao visitante (o Next.js a substitui em produção).
 */
export function failQuery(scope: string, error: unknown): never {
  logQueryError(scope, error);
  throw new Error(`Falha ao carregar ${scope}`);
}

/** Mesmo formato garantido pela constraint `*_slug_format` do banco. */
export function isValidSlug(value: string) {
  return value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Filtro de defesa em profundidade: o RLS já oculta registros não publicados
 * de visitantes anônimos, inclusive nas tabelas de relacionamento.
 */
export function onlyPublished<T extends { is_published: boolean }>(
  items: (T | null | undefined)[],
): T[] {
  return items.filter((item): item is T => item != null && item.is_published);
}

/** Remove registros repetidos (ex.: publicação ligada à linha e a um projeto dela). */
export function uniqueBySlug<T extends { slug: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.slug, item])).values()];
}

/** Ordem editorial: `sort_order` e, em empate, título. */
export function byEditorialOrder(
  a: { sort_order: number; title: string },
  b: { sort_order: number; title: string },
) {
  return a.sort_order - b.sort_order || a.title.localeCompare(b.title, "pt-BR");
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
