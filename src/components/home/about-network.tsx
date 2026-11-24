import { PillarList } from "@/components/network/pillar-list";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import type { Pillar } from "@/lib/site/pillars";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import type { HomepageContent } from "@/types/content";

type AboutNetworkProps = {
  content: Pick<HomepageContent, "about_title" | "about_description">;
  pillars: readonly Pillar[];
  settings?: SectionSettings;
};

export function AboutNetwork({ content, pillars, settings = {} }: AboutNetworkProps) {
  if (!content.about_title) return null;
  const showPillars = settings.show_pillars !== false && pillars.length > 0;

  return (
    <SectionFrame id="a-rede" labelledBy="a-rede-title" background={resolveBackground("about", settings)}>
      <Container
        className={
          showPillars
            ? "grid gap-10 xl:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] xl:items-center xl:gap-14"
            : undefined
        }
      >
        <div className="max-w-3xl">
          <SectionHeading id="a-rede-title" eyebrow={settings.eyebrow} title={content.about_title} />
          {content.about_description && (
            <p className="mt-6 whitespace-pre-line text-body-lg text-muted-foreground">{content.about_description}</p>
          )}
          {settings.cta_label && settings.cta_href && (
            <TextLink href={settings.cta_href} className="mt-4">
              {settings.cta_label}
            </TextLink>
          )}
        </div>

        {showPillars && (
          <PillarList pillars={pillars} variant="row" />
        )}
      </Container>
    </SectionFrame>
  );
}
