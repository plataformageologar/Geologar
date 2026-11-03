import { GraduationCap, Handshake, Microscope, Mountain } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Pillar } from "@/data/site";
import type { HomepageContent } from "@/types/content";

const pillarIcons: Record<Pillar["id"], LucideIcon> = {
  pesquisa: Microscope,
  formacao: GraduationCap,
  territorio: Mountain,
  cooperacao: Handshake,
};

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
        </div>

        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:col-span-7 xl:grid-cols-2 xl:self-center">
          {pillars.map((pillar) => {
            const Icon = pillarIcons[pillar.id];

            return (
              <li key={pillar.id} className="flex flex-col gap-3 border-t border-border pt-6">
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
                  <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                </span>
                <h3 className="font-sans text-h4">{pillar.title}</h3>
                <p className="text-body-sm text-muted-foreground">
                  {pillar.description}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
