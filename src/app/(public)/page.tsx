import type { Metadata } from "next";

import { PageSections } from "@/components/site/page-sections";
import { getHomepageData, withAvailableHeroLinks } from "@/lib/queries/homepage";
import { getSiteSettings } from "@/lib/queries/settings";
import { SITE_OPEN_GRAPH } from "@/lib/site/url";

export const dynamic = "force-dynamic";

/** Título da página inicial: nome do site e nome institucional (dados do CMS). */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title =
    settings.institutional_name && settings.institutional_name !== settings.site_name
      ? `${settings.site_name} | ${settings.institutional_name}`
      : settings.site_name;
  const description = settings.short_description ?? settings.institutional_name ?? undefined;
  return {
    title: { absolute: title },
    alternates: { canonical: "/" },
    openGraph: { ...SITE_OPEN_GRAPH, siteName: settings.site_name, url: "/", title, description },
  };
}

export default async function Home() {
  const { data, sections, anchors } = await getHomepageData();

  // CTAs que apontam para seções ausentes ou ocultas não são exibidos.
  const homepage = withAvailableHeroLinks(data.homepage, anchors);

  return (
    <PageSections
      page="home"
      sections={sections.map((section) => ({ ...section, key: section.id, is_visible: true }))}
      data={{ ...data, homepage }}
    />
  );
}
