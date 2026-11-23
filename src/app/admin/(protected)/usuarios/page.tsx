import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleAlert, CircleOff, KeyRound, Search, ShieldAlert } from "lucide-react";

import { Field, FormMessage, Select, TextInput } from "@/components/admin/form-controls";
import { CreateEditorDialog, EditorRowActions } from "@/components/admin/users/editor-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { callEditorFunction } from "@/lib/admin/editor-function";
import {
  EDITORS_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  editorFilters,
  errorMessage,
  eventLabel,
  type EditorListItem,
} from "@/lib/admin/users";
import { requireAdminAccess } from "@/lib/auth/access";
import { formatAdminDateTime } from "@/lib/utils/format";
import { buildHref, firstParam, parsePageParam } from "@/lib/utils/search-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Usuários e permissões",
};

function StateBadge({ editor }: { editor: EditorListItem }) {
  if (editor.state === "incomplete") {
    return (
      <Badge tone="earth">
        <CircleAlert aria-hidden="true" className="size-3.5" />
        Configuração incompleta
      </Badge>
    );
  }
  return editor.state === "active" ? (
    <Badge tone="green">
      <CheckCircle2 aria-hidden="true" className="size-3.5" />
      Ativo
    </Badge>
  ) : (
    <Badge tone="neutral">
      <CircleOff aria-hidden="true" className="size-3.5" />
      Desativado
    </Badge>
  );
}

function PasswordState({ editor }: { editor: EditorListItem }) {
  return editor.mustChangePassword ? (
    <Badge tone="earth">
      <KeyRound aria-hidden="true" className="size-3.5" />
      Pendente de troca
    </Badge>
  ) : (
    <span className="text-body-sm">Já alterada</span>
  );
}

function dateOrDash(value: string | null) {
  return value ? formatAdminDateTime(value) : "—";
}

function Actions({ editor }: { editor: EditorListItem }) {
  if (editor.state === "incomplete") {
    return (
      <p className="max-w-64 text-caption text-muted-foreground">
        A conta foi criada, mas as permissões não. Use “Adicionar Editor” com este e-mail para concluir.
      </p>
    );
  }
  return <EditorRowActions editor={{ id: editor.id, email: editor.email, isActive: editor.state === "active" }} />;
}

/**
 * Usuários e permissões (Etapa 10.5): somente administradores ativos. A
 * verificação acontece aqui no servidor e de novo na Edge Function; um Editor
 * que abre o endereço diretamente não recebe nenhum dado de outras contas.
 */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const access = await requireAdminAccess();

  if (access.role !== "admin") {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-h1">Usuários e permissões</h1>
        <FormMessage tone="error">
          Acesso negado: somente administradores gerenciam usuários e permissões.
        </FormMessage>
        <Button href="/admin" variant="secondary" className="self-start">
          Voltar ao painel
        </Button>
      </div>
    );
  }

  const query = await searchParams;
  const page = parsePageParam(query.pagina);
  if (page === null) notFound();
  const search = (firstParam(query.busca) ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const filter = editorFilters.find((item) => item.param === firstParam(query.situacao)) ?? editorFilters[0];
  const filtered = Boolean(search) || filter.param !== "";

  const result = await callEditorFunction({ operation: "list-editors", search, filter: filter.value, page });
  const list = result.ok && result.operation === "list-editors" ? result.list : null;
  if (list && page > 1 && list.items.length === 0 && list.total > 0) notFound();

  const hrefForPage = (target: number) =>
    buildHref("/admin/usuarios", { busca: search, situacao: filter.param, pagina: target });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-h1">Usuários e permissões</h1>
          <p className="text-body text-muted-foreground">
            Crie contas de Editor, desative ou reative o acesso e defina uma nova senha inicial quando necessário.
            Editores cuidam do conteúdo; administradores também alteram menus, aparência, informações
            institucionais e usuários.
          </p>
        </div>
        <CreateEditorDialog />
      </div>

      <form
        action="/admin/usuarios"
        role="search"
        aria-label="Filtrar Editores"
        className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] xl:items-end"
      >
        <Field id="busca" label="Buscar por e-mail">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 my-auto size-4 text-muted-foreground" />
            <TextInput
              id="busca"
              name="busca"
              type="search"
              defaultValue={search}
              maxLength={SEARCH_MAX_LENGTH}
              placeholder="nome@instituicao.br"
              className="pl-11"
            />
          </div>
        </Field>
        <Field id="situacao" label="Situação">
          <Select id="situacao" name="situacao" defaultValue={filter.param}>
            {editorFilters.map((item) => (
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
              href="/admin/usuarios"
              className="inline-flex min-h-11 items-center px-2 text-label text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {!list ? (
        <FormMessage tone="error">
          {result.ok ? errorMessage("unexpected") : errorMessage(result.code)} A lista de Editores não pôde ser
          carregada; nada foi alterado.
        </FormMessage>
      ) : list.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-6">
          <h2 className="text-h4 font-sans">{filtered ? "Nenhum Editor encontrado" : "Nenhum Editor cadastrado"}</h2>
          <p className="text-body-sm text-muted-foreground">
            {filtered
              ? "Nenhum Editor corresponde aos filtros. Ajuste a busca ou limpe os filtros."
              : "Use “Adicionar Editor” para criar a primeira conta de Editor."}
          </p>
        </div>
      ) : (
        <section aria-labelledby="lista-editores-title" className="flex flex-col gap-4">
          <h2 id="lista-editores-title" className="sr-only">
            Lista de Editores
          </h2>
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {list.total === 1 ? "1 Editor" : `${list.total} Editores`}
            {filtered ? " com os filtros atuais" : ""}, em ordem alfabética de e-mail.
          </p>

          <ul className="flex flex-col gap-4 xl:hidden">
            {list.items.map((editor) => (
              <li key={editor.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-col gap-1">
                  <h3 className="break-all text-h4 font-sans">{editor.email}</h3>
                  <p className="text-caption text-muted-foreground">Papel: Editor</p>
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-body-sm sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="text-caption text-muted-foreground">Situação</dt>
                    <dd><StateBadge editor={editor} /></dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-caption text-muted-foreground">Senha inicial</dt>
                    <dd><PasswordState editor={editor} /></dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-caption text-muted-foreground">Criado em</dt>
                    <dd>{dateOrDash(editor.createdAt)}</dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-caption text-muted-foreground">Último acesso</dt>
                    <dd>{dateOrDash(editor.lastSignInAt)}</dd>
                  </div>
                </dl>
                <Actions editor={editor} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface xl:block">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-border bg-surface-muted text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">E-mail</th>
                  <th scope="col" className="px-3 py-3">Papel</th>
                  <th scope="col" className="px-3 py-3">Situação</th>
                  <th scope="col" className="px-3 py-3">Senha inicial</th>
                  <th scope="col" className="px-3 py-3">Criado em</th>
                  <th scope="col" className="px-3 py-3">Último acesso</th>
                  <th scope="col" className="px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.items.map((editor) => (
                  <tr key={editor.id} className="align-top">
                    <th scope="row" className="max-w-64 break-all px-5 py-4 font-semibold text-foreground">
                      {editor.email}
                    </th>
                    <td className="px-3 py-4">Editor</td>
                    <td className="px-3 py-4"><StateBadge editor={editor} /></td>
                    <td className="px-3 py-4"><PasswordState editor={editor} /></td>
                    <td className="whitespace-nowrap px-3 py-4">{dateOrDash(editor.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-4">{dateOrDash(editor.lastSignInAt)}</td>
                    <td className="px-5 py-4"><Actions editor={editor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={Math.ceil(list.total / EDITORS_PAGE_SIZE)} hrefForPage={hrefForPage} />
        </section>
      )}

      <section aria-labelledby="seguranca-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <h2 id="seguranca-title" className="flex items-center gap-2 text-h4 font-sans">
          <ShieldAlert aria-hidden="true" className="size-5 text-primary" />
          Boas práticas
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-sm">
          <li>Confirme a identidade e o e-mail da pessoa antes de criar a conta.</li>
          <li>
            Envie a senha inicial por um canal seguro e separado. O painel não guarda nem mostra senhas, e o Editor
            precisa trocá-la no primeiro acesso.
          </li>
          <li>Para retirar o acesso de alguém, use “Desativar acesso”: os conteúdos e o histórico são preservados.</li>
          <li>Contas de administradores não são alteradas nesta tela.</li>
        </ul>
      </section>

      {list && list.events.length > 0 && (
        <section aria-labelledby="historico-usuarios-title" className="flex flex-col gap-4">
          <h2 id="historico-usuarios-title" className="text-h3 font-sans">
            Histórico de operações
          </h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {list.events.map((event) => (
              <li key={event.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <p className="text-body-sm">
                  <span className={event.outcome === "failure" ? "font-semibold text-danger" : "font-semibold"}>
                    {eventLabel(event)}
                  </span>
                  {event.targetEmail && <span className="break-all"> — {event.targetEmail}</span>}
                  {event.actorEmail && event.actorEmail !== event.targetEmail && (
                    <span className="break-all text-muted-foreground"> (por {event.actorEmail})</span>
                  )}
                </p>
                <p className="shrink-0 text-caption text-muted-foreground">{formatAdminDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
