import type { PostgrestError } from "@supabase/supabase-js";

import type { AdminAccess, AdminRole } from "@/lib/auth/access";

/**
 * Resultados das Server Actions do CMS. Mensagens
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

export type Entity =
  | "research-line"
  | "project"
  | "publication"
  | "institution"
  | "institution-category"
  | "social-link"
  | "site-settings";

/** Gênero gramatical, para mensagens como "foi excluída"/"foi excluído". */
export type Gender = "f" | "m";

export const entityNouns: Record<Entity, { the: string; a: string; gender: Gender; notFound: string }> = {
  "research-line": {
    the: "a linha de pesquisa",
    a: "uma linha de pesquisa",
    gender: "f",
    notFound: "Não encontramos a linha de pesquisa: ela pode ter sido excluída. Volte à listagem.",
  },
  project: {
    the: "o projeto",
    a: "um projeto",
    gender: "m",
    notFound: "Não encontramos o projeto: ele pode ter sido excluído. Volte à listagem.",
  },
  publication: {
    the: "a publicação",
    a: "uma publicação",
    gender: "f",
    notFound: "Não encontramos a publicação: ela pode ter sido excluída. Volte à listagem.",
  },
  institution: {
    the: "a instituição",
    a: "uma instituição",
    gender: "f",
    notFound: "Não encontramos a instituição: ela pode ter sido excluída. Volte à listagem.",
  },
  "institution-category": {
    the: "a categoria",
    a: "uma categoria",
    gender: "f",
    notFound: "Não encontramos a categoria: ela pode ter sido excluída. Recarregue a página.",
  },
  "social-link": {
    the: "o link da rede social",
    a: "um link de rede social",
    gender: "m",
    notFound: "Não encontramos o link: ele pode ter sido excluído. Recarregue a página.",
  },
  "site-settings": {
    the: "as informações institucionais",
    a: "um registro de informações institucionais",
    gender: "f",
    notFound:
      "O registro de informações institucionais não foi encontrado no banco de dados. Nada foi salvo; contate a equipe técnica.",
  },
};

const nouns = entityNouns;

/** Escolhe a forma feminina ou masculina de uma palavra. */
export function byGender(entity: Entity, feminine: string, masculine: string) {
  return entityNouns[entity].gender === "f" ? feminine : masculine;
}

/**
 * Nome da constraint/índice violado (23505, 23503, 23514), lido da mensagem
 * do PostgreSQL. Usado para apontar o campo certo (slug, DOI, URL…).
 */
export function violatedConstraint(error: PostgrestError): string | null {
  return /"([a-z0-9_]+)"/.exec(`${error.message} ${error.details ?? ""}`)?.[1] ?? null;
}

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
    case "22003":
    case "22023":
    case "22007":
    case "22008":
      return "validation";
    default:
      return "unexpected";
  }
}

/** Papéis editoriais (criar, editar, publicar). */
export const EDITOR_ROLES: readonly AdminRole[] = ["admin", "editor"];
/** Operações reservadas a administradores (exclusão, configurações). */
export const ADMIN_ROLES: readonly AdminRole[] = ["admin"];

/**
 * Falha de autorização para a operação, ou `null` se permitida. A sessão e o
 * vínculo são lidos de novo a cada chamada; o papel nunca vem do navegador.
 */
export function accessFailure(
  access: AdminAccess,
  roles: readonly AdminRole[],
  entity: Entity,
  forbiddenMessage?: string,
): FailureState | null {
  if (access.status === "anonymous") return fail("session", entity);
  if (access.status === "forbidden" || !roles.includes(access.role)) {
    return fail("forbidden", entity, { message: forbiddenMessage });
  }
  return null;
}

/** Valor de texto de um FormData (campos ausentes viram `""`). */
export function formText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Erro inesperado (exceção): registra só o tipo, nunca o conteúdo. */
export function logActionError(scope: string, error: unknown) {
  console.error(`[cms] Erro ao ${scope}:`, error instanceof Error ? error.name : "desconhecido");
}
