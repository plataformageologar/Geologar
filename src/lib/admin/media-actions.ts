"use server";

import { getAdminAccess } from "@/lib/auth/access";
import {
  MEDIA_BUCKET,
  MEDIA_MAX_BYTES,
  MEDIA_MAX_DIMENSION,
  MEDIA_TYPES,
  isMediaMimeType,
  isMediaObjectName,
} from "@/lib/media/config";
import { getMediaLibrary, getMediaUsage, type MediaItem, type MediaUsage } from "@/lib/queries/admin-media";
import { createClient } from "@/lib/supabase/server";

import { accessFailure, ADMIN_ROLES, EDITOR_ROLES, fail, logActionError, type FailureState } from "./action-results";

/**
 * Server Actions da biblioteca de mídia. O arquivo nunca passa pelo Worker:
 * o servidor confere sessão e papel, gera o nome do objeto e pede ao Storage
 * uma URL de envio assinada com a sessão do usuário (a policy de INSERT do
 * bucket é verificada nesse momento); o navegador envia o arquivo direto ao
 * Storage, que aplica de novo o limite de tamanho e os tipos do bucket.
 */

const ENTITY = "media" as const;
const UPLOAD_FORBIDDEN = "Sua conta não tem permissão para enviar imagens.";
const DELETE_FORBIDDEN = "Somente administradores excluem arquivos da biblioteca.";

export type MediaListState =
  | { status: "ready"; items: MediaItem[]; total: number }
  | FailureState;

export async function listMedia(filters: {
  search?: string;
  unusedOnly?: boolean;
  page?: number;
}): Promise<MediaListState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0 ? (filters.page as number) : 1;
    const search = (filters.search ?? "").trim().slice(0, 100);
    const result = await getMediaLibrary({ search, unusedOnly: filters.unusedOnly === true, page });
    if (result.status === "error") return fail("unexpected", ENTITY, { message: "Não foi possível carregar a biblioteca. Tente novamente." });
    return { status: "ready", ...result.data };
  } catch (error) {
    logActionError("listar mídia", error);
    return fail("connection", ENTITY);
  }
}

export type PrepareUploadState =
  | { status: "ready"; path: string; token: string }
  | FailureState;

/** Dados declarados pelo navegador, conferidos de novo aqui (sem confiar neles). */
export async function prepareMediaUpload(input: {
  mimeType: string;
  size: number;
  width: number;
  height: number;
}): Promise<PrepareUploadState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY, UPLOAD_FORBIDDEN);
    if (denied) return denied;

    if (!isMediaMimeType(input.mimeType)) {
      return fail("validation", ENTITY, { message: "Formato não permitido. Envie JPEG, PNG ou WebP." });
    }
    if (!Number.isInteger(input.size) || input.size <= 0 || input.size > MEDIA_MAX_BYTES) {
      return fail("validation", ENTITY, { message: "O arquivo excede o limite de 5 MB." });
    }
    const dimensionOk = (value: number) => Number.isInteger(value) && value > 0 && value <= MEDIA_MAX_DIMENSION;
    if (!dimensionOk(input.width) || !dimensionOk(input.height)) {
      return fail("validation", ENTITY, {
        message: `Dimensões inválidas: o maior lado aceito é ${MEDIA_MAX_DIMENSION} px.`,
      });
    }

    // Nome gerado no servidor: único, sem o nome original, nunca sobrescreve.
    const path = `uploads/${crypto.randomUUID()}.${MEDIA_TYPES[input.mimeType]}`;
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[cms] Falha ao preparar envio de mídia:", error?.name ?? "sem dados");
      const status = (error as { status?: number; statusCode?: string } | null)?.status;
      return status === 403 || status === 400
        ? fail("forbidden", ENTITY, { message: UPLOAD_FORBIDDEN })
        : fail("connection", ENTITY, { message: "Não foi possível preparar o envio. Tente novamente." });
    }
    return { status: "ready", path: data.path, token: data.token };
  } catch (error) {
    logActionError("preparar envio de mídia", error);
    return fail("connection", ENTITY);
  }
}

export type MediaUsageState = { status: "ready"; usage: MediaUsage[] } | FailureState;

export async function getMediaUsageAction(name: string): Promise<MediaUsageState> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    if (!isMediaObjectName(name)) return fail("not-found", ENTITY);
    const result = await getMediaUsage(name);
    if (result.status === "error") return fail("unexpected", ENTITY);
    return { status: "ready", usage: result.data };
  } catch (error) {
    logActionError("consultar uso de mídia", error);
    return fail("connection", ENTITY);
  }
}

export type DeleteMediaState =
  | { status: "success"; message: string }
  | (FailureState & { usage?: MediaUsage[] });

const MEDIA_IN_USE_MESSAGE =
  "Esta imagem está sendo utilizada por um ou mais conteúdos. Remova suas associações antes de excluí-la.";

function inUseMessage(usage: MediaUsage[]) {
  const places = usage.map((item) => item.label);
  const listed = places.slice(0, 5).join("; ") + (places.length > 5 ? `; e mais ${places.length - 5}` : "");
  return `${MEDIA_IN_USE_MESSAGE} Utilizada em: ${listed}.`;
}

/**
 * Exclusão permanente: somente admin e somente arquivos sem uso. A policy de
 * DELETE do bucket repete a verificação no banco, com trava por arquivo
 * contra uma associação simultânea.
 */
export async function deleteMedia(name: string): Promise<DeleteMediaState> {
  try {
    const denied = accessFailure(await getAdminAccess(), ADMIN_ROLES, ENTITY, DELETE_FORBIDDEN);
    if (denied) return denied;
    if (!isMediaObjectName(name)) return fail("not-found", ENTITY);

    const usage = await getMediaUsage(name);
    if (usage.status === "error") return fail("unexpected", ENTITY);
    if (usage.data.length > 0) {
      return { ...fail("has-dependencies", ENTITY, { message: inUseMessage(usage.data) }), usage: usage.data };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove([name]);
    if (error) {
      console.error("[cms] Falha ao excluir mídia:", error.name);
      return fail("connection", ENTITY, { message: "Não foi possível excluir o arquivo. Tente novamente." });
    }
    if (!data || data.length === 0) {
      // Nada removido: o arquivo passou a ser usado agora, já não existe ou o
      // banco recusou (policy).
      const after = await getMediaUsage(name);
      if (after.status === "ready" && after.data.length > 0) {
        return { ...fail("has-dependencies", ENTITY, { message: inUseMessage(after.data) }), usage: after.data };
      }
      return fail("not-found", ENTITY);
    }
    return { status: "success", message: "Arquivo excluído permanentemente da biblioteca." };
  } catch (error) {
    logActionError("excluir mídia", error);
    return fail("connection", ENTITY);
  }
}
