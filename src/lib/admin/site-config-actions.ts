"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { MEDIA_MISSING_MESSAGE } from "@/lib/media/references";
import { sanitizeAppearance, validateAppearance, type Appearance, type AppearanceFieldErrors } from "@/lib/site/appearance";
import { isListVersions, type ListVersion } from "@/lib/site/lists";
import { isNavLocation, validateNavList, type NavDraft, type NavFieldErrors, type NavLocation } from "@/lib/site/navigation";
import {
  isPageContentKey,
  pageContentFields,
  toPageContentValues,
  validatePageContent,
  type PageContentFieldErrors,
  type PageContentKey,
  type PageContentValues,
} from "@/lib/site/page-content";
import { isPillarIcon, validatePillarList, type PillarDraft, type PillarFieldErrors } from "@/lib/site/pillars";
import {
  isSectionPage,
  isSectionType,
  sanitizeSectionSettings,
  sectionImagePaths,
  validateSectionList,
  type SectionDraft,
  type SectionFieldErrors,
  type SectionPage,
  type SectionType,
} from "@/lib/site/sections";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import {
  accessFailure,
  ADMIN_ROLES,
  classifyDatabaseError,
  EDITOR_ROLES,
  fail,
  logActionError,
  type Entity,
  type FailureState,
} from "./action-results";

/**
 * Gravação da configuração do site. Uma única camada para o CMS e para o
 * editor visual: os dois chamam estas mesmas actions, com as mesmas regras.
 *
 * Em todas: sessão e papel lidos de novo no servidor; dados validados aqui
 * (o navegador nunca é confiável); escrita com a sessão do usuário (RLS e
 * GRANTs por coluna); conflito de edição detectado por `updated_at`; valores
 * devolvidos pelo banco conferidos antes de confirmar o sucesso.
 */

type ListFailure<ItemErrors> = FailureState & { itemErrors?: Record<string, ItemErrors> };

export type ListSaveResult<Item, ItemErrors> =
  | { status: "success"; message: string; items: Item[]; versions: ListVersion[] }
  | ListFailure<ItemErrors>;

function listError<E>(entity: Entity, message: string): ListFailure<E> {
  return fail("validation", entity, { message });
}

function itemFailure<E>(entity: Entity, itemErrors: Record<string, E>): ListFailure<E> {
  return { ...fail("validation", entity), itemErrors };
}

function databaseFailure<E>(entity: Entity, scope: string, error: PostgrestError, status: number): ListFailure<E> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "media-missing") return fail("validation", entity, { message: MEDIA_MISSING_MESSAGE });
  return fail(reason, entity);
}

// Pilares -----------------------------------------------------------------------------

export type PillarsSaveResult = ListSaveResult<PillarDraft, PillarFieldErrors>;

export async function savePillars(input: { versions: unknown; items: unknown }): Promise<PillarsSaveResult> {
  const entity = "pillars";
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, entity);
    if (denied) return denied;
    if (!isListVersions(input?.versions)) return listError(entity, "Lista desatualizada. Recarregue a página.");

    const { items, errors, listError: invalidList } = validatePillarList(input.items);
    if (invalidList) return listError(entity, invalidList);
    if (Object.keys(errors).length > 0) return itemFailure(entity, errors);

    const supabase = await createClient();
    const { data, error, status } = await supabase.rpc("save_site_pillars", {
      p_expected: input.versions,
      p_items: items as unknown as Json,
    });
    if (error) return databaseFailure(entity, "gravação de site_pillars", error, status);

    const matches =
      data.length === items.length &&
      data.every(
        (row, index) =>
          row.title === items[index].title &&
          row.description === items[index].description &&
          row.icon === items[index].icon &&
          row.is_visible === items[index].is_visible,
      );
    if (!matches) {
      console.error("[cms] Pilares devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", entity);
    }

    refresh();
    return {
      status: "success",
      message: "Pilares salvos. A homepage e a página A Rede já mostram a nova versão.",
      items: data.map((row) => ({
        id: row.id,
        key: row.id,
        title: row.title,
        description: row.description ?? "",
        icon: isPillarIcon(row.icon) ? row.icon : "microscope",
        is_visible: row.is_visible,
      })),
      versions: data.map(({ id, updated_at }) => ({ id, updated_at })),
    };
  } catch (error) {
    logActionError("salvar pilares", error);
    return fail("connection", entity);
  }
}

// Navegação ---------------------------------------------------------------------------

export type NavigationSaveResult = ListSaveResult<NavDraft, NavFieldErrors>;

export async function saveNavigation(input: {
  location: unknown;
  versions: unknown;
  items: unknown;
}): Promise<NavigationSaveResult> {
  const entity = "navigation";
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      entity,
      "Somente administradores podem alterar os menus do site.",
    );
    if (denied) return denied;
    const location: NavLocation | null = isNavLocation(input?.location) ? input.location : null;
    if (!location || !isListVersions(input.versions)) {
      return listError(entity, "Lista desatualizada. Recarregue a página.");
    }

    const { items, errors, listError: invalidList } = validateNavList(input.items);
    if (invalidList) return listError(entity, invalidList);
    if (Object.keys(errors).length > 0) return itemFailure(entity, errors);

    const supabase = await createClient();
    const { data, error, status } = await supabase.rpc("save_site_navigation", {
      p_location: location,
      p_expected: input.versions,
      p_items: items as unknown as Json,
    });
    if (error) return databaseFailure(entity, "gravação de site_navigation", error, status);

    const matches =
      data.length === items.length &&
      data.every(
        (row, index) =>
          row.label === items[index].label &&
          row.href === items[index].href &&
          row.open_in_new_tab === items[index].open_in_new_tab &&
          row.is_visible === items[index].is_visible,
      );
    if (!matches) {
      console.error("[cms] Links devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", entity);
    }

    refresh();
    return {
      status: "success",
      message: location === "header" ? "Menu do cabeçalho salvo." : "Links do rodapé salvos.",
      items: data.map((row) => ({
        id: row.id,
        key: row.id,
        label: row.label,
        href: row.href,
        open_in_new_tab: row.open_in_new_tab,
        is_visible: row.is_visible,
      })),
      versions: data.map(({ id, updated_at }) => ({ id, updated_at })),
    };
  } catch (error) {
    logActionError("salvar navegação", error);
    return fail("connection", entity);
  }
}

// Seções e blocos ---------------------------------------------------------------------

export type SectionsSaveResult = ListSaveResult<SectionDraft, SectionFieldErrors>;

export async function savePageSections(input: {
  page: unknown;
  versions: unknown;
  items: unknown;
}): Promise<SectionsSaveResult> {
  const entity = "page-sections";
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, entity);
    if (denied) return denied;
    const page: SectionPage | null = isSectionPage(input?.page) ? input.page : null;
    if (!page || !isListVersions(input.versions)) {
      return listError(entity, "Lista desatualizada. Recarregue a página.");
    }

    const supabase = await createClient();
    // Tipo e imagens atuais de cada seção (lidos do banco, não do navegador).
    const current = await supabase.from("page_sections").select("id, section_type, settings").eq("page_key", page);
    if (current.error) return databaseFailure(entity, "leitura de page_sections", current.error, current.status);
    const currentMap = new Map<string, { section_type: SectionType; images: ReadonlySet<string> }>();
    for (const row of current.data) {
      if (!isSectionType(row.section_type)) continue;
      currentMap.set(row.id, {
        section_type: row.section_type,
        images: new Set(sectionImagePaths(sanitizeSectionSettings(row.section_type, row.settings))),
      });
    }

    const { items, errors, listError: invalidList } = validateSectionList(page, input.items, currentMap);
    if (invalidList) return listError(entity, invalidList);
    if (Object.keys(errors).length > 0) return itemFailure(entity, errors);

    const { data, error, status } = await supabase.rpc("save_page_sections", {
      p_page_key: page,
      p_expected: input.versions,
      p_items: items as unknown as Json,
    });
    if (error) return databaseFailure(entity, "gravação de page_sections", error, status);

    const matches =
      data.length === items.length &&
      data.every(
        (row, index) =>
          row.section_type === items[index].section_type &&
          row.is_visible === items[index].is_visible &&
          JSON.stringify(sanitizeSectionSettings(items[index].section_type, row.settings)) ===
            JSON.stringify(items[index].settings),
      );
    if (!matches) {
      console.error("[cms] Seções devolvidas pelo banco diferem das enviadas.");
      return fail("unexpected", entity);
    }

    refresh();
    return {
      status: "success",
      message: "Seções salvas. A página pública já mostra a nova organização.",
      items: data.flatMap((row) =>
        isSectionType(row.section_type)
          ? [
              {
                id: row.id,
                key: row.id,
                section_type: row.section_type,
                is_visible: row.is_visible,
                settings: sanitizeSectionSettings(row.section_type, row.settings),
              },
            ]
          : [],
      ),
      versions: data.map(({ id, updated_at }) => ({ id, updated_at })),
    };
  } catch (error) {
    logActionError("salvar seções", error);
    return fail("connection", entity);
  }
}

// Textos das páginas ------------------------------------------------------------------

export type PageContentSaveResult =
  | { status: "success"; message: string; values: PageContentValues; updatedAt: string }
  | FailureState<keyof PageContentFieldErrors>;

export async function savePageContent(input: {
  page: unknown;
  values: unknown;
  updatedAt: unknown;
}): Promise<PageContentSaveResult> {
  const entity = "page-content";
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, entity);
    if (denied) return denied;
    const key: PageContentKey | null = isPageContentKey(input?.page) ? input.page : null;
    if (!key) return fail("not-found", entity);

    const supabase = await createClient();
    const read = await supabase
      .from("page_content")
      .select("seo_image_path, updated_at")
      .eq("page_key", key)
      .maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de page_content", read.error, read.status), entity);
    if (!read.data) return fail("not-found", entity);

    const { data, errors } = validatePageContent(input.values, read.data.seo_image_path);
    if (Object.keys(errors).length > 0) return fail("validation", entity, { fieldErrors: errors });
    if (input.updatedAt !== read.data.updated_at) return fail("conflict", entity);

    const saved = await supabase
      .from("page_content")
      .update(data)
      .eq("page_key", key)
      .eq("updated_at", read.data.updated_at)
      .select("eyebrow, title, description, seo_title, seo_description, seo_image_path, updated_at")
      .maybeSingle();
    if (saved.error) {
      const reason = classifyDatabaseError("gravação de page_content", saved.error, saved.status);
      if (reason === "media-missing") {
        return fail("validation", entity, { fieldErrors: { seo_image_path: MEDIA_MISSING_MESSAGE } });
      }
      return fail(reason, entity);
    }
    if (!saved.data) {
      const after = await supabase.from("page_content").select("updated_at").eq("page_key", key).maybeSingle();
      if (after.data && after.data.updated_at !== read.data.updated_at) return fail("conflict", entity);
      return fail("forbidden", entity);
    }
    const { updated_at, ...row } = saved.data;
    if (!pageContentFields.every((field) => row[field] === data[field])) {
      console.error("[cms] Textos da página devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", entity);
    }

    refresh();
    return {
      status: "success",
      message: "Textos da página salvos.",
      values: toPageContentValues(row),
      updatedAt: updated_at,
    };
  } catch (error) {
    logActionError("salvar textos da página", error);
    return fail("connection", entity);
  }
}

// Aparência ---------------------------------------------------------------------------

export type AppearanceSaveResult =
  | { status: "success"; message: string; values: Appearance; updatedAt: string }
  | FailureState<keyof AppearanceFieldErrors>;

export async function saveAppearance(input: { values: unknown; updatedAt: unknown }): Promise<AppearanceSaveResult> {
  const entity = "appearance";
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      entity,
      "Somente administradores podem alterar a aparência do site.",
    );
    if (denied) return denied;

    const supabase = await createClient();
    const read = await supabase.from("site_appearance").select("id, updated_at").maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de site_appearance", read.error, read.status), entity);
    if (!read.data) return fail("not-found", entity);

    const { data, errors } = validateAppearance(input?.values);
    if (Object.keys(errors).length > 0) return fail("validation", entity, { fieldErrors: errors });
    if (input.updatedAt !== read.data.updated_at) return fail("conflict", entity);

    const saved = await supabase
      .from("site_appearance")
      .update(data)
      .eq("id", read.data.id)
      .eq("updated_at", read.data.updated_at)
      .select(
        "primary_color, secondary_color, accent_color, section_background, button_shape, corner_style, heading_font, card_style, updated_at",
      )
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("gravação de site_appearance", saved.error, saved.status), entity);
    if (!saved.data) {
      const after = await supabase.from("site_appearance").select("updated_at").maybeSingle();
      if (after.data && after.data.updated_at !== read.data.updated_at) return fail("conflict", entity);
      return fail("forbidden", entity);
    }
    const { updated_at, ...row } = saved.data;
    const values = sanitizeAppearance(row);
    if (JSON.stringify(values) !== JSON.stringify(data)) {
      console.error("[cms] Aparência devolvida pelo banco difere da enviada.");
      return fail("unexpected", entity);
    }

    refresh();
    return { status: "success", message: "Aparência salva. Todo o site já usa as novas opções.", values, updatedAt: updated_at };
  } catch (error) {
    logActionError("salvar aparência", error);
    return fail("connection", entity);
  }
}
