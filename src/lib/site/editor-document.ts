import { fallbackHomepageContent, fallbackSiteSettings } from "@/data/site";
import { homepageFields, type HomepageFieldErrors, type HomepageFormValues } from "@/lib/admin/homepage";
import type { SiteSettingsFieldErrors, SiteSettingsFormValues } from "@/lib/admin/site-settings";
import { resolveImageSrc } from "@/lib/queries/shared";
import type {
  HomepageContent,
  InstitutionGroup,
  InstitutionSummary,
  ProjectSummary,
  PublicationSummary,
  ResearchLineSummary,
  SiteSettings,
  SocialLink,
} from "@/types/content";

import type { Appearance, AppearanceFieldErrors } from "./appearance";
import type { EditorPage } from "./editor-pages";
import type { ListVersion } from "./lists";
import type { NavDraft, NavFieldErrors, SiteNavItem } from "./navigation";
import type { PageContentFieldErrors, PageContentKey, PageContentValues } from "./page-content";
import type { Pillar, PillarDraft, PillarFieldErrors } from "./pillars";
import { SECTION_LABELS, type SectionDraft, type SectionFieldErrors, type SectionType } from "./sections";

/**
 * Documento do editor visual: o rascunho editável (mesmos formatos usados
 * pelas telas do CMS e pelas Server Actions), as versões para detectar
 * conflitos e os dados somente leitura usados na pré-visualização.
 *
 * O rascunho nunca é HTML: a tela do editor (iframe) recebe estes dados e
 * renderiza os componentes públicos do site com eles.
 */

export type EditorDraft = {
  homepage: HomepageFormValues | null;
  settings: SiteSettingsFormValues | null;
  pillars: PillarDraft[] | null;
  sections: SectionDraft[] | null;
  pageContent: PageContentValues | null;
  navHeader: NavDraft[] | null;
  navFooter: NavDraft[] | null;
  appearance: Appearance | null;
};

export type DraftSlice = keyof EditorDraft;

export const DRAFT_SLICES: readonly DraftSlice[] = [
  "homepage",
  "settings",
  "pillars",
  "sections",
  "pageContent",
  "navHeader",
  "navFooter",
  "appearance",
];

export type EditorVersions = {
  homepage: string | null;
  settings: string | null;
  pillars: ListVersion[];
  sections: ListVersion[];
  pageContent: string | null;
  navHeader: ListVersion[];
  navFooter: ListVersion[];
  appearance: string | null;
};

export type EditorErrors = {
  homepage?: HomepageFieldErrors;
  settings?: SiteSettingsFieldErrors;
  pillars?: Record<string, PillarFieldErrors>;
  sections?: Record<string, SectionFieldErrors>;
  pageContent?: PageContentFieldErrors;
  navHeader?: Record<string, NavFieldErrors>;
  navFooter?: Record<string, NavFieldErrors>;
  appearance?: AppearanceFieldErrors;
};

/** Dados de leitura para a pré-visualização (registros publicados). */
export type EditorRenderData = {
  researchLines: ResearchLineSummary[];
  projects: ProjectSummary[];
  publications: PublicationSummary[];
  institutionGroups: InstitutionGroup[];
  institutions: Record<string, InstitutionSummary>;
  socialLinks: SocialLink[];
};

/** Registro de uma página de detalhe (projeto ou linha de pesquisa). */
export type EditorDetail = { title: string; editHref: string; published: boolean } | null;

export type EditorDocument = {
  page: EditorPage;
  role: "admin" | "editor";
  /** Seção da página editada (lista de seções) e textos (page_content). */
  sectionPage: "home" | "rede" | null;
  pageContentKey: PageContentKey | null;
  draft: EditorDraft;
  versions: EditorVersions;
  /** Partes que o papel do usuário pode alterar (o servidor confere de novo). */
  editable: Record<DraftSlice, boolean>;
  render: EditorRenderData;
  /** Ids por slug, para abrir o registro no CMS ao clicar em um card. */
  records: { projects: Record<string, string>; researchLines: Record<string, string> };
  institutionOptions: { id: string; name: string; published: boolean }[];
  detail: EditorDetail;
  /** Partes que não puderam ser carregadas (o editor bloqueia a gravação delas). */
  loadErrors: DraftSlice[];
};

// Conversões rascunho → dados dos componentes públicos ---------------------------------

function nullable(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

export function draftHomepageContent(values: HomepageFormValues | null): HomepageContent {
  if (!values) return fallbackHomepageContent;
  const content = Object.fromEntries(homepageFields.map((field) => [field, nullable(values[field])])) as Record<
    (typeof homepageFields)[number],
    string | null
  >;
  return { ...content, hero_image_path: resolveImageSrc(content.hero_image_path) };
}

export function draftSiteSettings(values: SiteSettingsFormValues | null): SiteSettings {
  if (!values) return fallbackSiteSettings;
  return {
    site_name: nullable(values.site_name) ?? fallbackSiteSettings.site_name,
    institutional_name: nullable(values.institutional_name),
    short_description: nullable(values.short_description),
    contact_email: nullable(values.contact_email),
    contact_phone: nullable(values.contact_phone),
    address: nullable(values.address),
    city: nullable(values.city),
    state: nullable(values.state),
    country: nullable(values.country),
    logo_path: nullable(values.logo_path),
    favicon_path: nullable(values.favicon_path),
    footer_description: nullable(values.footer_description),
    footer_note: nullable(values.footer_note),
    footer_nav_title: nullable(values.footer_nav_title),
    footer_contact_title: nullable(values.footer_contact_title),
    footer_social_title: nullable(values.footer_social_title),
    footer_logo_mode: nullable(values.footer_logo_mode) ?? "official",
    footer_logo_path: nullable(values.footer_logo_path),
    header_style: nullable(values.header_style) ?? "solid",
  };
}

export function draftNavigation(items: NavDraft[] | null): SiteNavItem[] {
  return (items ?? [])
    .filter((item) => item.is_visible && item.label.trim() && item.href.trim())
    .map((item) => ({ label: item.label.trim(), href: item.href.trim(), openInNewTab: item.open_in_new_tab }));
}

export function draftPillars(items: PillarDraft[] | null): Pillar[] {
  return (items ?? [])
    .filter((item) => item.is_visible && item.title.trim())
    .map((item) => ({
      id: item.key,
      title: item.title.trim(),
      description: nullable(item.description),
      icon: item.icon,
    }));
}

// Alvos selecionáveis --------------------------------------------------------------------

export type EditorTarget = "header" | "footer" | "page-header" | "appearance" | `section:${string}`;

export function sectionTarget(key: string): EditorTarget {
  return `section:${key}`;
}

export function targetSectionKey(target: EditorTarget | null): string | null {
  return target?.startsWith("section:") ? target.slice("section:".length) : null;
}

export function targetLabel(target: EditorTarget, sections: SectionDraft[] | null): string {
  if (target === "header") return "Cabeçalho";
  if (target === "footer") return "Rodapé";
  if (target === "page-header") return "Título da página";
  if (target === "appearance") return "Aparência do site";
  const key = targetSectionKey(target);
  const section = sections?.find((item) => item.key === key);
  return section ? SECTION_LABELS[section.section_type] : "Seção";
}

/** Campo da homepage → tipo da seção que o exibe. */
export function homepageFieldSection(field: string): SectionType | null {
  if (field.startsWith("hero_")) return "hero";
  if (field.startsWith("about_")) return "about";
  if (field.startsWith("cooperation_")) return "cooperation";
  return null;
}

// Protocolo entre o editor e a tela (iframe) ---------------------------------------------

export const EDITOR_MESSAGE = "geologar-editor";

export type RecordRef =
  | { kind: "project" | "research-line"; slug: string }
  | { kind: "publication" | "institution"; title: string };

export type CanvasState = {
  page: EditorPage;
  sectionPage: "home" | "rede" | null;
  draft: EditorDraft;
  render: EditorRenderData;
  selected: EditorTarget | null;
  /** Rola a tela até o alvo selecionado (seleção pelo painel). */
  scroll: boolean;
};

export type ToCanvasMessage = { source: typeof EDITOR_MESSAGE; type: "state"; state: CanvasState };

export const EDITOR_KEYS = ["undo", "redo", "save", "escape"] as const;
export type EditorKey = (typeof EDITOR_KEYS)[number];

/** Atalho de teclado → comando do editor (também usado dentro da tela). */
export function editorKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey">): EditorKey | null {
  if (event.key === "Escape") return "escape";
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (key === "s") return "save";
  if (key === "y" || (key === "z" && event.shiftKey)) return "redo";
  if (key === "z") return "undo";
  return null;
}

export type FromCanvasMessage =
  | { source: typeof EDITOR_MESSAGE; type: "ready" }
  | { source: typeof EDITOR_MESSAGE; type: "key"; key: EditorKey }
  | { source: typeof EDITOR_MESSAGE; type: "select"; target: EditorTarget; record: RecordRef | null };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY = /^[A-Za-z0-9_-]{1,80}$/;

function isTarget(value: unknown): value is EditorTarget {
  if (typeof value !== "string") return false;
  if (value === "header" || value === "footer" || value === "page-header") return true;
  return value.startsWith("section:") && KEY.test(value.slice("section:".length));
}

function isRecordRef(value: unknown): value is RecordRef {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.kind === "project" || record.kind === "research-line") {
    return typeof record.slug === "string" && record.slug.length <= 160 && SLUG.test(record.slug);
  }
  if (record.kind === "publication" || record.kind === "institution") {
    return typeof record.title === "string" && record.title.length > 0 && record.title.length <= 300;
  }
  return false;
}

/** Valida uma mensagem vinda da tela (origem e janela já conferidas). */
export function parseCanvasMessage(data: unknown): FromCanvasMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.source !== EDITOR_MESSAGE) return null;
  if (message.type === "ready") return { source: EDITOR_MESSAGE, type: "ready" };
  if (message.type === "key" && (EDITOR_KEYS as readonly unknown[]).includes(message.key)) {
    return { source: EDITOR_MESSAGE, type: "key", key: message.key as EditorKey };
  }
  if (message.type === "select" && isTarget(message.target)) {
    return {
      source: EDITOR_MESSAGE,
      type: "select",
      target: message.target,
      record: message.record === null || message.record === undefined ? null : isRecordRef(message.record) ? message.record : null,
    };
  }
  return null;
}
