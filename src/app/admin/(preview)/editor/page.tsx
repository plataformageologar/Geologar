import type { Metadata } from "next";
import Link from "next/link";

import { VisualEditor } from "@/components/admin/editor/visual-editor";
import { requireAdminAccess } from "@/lib/auth/access";
import { getEditorDocument } from "@/lib/queries/editor";
import { getCustomPageIdBySlug } from "@/lib/queries/editorial";
import { EDITOR_PAGES, resolveEditorPage } from "@/lib/site/editor-pages";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Editor visual",
};

/**
 * Editor visual (admin e editor). `pagina` só aceita as páginas públicas
 * listadas em EDITOR_PAGES, um detalhe com slug válido ou uma página
 * personalizada existente (/paginas/<endereço>); qualquer outro valor mostra
 * a lista de páginas, sem tentar abrir o endereço.
 */
export default async function VisualEditorPage({ searchParams }: PageProps<"/admin/editor">) {
  const access = await requireAdminAccess();
  const query = await searchParams;
  let page = resolveEditorPage(firstParam(query.pagina) ?? "/");

  if (!page) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-h2">Página não disponível no editor</h1>
        <p className="text-body text-muted-foreground">
          O endereço pedido não é uma página editável do portal. Escolha uma das páginas abaixo.
        </p>
        <ul className="flex flex-col gap-2">
          {EDITOR_PAGES.map((item) => (
            <li key={item.path}>
              <Link
                href={`/admin/editor?pagina=${encodeURIComponent(item.path)}`}
                className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-4"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/admin" className="text-label text-primary underline underline-offset-4">
          Voltar ao CMS
        </Link>
      </main>
    );
  }

  // Página personalizada: precisa existir e não estar arquivada.
  let customPage: { id: string; status: "draft" | "published" | "archived" } | null = null;
  if (page.kind === "custom") {
    const found = await getCustomPageIdBySlug(page.slug);
    if (found.status === "error" || !found.data || found.data.status === "archived") {
      return (
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
          <h1 className="text-h2">Página não disponível no editor</h1>
          <p className="text-body text-muted-foreground">
            {found.status === "error"
              ? "Não foi possível carregar a página. Recarregue em instantes."
              : found.data?.status === "archived"
                ? "Esta página está arquivada. Reative-a em Páginas para editar."
                : "Não existe página personalizada com este endereço."}
          </p>
          <Link href="/admin/paginas" className="text-label text-primary underline underline-offset-4">
            Ir para Páginas
          </Link>
        </main>
      );
    }
    customPage = { id: found.data.id, status: found.data.status };
    page = { ...page, label: found.data.title };
  }

  const doc = await getEditorDocument(page, access.role, customPage);
  return (
    <main className="contents">
      <h1 className="sr-only">Editor visual: {page.label}</h1>
      {/* Nova página: novo estado (rascunho, histórico e seleção). */}
      <VisualEditor key={page.path} doc={doc} />
    </main>
  );
}
