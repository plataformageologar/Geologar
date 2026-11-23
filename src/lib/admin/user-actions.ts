"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { ACCESS_DENIED_PATH, getAdminAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

import { callEditorFunction } from "./editor-function";
import {
  errorField,
  errorMessage,
  normalizeEmail,
  passwordMessage,
  passwordProblem,
  type UserActionState,
} from "./users";

/**
 * Server Actions de "Usuários e permissões" (Etapa 10.5). Cada envio confere
 * sessão e papel no banco; a operação em si roda na Edge Function, que
 * repete a verificação antes de usar a API administrativa do Auth. Senhas
 * só seguem para a função: não são guardadas, registradas nem devolvidas.
 */

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function error(message: string, field?: UserActionState["field"], email?: string): UserActionState {
  return { status: "error", message, field, email };
}

async function requireAdmin(): Promise<UserActionState | null> {
  const access = await getAdminAccess();
  if (access.status === "anonymous") {
    return error("Sua sessão expirou. Entre novamente para continuar.");
  }
  if (access.status !== "authorized" || access.role !== "admin") {
    return error(errorMessage("forbidden"));
  }
  return null;
}

function checkPasswords(password: string, confirmation: string, email: string | null): UserActionState | null {
  const problem = passwordProblem(password, email);
  if (problem) return error(passwordMessage(problem), "password", email ?? undefined);
  if (password !== confirmation) return error(errorMessage("password-mismatch"), "confirmation", email ?? undefined);
  return null;
}

export async function createEditorAction(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  const rawEmail = readText(formData, "email").trim();
  try {
    const denied = await requireAdmin();
    if (denied) return { ...denied, email: rawEmail };

    const email = normalizeEmail(rawEmail);
    if (!email) return error(errorMessage("invalid-email"), "email", rawEmail);
    const password = readText(formData, "password");
    const invalid = checkPasswords(password, readText(formData, "confirmation"), email);
    if (invalid) return invalid;

    const result = await callEditorFunction({
      operation: "create-editor",
      email,
      password,
      confirmation: readText(formData, "confirmation"),
    });
    if (!result.ok) {
      const problem = "problem" in result ? result.problem : undefined;
      return error(errorMessage(result.code, problem), result.code === "connection" ? undefined : errorField(result.code), email);
    }
    refresh();
    return { status: "success", email };
  } catch (failure) {
    console.error("[editors] Erro ao criar Editor:", failure instanceof Error ? failure.name : "unknown");
    return error(errorMessage("connection"), undefined, rawEmail);
  }
}

export async function setEditorActiveAction(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const intent = readText(formData, "intent");
    if (intent !== "deactivate" && intent !== "reactivate") return error(errorMessage("bad-request"));

    const result = await callEditorFunction({
      operation: intent === "deactivate" ? "deactivate-editor" : "reactivate-editor",
      userId: readText(formData, "userId"),
    });
    if (!result.ok) return error(errorMessage(result.code));
    refresh();
    return {
      status: "success",
      message: intent === "deactivate" ? "O acesso foi desativado." : "O acesso foi reativado.",
    };
  } catch (failure) {
    console.error("[editors] Erro ao alterar situação:", failure instanceof Error ? failure.name : "unknown");
    return error(errorMessage("connection"));
  }
}

export async function resetEditorPasswordAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const password = readText(formData, "password");
    const confirmation = readText(formData, "confirmation");
    const invalid = checkPasswords(password, confirmation, normalizeEmail(readText(formData, "email")));
    if (invalid) return { ...invalid, email: undefined };

    const result = await callEditorFunction({
      operation: "reset-editor-password",
      userId: readText(formData, "userId"),
      password,
      confirmation,
    });
    if (!result.ok) {
      const problem = "problem" in result ? result.problem : undefined;
      return error(errorMessage(result.code, problem), result.code === "connection" ? undefined : errorField(result.code));
    }
    refresh();
    return { status: "success", message: "A nova senha inicial foi definida." };
  } catch (failure) {
    console.error("[editors] Erro ao redefinir senha:", failure instanceof Error ? failure.name : "unknown");
    return error(errorMessage("connection"));
  }
}

/**
 * Troca obrigatória da senha inicial. A função altera a senha no Auth (o que
 * encerra as sessões da conta) e só então libera o vínculo; em seguida a
 * conta entra de novo com a nova senha para continuar no painel.
 */
export async function completeInitialPasswordAction(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/admin/login");
  if (access.status === "authorized") redirect("/admin");
  if (access.reason !== "password-change") redirect(ACCESS_DENIED_PATH);

  const password = readText(formData, "password");
  const invalid = checkPasswords(password, readText(formData, "confirmation"), access.email);
  if (invalid) return { ...invalid, email: undefined };

  const result = await callEditorFunction({
    operation: "complete-initial-password",
    password,
    confirmation: readText(formData, "confirmation"),
  });

  const passwordChanged = result.ok || ("passwordChanged" in result && result.passwordChanged === true);
  if (passwordChanged && access.email) {
    // Renova a sessão com a nova senha (a anterior foi encerrada pelo Auth).
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: access.email, password });
    if (signInError) console.warn("[auth] Nova sessão não criada após a troca:", signInError.code ?? signInError.status);
  }

  if (!result.ok) {
    const problem = "problem" in result ? result.problem : undefined;
    return error(errorMessage(result.code, problem), result.code === "connection" ? undefined : errorField(result.code));
  }
  redirect("/admin");
}
