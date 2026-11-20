import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { ResearchLineLinkList } from "@/components/research/research-line-link-list";
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

/**
 * Linhas de pesquisa: cards (homepage) ou lista compacta de links (/rede).
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
          <div className="mt-10">
            <ResearchLineLinkList lines={lines} />
          </div>
        ) : (
          <ul className={cn("mt-12 grid gap-6", columnClasses[settings.columns ?? 3])}>
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
