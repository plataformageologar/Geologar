import type { Metadata } from "next";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { InstitutionForm } from "@/components/admin/institutions/institution-form";
import { emptyInstitutionValues } from "@/lib/admin/institutions";
import { requireAdminAccess } from "@/lib/auth/access";
import { getCategoriesForAdmin } from "@/lib/queries/admin-institutional";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova instituição",
};

export default async function NewInstitutionPage() {
  const access = await requireAdminAccess();
  const categories = await getCategoriesForAdmin();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/instituicoes", label: "Instituições" }}
        title="Nova instituição"
        description="A instituição é criada como rascunho, a menos que você marque “Publicar no site”."
      />
      {categories.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar as categorias necessárias para o cadastro. Recarregue a página em
          instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <InstitutionForm
          recordId={null}
          initialValues={emptyInstitutionValues}
          initialUpdatedAt={null}
          categories={categories.data.map(({ id, name }) => ({ id, name }))}
          hasLogo={false}
          logoSrc={null}
          canManageCategories={access.role === "admin"}
        />
      )}
    </div>
  );
}
