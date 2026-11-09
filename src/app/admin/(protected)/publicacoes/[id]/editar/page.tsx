import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { PublicationForm } from "@/components/admin/publications/publication-form";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { toPublicationFormValues } from "@/lib/admin/publications";
import { requireAdminAccess } from "@/lib/auth/access";
import { getResearchLineOptions } from "@/lib/queries/admin-content";
import { getProjectOptions, getPublicationForEdit } from "@/lib/queries/admin-publications";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar publicação",
};

export default async function EditPublicationPage({
  params,
  searchParams,
}: PageProps<"/admin/publicacoes/[id]/editar">) {
  await requireAdminAccess();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [result, projects, lines] = await Promise.all([
    getPublicationForEdit(id),
    getProjectOptions(),
    getResearchLineOptions(),
  ]);

  if (result.status === "ready" && !result.data) notFound();

  if (result.status === "error" || projects.status === "error" || lines.status === "error" || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <AdminPageHeading back={{ href: "/admin/publicacoes", label: "Publicações" }} title="Editar publicação" />
        <FormMessage tone="error">
          Não foi possível carregar a publicação. Nada foi alterado. Recarregue a página em instantes;
          se o problema continuar, contate a equipe técnica.
        </FormMessage>
      </div>
    );
  }

  const publication = result.data;
  // Situação no momento da criação (o registro pode ter mudado depois).
  const created = firstParam(query.criado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/publicacoes", label: "Publicações" }}
        title={publication.record.title}
        badges={
          <>
            <PublicationBadge published={publication.record.is_published} />
            {publication.record.is_featured && <FeaturedBadge featured />}
          </>
        }
        publicHref={publication.record.is_published ? "/publicacoes" : null}
      />
      {(created === "rascunho" || created === "publicado") && (
        <FormMessage tone="success">
          Publicação criada{created === "publicado" ? " e publicada" : " como rascunho"}. Continue a edição
          abaixo ou volte à listagem.
        </FormMessage>
      )}
      <PublicationForm
        key={publication.id}
        recordId={publication.id}
        initialValues={toPublicationFormValues(publication.record, publication.projectIds, publication.researchLineIds)}
        initialUpdatedAt={publication.updatedAt}
        projects={projects.data}
        researchLines={lines.data}
      />
    </div>
  );
}
