import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import type { InstitutionGroup } from "@/types/content";

type PartnersProps = {
  groups: InstitutionGroup[];
};

export function Partners({ groups }: PartnersProps) {
  const visibleGroups = groups.filter((group) => group.institutions.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <section id="instituicoes" aria-labelledby="instituicoes-title" className="section-y">
      <Container>
        <SectionHeading
          id="instituicoes-title"
          eyebrow="Instituições"
          title="Instituições que conectam a rede"
          action={
            <TextLink href="/instituicoes">Conheça nossas instituições parceiras</TextLink>
          }
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
    </section>
  );
}
