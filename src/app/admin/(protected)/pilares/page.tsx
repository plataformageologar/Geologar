import type { Metadata } from "next";

import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { PillarsEditor } from "@/components/admin/site/cms-editors";
import { LoadError, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { toPillarDrafts } from "@/lib/editorial/content";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pilares da rede",
};

export default async function PillarsPage() {
  await requireAdminAccess();
  const doc = await getEditorialDocument("pillars", "pillars");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Pilares da rede"
        description="Os pilares aparecem na apresentação da página inicial e em A Rede. Os ícones são escolhidos de uma lista fixa. Salvar guarda um rascunho; o site muda só ao publicar."
        visualHref="/admin/editor?pagina=%2Frede"
      />
      {doc.status === "error" || !doc.data ? (
        <LoadError subject="os pilares" />
      ) : (
        <EditorialScope
          doc={docInfo(doc.data)}
          canPublish
          previewHref="/admin/editor?pagina=%2Frede"
          loginNext="/admin/pilares"
        >
          <PillarsEditor initial={toPillarDrafts(doc.data.current.items ?? [])} />
        </EditorialScope>
      )}
    </div>
  );
}
