import type { Metadata } from "next";

import { PageSections } from "@/components/site/page-sections";
import { PageHeader } from "@/components/ui/page-header";
import { getHomepageContent, getSectionsData } from "@/lib/queries/homepage";
import { resolvePageHeader } from "@/lib/site/page-content";
import { getPageContent, getPageMetadata, getPageSections } from "@/lib/queries/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getHomepageContent();
  return getPageMetadata("rede", { title: "A Rede", description: content.about_description });
}

export default async function NetworkPage() {
  // Título e introdução de page_content; vazios, os textos da apresentação da
  // rede (homepage_content). Seções vazias não aparecem.
  const [data, sections, page] = await Promise.all([
    getSectionsData({ researchLineLimit: 50 }),
    getPageSections("rede"),
    getPageContent("rede"),
  ]);
  const { homepage } = data;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "A Rede" }]}
        {...resolvePageHeader("rede", page, homepage)}
      />
      <PageSections
        page="rede"
        sections={sections.map((section) => ({ ...section, key: section.id, is_visible: true }))}
        data={data}
      />
    </>
  );
}
