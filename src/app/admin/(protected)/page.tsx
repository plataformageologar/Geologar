import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { adminNavigation } from "@/data/admin-navigation";
import { adminRoleLabels, requireAdminAccess } from "@/lib/auth/access";
import { getPublishedContentCounts } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visão geral",
};

const numberFormat = new Intl.NumberFormat("pt-BR");

// Módulos do CMS ainda não implementados (itens sem página na navegação).
const plannedModules = adminNavigation.flatMap((section) =>
  section.items.filter((item) => !item.href).map((item) => item.label),
);

export default async function AdminDashboardPage() {
  const access = await requireAdminAccess();
  const counts = await getPublishedContentCounts();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-h1">Bem-vindo à administração GeoLogar</h1>
        <p className="text-body-lg text-muted-foreground">
          Este ambiente será utilizado para gerenciar os conteúdos institucionais do portal. Você
          está conectado como <strong className="font-semibold text-foreground">{adminRoleLabels[access.role]}</strong>.
        </p>
      </div>

      <section aria-labelledby="conteudo-publicado-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="conteudo-publicado-title" className="text-h3">
            Conteúdo publicado
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Registros visíveis no site, contados diretamente no banco de dados. Rascunhos não
            entram nesta contagem.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {counts.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
              <p className="text-label text-muted-foreground">{item.label}</p>
              {item.total === null ? (
                <p className="text-body-sm text-muted-foreground">Contagem indisponível no momento.</p>
              ) : (
                <p className="font-display text-display leading-none text-primary">
                  {numberFormat.format(item.total)}
                  <span className="sr-only"> publicados</span>
                </p>
              )}
              <Link
                href={item.href}
                className="mt-auto inline-flex min-h-11 w-fit items-center gap-1 text-body-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              >
                Ver no site
                <span className="sr-only">: {item.label}</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="modulos-title" className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-6">
        <div className="flex flex-col gap-1">
          <h2 id="modulos-title" className="text-h4 font-sans">
            Próximos módulos
          </h2>
          <p className="text-body-sm text-muted-foreground">
            A edição de conteúdo será disponibilizada nas próximas etapas do portal.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {plannedModules.map((label) => (
            <li key={label} className="rounded-full bg-surface-muted px-3 py-1.5 text-caption font-semibold text-muted-foreground">
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
