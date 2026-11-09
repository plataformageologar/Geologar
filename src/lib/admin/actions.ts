"use server";

import type { PostgrestError } from "@supabase/supabase-js";

import { getAdminAccess, type AdminRole } from "@/lib/auth/access";
import { homepageEditColumns } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";

import {
  homepageFields,
  parseHomepageValues,
  toFormValues,
  type HomepageFieldErrors,
  type HomepageFormValues,
  type HomepageRecord,
} from "./homepage";

/**
 * Server Actions do CMS. Cada action é um ponto de entrada público (POST):
 * verifica sessão e vínculo a cada chamada e grava com a sessão do próprio
 * usuário, sujeita às policies RLS. A chave secreta não é usada.
 * Os logs registram apenas códigos de erro, nunca o conteúdo enviado.
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
  | { status: "success"; message: string; values: HomepageFormValues; updatedAt: string }
  | { status: "error"; reason: SaveFailure; message: string; fieldErrors?: HomepageFieldErrors };

/** Papéis que podem editar a homepage (o banco aplica a mesma regra via RLS). */
const HOMEPAGE_EDITOR_ROLES: readonly AdminRole[] = ["admin", "editor"];

const messages: Record<SaveFailure, string> = {
  validation: "Revise os campos destacados antes de salvar.",
  session:
    "Sua sessão expirou. Entre novamente em outra aba e depois salve de novo: o texto digitado continua neste formulário.",
  forbidden: "Sua conta não tem permissão para editar a homepage.",
  conflict:
    "A homepage foi alterada por outra pessoa enquanto você editava. Copie o que deseja manter e recarregue a página para revisar a versão atual.",
  "not-found":
    "O registro da homepage não foi encontrado no banco de dados. Nada foi salvo; contate a equipe técnica.",
  connection:
    "Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente; nada foi perdido.",
  unexpected: "Não foi possível salvar as alterações. Tente novamente em instantes.",
};

function fail(reason: SaveFailure, fieldErrors?: HomepageFieldErrors): HomepageSaveState {
  return { status: "error", reason, message: messages[reason], fieldErrors };
}

function databaseFailure(scope: string, error: PostgrestError, status: number): HomepageSaveState {
  console.error(`[cms] Falha na ${scope} de homepage_content:`, error.code || status);
  if (status === 0 || !error.code) return fail("connection");
  if (status === 401 || error.code.startsWith("PGRST3")) return fail("session");
  if (error.code === "42501") return fail("forbidden");
  return fail("unexpected");
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

    const supabase = await createClient();

    // 2. Registro único: o id vem do banco, não do formulário.
    const current = await supabase
      .from("homepage_content")
      .select("id, updated_at, hero_image_path")
      .maybeSingle();
    if (current.error) return databaseFailure("leitura", current.error, current.status);
    if (!current.data) return fail("not-found");

    // 3. Validação definitiva no servidor.
    const values = Object.fromEntries(
      homepageFields.map((field) => [field, readText(formData, field)]),
    ) as HomepageFormValues;
    const { data: patch, errors } = parseHomepageValues(values, {
      hasImage: current.data.hero_image_path !== null,
    });
    if (Object.keys(errors).length > 0) return fail("validation", errors);

    // 4. Edição simultânea: a versão carregada no formulário precisa ser a atual.
    if (readText(formData, "updated_at") !== current.data.updated_at) return fail("conflict");

    // 5. UPDATE apenas dos campos editoriais, filtrado por id e versão.
    const saved = await supabase
      .from("homepage_content")
      .update(patch)
      .eq("id", current.data.id)
      .eq("updated_at", current.data.updated_at)
      .select(homepageEditColumns)
      .maybeSingle<HomepageRecord & { updated_at: string }>();
    if (saved.error) return databaseFailure("gravação", saved.error, saved.status);

    if (!saved.data) {
      // Nenhuma linha alterada: outra gravação no intervalo ou recusa do RLS
      // (vínculo desativado entre a verificação e o UPDATE).
      const after = await supabase.from("homepage_content").select("updated_at").maybeSingle();
      if (after.data && after.data.updated_at !== current.data.updated_at) return fail("conflict");
      console.warn("[cms] UPDATE de homepage_content não alterou nenhuma linha (RLS).");
      return fail("forbidden");
    }

    // 6. Confirmação: o banco devolveu exatamente os valores enviados.
    const row = saved.data;
    const confirmed = (Object.keys(patch) as (keyof HomepageRecord)[]).every(
      (field) => row[field] === patch[field],
    );
    if (!confirmed) {
      console.error("[cms] Valores devolvidos pelo banco diferem dos enviados.");
      return fail("unexpected");
    }

    const { updated_at, ...record } = row;
    return {
      status: "success",
      message: "Alterações salvas com sucesso.",
      values: toFormValues(record),
      updatedAt: updated_at,
    };
  } catch (error) {
    console.error("[cms] Erro ao salvar a homepage:", error instanceof Error ? error.name : "desconhecido");
    return fail("connection");
  }
}
