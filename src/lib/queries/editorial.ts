import { cache } from "react";

import { documentToken } from "@/lib/admin/editorial";
import {
  diffContent,
  documentLabel,
  isDocType,
  parseContent,
  type AnyContent,
  type DocType,
} from "@/lib/editorial/content";
import { isSectionType, sanitizeSectionSettings } from "@/lib/site/sections";
import type { PageContentRecord } from "@/lib/site/page-content";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

import type { AdminResult } from "./admin-content";
import { logQueryError } from "./shared";
import type { RenderSection } from "./site-config";

/**
 * Leituras do fluxo editorial (Etapa 9.6). Rascunhos e histórico são lidos
 * SOMENTE com a sessão do usuário do CMS (RLS: admin/editor ativos). O site
 * público lê as tabelas publicadas; a única leitura pública aqui é a da página
 * personalizada publicada, pelo cliente anônimo (RLS: status published).
 */

const documentColumns =
  "id, doc_type, doc_key, custom_page_id, version, draft, draft_updated_at, draft_updated_by_email, published_at, published_by_email, published:editorial_revisions!editorial_documents_published_revision(revision_number, content)";

export type EditorialView = {
  id: string;
  type: DocType;
  key: string;
  label: string;
  version: number;
  /** "documento:versão" (campo oculto dos formulários). */
  token: string;
  draft: AnyContent | null;
  published: AnyContent | null;
  /** O que o CMS edita: o rascunho, ou a versão publicada quando não há rascunho. */
  current: AnyContent;
  hasDraft: boolean;
  /** Rascunho com diferenças em relação à versão publicada. */
  differs: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedRevision: number | null;
};

/** O que a barra editorial do CMS precisa saber da unidade (serializável). */
export type EditorialDocInfo = {
  id: string;
  type: DocType;
  label: string;
  version: number;
  hasDraft: boolean;
  differs: boolean;
  /** Já existe versão publicada (páginas novas não têm). */
  hasPublished: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedRevision: number | null;
};

export function docInfo(view: EditorialView): EditorialDocInfo {
  return {
    id: view.id,
    type: view.type,
    label: view.label,
    version: view.version,
    hasDraft: view.hasDraft,
    differs: view.differs,
    hasPublished: view.published !== null,
    draftUpdatedAt: view.draftUpdatedAt,
    draftUpdatedBy: view.draftUpdatedBy,
    publishedAt: view.publishedAt,
    publishedBy: view.publishedBy,
    publishedRevision: view.publishedRevision,
  };
}

type DocumentRow = {
  id: string;
  doc_type: string;
  doc_key: string;
  custom_page_id: string | null;
  version: number;
  draft: unknown;
  draft_updated_at: string | null;
  draft_updated_by_email: string | null;
  published_at: string | null;
  published_by_email: string | null;
  published: { revision_number: number; content: unknown } | null;
};

function toView(row: DocumentRow, customTitle?: string | null): EditorialView | null {
  if (!isDocType(row.doc_type)) return null;
  const type = row.doc_type;
  const draft = row.draft === null ? null : parseContent(type, row.draft);
  const published = row.published ? parseContent(type, row.published.content) : null;
  const differs = draft !== null && (published === null || diffContent(type, published, draft).length > 0);
  return {
    id: row.id,
    type,
    key: row.doc_key,
    label: documentLabel(type, row.doc_key, customTitle),
    version: row.version,
    token: documentToken(row.id, row.version),
    draft,
    published,
    current: draft ?? published ?? {},
    hasDraft: draft !== null,
    differs,
    draftUpdatedAt: row.draft_updated_at,
    draftUpdatedBy: row.draft_updated_by_email,
    publishedAt: row.published_at,
    publishedBy: row.published_by_email,
    publishedRevision: row.published?.revision_number ?? null,
  };
}

/** Unidade editorial pelo tipo e chave (ex.: "page", "contato"). */
export async function getEditorialDocument(type: DocType, key: string): Promise<AdminResult<EditorialView | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editorial_documents")
    .select(documentColumns)
    .eq("doc_type", type)
    .eq("doc_key", key)
    .maybeSingle<DocumentRow>();
  if (error) {
    logQueryError("editorial_documents (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data: data ? toView(data) : null };
}

export async function getEditorialDocumentById(id: string): Promise<AdminResult<EditorialView | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editorial_documents")
    .select(`${documentColumns}, page:custom_pages(title)`)
    .eq("id", id)
    .maybeSingle<DocumentRow & { page: { title: string } | null }>();
  if (error) {
    logQueryError("editorial_documents (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data: data ? toView(data, data.page?.title) : null };
}

/** Várias unidades de uma vez (editor visual), indexadas por "tipo:chave". */
export async function getEditorialDocuments(
  refs: readonly { type: DocType; key: string }[],
): Promise<AdminResult<Record<string, EditorialView>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editorial_documents")
    .select(documentColumns)
    .in("doc_type", [...new Set(refs.map((ref) => ref.type))])
    .in("doc_key", [...new Set(refs.map((ref) => ref.key))])
    .returns<DocumentRow[]>();
  if (error) {
    logQueryError("editorial_documents (editor)", error);
    return { status: "error" };
  }
  const result: Record<string, EditorialView> = {};
  for (const row of data) {
    const view = toView(row);
    if (view && refs.some((ref) => ref.type === view.type && ref.key === view.key)) {
      result[`${view.type}:${view.key}`] = view;
    }
  }
  return { status: "ready", data: result };
}

// Histórico ------------------------------------------------------------------------

export const REVISIONS_PAGE_SIZE = 25;

/**
 * Números das revisões de origem (restaurações). O PostgREST não incorpora
 * relações de uma tabela com ela mesma sem "computed relationships", então a
 * origem é lida numa segunda consulta (somente leitura, mesma sessão/RLS).
 */
async function restoredNumbers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null)[],
): Promise<Map<string, number> | null> {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("editorial_revisions").select("id, revision_number").in("id", unique);
  if (error) {
    logQueryError("editorial_revisions (origem)", error);
    return null;
  }
  return new Map(data.map((row) => [row.id, row.revision_number]));
}

export type RevisionListItem = {
  id: string;
  number: number;
  operation: string;
  authorEmail: string | null;
  note: string | null;
  createdAt: string;
  restoredFrom: number | null;
};

export async function getRevisions(
  documentId: string,
  page: number,
): Promise<AdminResult<{ items: RevisionListItem[]; total: number; page: number; pageCount: number }>> {
  const supabase = await createClient();
  const from = (page - 1) * REVISIONS_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("editorial_revisions")
    .select(
      "id, revision_number, operation, author_email, note, created_at, restored_from_id",
      { count: "exact" },
    )
    .eq("document_id", documentId)
    .order("revision_number", { ascending: false })
    .range(from, from + REVISIONS_PAGE_SIZE - 1);
  if (error) {
    logQueryError("editorial_revisions (CMS)", error);
    return { status: "error" };
  }
  const origins = await restoredNumbers(supabase, data.map((row) => row.restored_from_id));
  if (!origins) return { status: "error" };
  const total = count ?? data.length;
  return {
    status: "ready",
    data: {
      items: data.map((row) => ({
        id: row.id,
        number: row.revision_number,
        operation: row.operation,
        authorEmail: row.author_email,
        note: row.note,
        createdAt: row.created_at,
        restoredFrom: row.restored_from_id ? (origins.get(row.restored_from_id) ?? null) : null,
      })),
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / REVISIONS_PAGE_SIZE)),
    },
  };
}

export type RevisionDetail = RevisionListItem & { documentId: string; content: AnyContent | null };

export async function getRevision(id: string): Promise<AdminResult<RevisionDetail | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editorial_revisions")
    .select(
      "id, document_id, revision_number, operation, author_email, note, created_at, content, restored_from_id, document:editorial_documents!editorial_revisions_document_id_fkey(doc_type)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logQueryError("editorial_revisions (CMS)", error);
    return { status: "error" };
  }
  if (!data) return { status: "ready", data: null };
  const origins = await restoredNumbers(supabase, [data.restored_from_id]);
  if (!origins) return { status: "error" };
  const type = data.document?.doc_type;
  return {
    status: "ready",
    data: {
      id: data.id,
      documentId: data.document_id,
      number: data.revision_number,
      operation: data.operation,
      authorEmail: data.author_email,
      note: data.note,
      createdAt: data.created_at,
      restoredFrom: data.restored_from_id ? (origins.get(data.restored_from_id) ?? null) : null,
      content: isDocType(type) ? parseContent(type, data.content) : null,
    },
  };
}

/** Conteúdo de outra revisão do mesmo documento, pelo número (comparação). */
export async function getRevisionContentByNumber(
  documentId: string,
  number: number,
): Promise<AdminResult<{ id: string; content: unknown } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("editorial_revisions")
    .select("id, content")
    .eq("document_id", documentId)
    .eq("revision_number", number)
    .maybeSingle();
  if (error) {
    logQueryError("editorial_revisions (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data };
}

// Páginas personalizadas -------------------------------------------------------------

export type CustomPageStatus = "draft" | "published" | "archived";

export type CustomPageSummary = {
  id: string;
  slug: string;
  title: string;
  status: CustomPageStatus;
  publishedAt: string | null;
  firstPublishedAt: string | null;
  updatedAt: string;
  documentId: string | null;
  hasDraft: boolean;
};

function pageStatus(value: string): CustomPageStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

const summaryColumns =
  "id, slug, title, status, published_at, first_published_at, updated_at, document:editorial_documents(id, draft_updated_at)";

type SummaryRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
  first_published_at: string | null;
  updated_at: string;
  document: { id: string; draft_updated_at: string | null }[] | { id: string; draft_updated_at: string | null } | null;
};

function toSummary(row: SummaryRow): CustomPageSummary {
  const document = Array.isArray(row.document) ? (row.document[0] ?? null) : row.document;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: pageStatus(row.status),
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
    updatedAt: row.updated_at,
    documentId: document?.id ?? null,
    hasDraft: Boolean(document?.draft_updated_at),
  };
}

/** Todas as páginas personalizadas (CMS), incluindo rascunhos e arquivadas. */
export async function getCustomPagesForAdmin(): Promise<AdminResult<CustomPageSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_pages")
    .select(summaryColumns)
    .order("status")
    .order("title")
    .limit(300)
    .returns<SummaryRow[]>();
  if (error) {
    logQueryError("custom_pages (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data: data.map(toSummary) };
}

export type CustomPageForEdit = CustomPageSummary & { view: EditorialView };

export async function getCustomPageForAdmin(id: string): Promise<AdminResult<CustomPageForEdit | null>> {
  const supabase = await createClient();
  const page = await supabase.from("custom_pages").select(summaryColumns).eq("id", id).maybeSingle<SummaryRow>();
  if (page.error) {
    logQueryError("custom_pages (CMS)", page.error);
    return { status: "error" };
  }
  if (!page.data) return { status: "ready", data: null };
  const summary = toSummary(page.data);
  if (!summary.documentId) return { status: "ready", data: null };
  const view = await getEditorialDocumentById(summary.documentId);
  if (view.status === "error") return view;
  return { status: "ready", data: view.data ? { ...summary, view: { ...view.data, label: documentLabel("custom", view.data.key, summary.title) } } : null };
}

/** Página personalizada pelo endereço (CMS: qualquer situação). */
export async function getCustomPageIdBySlug(slug: string): Promise<AdminResult<CustomPageSummary | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("custom_pages").select(summaryColumns).eq("slug", slug).maybeSingle<SummaryRow>();
  if (error) {
    logQueryError("custom_pages (CMS)", error);
    return { status: "error" };
  }
  return { status: "ready", data: data ? toSummary(data) : null };
}

export type PublishedCustomPage = {
  id: string;
  slug: string;
  content: PageContentRecord;
  sections: RenderSection[];
};

/**
 * Página personalizada publicada (site público, cliente anônimo). Rascunhos e
 * páginas arquivadas não são devolvidos — o RLS também os bloqueia.
 */
export const getPublishedCustomPage = cache(async (slug: string): Promise<PublishedCustomPage | null> => {
  const client = createPublicClient();
  const { data, error } = await client
    .from("custom_pages")
    .select("id, slug, eyebrow, title, description, seo_title, seo_description, seo_image_path")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    logQueryError("custom_pages", error);
    throw new Error("Falha ao carregar a página");
  }
  if (!data) return null;
  const sections = await client
    .from("page_sections")
    .select("id, section_type, settings")
    .eq("page_key", "custom")
    .eq("custom_page_id", data.id)
    .eq("is_visible", true)
    .order("sort_order")
    .order("created_at");
  if (sections.error) {
    logQueryError("page_sections (página personalizada)", sections.error);
    throw new Error("Falha ao carregar a página");
  }
  return {
    id: data.id,
    slug: data.slug,
    content: {
      eyebrow: data.eyebrow,
      title: data.title,
      description: data.description,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_image_path: data.seo_image_path,
    },
    sections: sections.data.flatMap((row) =>
      isSectionType(row.section_type)
        ? [{ id: row.id, section_type: row.section_type, settings: sanitizeSectionSettings(row.section_type, row.settings) }]
        : [],
    ),
  };
});
