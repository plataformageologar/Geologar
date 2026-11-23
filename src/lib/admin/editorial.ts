import type { PostgrestError } from "@supabase/supabase-js";

import { MEDIA_MISSING_MESSAGE } from "@/lib/media/references";
import {
  ADMIN_DOC_TYPES,
  DOC_PARTS,
  isDocType,
  parseContent,
  parseSections,
  toHomepageValues,
  toNavDrafts,
  toPageValues,
  toPillarDrafts,
  toSectionDrafts,
  toSettingsValues,
  type AnyContent,
  type DocType,
  type PartName,
} from "@/lib/editorial/content";
import { validateAppearance } from "@/lib/site/appearance";
import { validateNavList } from "@/lib/site/navigation";
import { validatePageContent } from "@/lib/site/page-content";
import { validatePillarList } from "@/lib/site/pillars";
import { sectionImagePaths, validateSectionList, type SectionScope, type SectionType } from "@/lib/site/sections";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

import { classifyDatabaseError, type RecordFailure } from "./action-results";
import { parseHomepageValues, type HomepageFormValues } from "./homepage";
import { parseSiteSettingsValues, type SiteSettingsFormValues } from "./site-settings";

/**
 * Núcleo do fluxo editorial no servidor (Etapa 9.6), usado pelas Server
 * Actions do CMS e do editor visual. Lê o documento com a sessão do usuário
 * (RLS), valida cada parte com as mesmas regras de antes e monta o conteúdo
 * completo da unidade, que o banco valida de novo antes de gravar.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type EditorialDocumentRow = {
  id: string;
  type: DocType;
  key: string;
  customPageId: string | null;
  version: number;
  draft: AnyContent | null;
  published: AnyContent | null;
};

export type PartErrors = {
  fieldErrors?: Record<string, string>;
  itemErrors?: Record<string, Record<string, string>>;
  listError?: string;
};

/** Token "documento:versão" usado pelos formulários do CMS (campo oculto). */
export function parseDocumentToken(raw: unknown): { documentId: string; version: number } | null {
  if (typeof raw !== "string") return null;
  const match = /^([0-9a-f-]{36}):(\d{1,9})$/.exec(raw);
  return match ? { documentId: match[1], version: Number(match[2]) } : null;
}

export function documentToken(documentId: string, version: number) {
  return `${documentId}:${version}`;
}

export async function readEditorialDocument(
  supabase: Supabase,
  documentId: string,
): Promise<{ status: "ok"; doc: EditorialDocumentRow } | { status: "error"; reason: RecordFailure }> {
  const { data, error, status } = await supabase
    .from("editorial_documents")
    .select(
      "id, doc_type, doc_key, custom_page_id, version, draft, published:editorial_revisions!editorial_documents_published_revision(content)",
    )
    .eq("id", documentId)
    .maybeSingle();
  if (error) return { status: "error", reason: classifyDatabaseError("leitura de editorial_documents", error, status) };
  if (!data || !isDocType(data.doc_type)) return { status: "error", reason: "not-found" };
  return {
    status: "ok",
    doc: {
      id: data.id,
      type: data.doc_type,
      key: data.doc_key,
      customPageId: data.custom_page_id,
      version: data.version,
      draft: data.draft === null ? null : parseContent(data.doc_type, data.draft),
      published: data.published ? parseContent(data.doc_type, data.published.content) : null,
    },
  };
}

/** Tipo e imagens atuais das seções publicadas (lidos do banco, nunca do navegador). */
async function currentSections(supabase: Supabase, doc: EditorialDocumentRow) {
  const query = supabase.from("page_sections").select("id, section_type, settings");
  const { data, error } =
    doc.type === "custom" && doc.customPageId
      ? await query.eq("page_key", "custom").eq("custom_page_id", doc.customPageId)
      : await query.eq("page_key", doc.type === "rede" ? "rede" : "home");
  if (error) throw error;
  const map = new Map<string, { section_type: SectionType; images: ReadonlySet<string> }>();
  for (const item of parseSections(data)) {
    if (item.id) map.set(item.id, { section_type: item.section_type, images: new Set(sectionImagePaths(item.settings)) });
  }
  return map;
}

function scopeOf(doc: EditorialDocumentRow): SectionScope {
  return doc.type === "custom" ? "custom" : doc.type === "rede" ? "rede" : "home";
}

/**
 * Valida uma parte no formato dos formulários (valores de texto, listas com
 * `key`) e devolve o valor no formato do banco.
 */
export async function validatePart(
  supabase: Supabase,
  doc: EditorialDocumentRow,
  part: PartName,
  raw: unknown,
): Promise<{ value: AnyContent[PartName]; errors?: undefined } | { value?: undefined; errors: PartErrors }> {
  const published = doc.published ?? {};
  switch (part) {
    case "homepage": {
      const { data, errors } = parseHomepageValues(raw as HomepageFormValues, {
        currentImagePath: published.homepage?.hero_image_path ?? null,
      });
      return Object.keys(errors).length > 0 ? { errors: { fieldErrors: errors } } : { value: data };
    }
    case "page": {
      const { data, errors } = validatePageContent(raw, published.page?.seo_image_path ?? null);
      // Página personalizada sempre tem título (é o nome dela no CMS e no site).
      if (doc.type === "custom" && !data.title && !errors.title) errors.title = "Preencha o título da página.";
      return Object.keys(errors).length > 0 ? { errors: { fieldErrors: errors } } : { value: data };
    }
    case "sections": {
      const result = validateSectionList(scopeOf(doc), raw, await currentSections(supabase, doc));
      if (result.listError) return { errors: { listError: result.listError } };
      if (Object.keys(result.errors).length > 0) return { errors: { itemErrors: result.errors } };
      return { value: result.items };
    }
    case "items": {
      const result = validatePillarList(raw);
      if (result.listError) return { errors: { listError: result.listError } };
      if (Object.keys(result.errors).length > 0) return { errors: { itemErrors: result.errors } };
      return { value: result.items };
    }
    case "header":
    case "footer": {
      const result = validateNavList(raw);
      if (result.listError) return { errors: { listError: result.listError } };
      if (Object.keys(result.errors).length > 0) return { errors: { itemErrors: result.errors } };
      return { value: result.items };
    }
    case "appearance": {
      const { data, errors } = validateAppearance(raw);
      return Object.keys(errors).length > 0 ? { errors: { fieldErrors: errors } } : { value: data };
    }
    case "settings": {
      const current = published.settings;
      const { data, errors } = parseSiteSettingsValues(raw as SiteSettingsFormValues, {
        logoPath: current?.logo_path ?? null,
        faviconPath: current?.favicon_path ?? null,
        footerLogoPath: current?.footer_logo_path ?? null,
      });
      return Object.keys(errors).length > 0 ? { errors: { fieldErrors: errors } } : { value: data };
    }
  }
}

/** Conteúdo do banco → valores dos formulários (para validar de novo). */
export function partInput(part: PartName, content: AnyContent): unknown {
  switch (part) {
    case "homepage":
      return content.homepage ? toHomepageValues(content.homepage) : null;
    case "page":
      return content.page ? toPageValues(content.page) : null;
    case "sections":
      return toSectionDrafts(content.sections ?? []);
    case "items":
      return toPillarDrafts(content.items ?? []);
    case "header":
    case "footer":
      return toNavDrafts(content[part] ?? []);
    case "appearance":
      return content.appearance ?? null;
    case "settings":
      return content.settings ? toSettingsValues(content.settings) : null;
  }
}

/** Conteúdo completo da unidade, só com as partes do tipo (formato do banco). */
export function contentForType(type: DocType, content: AnyContent): Json {
  const result: Record<string, unknown> = {};
  for (const part of DOC_PARTS[type]) result[part] = content[part] ?? null;
  return JSON.parse(JSON.stringify(result)) as Json;
}

/**
 * Restauração: ids de itens que não existem mais nas tabelas publicadas viram
 * itens novos (criados de novo ao publicar).
 */
export async function normalizeRestoredContent(
  supabase: Supabase,
  doc: EditorialDocumentRow,
  content: AnyContent,
): Promise<AnyContent> {
  const result: AnyContent = { ...content };
  if (content.sections) {
    const current = await currentSections(supabase, doc);
    result.sections = content.sections.map((item) =>
      item.id && current.has(item.id) && current.get(item.id)?.section_type === item.section_type
        ? item
        : { ...item, id: null },
    );
  }
  if (content.items) {
    const { data, error } = await supabase.from("site_pillars").select("id");
    if (error) throw error;
    const ids = new Set(data.map((row) => row.id));
    result.items = content.items.map((item) => (item.id && ids.has(item.id) ? item : { ...item, id: null }));
  }
  for (const location of ["header", "footer"] as const) {
    const items = content[location];
    if (!items) continue;
    const { data, error } = await supabase.from("site_navigation").select("id").eq("location", location);
    if (error) throw error;
    const ids = new Set(data.map((row) => row.id));
    result[location] = items.map((item) => (item.id && ids.has(item.id) ? item : { ...item, id: null }));
  }
  return result;
}

/** Mensagem para falhas do banco no fluxo editorial. */
export function editorialDatabaseFailure(
  scope: string,
  error: PostgrestError,
  status: number,
): { reason: RecordFailure; message?: string } {
  if (error.code === "GL404") return { reason: "validation", message: "Não há rascunho salvo para publicar." };
  if (error.code === "GL423") return { reason: "validation", message: error.message };
  const reason = classifyDatabaseError(scope, error, status);
  if (reason === "media-missing") return { reason: "validation", message: MEDIA_MISSING_MESSAGE };
  if (reason === "validation") {
    return {
      reason,
      message: "O banco de dados recusou o conteúdo (algum campo está fora das regras). Revise o rascunho e tente de novo.",
    };
  }
  return { reason };
}

// Gravação de rascunho (núcleo comum) ------------------------------------------------

export type DraftRequest = { documentId: string; version: number; parts: Partial<Record<PartName, unknown>> };

export type SavedDocument = { documentId: string; version: number; savedAt: string; content: AnyContent };

export type DraftSaveOutcome =
  | { status: "success"; documents: SavedDocument[] }
  | { status: "error"; reason: RecordFailure; message?: string; partErrors?: Record<string, PartErrors> };

export function isDraftRequest(value: unknown): value is DraftRequest {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.documentId === "string" &&
    Number.isInteger(item.version) &&
    typeof item.parts === "object" &&
    item.parts !== null &&
    !Array.isArray(item.parts)
  );
}

/**
 * Valida as partes enviadas e grava os rascunhos numa única chamada ao banco
 * (uma transação). Cada parte enviada substitui a mesma parte do rascunho
 * atual — ou da versão publicada, quando não há rascunho —; as demais partes
 * são mantidas. Chamado somente depois da verificação de sessão e papel.
 * Erros de validação vêm em `partErrors`, com a chave "documento:parte".
 */
export async function saveDraftParts(
  supabase: Supabase,
  isAdmin: boolean,
  requests: DraftRequest[],
): Promise<DraftSaveOutcome> {
  const partErrors: Record<string, PartErrors> = {};
  const items: { id: string; version: number; content: Json }[] = [];
  const types: DocType[] = [];

  for (const request of requests) {
    const read = await readEditorialDocument(supabase, request.documentId);
    if (read.status === "error") return { status: "error", reason: read.reason };
    const { doc } = read;
    if (ADMIN_DOC_TYPES.includes(doc.type) && !isAdmin) {
      return { status: "error", reason: "forbidden", message: "Somente administradores alteram este conteúdo." };
    }
    if (request.version !== doc.version) return { status: "error", reason: "conflict" };

    const base: AnyContent = { ...(doc.draft ?? doc.published ?? {}) };
    for (const [part, raw] of Object.entries(request.parts) as [PartName, unknown][]) {
      if (!DOC_PARTS[doc.type].includes(part)) {
        return { status: "error", reason: "validation", message: "Conteúdo inválido. Recarregue a página." };
      }
      const result = await validatePart(supabase, doc, part, raw);
      if (result.errors) partErrors[`${doc.id}:${part}`] = result.errors;
      else Object.assign(base, { [part]: result.value });
    }
    items.push({ id: doc.id, version: doc.version, content: contentForType(doc.type, base) });
    types.push(doc.type);
  }

  if (Object.keys(partErrors).length > 0) return { status: "error", reason: "validation", partErrors };

  const { data, error, status } = await supabase.rpc("save_editorial_drafts", { p_items: items });
  if (error) {
    const failure = editorialDatabaseFailure("gravação de rascunho", error, status);
    return { status: "error", reason: failure.reason, message: failure.message };
  }
  const saved = Array.isArray(data) ? (data as { id: string; version: number; saved_at: string }[]) : [];
  if (saved.length !== items.length || saved.some((row, index) => row.id !== items[index].id)) {
    console.error("[cms] Rascunhos devolvidos pelo banco diferem dos enviados.");
    return { status: "error", reason: "unexpected" };
  }
  return {
    status: "success",
    documents: saved.map((row, index) => ({
      documentId: row.id,
      version: row.version,
      savedAt: row.saved_at,
      content: parseContent(types[index], items[index].content) ?? {},
    })),
  };
}

/** Mensagem padrão de sucesso ao salvar rascunho. */
export const DRAFT_SAVED_MESSAGE =
  "Rascunho salvo. O site público continua com a versão publicada até você publicar.";
