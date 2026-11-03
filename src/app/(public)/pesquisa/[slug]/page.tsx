import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ProjectCard } from "@/components/projects/project-card";
import { PublicationItem } from "@/components/publications/publication-item";
import { ResearchLineLinkList } from "@/components/research/research-line-link-list";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RichText } from "@/components/ui/rich-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import {
  getPublishedResearchLines,
  getResearchLineBySlug,
} from "@/lib/queries/research-lines";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/pesquisa/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const line = await getResearchLineBySlug(slug);
  if (!line) return {};

  return {
    title: line.title,
    description: line.short_description ?? undefined,
  };
}

export default async function ResearchLinePage({ params }: PageProps<"/pesquisa/[slug]">) {
  const { slug } = await params;
  const [line, allLines] = await Promise.all([
    getResearchLineBySlug(slug),
    getPublishedResearchLines(),
  ]);
  if (!line) notFound();

  const otherLines = allLines.filter((other) => other.slug !== line.slug);
  const hasContent = line.projects.length > 0 || line.publications.length > 0;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Início", href: "/" },
          { label: "Pesquisa", href: "/pesquisa" },
          { label: line.title },
        ]}
        eyebrow="Linha de pesquisa"
        title={line.title}
        description={line.short_description}
      />

      {(line.description || line.image_path) && (
        <Container className="grid gap-10 pt-12 md:pt-16 lg:grid-cols-12 lg:gap-16">
          {line.description && <RichText text={line.description} className="lg:col-span-7" />}
          {line.image_path && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-muted lg:col-span-5">
              <Image
                src={line.image_path}
                alt={line.image_alt ?? ""}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </Container>
      )}

      {!hasContent && (
        <Container className="py-12 md:py-16">
          <EmptyState title="Ainda não há projetos ou publicações associados a esta linha de pesquisa.">
            <TextLink href="/projetos">Ver todos os projetos</TextLink>
            <TextLink href="/publicacoes">Ver todas as publicações</TextLink>
          </EmptyState>
        </Container>
      )}

      {line.projects.length > 0 && (
        <section aria-labelledby="projetos-title" className="section-y">
          <Container>
            <SectionHeading id="projetos-title" eyebrow="Projetos" title="Projetos desta linha" />
            <ul className="mt-10 grid gap-6 lg:grid-cols-3">
              {line.projects.map((project) => (
                <li key={project.slug}>
                  <ProjectCard project={project} href={`/projetos/${project.slug}`} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {line.publications.length > 0 && (
        <section aria-labelledby="publicacoes-title" className="section-y bg-surface">
          <Container>
            <SectionHeading
              id="publicacoes-title"
              eyebrow="Publicações"
              title="Publicações relacionadas"
            />
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {line.publications.map((publication) => (
                <li key={publication.slug}>
                  <PublicationItem publication={publication} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {otherLines.length > 0 && (
        <section aria-labelledby="outras-linhas-title" className="section-y bg-surface-muted">
          <Container>
            <SectionHeading
              id="outras-linhas-title"
              eyebrow="Pesquisa"
              title="Outras linhas de pesquisa"
            />
            <div className="mt-10">
              <ResearchLineLinkList lines={otherLines} />
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
