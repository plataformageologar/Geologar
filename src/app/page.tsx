import { AboutNetwork } from "@/components/home/about-network";
import { CooperationCta } from "@/components/home/cooperation-cta";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { RecentPublications } from "@/components/home/recent-publications";
import { ResearchLines } from "@/components/home/research-lines";
import { pillars } from "@/data/site";
import { getHomepageData, isLinkAvailable } from "@/lib/queries/homepage";

export default async function Home() {
  const { content, researchLines, projects, publications, institutionGroups, sections } =
    await getHomepageData();

  // CTAs que apontam para seções ainda sem conteúdo não são exibidos.
  const heroContent = {
    ...content,
    hero_primary_cta_href:
      content.hero_primary_cta_href && isLinkAvailable(content.hero_primary_cta_href, sections)
        ? content.hero_primary_cta_href
        : null,
    hero_secondary_cta_href:
      content.hero_secondary_cta_href &&
      isLinkAvailable(content.hero_secondary_cta_href, sections)
        ? content.hero_secondary_cta_href
        : null,
  };

  return (
    <>
      <Hero content={heroContent} eyebrow="Rede de Pesquisa em Geociências" />
      <AboutNetwork content={content} pillars={pillars} />
      <ResearchLines researchLines={researchLines} />
      <FeaturedProjects projects={projects} />
      <RecentPublications publications={publications} />
      <Partners groups={institutionGroups} />
      <CooperationCta content={content} />
    </>
  );
}
