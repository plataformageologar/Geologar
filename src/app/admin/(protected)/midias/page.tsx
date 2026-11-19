import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { MediaBrowser } from "@/components/admin/media/media-browser";
import { requireAdminAccess } from "@/lib/auth/access";
import { getMediaLibrary } from "@/lib/queries/admin-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biblioteca de mídia",
};

export default async function MediaLibraryPage() {
  const access = await requireAdminAccess();
  const isAdmin = access.role === "admin";
  const result = await getMediaLibrary({ page: 1 });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">Biblioteca de mídia</h1>
        <p className="text-body text-muted-foreground">
          Envie e gerencie as imagens utilizadas no portal GeoLogar.
        </p>
      </div>

      <FormMessage tone="info">
        Formatos aceitos: JPEG, PNG e WebP, até 5 MB por arquivo. As imagens enviadas ficam públicas (qualquer pessoa
        com a URL consegue abri-las): não envie documentos pessoais ou imagens restritas.
        {isAdmin
          ? " Somente imagens sem uso podem ser excluídas."
          : " A exclusão de arquivos é restrita a administradores."}
      </FormMessage>

      {result.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar a biblioteca. Nada foi alterado. Recarregue a página em instantes; se o problema
          continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <MediaBrowser initial={result.data} canUpload canDelete={isAdmin} />
      )}
    </div>
  );
}
