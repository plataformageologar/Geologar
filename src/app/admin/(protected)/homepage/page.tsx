import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { EditorialScope } from "@/components/admin/editorial/editorial-scope";
import { FormMessage } from "@/components/admin/form-controls";
import { HomepageForm } from "@/components/admin/homepage/homepage-form";
import { VisualEditLink } from "@/components/admin/site/page-intro";
import { requireAdminAccess } from "@/lib/auth/access";
import { toHomepageValues } from "@/lib/editorial/content";
import { docInfo, getEditorialDocument } from "@/lib/queries/editorial";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editar homepage",
};

export default async function AdminHomepagePage() {
  await requireAdminAccess();
  const doc = await getEditorialDocument("home", "home");
  const homepage = doc.status === "ready" ? doc.data?.current.homepage : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1">Editar homepage</h1>
            <p className="text-body text-muted-foreground">
              Gerencie os textos e botões apresentados na página inicial do portal GeoLogar. A ordem
              e a visibilidade das seções ficam em{" "}
              <Link href="/admin/secoes" className="font-semibold text-primary underline underline-offset-2">
                Seções e blocos
              </Link>
              . Salvar guarda um rascunho; o site público muda só quando você publicar.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 self-start">
            <VisualEditLink href="/admin/editor?pagina=%2F" />
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-primary px-5 text-label text-primary transition-colors hover:bg-primary-soft"
            >
              Ver site publicado
              <ExternalLink aria-hidden="true" className="size-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        </div>
      </div>

      {doc.status === "error" && (
        <FormMessage tone="error">
          Não foi possível carregar o conteúdo atual da homepage. Nada foi alterado. Recarregue a
          página em instantes; se o problema continuar, contate a equipe técnica.
        </FormMessage>
      )}

      {doc.status === "ready" && doc.data && homepage && (
        <EditorialScope
          doc={docInfo(doc.data)}
          canPublish
          previewHref="/admin/editor?pagina=%2F"
          loginNext="/admin/homepage"
        >
          <HomepageForm initialValues={toHomepageValues(homepage)} />
        </EditorialScope>
      )}

      {doc.status === "ready" && !homepage && (
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
