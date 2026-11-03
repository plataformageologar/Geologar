import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/projects/project-card";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { TextLink } from "@/components/ui/text-link";
import {
  getProjectStatusCounts,
  getPublishedProjects,
  PROJECTS_PAGE_SIZE,
} from "@/lib/queries/projects";
import { cn } from "@/lib/utils/cn";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";
import type { ProjectStatus } from "@/types/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projetos",
  description: "Projetos de pesquisa desenvolvidos pela GeoLogar e seus resultados.",
};

// Valores de `?situacao=` (em português, na URL) e a situação no banco.
const statusFilters = [
  { param: undefined, status: undefined, label: "Todos" },
  { param: "em-andamento", status: "ongoing", label: "Em andamento" },
  { param: "concluidos", status: "completed", label: "Concluídos" },
] as const satisfies readonly {
  param: string | undefined;
  status: ProjectStatus | undefined;
  label: string;
}[];

export default async function ProjectsPage({ searchParams }: PageProps<"/projetos">) {
  const query = await searchParams;
  const page = parsePageParam(query.pagina);
  if (page === null) notFound();

  // Situação desconhecida na URL equivale a "Todos".
  const filter =
    statusFilters.find((item) => item.param && item.param === firstParam(query.situacao)) ??
    statusFilters[0];

  const [counts, result] = await Promise.all([
    getProjectStatusCounts(),
    getPublishedProjects({ status: filter.status, page }),
  ]);
  if (result.outOfRange) notFound();

  const totalPages = Math.ceil(result.total / PROJECTS_PAGE_SIZE);
  // O filtro só faz sentido quando há projetos nas duas situações.
  const showFilter = counts.ongoing > 0 && counts.completed > 0;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Projetos" }]}
        eyebrow="Projetos"
        title="Projetos de pesquisa"
        description="Conheça os projetos da rede, seus objetivos e resultados."
      />

      <Container className="section-y">
        {showFilter && (
          <nav aria-label="Filtrar por situação" className="mb-10">
            <ul className="flex flex-wrap gap-2">
              {statusFilters.map((item) => {
                const active = item.param === filter.param;
                const total = item.status ? counts[item.status] : counts.ongoing + counts.completed;
                return (
                  <li key={item.label}>
                    <Link
                      href={buildHref("/projetos", { situacao: item.param })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-label transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-foreground hover:border-primary/40 hover:text-primary",
                      )}
                    >
                      {item.label}
                      <span className={cn("text-caption", active ? "opacity-90" : "text-muted-foreground")}>
                        {total}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {result.items.length > 0 ? (
          <>
            <ul className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
              {result.items.map((project) => (
                <li key={project.slug}>
                  <ProjectCard
                    project={project}
                    href={`/projetos/${project.slug}`}
                    headingLevel="h2"
                  />
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefForPage={(target) =>
                buildHref("/projetos", { situacao: filter.param, pagina: target })
              }
            />
          </>
        ) : (
          <EmptyState
            title={
              filter.status
                ? "Nenhum projeto publicado nesta situação no momento."
                : "Nenhum projeto publicado no momento."
            }
          >
            <TextLink href="/pesquisa">Ver linhas de pesquisa</TextLink>
          </EmptyState>
        )}
      </Container>
    </>
  );
}
