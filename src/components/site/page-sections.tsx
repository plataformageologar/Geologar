import { Fragment, type ReactNode } from "react";

import { AboutNetwork } from "@/components/home/about-network";
import { CooperationCta } from "@/components/home/cooperation-cta";
import { FeaturedProjects } from "@/components/home/featured-projects";
import { Hero } from "@/components/home/hero";
import { Partners } from "@/components/home/partners";
import { RecentPublications } from "@/components/home/recent-publications";
import { ResearchLines } from "@/components/home/research-lines";
import { PillarList } from "@/components/network/pillar-list";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Pillar } from "@/lib/site/pillars";
import { groupSections } from "@/lib/site/section-pairs";
import {
  resolveBackground,
  type SectionScope,
  type SectionSettings,
  type SectionType,
} from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type {
  HomepageContent,
  InstitutionGroup,
  InstitutionSummary,
  ProjectSummary,
  PublicationSummary,
  ResearchLineSummary,
} from "@/types/content";

import { CtaBlock, GalleryBlock, hasBlockContent, ImageTextBlock, LogosBlock, TextBlock } from "./blocks";
import { ExperiencesSection, hasExperiences, shownExperiences } from "./experiences-section";
import { backgroundClasses, SectionFrame } from "./section-frame";

/**
 * Renderização das seções configuráveis (homepage e /rede). Componente puro,
 * usado pelo site (servidor) e pela tela do editor visual (navegador) com os
 * mesmos componentes públicos — o editor não tem uma cópia do site.
 */

export type SectionsData = {
  homepage: HomepageContent;
  pillars: Pillar[];
  researchLines: ResearchLineSummary[];
  projects: ProjectSummary[];
  publications: PublicationSummary[];
  institutionGroups: InstitutionGroup[];
  /** Instituições publicadas por id (blocos de logotipos). */
  institutions: Record<string, InstitutionSummary>;
};

export type RenderableSection = {
  key: string;
  section_type: SectionType;
  settings: SectionSettings;
  is_visible: boolean;
};

function PillarsSection({
  pillars,
  settings,
  fallbackDescription,
}: {
  pillars: Pillar[];
  settings: SectionSettings;
  fallbackDescription: string | null;
}) {
  if (pillars.length === 0) return null;
  return (
    <SectionFrame id="atuacao" labelledBy="atuacao-title" background={resolveBackground("pillars", settings)}>
      <Container>
        <SectionHeading
          id="atuacao-title"
          eyebrow={settings.eyebrow}
          title={settings.title ?? "Pilares da rede"}
          description={settings.description ?? fallbackDescription ?? undefined}
        />
        <PillarList pillars={pillars} className="mt-12 lg:grid-cols-4" />
      </Container>
    </SectionFrame>
  );
}

/**
 * Se a seção tem algo a mostrar com os dados atuais (vazias somem do site).
 * `editing`: editor visual, que também mostra itens ocultos (experiências).
 */
export function sectionHasContent(
  page: SectionScope,
  section: RenderableSection,
  data: SectionsData,
  editing = false,
): boolean {
  const { homepage } = data;
  switch (section.section_type) {
    case "hero":
      return Boolean(homepage.hero_title);
    case "about":
      return Boolean(homepage.about_title);
    case "pillars":
      return data.pillars.length > 0;
    case "research":
      return data.researchLines.length > 0;
    case "projects":
      return data.projects.length > 0;
    case "publications":
      return data.publications.length > 0;
    case "institutions":
      return data.institutionGroups.some((group) => group.institutions.length > 0);
    case "cooperation":
      return Boolean(homepage.cooperation_title);
    case "experiences":
      return editing ? shownExperiences(section.settings, true).length > 0 : hasExperiences(section.settings);
    default:
      return hasBlockContent(section.section_type, section.settings, data.institutions);
  }
}

/** Projetos (~55%) e publicações (~45%) lado a lado; empilhados no celular. */
export function SectionPair({ settings, left, right }: { settings: SectionSettings; left: ReactNode; right: ReactNode }) {
  return (
    <div className={cn("section-y", backgroundClasses[resolveBackground("projects", settings)])}>
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-14">
        {left}
        {right}
      </Container>
    </div>
  );
}

export function renderSection(
  page: SectionScope,
  section: RenderableSection,
  data: SectionsData,
  editing = false,
  paired = false,
) {
  const { settings, key } = section;
  switch (section.section_type) {
    case "hero":
      return <Hero content={data.homepage} settings={settings} />;
    case "about":
      return <AboutNetwork content={data.homepage} pillars={data.pillars} settings={settings} />;
    case "pillars":
      return (
        <PillarsSection
          pillars={data.pillars}
          settings={settings}
          fallbackDescription={data.homepage.hero_description}
        />
      );
    case "research":
      return (
        <ResearchLines
          researchLines={data.researchLines}
          settings={settings}
          variant={page === "rede" ? "links" : "cards"}
        />
      );
    case "projects":
      return <FeaturedProjects projects={data.projects} settings={settings} paired={paired} />;
    case "publications":
      return <RecentPublications publications={data.publications} settings={settings} paired={paired} />;
    case "institutions":
      return <Partners groups={data.institutionGroups} settings={settings} />;
    case "cooperation":
      // Em /rede a chamada vem depois de seções com fundo próprio: espaço acima.
      return page === "rede" ? (
        <div className="pt-[var(--section-y)]">
          <CooperationCta content={data.homepage} settings={settings} />
        </div>
      ) : (
        <CooperationCta content={data.homepage} settings={settings} />
      );
    case "text":
      return <TextBlock id={key} settings={settings} />;
    case "image_text":
      return <ImageTextBlock id={key} settings={settings} />;
    case "cta":
      return <CtaBlock id={key} settings={settings} />;
    case "gallery":
      return <GalleryBlock id={key} settings={settings} />;
    case "logos":
      return <LogosBlock id={key} settings={settings} institutions={data.institutions} />;
    case "experiences":
      return <ExperiencesSection settings={settings} editing={editing} />;
  }
}

/** Site público: só seções visíveis e com conteúdo. */
export function PageSections({
  page,
  sections,
  data,
}: {
  page: SectionScope;
  sections: RenderableSection[];
  data: SectionsData;
}) {
  const units = groupSections(sections.filter((section) => section.is_visible && sectionHasContent(page, section, data)));
  return (
    <>
      {units.map((unit) =>
        unit.kind === "pair" ? (
          <SectionPair
            key={`${unit.left.key}+${unit.right.key}`}
            settings={unit.left.settings}
            left={renderSection(page, unit.left, data, false, true)}
            right={renderSection(page, unit.right, data, false, true)}
          />
        ) : (
          <Fragment key={unit.section.key}>{renderSection(page, unit.section, data)}</Fragment>
        ),
      )}
    </>
  );
}

