import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, History, MousePointerClick, Pencil, Plus } from "lucide-react";

import { CustomPageStatusBadge } from "@/components/admin/editorial/custom-page-status";
import { FormMessage } from "@/components/admin/form-controls";
import { LoadError } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { getCustomPagesForAdmin } from "@/lib/queries/editorial";
import { cn } from "@/lib/utils/cn";
import { formatAdminDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Páginas",
};

const actionClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border px-3.5 text-label text-foreground transition-colors hover:border-primary/40 hover:text-primary";

export default async function CustomPagesPage() {
  await requireAdminAccess();
  const pages = await getCustomPagesForAdmin();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Páginas</h1>
          <p className="text-body text-muted-foreground">
            Páginas institucionais criadas no CMS, montadas com os blocos de texto, imagem, chamada, galeria e
            logos. Uma página nova começa como rascunho e só aparece no site depois de publicada. Páginas não são
            excluídas: arquive as que não forem mais usadas.
          </p>
        </div>
        <Link
          href="/admin/paginas/nova"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 text-label font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          <Plus aria-hidden="true" className="size-4" />
          Nova página
        </Link>
      </div>

      {pages.status === "error" ? (
        <LoadError subject="as páginas" />
      ) : pages.data.length === 0 ? (
        <FormMessage tone="info">Nenhuma página criada ainda. Use “Nova página” para começar.</FormMessage>
      ) : (
        <ul className="flex flex-col gap-3">
          {pages.data.map((page) => (
            <li key={page.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h4 font-sans">{page.title}</h2>
                  <CustomPageStatusBadge status={page.status} />
                  {page.hasDraft && page.status !== "archived" && (
                    <span className="text-caption font-semibold text-earth">Rascunho com alterações</span>
                  )}
                </div>
                <code className="break-all text-body-sm text-muted-foreground">/paginas/{page.slug}</code>
                <p className="text-caption text-muted-foreground">
                  Atualizada em {formatAdminDateTime(page.updatedAt)}
                  {page.publishedAt ? ` · publicada em ${formatAdminDateTime(page.publishedAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/paginas/${page.id}`} className={actionClasses}>
                  <Pencil aria-hidden="true" className="size-4" />
                  Editar<span className="sr-only">: {page.title}</span>
                </Link>
                {page.status !== "archived" && (
                  <Link
                    href={`/admin/editor?pagina=${encodeURIComponent(`/paginas/${page.slug}`)}`}
                    className={actionClasses}
                  >
                    <MousePointerClick aria-hidden="true" className="size-4" />
                    Editar visualmente<span className="sr-only">: {page.title}</span>
                  </Link>
                )}
                {page.documentId && (
                  <Link href={`/admin/historico?documento=${page.documentId}`} className={actionClasses}>
                    <History aria-hidden="true" className="size-4" />
                    Histórico<span className="sr-only">: {page.title}</span>
                  </Link>
                )}
                {page.status === "published" && (
                  <a href={`/paginas/${page.slug}`} target="_blank" rel="noopener" className={cn(actionClasses)}>
                    <ExternalLink aria-hidden="true" className="size-4" />
                    Ver no site<span className="sr-only">: {page.title} (abre em nova aba)</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
