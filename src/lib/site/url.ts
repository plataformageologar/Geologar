/**
 * Endereço público do site, usado em URLs absolutas (canonical, Open Graph,
 * sitemap.xml, robots.txt) e como destino padrão dos links de e-mail.
 *
 * Vem de `NEXT_PUBLIC_SITE_URL` (lida no build) quando é uma origem válida;
 * sem ela, vale o endereço atual do Worker. Ao configurar um domínio próprio,
 * basta definir a variável no build (ver docs/deployment.md) — nenhum domínio
 * definitivo é presumido aqui.
 */
export const WORKERS_DEV_ORIGIN = "https://geologar.plataformageologar.workers.dev";

/** Aceita apenas uma origem (protocolo + host + porta opcional), sem caminho. */
export function parseSiteOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export const SITE_ORIGIN = parseSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? WORKERS_DEV_ORIGIN;

/** URL absoluta de um caminho interno do site público. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

/**
 * Campos comuns do Open Graph. Uma página que define `openGraph` substitui o
 * objeto inteiro do layout, então as páginas repetem estes campos.
 */
export const SITE_OPEN_GRAPH = { type: "website", locale: "pt_BR" } as const;
