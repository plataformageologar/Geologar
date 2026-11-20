import { editorHref } from "@/lib/site/editor-pages";

/**
 * Destinos permitidos após login ou links de e-mail: apenas caminhos
 * internos da área administrativa (sem domínio, protocolo, `//`, `..` ou
 * query string) e o editor visual com uma página da lista permitida
 * (`/admin/editor?pagina=/rede`). Qualquer outro valor cai no destino padrão.
 */
const ADMIN_PATH = /^\/admin(?:\/[a-z0-9-]+)*$/;
const EDITOR_PREFIX = "/admin/editor?pagina=";

// Telas de acesso: não fazem sentido como destino depois de entrar.
const EXCLUDED = new Set(["/admin/login", "/admin/recuperar-senha", "/admin/acesso-negado"]);

export function safeAdminPath(value: unknown, fallback = "/admin"): string {
  if (typeof value === "string" && value.startsWith(EDITOR_PREFIX) && value.length <= 400) {
    try {
      const page = decodeURIComponent(value.slice(EDITOR_PREFIX.length));
      return editorHref(page) ?? fallback;
    } catch {
      return fallback;
    }
  }
  if (typeof value !== "string" || value.length > 120) return fallback;
  return ADMIN_PATH.test(value) && !EXCLUDED.has(value) ? value : fallback;
}

/**
 * Origens aceitas para os links enviados por e-mail (recuperação de senha).
 * O Supabase também valida o destino contra a lista de Redirect URLs do
 * projeto; esta lista evita montar links a partir de um cabeçalho arbitrário.
 */
export const PRODUCTION_ORIGIN = "https://geologar.plataformageologar.workers.dev";

const ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  "http://localhost:3000", // npm run dev
  "http://localhost:8787", // npm run preview
]);

export function resolveAuthOrigin(origin: string | null): string {
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : PRODUCTION_ORIGIN;
}
