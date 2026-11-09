import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { SiteSettingsForm } from "@/components/admin/settings/site-settings-form";
import { toSiteSettingsFormValues } from "@/lib/admin/site-settings";
import { requireAdminAccess } from "@/lib/auth/access";
import { getSiteSettingsForEdit } from "@/lib/queries/admin-institutional";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function SiteSettingsPage() {
  const access = await requireAdminAccess();
  const result = await getSiteSettingsForEdit();
  const readOnly = access.role !== "admin";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Configurações</h1>
        <p className="text-body text-muted-foreground">
          Informações institucionais usadas no cabeçalho, no rodapé, na página de contato e nos metadados do site.
        </p>
      </div>

      {readOnly && (
        <FormMessage tone="warning">
          Você pode consultar estas informações. A edição é restrita a administradores.
        </FormMessage>
      )}

      {result.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar as informações institucionais. Nada foi alterado. Recarregue a página em
          instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : result.data === null ? (
        <FormMessage tone="error">
          O registro de informações institucionais não existe no banco de dados, e o site está usando valores
          padrão. Ele é criado pelas migrations do projeto; peça à equipe técnica para verificar o banco (este
          formulário não cria o registro).
        </FormMessage>
      ) : (
        <SiteSettingsForm
          initialValues={toSiteSettingsFormValues(result.data.record)}
          initialUpdatedAt={result.data.updatedAt}
          logoSrc={result.data.logoSrc}
          faviconSrc={result.data.faviconSrc}
          hasLogo={result.data.hasLogo}
          hasFavicon={result.data.hasFavicon}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
