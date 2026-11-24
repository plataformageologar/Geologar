import type { Metadata } from "next";

import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { ExperiencesEditor } from "@/components/admin/site/cms-editors";
import { LoadError, SitePageIntro } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { toSectionDrafts } from "@/lib/editorial/content";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";
import { AVAILABILITY_LABELS, type Experience } from "@/lib/site/experiences";
import type { SectionDraft } from "@/lib/site/sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experiências digitais",
};

function experiencesOf(sections: SectionDraft[]): { section: SectionDraft | null; items: Experience[] } {
  const section = sections.find((item) => item.section_type === "experiences") ?? null;
  return { section, items: section?.settings.experiences ?? [] };
}

export default async function ExperiencesPage() {
  await requireAdminAccess();
  const doc = await getEditorialDocument("home", "home");

  if (doc.status === "error" || !doc.data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <SitePageIntro title="Experiências digitais" description="Cards das experiências interativas da página inicial." />
        <LoadError subject="a página inicial" />
      </div>
    );
  }

  const current = toSectionDrafts(doc.data.current.sections ?? []);
  const published = experiencesOf(toSectionDrafts(doc.data.published?.sections ?? []));
  const draft = experiencesOf(current);
  const publishedIds = new Set(published.section?.is_visible ? published.items.filter((item) => item.is_visible).map((item) => item.id) : []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SitePageIntro
        title="Experiências digitais"
        description="Cards das experiências interativas (tours 360°, aplicações 3D, mapas…) exibidos na página inicial, logo abaixo do banner. Cada card leva a uma aplicação externa, aberta só quando o visitante clica. Salvar guarda um rascunho; o site muda só ao publicar a página inicial."
        visualHref="/admin/editor?pagina=%2F"
      />

      <section aria-labelledby="experiencias-resumo" className="flex flex-col gap-3">
        <h2 id="experiencias-resumo" className="text-h4 font-sans">
          Resumo
        </h2>
        {draft.items.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Nenhuma experiência no rascunho atual.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[32rem] text-left text-body-sm">
              <thead className="bg-surface-muted text-label">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Experiência
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Disponibilidade
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Visibilidade
                  </th>
                  <th scope="col" className="px-4 py-3">
                    No site agora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {draft.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {item.title}
                    </th>
                    <td className="px-4 py-3">{AVAILABILITY_LABELS[item.availability]}</td>
                    <td className="px-4 py-3">{item.is_visible && draft.section?.is_visible ? "Visível" : "Oculta"}</td>
                    <td className="px-4 py-3">{publishedIds.has(item.id) ? "Publicada" : "Ainda não publicada"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-caption text-muted-foreground">
          “No site agora” considera a última versão publicada. Publicar aplica todas as alterações pendentes da página
          inicial (banner, seções e experiências) de uma vez.
        </p>
      </section>

      <EditorialScope
        doc={docInfo(doc.data)}
        canPublish
        previewHref="/admin/editor?pagina=%2F"
        loginNext="/admin/experiencias"
      >
        <ExperiencesEditor initial={current} canUpload />
      </EditorialScope>
    </div>
  );
}
