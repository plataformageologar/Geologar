import type { Metadata } from "next";

import { SectionsEditor } from "@/components/admin/site/cms-editors";
import { LoadError, PageTabs, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { getInstitutionOptionsForSections, getSectionsForEdit } from "@/lib/queries/site-config";
import { SECTION_PAGES, type SectionPage } from "@/lib/site/sections";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seções e blocos",
};

const PAGES: Record<SectionPage, { label: string; path: string }> = {
  home: { label: "Página inicial", path: "/" },
  rede: { label: "A Rede", path: "/rede" },
};

export default async function SectionsPage({ searchParams }: PageProps<"/admin/secoes">) {
  await requireAdminAccess();
  const query = await searchParams;
  const param = firstParam(query.pagina);
  const page: SectionPage = (SECTION_PAGES as readonly string[]).includes(param ?? "")
    ? (param as SectionPage)
    : "home";

  const [sections, institutions] = await Promise.all([
    getSectionsForEdit(page),
    getInstitutionOptionsForSections(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SitePageIntro
        title="Seções e blocos"
        description="Escolha a ordem das seções, oculte as que não devem aparecer e adicione blocos de texto, imagem, chamada, galeria ou logos. Seções sem conteúdo publicado não aparecem no site."
        visualHref={`/admin/editor?pagina=${encodeURIComponent(PAGES[page].path)}`}
      >
        <PageTabs
          label="Página"
          current={page}
          tabs={SECTION_PAGES.map((key) => ({
            key,
            label: PAGES[key].label,
            href: `/admin/secoes?pagina=${key}`,
          }))}
        />
      </SitePageIntro>

      {sections.status === "error" ? (
        <LoadError subject="as seções da página" />
      ) : (
        <SectionsEditor
          key={page}
          page={page}
          initial={sections.data}
          institutions={institutions.status === "ready" ? institutions.data : []}
          canUpload
        />
      )}
    </div>
  );
}
