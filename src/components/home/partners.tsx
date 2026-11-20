import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import type { InstitutionGroup } from "@/types/content";

type PartnersProps = {
  groups: InstitutionGroup[];
  settings?: SectionSettings;
};

export function Partners({ groups, settings = {} }: PartnersProps) {
  const visibleGroups = groups.filter((group) => group.institutions.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <SectionFrame id="instituicoes" labelledBy="instituicoes-title" background={resolveBackground("institutions", settings)}>
      <Container>
        <SectionHeading
          id="instituicoes-title"
          eyebrow={settings.eyebrow}
          title={settings.title ?? "Instituições que conectam a rede"}
          description={settings.description}
          action={settings.cta_label && settings.cta_href ? <TextLink href={settings.cta_href}>{settings.cta_label}</TextLink> : undefined}
        />

        <div className="mt-12 flex flex-col gap-10">
          {visibleGroups.map((group) => (
            <div key={group.category.slug}>
              <h3 className="font-sans text-label uppercase tracking-[0.12em] text-muted-foreground">
                {group.category.name}
              </h3>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
                {group.institutions.map((institution) => (
                  <li key={institution.id}>
                    <InstitutionLogo institution={institution} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </SectionFrame>
  );
}
