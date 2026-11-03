import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { PublicationSummary } from "@/types/content";

import { PublicationItem } from "./publication-item";

type RecentPublicationsProps = {
  publications: PublicationSummary[];
};

export function RecentPublications({ publications }: RecentPublicationsProps) {
  if (publications.length === 0) return null;

  return (
    <section
      id="publicacoes"
      aria-labelledby="publicacoes-title"
      className="section-y bg-surface"
    >
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading
            id="publicacoes-title"
            eyebrow="Publicações"
            title="Conhecimento publicado"
            className="lg:sticky lg:top-[calc(var(--header-height)+2.5rem)]"
          />
        </div>

        <div className="lg:col-span-8">
          <ul className="divide-y divide-border border-y border-border">
            {publications.slice(0, 5).map((publication) => (
              <li key={publication.slug}>
                <PublicationItem publication={publication} />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
