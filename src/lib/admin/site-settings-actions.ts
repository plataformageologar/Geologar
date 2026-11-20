"use server";

import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { MEDIA_MISSING_MESSAGE } from "@/lib/media/references";
import { siteSettingsEditColumns } from "@/lib/queries/admin-institutional";
import { createClient } from "@/lib/supabase/server";

import {
  accessFailure,
  ADMIN_ROLES,
  classifyDatabaseError,
  fail,
  formText,
  logActionError,
  type FailureState,
} from "./action-results";
import {
  parseSiteSettingsValues,
  readSiteSettingsForm,
  siteSettingsFields,
  toSiteSettingsFormValues,
  type SiteSettingsField,
  type SiteSettingsFormValues,
} from "./site-settings";

/**
 * Informações institucionais (registro único de site_settings): somente
 * administradores. Edita o registro existente (UPDATE … WHERE id AND
 * updated_at); nunca cria outro nem usa upsert.
 */

export type SiteSettingsSaveState =
  | { status: "idle" }
  | { status: "success"; message: string; values: SiteSettingsFormValues; updatedAt: string }
  | FailureState<SiteSettingsField>;

const ENTITY = "site-settings" as const;

export async function saveSiteSettings(
  _state: SiteSettingsSaveState,
  formData: FormData,
): Promise<SiteSettingsSaveState> {
  try {
    const denied = accessFailure(
      await getAdminAccess(),
      ADMIN_ROLES,
      ENTITY,
      "Somente administradores podem editar as informações institucionais.",
    );
    if (denied) return denied;

    const supabase = await createClient();
    // O id vem do banco, nunca do navegador.
    const read = await supabase.from("site_settings").select("id, updated_at, logo_path, favicon_path, footer_logo_path").maybeSingle();
    if (read.error) return fail(classifyDatabaseError("leitura de site_settings", read.error, read.status), ENTITY);
    if (!read.data) return fail("not-found", ENTITY);

    const { data, errors } = parseSiteSettingsValues(readSiteSettingsForm(formData), {
      logoPath: read.data.logo_path,
      faviconPath: read.data.favicon_path,
      footerLogoPath: read.data.footer_logo_path,
    });
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    if (formText(formData, "updated_at") !== read.data.updated_at) return fail("conflict", ENTITY);

    const saved = await supabase
      .from("site_settings")
      .update(data)
      .eq("id", read.data.id)
      .eq("updated_at", read.data.updated_at)
      .select(siteSettingsEditColumns)
      .maybeSingle();
    if (saved.error) {
      const reason = classifyDatabaseError("gravação de site_settings", saved.error, saved.status);
      if (reason === "media-missing") {
        // Arquivo excluído da biblioteca entre a seleção e o envio.
        const fieldErrors: Partial<Record<SiteSettingsField, string>> = {};
        if (data.logo_path !== read.data.logo_path) fieldErrors.logo_path = MEDIA_MISSING_MESSAGE;
        if (data.favicon_path !== read.data.favicon_path) fieldErrors.favicon_path = MEDIA_MISSING_MESSAGE;
        if (data.footer_logo_path !== read.data.footer_logo_path) fieldErrors.footer_logo_path = MEDIA_MISSING_MESSAGE;
        return fail("validation", ENTITY, { fieldErrors });
      }
      return fail(reason, ENTITY);
    }
    if (!saved.data) {
      const after = await supabase.from("site_settings").select("updated_at").maybeSingle();
      if (after.data && after.data.updated_at !== read.data.updated_at) return fail("conflict", ENTITY);
      console.warn("[cms] UPDATE de site_settings não alterou nenhuma linha (RLS).");
      return fail("forbidden", ENTITY);
    }

    const row = saved.data;
    if (!siteSettingsFields.every((field) => row[field] === data[field])) {
      console.error("[cms] Valores de site_settings devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected", ENTITY);
    }

    refresh();
    return {
      status: "success",
      message: "Informações salvas. Cabeçalho, rodapé, página de contato e metadados do site já usam os novos dados.",
      values: toSiteSettingsFormValues(row),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    logActionError("salvar informações institucionais", error);
    return fail("connection", ENTITY);
  }
}
