"use server";

import { refresh } from "next/cache";

import { getAdminAccess } from "@/lib/auth/access";
import { socialLinkEditColumns } from "@/lib/queries/admin-institutional";
import { createClient } from "@/lib/supabase/server";

import {
  accessFailure,
  ADMIN_ROLES,
  classifyDatabaseError,
  fail,
  formText,
  logActionError,
  violatedConstraint,
  type FailureState,
  type RecordActionState,
} from "./action-results";
import {
  parseSocialLinkValues,
  platformLabel,
  readSocialLinkForm,
  toSocialLinkFormValues,
  type SocialLinkField,
  type SocialLinkFormValues,
} from "./social-links";
import { isUuid } from "./validation";

/**
 * Redes sociais institucionais: somente administradores. Desativar mantém o
 * registro (o rodapé mostra apenas `is_active`); excluir é permanente.
 */

export type SocialLinkSaveState =
  | { status: "idle" }
  | { status: "created"; id: string; message: string }
  | { status: "success"; message: string; values: SocialLinkFormValues; updatedAt: string }
  | FailureState<SocialLinkField>;

const ENTITY = "social-link" as const;
const FORBIDDEN = "Somente administradores podem gerenciar as redes sociais.";

function saveFailure(
  scope: string,
  error: Parameters<typeof classifyDatabaseError>[1],
  status: number,
): FailureState<SocialLinkField> {
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "duplicate-slug" && violatedConstraint(error) === "social_links_url_key") {
    return fail(reason, ENTITY, {
      message: "Este endereço já está cadastrado em outra rede social.",
      fieldErrors: { url: "Este endereço já está cadastrado. Edite o link existente em vez de criar outro." },
    });
  }
  return fail(reason, ENTITY);
}

export async function saveSocialLink(
  _state: SocialLinkSaveState,
  formData: FormData,
): Promise<SocialLinkSaveState> {
  try {
    const denied = accessFailure(await getAdminAccess(), ADMIN_ROLES, ENTITY, FORBIDDEN);
    if (denied) return denied;

    const rawId = formText(formData, "id");
    const isNew = rawId === "";
    if (!isNew && !isUuid(rawId)) return fail("not-found", ENTITY);

    const { data, errors } = parseSocialLinkValues(readSocialLinkForm(formData));
    if (Object.keys(errors).length > 0) return fail("validation", ENTITY, { fieldErrors: errors });

    const supabase = await createClient();

    if (isNew) {
      const created = await supabase.from("social_links").insert(data).select("id").single();
      if (created.error) return saveFailure("inclusão em social_links", created.error, created.status);
      refresh();
      return {
        status: "created",
        id: created.data.id,
        message: data.is_active
          ? `${platformLabel(data.platform)} cadastrado e ativo: o rodapé já mostra o link.`
          : `${platformLabel(data.platform)} cadastrado como inativo (fora do rodapé).`,
      };
    }

    const expected = formText(formData, "updated_at");
    const saved = await supabase
      .from("social_links")
      .update(data)
      .eq("id", rawId)
      .eq("updated_at", expected)
      .select(socialLinkEditColumns)
      .maybeSingle();
    if (saved.error) return saveFailure("gravação de social_links", saved.error, saved.status);
    if (!saved.data) {
      const after = await supabase.from("social_links").select("updated_at").eq("id", rawId).maybeSingle();
      if (!after.error && !after.data) return fail("not-found", ENTITY);
      if (after.data && after.data.updated_at !== expected) return fail("conflict", ENTITY);
      return fail("forbidden", ENTITY, { message: FORBIDDEN });
    }

    const row = saved.data;
    const confirmed =
      row.platform === data.platform &&
      row.label === data.label &&
      row.url === data.url &&
      row.sort_order === data.sort_order &&
      row.is_active === data.is_active;
    if (!confirmed) return fail("unexpected", ENTITY);

    refresh();
    return {
      status: "success",
      message: row.is_active
        ? "Link salvo. O rodapé já mostra a nova versão."
        : "Link salvo como inativo: não aparece no rodapé.",
      values: toSocialLinkFormValues(row),
      updatedAt: row.updated_at,
    };
  } catch (error) {
    logActionError("salvar rede social", error);
    return fail("connection", ENTITY);
  }
}

/** Ativar ou desativar pela listagem (campo `publish` = ativo). */
export async function setSocialLinkActive(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(await getAdminAccess(), ADMIN_ROLES, ENTITY, FORBIDDEN);
    if (denied) return denied;

    const id = formText(formData, "id");
    const active = formText(formData, "publish") === "true";
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const saved = await supabase
      .from("social_links")
      .update({ is_active: active })
      .eq("id", id)
      .select("id, platform, is_active")
      .maybeSingle();
    if (saved.error) return fail(classifyDatabaseError("ativação de social_links", saved.error, saved.status), ENTITY);
    if (!saved.data) {
      const after = await supabase.from("social_links").select("id").eq("id", id).maybeSingle();
      return !after.error && !after.data ? fail("not-found", ENTITY) : fail("forbidden", ENTITY, { message: FORBIDDEN });
    }
    if (saved.data.is_active !== active) return fail("unexpected", ENTITY);

    refresh();
    const name = platformLabel(saved.data.platform);
    return {
      status: "success",
      message: active
        ? `${name} foi ativado e já aparece no rodapé.`
        : `${name} foi desativado: saiu do rodapé e pode ser reativado quando quiser.`,
    };
  } catch (error) {
    logActionError("ativar rede social", error);
    return fail("connection", ENTITY);
  }
}

export async function deleteSocialLink(
  _state: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  try {
    const denied = accessFailure(await getAdminAccess(), ADMIN_ROLES, ENTITY, FORBIDDEN);
    if (denied) return denied;

    const id = formText(formData, "id");
    if (!isUuid(id)) return fail("not-found", ENTITY);

    const supabase = await createClient();
    const removed = await supabase.from("social_links").delete().eq("id", id).select("platform");
    if (removed.error) return fail(classifyDatabaseError("exclusão de social_links", removed.error, removed.status), ENTITY);
    if (removed.data.length === 0) {
      const after = await supabase.from("social_links").select("id").eq("id", id).maybeSingle();
      return !after.error && !after.data ? fail("not-found", ENTITY) : fail("forbidden", ENTITY, { message: FORBIDDEN });
    }

    refresh();
    return {
      status: "success",
      message: `O link de ${platformLabel(removed.data[0].platform)} foi excluído permanentemente.`,
    };
  } catch (error) {
    logActionError("excluir rede social", error);
    return fail("connection", ENTITY);
  }
}
