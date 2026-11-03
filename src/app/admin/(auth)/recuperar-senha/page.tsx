import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/admin/auth-card";
import { ResetRequestForm } from "@/components/admin/password-reset-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function PasswordRecoveryPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para definir uma nova senha."
      footer={
        <Link
          href="/admin/login"
          className="inline-flex min-h-11 items-center text-body-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
        >
          Voltar ao login
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
