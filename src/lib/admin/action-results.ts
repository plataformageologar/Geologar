import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Resultados das Server Actions de linhas de pesquisa e projetos. Mensagens
 * em português e sem detalhes internos; os logs do servidor registram apenas
 * o código do erro, nunca o conteúdo enviado.
 */

export type RecordFailure =
  | "validation"
  | "session"
  | "forbidden"
  | "conflict"
  | "not-found"
  | "duplicate-slug"
  | "published"
  | "has-dependencies"
  | "connection"
  | "unexpected";

export type FailureState<Field extends string = string> = {
  status: "error";
  reason: RecordFailure;
  message: string;
  fieldErrors?: Partial<Record<Field, string>>;
};

/** Resultado de ações curtas da listagem (publicar, despublicar, excluir). */
export type RecordActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | FailureState;

export type Entity = "research-line" | "project";

const nouns: Record<Entity, { the: string; a: string; notFound: string }> = {
  "research-line": {
    the: "a linha de pesquisa",
    a: "uma linha de pesquisa",
    notFound: "Não encontramos a linha de pesquisa: ela pode ter sido excluída. Volte à listagem.",
  },
  project: {
    the: "o projeto",
    a: "um projeto",
    notFound: "Não encontramos o projeto: ele pode ter sido excluído. Volte à listagem.",
  },
};

export function failureMessage(reason: RecordFailure, entity: Entity): string {
  const noun = nouns[entity];
  switch (reason) {
    case "validation":
      return "Revise os campos destacados antes de salvar.";
    case "session":
      return "Sua sessão expirou. Entre novamente em outra aba e depois tente de novo: o texto digitado continua neste formulário.";
    case "forbidden":
      return "Sua conta não tem permissão para esta operação.";
    case "conflict":
      return `Outra pessoa alterou ${noun.the} enquanto você editava. Copie o que deseja manter e recarregue a página para revisar a versão atual.`;
    case "not-found":
      return noun.notFound;
    case "duplicate-slug":
      return `Já existe ${noun.a} com este slug. Escolha outro endereço.`;
    case "published":
      return "Conteúdos publicados não podem ser excluídos. Despublique antes de excluir.";
    case "has-dependencies":
      return "Este registro tem vínculos e não pode ser excluído.";
    case "connection":
      return "Não foi possível conectar ao banco de dados. Verifique sua conexão e tente novamente; nada foi perdido.";
    case "unexpected":
      return "Não foi possível concluir a operação. Tente novamente em instantes.";
  }
}

export function fail<Field extends string>(
  reason: RecordFailure,
  entity: Entity,
  options: { fieldErrors?: Partial<Record<Field, string>>; message?: string } = {},
): FailureState<Field> {
  return {
    status: "error",
    reason,
    message: options.message ?? failureMessage(reason, entity),
    fieldErrors: options.fieldErrors,
  };
}

/**
 * Traduz um erro do PostgREST/PostgreSQL em motivo de falha.
 * 23505 = unicidade (slug); 23503 = FK (vínculos); GL404/GL409 = erros
 * próprios de save_project; 42501 = privilégio/RLS.
 */
export function classifyDatabaseError(
  scope: string,
  error: PostgrestError,
  status: number,
): RecordFailure {
  console.error(`[cms] Falha em ${scope}:`, error.code || status);
  if (status === 0 || !error.code) return "connection";
  if (status === 401 || error.code.startsWith("PGRST3")) return "session";
  switch (error.code) {
    case "42501":
      return "forbidden";
    case "23505":
      return "duplicate-slug";
    case "23503":
      return "has-dependencies";
    case "GL409":
      return "conflict";
    case "GL404":
      return "not-found";
    case "23514":
    case "22023":
    case "22007":
    case "22008":
      return "validation";
    default:
      return "unexpected";
  }
}
