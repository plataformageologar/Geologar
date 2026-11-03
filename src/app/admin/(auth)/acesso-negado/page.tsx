import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/admin/auth-card";
import { FormMessage } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import { getAdminAccess } from "@/lib/auth/access";
import { signOut } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acesso negado",
};

/** Conta autenticada sem vínculo administrativo ativo. Nenhum dado do painel é carregado. */
export default async function AccessDeniedPage() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/admin/login");
  if (access.status === "authorized") redirect("/admin");

  return (
    <AuthCard title="Acesso não autorizado">
      <div className="flex flex-col gap-5">
        <FormMessage tone="error">
          {access.reason === "inactive"
            ? "O acesso administrativo desta conta está desativado."
            : "Esta conta não tem permissão para acessar a área administrativa."}
        </FormMessage>
        <p className="text-body-sm text-muted-foreground">
          {access.email && (
            <>
              Conta conectada: <span className="font-semibold text-foreground">{access.email}</span>.{" "}
            </>
          )}
          Se você precisa de acesso, entre em contato com a equipe responsável pelo portal.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="lg" className="w-full">
            Sair desta conta
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
