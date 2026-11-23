"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getAdminAccess } from "@/lib/auth/access";
import { DOC_PARTS, parseContent, type AnyContent, type DocType } from "@/lib/editorial/content";
import { getRevisions, type RevisionListItem } from "@/lib/queries/editorial";
import { validatePageContent } from "@/lib/site/page-content";
import { createClient } from "@/lib/supabase/server";

import {
  accessFailure,
  ADMIN_ROLES,
  EDITOR_ROLES,
  fail,
  formText,
  logActionError,
  type FailureState,
} from "./action-results";
import {
  contentForType,
  DRAFT_SAVED_MESSAGE,
  editorialDatabaseFailure,
  isDraftRequest,
  normalizeRestoredContent,
  partInput,
  readEditorialDocument,
  saveDraftParts,
  validatePart,
  type PartErrors,
  type SavedDocument,
} from "./editorial";
import { normalizeText, validateSlug } from "./validation";

/**
 * Server Actions do fluxo editorial (Etapa 9.6): salvar rascunho, publicar,
 * descartar, restaurar e páginas personalizadas. Únicos caminhos de escrita do
 * conteúdo editorial — o banco recusa gravação direta nas tabelas publicadas.
 *
 * Em todas: sessão e papel lidos no servidor a cada chamada; dados validados
 * aqui e de novo no banco; escrita com a sessão do usuário (RLS); versão do
 * documento conferida (edição simultânea → conflito, nada é sobrescrito).
 */

const ENTITY = "editorial" as const;

/** Mensagens do banco (GL423) começam em minúscula e sem ponto final. */
function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1) + (text.endsWith(".") ? "" : ".");
}

export type EditorialSaveResult =
  | { status: "success"; message: string; documents: SavedDocument[] }
  | (FailureState & { partErrors?: Record<string, PartErrors> });

/**
 * Salva rascunhos de uma ou mais unidades numa única transação (CMS e editor
 * visual). Nada muda no site público.
 */
export async function saveEditorialDrafts(input: { documents: unknown }): Promise<EditorialSaveResult> {
  try {
    const access = await getAdminAccess();
    const denied = accessFailure(access, EDITOR_ROLES, ENTITY);
    if (denied || access.status !== "authorized") return denied ?? fail("session", ENTITY);

    const requests = Array.isArray(input?.documents) ? input.documents : [];
    if (requests.length === 0 || requests.length > 10 || !requests.every(isDraftRequest)) {
      return fail("validation", ENTITY, { message: "Nada para salvar. Recarregue a página." });
    }

    const outcome = await saveDraftParts(await createClient(), access.role === "admin", requests);
    if (outcome.status === "error") {
      return { ...fail(outcome.reason, ENTITY, { message: outcome.message }), partErrors: outcome.partErrors };
    }
    refresh();
    return { status: "success", message: DRAFT_SAVED_MESSAGE, documents: outcome.documents };
  } catch (error) {
    logActionError("salvar rascunho", error);
    return fail("connection", ENTITY);
  }
}

export type EditorialActionResult =
  | { status: "success"; message: string; versions: Record<string, number> }
  | FailureState;

function isVersionRequest(value: unknown): value is { documentId: string; version: number } {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.documentId === "string" && Number.isInteger(item.version);
}

/** Publica uma ou mais unidades numa única transação (tudo ou nada). */
export async function publishEditorialDocuments(input: { documents: unknown; note?: unknown }): Promise<EditorialActionResult> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    const requests = Array.isArray(input?.documents) ? input.documents : [];
    if (requests.length === 0 || requests.length > 10 || !requests.every(isVersionRequest)) {
      return fail("validation", ENTITY, { message: "Nada para publicar. Recarregue a página." });
    }
    const note = typeof input.note === "string" ? normalizeText(input.note) : null;
    if (note && note.length > 300) {
      return fail("validation", ENTITY, { message: "A observação pode ter no máximo 300 caracteres." });
    }

    const supabase = await createClient();
    const { data, error, status } = await supabase.rpc("publish_editorial_documents", {
      p_items: requests.map((item) => ({ id: item.documentId, version: item.version })),
      p_note: note ?? "",
    });
    if (error) {
      const failure = editorialDatabaseFailure("publicação", error, status);
      return fail(failure.reason, ENTITY, { message: failure.message });
    }
    const published = Array.isArray(data) ? (data as { id: string; version: number }[]) : [];
    if (published.length !== requests.length) return fail("unexpected", ENTITY);

    refresh();
    return {
      status: "success",
      message:
        requests.length === 1
          ? "Alterações publicadas. O site público já mostra a nova versão."
          : "Todas as alterações foram publicadas juntas. O site público já mostra a nova versão.",
      versions: Object.fromEntries(published.map((row) => [row.id, row.version])),
    };
  } catch (error) {
    logActionError("publicar", error);
    return fail("connection", ENTITY);
  }
}

/** Descarta o rascunho salvo: o conteúdo volta a ser a versão publicada. */
export async function discardEditorialDraft(input: { documentId: unknown; version: unknown }): Promise<EditorialActionResult> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    if (!isVersionRequest(input)) return fail("validation", ENTITY, { message: "Recarregue a página." });

    const supabase = await createClient();
    const { data, error, status } = await supabase.rpc("discard_editorial_draft", {
      p_document_id: input.documentId,
      p_expected_version: input.version,
    });
    if (error) {
      const failure = editorialDatabaseFailure("descarte de rascunho", error, status);
      return fail(failure.reason, ENTITY, { message: failure.message });
    }
    const row = data as { id: string; version: number } | null;
    refresh();
    return {
      status: "success",
      message: "Rascunho descartado. O conteúdo voltou a ser a versão publicada.",
      versions: row ? { [row.id]: row.version } : {},
    };
  } catch (error) {
    logActionError("descartar rascunho", error);
    return fail("connection", ENTITY);
  }
}

/**
 * Restaura uma revisão como NOVO rascunho (nada é publicado). O conteúdo
 * antigo passa pelas validações atuais antes de virar rascunho.
 */
export async function restoreEditorialRevision(input: {
  revisionId: unknown;
  version: unknown;
}): Promise<EditorialActionResult> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    if (typeof input?.revisionId !== "string" || !Number.isInteger(input.version)) {
      return fail("validation", ENTITY, { message: "Recarregue a página." });
    }

    const supabase = await createClient();
    const revision = await supabase
      .from("editorial_revisions")
      .select("id, document_id, revision_number, content")
      .eq("id", input.revisionId)
      .maybeSingle();
    if (revision.error || !revision.data) return fail(revision.error ? "connection" : "not-found", ENTITY);

    const read = await readEditorialDocument(supabase, revision.data.document_id);
    if (read.status === "error") return fail(read.reason, ENTITY);
    const { doc } = read;
    if (input.version !== doc.version) return fail("conflict", ENTITY);

    const parsed = parseContent(doc.type, revision.data.content);
    if (!parsed) return fail("validation", ENTITY, { message: "Esta revisão não pode ser restaurada (conteúdo ilegível)." });
    const normalized = await normalizeRestoredContent(supabase, doc, parsed);

    const restored: AnyContent = {};
    const problems: string[] = [];
    for (const part of DOC_PARTS[doc.type]) {
      const result = await validatePart(supabase, doc, part, partInput(part, normalized));
      if (result.errors) {
        problems.push(
          ...Object.values(result.errors.fieldErrors ?? {}),
          ...Object.values(result.errors.itemErrors ?? {}).flatMap((errors) => Object.values(errors)),
          ...(result.errors.listError ? [result.errors.listError] : []),
        );
      } else {
        Object.assign(restored, { [part]: result.value });
      }
    }
    if (problems.length > 0) {
      return fail("validation", ENTITY, {
        message: `Esta revisão tem dados que não valem mais pelas regras atuais e não pode ser restaurada automaticamente: ${[...new Set(problems)].slice(0, 3).join(" ")}`,
      });
    }

    const { data, error, status } = await supabase.rpc("restore_editorial_revision", {
      p_revision_id: revision.data.id,
      p_expected_version: doc.version,
      p_content: contentForType(doc.type, restored),
    });
    if (error) {
      const failure = editorialDatabaseFailure("restauração", error, status);
      return fail(failure.reason, ENTITY, { message: failure.message });
    }
    const row = data as { id: string; version: number } | null;
    refresh();
    return {
      status: "success",
      message: `A revisão ${revision.data.revision_number} virou o rascunho atual. Revise e publique quando estiver pronto; o site público não mudou.`,
      versions: row ? { [row.id]: row.version } : {},
    };
  } catch (error) {
    logActionError("restaurar revisão", error);
    return fail("connection", ENTITY);
  }
}

export type RevisionPreview =
  | { status: "success"; type: DocType; revisionNumber: number; createdAt: string; content: AnyContent }
  | FailureState;

/** Conteúdo de uma revisão (somente leitura) para a prévia do editor visual. */
export async function getEditorialRevisionContent(input: { revisionId: unknown }): Promise<RevisionPreview> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    if (typeof input?.revisionId !== "string") return fail("not-found", ENTITY);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("editorial_revisions")
      .select("revision_number, created_at, content, document:editorial_documents!editorial_revisions_document_id_fkey(doc_type)")
      .eq("id", input.revisionId)
      .maybeSingle();
    if (error) return fail("connection", ENTITY);
    const type = data?.document?.doc_type;
    const content = data && type ? parseContent(type as DocType, data.content) : null;
    if (!data || !content) return fail("not-found", ENTITY);
    return { status: "success", type: type as DocType, revisionNumber: data.revision_number, createdAt: data.created_at, content };
  } catch (error) {
    logActionError("ler revisão", error);
    return fail("connection", ENTITY);
  }
}

// Páginas personalizadas ----------------------------------------------------------------

type NewPageField = "title" | "slug" | "description" | "seo_title" | "seo_description";

export type CustomPageFormState = { status: "idle" } | FailureState<NewPageField>;

const PAGE_ENTITY = "custom-page" as const;

function slugProblem(slug: string | null) {
  return validateSlug(slug) ?? (slug && (slug.length < 3 || slug.length > 100) ? "Use entre 3 e 100 caracteres." : null);
}

/**
 * Cria a página como rascunho (nunca publicada direto). Título, endereço,
 * descrição e SEO são validados antes de criar; o SEO é gravado em seguida
 * no rascunho da página. Se essa segunda gravação falhar, a página já existe
 * e a tela de edição avisa que o SEO precisa ser preenchido de novo.
 */
export async function createCustomPage(_state: CustomPageFormState, formData: FormData): Promise<CustomPageFormState> {
  let target: string | null = null;
  try {
    const access = await getAdminAccess();
    const denied = accessFailure(access, EDITOR_ROLES, PAGE_ENTITY);
    if (denied || access.status !== "authorized") return denied ?? fail("session", PAGE_ENTITY);

    const slug = normalizeText(formText(formData, "slug"));
    const values = {
      eyebrow: "",
      title: formText(formData, "title"),
      description: formText(formData, "description"),
      seo_title: formText(formData, "seo_title"),
      seo_description: formText(formData, "seo_description"),
      seo_image_path: "",
    };
    const { data: page, errors } = validatePageContent(values, null);
    const fieldErrors: Partial<Record<NewPageField, string>> = {};
    for (const field of ["title", "description", "seo_title", "seo_description"] as const) {
      if (errors[field]) fieldErrors[field] = errors[field];
    }
    if (!page.title && !fieldErrors.title) fieldErrors.title = "Preencha o título da página.";
    const slugError = slugProblem(slug);
    if (slugError) fieldErrors.slug = slugError;
    if (Object.keys(fieldErrors).length > 0) return fail("validation", PAGE_ENTITY, { fieldErrors });

    const supabase = await createClient();
    const { data, error, status } = await supabase.rpc("create_custom_page", {
      p_title: page.title ?? "",
      p_slug: slug ?? "",
      p_description: page.description ?? "",
    });
    if (error) {
      if (error.code === "23505") {
        return fail("validation", PAGE_ENTITY, { fieldErrors: { slug: "Já existe uma página com este endereço. Escolha outro." } });
      }
      const failure = editorialDatabaseFailure("criação de página", error, status);
      return fail(failure.reason, PAGE_ENTITY, { message: failure.message });
    }
    target = `/admin/paginas/${data}?criada=1`;

    if (page.seo_title || page.seo_description) {
      // Pessimista: só vira "criada" sem aviso se o SEO for gravado de fato.
      target = `/admin/paginas/${data}?criada=1&seo=falhou`;
      const doc = await supabase
        .from("editorial_documents")
        .select("id, version")
        .eq("custom_page_id", data)
        .maybeSingle();
      const outcome = doc.data
        ? await saveDraftParts(supabase, access.role === "admin", [
            { documentId: doc.data.id, version: doc.data.version, parts: { page: values } },
          ])
        : null;
      if (outcome?.status === "success") target = `/admin/paginas/${data}?criada=1`;
    }
  } catch (error) {
    logActionError("criar página", error);
    if (!target) return fail("connection", PAGE_ENTITY);
  }
  redirect(target ?? "/admin/paginas");
}

export type CustomPageActionResult = { status: "success"; message: string } | FailureState<"slug">;

export async function updateCustomPageSlug(input: { pageId: unknown; slug: unknown }): Promise<CustomPageActionResult> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, PAGE_ENTITY);
    if (denied) return denied;
    const slug = typeof input?.slug === "string" ? normalizeText(input.slug) : null;
    const slugError = slugProblem(slug);
    if (slugError || typeof input.pageId !== "string") {
      return fail("validation", PAGE_ENTITY, { fieldErrors: { slug: slugError ?? "Endereço inválido." } });
    }
    const supabase = await createClient();
    const { error, status } = await supabase.rpc("update_custom_page_slug", { p_page_id: input.pageId, p_slug: slug ?? "" });
    if (error) {
      if (error.code === "23505") {
        return fail("validation", PAGE_ENTITY, { fieldErrors: { slug: "Já existe uma página com este endereço. Escolha outro." } });
      }
      if (error.code === "GL423") {
        return fail("validation", PAGE_ENTITY, { fieldErrors: { slug: capitalize(error.message) } });
      }
      const failure = editorialDatabaseFailure("endereço da página", error, status);
      return fail(failure.reason, PAGE_ENTITY, { message: failure.message });
    }
    refresh();
    return { status: "success", message: "Endereço atualizado." };
  } catch (error) {
    logActionError("alterar endereço da página", error);
    return fail("connection", PAGE_ENTITY);
  }
}

const STATUS_MESSAGES: Record<string, string> = {
  unpublish: "Página despublicada: ela saiu do site, mas continua no CMS com o histórico.",
  archive: "Página arquivada: não aparece no site e continua no CMS com blocos e histórico.",
  unarchive: "Página reativada como rascunho. Publique quando quiser que volte ao site.",
};

export async function setCustomPageStatus(input: { pageId: unknown; action: unknown }): Promise<CustomPageActionResult> {
  try {
    const action = typeof input?.action === "string" && input.action in STATUS_MESSAGES ? input.action : null;
    const access = await getAdminAccess();
    const denied = accessFailure(access, action === "unpublish" ? ADMIN_ROLES : EDITOR_ROLES, PAGE_ENTITY);
    if (denied) return denied;
    if (!action || typeof input.pageId !== "string") return fail("validation", PAGE_ENTITY, { message: "Ação inválida." });

    const supabase = await createClient();
    const { error, status } = await supabase.rpc("set_custom_page_status", { p_page_id: input.pageId, p_action: action });
    if (error) {
      if (error.code === "GL423") return fail("validation", PAGE_ENTITY, { message: capitalize(error.message) });
      if (error.code === "42501") {
        return fail("forbidden", PAGE_ENTITY, {
          message: "Somente administradores despublicam, arquivam ou reativam páginas que já foram publicadas.",
        });
      }
      const failure = editorialDatabaseFailure("situação da página", error, status);
      return fail(failure.reason, PAGE_ENTITY, { message: failure.message });
    }
    refresh();
    return { status: "success", message: STATUS_MESSAGES[action] };
  } catch (error) {
    logActionError("alterar situação da página", error);
    return fail("connection", PAGE_ENTITY);
  }
}


export type RevisionListResult =
  | { status: "success"; items: RevisionListItem[]; page: number; pageCount: number }
  | FailureState;

/** Histórico paginado (sem conteúdo) para o painel do editor visual. */
export async function listEditorialRevisions(input: { documentId: unknown; page: unknown }): Promise<RevisionListResult> {
  try {
    const denied = accessFailure(await getAdminAccess(), EDITOR_ROLES, ENTITY);
    if (denied) return denied;
    const page = Number.isInteger(input?.page) ? Math.max(1, Math.min(10000, input.page as number)) : 1;
    if (typeof input?.documentId !== "string") return fail("not-found", ENTITY);
    const result = await getRevisions(input.documentId, page);
    if (result.status === "error") return fail("connection", ENTITY);
    return { status: "success", items: result.data.items, page: result.data.page, pageCount: result.data.pageCount };
  } catch (error) {
    logActionError("listar revisões", error);
    return fail("connection", ENTITY);
  }
}
