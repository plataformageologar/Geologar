import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Monta o link de cada página, preservando os filtros ativos. */
  hrefForPage: (page: number) => string;
};

const linkClasses =
  "inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-label text-foreground transition-colors hover:border-primary/40 hover:text-primary";

/** Paginação simples (anterior/próxima), funcional sem JavaScript. */
export function Pagination({ page, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="mt-12 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        {page > 1 && (
          <Link href={hrefForPage(page - 1)} rel="prev" className={linkClasses}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            Anterior
          </Link>
        )}
      </div>
      <p className="text-body-sm text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="min-w-0">
        {page < totalPages && (
          <Link href={hrefForPage(page + 1)} rel="next" className={linkClasses}>
            Próxima
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
