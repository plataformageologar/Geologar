import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { NewPasswordForm } from "@/components/admin/password-reset-forms";
import { getAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova senha",
};

/**
 * Definição de nova senha. Exige sessão válida — normalmente a criada pelo
 * link de recuperação em /auth/callback (o proxy já barra quem não tem sessão).
 */
export default async function NewPasswordPage() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/admin/login");

  return (
    <AuthCard
      title="Definir nova senha"
      description={access.email ? `Conta: ${access.email}` : undefined}
    >
      <NewPasswordForm />
    </AuthCard>
  );
}
