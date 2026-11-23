import { cache } from "react";

import {
  DEFAULT_APPEARANCE,
  sanitizeAppearance,
  type Appearance,
} from "@/lib/site/appearance";
import type { ListVersion } from "@/lib/site/lists";
import { DEFAULT_NAVIGATION, type NavDraft, type NavLocation, type SiteNavItem } from "@/lib/site/navigation";
import {
  DEFAULT_PAGE_CONTENT,
  type PageContentKey,
  type PageContentRecord,
} from "@/lib/site/page-content";
import { DEFAULT_PILLARS, isPillarIcon, type Pillar } from "@/lib/site/pillars";
import {
  DEFAULT_SECTIONS,
  isSectionType,
  sanitizeSectionSettings,
  type SectionPage,
  type SectionSettings,
  type SectionType,
} from "@/lib/site/sections";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

import type { Metadata } from "next";

import type { AdminResult } from "./admin-content";
import { logQueryError, resolveImageSrc } from "./shared";

/**
 * Configuração editável do site (pilares, menus, seções, textos das páginas
 * e aparência). Leituras públicas com fallback para o conteúdo inicial — uma
 * falha do banco nunca deixa o site sem menu ou sem seções — e leituras do
 * CMS com a sessão do usuário (RLS), que expõem falhas como `error`.
 */

// Público ----------------------------------------------------------------------

export const getPillars = cache(async (): Promise<Pillar[]> => {
  try {
    const { data, error } = await createPublicClient()
      .from("site_pillars")
      .select("id, title, description, icon")
      .eq("is_visible", true)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data.map((row) => ({ ...row, icon: isPillarIcon(row.icon) ? row.icon : "microscope" }));
  } catch (error) {
    logQueryError("site_pillars", error);
    return DEFAULT_PILLARS;
  }
});

export const getNavigation = cache(async (): Promise<Record<NavLocation, SiteNavItem[]>> => {
  try {
    const { data, error } = await createPublicClient()
      .from("site_navigation")
      .select("location, label, href, open_in_new_tab")
      .eq("is_visible", true)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    const result: Record<NavLocation, SiteNavItem[]> = { header: [], footer: [] };
    for (const row of data) {
      if (row.location === "header" || row.location === "footer") {
        result[row.location].push({ label: row.label, href: row.href, openInNewTab: row.open_in_new_tab });
      }
    }
    return result;
  } catch (error) {
    logQueryError("site_navigation", error);
    return DEFAULT_NAVIGATION;
  }
});

export const getAppearance = cache(async (): Promise<Appearance> => {
  try {
    const { data, error } = await createPublicClient()
      .from("site_appearance")
      .select(
        "primary_color, secondary_color, accent_color, section_background, button_shape, corner_style, heading_font, card_style",
      )
      .maybeSingle();
    if (error) throw error;
    return sanitizeAppearance(data);
  } catch (error) {
    logQueryError("site_appearance", error);
    return DEFAULT_APPEARANCE;
  }
});

export type RenderSection = { id: string; section_type: SectionType; settings: SectionSettings };

function defaultSections(page: SectionPage): RenderSection[] {
  return DEFAULT_SECTIONS[page].map((section, index) => ({ id: `default-${index}`, ...section }));
}

/** Seções visíveis da página, na ordem editorial. */
export const getPageSections = cache(async (page: SectionPage): Promise<RenderSection[]> => {
  try {
    const { data, error } = await createPublicClient()
      .from("page_sections")
      .select("id, section_type, settings")
      .eq("page_key", page)
      .eq("is_visible", true)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return data.flatMap((row) =>
      isSectionType(row.section_type)
        ? [{ id: row.id, section_type: row.section_type, settings: sanitizeSectionSettings(row.section_type, row.settings) }]
        : [],
    );
  } catch (error) {
    logQueryError("page_sections", error);
    return defaultSections(page);
  }
});

const pageContentColumns = "page_key, eyebrow, title, description, seo_title, seo_description, seo_image_path";

export const getPageContent = cache(async (key: PageContentKey): Promise<PageContentRecord> => {
  try {
    const { data, error } = await createPublicClient()
      .from("page_content")
      .select(pageContentColumns)
      .eq("page_key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_PAGE_CONTENT[key];
    return {
      eyebrow: data.eyebrow,
      title: data.title,
      description: data.description,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_image_path: data.seo_image_path,
    };
  } catch (error) {
    logQueryError("page_content", error);
    return DEFAULT_PAGE_CONTENT[key];
  }
});

/**
 * Metadados de uma página interna: título e descrição de SEO editáveis e a
 * imagem de compartilhamento (quando definida).
 */
export async function getPageMetadata(
  key: PageContentKey,
  fallback: { title: string; description?: string | null },
): Promise<Metadata> {
  const content = await getPageContent(key);
  const image = resolveImageSrc(content.seo_image_path);
  const title = content.seo_title ?? fallback.title;
  const description = content.seo_description ?? fallback.description ?? undefined;
  return {
    title,
    description,
    ...(image ? { openGraph: { title, description, images: [{ url: image }] } } : {}),
  };
}

// CMS (sessão do usuário) ----------------------------------------------------------

/**
 * Leituras da versão PUBLICADA para telas somente de consulta (editores em
 * Navegação, Aparência e no editor visual). A edição usa as unidades
 * editoriais (src/lib/queries/editorial.ts).
 */
export type ListForEdit<T> = { items: T[]; versions: ListVersion[] };

export async function getNavigationForEdit(): Promise<AdminResult<Record<NavLocation, ListForEdit<NavDraft>>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_navigation")
    .select("id, location, label, href, open_in_new_tab, is_visible, updated_at")
    .order("sort_order")
    .order("created_at");
  if (error) {
    logQueryError("site_navigation (CMS)", error);
    return { status: "error" };
  }
  const result: Record<NavLocation, ListForEdit<NavDraft>> = {
    header: { items: [], versions: [] },
    footer: { items: [], versions: [] },
  };
  for (const row of data) {
    if (row.location !== "header" && row.location !== "footer") continue;
    result[row.location].items.push({
      id: row.id,
      key: row.id,
      label: row.label,
      href: row.href,
      open_in_new_tab: row.open_in_new_tab,
      is_visible: row.is_visible,
    });
    result[row.location].versions.push({ id: row.id, updated_at: row.updated_at });
  }
  return { status: "ready", data: result };
}

export type AppearanceForEdit = { values: Appearance; updatedAt: string };

export async function getAppearanceForEdit(): Promise<AdminResult<AppearanceForEdit | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_appearance")
    .select(
      "primary_color, secondary_color, accent_color, section_background, button_shape, corner_style, heading_font, card_style, updated_at",
    )
    .maybeSingle();
  if (error) {
    logQueryError("site_appearance (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };
  const { updated_at, ...values } = data;
  return { status: "ready", data: { values: sanitizeAppearance(values), updatedAt: updated_at } };
}

/** Instituições para escolher no bloco de logos (inclui rascunhos, marcados). */
export async function getInstitutionOptionsForSections(): Promise<
  AdminResult<{ id: string; name: string; published: boolean }[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, acronym, is_published")
    .order("sort_order")
    .order("name")
    .limit(200);
  if (error) {
    logQueryError("institutions (opções de seção)", error);
    return { status: "error" };
  }
  return {
    status: "ready",
    data: data.map((row) => ({
      id: row.id,
      name: row.acronym ? `${row.name} (${row.acronym})` : row.name,
      published: row.is_published,
    })),
  };
}
