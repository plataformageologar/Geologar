/** Primeiro valor de um parâmetro de busca (`?a=1&a=2` → "1"). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Número de página a partir de `?pagina=`. Ausente → 1; valor inválido
 * (não inteiro, zero, negativo ou absurdo) → `null`, e a rota responde 404.
 */
export function parsePageParam(value: string | string[] | undefined): number | null {
  const raw = firstParam(value);
  if (raw === undefined) return 1;
  if (!/^\d{1,4}$/.test(raw)) return null;
  const page = Number(raw);
  return page >= 1 ? page : null;
}

/** Monta `pathname?query` omitindo parâmetros vazios e a página 1. */
export function buildHref(pathname: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (key === "pagina" && Number(value) === 1) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
