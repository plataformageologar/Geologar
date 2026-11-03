import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { normalizeDoi, safeExternalUrl } from "@/lib/utils/format";
import type { ProjectLink, PublicationSummary } from "@/types/content";

type PublicationItemProps = {
  publication: PublicationSummary & { projects?: ProjectLink[] };
  /** Nível do título conforme a hierarquia da página. */
  headingLevel?: "h2" | "h3" | "h4";
  /** Oculta o ano nos metadados (ex.: listagem já agrupada por ano). */
  hideYear?: boolean;
};

/** Item textual de publicação: prioriza a leitura do título. */
export function PublicationItem({
  publication,
  headingLevel: Heading = "h3",
  hideYear = false,
}: PublicationItemProps) {
  const { title, authors, publication_venue, publication_year, projects = [] } = publication;
  const doi = normalizeDoi(publication.doi);
  const readUrl = safeExternalUrl(publication.external_url) ?? doi?.url ?? null;
  const meta = [publication_venue, hideYear ? null : publication_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex flex-col gap-2 py-7">
      {meta && <p className="text-label text-earth">{meta}</p>}
      <Heading className="text-h4 font-display break-words">{title}</Heading>
      <p className="text-body-sm text-muted-foreground">{authors}</p>
      {projects.length > 0 && (
        <p className="text-body-sm">
          <span className="text-muted-foreground">
            {projects.length > 1 ? "Projetos relacionados: " : "Projeto relacionado: "}
          </span>
          {projects.map((project, index) => (
            <span key={project.slug}>
              {index > 0 && ", "}
              <Link
                href={`/projetos/${project.slug}`}
                className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              >
                {project.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {readUrl && (
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1">
          <a
            href={readUrl}
            className="inline-flex min-h-11 items-center gap-1 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
          >
            Ler publicação
            <span className="sr-only">: {title}</span>
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
          {doi && (
            <a
              href={doi.url}
              className="inline-flex min-h-11 items-center break-all text-body-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              DOI: {doi.doi}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
