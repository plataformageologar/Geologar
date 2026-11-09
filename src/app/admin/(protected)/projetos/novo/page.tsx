import type { Metadata } from "next";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { ProjectForm } from "@/components/admin/projects/project-form";
import { emptyProjectValues } from "@/lib/admin/projects";
import { requireAdminAccess } from "@/lib/auth/access";
import { getResearchLineOptions } from "@/lib/queries/admin-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novo projeto",
};

export default async function NewProjectPage() {
  await requireAdminAccess();
  const lines = await getResearchLineOptions();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/projetos", label: "Projetos" }}
        title="Novo projeto"
        description="O projeto é criado como rascunho, a menos que você marque “Publicar no site”."
      />
      {lines.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar as linhas de pesquisa necessárias para o cadastro. Recarregue a
          página em instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <ProjectForm
          recordId={null}
          initialValues={emptyProjectValues}
          initialUpdatedAt={null}
          hasImage={false}
          imageSrc={null}
          researchLines={lines.data}
        />
      )}
    </div>
  );
}
