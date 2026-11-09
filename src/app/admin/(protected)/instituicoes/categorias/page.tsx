import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { AdminPageHeading } from "@/components/admin/admin-page-heading";
import { FormMessage } from "@/components/admin/form-controls";
import { CategoryForm } from "@/components/admin/institutions/category-form";
import { RecordFeedbackProvider, RecordRowActions } from "@/components/admin/record-actions";
import { emptyCategoryValues, toCategoryFormValues } from "@/lib/admin/institutions";
import { isUuid } from "@/lib/admin/validation";
import { requireAdminAccess } from "@/lib/auth/access";
import { getCategoriesForAdmin } from "@/lib/queries/admin-institutional";
import { firstParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categorias de instituições",
};

export default async function InstitutionCategoriesPage({
  searchParams,
}: PageProps<"/admin/instituicoes/categorias">) {
  const access = await requireAdminAccess();
  const query = await searchParams;
  const isAdmin = access.role === "admin";

  const editParam = firstParam(query.editar);
  if (editParam !== undefined && !isUuid(editParam)) notFound();

  const result = await getCategoriesForAdmin();
  const editing =
    result.status === "ready" && editParam ? (result.data.find((item) => item.id === editParam) ?? null) : null;
  if (result.status === "ready" && editParam && !editing) notFound();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeading
        back={{ href: "/admin/instituicoes", label: "Instituições" }}
        title="Categorias de instituições"
        description="Agrupam as instituições parceiras na página pública, na ordem definida aqui."
      />

      {!isAdmin && (
        <FormMessage tone="warning">
          Você pode consultar as categorias. Criar, editar e excluir categorias é restrito a administradores.
        </FormMessage>
      )}

      {result.status === "error" ? (
        <FormMessage tone="error">
          Não foi possível carregar as categorias. Nada foi alterado. Recarregue a página em instantes; se o
          problema continuar, contate a equipe técnica.
        </FormMessage>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:items-start">
          <RecordFeedbackProvider>
            {result.data.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
                <h2 className="text-h4 font-sans">Nenhuma categoria cadastrada</h2>
                <p className="text-body-sm text-muted-foreground">
                  {isAdmin
                    ? "Crie a primeira categoria (ex.: Universidades, Institutos de pesquisa) para poder cadastrar instituições."
                    : "Peça a um administrador para cadastrar as categorias."}
                </p>
              </div>
            ) : (
              <section aria-labelledby="lista-categorias-title" className="flex flex-col gap-4">
                <h2 id="lista-categorias-title" className="sr-only">
                  Lista de categorias
                </h2>
                <p className="text-body-sm text-muted-foreground" aria-live="polite">
                  {result.data.length === 1 ? "1 categoria" : `${result.data.length} categorias`}, na ordem de
                  exibição.
                </p>
                <ul className="flex flex-col gap-4">
                  {result.data.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5"
                      aria-current={editing?.id === item.id ? "true" : undefined}
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <h3 className="break-words text-h4 font-sans">{item.name}</h3>
                        {item.description && (
                          <p className="break-words text-body-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-body-sm sm:grid-cols-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <dt className="text-caption text-muted-foreground">Slug</dt>
                          <dd className="break-all">{item.slug}</dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-caption text-muted-foreground">Ordem</dt>
                          <dd>{item.sort_order}</dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-caption text-muted-foreground">Instituições</dt>
                          <dd>
                            {item.institutionCount > 0 ? (
                              <Link
                                href={`/admin/instituicoes?categoria=${item.id}`}
                                className="text-primary underline underline-offset-4"
                              >
                                {item.institutionCount}
                                <span className="sr-only"> instituições em {item.name}</span>
                              </Link>
                            ) : (
                              "Nenhuma"
                            )}
                          </dd>
                        </div>
                      </dl>
                      {isAdmin && (
                        <RecordRowActions
                          entity="institution-category"
                          id={item.id}
                          title={item.name}
                          editHref={`/admin/instituicoes/categorias?editar=${item.id}#categoria-form-title`}
                          canDelete={item.institutionCount === 0}
                        />
                      )}
                      {isAdmin && item.institutionCount > 0 && (
                        <p className="text-caption text-muted-foreground">
                          Para excluir, mova ou exclua antes as instituições desta categoria.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </RecordFeedbackProvider>

          {isAdmin && (
            <div className="flex flex-col gap-4">
              {editing && (
                <Link
                  href="/admin/instituicoes/categorias"
                  className="inline-flex min-h-11 w-fit items-center gap-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Criar nova categoria em vez de editar
                </Link>
              )}
              <CategoryForm
                key={editing?.id ?? "nova"}
                recordId={editing?.id ?? null}
                initialValues={editing ? toCategoryFormValues(editing) : emptyCategoryValues}
                initialUpdatedAt={editing?.updated_at ?? null}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
