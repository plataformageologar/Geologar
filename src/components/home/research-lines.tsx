import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import type { ResearchLineSummary } from "@/types/content";

export function ResearchLines({
  researchLines,
}: {
  researchLines: ResearchLineSummary[];
}) {
  if (researchLines.length === 0) return null;

  return (
    <section
      id="pesquisa"
      aria-labelledby="pesquisa-title"
      className="section-y bg-surface-muted"
    >
      <Container>
        <SectionHeading
          id="pesquisa-title"
          eyebrow="Pesquisa"
          title="Nossas linhas de pesquisa"
          action={<TextLink href="/pesquisa">Ver todas as linhas</TextLink>}
        />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {researchLines.map((line, index) => (
            <li key={line.slug}>
              <ResearchLineCard
                researchLine={line}
                icon={researchLineIcon(line.slug)}
                tint={researchLineTint(index)}
                href={`/pesquisa/${line.slug}`}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
