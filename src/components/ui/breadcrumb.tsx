import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  /** Ausente no último item (a página atual). */
  href?: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="underline decoration-border underline-offset-4 hover:text-primary hover:decoration-primary"
              >
                {item.label}
              </Link>
            ) : (
              // Título longo da página atual: uma linha (o `h1` mostra o texto completo).
              <span
                aria-current="page"
                title={item.label}
                className="max-w-[min(36rem,70vw)] truncate font-semibold text-foreground"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
