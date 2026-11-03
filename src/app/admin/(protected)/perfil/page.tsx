import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { adminRoleLabels, requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meu perfil",
};

/** Dados da própria conta (somente leitura; papéis não são editáveis aqui). */
export default async function ProfilePage() {
  const access = await requireAdminAccess();
  const initial = (access.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-h1">Meu perfil</h1>

      <section aria-labelledby="conta-title" className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-h3 text-primary"
          >
            {initial}
          </span>
          <h2 id="conta-title" className="min-w-0 break-all text-h4 font-sans">
            {access.email ?? "Conta sem e-mail"}
          </h2>
        </div>

        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Papel administrativo
            </dt>
            <dd>
              <Badge tone={access.role === "admin" ? "blue" : "green"}>{adminRoleLabels[access.role]}</Badge>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Situação da autorização
            </dt>
            <dd>
              <Badge tone="green" withDot>
                Ativa
              </Badge>
            </dd>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Identificador da conta
            </dt>
            <dd className="break-all font-mono text-body-sm">{access.userId}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="seguranca-title" className="flex flex-col gap-3">
        <h2 id="seguranca-title" className="text-h4 font-sans">
          Segurança
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Papéis e permissões são definidos pela equipe técnica responsável. Para trocar a senha,
          defina uma nova senha abaixo; ao concluir, será necessário entrar novamente.
        </p>
        <Link
          href="/admin/nova-senha"
          className="inline-flex min-h-11 w-fit items-center rounded-full border border-primary px-5 text-label text-primary transition-colors hover:bg-primary-soft"
        >
          Definir nova senha
        </Link>
      </section>
    </div>
  );
}
