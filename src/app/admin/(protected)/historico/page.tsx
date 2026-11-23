import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DiffList } from "@/components/admin/editorial/diff-list";
import { RestoreRevisionButton } from "@/components/admin/editorial/restore-revision";
import { FormMessage } from "@/components/admin/form-controls";
import { LoadError } from "@/components/admin/site/page-intro";
import { Pagination } from "@/components/ui/pagination";
import { isUuid } from "@/lib/admin/validation";
import { requireAdminAccess } from "@/lib/auth/access";
import { diffContent, documentEditHref, OPERATION_LABELS, parseContent } from "@/lib/editorial/content";
import {
  getEditorialDocumentById,
  getRevision,
  getRevisionContentByNumber,
  getRevisions,
} from "@/lib/queries/editorial";
import { cn } from "@/lib/utils/cn";
import { formatAdminDateTime } from "@/lib/utils/format";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Histórico de versões",
};

/**
 * Histórico de uma unidade editorial: lista paginada (sem o conteúdo), detalhe
 * de uma revisão com comparação estruturada e restauração como rascunho.
 * O RLS só devolve unidades que o papel do usuário pode editar.
 */
export default async function HistoryPage({ searchParams }: PageProps<"/admin/historico">) {
  await requireAdminAccess();
  const query = await searchParams;
  const documentId = firstParam(query.documento) ?? "";
  if (!isUuid(documentId)) notFound();
  const pageNumber = Math.max(1, Math.min(10000, Number.parseInt(firstParam(query.pagina) ?? "1", 10) || 1));
  const revisionId = firstParam(query.revisao);
  const compare = firstParam(query.comparar) === "anterior" ? "previous" : "published";

  const [doc, revisions] = await Promise.all([getEditorialDocumentById(documentId), getRevisions(documentId, pageNumber)]);
  if (doc.status === "ready" && !doc.data) notFound();
  if (doc.status === "error" || revisions.status === "error" || !doc.data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <h1 className="text-h1">Histórico de versões</h1>
        <LoadError subject="o histórico" />
      </div>
    );
  }
  const view = doc.data;
  const editHref = documentEditHref(view.type, view.key);
  const base = `/admin/historico?documento=${view.id}`;

  const detail = revisionId && isUuid(revisionId) ? await getRevision(revisionId) : null;
  const revision = detail?.status === "ready" && detail.data?.documentId === view.id ? detail.data : null;
  let comparison: { content: ReturnType<typeof parseContent>; label: string } | null = null;
  if (revision) {
    if (compare === "previous" && revision.number > 1) {
      const previous = await getRevisionContentByNumber(view.id, revision.number - 1);
      if (previous.status === "ready" && previous.data) {
        comparison = { content: parseContent(view.type, previous.data.content), label: `Revisão ${revision.number - 1}` };
      }
    } else {
      comparison = { content: view.published, label: "Versão publicada atual" };
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href={editHref} className="inline-flex min-h-11 items-center gap-2 self-start text-label text-primary">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar para a edição
        </Link>
        <h1 className="text-h1">Histórico de versões</h1>
        <p className="text-body text-muted-foreground">
          {view.label}. Cada rascunho salvo, publicação e restauração fica registrado aqui e não pode ser alterado.
          Restaurar uma versão cria um novo rascunho — o site público só muda ao publicar.
        </p>
        <p className="text-body-sm">
          {view.hasDraft ? "Há um rascunho salvo" : "Sem rascunho pendente"}
          {view.publishedRevision ? ` · Versão publicada: revisão ${view.publishedRevision}` : " · Nunca publicado"}
        </p>
      </div>

      {revisionId && !revision && detail?.status !== "error" && (
        <FormMessage tone="warning">A revisão pedida não pertence a este conteúdo ou não existe.</FormMessage>
      )}
      {detail?.status === "error" && <LoadError subject="a revisão" />}

      {revision && (
        <section aria-labelledby="detalhe-revisao" className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="detalhe-revisao" className="text-h3 font-sans">
              Revisão {revision.number} — {OPERATION_LABELS[revision.operation] ?? revision.operation}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {formatAdminDateTime(revision.createdAt)}
              {revision.authorEmail ? ` · ${revision.authorEmail}` : ""}
              {revision.restoredFrom ? ` · restaurada da revisão ${revision.restoredFrom}` : ""}
            </p>
            {revision.note && <p className="text-body-sm">Observação: {revision.note}</p>}
          </div>

          <nav aria-label="Comparar com" className="flex flex-wrap gap-2">
            {[
              { key: "published", label: "Comparar com a versão publicada", href: `${base}&pagina=${pageNumber}&revisao=${revision.id}` },
              ...(revision.number > 1
                ? [{ key: "previous", label: "Comparar com a revisão anterior", href: `${base}&pagina=${pageNumber}&revisao=${revision.id}&comparar=anterior` }]
                : []),
            ].map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={tab.key === compare ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-4 text-label transition-colors",
                  tab.key === compare
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:border-primary/40",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {revision.content === null ? (
            <FormMessage tone="warning">O conteúdo desta revisão não pôde ser lido.</FormMessage>
          ) : comparison?.content ? (
            <DiffList
              entries={diffContent(view.type, comparison.content, revision.content)}
              beforeLabel={comparison.label}
              afterLabel={`Revisão ${revision.number}`}
            />
          ) : (
            <p className="text-body-sm text-muted-foreground">Não há outra versão para comparar.</p>
          )}

          {revision.content !== null && (
            <RestoreRevisionButton
              key={revision.id}
              revisionId={revision.id}
              revisionNumber={revision.number}
              version={view.version}
              hasDraft={view.hasDraft}
              editHref={editHref}
              loginNext={`${base}&revisao=${revision.id}`}
            />
          )}
        </section>
      )}

      <section aria-labelledby="lista-revisoes" className="flex flex-col gap-3">
        <h2 id="lista-revisoes" className="text-h3 font-sans">
          Versões ({revisions.data.total})
        </h2>
        <ol className="flex flex-col gap-2">
          {revisions.data.items.map((item) => {
            const current = item.number === view.publishedRevision;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between",
                  revision?.id === item.id ? "border-primary" : "border-border",
                )}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label">
                    Revisão {item.number} · {OPERATION_LABELS[item.operation] ?? item.operation}
                    {current && <span className="ml-2 text-caption font-semibold text-secondary">(publicada atualmente)</span>}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {formatAdminDateTime(item.createdAt)}
                    {item.authorEmail ? ` · ${item.authorEmail}` : ""}
                    {item.restoredFrom ? ` · restaurada da revisão ${item.restoredFrom}` : ""}
                  </span>
                  {item.note && <span className="break-words text-caption">{item.note}</span>}
                </div>
                <Link
                  href={`${base}&pagina=${pageNumber}&revisao=${item.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center self-start rounded-full border border-border px-4 text-label hover:border-primary/40 hover:text-primary sm:self-auto"
                >
                  Ver e comparar<span className="sr-only">: revisão {item.number}</span>
                </Link>
              </li>
            );
          })}
        </ol>
        <Pagination
          page={revisions.data.page}
          totalPages={revisions.data.pageCount}
          hrefForPage={(page) => `${base}&pagina=${page}`}
        />
      </section>
    </div>
  );
}
