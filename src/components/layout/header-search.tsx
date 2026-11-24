import { Search } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Campo de busca do cabeçalho: formulário GET simples para /busca (funciona
 * sem JavaScript). A busca percorre só o conteúdo publicado.
 */
export function HeaderSearch({ id, className }: { id: string; className?: string }) {
  return (
    <form action="/busca" method="get" role="search" aria-label="Buscar no site" className={cn("flex", className)}>
      <label htmlFor={id} className="sr-only">
        Buscar no site
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Buscar no site"
        minLength={2}
        maxLength={80}
        required
        className="min-h-11 w-full min-w-0 rounded-l-[var(--button-radius)] border border-r-0 border-border bg-surface px-4 text-body-sm text-foreground placeholder:text-muted-foreground lg:w-56 xl:w-64"
      />
      <button
        type="submit"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-[var(--button-radius)] border border-border bg-surface-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="sr-only">Buscar</span>
      </button>
    </form>
  );
}
