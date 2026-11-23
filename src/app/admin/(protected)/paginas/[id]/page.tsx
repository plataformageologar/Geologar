import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { PrepareRepublish, SlugPanel, StatusActions } from "@/components/admin/editorial/custom-page-panels";
import { CustomPageStatusBadge } from "@/components/admin/editorial/custom-page-status";
import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { FormMessage } from "@/components/admin/form-controls";
import { PageContentEditor, SectionsEditor } from "@/components/admin/site/cms-editors";
import { LoadError, VisualEditLink } from "@/components/admin/site/page-intro";
import { isUuid } from "@/lib/admin/validation";
import { requireAdminAccess } from "@/lib/auth/access";
import { toPageValues, toSectionDrafts } from "@/lib/editorial/content";
import { docInfo, getCustomPageForAdmin } from "@/lib/queries/editorial";
import { getInstitutionOptionsForSections } from "@/lib/queries/site-config";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar página",
};

export default async function CustomPageEditPage({ params, searchParams }: PageProps<"/admin/paginas/[id]">) {
  const access = await requireAdminAccess();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;

  const [result, institutions] = await Promise.all([getCustomPageForAdmin(id), getInstitutionOptionsForSections()]);
  if (result.status === "ready" && !result.data) notFound();

  if (result.status === "error" || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <h1 className="text-h1">Editar página</h1>
        <LoadError subject="a página" />
      </div>
    );
  }

  const page = result.data;
  const view = page.view;
  const current = view.current.page;
  const editorHref = `/admin/editor?pagina=${encodeURIComponent(`/paginas/${page.slug}`)}`;
  const archived = page.status === "archived";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/admin/paginas" className="inline-flex min-h-11 items-center gap-2 self-start text-label text-primary">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para Páginas
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h1 break-words">{page.title}</h1>
              <CustomPageStatusBadge status={page.status} />
            </div>
            <code className="break-all text-body-sm text-muted-foreground">/paginas/{page.slug}</code>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 self-start">
            {!archived && <VisualEditLink href={editorHref} />}
            {page.status === "published" && (
              <a
                href={`/paginas/${page.slug}`}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary px-5 text-label text-primary hover:bg-primary-soft"
              >
                Ver no site
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {firstParam(query.criada) === "1" && (
        <FormMessage tone="success">
          Página criada como rascunho. Ela ainda não aparece no site: adicione os blocos, salve o rascunho e
          publique quando estiver pronta.
        </FormMessage>
      )}
      {firstParam(query.seo) === "falhou" && (
        <FormMessage tone="warning">
          Os campos para buscadores não foram gravados. Preencha-os de novo em “Cabeçalho e SEO” abaixo.
        </FormMessage>
      )}

      <section aria-labelledby="pagina-config" className="flex flex-col gap-5 rounded-2xl border border-border p-4 sm:p-5">
        <h2 id="pagina-config" className="text-h4 font-sans">
          Endereço e situação
        </h2>
        <SlugPanel pageId={page.id} slug={page.slug} title={page.title} locked={page.firstPublishedAt !== null} />
        <StatusActions
          pageId={page.id}
          status={page.status}
          isAdmin={access.role === "admin"}
          everPublished={page.firstPublishedAt !== null}
        />
      </section>

      {archived ? (
        <FormMessage tone="info">
          Página arquivada: fora do site e fora da edição. Título, blocos e histórico continuam guardados. Reative
          para editar e publicar de novo.{" "}
          {page.documentId && (
            <Link href={`/admin/historico?documento=${page.documentId}`} className="font-semibold underline underline-offset-2">
              Ver histórico
            </Link>
          )}
        </FormMessage>
      ) : (
        <EditorialScope doc={docInfo(view)} canPublish previewHref={editorHref} loginNext={`/admin/paginas/${page.id}`}>
          {page.status !== "published" && !view.hasDraft && view.published && <PrepareRepublish />}
          <section aria-labelledby="pagina-cabecalho" className="flex flex-col gap-4">
            <h2 id="pagina-cabecalho" className="text-h3 font-sans">
              Cabeçalho e SEO
            </h2>
            <PageContentEditor
              page="custom"
              initial={toPageValues(
                current ?? {
                  eyebrow: null,
                  title: page.title,
                  description: null,
                  seo_title: null,
                  seo_description: null,
                  seo_image_path: null,
                },
              )}
              canUpload
              loginNext={`/admin/paginas/${page.id}`}
            />
          </section>
          <section aria-labelledby="pagina-blocos" className="flex flex-col gap-4">
            <h2 id="pagina-blocos" className="text-h3 font-sans">
              Blocos
            </h2>
            <SectionsEditor
              page="custom"
              initial={toSectionDrafts(view.current.sections ?? [])}
              institutions={institutions.status === "ready" ? institutions.data : []}
              canUpload
              loginNext={`/admin/paginas/${page.id}`}
            />
          </section>
        </EditorialScope>
      )}
    </div>
  );
}
