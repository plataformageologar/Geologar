import {
  Gem,
  Landmark,
  Layers,
  Recycle,
  Satellite,
  Sprout,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ResearchLineSummary } from "@/types/content";

import { ResearchLineCard } from "./research-line-card";

// Ícones de apoio por linha (o slug é estável; o ícone não faz parte do conteúdo).
const icons: Record<string, LucideIcon> = {
  "geologia-e-geodiversidade": Layers,
  "recursos-minerais": Gem,
  "geologia-ambiental": Sprout,
  "sustentabilidade-e-economia-circular": Recycle,
  "patrimonio-geologico": Landmark,
  "geotecnologias-e-geoprocessamento": Satellite,
};

const tints = ["green", "earth", "blue"] as const;

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
        />
        {/* As páginas /pesquisa/[slug] ainda não existem: cards sem link. */}
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {researchLines.map((line, index) => (
            <li key={line.slug}>
              <ResearchLineCard
                researchLine={line}
                icon={icons[line.slug] ?? Layers}
                tint={tints[index % tints.length]}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
