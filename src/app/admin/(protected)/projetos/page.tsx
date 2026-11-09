import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Field, FormMessage, Select, TextInput } from "@/components/admin/form-controls";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { FeaturedBadge, ProjectStatusBadge, PublicationBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { requireAdminAccess } from "@/lib/auth/access";
import {
  ADMIN_PROJECTS_PAGE_SIZE,
  getProjectsForAdmin,
  type ProjectListFilters,
  type ProjectListItem,
} from "@/lib/queries/admin-content";
import { formatAdminDateTime } from "@/lib/utils/format";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projetos",
};

// Valores dos filtros na URL (em português) e no banco.
const publicationFilters = [
  { param: "", label: "Todos", value: undefined },
  { param: "publicados", label: "Publicados", value: true },
  { param: "rascunhos", label: "Rascunhos", value: false },
] as const;

const statusFilters = [
  { param: "", label: "Todos", value: undefined },
  { param: "em-andamento", label: "Em andamento", value: "ongoing" },
  { param: "concluidos", label: "Concluídos", value: "completed" },
] as const;

const SEARCH_MAX_LENGTH = 100;

function LinesList({ project }: { project: ProjectListItem }) {
  if (project.researchLines.length === 0) {
    return <span className="text-caption text-muted-foreground">Nenhuma linha</span>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {project.researchLines.map((line) => (
        <li key={line.id} className="text-body-sm">
          {line.title}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminProjectsPage({ searchParams }: PageProps<"/admin/projetos">) {
  const access = await requireAdminAccess();
  const query = await searchParams;

  const page = parsePageParam(query.pagina);
  if (page === null) notFound();

  const search = (firstParam(query.busca) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const publication =
    publicationFilters.find((item) => item.param === firstParam(query.publicacao)) ?? publicationFilters[0];
  const status = statusFilters.find((item) => item.param === firstParam(query.situacao)) ?? statusFilters[0];

  const filters: ProjectListFilters = {
    search: search || undefined,
    published: publication.value,
    status: status.value,
    page,
  };
  const result = await getProjectsForAdmin(filters);
  if (result.status === "ready" && result.data.outOfRange) notFound();

  const filtered = Boolean(search) || publication.param !== "" || status.param !== "";
  const canDelete = access.role === "admin";
  const hrefForPage = (target: number) =>
    buildHref("/admin/projetos", {
      busca: search,
      publicacao: publication.param,
      situacao: status.param,
      pagina: target,
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Projetos</h1>
          <p className="text-body text-muted-foreground">
            Cadastre, organize e publique os projetos de pesquisa da GeoLogar.
          </p>
        </div>
        <Button href="/admin/projetos/novo" className="shrink-0 self-start">
          <Plus aria-hidden="true" className="size-4" />
          Novo projeto
        </Button>
      </div>

      {/* Filtros via GET: funcionam sem JavaScript e ficam na URL. */}
      <form
        action="/admin/projetos"
        role="search"
        aria-label="Filtrar projetos"
        className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
      >
        <Field id="busca" label="Buscar por título">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
            <TextInput
              id="busca"
              name="busca"
              type="search"
              defaultValue={search}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="Nome do projeto"
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
        <Field id="situacao" label="Situação">
          <Select id="situacao" name="situacao" defaultValue={status.param}>
            {statusFilters.map((item) => (
              <option key={item.param} value={item.param}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Filtrar</Button>
          {filtered && (
            <Link
              href="/admin/projetos"
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
            Não foi possível carregar os projetos. Nada foi alterado. Recarregue a página em instantes; se o
            problema continuar, contate a equipe técnica.
          </FormMessage>
        ) : result.data.items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
            <h2 className="text-h4 font-sans">
              {filtered ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}
            </h2>
            <p className="text-body-sm text-muted-foreground">
              {filtered
                ? "Nenhum projeto corresponde aos filtros. Ajuste a busca ou limpe os filtros."
                : "Cadastre o primeiro projeto; ele começa como rascunho e só aparece no site depois de publicado."}
            </p>
          </div>
        ) : (
          <section aria-labelledby="lista-projetos-title" className="flex flex-col gap-4">
            <h2 id="lista-projetos-title" className="sr-only">
              Lista de projetos
            </h2>
            <p className="text-body-sm text-muted-foreground" aria-live="polite">
              {result.data.total === 1
                ? filtered
                  ? "1 projeto encontrado com os filtros atuais"
                  : "1 projeto cadastrado"
                : filtered
                  ? `${result.data.total} projetos encontrados com os filtros atuais`
                  : `${result.data.total} projetos cadastrados`}
              , em ordem de exibição.
            </p>

            <ul className="flex flex-col gap-4 xl:hidden">
              {result.data.items.map((project) => (
                <li key={project.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-h4 font-sans">{project.title}</h3>
                    <p className="break-all text-caption text-muted-foreground">/projetos/{project.slug}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Situação do projeto</dt>
                      <dd><ProjectStatusBadge status={project.project_status} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Publicação</dt>
                      <dd><PublicationBadge published={project.is_published} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Destaque</dt>
                      <dd><FeaturedBadge featured={project.is_featured} /></dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Atualizado em</dt>
                      <dd>{formatAdminDateTime(project.updated_at)}</dd>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <dt className="text-caption text-muted-foreground">Linhas de pesquisa</dt>
                      <dd><LinesList project={project} /></dd>
                    </div>
                  </dl>
                  <RecordRowActions
                    entity="project"
                    id={project.id}
                    title={project.title}
                    isPublished={project.is_published}
                    editHref={`/admin/projetos/${project.id}/editar`}
                    publicHref={`/projetos/${project.slug}`}
                    canDelete={canDelete && !project.is_published}
                  />
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface xl:block">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-border bg-surface-muted text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">Nome</th>
                    <th scope="col" className="px-3 py-3">Situação</th>
                    <th scope="col" className="px-3 py-3">Publicação</th>
                    <th scope="col" className="px-3 py-3">Destaque</th>
                    <th scope="col" className="px-3 py-3">Linhas de pesquisa</th>
                    <th scope="col" className="px-3 py-3">Atualizado em</th>
                    <th scope="col" className="px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.data.items.map((project) => (
                    <tr key={project.id} className="align-top">
                      <th scope="row" className="max-w-56 px-5 py-4 font-normal">
                        <span className="block font-semibold text-foreground">{project.title}</span>
                        <span className="block break-all text-caption text-muted-foreground">{project.slug}</span>
                      </th>
                      <td className="px-3 py-4"><ProjectStatusBadge status={project.project_status} /></td>
                      <td className="px-3 py-4"><PublicationBadge published={project.is_published} /></td>
                      <td className="px-3 py-4"><FeaturedBadge featured={project.is_featured} /></td>
                      <td className="max-w-48 px-3 py-4"><LinesList project={project} /></td>
                      <td className="whitespace-nowrap px-3 py-4">{formatAdminDateTime(project.updated_at)}</td>
                      <td className="px-5 py-4">
                        <RecordRowActions
                          entity="project"
                          id={project.id}
                          title={project.title}
                          isPublished={project.is_published}
                          editHref={`/admin/projetos/${project.id}/editar`}
                          publicHref={`/projetos/${project.slug}`}
                          canDelete={canDelete && !project.is_published}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={Math.ceil(result.data.total / ADMIN_PROJECTS_PAGE_SIZE)}
              hrefForPage={hrefForPage}
            />
          </section>
        )}
      </RecordFeedbackProvider>
    </div>
  );
}
