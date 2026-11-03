import type { Metadata } from "next";

import { InstitutionLogo } from "@/components/institutions/institution-logo";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TextLink } from "@/components/ui/text-link";
import { getPublishedInstitutionGroups } from "@/lib/queries/institutions";
import { safeExternalUrl } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Instituições",
  description: "Instituições e parceiros que integram ou colaboram com a GeoLogar.",
};

export default async function InstitutionsPage() {
  const groups = (await getPublishedInstitutionGroups()).filter(
    (group) => group.institutions.length > 0,
  );

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Instituições" }]}
        eyebrow="Instituições"
        title="Instituições"
        description="Instituições e parceiros que integram ou colaboram com a rede."
      />

      <Container className="section-y">
        {groups.length > 0 ? (
          <div className="flex flex-col gap-16">
            {groups.map((group) => (
              <section key={group.category.slug} aria-labelledby={`categoria-${group.category.slug}`}>
                <h2 id={`categoria-${group.category.slug}`} className="text-h2">
                  {group.category.name}
                </h2>
                <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.institutions.map((institution) => {
                    const websiteUrl = safeExternalUrl(institution.website_url);
                    return (
                      <li
                        key={institution.id}
                        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
                      >
                        {institution.logo_path && (
                          <div className="w-full max-w-48">
                            <InstitutionLogo institution={institution} />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <h3 className="font-sans text-h4 break-words">{institution.name}</h3>
                          {institution.acronym && (
                            <p className="text-label text-earth">{institution.acronym}</p>
                          )}
                        </div>
                        {institution.description && (
                          <p className="text-body-sm text-muted-foreground">
                            {institution.description}
                          </p>
                        )}
                        {websiteUrl && (
                          <TextLink href={websiteUrl} className="mt-auto">
                            Site da instituição
                            <span className="sr-only">: {institution.name}</span>
                          </TextLink>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="A relação de instituições ainda não foi publicada.">
            <TextLink href="/rede">Conheça a rede</TextLink>
          </EmptyState>
        )}
      </Container>
    </>
  );
}
