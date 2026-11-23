"use server";

import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

import { accessFailure, ADMIN_ROLES, fail, logActionError, type FailureState } from "./action-results";
import { DRAFT_SAVED_MESSAGE, parseDocumentToken, saveDraftParts } from "./editorial";
import {
  readSiteSettingsForm,
  toSiteSettingsFormValues,
  type SiteSettingsField,
  type SiteSettingsFormValues,
} from "./site-settings";

/**
 * Informações institucionais (Etapa 9.6): somente administradores. O
 * formulário grava RASCUNHO da unidade "Informações institucionais" pelo
 * núcleo do fluxo editorial; o site público muda só ao publicar.
 */

export type SiteSettingsSaveState =
  | { status: "idle" }
  | { status: "success"; message: string; values: SiteSettingsFormValues; version: number }
  | FailureState<SiteSettingsField>;

const ENTITY = "site-settings" as const;

export async function saveSiteSettings(
  _state: SiteSettingsSaveState,
  formData: FormData,
): Promise<SiteSettingsSaveState> {
  try {
    const access = await getAdminAccess();
    const denied = accessFailure(
      access,
      ADMIN_ROLES,
      ENTITY,
      "Somente administradores podem editar as informações institucionais.",
    );
    if (denied) return denied;

    const token = parseDocumentToken(formData.get("document"));
    if (!token) return fail("conflict", ENTITY);

    const supabase = await createClient();
    const outcome = await saveDraftParts(supabase, true, [
      { ...token, parts: { settings: readSiteSettingsForm(formData) } },
    ]);
    if (outcome.status === "error") {
      const fieldErrors = outcome.partErrors?.[`${token.documentId}:settings`]?.fieldErrors as
        | Partial<Record<SiteSettingsField, string>>
        | undefined;
      return fail(outcome.reason, ENTITY, { fieldErrors, message: outcome.message });
    }

    const saved = outcome.documents[0];
    if (!saved.content.settings) return fail("unexpected", ENTITY);
    refresh();
    return {
      status: "success",
      message: DRAFT_SAVED_MESSAGE,
      values: toSiteSettingsFormValues(saved.content.settings),
      version: saved.version,
    };
  } catch (error) {
    logActionError("salvar informações institucionais", error);
    return fail("connection", ENTITY);
  }
}
