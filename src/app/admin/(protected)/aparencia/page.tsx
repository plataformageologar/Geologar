import type { Metadata } from "next";

import { FormMessage } from "@/components/admin/form-controls";
import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { AppearanceEditor } from "@/components/admin/site/cms-editors";
import { LoadError, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aparência",
};

export default async function AppearancePage() {
  const access = await requireAdminAccess();
  const isAdmin = access.role === "admin";
  const doc = isAdmin ? await getEditorialDocument("appearance", "appearance") : null;
  const current = doc?.status === "ready" ? doc.data?.current.appearance : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Aparência"
        description="Cores, fundo, botões, cantos, cards e fonte dos títulos. As opções são controladas para manter a identidade e a legibilidade do portal."
        visualHref={isAdmin ? "/admin/editor?pagina=%2F" : undefined}
      />

      {!isAdmin ? (
        <FormMessage tone="warning">A aparência do site é alterada somente por administradores.</FormMessage>
      ) : doc?.status === "error" ? (
        <LoadError subject="a aparência do site" />
      ) : doc?.status === "ready" && doc.data && current ? (
        <EditorialScope
          doc={docInfo(doc.data)}
          canPublish
          previewHref="/admin/editor?pagina=%2F"
          loginNext="/admin/aparencia"
        >
          <AppearanceEditor initial={current} />
        </EditorialScope>
      ) : (
        <FormMessage tone="warning">
          O registro de aparência não existe no banco de dados; o site usa a aparência padrão. A equipe técnica
          deve reaplicar a migration de personalização (veja <code>docs/visual-editor.md</code>).
        </FormMessage>
      )}
    </div>
  );
}
