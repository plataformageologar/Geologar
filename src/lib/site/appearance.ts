/**
 * Aparência do site (tabela site_appearance; somente administradores).
 * Tudo vira variáveis CSS a partir de opções fechadas e cores hexadecimais
 * validadas — nenhum CSS ou JavaScript livre chega ao site.
 */

export const SECTION_BACKGROUND_OPTIONS = ["sand", "white", "stone", "cream"] as const;
export const BUTTON_SHAPES = ["pill", "rounded", "square"] as const;
export const CORNER_STYLES = ["rounded", "soft", "straight"] as const;
export const HEADING_FONTS = ["serif", "sans"] as const;
export const CARD_STYLES = ["bordered", "elevated", "flat"] as const;
export const SECTION_STYLES = ["spacious", "compact"] as const;

export type SectionBackgroundOption = (typeof SECTION_BACKGROUND_OPTIONS)[number];
export type ButtonShape = (typeof BUTTON_SHAPES)[number];
export type CornerStyle = (typeof CORNER_STYLES)[number];
export type HeadingFont = (typeof HEADING_FONTS)[number];
export type CardStyle = (typeof CARD_STYLES)[number];
export type SectionStyle = (typeof SECTION_STYLES)[number];

export type Appearance = {
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  /** Tom escuro do rodapé, das faixas e do banner sem foto (Etapa 10.7). */
  dark_color: string | null;
  section_background: SectionBackgroundOption;
  button_shape: ButtonShape;
  corner_style: CornerStyle;
  heading_font: HeadingFont;
  card_style: CardStyle;
  /** Densidade das seções públicas (Etapa 10.7). */
  section_style: SectionStyle;
};

export const appearanceFields = [
  "primary_color",
  "secondary_color",
  "accent_color",
  "dark_color",
  "section_background",
  "button_shape",
  "corner_style",
  "heading_font",
  "card_style",
  "section_style",
] as const satisfies readonly (keyof Appearance)[];

export type AppearanceField = (typeof appearanceFields)[number];
export type AppearanceFieldErrors = Partial<Record<AppearanceField, string>>;

/** Valores do design system (globals.css). */
export const DEFAULT_COLORS = {
  primary_color: "#143b5c",
  secondary_color: "#2e6a4e",
  accent_color: "#8c4f24",
  dark_color: "#0f2537",
} as const;

export type ColorField = keyof typeof DEFAULT_COLORS;
export const COLOR_FIELDS = ["primary_color", "secondary_color", "accent_color", "dark_color"] as const satisfies readonly ColorField[];

export const DEFAULT_APPEARANCE: Appearance = {
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  dark_color: null,
  section_background: "sand",
  button_shape: "pill",
  corner_style: "rounded",
  heading_font: "serif",
  card_style: "bordered",
  section_style: "spacious",
};

/**
 * Preset “Referência GeoLogar” (Etapa 10.7), inspirado na referência visual
 * do cliente: marrom nas ações e marcadores, verde institucional, rodapé
 * marrom-escuro, fundo creme, títulos sem serifa, cantos discretos e seções
 * compactas. Aplicar o preset só preenche o formulário: nada muda no site
 * antes de salvar o rascunho e publicar, e cada cor continua editável.
 * A paleta é provisória (não é um manual de marca oficial).
 */
export const REFERENCE_PRESET: Appearance = {
  primary_color: "#805022",
  secondary_color: "#244c3e",
  accent_color: null,
  dark_color: "#443020",
  section_background: "cream",
  button_shape: "rounded",
  corner_style: "soft",
  heading_font: "sans",
  card_style: "bordered",
  section_style: "compact",
};

export const COLOR_LABELS: Record<ColorField, { label: string; hint: string }> = {
  primary_color: { label: "Cor principal", hint: "Botões, links, cabeçalhos de destaque e faixa de cooperação." },
  secondary_color: { label: "Cor secundária", hint: "Selos de situação e detalhes de sustentabilidade." },
  accent_color: { label: "Cor de destaque", hint: "Pequenos acentos (rótulos e avisos)." },
  dark_color: { label: "Tom escuro", hint: "Rodapé, faixa de cooperação e banner sem fotografia (texto claro por cima)." },
};

export const SECTION_BACKGROUND_LABELS: Record<SectionBackgroundOption, string> = {
  sand: "Areia (padrão)",
  white: "Branco",
  stone: "Pedra (cinza claro)",
  cream: "Creme (referência GeoLogar)",
};
export const BUTTON_SHAPE_LABELS: Record<ButtonShape, string> = {
  pill: "Arredondado (padrão)",
  rounded: "Cantos suaves",
  square: "Retangular",
};
export const CORNER_STYLE_LABELS: Record<CornerStyle, string> = {
  rounded: "Arredondados (padrão)",
  soft: "Discretos",
  straight: "Retos",
};
export const HEADING_FONT_LABELS: Record<HeadingFont, string> = {
  serif: "Serifada — Source Serif (padrão)",
  sans: "Sem serifa — Source Sans",
};
export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  bordered: "Com borda (padrão)",
  elevated: "Com sombra",
  flat: "Sem borda",
};
export const SECTION_STYLE_LABELS: Record<SectionStyle, string> = {
  spacious: "Espaçosas (padrão)",
  compact: "Compactas, com títulos institucionais",
};

/** Fundo da página e da variação "areia" das seções para cada opção. */
const BACKGROUNDS: Record<SectionBackgroundOption, { background: string; muted: string; border: string; surface?: string }> = {
  sand: { background: "#f7f5f0", muted: "#efebe3", border: "#dcd5c8" },
  white: { background: "#ffffff", muted: "#f4f4f2", border: "#e0ddd6" },
  stone: { background: "#f2f2f0", muted: "#e7e6e2", border: "#d6d4ce" },
  cream: { background: "#f7f3ea", muted: "#ece3d2", border: "#dccfb9", surface: "#fffcf6" },
};

/** Texto claro sobre o tom escuro (igual ao --deep-foreground do design system). */
const DEEP_FOREGROUND = "#f2efe8";
/** O tom escuro recebe texto claro e texto atenuado: exige 7:1 com o texto claro. */
export const MIN_DARK_CONTRAST = 7;

const HEX = /^#[0-9a-f]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Normaliza "#ABC", "abcdef" etc. para "#abcdef"; inválido → null. */
export function normalizeHex(value: string): string | null {
  let hex = value.trim().toLowerCase();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) hex = `#${[...hex.slice(1)].map((c) => c + c).join("")}`;
  return HEX.test(hex) ? hex : null;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Razão de contraste WCAG 2.x entre duas cores hexadecimais. */
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Mistura duas cores hexadecimais (peso de `a` entre 0 e 1). */
export function mixHex(a: string, b: string, weight: number): string {
  const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);
  return `#${[1, 3, 5]
    .map((start) => Math.round(channel(a, start) * weight + channel(b, start) * (1 - weight)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Texto atenuado sobre o tom escuro (rodapé, faixas). */
export function deepMutedColor(dark: string): string {
  return mixHex(DEEP_FOREGROUND, dark, 0.78);
}

/** Contraste mínimo para texto normal (WCAG AA). */
export const MIN_CONTRAST = 4.5;

function oneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/**
 * Valida e verifica o contraste: cada cor precisa de 4,5:1 com texto branco
 * (botões e faixas) e com o fundo escolhido (links e rótulos).
 */
export function validateAppearance(raw: unknown): { data: Appearance; errors: AppearanceFieldErrors } {
  const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const errors: AppearanceFieldErrors = {};
  const data: Appearance = { ...DEFAULT_APPEARANCE };

  const choose = <K extends keyof Appearance>(field: K, options: readonly string[]) => {
    const value = source[field];
    if (oneOf(options, value)) (data as Record<K, unknown>)[field] = value;
    else errors[field as AppearanceField] = "Escolha uma das opções.";
  };
  choose("section_background", SECTION_BACKGROUND_OPTIONS);
  choose("button_shape", BUTTON_SHAPES);
  choose("corner_style", CORNER_STYLES);
  choose("heading_font", HEADING_FONTS);
  choose("card_style", CARD_STYLES);
  choose("section_style", SECTION_STYLES);

  const background = BACKGROUNDS[data.section_background].background;
  for (const field of COLOR_FIELDS) {
    const value = source[field];
    if (value === null || value === undefined || value === "") {
      data[field] = null;
      continue;
    }
    const hex = typeof value === "string" ? normalizeHex(value) : null;
    if (!hex) {
      errors[field] = "Use uma cor no formato #RRGGBB (ex.: #143b5c).";
      continue;
    }
    if (field === "dark_color") {
      const ratio = contrastRatio(hex, DEEP_FOREGROUND);
      if (ratio < MIN_DARK_CONTRAST) {
        errors[field] =
          `Contraste insuficiente com o texto claro (${ratio.toFixed(1).replace(".", ",")}:1; mínimo 7:1). ` +
          "Escolha um tom mais escuro.";
        continue;
      }
      data[field] = hex === DEFAULT_COLORS[field] ? null : hex;
      continue;
    }
    const onWhite = contrastRatio(hex, "#ffffff");
    const onBackground = contrastRatio(hex, background);
    if (Math.min(onWhite, onBackground) < MIN_CONTRAST) {
      errors[field] =
        `Contraste insuficiente (${Math.min(onWhite, onBackground).toFixed(1).replace(".", ",")}:1; mínimo 4,5:1). ` +
        "Escolha um tom mais escuro para manter textos e botões legíveis.";
      continue;
    }
    data[field] = hex === DEFAULT_COLORS[field] ? null : hex;
  }

  return { data, errors };
}

/** Leitura tolerante do registro do banco (renderização). */
export function sanitizeAppearance(raw: Partial<Record<keyof Appearance, unknown>> | null | undefined): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;
  const pick = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
    oneOf(options, value) ? value : fallback;
  return {
    primary_color: isHexColor(raw.primary_color) ? raw.primary_color : null,
    secondary_color: isHexColor(raw.secondary_color) ? raw.secondary_color : null,
    accent_color: isHexColor(raw.accent_color) ? raw.accent_color : null,
    dark_color: isHexColor(raw.dark_color) ? raw.dark_color : null,
    section_background: pick(SECTION_BACKGROUND_OPTIONS, raw.section_background, "sand"),
    button_shape: pick(BUTTON_SHAPES, raw.button_shape, "pill"),
    corner_style: pick(CORNER_STYLES, raw.corner_style, "rounded"),
    heading_font: pick(HEADING_FONTS, raw.heading_font, "serif"),
    card_style: pick(CARD_STYLES, raw.card_style, "bordered"),
    section_style: pick(SECTION_STYLES, raw.section_style, "spacious"),
  };
}

const RADII: Record<CornerStyle, Record<string, string>> = {
  rounded: {},
  soft: { "--radius-lg": "0.375rem", "--radius-xl": "0.5rem", "--radius-2xl": "0.625rem", "--radius-3xl": "0.75rem" },
  straight: { "--radius-lg": "0.125rem", "--radius-xl": "0.125rem", "--radius-2xl": "0.125rem", "--radius-3xl": "0.125rem" },
};

const BUTTON_RADII: Record<ButtonShape, string | null> = { pill: null, rounded: "0.375rem", square: "0.125rem" };

/** Seções compactas: menos espaço vertical e títulos institucionais com marcador. */
const COMPACT_SECTIONS: Record<string, string> = {
  "--section-y": "clamp(2.75rem, 2.1rem + 2.6vw, 4.5rem)",
  "--section-gap": "2rem",
  "--section-title-size": "clamp(1.375rem, 1.2rem + 0.8vw, 1.875rem)",
  "--section-title-transform": "uppercase",
  "--section-title-tracking": "0.02em",
  "--section-marker": "block",
};

const CARDS: Record<CardStyle, Record<string, string>> = {
  bordered: {},
  elevated: { "--card-border": "transparent", "--card-shadow": "0 10px 30px -12px rgb(15 37 55 / 0.25)" },
  flat: { "--card-border": "transparent", "--card-shadow": "none" },
};

/**
 * Declarações CSS (somente as que diferem do padrão). Os valores vêm de
 * `sanitizeAppearance`/`validateAppearance`: hexadecimais e opções fixas.
 */
export function appearanceVariables(input: Appearance): Record<string, string> {
  const appearance = sanitizeAppearance(input);
  const vars: Record<string, string> = {};

  const color = (name: string, hex: string | null, soft: string, hover?: string) => {
    if (!hex) return;
    vars[`--${name}`] = hex;
    vars[`--${soft}`] = `color-mix(in srgb, ${hex} 13%, white)`;
    if (hover) vars[`--${hover}`] = `color-mix(in srgb, ${hex} 78%, black)`;
  };
  color("primary", appearance.primary_color, "primary-soft", "primary-hover");
  color("secondary", appearance.secondary_color, "secondary-soft", "secondary-hover");
  color("earth", appearance.accent_color, "earth-soft");

  if (appearance.section_background !== "sand") {
    const bg = BACKGROUNDS[appearance.section_background];
    vars["--background"] = bg.background;
    vars["--surface-muted"] = bg.muted;
    vars["--border"] = bg.border;
    if (bg.surface) vars["--surface"] = bg.surface;
  }
  if (appearance.dark_color) {
    vars["--deep"] = appearance.dark_color;
    vars["--deep-muted"] = deepMutedColor(appearance.dark_color);
  }
  if (appearance.section_style === "compact") Object.assign(vars, COMPACT_SECTIONS);
  Object.assign(vars, RADII[appearance.corner_style], CARDS[appearance.card_style]);
  const buttonRadius = BUTTON_RADII[appearance.button_shape];
  if (buttonRadius) vars["--button-radius"] = buttonRadius;
  if (appearance.heading_font === "sans") {
    vars["--heading-font"] = "var(--font-source-sans), ui-sans-serif, system-ui, sans-serif";
  }
  return vars;
}

/** Regra `:root { … }` com as variáveis, ou "" quando tudo é padrão. */
export function appearanceCss(appearance: Appearance): string {
  const entries = Object.entries(appearanceVariables(appearance));
  if (entries.length === 0) return "";
  return `:root{${entries.map(([name, value]) => `${name}:${value}`).join(";")}}`;
}
