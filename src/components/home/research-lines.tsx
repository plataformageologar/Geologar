import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { ResearchLineLinkList } from "@/components/research/research-line-link-list";
import { ResearchLinePhotoCard } from "@/components/research/research-line-photo-card";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { resolveBackground, type Columns, type SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { ResearchLineSummary } from "@/types/content";

const columnClasses: Record<Columns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/** Cards fotográficos: até 6 por fileira em telas largas, conforme a quantidade. */
const photoColumns: Record<number, string> = {
  1: "sm:grid-cols-1 lg:grid-cols-1",
  2: "sm:grid-cols-2 lg:grid-cols-2",
  3: "sm:grid-cols-3 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
};
const photoSizes: Record<number, string> = {
  1: "(min-width: 640px) 80vw, 100vw",
  2: "(min-width: 640px) 50vw, 100vw",
  3: "(min-width: 640px) 33vw, 100vw",
  4: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  5: "(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 100vw",
};

/**
 * Linhas de pesquisa: cards (homepage), cards fotográficos (`display:
 * "photos"`, Etapa 10.7) ou lista compacta de links (/rede).
 */
export function ResearchLines({
  researchLines,
  settings = {},
  variant = "cards",
}: {
  researchLines: ResearchLineSummary[];
  settings?: SectionSettings;
  variant?: "cards" | "links";
}) {
  const lines = variant === "cards" ? researchLines.slice(0, settings.limit ?? 6) : researchLines;
  if (lines.length === 0) return null;

  return (
    <SectionFrame id="pesquisa" labelledBy="pesquisa-title" background={resolveBackground("research", settings)}>
      <Container>
        <SectionHeading
          id="pesquisa-title"
          eyebrow={settings.eyebrow}
          title={settings.title ?? (variant === "cards" ? "Nossas linhas de pesquisa" : "Linhas de pesquisa")}
          description={settings.description}
          action={settings.cta_label && settings.cta_href ? <TextLink href={settings.cta_href}>{settings.cta_label}</TextLink> : undefined}
        />
        {variant === "links" ? (
          <div className="section-gap">
            <ResearchLineLinkList lines={lines} />
          </div>
        ) : settings.display === "photos" ? (
          <ul
            className={cn(
              "section-gap grid grid-cols-2 gap-3 md:gap-4",
              photoColumns[lines.length] ?? "sm:grid-cols-3 xl:grid-cols-6",
            )}
          >
            {lines.map((line) => (
              <li key={line.slug}>
                <ResearchLinePhotoCard
                  researchLine={line}
                  href={`/pesquisa/${line.slug}`}
                  sizes={photoSizes[lines.length] ?? "(min-width: 1280px) 16vw, (min-width: 640px) 33vw, 50vw"}
                />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={cn("section-gap grid gap-6", columnClasses[settings.columns ?? 3])}>
            {lines.map((line, index) => (
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
        )}
      </Container>
    </SectionFrame>
  );
}
