import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { SectionFrame } from "@/components/site/section-frame";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { TextLink } from "@/components/ui/text-link";
import { resolveBackground, type SectionSettings } from "@/lib/site/sections";
import { cn } from "@/lib/utils/cn";
import type { InstitutionGroup } from "@/types/content";

type PartnersProps = {
  groups: InstitutionGroup[];
  settings?: SectionSettings;
};

/** Colunas da primeira categoria (fileira larga), conforme a quantidade. */
const leadColumns: Record<number, string> = {
  1: "lg:grid-cols-4",
  2: "lg:grid-cols-4",
  3: "lg:grid-cols-4",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
  8: "lg:grid-cols-8",
  9: "lg:grid-cols-9",
};

function GroupTitle({ children }: { children: string }) {
  return (
    <h3 className="font-sans text-label font-bold uppercase tracking-[0.08em] text-foreground">
      {children}
    </h3>
  );
}

/**
 * Instituições por categoria (Etapa 10.7): a primeira categoria (em geral as
 * universidades parceiras) ocupa uma fileira larga; as demais ficam lado a
 * lado, com largura proporcional à quantidade de logotipos e separadas por
 * linhas verticais. No celular, tudo empilhado. Categorias e quantidades vêm
 * do banco — nada é fixo no código.
 */
export function Partners({ groups, settings = {} }: PartnersProps) {
  const visibleGroups = groups.filter((group) => group.institutions.length > 0);

  if (visibleGroups.length === 0) return null;
  const [lead, ...others] = visibleGroups;

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

        <div className="section-gap flex flex-col gap-10">
          <div>
            <GroupTitle>{lead.category.name}</GroupTitle>
            <ul
              className={cn(
                "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:gap-4",
                leadColumns[lead.institutions.length] ?? "lg:grid-cols-10",
              )}
            >
              {lead.institutions.map((institution) => (
                <li key={institution.id}>
                  <InstitutionLogo institution={institution} />
                </li>
              ))}
            </ul>
          </div>

          {others.length > 0 && (
            <div className="flex flex-col gap-10 border-t border-border pt-10 lg:flex-row lg:gap-0">
              {others.map((group) => (
                <div
                  key={group.category.slug}
                  // Largura proporcional à quantidade de logotipos (mínimo 2).
                  style={{ flexGrow: Math.max(group.institutions.length, 2) }}
                  className="min-w-0 lg:basis-0 lg:border-l lg:border-border lg:px-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
                >
                  <GroupTitle>{group.category.name}</GroupTitle>
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]">
                    {group.institutions.map((institution) => (
                      <li key={institution.id}>
                        <InstitutionLogo institution={institution} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </SectionFrame>
  );
}
