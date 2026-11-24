import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TextLink } from "@/components/ui/text-link";
import { parseSearchTerm, SEARCH_MIN_LENGTH, searchSite } from "@/lib/queries/search";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

/** Resultados de busca não são indexados pelos buscadores. */
export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: PageProps<"/busca">) {
  const query = await searchParams;
  const raw = firstParam(query.q) ?? "";
  const term = parseSearchTerm(raw);
  const { groups, failed } = term ? await searchSite(term) : { groups: [], failed: false };
  const total = groups.reduce((sum, group) => sum + group.results.length, 0);

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Busca" }]}
        title="Busca no site"
        description="Linhas de pesquisa, projetos, publicações, páginas e instituições publicados."
      />

      <Container className="section-y">
        <form
          action="/busca"
          method="get"
          role="search"
          aria-label="Buscar no site"
          className="mb-10 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="busca-pagina" className="text-label">
              O que você procura?
            </label>
            <input
              id="busca-pagina"
              name="q"
              type="search"
              defaultValue={term ?? raw.slice(0, 80)}
              minLength={SEARCH_MIN_LENGTH}
              maxLength={80}
              required
              className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-body-sm text-foreground"
            />
          </div>
          <Button type="submit">
            <Search aria-hidden="true" className="size-4" />
            Buscar
          </Button>
        </form>

        <div aria-live="polite">
          {!term ? (
            <p className="text-body text-muted-foreground">
              Digite pelo menos {SEARCH_MIN_LENGTH} caracteres para buscar.
            </p>
          ) : failed && total === 0 ? (
            <EmptyState
              title="Não foi possível concluir a busca agora."
              description="Tente novamente em instantes."
            />
          ) : total === 0 ? (
            <EmptyState
              title={`Nenhum resultado para “${term}”.`}
              description="Revise os termos ou navegue pelas seções do site."
            >
              <TextLink href="/pesquisa">Linhas de pesquisa</TextLink>
              <TextLink href="/projetos">Projetos</TextLink>
              <TextLink href="/publicacoes">Publicações</TextLink>
            </EmptyState>
          ) : (
            <>
              <p className="mb-8 text-body text-muted-foreground">
                {total === 1 ? "1 resultado" : `${total} resultados`} para “{term}”.
              </p>
              <div className="flex flex-col gap-10">
                {groups.map((group) => (
                  <section key={group.kind} aria-labelledby={`busca-${group.kind}`}>
                    <h2 id={`busca-${group.kind}`} className="text-h3">
                      {group.label}
                    </h2>
                    <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
                      {group.results.map((result) => (
                        <li key={`${result.href}-${result.title}`}>
                          <Link
                            href={result.href}
                            className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
                          >
                            <span className="flex min-w-0 flex-col gap-1">
                              <span className="text-body font-semibold text-foreground group-hover:text-primary">
                                {result.title}
                              </span>
                              {result.description && (
                                <span className="text-body-sm text-muted-foreground">{result.description}</span>
                              )}
                            </span>
                            <ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </Container>
    </>
  );
}
