import Link from "next/link";

import type { CustomPageSummary } from "@/lib/queries/editorial";

import { CustomPageStatusBadge } from "./custom-page-status";

/**
 * Páginas personalizadas na tela de Navegação: título, endereço para usar no
 * menu e situação. Páginas não publicadas recebem aviso: um link para elas
 * leva o visitante a "página não encontrada".
 */
export function CustomPagesHelp({ pages }: { pages: CustomPageSummary[] | null }) {
  return (
    <section aria-labelledby="paginas-personalizadas" className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:p-5">
      <h2 id="paginas-personalizadas" className="text-h4 font-sans">
        Páginas personalizadas
      </h2>
      <p className="text-body-sm text-muted-foreground">
        Para colocar uma página no menu, adicione um link com o endereço indicado. Páginas são criadas e publicadas
        em{" "}
        <Link href="/admin/paginas" className="font-semibold text-primary underline underline-offset-2">
          Páginas
        </Link>
        .
      </p>
      {pages === null ? (
        <p className="text-body-sm text-danger">Não foi possível carregar a lista de páginas.</p>
      ) : pages.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Nenhuma página personalizada criada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <li key={page.id} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-label">{page.title}</span>
                <CustomPageStatusBadge status={page.status} />
              </div>
              <code className="break-all text-body-sm">/paginas/{page.slug}</code>
              {page.status !== "published" && (
                <p className="text-caption font-semibold text-earth">
                  Não publicada: um link no menu para esta página levará o visitante a “página não encontrada”.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
