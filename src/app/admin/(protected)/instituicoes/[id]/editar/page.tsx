import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { InstitutionForm } from "@/components/admin/institutions/institution-form";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { toInstitutionFormValues } from "@/lib/admin/institutions";
import { requireAdminAccess } from "@/lib/auth/access";
import { getCategoriesForAdmin, getInstitutionForEdit } from "@/lib/queries/admin-institutional";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar instituição",
};

export default async function EditInstitutionPage({
  params,
  searchParams,
}: PageProps<"/admin/instituicoes/[id]/editar">) {
  const access = await requireAdminAccess();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [result, categories] = await Promise.all([getInstitutionForEdit(id), getCategoriesForAdmin()]);

  if (result.status === "ready" && !result.data) notFound();

  if (result.status === "error" || categories.status === "error" || !result.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <AdminPageHeading back={{ href: "/admin/instituicoes", label: "Instituições" }} title="Editar instituição" />
        <FormMessage tone="error">
          Não foi possível carregar a instituição. Nada foi alterado. Recarregue a página em instantes;
          se o problema continuar, contate a equipe técnica.
        </FormMessage>
      </div>
    );
  }

  const institution = result.data;
  const created = firstParam(query.criado);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/instituicoes", label: "Instituições" }}
        title={institution.record.name}
        badges={
          <>
            <PublicationBadge published={institution.record.is_published} />
            {institution.record.is_featured && <FeaturedBadge featured />}
          </>
        }
        publicHref={institution.record.is_published ? "/instituicoes" : null}
      />
      {(created === "rascunho" || created === "publicado") && (
        <FormMessage tone="success">
          Instituição criada{created === "publicado" ? " e publicada" : " como rascunho"}. Continue a edição
          abaixo ou volte à listagem.
        </FormMessage>
      )}
      <InstitutionForm
        key={institution.id}
        recordId={institution.id}
        initialValues={toInstitutionFormValues(institution.record)}
        initialUpdatedAt={institution.updatedAt}
        categories={categories.data.map(({ id: categoryId, name }) => ({ id: categoryId, name }))}
        hasLogo={institution.hasLogo}
        logoSrc={institution.logoSrc}
        canManageCategories={access.role === "admin"}
      />
    </div>
  );
}
