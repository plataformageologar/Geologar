import { PublicationCompactItem } from "@/components/publications/publication-compact-item";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import type { PublicationSummary } from "@/types/content";

type RecentPublicationsProps = {
  publications: PublicationSummary[];
  settings?: SectionSettings;
  /** Ao lado dos projetos (sem fundo nem contêiner próprios). */
  paired?: boolean;
};

export function RecentPublications({ publications, settings = {}, paired = false }: RecentPublicationsProps) {
  const visible = publications.slice(0, settings.limit ?? 5);
  if (visible.length === 0) return null;
  const list = (
    <ul className="divide-y divide-border border-y border-border">
      {visible.map((publication) => (
        <li key={publication.slug}>
          <PublicationCompactItem publication={publication} />
        </li>
      ))}
    </ul>
  );
  const action =
    settings.cta_label && settings.cta_href ? <TextLink href={settings.cta_href}>{settings.cta_label}</TextLink> : undefined;

  if (paired) {
    return (
      <section id="publicacoes" aria-labelledby="publicacoes-title" className="min-w-0">
        <SectionHeading
          id="publicacoes-title"
          eyebrow={settings.eyebrow}
          title={settings.title ?? "Conhecimento publicado"}
          description={settings.description}
        />
        <div className="section-gap">{list}</div>
        {action && <div className="mt-4">{action}</div>}
      </section>
    );
  }

  return (
    <SectionFrame
      id="publicacoes"
      labelledBy="publicacoes-title"
      background={resolveBackground("publications", settings)}
    >
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading
            id="publicacoes-title"
            eyebrow={settings.eyebrow}
            title={settings.title ?? "Conhecimento publicado"}
            description={settings.description}
            action={action}
            className="lg:sticky lg:top-[calc(var(--header-height)+2.5rem)]"
          />
        </div>

        <div className="lg:col-span-8">{list}</div>
      </Container>
    </SectionFrame>
  );
}
