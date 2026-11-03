import type { Metadata } from "next";

import { CooperationCta } from "@/components/home/cooperation-cta";
import { PillarList } from "@/components/network/pillar-list";
import { ResearchLineLinkList } from "@/components/research/research-line-link-list";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { pillars } from "@/data/site";
import { getHomepageContent } from "@/lib/queries/homepage";
import { getHomepageResearchLines } from "@/lib/queries/research-lines";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getHomepageContent();
  return {
    title: "A Rede",
    description: content.about_description ?? undefined,
  };
}

export default async function NetworkPage() {
  // Textos institucionais de `homepage_content` (com fallback do briefing) e
  // as linhas publicadas; sem linhas, a seção correspondente não aparece.
  const [content, researchLines] = await Promise.all([
    getHomepageContent(),
    getHomepageResearchLines(50),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "A Rede" }]}
        eyebrow="A Rede"
        title={content.about_title ?? "A Rede"}
        description={content.about_description}
      />

      <section aria-labelledby="atuacao-title" className="section-y">
        <Container>
          <SectionHeading
            id="atuacao-title"
            eyebrow="Atuação"
            title="Pilares da rede"
            description={content.hero_description ?? undefined}
          />
          <PillarList pillars={pillars} className="mt-12 lg:grid-cols-4" />
        </Container>
      </section>

      {researchLines.length > 0 && (
        <section aria-labelledby="linhas-title" className="section-y bg-surface-muted">
          <Container>
            <SectionHeading
              id="linhas-title"
              eyebrow="Pesquisa"
              title="Linhas de pesquisa"
              action={<TextLink href="/pesquisa">Ver todas as linhas</TextLink>}
            />
            <div className="mt-10">
              <ResearchLineLinkList lines={researchLines} />
            </div>
          </Container>
        </section>
      )}

      <div className="pt-[clamp(4rem,2.8rem+5vw,7.5rem)]">
        <CooperationCta content={content} />
      </div>
    </>
  );
}
