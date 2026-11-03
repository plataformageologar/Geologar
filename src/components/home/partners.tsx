import Image from "next/image";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils/cn";
import type { InstitutionGroup, InstitutionSummary } from "@/types/content";

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
                    <PartnerLogo institution={institution} />
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

/**
 * Área padronizada para cada marca: o logotipo é contido (object-contain),
 * sem deformação, centralizado em um fundo neutro.
 */
function PartnerLogo({ institution }: { institution: InstitutionSummary }) {
  const label = institution.acronym
    ? `${institution.name} (${institution.acronym})`
    : institution.name;

  const tile = (
    <span
      className={cn(
        "relative flex aspect-[3/2] items-center justify-center rounded-xl border bg-surface p-4",
        institution.logo_path ? "border-border" : "border-dashed border-border",
      )}
    >
      {institution.logo_path ? (
        <span className="relative size-full">
          <Image
            src={institution.logo_path}
            alt={institution.logo_alt ?? label}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
            className="object-contain"
          />
        </span>
      ) : (
        <span className="text-center text-caption text-muted-foreground">{label}</span>
      )}
    </span>
  );

  return institution.website_url ? (
    <a
      href={institution.website_url}
      className="block rounded-xl transition-colors hover:[&>span]:border-primary/40"
    >
      {tile}
    </a>
  ) : (
    tile
  );
}
