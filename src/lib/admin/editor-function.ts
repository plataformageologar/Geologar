import { FunctionsHttpError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import type { EditorResult } from "./users";
import { EDITOR_FUNCTION } from "./users";

/**
 * Chamada à Edge Function `admin-editor-management` com a sessão do usuário
 * do painel (o JWT segue no cabeçalho Authorization). Usada apenas no
 * servidor (Server Actions e páginas): nenhuma chave privilegiada passa pelo
 * Worker ou pelo navegador, e senhas nunca são registradas em log.
 */
export type EditorCallResult = EditorResult | { ok: false; code: "connection" };

function isEditorResult(value: unknown): value is EditorResult {
  if (!value || typeof value !== "object") return false;
  const result = value as { ok?: unknown; code?: unknown; operation?: unknown };
  return result.ok === true ? typeof result.operation === "string" : result.ok === false && typeof result.code === "string";
}

export async function callEditorFunction(body: Record<string, unknown>): Promise<EditorCallResult> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.functions.invoke(EDITOR_FUNCTION, { body });
    if (!error) return isEditorResult(data) ? data : { ok: false, code: "unexpected" };

    // Respostas 4xx/5xx da função trazem o mesmo formato no corpo.
    if (error instanceof FunctionsHttpError) {
      const response = error.context as Response;
      if (response.status === 401) return { ok: false, code: "forbidden" };
      try {
        const payload: unknown = await response.json();
        if (isEditorResult(payload)) return payload;
      } catch {
        // corpo fora do formato
      }
      return { ok: false, code: "unexpected" };
    }
    console.error("[editors] Edge Function indisponível:", error.name);
    return { ok: false, code: "connection" };
  } catch (error) {
    console.error("[editors] Falha ao chamar a Edge Function:", error instanceof Error ? error.name : "unknown");
    return { ok: false, code: "connection" };
  }
}
