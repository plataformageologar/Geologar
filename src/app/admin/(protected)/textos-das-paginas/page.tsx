import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { PageContentEditor } from "@/components/admin/site/cms-editors";
import { LoadError, PageTabs, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { pageContentDocument, toPageValues } from "@/lib/editorial/content";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";
import { EDITABLE_PAGE_CONTENT_KEYS, PAGE_CONTENT_LABELS, type PageContentKey } from "@/lib/site/page-content";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Textos das páginas",
};

export default async function PageTextsPage({ searchParams }: PageProps<"/admin/textos-das-paginas">) {
  await requireAdminAccess();
  const query = await searchParams;
  const param = firstParam(query.pagina);
  const page: PageContentKey = (EDITABLE_PAGE_CONTENT_KEYS as readonly string[]).includes(param ?? "")
    ? (param as PageContentKey)
    : "rede";

  const ref = pageContentDocument(page);
  const doc = await getEditorialDocument(ref.type, ref.key);
  const current = doc.status === "ready" ? doc.data?.current.page : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Textos das páginas"
        description="Título, introdução e dados para buscadores de cada página interna. Campos vazios usam o texto padrão indicado. Salvar guarda um rascunho; o site muda só ao publicar."
        visualHref={`/admin/editor?pagina=${encodeURIComponent(PAGE_CONTENT_LABELS[page].path)}`}
      >
        <PageTabs
          label="Página"
          current={page}
          tabs={EDITABLE_PAGE_CONTENT_KEYS.map((key) => ({
            key,
            label: PAGE_CONTENT_LABELS[key].label,
            href: `/admin/textos-das-paginas?pagina=${key}`,
          }))}
        />
      </SitePageIntro>

      {doc.status === "error" ? (
        <LoadError subject="os textos das páginas" />
      ) : doc.data && current ? (
        <EditorialScope
          key={page}
          doc={docInfo(doc.data)}
          canPublish
          previewHref={`/admin/editor?pagina=${encodeURIComponent(PAGE_CONTENT_LABELS[page].path)}`}
          loginNext={`/admin/textos-das-paginas?pagina=${page}`}
        >
          <PageContentEditor page={page} initial={toPageValues(current)} canUpload />
        </EditorialScope>
      ) : (
        <FormMessage tone="warning">
          O registro de textos desta página não existe no banco de dados. O site continua usando os textos
          padrão. A equipe técnica deve reaplicar a migration de personalização (veja{" "}
          <code>docs/visual-editor.md</code>).
        </FormMessage>
      )}
    </div>
  );
}
