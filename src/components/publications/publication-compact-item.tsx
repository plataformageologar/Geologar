import { ArrowUpRight, FileText } from "lucide-react";

import { normalizeDoi, safeExternalUrl } from "@/lib/utils/format";
import type { PublicationSummary } from "@/types/content";

/**
 * Item compacto de publicação para a página inicial (Etapa 10.7): ícone de
 * documento, título, periódico e ano. O botão “DOI” só aparece quando o DOI
 * cadastrado é válido (10.xxxx/…); sem DOI, um link externo válido vira
 * “Acessar”. Nenhuma referência é completada ou inventada.
 */
export function PublicationCompactItem({
  publication,
  headingLevel: Heading = "h3",
}: {
  publication: PublicationSummary;
  headingLevel?: "h3" | "h4";
}) {
  const doi = normalizeDoi(publication.doi);
  const external = doi ? null : safeExternalUrl(publication.external_url);
  const meta = [publication.publication_venue, publication.publication_year].filter(Boolean).join(" · ");

  return (
    <article className="flex items-start gap-4 py-4">
      <span aria-hidden="true" className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-earth-soft text-earth">
        <FileText className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Heading className="font-sans text-body font-semibold leading-snug break-words">{publication.title}</Heading>
        {meta && <p className="text-body-sm text-muted-foreground">{meta}</p>}
      </div>
      {(doi || external) && (
        <a
          href={doi?.url ?? external ?? undefined}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-[var(--button-radius)] border border-primary/40 px-3 text-caption font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {doi ? "DOI" : "Acessar"}
          <span className="sr-only">: {publication.title}</span>
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      )}
    </article>
  );
}
