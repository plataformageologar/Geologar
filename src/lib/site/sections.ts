import { isLocalImagePath, isMediaObjectName } from "@/lib/media/config";
import { isUuid, normalizeText, validateHref, validateText, type TextRule } from "@/lib/admin/validation";

/**
 * Seções das páginas personalizáveis (homepage e /rede). Mesmas regras da
 * função public.is_valid_section_settings (migration
 * 20261120090000_visual_editor_customization): chaves permitidas por tipo,
 * limites de texto e valores fechados. Nada de HTML, CSS ou componentes
 * livres — o site só renderiza tipos conhecidos com opções conhecidas.
 */

export const SECTION_PAGES = ["home", "rede"] as const;
export type SectionPage = (typeof SECTION_PAGES)[number];

export const BUILTIN_SECTION_TYPES = [
  "hero",
  "about",
  "pillars",
  "research",
  "projects",
  "publications",
  "institutions",
  "cooperation",
] as const;
export const BLOCK_TYPES = ["text", "image_text", "cta", "gallery", "logos"] as const;

export type BuiltinSectionType = (typeof BUILTIN_SECTION_TYPES)[number];
export type BlockType = (typeof BLOCK_TYPES)[number];
export type SectionType = BuiltinSectionType | BlockType;

export const BACKGROUNDS = ["default", "surface", "muted", "deep", "primary"] as const;
export const HERO_LAYOUTS = ["default", "centered", "split"] as const;
export const IMAGE_POSITIONS = ["center", "top", "bottom", "left", "right"] as const;
export const OVERLAYS = ["light", "medium", "strong"] as const;
export const ALIGNS = ["left", "center"] as const;
export const IMAGE_SIDES = ["left", "right"] as const;
export const LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const COLUMN_OPTIONS = [2, 3, 4] as const;

export type Background = (typeof BACKGROUNDS)[number];
export type HeroLayout = (typeof HERO_LAYOUTS)[number];
export type ImagePosition = (typeof IMAGE_POSITIONS)[number];
export type Overlay = (typeof OVERLAYS)[number];
export type Align = (typeof ALIGNS)[number];
export type ImageSide = (typeof IMAGE_SIDES)[number];
export type Columns = (typeof COLUMN_OPTIONS)[number];

export type GalleryImage = { path: string; alt: string };

export type SectionSettings = {
  eyebrow?: string;
  title?: string;
  description?: string;
  cta_label?: string;
  cta_href?: string;
  background?: Background;
  limit?: number;
  columns?: Columns;
  layout?: HeroLayout;
  image_position?: ImagePosition;
  overlay?: Overlay;
  show_primary_cta?: boolean;
  show_secondary_cta?: boolean;
  show_pillars?: boolean;
  align?: Align;
  image_side?: ImageSide;
  image_path?: string;
  image_alt?: string;
  images?: GalleryImage[];
  institution_ids?: string[];
};

export type SettingKey = keyof SectionSettings;

export const SECTION_KEYS: Record<SectionType, readonly SettingKey[]> = {
  hero: ["eyebrow", "layout", "image_position", "overlay", "show_primary_cta", "show_secondary_cta"],
  about: ["eyebrow", "cta_label", "cta_href", "background", "show_pillars"],
  pillars: ["eyebrow", "title", "description", "background"],
  research: ["eyebrow", "title", "description", "cta_label", "cta_href", "limit", "columns", "background"],
  projects: ["eyebrow", "title", "description", "cta_label", "cta_href", "limit", "columns", "background"],
  publications: ["eyebrow", "title", "description", "cta_label", "cta_href", "limit", "background"],
  institutions: ["eyebrow", "title", "description", "cta_label", "cta_href", "background"],
  cooperation: ["background"],
  text: ["eyebrow", "title", "description", "cta_label", "cta_href", "align", "background"],
  image_text: ["eyebrow", "title", "description", "cta_label", "cta_href", "image_path", "image_alt", "image_side", "background"],
  cta: ["title", "description", "cta_label", "cta_href", "background"],
  gallery: ["title", "description", "images", "columns", "background"],
  logos: ["title", "description", "institution_ids", "background"],
};

export const SECTION_TEXT_RULES = {
  eyebrow: { max: 60 },
  title: { max: 160 },
  description: { max: 2000, multiline: true },
  cta_label: { max: 60 },
  image_alt: { max: 200 },
} satisfies Partial<Record<SettingKey, TextRule>>;

type TextKey = keyof typeof SECTION_TEXT_RULES;
const TEXT_KEYS = Object.keys(SECTION_TEXT_RULES) as TextKey[];

export const GALLERY_MAX_IMAGES = 12;
export const LOGOS_MAX_INSTITUTIONS = 24;
export const SECTIONS_MAX = 40;

/** Seções nativas de cada página (uma de cada; só podem ser ocultadas). */
export const PAGE_BUILTINS: Record<SectionPage, readonly BuiltinSectionType[]> = {
  home: ["hero", "about", "research", "projects", "publications", "institutions", "cooperation"],
  rede: ["pillars", "research", "cooperation"],
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Banner principal",
  about: "Apresentação da rede",
  pillars: "Pilares da rede",
  research: "Linhas de pesquisa",
  projects: "Projetos em destaque",
  publications: "Publicações recentes",
  institutions: "Instituições",
  cooperation: "Chamada para cooperação",
  text: "Bloco de texto",
  image_text: "Imagem e texto",
  cta: "Chamada para ação",
  gallery: "Galeria de imagens",
  logos: "Lista de logotipos",
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  text: "Título, texto e um botão opcional.",
  image_text: "Imagem da biblioteca ao lado de um texto.",
  cta: "Faixa de destaque com título, texto e botão.",
  gallery: "Até 12 imagens da biblioteca, em grade.",
  logos: "Logotipos de instituições já cadastradas e publicadas.",
};

export const BACKGROUND_LABELS: Record<Background, string> = {
  default: "Padrão da página",
  surface: "Branco",
  muted: "Areia",
  deep: "Azul escuro",
  primary: "Cor principal",
};

export const HERO_LAYOUT_LABELS: Record<HeroLayout, string> = {
  default: "Texto à esquerda",
  centered: "Texto centralizado",
  split: "Texto e imagem lado a lado",
};

export const IMAGE_POSITION_LABELS: Record<ImagePosition, string> = {
  center: "Centro",
  top: "Topo",
  bottom: "Base",
  left: "Esquerda",
  right: "Direita",
};

export const OVERLAY_LABELS: Record<Overlay, string> = {
  light: "Suave",
  medium: "Média",
  strong: "Forte",
};

export const ALIGN_LABELS: Record<Align, string> = { left: "À esquerda", center: "Centralizado" };
export const IMAGE_SIDE_LABELS: Record<ImageSide, string> = { left: "Imagem à esquerda", right: "Imagem à direita" };

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && (BLOCK_TYPES as readonly string[]).includes(value);
}

export function isSectionType(value: unknown): value is SectionType {
  return (
    typeof value === "string" &&
    ((BUILTIN_SECTION_TYPES as readonly string[]).includes(value) || isBlockType(value))
  );
}

export function isSectionPage(value: unknown): value is SectionPage {
  return value === "home" || value === "rede";
}

function oneOf<T extends string | number>(options: readonly T[], value: unknown): value is T {
  return (options as readonly unknown[]).includes(value);
}

function isImageReference(value: unknown): value is string {
  return typeof value === "string" && (isMediaObjectName(value) || isLocalImagePath(value));
}

/**
 * Leitura tolerante (renderização): mantém só as chaves válidas para o tipo.
 * Um valor inesperado no banco nunca chega aos componentes.
 */
export function sanitizeSectionSettings(type: SectionType, raw: unknown): SectionSettings {
  const result: SectionSettings = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return result;
  const source = raw as Record<string, unknown>;

  for (const key of SECTION_KEYS[type]) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    switch (key) {
      case "eyebrow":
      case "title":
      case "description":
      case "cta_label":
      case "image_alt":
        if (typeof value === "string" && value.trim() !== "" && value.length <= SECTION_TEXT_RULES[key].max * 2) {
          result[key] = value;
        }
        break;
      case "cta_href":
        if (typeof value === "string" && validateHref(value) === null) result.cta_href = value;
        break;
      case "background":
        if (oneOf(BACKGROUNDS, value)) result.background = value;
        break;
      case "limit":
        if (oneOf(LIMIT_OPTIONS, value)) result.limit = value;
        break;
      case "columns":
        if (oneOf(COLUMN_OPTIONS, value)) result.columns = value;
        break;
      case "layout":
        if (oneOf(HERO_LAYOUTS, value)) result.layout = value;
        break;
      case "image_position":
        if (oneOf(IMAGE_POSITIONS, value)) result.image_position = value;
        break;
      case "overlay":
        if (oneOf(OVERLAYS, value)) result.overlay = value;
        break;
      case "align":
        if (oneOf(ALIGNS, value)) result.align = value;
        break;
      case "image_side":
        if (oneOf(IMAGE_SIDES, value)) result.image_side = value;
        break;
      case "show_primary_cta":
      case "show_secondary_cta":
      case "show_pillars":
        if (typeof value === "boolean") result[key] = value;
        break;
      case "image_path":
        if (isImageReference(value)) result.image_path = value;
        break;
      case "images":
        if (Array.isArray(value)) {
          result.images = value
            .filter(
              (item): item is { path: string; alt?: unknown } =>
                typeof item === "object" && item !== null && isImageReference((item as { path?: unknown }).path),
            )
            .slice(0, GALLERY_MAX_IMAGES)
            .map((item) => ({ path: item.path, alt: typeof item.alt === "string" ? item.alt : "" }));
        }
        break;
      case "institution_ids":
        if (Array.isArray(value)) {
          result.institution_ids = value.filter(isUuid).slice(0, LOGOS_MAX_INSTITUTIONS);
        }
        break;
    }
  }
  return result;
}

export type SectionFieldErrors = Partial<Record<SettingKey, string>>;

/**
 * Validação definitiva (Server Action) e retorno imediato (formulários).
 * Textos são normalizados; vazios são removidos (a seção usa o padrão).
 * `currentImages`: imagens já gravadas na seção (aceitas sem alteração).
 */
export function validateSectionSettings(
  type: SectionType,
  raw: unknown,
  currentImages: ReadonlySet<string> = new Set(),
): { data: SectionSettings; errors: SectionFieldErrors } {
  const errors: SectionFieldErrors = {};
  const data: SectionSettings = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { data, errors: { title: "Configuração inválida." } };
  }
  const source = raw as Record<string, unknown>;
  const allowed = SECTION_KEYS[type];

  for (const key of Object.keys(source)) {
    if (!(allowed as readonly string[]).includes(key)) {
      // Chave desconhecida: nunca gravada (o banco também recusaria).
      errors.title ??= "Configuração inválida.";
    }
  }

  const imageAccepted = (value: string) =>
    isMediaObjectName(value) || (currentImages.has(value) && isLocalImagePath(value));

  for (const key of allowed) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;

    if ((TEXT_KEYS as readonly string[]).includes(key)) {
      const textKey = key as TextKey;
      if (typeof value !== "string") {
        errors[textKey] = "Valor inválido.";
        continue;
      }
      const rule: TextRule = SECTION_TEXT_RULES[textKey];
      const text = normalizeText(value, rule.multiline);
      const error = validateText(text, rule);
      if (error) errors[textKey] = error;
      else if (text !== null) data[textKey] = text;
      continue;
    }

    switch (key) {
      case "cta_href": {
        const href = typeof value === "string" ? normalizeText(value) : null;
        const error = typeof value === "string" ? validateHref(href) : "Informe um endereço válido.";
        if (error) errors.cta_href = error;
        else if (href !== null) data.cta_href = href;
        break;
      }
      case "background":
        if (oneOf(BACKGROUNDS, value)) data.background = value;
        else errors.background = "Escolha uma das opções.";
        break;
      case "limit":
        if (oneOf(LIMIT_OPTIONS, value)) data.limit = value;
        else errors.limit = "Escolha entre 1 e 12 itens.";
        break;
      case "columns":
        if (oneOf(COLUMN_OPTIONS, value)) data.columns = value;
        else errors.columns = "Escolha 2, 3 ou 4 colunas.";
        break;
      case "layout":
        if (oneOf(HERO_LAYOUTS, value)) data.layout = value;
        else errors.layout = "Escolha uma das opções.";
        break;
      case "image_position":
        if (oneOf(IMAGE_POSITIONS, value)) data.image_position = value;
        else errors.image_position = "Escolha uma das opções.";
        break;
      case "overlay":
        if (oneOf(OVERLAYS, value)) data.overlay = value;
        else errors.overlay = "Escolha uma das opções.";
        break;
      case "align":
        if (oneOf(ALIGNS, value)) data.align = value;
        else errors.align = "Escolha uma das opções.";
        break;
      case "image_side":
        if (oneOf(IMAGE_SIDES, value)) data.image_side = value;
        else errors.image_side = "Escolha uma das opções.";
        break;
      case "show_primary_cta":
      case "show_secondary_cta":
      case "show_pillars":
        if (typeof value === "boolean") data[key] = value;
        else errors[key] = "Valor inválido.";
        break;
      case "image_path":
        if (typeof value === "string" && imageAccepted(value)) data.image_path = value;
        else errors.image_path = "Selecione uma imagem da biblioteca de mídia.";
        break;
      case "images": {
        if (!Array.isArray(value) || value.length > GALLERY_MAX_IMAGES) {
          errors.images = `Escolha até ${GALLERY_MAX_IMAGES} imagens.`;
          break;
        }
        const images: GalleryImage[] = [];
        for (const item of value) {
          const entry = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null;
          const path = entry?.path;
          const altRaw = entry?.alt ?? "";
          const extra = entry ? Object.keys(entry).some((name) => name !== "path" && name !== "alt") : true;
          if (extra || typeof path !== "string" || !imageAccepted(path) || typeof altRaw !== "string") {
            errors.images = "Selecione as imagens na biblioteca de mídia.";
            break;
          }
          const alt = normalizeText(altRaw) ?? "";
          const altError = validateText(alt || null, SECTION_TEXT_RULES.image_alt);
          if (altError) {
            errors.images = `Texto alternativo: ${altError.toLowerCase()}`;
            break;
          }
          images.push({ path, alt });
        }
        if (!errors.images) data.images = images;
        break;
      }
      case "institution_ids": {
        if (!Array.isArray(value) || value.length > LOGOS_MAX_INSTITUTIONS || !value.every(isUuid)) {
          errors.institution_ids = `Escolha até ${LOGOS_MAX_INSTITUTIONS} instituições.`;
          break;
        }
        data.institution_ids = [...new Set(value)];
        break;
      }
    }
  }

  return { data, errors };
}

/** Imagens referenciadas pelas configurações (para o uso de mídia e validação). */
export function sectionImagePaths(settings: SectionSettings): string[] {
  const paths = new Set<string>();
  if (settings.image_path) paths.add(settings.image_path);
  for (const image of settings.images ?? []) paths.add(image.path);
  return [...paths];
}

/** Item da lista em edição (CMS e editor visual). */
export type SectionDraft = {
  /** `null` para um bloco ainda não gravado. */
  id: string | null;
  /** Chave estável no navegador (React), nunca enviada ao banco como id. */
  key: string;
  section_type: SectionType;
  is_visible: boolean;
  settings: SectionSettings;
};

export type SectionListErrors = Record<string, SectionFieldErrors>;

/**
 * Valida a lista completa de uma página (Server Action). Regras extras além
 * das configurações: ids existentes em formato UUID, sem repetição; itens
 * novos só podem ser blocos; seções nativas da página não podem sumir.
 */
export function validateSectionList(
  page: SectionPage,
  raw: unknown,
  current: ReadonlyMap<string, { section_type: SectionType; images: ReadonlySet<string> }>,
): { items: Omit<SectionDraft, "key">[]; errors: SectionListErrors; listError: string | null } {
  const errors: SectionListErrors = {};
  if (!Array.isArray(raw) || raw.length > SECTIONS_MAX) {
    return { items: [], errors, listError: "Lista de seções inválida." };
  }

  const items: Omit<SectionDraft, "key">[] = [];
  const seen = new Set<string>();
  let listError: string | null = null;

  raw.forEach((entry: unknown, index) => {
    const item = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    const errorKey = typeof item.key === "string" ? item.key : String(index);
    const id = item.id === null || item.id === undefined ? null : item.id;
    const type = item.section_type;

    if (id !== null && (!isUuid(id) || seen.has(id) || !current.has(id))) {
      listError = "A lista de seções mudou. Recarregue a página.";
      return;
    }
    if (!isSectionType(type)) {
      listError = "Tipo de seção desconhecido.";
      return;
    }
    if (id === null && !isBlockType(type)) {
      listError = "Seções nativas não podem ser adicionadas novamente.";
      return;
    }
    if (id !== null && current.get(id)?.section_type !== type) {
      listError = "O tipo de uma seção existente não pode ser alterado.";
      return;
    }
    if (typeof item.is_visible !== "boolean") {
      listError = "Lista de seções inválida.";
      return;
    }
    if (id !== null) seen.add(id);

    const { data, errors: fieldErrors } = validateSectionSettings(
      type,
      item.settings,
      id !== null ? current.get(id)?.images : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) errors[errorKey] = fieldErrors;
    items.push({ id: id as string | null, section_type: type, is_visible: item.is_visible, settings: data });
  });

  if (!listError) {
    for (const builtin of PAGE_BUILTINS[page]) {
      const existing = [...current.values()].some((entry) => entry.section_type === builtin);
      if (existing && !items.some((item) => item.section_type === builtin)) {
        listError = "Seções nativas podem ser ocultadas, mas não excluídas.";
      }
    }
  }

  return { items, errors, listError };
}

/** Conteúdo inicial (igual às seeds da migration): fallback sem banco. */
export const DEFAULT_SECTIONS: Record<SectionPage, { section_type: SectionType; settings: SectionSettings }[]> = {
  home: [
    {
      section_type: "hero",
      settings: { eyebrow: "Rede de Pesquisa em Geociências", layout: "default", image_position: "right", overlay: "medium" },
    },
    {
      section_type: "about",
      settings: { eyebrow: "A Rede", cta_label: "Saiba mais sobre a rede", cta_href: "/rede", show_pillars: true },
    },
    {
      section_type: "research",
      settings: {
        eyebrow: "Pesquisa",
        title: "Nossas linhas de pesquisa",
        cta_label: "Ver todas as linhas",
        cta_href: "/pesquisa",
        limit: 6,
        columns: 3,
        background: "muted",
      },
    },
    {
      section_type: "projects",
      settings: {
        eyebrow: "Projetos",
        title: "Pesquisa com resultados",
        cta_label: "Ver todos os projetos",
        cta_href: "/projetos",
        limit: 3,
        columns: 3,
      },
    },
    {
      section_type: "publications",
      settings: {
        eyebrow: "Publicações",
        title: "Conhecimento publicado",
        cta_label: "Ver todas as publicações",
        cta_href: "/publicacoes",
        limit: 5,
        background: "surface",
      },
    },
    {
      section_type: "institutions",
      settings: {
        eyebrow: "Instituições",
        title: "Instituições que conectam a rede",
        cta_label: "Conheça nossas instituições parceiras",
        cta_href: "/instituicoes",
      },
    },
    { section_type: "cooperation", settings: { background: "primary" } },
  ],
  rede: [
    { section_type: "pillars", settings: { eyebrow: "Atuação", title: "Pilares da rede" } },
    {
      section_type: "research",
      settings: {
        eyebrow: "Pesquisa",
        title: "Linhas de pesquisa",
        cta_label: "Ver todas as linhas",
        cta_href: "/pesquisa",
        background: "muted",
      },
    },
    { section_type: "cooperation", settings: { background: "primary" } },
  ],
};

/** Configurações iniciais de um bloco novo. */
export function newBlockSettings(type: BlockType): SectionSettings {
  switch (type) {
    case "text":
      return { title: "Novo bloco de texto", align: "left" };
    case "image_text":
      return { title: "Novo bloco com imagem", image_side: "left" };
    case "cta":
      return { title: "Nova chamada", cta_label: "Fale conosco", cta_href: "/contato", background: "primary" };
    case "gallery":
      return { title: "Galeria", images: [], columns: 3 };
    case "logos":
      return { title: "Instituições parceiras", institution_ids: [] };
  }
}

const LIGHT_BACKGROUNDS: readonly Background[] = ["default", "surface", "muted"];

/**
 * Fundos oferecidos para cada tipo. Seções com cards e links usam só fundos
 * claros (o contraste dos links depende disso); a chamada para cooperação,
 * só os escuros; o banner não tem opção (sempre fotografia ou azul escuro).
 */
export function sectionBackgroundOptions(type: SectionType): readonly Background[] {
  switch (type) {
    case "hero":
      return [];
    case "cooperation":
      return ["primary", "deep"];
    case "text":
    case "cta":
      return BACKGROUNDS;
    default:
      return LIGHT_BACKGROUNDS;
  }
}

/** Fundo efetivo: o escolhido, se permitido para o tipo; senão o padrão do tipo. */
export function resolveBackground(type: SectionType, settings: SectionSettings): Background {
  const options = sectionBackgroundOptions(type);
  if (settings.background && options.includes(settings.background)) return settings.background;
  if (type === "cooperation" || type === "cta") return "primary";
  return "default";
}

export function isDarkBackground(background: Background) {
  return background === "deep" || background === "primary";
}
