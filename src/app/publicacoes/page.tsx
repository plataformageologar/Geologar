import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicationItem } from "@/components/publications/publication-item";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { TextLink } from "@/components/ui/text-link";
import { isValidSlug } from "@/lib/queries/shared";
import {
  getPublicationFilterOptions,
  getPublishedPublications,
  normalizeSearchTerm,
  PUBLICATIONS_PAGE_SIZE,
} from "@/lib/queries/publications";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";
import type { PublicationListItem } from "@/types/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publicações",
  description: "Artigos, livros e demais publicações científicas da GeoLogar.",
};

function parseYear(value: string | undefined) {
  if (!value || !/^\d{4}$/.test(value)) return undefined;
  const year = Number(value);
  return year >= 1800 && year <= 2100 ? year : undefined;
}

/** Agrupa por ano, preservando a ordem da consulta (mais recentes primeiro). */
function groupByYear(publications: PublicationListItem[]) {
  const groups = new Map<number | null, PublicationListItem[]>();
  for (const publication of publications) {
    const group = groups.get(publication.publication_year) ?? [];
    group.push(publication);
    groups.set(publication.publication_year, group);
  }
  return [...groups.entries()];
}

const fieldClasses =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-body-sm text-foreground";

export default async function PublicationsPage({ searchParams }: PageProps<"/publicacoes">) {
  const query = await searchParams;
  const page = parsePageParam(query.pagina);
  if (page === null) notFound();

  const year = parseYear(firstParam(query.ano));
  const lineParam = firstParam(query.linha);
  const line = lineParam && isValidSlug(lineParam) ? lineParam : undefined;
  const q = normalizeSearchTerm(firstParam(query.busca)) || undefined;
  const hasFilters = Boolean(year || line || q);

  const [options, result] = await Promise.all([
    getPublicationFilterOptions(),
    getPublishedPublications({ year, line, q, page }),
  ]);
  if (result.outOfRange) notFound();

  const totalPages = Math.ceil(result.total / PUBLICATIONS_PAGE_SIZE);
  const groups = groupByYear(result.items);
  const filterParams = { ano: year, linha: line, busca: q };

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Início", href: "/" }, { label: "Publicações" }]}
        eyebrow="Publicações"
        title="Publicações"
        description="Produção científica da rede, organizada por ano de publicação."
      />

      <Container className="section-y">
        {(result.total > 0 || hasFilters) && (
          <form
            action="/publicacoes"
            method="get"
            role="search"
            aria-label="Filtrar publicações"
            className="mb-12 grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_auto] lg:items-end"
          >
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
              <label htmlFor="busca" className="text-label">
                Buscar por título ou autoria
              </label>
              <input
                id="busca"
                name="busca"
                type="search"
                defaultValue={q}
                maxLength={80}
                className={fieldClasses}
              />
            </div>
            {options.years.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ano" className="text-label">
                  Ano
                </label>
                <select id="ano" name="ano" defaultValue={year ?? ""} className={fieldClasses}>
                  <option value="">Todos os anos</option>
                  {options.years.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {options.researchLines.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="linha" className="text-label">
                  Linha de pesquisa
                </label>
                <select id="linha" name="linha" defaultValue={line ?? ""} className={fieldClasses}>
                  <option value="">Todas as linhas</option>
                  {options.researchLines.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-2 lg:col-span-1">
              <Button type="submit">Filtrar</Button>
              {hasFilters && (
                <Link
                  href="/publicacoes"
                  className="inline-flex min-h-11 items-center text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                >
                  Limpar filtros
                </Link>
              )}
            </div>
          </form>
        )}

        {result.items.length > 0 ? (
          <>
            {hasFilters && (
              <p className="mb-6 text-body-sm text-muted-foreground">
                {result.total === 1
                  ? "1 publicação encontrada."
                  : `${result.total} publicações encontradas.`}
              </p>
            )}
            <div className="flex flex-col gap-12">
              {groups.map(([groupYear, publications]) => {
                const headingId = `ano-${groupYear ?? "sem-ano"}`;
                return (
                  <section key={headingId} aria-labelledby={headingId}>
                    <h2
                      id={headingId}
                      className="border-b-2 border-earth/60 pb-3 font-display text-h3 text-earth"
                    >
                      {groupYear ?? "Sem ano informado"}
                    </h2>
                    <ul className="divide-y divide-border border-b border-border">
                      {publications.map((publication) => (
                        <li key={publication.slug}>
                          <PublicationItem publication={publication} hideYear />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              hrefForPage={(target) => buildHref("/publicacoes", { ...filterParams, pagina: target })}
            />
          </>
        ) : hasFilters ? (
          <EmptyState
            title="Nenhuma publicação encontrada para os filtros selecionados."
            description="Revise os termos da busca ou remova algum filtro."
          >
            <TextLink href="/publicacoes">Ver todas as publicações</TextLink>
          </EmptyState>
        ) : (
          <EmptyState title="Nenhuma publicação disponível no momento.">
            <TextLink href="/pesquisa">Ver linhas de pesquisa</TextLink>
          </EmptyState>
        )}
      </Container>
    </>
  );
}
