import type { Metadata } from "next";

import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { SectionsEditor } from "@/components/admin/site/cms-editors";
import { LoadError, PageTabs, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { toSectionDrafts } from "@/lib/editorial/content";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";
import { getInstitutionOptionsForSections } from "@/lib/queries/site-config";
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

  const [doc, institutions] = await Promise.all([
    getEditorialDocument(page, page),
    getInstitutionOptionsForSections(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SitePageIntro
        title="Seções e blocos"
        description="Escolha a ordem das seções, oculte as que não devem aparecer e adicione blocos de texto, imagem, chamada, galeria ou logos. Seções sem conteúdo não aparecem no site. Salvar guarda um rascunho; o site muda só ao publicar."
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

      {doc.status === "error" || !doc.data ? (
        <LoadError subject="as seções da página" />
      ) : (
        <EditorialScope
          key={page}
          doc={docInfo(doc.data)}
          canPublish
          previewHref={`/admin/editor?pagina=${encodeURIComponent(PAGES[page].path)}`}
          loginNext={`/admin/secoes?pagina=${page}`}
        >
          <SectionsEditor
            page={page}
            initial={toSectionDrafts(doc.data.current.sections ?? [])}
            institutions={institutions.status === "ready" ? institutions.data : []}
            canUpload
          />
        </EditorialScope>
      )}
    </div>
  );
}
