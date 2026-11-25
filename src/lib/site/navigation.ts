import { normalizeText, validateHref, validateText } from "@/lib/admin/validation";
import type { NavItem } from "@/types/content";

import { isUuidOrNull } from "./lists";

/**
 * Menus do cabeçalho e do rodapé (tabela site_navigation; somente
 * administradores). "useful" é a coluna "Links úteis" do rodapé
 * (privacidade, termos, acessibilidade… quando existirem). O link "Área
 * restrita" não faz parte destes menus: fica no código, para que nenhuma
 * edição bloqueie o acesso ao CMS.
 */

export const NAV_LOCATIONS = ["header", "footer", "useful"] as const;
export type NavLocation = (typeof NAV_LOCATIONS)[number];

export const NAV_LOCATION_LABELS: Record<NavLocation, string> = {
  header: "Menu do cabeçalho",
  footer: "Links do rodapé",
  useful: "Links úteis do rodapé",
};

export const NAV_MAX = 20;
export const NAV_LABEL_RULE = { max: 40, required: true };

export type SiteNavItem = NavItem & { openInNewTab: boolean };

export type NavDraft = {
  id: string | null;
  key: string;
  label: string;
  href: string;
  open_in_new_tab: boolean;
  is_visible: boolean;
};

export type NavFieldErrors = Partial<Record<"label" | "href", string>>;

export type ValidNavItem = Omit<NavDraft, "key" | "label" | "href"> & { label: string; href: string };

export function isNavLocation(value: unknown): value is NavLocation {
  return value === "header" || value === "footer" || value === "useful";
}

/** Links internos que nunca entram nos menus públicos. */
function isReservedPath(href: string) {
  return /^\/(admin|api|auth)(?:[/?#]|$)/.test(href);
}

export function validateNavHref(value: string | null): string | null {
  if (value === null) return "Informe o destino do link.";
  const error = validateHref(value);
  if (error) return error;
  if (isReservedPath(value)) return "Links para a área administrativa ou rotas internas não são permitidos no menu.";
  return null;
}

export function validateNavList(raw: unknown): {
  items: ValidNavItem[];
  errors: Record<string, NavFieldErrors>;
  listError: string | null;
} {
  const errors: Record<string, NavFieldErrors> = {};
  if (!Array.isArray(raw) || raw.length > NAV_MAX) {
    return { items: [], errors, listError: `Cada menu aceita no máximo ${NAV_MAX} links.` };
  }
  const items: ValidNavItem[] = [];
  const ids = new Set<string>();
  let listError: string | null = null;

  raw.forEach((entry: unknown, index) => {
    const item = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    const key = typeof item.key === "string" ? item.key : String(index);
    const id = item.id ?? null;
    if (
      !isUuidOrNull(id) ||
      (id !== null && ids.has(id)) ||
      typeof item.is_visible !== "boolean" ||
      typeof item.open_in_new_tab !== "boolean"
    ) {
      listError = "Lista de links inválida. Recarregue a página.";
      return;
    }
    if (id !== null) ids.add(id);

    const fieldErrors: NavFieldErrors = {};
    const label = normalizeText(typeof item.label === "string" ? item.label : "");
    const labelError = validateText(label, NAV_LABEL_RULE);
    if (labelError) fieldErrors.label = labelError;
    const href = normalizeText(typeof item.href === "string" ? item.href : "");
    const hrefError = validateNavHref(href);
    if (hrefError) fieldErrors.href = hrefError;

    if (Object.keys(fieldErrors).length > 0) errors[key] = fieldErrors;
    items.push({
      id,
      label: label ?? "",
      href: href ?? "",
      open_in_new_tab: item.open_in_new_tab,
      is_visible: item.is_visible,
    });
  });

  return { items, errors, listError };
}

const page = (label: string, href: string): SiteNavItem => ({ label, href, openInNewTab: false });

/**
 * Menus do conteúdo inicial (fallback quando o banco não responde). "Contato"
 * leva à coluna de contato do rodapé (âncora #contato, presente em todas as
 * páginas).
 */
export const DEFAULT_NAVIGATION: Record<NavLocation, SiteNavItem[]> = {
  header: [
    page("Início", "/"),
    page("A Rede", "/rede"),
    page("Pesquisa", "/pesquisa"),
    page("Projetos", "/projetos"),
    page("Publicações", "/publicacoes"),
    page("Contato", "/#contato"),
  ],
  footer: [
    page("Início", "/"),
    page("A Rede", "/rede"),
    page("Pesquisa", "/pesquisa"),
    page("Projetos", "/projetos"),
    page("Publicações", "/publicacoes"),
    page("Instituições", "/instituicoes"),
    page("Contato", "/#contato"),
  ],
  useful: [],
};

export type UnavailableLink = { location: NavLocation; label: string; href: string; reason: string };

const CUSTOM_PAGE_HREF = /^\/paginas\/([^/?#]+)\/?(?:[?#].*)?$/;

/**
 * Links do menu para páginas personalizadas que não estão no ar (rascunho,
 * arquivada ou inexistente): o visitante veria "página não encontrada". Só
 * avisa — os links não são removidos automaticamente.
 */
export function unavailableCustomPageLinks(
  menus: Partial<Record<NavLocation, readonly { label: string; href: string; is_visible?: boolean }[]>>,
  pages: readonly { slug: string; status: string }[],
): UnavailableLink[] {
  const statusBySlug = new Map(pages.map((page) => [page.slug, page.status]));
  const result: UnavailableLink[] = [];
  for (const location of NAV_LOCATIONS) {
    for (const item of menus[location] ?? []) {
      if (item.is_visible === false) continue; // link oculto não aparece ao visitante
      const match = CUSTOM_PAGE_HREF.exec(item.href.trim());
      if (!match) continue;
      const status = statusBySlug.get(decodeURIComponentSafe(match[1]));
      if (status === "published") continue;
      const reason =
        status === "archived" ? "página arquivada" : status === "draft" ? "página não publicada" : "página inexistente";
      result.push({ location, label: item.label, href: item.href, reason });
    }
  }
  return result;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
