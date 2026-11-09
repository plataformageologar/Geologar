import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { FormMessage } from "@/components/admin/form-controls";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth/access";
import { getResearchLinesForAdmin } from "@/lib/queries/admin-content";
import { formatAdminDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Linhas de pesquisa",
};

function projectsLabel(count: number) {
  if (count === 0) return "Nenhum projeto vinculado";
  return count === 1 ? "1 projeto vinculado" : `${count} projetos vinculados`;
}

export default async function AdminResearchLinesPage() {
  const access = await requireAdminAccess();
  const result = await getResearchLinesForAdmin();
  const canDelete = access.role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Linhas de pesquisa</h1>
          <p className="text-body text-muted-foreground">
            Gerencie as áreas de pesquisa da GeoLogar e controle quais aparecem no portal.
          </p>
        </div>
        <Button href="/admin/linhas-de-pesquisa/novo" className="shrink-0 self-start">
          <Plus aria-hidden="true" className="size-4" />
          Nova linha de pesquisa
        </Button>
      </div>

      <FormMessage tone="info">
        Somente linhas <strong className="font-semibold">publicadas</strong> aparecem no site. As
        marcadas como destaque vêm primeiro na homepage (até seis linhas são exibidas).
      </FormMessage>

      {/* O provedor envolve também o estado vazio: a confirmação de exclusão do
          último item continua visível depois que a lista se esvazia. */}
      <RecordFeedbackProvider>
        {result.status === "error" ? (
          <FormMessage tone="error">
            Não foi possível carregar as linhas de pesquisa. Nada foi alterado. Recarregue a página em
            instantes; se o problema continuar, contate a equipe técnica.
          </FormMessage>
        ) : result.data.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <h2 className="text-h4 font-sans">Nenhuma linha de pesquisa cadastrada</h2>
            <p className="text-body-sm text-muted-foreground">
              Cadastre a primeira linha; ela começa como rascunho e só aparece no site depois de publicada.
            </p>
          </div>
        ) : (
          <section aria-labelledby="lista-linhas-title" className="flex flex-col gap-4">
            <h2 id="lista-linhas-title" className="sr-only">
              Lista de linhas de pesquisa
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {result.data.length === 1 ? "1 linha cadastrada" : `${result.data.length} linhas cadastradas`},
              em ordem de exibição.
            </p>

            {/* Telas pequenas: cartões. */}
            <ul className="flex flex-col gap-4 xl:hidden">
              {result.data.map((line) => (
                <li key={line.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-h4 font-sans">{line.title}</h3>
                    <p className="break-all text-caption text-muted-foreground">/pesquisa/{line.slug}</p>
                    <p className="text-caption text-muted-foreground">{projectsLabel(line.projectCount)}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Situação</dt>
                      <dd><PublicationBadge published={line.is_published} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Destaque</dt>
                      <dd><FeaturedBadge featured={line.is_featured} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Ordem</dt>
                      <dd className="tabular-nums">{line.sort_order}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Atualizada em</dt>
                      <dd>{formatAdminDateTime(line.updated_at)}</dd>
                    </div>
                  </dl>
                  <RecordRowActions
                    entity="research-line"
                    id={line.id}
                    title={line.title}
                    isPublished={line.is_published}
                    editHref={`/admin/linhas-de-pesquisa/${line.id}/editar`}
                    publicHref={`/pesquisa/${line.slug}`}
                    canDelete={canDelete && !line.is_published}
                  />
                </li>
              ))}
            </ul>

            {/* Telas largas: tabela. */}
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface xl:block">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-border bg-surface-muted text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">Título</th>
                    <th scope="col" className="px-3 py-3">Situação</th>
                    <th scope="col" className="px-3 py-3">Destaque</th>
                    <th scope="col" className="px-3 py-3 text-right">Ordem</th>
                    <th scope="col" className="px-3 py-3">Atualizada em</th>
                    <th scope="col" className="px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.map((line) => (
                    <tr key={line.id} className="align-top">
                      <th scope="row" className="max-w-xs px-5 py-4 font-normal">
                        <span className="block font-semibold text-foreground">{line.title}</span>
                        <span className="block break-all text-caption text-muted-foreground">{line.slug}</span>
                        <span className="block text-caption text-muted-foreground">{projectsLabel(line.projectCount)}</span>
                      </th>
                      <td className="px-3 py-4"><PublicationBadge published={line.is_published} /></td>
                      <td className="px-3 py-4"><FeaturedBadge featured={line.is_featured} /></td>
                      <td className="px-3 py-4 text-right tabular-nums">{line.sort_order}</td>
                      <td className="whitespace-nowrap px-3 py-4">{formatAdminDateTime(line.updated_at)}</td>
                      <td className="px-5 py-4">
                        <RecordRowActions
                          entity="research-line"
                          id={line.id}
                          title={line.title}
                          isPublished={line.is_published}
                          editHref={`/admin/linhas-de-pesquisa/${line.id}/editar`}
                          publicHref={`/pesquisa/${line.slug}`}
                          canDelete={canDelete && !line.is_published}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </RecordFeedbackProvider>
    </div>
  );
}
