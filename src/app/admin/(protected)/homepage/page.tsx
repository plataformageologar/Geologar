import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { FormMessage } from "@/components/admin/form-controls";
import { HomepageForm } from "@/components/admin/homepage/homepage-form";
import { toFormValues } from "@/lib/admin/homepage";
import { requireAdminAccess } from "@/lib/auth/access";
import { getHomepageForEdit } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar homepage",
};

export default async function AdminHomepagePage() {
  await requireAdminAccess();
  const homepage = await getHomepageForEdit();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1">Editar homepage</h1>
            <p className="text-body text-muted-foreground">
              Gerencie os textos e botões apresentados na página inicial do portal GeoLogar.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-primary px-5 text-label text-primary transition-colors hover:bg-primary-soft"
          >
            Visualizar homepage
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
        {homepage.status === "ready" && (
          <FormMessage tone="info">
            Ao salvar, as alterações aparecem imediatamente no site público: não há rascunho
            nem etapa de publicação separada.
          </FormMessage>
        )}
      </div>

      {homepage.status === "ready" && (
        <HomepageForm
          initialValues={toFormValues(homepage.record)}
          initialUpdatedAt={homepage.updatedAt}
          hasImage={homepage.hasImage}
          imageSrc={homepage.imageSrc}
        />
      )}

      {homepage.status === "error" && (
        <FormMessage tone="error">
          Não foi possível carregar o conteúdo atual da homepage. Nada foi alterado. Recarregue a
          página em instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      )}

      {homepage.status === "missing" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-6">
          <h2 className="text-h4 font-sans">Configuração pendente</h2>
          <p className="text-body-sm text-muted-foreground">
            O registro de conteúdo da homepage não existe no banco de dados, então não há o que
            editar. O site público continua exibindo os textos padrão. A equipe técnica deve
            recriar o registro seguindo o procedimento de <code>docs/cms.md</code>.
          </p>
        </div>
      )}
    </div>
  );
}
