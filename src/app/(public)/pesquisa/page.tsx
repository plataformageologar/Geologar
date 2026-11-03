import type { Metadata } from "next";

import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPublishedResearchLines } from "@/lib/queries/research-lines";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pesquisa",
  description:
    "Linhas de pesquisa da GeoLogar, com os projetos e as publicações associados a cada uma.",
};

export default async function ResearchPage() {
  const researchLines = await getPublishedResearchLines();

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Pesquisa" }]}
        eyebrow="Pesquisa"
        title="Linhas de pesquisa"
        description="Conheça as linhas de pesquisa da rede e os projetos e publicações associados a cada uma."
      />

      <Container className="section-y">
        {researchLines.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {researchLines.map((line, index) => (
              <li key={line.slug}>
                <ResearchLineCard
                  researchLine={line}
                  icon={researchLineIcon(line.slug)}
                  tint={researchLineTint(index)}
                  href={`/pesquisa/${line.slug}`}
                  headingLevel="h2"
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma linha de pesquisa publicada no momento." />
        )}
      </Container>
    </>
  );
}
