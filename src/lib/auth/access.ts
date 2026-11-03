import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type AdminRole = "admin" | "editor";

export const adminRoleLabels: Record<AdminRole, string> = {
  admin: "Administrador",
  editor: "Editor",
};

export type AdminAccess =
  | { status: "anonymous" }
  | {
      status: "forbidden";
      userId: string;
      email: string | null;
      reason: "no-membership" | "inactive";
    }
  | { status: "authorized"; userId: string; email: string | null; role: AdminRole };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function isAdminRole(value: string): value is AdminRole {
  return value === "admin" || value === "editor";
}

/**
 * Identidade + autorização a partir de um cliente com sessão.
 *
 * - Identidade: `getClaims()` valida o JWT do cookie (assinatura e
 *   expiração); `getSession()` não é usado como prova de identidade.
 * - Autorização: vínculo em `admin_memberships` (RLS: o usuário lê apenas o
 *   próprio registro). `user_metadata` é ignorado.
 *
 * Uma falha ao consultar o vínculo é propagada (o acesso nunca é concedido
 * por falha).
 */
export async function resolveAdminAccess(supabase: ServerClient): Promise<AdminAccess> {
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) return { status: "anonymous" };

  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select("role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    console.error("[auth] Falha ao consultar admin_memberships:", membershipError.code);
    throw new Error("Falha ao verificar a autorização administrativa");
  }

  if (!membership || !isAdminRole(membership.role)) {
    return { status: "forbidden", userId, email, reason: "no-membership" };
  }
  if (!membership.is_active) {
    return { status: "forbidden", userId, email, reason: "inactive" };
  }
  return { status: "authorized", userId, email, role: membership.role };
}

/**
 * Acesso administrativo da requisição atual, consultado no banco a cada
 * requisição (uma única vez por renderização, via `cache`). Perda de
 * permissão ou desativação vale a partir da requisição seguinte.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> =>
  resolveAdminAccess(await createClient()),
);

/**
 * Exige um vínculo administrativo ativo. Deve ser chamada em toda página e
 * Server Action da área protegida — não apenas no layout, que não é
 * renderizado novamente a cada navegação.
 */
export async function requireAdminAccess() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/admin/login");
  if (access.status === "forbidden") redirect("/admin/acesso-negado");
  return access;
}
