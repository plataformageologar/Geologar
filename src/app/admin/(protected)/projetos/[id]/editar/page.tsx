import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { ProjectForm } from "@/components/admin/projects/project-form";
import { FeaturedBadge, ProjectStatusBadge, PublicationBadge } from "@/components/admin/status-badges";
import { toProjectFormValues } from "@/lib/admin/projects";
import { requireAdminAccess } from "@/lib/auth/access";
import { getProjectForEdit, getResearchLineOptions } from "@/lib/queries/admin-content";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar projeto",
};

export default async function EditProjectPage({
  params,
  searchParams,
}: PageProps<"/admin/projetos/[id]/editar">) {
  await requireAdminAccess();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [result, lines] = await Promise.all([getProjectForEdit(id), getResearchLineOptions()]);

  if (result.status === "ready" && !result.data) notFound();

  if (result.status === "error" || lines.status === "error" || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <AdminPageHeading back={{ href: "/admin/projetos", label: "Projetos" }} title="Editar projeto" />
        <FormMessage tone="error">
          Não foi possível carregar o projeto. Nada foi alterado. Recarregue a página em instantes; se o
          problema continuar, contate a equipe técnica.
        </FormMessage>
      </div>
    );
  }

  const project = result.data;
  // Situação no momento da criação (o registro pode ter mudado depois).
  const created = firstParam(query.criado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/projetos", label: "Projetos" }}
        title={project.record.title}
        badges={
          <>
            <PublicationBadge published={project.record.is_published} />
            <ProjectStatusBadge status={project.record.project_status} />
            {project.record.is_featured && <FeaturedBadge featured />}
          </>
        }
        publicHref={project.record.is_published ? `/projetos/${project.record.slug}` : null}
      />
      {(created === "rascunho" || created === "publicado") && (
        <FormMessage tone="success">
          Projeto criado{created === "publicado" ? " e publicado" : " como rascunho"}. Continue a edição abaixo ou volte à listagem.
        </FormMessage>
      )}
      <ProjectForm
        key={project.id}
        recordId={project.id}
        initialValues={toProjectFormValues(project.record, project.researchLineIds)}
        initialUpdatedAt={project.updatedAt}
        hasImage={project.hasImage}
        imageSrc={project.imageSrc}
        researchLines={lines.data}
      />
    </div>
  );
}
