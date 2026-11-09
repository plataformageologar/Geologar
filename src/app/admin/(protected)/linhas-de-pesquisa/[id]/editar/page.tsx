import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { ResearchLineForm } from "@/components/admin/research-lines/research-line-form";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { toResearchLineFormValues } from "@/lib/admin/research-lines";
import { requireAdminAccess } from "@/lib/auth/access";
import { getResearchLineForEdit } from "@/lib/queries/admin-content";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar linha de pesquisa",
};

export default async function EditResearchLinePage({
  params,
  searchParams,
}: PageProps<"/admin/linhas-de-pesquisa/[id]/editar">) {
  await requireAdminAccess();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await getResearchLineForEdit(id);

  if (result.status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <AdminPageHeading
          back={{ href: "/admin/linhas-de-pesquisa", label: "Linhas de pesquisa" }}
          title="Editar linha de pesquisa"
        />
        <FormMessage tone="error">
          Não foi possível carregar a linha de pesquisa. Nada foi alterado. Recarregue a página em
          instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      </div>
    );
  }
  if (!result.data) notFound();

  const line = result.data;
  // Situação no momento da criação (o registro pode ter mudado depois).
  const created = firstParam(query.criado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/linhas-de-pesquisa", label: "Linhas de pesquisa" }}
        title={line.record.title}
        badges={
          <>
            <PublicationBadge published={line.record.is_published} />
            {line.record.is_featured && <FeaturedBadge featured />}
          </>
        }
        publicHref={line.record.is_published ? `/pesquisa/${line.record.slug}` : null}
      />
      {(created === "rascunho" || created === "publicado") && (
        <FormMessage tone="success">
          Linha de pesquisa criada{created === "publicado" ? " e publicada" : " como rascunho"}. Continue a edição abaixo ou volte à listagem.
        </FormMessage>
      )}
      <ResearchLineForm
        key={line.id}
        recordId={line.id}
        initialValues={toResearchLineFormValues(line.record)}
        initialUpdatedAt={line.updatedAt}
        hasImage={line.hasImage}
        imageSrc={line.imageSrc}
      />
    </div>
  );
}
