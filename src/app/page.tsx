import { AboutNetwork } from "@/components/home/about-network";
import { CooperationCta } from "@/components/home/cooperation-cta";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { RecentPublications } from "@/components/home/recent-publications";
import { ResearchLines } from "@/components/home/research-lines";
import {
  featuredProjects,
  institutionGroups,
  recentPublications,
  showContentPlaceholders,
} from "@/data/placeholders";
import { homepageContent, pillars, researchLines } from "@/data/site";

// Dados locais nesta etapa; serão substituídos por consultas ao Supabase.
export default function Home() {
  return (
    <>
      <Hero
        content={homepageContent}
        eyebrow="Rede de Pesquisa em Geociências"
        showProvisionalNotice={showContentPlaceholders}
      />
      <AboutNetwork content={homepageContent} pillars={pillars} />
      <ResearchLines researchLines={researchLines} />
      <FeaturedProjects projects={featuredProjects} provisional={showContentPlaceholders} />
      <RecentPublications
        publications={recentPublications}
        provisional={showContentPlaceholders}
      />
      <Partners groups={institutionGroups} provisional={showContentPlaceholders} />
      <CooperationCta
        content={homepageContent}
        showProvisionalNotice={showContentPlaceholders}
      />
    </>
  );
}
