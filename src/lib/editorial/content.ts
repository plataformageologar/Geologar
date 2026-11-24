import { homepageFields, toFormValues, type HomepageFormValues, type HomepageRecord } from "@/lib/admin/homepage";
import {
  siteSettingsFields,
  toSiteSettingsFormValues,
  type SiteSettingsFormValues,
  type SiteSettingsRecord,
} from "@/lib/admin/site-settings";
import { isUuid } from "@/lib/admin/validation";
import { sanitizeAppearance, type Appearance } from "@/lib/site/appearance";
import { AVAILABILITY_LABELS, type Experience } from "@/lib/site/experiences";
import type { NavDraft } from "@/lib/site/navigation";
import { pageContentFields, toPageContentValues, type PageContentRecord, type PageContentValues } from "@/lib/site/page-content";
import { isPillarIcon, type PillarDraft, type PillarIcon } from "@/lib/site/pillars";
import {
  isSectionType,
  sanitizeSectionSettings,
  type SectionDraft,
  type SectionSettings,
  type SectionType,
} from "@/lib/site/sections";

/**
 * Conteúdo das unidades editoriais (Etapa 9.6). Mesmo formato do JSONB de
 * `editorial_documents.draft` e `editorial_revisions.content`, que espelha as
 * colunas das tabelas publicadas. Este módulo é puro (navegador e servidor):
 * leitura tolerante do JSONB, conversão para os rascunhos dos formulários e
 * comparação estruturada entre duas versões.
 */

export const DOC_TYPES = ["home", "rede", "page", "pillars", "navigation", "appearance", "settings", "custom"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type SectionItem = { id: string | null; section_type: SectionType; is_visible: boolean; settings: SectionSettings };
export type PillarItem = { id: string | null; title: string; description: string | null; icon: PillarIcon; is_visible: boolean };
export type NavItem = { id: string | null; label: string; href: string; open_in_new_tab: boolean; is_visible: boolean };

export type ContentByType = {
  home: { homepage: HomepageRecord; sections: SectionItem[] };
  rede: { page: PageContentRecord; sections: SectionItem[] };
  page: { page: PageContentRecord };
  custom: { page: PageContentRecord; sections: SectionItem[] };
  pillars: { items: PillarItem[] };
  navigation: { header: NavItem[]; footer: NavItem[] };
  appearance: { appearance: Appearance };
  settings: { settings: SiteSettingsRecord };
};

export type PartName = "homepage" | "sections" | "page" | "items" | "header" | "footer" | "appearance" | "settings";

export type AnyContent = Partial<{
  homepage: HomepageRecord;
  sections: SectionItem[];
  page: PageContentRecord;
  items: PillarItem[];
  header: NavItem[];
  footer: NavItem[];
  appearance: Appearance;
  settings: SiteSettingsRecord;
}>;

export const DOC_PARTS: Record<DocType, readonly PartName[]> = {
  home: ["homepage", "sections"],
  rede: ["page", "sections"],
  page: ["page"],
  custom: ["page", "sections"],
  pillars: ["items"],
  navigation: ["header", "footer"],
  appearance: ["appearance"],
  settings: ["settings"],
};

/** Unidades que só administradores editam e publicam. */
export const ADMIN_DOC_TYPES: readonly DocType[] = ["navigation", "appearance", "settings"];

/** Unidades cuja publicação muda mais de uma página (aviso antes de publicar). */
export const GLOBAL_SCOPE: Partial<Record<DocType, string>> = {
  pillars: "Afeta a página inicial e A Rede.",
  navigation: "Afeta o cabeçalho e o rodapé de todo o site.",
  appearance: "Afeta as cores e o estilo de todo o site.",
  settings: "Afeta cabeçalho, rodapé, contato e metadados de todo o site.",
};

export function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && (DOC_TYPES as readonly string[]).includes(value);
}

const PAGE_LABELS: Record<string, string> = {
  pesquisa: "Pesquisa",
  projetos: "Projetos",
  publicacoes: "Publicações",
  instituicoes: "Instituições",
  contato: "Contato",
};

export function documentLabel(type: DocType, key: string, customTitle?: string | null): string {
  switch (type) {
    case "home":
      return "Página inicial";
    case "rede":
      return "A Rede";
    case "page":
      return `Página ${PAGE_LABELS[key] ?? key}`;
    case "pillars":
      return "Pilares da rede";
    case "navigation":
      return "Navegação (menus)";
    case "appearance":
      return "Aparência";
    case "settings":
      return "Informações institucionais, cabeçalho e rodapé";
    case "custom":
      return customTitle ? `Página “${customTitle}”` : "Página personalizada";
  }
}

// Leitura tolerante ----------------------------------------------------------------

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function pick<F extends string>(raw: unknown, fields: readonly F[]): Record<F, string | null> {
  const source = record(raw);
  return Object.fromEntries(fields.map((field) => [field, text(source[field])])) as Record<F, string | null>;
}

function id(value: unknown): string | null {
  return isUuid(value) ? value : null;
}

function list(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw) ? raw.map(record) : [];
}

export function parseSections(raw: unknown): SectionItem[] {
  return list(raw).flatMap((item) =>
    isSectionType(item.section_type)
      ? [
          {
            id: id(item.id),
            section_type: item.section_type,
            is_visible: item.is_visible !== false,
            settings: sanitizeSectionSettings(item.section_type, item.settings),
          },
        ]
      : [],
  );
}

function parsePillars(raw: unknown): PillarItem[] {
  return list(raw).map((item) => ({
    id: id(item.id),
    title: text(item.title) ?? "",
    description: text(item.description),
    icon: isPillarIcon(item.icon) ? item.icon : "microscope",
    is_visible: item.is_visible !== false,
  }));
}

function parseNav(raw: unknown): NavItem[] {
  return list(raw).map((item) => ({
    id: id(item.id),
    label: text(item.label) ?? "",
    href: text(item.href) ?? "",
    open_in_new_tab: item.open_in_new_tab === true,
    is_visible: item.is_visible !== false,
  }));
}

export function parsePart(part: PartName, raw: unknown): AnyContent[PartName] {
  switch (part) {
    case "homepage":
      return pick(raw, homepageFields) as HomepageRecord;
    case "page":
      return pick(raw, pageContentFields);
    case "sections":
      return parseSections(raw);
    case "items":
      return parsePillars(raw);
    case "header":
    case "footer":
      return parseNav(raw);
    case "appearance":
      return sanitizeAppearance(record(raw));
    case "settings":
      return pick(raw, siteSettingsFields) as SiteSettingsRecord;
  }
}

/** JSONB → conteúdo tipado (somente as partes do tipo; o resto é ignorado). */
export function parseContent(type: DocType, raw: unknown): AnyContent | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const part of DOC_PARTS[type]) result[part] = parsePart(part, source[part]);
  return result as AnyContent;
}

// Rascunhos dos formulários ------------------------------------------------------------

export function toSectionDrafts(items: SectionItem[]): SectionDraft[] {
  return items.map((item, index) => ({ ...item, key: item.id ?? `novo-${index}` }));
}

export function toPillarDrafts(items: PillarItem[]): PillarDraft[] {
  return items.map((item, index) => ({ ...item, description: item.description ?? "", key: item.id ?? `novo-${index}` }));
}

export function toNavDrafts(items: NavItem[]): NavDraft[] {
  return items.map((item, index) => ({ ...item, key: item.id ?? `novo-${index}` }));
}

export function toHomepageValues(value: HomepageRecord): HomepageFormValues {
  return toFormValues(value);
}

export function toPageValues(value: PageContentRecord): PageContentValues {
  return toPageContentValues(value);
}

export function toSettingsValues(value: SiteSettingsRecord): SiteSettingsFormValues {
  return toSiteSettingsFormValues(value);
}

// Comparação estruturada ---------------------------------------------------------------

export type DiffKind = "changed" | "added" | "removed" | "hidden" | "shown" | "moved";

export type DiffEntry = {
  area: string;
  label: string;
  kind: DiffKind;
  before?: string | null;
  after?: string | null;
  /** before/after são caminhos de imagem (mostrar miniaturas). */
  image?: boolean;
};

const PART_LABELS: Record<PartName, string> = {
  homepage: "Textos da página inicial",
  sections: "Seções e blocos",
  page: "Cabeçalho e SEO da página",
  items: "Pilares",
  header: "Menu do cabeçalho",
  footer: "Links do rodapé",
  appearance: "Aparência",
  settings: "Informações institucionais",
};

const FIELD_LABELS: Record<string, string> = {
  hero_title: "Título principal",
  hero_description: "Texto do banner",
  hero_image_path: "Imagem do banner",
  hero_image_alt: "Descrição da imagem do banner",
  hero_primary_cta_label: "Botão principal",
  hero_primary_cta_href: "Link do botão principal",
  hero_secondary_cta_label: "Botão secundário",
  hero_secondary_cta_href: "Link do botão secundário",
  about_title: "Título da apresentação",
  about_description: "Texto da apresentação",
  cooperation_title: "Título da chamada de cooperação",
  cooperation_description: "Texto da chamada de cooperação",
  cooperation_cta_label: "Botão da cooperação",
  cooperation_cta_href: "Link da cooperação",
  eyebrow: "Rótulo",
  title: "Título",
  description: "Descrição",
  seo_title: "Título para buscadores",
  seo_description: "Descrição para buscadores",
  seo_image_path: "Imagem de compartilhamento",
  primary_color: "Cor principal",
  secondary_color: "Cor secundária",
  accent_color: "Cor de destaque",
  section_background: "Fundo das seções",
  button_shape: "Formato dos botões",
  corner_style: "Cantos",
  heading_font: "Fonte dos títulos",
  card_style: "Estilo dos cards",
  site_name: "Nome do site",
  institutional_name: "Nome institucional",
  tagline: "Slogan",
  short_description: "Descrição curta",
  contact_email: "E-mail de contato",
  contact_phone: "Telefone",
  address: "Endereço",
  city: "Cidade",
  state: "Estado",
  country: "País",
  logo_path: "Logotipo",
  favicon_path: "Favicon",
  footer_description: "Descrição do rodapé",
  footer_note: "Nota do rodapé",
  footer_nav_title: "Título da coluna de links",
  footer_contact_title: "Título da coluna de contato",
  footer_social_title: "Título das redes sociais",
  footer_logo_mode: "Logotipo do rodapé",
  footer_logo_path: "Logotipo próprio do rodapé",
  header_style: "Estilo do cabeçalho",
  label: "Identificação complementar",
  external_url: "Endereço de acesso",
  button_label: "Texto do botão",
  unavailable_label: "Texto quando indisponível",
  availability: "Disponibilidade",
  open_in_new_tab: "Abertura do link",
  image_alt: "Texto alternativo da imagem",
  columns: "Colunas",
  background: "Fundo",
};

const IMAGE_FIELDS = new Set(["hero_image_path", "seo_image_path", "logo_path", "favicon_path", "footer_logo_path", "image_path"]);

const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Banner principal",
  about: "Apresentação",
  pillars: "Pilares",
  research: "Linhas de pesquisa",
  projects: "Projetos",
  publications: "Publicações",
  institutions: "Instituições",
  cooperation: "Chamada de cooperação",
  text: "Bloco de texto",
  image_text: "Bloco imagem + texto",
  cta: "Chamada para ação",
  gallery: "Galeria",
  logos: "Logotipos",
  experiences: "Experiências digitais",
};

function display(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function diffObject(area: string, before: Record<string, unknown>, after: Record<string, unknown>, prefix = ""): DiffEntry[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap((key) => {
    const a = display(before[key]);
    const b = display(after[key]);
    if (a === b) return [];
    return [
      {
        area,
        label: `${prefix}${FIELD_LABELS[key] ?? key}`,
        kind: "changed" as const,
        before: a,
        after: b,
        image: IMAGE_FIELDS.has(key),
      },
    ];
  });
}

type ListEntry = { id: string | null; is_visible: boolean };

function diffList<T extends ListEntry>(
  area: string,
  before: T[],
  after: T[],
  name: (item: T) => string,
  fields: (item: T) => Record<string, unknown>,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const beforeIds = before.map((item) => item.id);
  const afterById = new Map(after.filter((item) => item.id).map((item) => [item.id, item]));

  for (const item of before) {
    if (item.id && !afterById.has(item.id)) entries.push({ area, label: name(item), kind: "removed" });
  }
  after.forEach((item, index) => {
    const previous = item.id ? before.find((entry) => entry.id === item.id) : undefined;
    if (!previous) {
      entries.push({ area, label: name(item), kind: "added" });
      return;
    }
    if (previous.is_visible !== item.is_visible) {
      entries.push({ area, label: name(item), kind: item.is_visible ? "shown" : "hidden" });
    }
    const keptBefore = beforeIds.filter((value) => value && afterById.has(value));
    const keptAfter = after.map((entry) => entry.id).filter((value) => value && beforeIds.includes(value));
    if (keptBefore.indexOf(item.id) !== keptAfter.indexOf(item.id)) {
      entries.push({ area, label: name(item), kind: "moved", after: `posição ${index + 1}` });
    }
    entries.push(...diffObject(area, fields(previous), fields(item), `${name(item)}: `));
  });
  return entries;
}

function sectionName(item: SectionItem) {
  const title = typeof item.settings.title === "string" && item.settings.title ? ` “${item.settings.title}”` : "";
  return `${SECTION_LABELS[item.section_type]}${title}`;
}

function sectionFields(item: SectionItem): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item.settings)) {
    // As experiências são comparadas card a card (experienceDiff).
    if (key !== "experiences") fields[key] = value;
  }
  return fields;
}

function experienceFields(item: Experience): Record<string, unknown> {
  return {
    title: item.title,
    label: item.label,
    description: item.description,
    image_path: item.image_path,
    image_alt: item.image_alt,
    external_url: item.external_url,
    button_label: item.button_label,
    unavailable_label: item.unavailable_label,
    availability: AVAILABILITY_LABELS[item.availability],
    open_in_new_tab: item.open_in_new_tab ? "Nova aba" : "Mesma aba",
  };
}

/** Experiências adicionadas, removidas, reordenadas, ocultadas e campos alterados. */
function experienceDiff(area: string, before: SectionItem[], after: SectionItem[]): DiffEntry[] {
  const cards = (items: SectionItem[]) =>
    items.find((item) => item.section_type === "experiences")?.settings.experiences ?? [];
  return diffList(area, cards(before), cards(after), (item) => `Experiência “${item.title}”`, experienceFields);
}

/** Diferenças entre duas versões da mesma unidade (antes → depois). */
export function diffContent(type: DocType, before: AnyContent, after: AnyContent): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const part of DOC_PARTS[type]) {
    const area = PART_LABELS[part];
    switch (part) {
      case "sections":
        entries.push(...diffList(area, before.sections ?? [], after.sections ?? [], sectionName, sectionFields));
        entries.push(...experienceDiff(area, before.sections ?? [], after.sections ?? []));
        break;
      case "items":
        entries.push(
          ...diffList(area, before.items ?? [], after.items ?? [], (item) => item.title || "Pilar", (item) => ({
            title: item.title,
            description: item.description,
            icon: item.icon,
          })),
        );
        break;
      case "header":
      case "footer":
        entries.push(
          ...diffList(area, before[part] ?? [], after[part] ?? [], (item) => item.label || "Link", (item) => ({
            label: item.label,
            href: item.href,
            open_in_new_tab: item.open_in_new_tab ? "Nova aba" : "Mesma aba",
          })),
        );
        break;
      default:
        entries.push(...diffObject(area, record(before[part]), record(after[part])));
    }
  }
  return entries;
}

export const OPERATION_LABELS: Record<string, string> = {
  draft_saved: "Rascunho salvo",
  published: "Publicação",
  restored: "Restauração (novo rascunho)",
};

/** Unidade editorial dos textos de uma página interna (A Rede tem unidade própria). */
export function pageContentDocument(key: string): { type: DocType; key: string } {
  return key === "rede" ? { type: "rede", key: "rede" } : { type: "page", key };
}

/** Tela do CMS onde a unidade é editada. */
/**
 * Há algo a publicar: rascunho diferente da versão publicada (ou unidade
 * nunca publicada). Páginas personalizadas também aceitam um rascunho igual
 * ao publicado, usado para publicá-las de novo depois de despublicar.
 */
export function hasPublishableDraft(unit: { type: DocType; hasDraft: boolean; differs: boolean }): boolean {
  return unit.hasDraft && (unit.differs || unit.type === "custom");
}

export function documentEditHref(type: DocType, key: string): string {
  switch (type) {
    case "home":
      return "/admin/homepage";
    case "rede":
      return "/admin/secoes?pagina=rede";
    case "page":
      return `/admin/textos-das-paginas?pagina=${key}`;
    case "pillars":
      return "/admin/pilares";
    case "navigation":
      return "/admin/navegacao";
    case "appearance":
      return "/admin/aparencia";
    case "settings":
      return "/admin/configuracoes";
    case "custom":
      return `/admin/paginas/${key}`;
  }
}
