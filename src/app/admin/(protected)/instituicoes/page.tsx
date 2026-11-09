import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search, Tags } from "lucide-react";

import { Field, FormMessage, Select, TextInput } from "@/components/admin/form-controls";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { FeaturedBadge, PublicationBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { formatInstitutionPlace } from "@/lib/admin/institutions";
import { isUuid } from "@/lib/admin/validation";
import { requireAdminAccess } from "@/lib/auth/access";
import {
  ADMIN_INSTITUTIONS_PAGE_SIZE,
  getCategoriesForAdmin,
  getInstitutionsForAdmin,
  type InstitutionListItem,
} from "@/lib/queries/admin-institutional";
import { formatAdminDateTime } from "@/lib/utils/format";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Instituições",
};

const publicationFilters = [
  { param: "", label: "Todas", value: undefined },
  { param: "publicadas", label: "Publicadas", value: true },
  { param: "rascunhos", label: "Rascunhos", value: false },
] as const;

const SEARCH_MAX_LENGTH = 100;

export default async function AdminInstitutionsPage({ searchParams }: PageProps<"/admin/instituicoes">) {
  const access = await requireAdminAccess();
  const query = await searchParams;

  const page = parsePageParam(query.pagina);
  if (page === null) notFound();

  const search = (firstParam(query.busca) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const publication =
    publicationFilters.find((item) => item.param === firstParam(query.publicacao)) ?? publicationFilters[0];
  const categoryParam = firstParam(query.categoria) ?? "";
  const categoryId = isUuid(categoryParam) ? categoryParam : undefined;

  const [result, categories] = await Promise.all([
    getInstitutionsForAdmin({ search: search || undefined, published: publication.value, categoryId, page }),
    getCategoriesForAdmin(),
  ]);
  if (result.status === "ready" && result.data.outOfRange) notFound();

  const categoryOptions = categories.status === "ready" ? categories.data : [];
  const filtered = Boolean(search) || publication.param !== "" || categoryId !== undefined;
  const isAdmin = access.role === "admin";
  const hrefForPage = (target: number) =>
    buildHref("/admin/instituicoes", {
      busca: search,
      publicacao: publication.param,
      categoria: categoryId,
      pagina: target,
    });

  const actionsFor = (item: InstitutionListItem) => (
    <RecordRowActions
      entity="institution"
      id={item.id}
      title={item.name}
      isPublished={item.is_published}
      editHref={`/admin/instituicoes/${item.id}/editar`}
      publicHref={item.website_url}
      publicLabel={item.website_url ? "Abrir website" : undefined}
      canDelete={isAdmin && !item.is_published}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Instituições</h1>
          <p className="text-body text-muted-foreground">
            Gerencie as instituições parceiras apresentadas no portal GeoLogar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3 self-start">
          <Button href="/admin/instituicoes/categorias" variant="secondary">
            <Tags aria-hidden="true" className="size-4" />
            Categorias
          </Button>
          <Button href="/admin/instituicoes/novo">
            <Plus aria-hidden="true" className="size-4" />
            Nova instituição
          </Button>
        </div>
      </div>

      {/* Filtros via GET: funcionam sem JavaScript e ficam na URL. */}
      <form
        action="/admin/instituicoes"
        role="search"
        aria-label="Filtrar instituições"
        className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
      >
        <Field id="busca" label="Buscar por nome ou sigla">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
            <TextInput
              id="busca"
              name="busca"
              type="search"
              defaultValue={search}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Nome ou sigla"
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
        <Field id="categoria" label="Categoria">
          <Select id="categoria" name="categoria" defaultValue={categoryId ?? ""}>
            <option value="">Todas</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Filtrar</Button>
          {filtered && (
            <Link
              href="/admin/instituicoes"
              className="inline-flex min-h-11 items-center px-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      <RecordFeedbackProvider>
        {result.status === "error" ? (
          <FormMessage tone="error">
            Não foi possível carregar as instituições. Nada foi alterado. Recarregue a página em
            instantes; se o problema continuar, contate a equipe técnica.
          </FormMessage>
        ) : result.data.items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <h2 className="text-h4 font-sans">
              {filtered ? "Nenhuma instituição encontrada" : "Nenhuma instituição cadastrada"}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {filtered
                ? "Nenhuma instituição corresponde aos filtros. Ajuste a busca ou limpe os filtros."
                : categoryOptions.length === 0
                  ? isAdmin
                    ? "Cadastre primeiro uma categoria (em “Categorias”) e depois a primeira instituição."
                    : "Ainda não há categorias: peça a um administrador para cadastrá-las antes da primeira instituição."
                  : "Cadastre a primeira instituição; ela começa como rascunho e só aparece no site depois de publicada."}
            </p>
          </div>
        ) : (
          <section aria-labelledby="lista-instituicoes-title" className="flex flex-col gap-4">
            <h2 id="lista-instituicoes-title" className="sr-only">
              Lista de instituições
            </h2>
            <p className="text-body-sm text-muted-foreground" aria-live="polite">
              {result.data.total === 1
                ? filtered
                  ? "1 instituição encontrada com os filtros atuais"
                  : "1 instituição cadastrada"
                : filtered
                  ? `${result.data.total} instituições encontradas com os filtros atuais`
                  : `${result.data.total} instituições cadastradas`}
              , na ordem de exibição.
            </p>

            <ul className="flex flex-col gap-4 xl:hidden">
              {result.data.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="break-words text-h4 font-sans">{item.name}</h3>
                    {item.acronym && <p className="text-body-sm text-muted-foreground">{item.acronym}</p>}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Categoria</dt>
                      <dd className="break-words">{item.category?.name ?? "—"}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Local</dt>
                      <dd className="break-words">{formatInstitutionPlace(item) || "—"}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Publicação</dt>
                      <dd><PublicationBadge published={item.is_published} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Destaque</dt>
                      <dd><FeaturedBadge featured={item.is_featured} /></dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
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
                    <th scope="col" className="px-5 py-3">Nome</th>
                    <th scope="col" className="px-3 py-3">Categoria</th>
                    <th scope="col" className="px-3 py-3">Local</th>
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
                        <span className="block break-words font-semibold text-foreground">{item.name}</span>
                        {item.acronym && (
                          <span className="block text-caption text-muted-foreground">{item.acronym}</span>
                        )}
                      </th>
                      <td className="max-w-44 break-words px-3 py-4">{item.category?.name ?? "—"}</td>
                      <td className="max-w-44 break-words px-3 py-4">{formatInstitutionPlace(item) || "—"}</td>
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
              totalPages={Math.ceil(result.data.total / ADMIN_INSTITUTIONS_PAGE_SIZE)}
              hrefForPage={hrefForPage}
            />
          </section>
        )}
      </RecordFeedbackProvider>
    </div>
  );
}
