import type { Metadata } from "next";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { ResearchLineForm } from "@/components/admin/research-lines/research-line-form";
import { emptyResearchLineValues } from "@/lib/admin/research-lines";
import { requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova linha de pesquisa",
};

export default async function NewResearchLinePage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/linhas-de-pesquisa", label: "Linhas de pesquisa" }}
        title="Nova linha de pesquisa"
        description="A linha é criada como rascunho, a menos que você marque “Publicar no site”."
      />
      <ResearchLineForm
        recordId={null}
        initialValues={emptyResearchLineValues}
        initialUpdatedAt={null}
        hasImage={false}
        imageSrc={null}
      />
    </div>
  );
}
