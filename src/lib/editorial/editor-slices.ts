import { sanitizeAppearance } from "@/lib/site/appearance";
import { SLICE_PARTS, type DraftSlice, type EditorDraft, type EditorErrors } from "@/lib/site/editor-document";

import type { PartErrors } from "@/lib/admin/editorial";

import {
  toHomepageValues,
  toNavDrafts,
  toPageValues,
  toPillarDrafts,
  toSectionDrafts,
  toSettingsValues,
  type AnyContent,
  type PartName,
} from "./content";

/**
 * Conversão entre o conteúdo das unidades editoriais (formato do banco) e as
 * fatias do rascunho do editor visual (formato dos formulários). Puro: usado
 * no servidor (carregar) e no navegador (depois de salvar ou para visualizar
 * uma revisão).
 */

export function sliceFromContent(slice: DraftSlice, content: AnyContent): Partial<EditorDraft> {
  switch (slice) {
    case "homepage":
      return content.homepage ? { homepage: toHomepageValues(content.homepage) } : {};
    case "settings":
      return content.settings ? { settings: toSettingsValues(content.settings) } : {};
    case "pillars":
      return content.items ? { pillars: toPillarDrafts(content.items) } : {};
    case "sections":
      return content.sections ? { sections: toSectionDrafts(content.sections) } : {};
    case "pageContent":
      return content.page ? { pageContent: toPageValues(content.page) } : {};
    case "navHeader":
      return content.header ? { navHeader: toNavDrafts(content.header) } : {};
    case "navFooter":
      return content.footer ? { navFooter: toNavDrafts(content.footer) } : {};
    case "navUseful":
      return content.useful ? { navUseful: toNavDrafts(content.useful) } : {};
    case "appearance":
      return content.appearance ? { appearance: sanitizeAppearance(content.appearance) } : {};
  }
}

export function slicesFromContent(slices: readonly DraftSlice[], content: AnyContent): Partial<EditorDraft> {
  return Object.assign({}, ...slices.map((slice) => sliceFromContent(slice, content))) as Partial<EditorDraft>;
}

/** Parte da unidade → fatia do editor. */
export function partSlice(part: PartName): DraftSlice | null {
  const entry = (Object.entries(SLICE_PARTS) as [DraftSlice, string][]).find(([, value]) => value === part);
  return entry ? entry[0] : null;
}

/** Erros de validação da parte → erros do editor (campos ou itens da lista). */
export function sliceErrors(slice: DraftSlice, errors: PartErrors): EditorErrors {
  switch (slice) {
    case "homepage":
    case "settings":
    case "pageContent":
    case "appearance":
      return errors.fieldErrors ? ({ [slice]: errors.fieldErrors } as EditorErrors) : {};
    default:
      return errors.itemErrors ? ({ [slice]: errors.itemErrors } as EditorErrors) : {};
  }
}
