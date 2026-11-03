"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { resolveAdminAccess } from "./access";
import { resolveAuthOrigin, safeAdminPath } from "./redirect";

/**
 * Server Actions de autenticação. O Next.js só as executa em POST com
 * `Origin` igual ao host da aplicação (proteção contra CSRF). Senhas, tokens
 * e cookies nunca são registrados: os logs têm apenas o código do erro.
 */

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Devolve o e-mail digitado para não apagar o campo após um erro. */
  email?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const CONNECTION_ERROR =
  "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.";

function isConnectionError(error: AuthError) {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

function isRateLimited(error: AuthError) {
  return error.status === 429 || error.code === "over_request_rate_limit";
}

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const email = readText(formData, "email").trim().toLowerCase();
  const password = readText(formData, "password");
  const next = safeAdminPath(readText(formData, "next"));

  if (!EMAIL.test(email) || !password) {
    return { status: "error", message: "Informe um e-mail válido e a senha.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.warn("[auth] Login recusado:", error.code ?? error.status);
    if (isConnectionError(error)) return { status: "error", message: CONNECTION_ERROR, email };
    if (isRateLimited(error)) {
      return {
        status: "error",
        message: "Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.",
        email,
      };
    }
    // Mensagem única para credenciais inválidas, conta inexistente ou não
    // confirmada: não revela se a conta existe.
    return { status: "error", message: "E-mail ou senha incorretos.", email };
  }

  // Autenticado não significa autorizado: o vínculo é verificado agora e
  // novamente em cada página da área protegida.
  const access = await resolveAdminAccess(supabase);
  redirect(access.status === "authorized" ? next : "/admin/acesso-negado");
}

export async function signOut() {
  const supabase = await createClient();
  // Encerra a sessão no Supabase e remove os cookies desta sessão.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login?saida=1");
}

export async function requestPasswordReset(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = readText(formData, "email").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return { status: "error", message: "Informe um e-mail válido.", email };
  }

  const origin = resolveAuthOrigin((await headers()).get("origin"));
  const supabase = await createClient();
  // Fluxo PKCE: o link do e-mail volta para /auth/callback, que troca o
  // código pela sessão de recuperação (o verificador fica em cookie).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin/nova-senha`,
  });

  if (error) {
    console.warn("[auth] Recuperação de senha não enviada:", error.code ?? error.status);
    if (isConnectionError(error)) return { status: "error", message: CONNECTION_ERROR, email };
    if (isRateLimited(error)) {
      return {
        status: "error",
        message: "Muitas solicitações em sequência. Aguarde alguns minutos e tente novamente.",
        email,
      };
    }
  }

  // Resposta neutra: não informa se o e-mail está cadastrado.
  return {
    status: "success",
    message:
      "Se houver uma conta associada a este e-mail, você receberá as instruções para definir uma nova senha.",
  };
}

export async function updatePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmation");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (password !== confirmation) {
    return { status: "error", message: "A confirmação não corresponde à nova senha." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return {
      status: "error",
      message: "O link de recuperação expirou. Solicite um novo link para redefinir a senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.warn("[auth] Senha não atualizada:", error.code ?? error.status);
    if (isConnectionError(error)) return { status: "error", message: CONNECTION_ERROR };
    if (error.code === "same_password") {
      return { status: "error", message: "A nova senha deve ser diferente da atual." };
    }
    if (error.code === "weak_password") {
      return {
        status: "error",
        message: "Escolha uma senha mais forte, combinando letras, números e símbolos.",
      };
    }
    if (error.code === "reauthentication_needed") {
      return {
        status: "error",
        message: "Por segurança, solicite um link de recuperação para alterar a senha.",
      };
    }
    return { status: "error", message: "Não foi possível atualizar a senha. Tente novamente." };
  }

  // Encerra a sessão de recuperação: o próximo acesso usa a nova senha.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login?senha=redefinida");
}
