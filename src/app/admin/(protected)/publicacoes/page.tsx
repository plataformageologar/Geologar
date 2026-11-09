import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Field, FormMessage, Select, TextInput } from "@/components/admin/form-controls";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { publicationResourceHref } from "@/lib/admin/publications";
import { requireAdminAccess } from "@/lib/auth/access";
import {
  ADMIN_PUBLICATIONS_PAGE_SIZE,
  getPublicationsForAdmin,
  getPublicationYears,
  type PublicationListItem,
} from "@/lib/queries/admin-publications";
import { formatAdminDateTime } from "@/lib/utils/format";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publicações",
};

const publicationFilters = [
  { param: "", label: "Todas", value: undefined },
  { param: "publicadas", label: "Publicadas", value: true },
  { param: "rascunhos", label: "Rascunhos", value: false },
] as const;

const SEARCH_MAX_LENGTH = 100;

function linksLabel(item: PublicationListItem) {
  const parts = [
    item.projectCount > 0 && `${item.projectCount} ${item.projectCount === 1 ? "projeto" : "projetos"}`,
    item.lineCount > 0 && `${item.lineCount} ${item.lineCount === 1 ? "linha" : "linhas"}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Sem vínculos";
}

export default async function AdminPublicationsPage({ searchParams }: PageProps<"/admin/publicacoes">) {
  const access = await requireAdminAccess();
  const query = await searchParams;

  const page = parsePageParam(query.pagina);
  if (page === null) notFound();

  const search = (firstParam(query.busca) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const publication =
    publicationFilters.find((item) => item.param === firstParam(query.publicacao)) ?? publicationFilters[0];
  const yearParam = firstParam(query.ano) ?? "";
  const year = /^\d{4}$/.test(yearParam) ? Number(yearParam) : undefined;

  const [result, years] = await Promise.all([
    getPublicationsForAdmin({ search: search || undefined, published: publication.value, year, page }),
    getPublicationYears(),
  ]);
  if (result.status === "ready" && result.data.outOfRange) notFound();

  const yearOptions = years.status === "ready" ? years.data : [];
  if (year !== undefined && !yearOptions.includes(year)) yearOptions.push(year);

  const filtered = Boolean(search) || publication.param !== "" || year !== undefined;
  const canDelete = access.role === "admin";
  const hrefForPage = (target: number) =>
    buildHref("/admin/publicacoes", {
      busca: search,
      publicacao: publication.param,
      ano: year,
      pagina: target,
    });

  const actionsFor = (item: PublicationListItem) => {
    const resource = publicationResourceHref(item);
    return (
      <RecordRowActions
        entity="publication"
        id={item.id}
        title={item.title}
        isPublished={item.is_published}
        editHref={`/admin/publicacoes/${item.id}/editar`}
        publicHref={resource}
        publicLabel={resource ? "Abrir recurso externo" : undefined}
        canDelete={canDelete && !item.is_published}
      />
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Publicações</h1>
          <p className="text-body text-muted-foreground">
            Gerencie a produção científica apresentada no portal GeoLogar.
          </p>
        </div>
        <Button href="/admin/publicacoes/novo" className="shrink-0 self-start">
          <Plus aria-hidden="true" className="size-4" />
          Nova publicação
        </Button>
      </div>

      {/* Filtros via GET: funcionam sem JavaScript e ficam na URL. */}
      <form
        action="/admin/publicacoes"
        role="search"
        aria-label="Filtrar publicações"
        className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
      >
        <Field id="busca" label="Buscar por título ou autores">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
            <TextInput
              id="busca"
              name="busca"
              type="search"
              defaultValue={search}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Título ou nome de autor"
              className="pl-11"
            />
          </div>
        </Field>
        <Field id="publicacao" label="Publicação">
          <Select id="publicacao" name="publicacao" defaultValue={publication.param}>
            {publicationFilters.map((item) => (
              <option key={item.param} value={item.param}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ano" label="Ano">
          <Select id="ano" name="ano" defaultValue={year === undefined ? "" : String(year)}>
            <option value="">Todos</option>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Filtrar</Button>
          {filtered && (
            <Link
              href="/admin/publicacoes"
              className="inline-flex min-h-11 items-center px-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {/* O provedor envolve também o estado vazio: a confirmação de exclusão do
          último item continua visível depois que a lista se esvazia. */}
      <RecordFeedbackProvider>
        {result.status === "error" ? (
          <FormMessage tone="error">
            Não foi possível carregar as publicações. Nada foi alterado. Recarregue a página em
            instantes; se o problema continuar, contate a equipe técnica.
          </FormMessage>
        ) : result.data.items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <h2 className="text-h4 font-sans">
              {filtered ? "Nenhuma publicação encontrada" : "Nenhuma publicação cadastrada"}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {filtered
                ? "Nenhuma publicação corresponde aos filtros. Ajuste a busca ou limpe os filtros."
                : "Cadastre a primeira publicação; ela começa como rascunho e só aparece no site depois de publicada."}
            </p>
          </div>
        ) : (
          <section aria-labelledby="lista-publicacoes-title" className="flex flex-col gap-4">
            <h2 id="lista-publicacoes-title" className="sr-only">
              Lista de publicações
            </h2>
            <p className="text-body-sm text-muted-foreground" aria-live="polite">
              {result.data.total === 1
                ? filtered
                  ? "1 publicação encontrada com os filtros atuais"
                  : "1 publicação cadastrada"
                : filtered
                  ? `${result.data.total} publicações encontradas com os filtros atuais`
                  : `${result.data.total} publicações cadastradas`}
              , das mais recentes para as mais antigas.
            </p>

            <ul className="flex flex-col gap-4 xl:hidden">
              {result.data.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="break-words text-h4 font-sans">{item.title}</h3>
                    <p className="break-words text-body-sm text-muted-foreground">{item.authors}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Ano</dt>
                      <dd>{item.publication_year ?? "Sem ano"}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Veículo</dt>
                      <dd className="break-words">{item.publication_venue ?? "—"}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Publicação</dt>
                      <dd><PublicationBadge published={item.is_published} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Destaque</dt>
                      <dd><FeaturedBadge featured={item.is_featured} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Vínculos</dt>
                      <dd>{linksLabel(item)}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Atualizada em</dt>
                      <dd>{formatAdminDateTime(item.updated_at)}</dd>
                    </div>
                  </dl>
                  {actionsFor(item)}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface xl:block">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-border bg-surface-muted text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">Título e autores</th>
                    <th scope="col" className="px-3 py-3">Ano</th>
                    <th scope="col" className="px-3 py-3">Veículo</th>
                    <th scope="col" className="px-3 py-3">Situação</th>
                    <th scope="col" className="px-3 py-3">Destaque</th>
                    <th scope="col" className="px-3 py-3">Atualizada em</th>
                    <th scope="col" className="px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <th scope="row" className="max-w-72 px-5 py-4 font-normal">
                        <span className="block break-words font-semibold text-foreground">{item.title}</span>
                        <span className="block break-words text-caption text-muted-foreground">{item.authors}</span>
                        <span className="block text-caption text-muted-foreground">{linksLabel(item)}</span>
                      </th>
                      <td className="px-3 py-4">{item.publication_year ?? "—"}</td>
                      <td className="max-w-44 break-words px-3 py-4">{item.publication_venue ?? "—"}</td>
                      <td className="px-3 py-4"><PublicationBadge published={item.is_published} /></td>
                      <td className="px-3 py-4"><FeaturedBadge featured={item.is_featured} /></td>
                      <td className="whitespace-nowrap px-3 py-4">{formatAdminDateTime(item.updated_at)}</td>
                      <td className="px-5 py-4">{actionsFor(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={Math.ceil(result.data.total / ADMIN_PUBLICATIONS_PAGE_SIZE)}
              hrefForPage={hrefForPage}
            />
          </section>
        )}
      </RecordFeedbackProvider>
    </div>
  );
}
