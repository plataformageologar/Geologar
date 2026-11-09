import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { FormMessage } from "@/components/admin/form-controls";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { SocialLinkForm } from "@/components/admin/settings/social-link-form";
import { ActiveBadge } from "@/components/admin/status-badges";
import { emptySocialLinkValues, platformLabel, toSocialLinkFormValues } from "@/lib/admin/social-links";
import { isUuid } from "@/lib/admin/validation";
import { requireAdminAccess } from "@/lib/auth/access";
import { getSocialLinksForAdmin } from "@/lib/queries/admin-institutional";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redes sociais",
};

const activeLabels = { on: "Ativar", off: "Desativar", turningOn: "Ativando…", turningOff: "Desativando…" };

export default async function SocialLinksPage({ searchParams }: PageProps<"/admin/redes-sociais">) {
  const access = await requireAdminAccess();
  const query = await searchParams;
  const isAdmin = access.role === "admin";

  const editParam = firstParam(query.editar);
  if (editParam !== undefined && !isUuid(editParam)) notFound();

  const result = await getSocialLinksForAdmin();
  const editing =
    result.status === "ready" && editParam ? (result.data.find((item) => item.id === editParam) ?? null) : null;
  if (result.status === "ready" && editParam && !editing) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">Redes sociais</h1>
        <p className="text-body text-muted-foreground">
          Perfis institucionais exibidos no rodapé do portal. Somente links ativos aparecem no site.
        </p>
      </div>

      {!isAdmin && (
        <FormMessage tone="warning">
          Você pode consultar as redes sociais. Cadastrar, editar, ativar e excluir é restrito a administradores.
        </FormMessage>
      )}

      {result.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar as redes sociais. Nada foi alterado. Recarregue a página em instantes; se o
          problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:items-start">
          <RecordFeedbackProvider>
            {result.data.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
                <h2 className="text-h4 font-sans">Nenhuma rede social cadastrada</h2>
                <p className="text-body-sm text-muted-foreground">
                  {isAdmin
                    ? "Cadastre os perfis oficiais da rede; enquanto não houver links ativos, o rodapé não mostra a seção de redes sociais."
                    : "Enquanto não houver links ativos, o rodapé não mostra a seção de redes sociais."}
                </p>
              </div>
            ) : (
              <section aria-labelledby="lista-redes-title" className="flex flex-col gap-4">
                <h2 id="lista-redes-title" className="sr-only">
                  Lista de redes sociais
                </h2>
                <p className="text-body-sm text-muted-foreground" aria-live="polite">
                  {result.data.length === 1 ? "1 rede social" : `${result.data.length} redes sociais`}, na ordem do
                  rodapé.
                </p>
                <ul className="flex flex-col gap-4">
                  {result.data.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
                      aria-current={editing?.id === item.id ? "true" : undefined}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className="break-words text-h4 font-sans">{platformLabel(item.platform)}</h3>
                          {item.label && <p className="break-words text-body-sm text-muted-foreground">{item.label}</p>}
                        </div>
                        <ActiveBadge active={item.is_active} />
                      </div>
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-body-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="flex min-w-0 flex-col gap-1">
                          <dt className="text-caption text-muted-foreground">Endereço</dt>
                          <dd className="break-all">{item.url}</dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-caption text-muted-foreground">Ordem</dt>
                          <dd>{item.sort_order}</dd>
                        </div>
                      </dl>
                      {isAdmin && (
                        <RecordRowActions
                          entity="social-link"
                          id={item.id}
                          title={`${platformLabel(item.platform)}${item.label ? ` (${item.label})` : ""}`}
                          isPublished={item.is_active}
                          toggleLabels={activeLabels}
                          editHref={`/admin/redes-sociais?editar=${item.id}#rede-form-title`}
                          publicHref={item.url}
                          publicLabel="Abrir perfil"
                          canDelete
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </RecordFeedbackProvider>

          {isAdmin && (
            <div className="flex flex-col gap-4">
              {editing && (
                <Link
                  href="/admin/redes-sociais"
                  className="inline-flex min-h-11 w-fit items-center gap-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Cadastrar nova rede em vez de editar
                </Link>
              )}
              <SocialLinkForm
                key={editing?.id ?? "nova"}
                recordId={editing?.id ?? null}
                initialValues={editing ? toSocialLinkFormValues(editing) : emptySocialLinkValues}
                initialUpdatedAt={editing?.updated_at ?? null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
