import type { Metadata } from "next";

import { ResearchLineCard } from "@/components/research/research-line-card";
import { researchLineIcon, researchLineTint } from "@/components/research/research-line-icons";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePageHeader } from "@/lib/site/page-content";
import { getPageContent, getPageMetadata } from "@/lib/queries/site-config";
import { getPublishedResearchLines } from "@/lib/queries/research-lines";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return getPageMetadata("pesquisa", { title: "Pesquisa" });
}

export default async function ResearchPage() {
  const [researchLines, page] = await Promise.all([getPublishedResearchLines(), getPageContent("pesquisa")]);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Pesquisa" }]}
        {...resolvePageHeader("pesquisa", page)}
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
