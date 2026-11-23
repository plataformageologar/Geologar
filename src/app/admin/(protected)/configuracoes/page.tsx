import type { Metadata } from "next";

import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { FormMessage } from "@/components/admin/form-controls";
import { SiteSettingsForm } from "@/components/admin/settings/site-settings-form";
import { toSiteSettingsFormValues } from "@/lib/admin/site-settings";
import { requireAdminAccess } from "@/lib/auth/access";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";
import { getSiteSettingsForEdit } from "@/lib/queries/admin-institutional";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurações",
};

function LoadFailure() {
  return (
    <FormMessage tone="error">
      Não foi possível carregar as informações institucionais. Nada foi alterado. Recarregue a página em
      instantes; se o problema continuar, contate a equipe técnica.
    </FormMessage>
  );
}

function MissingRecord() {
  return (
    <FormMessage tone="error">
      O registro de informações institucionais não existe no banco de dados, e o site está usando valores
      padrão. Ele é criado pelas migrations do projeto; peça à equipe técnica para verificar o banco (este
      formulário não cria o registro).
    </FormMessage>
  );
}

export default async function SiteSettingsPage() {
  const access = await requireAdminAccess();
  const isAdmin = access.role === "admin";

  // Administradores editam o rascunho; editores consultam a versão publicada.
  const [doc, published] = await Promise.all([
    isAdmin ? getEditorialDocument("settings", "settings") : null,
    isAdmin ? null : getSiteSettingsForEdit(),
  ]);
  const settings = doc?.status === "ready" ? doc.data?.current.settings : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Configurações</h1>
        <p className="text-body text-muted-foreground">
          Informações institucionais usadas no cabeçalho, no rodapé, na página de contato e nos metadados do site.
          {isAdmin && " Salvar guarda um rascunho; o site muda só ao publicar."}
        </p>
      </div>

      {isAdmin ? (
        doc?.status === "error" ? (
          <LoadFailure />
        ) : doc?.status === "ready" && doc.data && settings ? (
          <EditorialScope
            doc={docInfo(doc.data)}
            canPublish
            previewHref="/admin/editor?pagina=%2Fcontato"
            loginNext="/admin/configuracoes"
          >
            <SiteSettingsForm initialValues={toSiteSettingsFormValues(settings)} readOnly={false} />
          </EditorialScope>
        ) : (
          <MissingRecord />
        )
      ) : (
        <>
          <FormMessage tone="warning">
            Você pode consultar estas informações (versão publicada). A edição é restrita a administradores.
          </FormMessage>
          {published?.status !== "ready" ? (
            <LoadFailure />
          ) : published.data === null ? (
            <MissingRecord />
          ) : (
            <SiteSettingsForm initialValues={toSiteSettingsFormValues(published.data.record)} readOnly />
          )}
        </>
      )}
    </div>
  );
}
