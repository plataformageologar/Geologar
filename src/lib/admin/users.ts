/**
 * Gerenciamento de Editores no painel (Etapa 10.5): tipos e mensagens
 * compartilhados entre servidor e navegador. As regras de e-mail e senha vêm
 * do mesmo núcleo usado pela Edge Function `admin-editor-management`.
 */
import type {
  EditorEventItem,
  EditorFilter,
  ErrorCode,
  EventType,
  PasswordProblem,
} from "../../../supabase/functions/_shared/editor-accounts";

export {
  EDITORS_PAGE_SIZE,
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  SEARCH_MAX_LENGTH,
  normalizeEmail,
  passwordProblem,
} from "../../../supabase/functions/_shared/editor-accounts";
export type {
  EditorEventItem,
  EditorFilter,
  EditorList,
  EditorListItem,
  EditorResult,
} from "../../../supabase/functions/_shared/editor-accounts";

export const EDITOR_FUNCTION = "admin-editor-management";

export type UserActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Campo com problema (foco e `aria-invalid`). */
  field?: "email" | "password" | "confirmation";
  /** E-mail digitado, devolvido para não apagar o campo depois de um erro. */
  email?: string;
};

export const idleUserState: UserActionState = { status: "idle" };

/** Filtros da listagem: valor na URL (português) → filtro da função. */
export const editorFilters: { param: string; label: string; value: EditorFilter }[] = [
  { param: "", label: "Todos", value: "all" },
  { param: "ativos", label: "Ativos", value: "active" },
  { param: "desativados", label: "Desativados", value: "inactive" },
  { param: "aguardando-troca", label: "Aguardando troca da senha inicial", value: "pending" },
];

export const PASSWORD_RULES =
  "Pelo menos 8 caracteres, combinando três destes tipos: letra minúscula, letra maiúscula, número e símbolo.";

const passwordMessages: Record<PasswordProblem, string> = {
  "too-short": "A senha deve ter pelo menos 8 caracteres.",
  "too-long": "A senha é longa demais. Use até 72 caracteres simples.",
  weak: "Use pelo menos três destes tipos: letra minúscula, letra maiúscula, número e símbolo.",
  "contains-email": "A senha não pode conter o nome do e-mail.",
};

export function passwordMessage(problem: PasswordProblem | undefined) {
  return problem ? passwordMessages[problem] : "A senha não atende aos requisitos de segurança.";
}

const GENERIC = "Não foi possível concluir a operação. Tente novamente.";

export const CONNECTION_MESSAGE =
  "Erro de conexão com o serviço de contas. Verifique sua conexão e tente novamente; nada foi alterado.";

const messages: Record<ErrorCode, string> = {
  "bad-request": GENERIC,
  unexpected: GENERIC,
  forbidden: "Somente administradores ativos gerenciam usuários.",
  "password-change-required": "Troque sua senha inicial antes de gerenciar usuários.",
  "invalid-email": "Informe um e-mail válido.",
  "password-mismatch": "A confirmação não corresponde à senha informada.",
  "weak-password": "A senha não atende aos requisitos de segurança.",
  "same-password": "A nova senha deve ser diferente da senha inicial.",
  "already-active": "Este e-mail já pertence a um Editor ativo.",
  "already-inactive": "Este Editor já existe, mas está desativado. Use “Reativar acesso” na lista de Editores.",
  "is-admin": "Este e-mail pertence a um Administrador. Contas de administradores não são alteradas por esta tela.",
  "existing-account":
    "Já existe uma conta com este e-mail que não está vinculada ao painel. Ela precisa de verificação administrativa pela equipe técnica antes de receber acesso. Nada foi alterado.",
  conflict: "Esta conta acabou de ser criada por outra solicitação. Atualize a página para ver a lista.",
  "not-found": "Editor não encontrado. Atualize a página para ver a lista atual.",
  "not-editor": "Esta conta não é de Editor e não pode ser alterada por esta tela.",
  "rate-limited": "Muitas operações em sequência. Aguarde alguns minutos e tente novamente.",
  "auth-error": "O serviço de autenticação não concluiu a operação. Tente novamente em instantes.",
  "membership-failed":
    "A conta foi criada, mas as permissões não foram configuradas e ela ainda não acessa o painel. Clique em “Criar Editor” de novo com o mesmo e-mail para concluir.",
  "finalize-failed":
    "Sua senha foi alterada, mas o acesso ainda não foi liberado. Informe a mesma nova senha e clique em “Salvar nova senha” para concluir.",
};

export function errorMessage(code: ErrorCode | "connection", problem?: PasswordProblem) {
  if (code === "connection") return CONNECTION_MESSAGE;
  if (code === "weak-password") return passwordMessage(problem);
  return messages[code];
}

export function errorField(code: ErrorCode): UserActionState["field"] {
  if (code === "invalid-email" || code === "already-active" || code === "already-inactive" || code === "is-admin" || code === "existing-account") {
    return "email";
  }
  if (code === "password-mismatch") return "confirmation";
  if (code === "weak-password" || code === "same-password") return "password";
  return undefined;
}

export const eventLabels: Record<EventType, string> = {
  editor_created: "Editor criado",
  editor_deactivated: "Editor desativado",
  editor_reactivated: "Editor reativado",
  editor_password_reset: "Senha redefinida",
  initial_password_changed: "Senha inicial alterada",
};

export function eventLabel(event: EditorEventItem) {
  const label = eventLabels[event.type];
  if (event.outcome === "success") return label;
  return event.type === "editor_created" ? "Criação falhou" : `${label} (falhou)`;
}
