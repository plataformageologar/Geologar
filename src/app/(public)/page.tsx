import { PageSections } from "@/components/site/page-sections";
import { getHomepageData, withAvailableHeroLinks } from "@/lib/queries/homepage";

export const dynamic = "force-dynamic";

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
