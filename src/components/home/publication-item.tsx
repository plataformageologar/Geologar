import { ArrowUpRight } from "lucide-react";

import type { PublicationSummary } from "@/types/content";

/** Item textual de publicação: prioriza a leitura do título. */
export function PublicationItem({ publication }: { publication: PublicationSummary }) {
  const { title, authors, publication_venue, publication_year, doi, external_url } =
    publication;
  const doiUrl = doi ? `https://doi.org/${doi}` : null;
  const readUrl = external_url ?? doiUrl;
  const meta = [publication_venue, publication_year].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-2 py-7">
      {meta && <p className="text-label text-earth">{meta}</p>}
      <h3 className="text-h4 font-display">{title}</h3>
      <p className="text-body-sm text-muted-foreground">{authors}</p>
      {(readUrl || doiUrl) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1">
          {readUrl && (
            <a
              href={readUrl}
              className="inline-flex min-h-11 items-center gap-1 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Ler publicação
              <span className="sr-only">: {title}</span>
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          )}
          {doi && doiUrl && (
            <a
              href={doiUrl}
              className="inline-flex min-h-11 items-center text-body-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              DOI: {doi}
            </a>
          )}
        </div>
      )}
    </article>
  );
}
