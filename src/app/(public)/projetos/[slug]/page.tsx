import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { projectStatusLabels, ProjectCard } from "@/components/projects/project-card";
import { PublicationItem } from "@/components/publications/publication-item";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { RichText } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { getProjectBySlug } from "@/lib/queries/projects";
import { formatPeriod, safeExternalUrl } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/projetos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.short_description ?? undefined,
  };
}

export default async function ProjectPage({ params }: PageProps<"/projetos/[slug]">) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const status = projectStatusLabels[project.project_status];
  const period = formatPeriod(project.start_date, project.end_date);
  const externalUrl = safeExternalUrl(project.external_url);

  // Ficha técnica: só os campos preenchidos (nenhum valor é presumido).
  const facts = [
    period && { label: "Período", value: period },
    project.coordination && { label: "Coordenação", value: project.coordination },
    project.funding && { label: "Financiamento", value: project.funding },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
  const hasAside = facts.length > 0 || project.researchLines.length > 0 || externalUrl;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/" },
          { label: "Projetos", href: "/projetos" },
          { label: project.title },
        ]}
        eyebrow="Projeto"
        title={project.title}
        description={project.short_description}
      >
        {status && (
          <Badge tone={status.tone} withDot>
            {status.label}
          </Badge>
        )}
      </PageHeader>

      <Container className="grid gap-12 py-12 md:py-16 lg:grid-cols-12 lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
          {project.image_path && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface-muted">
              <Image
                src={project.image_path}
                alt={project.image_alt ?? ""}
                fill
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {project.description && (
            <section aria-labelledby="sobre-title" className="flex flex-col gap-5">
              <h2 id="sobre-title" className="text-h3">
                Sobre o projeto
              </h2>
              <RichText text={project.description} />
            </section>
          )}

          {project.result_or_contribution && (
            <section
              aria-labelledby="resultado-title"
              className="flex flex-col gap-3 border-l-2 border-earth/60 pl-5"
            >
              <h2
                id="resultado-title"
                className="font-sans text-label uppercase tracking-[0.08em] text-earth"
              >
                Resultado ou contribuição
              </h2>
              <RichText text={project.result_or_contribution} className="text-body" />
            </section>
          )}
        </div>

        {hasAside && (
          <aside aria-label="Informações do projeto" className="lg:col-span-4">
            <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
              {facts.length > 0 && (
                <dl className="flex flex-col gap-5">
                  {facts.map((fact) => (
                    <div key={fact.label} className="flex flex-col gap-1">
                      <dt className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {fact.label}
                      </dt>
                      <dd className="text-body-sm break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {project.researchLines.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="font-sans text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {project.researchLines.length > 1 ? "Linhas de pesquisa" : "Linha de pesquisa"}
                  </h2>
                  <ul className="flex flex-col">
                    {project.researchLines.map((line) => (
                      <li key={line.slug}>
                        <Link
                          href={`/pesquisa/${line.slug}`}
                          className="inline-flex min-h-10 items-center text-body-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                        >
                          {line.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {externalUrl && (
                <TextLink href={externalUrl}>
                  Página externa do projeto
                </TextLink>
              )}
            </div>
          </aside>
        )}
      </Container>

      {project.publications.length > 0 && (
        <section aria-labelledby="publicacoes-title" className="section-y bg-surface">
          <Container>
            <SectionHeading
              id="publicacoes-title"
              eyebrow="Publicações"
              title="Publicações do projeto"
            />
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {project.publications.map((publication) => (
                <li key={publication.slug}>
                  <PublicationItem
                    publication={{
                      ...publication,
                      // Outros projetos ligados à publicação (o atual é esta página).
                      projects: publication.projects.filter((other) => other.slug !== project.slug),
                    }}
                  />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {project.relatedProjects.length > 0 && (
        <section aria-labelledby="relacionados-title" className="section-y bg-surface-muted">
          <Container>
            <SectionHeading
              id="relacionados-title"
              eyebrow="Projetos"
              title="Projetos relacionados"
              action={<TextLink href="/projetos">Ver todos os projetos</TextLink>}
            />
            <ul className="mt-10 grid gap-6 lg:grid-cols-3">
              {project.relatedProjects.map((related) => (
                <li key={related.slug}>
                  <ProjectCard project={related} href={`/projetos/${related.slug}`} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
