import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FlaskConical, Layers, PanelsTopLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminNavigation } from "@/data/admin-navigation";
import { adminRoleLabels, requireAdminAccess } from "@/lib/auth/access";
import { getPublishedContentCounts } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visão geral",
};

const numberFormat = new Intl.NumberFormat("pt-BR");

// Módulos do CMS disponíveis.
const managedModules = [
  {
    href: "/admin/homepage",
    icon: PanelsTopLeft,
    title: "Homepage",
    description: "Textos institucionais e botões da página inicial.",
    action: "Editar homepage",
  },
  {
    href: "/admin/linhas-de-pesquisa",
    icon: Layers,
    title: "Linhas de pesquisa",
    description: "Cadastro, publicação, destaques e ordem das áreas de pesquisa.",
    action: "Gerenciar linhas",
  },
  {
    href: "/admin/projetos",
    icon: FlaskConical,
    title: "Projetos",
    description: "Projetos de pesquisa, situação, publicação e linhas relacionadas.",
    action: "Gerenciar projetos",
  },
];

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

      <section aria-labelledby="gerenciar-title" className="flex flex-col gap-4">
        <h2 id="gerenciar-title" className="text-h3">
          Gerenciar conteúdo
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managedModules.map((module) => (
            <li key={module.href} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
                >
                  <module.icon className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-h4 font-sans">{module.title}</h3>
                  <p className="text-body-sm text-muted-foreground">{module.description}</p>
                </div>
              </div>
              <Button href={module.href} withArrow className="mt-auto self-start">
                {module.action}
              </Button>
            </li>
          ))}
        </ul>
      </section>

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
