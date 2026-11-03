import { PillarList } from "@/components/network/pillar-list";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import type { Pillar } from "@/data/site";
import type { HomepageContent } from "@/types/content";

type AboutNetworkProps = {
  content: Pick<HomepageContent, "about_title" | "about_description">;
  pillars: readonly Pillar[];
};

export function AboutNetwork({ content, pillars }: AboutNetworkProps) {
  if (!content.about_title) return null;

  return (
    <section id="a-rede" aria-labelledby="a-rede-title" className="section-y">
      <Container className="grid gap-12 xl:grid-cols-12 xl:gap-16">
        <div className="max-w-3xl xl:col-span-5">
          <SectionHeading
            id="a-rede-title"
            eyebrow="A Rede"
            title={content.about_title}
          />
          {content.about_description && (
            <p className="mt-6 text-body-lg text-muted-foreground">
              {content.about_description}
            </p>
          )}
          <TextLink href="/rede" className="mt-4">
            Saiba mais sobre a rede
          </TextLink>
        </div>

        <PillarList
          pillars={pillars}
          className="lg:grid-cols-4 xl:col-span-7 xl:grid-cols-2 xl:self-center"
        />
      </Container>
    </section>
  );
}
