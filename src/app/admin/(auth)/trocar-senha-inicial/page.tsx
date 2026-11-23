import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { InitialPasswordForm } from "@/components/admin/users/initial-password-form";
import { Button } from "@/components/ui/button";
import { ACCESS_DENIED_PATH, getAdminAccess } from "@/lib/auth/access";
import { signOut } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Defina sua senha pessoal",
};

/**
 * Troca obrigatória da senha inicial (Etapa 10.5). Só a conta com vínculo
 * ativo e troca pendente chega ao formulário; enquanto isso, o painel, as
 * Server Actions e o banco (has_cms_role) recusam qualquer operação do CMS.
 */
export default async function InitialPasswordPage() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/admin/login");
  if (access.status === "authorized") redirect("/admin");
  if (access.reason !== "password-change") redirect(ACCESS_DENIED_PATH);

  return (
    <AuthCard
      title="Defina sua senha pessoal"
      description="Você está utilizando uma senha inicial criada pelo administrador. Para proteger sua conta, escolha uma nova senha antes de continuar."
    >
      <div className="flex flex-col gap-5">
        {access.email && (
          <p className="break-all text-body-sm text-muted-foreground">
            Conta: <span className="font-semibold text-foreground">{access.email}</span>
          </p>
        )}
        <InitialPasswordForm />
        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full">
            Sair sem alterar
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
