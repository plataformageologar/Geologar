"use server";

import { refresh } from "next/cache";

import { getAdminAccess, type AdminRole } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

import type { RecordFailure } from "./action-results";
import { DRAFT_SAVED_MESSAGE, parseDocumentToken, saveDraftParts } from "./editorial";
import {
  homepageFields,
  toFormValues,
  type HomepageFieldErrors,
  type HomepageFormValues,
} from "./homepage";

/**
 * Homepage no CMS (Etapa 9.6): o formulário grava RASCUNHO da unidade
 * "Página inicial" pelo mesmo núcleo do fluxo editorial. Verifica sessão e
 * vínculo a cada chamada e grava com a sessão do próprio usuário (RLS). A
 * publicação é uma ação separada. Os logs registram apenas códigos de erro.
 */

export type SaveFailure =
  | "validation"
  | "session"
  | "forbidden"
  | "conflict"
  | "not-found"
  | "connection"
  | "unexpected";

export type HomepageSaveState =
  | { status: "idle" }
  | { status: "success"; message: string; values: HomepageFormValues; version: number }
  | { status: "error"; reason: SaveFailure; message: string; fieldErrors?: HomepageFieldErrors };

/** Papéis que podem editar a homepage (o banco aplica a mesma regra via RLS). */
const HOMEPAGE_EDITOR_ROLES: readonly AdminRole[] = ["admin", "editor"];

const messages: Record<SaveFailure, string> = {
  validation: "Revise os campos destacados antes de salvar.",
  session:
    "Sua sessão expirou. Entre novamente em outra aba e depois salve de novo: o texto digitado continua neste formulário.",
  forbidden: "Sua conta não tem permissão para editar a homepage.",
  conflict:
    "A homepage foi alterada por outra pessoa (ou em outra aba) enquanto você editava. Copie o que deseja manter e recarregue a página para revisar a versão atual.",
  "not-found":
    "O registro da homepage não foi encontrado no banco de dados. Nada foi salvo; contate a equipe técnica.",
  connection:
    "Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente; nada foi perdido.",
  unexpected: "Não foi possível salvar o rascunho. Tente novamente em instantes.",
};

function fail(reason: SaveFailure, fieldErrors?: HomepageFieldErrors, message?: string): HomepageSaveState {
  return { status: "error", reason, message: message ?? messages[reason], fieldErrors };
}

function toSaveFailure(reason: RecordFailure): SaveFailure {
  switch (reason) {
    case "validation":
    case "media-missing":
      return "validation";
    case "session":
    case "forbidden":
    case "conflict":
    case "not-found":
    case "connection":
      return reason;
    default:
      return "unexpected";
  }
}

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export async function saveHomepage(
  _state: HomepageSaveState,
  formData: FormData,
): Promise<HomepageSaveState> {
  try {
    // 1. Identidade e vínculo, consultados a cada envio (nunca o papel do navegador).
    const access = await getAdminAccess();
    if (access.status === "anonymous") return fail("session");
    if (access.status === "forbidden" || !HOMEPAGE_EDITOR_ROLES.includes(access.role)) {
      return fail("forbidden");
    }

    // 2. Unidade e versão carregadas no formulário (conflito de edição).
    const token = parseDocumentToken(formData.get("document"));
    if (!token) return fail("conflict");

    // 3. Validação definitiva no servidor e gravação do rascunho (uma transação).
    const values = Object.fromEntries(
      homepageFields.map((field) => [field, readText(formData, field)]),
    ) as HomepageFormValues;
    const supabase = await createClient();
    const outcome = await saveDraftParts(supabase, access.role === "admin", [
      { ...token, parts: { homepage: values } },
    ]);
    if (outcome.status === "error") {
      const fieldErrors = outcome.partErrors?.[`${token.documentId}:homepage`]?.fieldErrors;
      return fail(toSaveFailure(outcome.reason), fieldErrors, outcome.message);
    }

    const saved = outcome.documents[0];
    if (!saved.content.homepage) return fail("unexpected");
    refresh();
    return {
      status: "success",
      message: DRAFT_SAVED_MESSAGE,
      values: toFormValues(saved.content.homepage),
      version: saved.version,
    };
  } catch (error) {
    console.error("[cms] Erro ao salvar a homepage:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection");
  }
}
