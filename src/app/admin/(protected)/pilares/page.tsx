import type { Metadata } from "next";

import { PillarsEditor } from "@/components/admin/site/cms-editors";
import { LoadError, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { getPillarsForEdit } from "@/lib/queries/site-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pilares da rede",
};

export default async function PillarsPage() {
  await requireAdminAccess();
  const pillars = await getPillarsForEdit();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SitePageIntro
        title="Pilares da rede"
        description="Os pilares aparecem na apresentação da página inicial e em A Rede. Os ícones são escolhidos de uma lista fixa."
        visualHref="/admin/editor?pagina=%2Frede"
      />
      {pillars.status === "error" ? (
        <LoadError subject="os pilares" />
      ) : (
        <PillarsEditor initial={pillars.data} />
      )}
    </div>
  );
}
