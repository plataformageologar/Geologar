import type { Metadata } from "next";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { PublicationForm } from "@/components/admin/publications/publication-form";
import { emptyPublicationValues } from "@/lib/admin/publications";
import { requireAdminAccess } from "@/lib/auth/access";
import { getResearchLineOptions } from "@/lib/queries/admin-content";
import { getProjectOptions } from "@/lib/queries/admin-publications";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova publicação",
};

export default async function NewPublicationPage() {
  await requireAdminAccess();
  const [projects, lines] = await Promise.all([getProjectOptions(), getResearchLineOptions()]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/publicacoes", label: "Publicações" }}
        title="Nova publicação"
        description="A publicação é criada como rascunho, a menos que você marque “Publicar no site”."
      />
      {projects.status === "error" || lines.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar os projetos e as linhas de pesquisa necessários para o cadastro.
          Recarregue a página em instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <PublicationForm
          recordId={null}
          initialValues={emptyPublicationValues}
          initialUpdatedAt={null}
          projects={projects.data}
          researchLines={lines.data}
        />
      )}
    </div>
  );
}
