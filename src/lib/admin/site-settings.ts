import { parseImageReference } from "@/lib/media/references";
import { validateWhatsapp } from "@/lib/site/contact";
import type { Tables } from "@/types/database.types";

import { normalizeText, validateEmail, validatePhone, validateText, type TextRule } from "./validation";

/**
 * Campos de `site_settings` editáveis pelo CMS (somente administradores).
 * logo_path e favicon_path guardam referências da biblioteca de mídia;
 * vazios, o site usa o logotipo e o ícone oficiais incluídos no código.
 */
export const siteSettingsTextRules = {
  site_name: { max: 80, required: true },
  institutional_name: { max: 300 },
  tagline: { max: 200 },
  short_description: { max: 600, multiline: true },
  address: { max: 300 },
  city: { max: 120 },
  state: { max: 120 },
  country: { max: 120 },
  footer_description: { max: 500, multiline: true },
  footer_note: { max: 300, multiline: true },
  footer_nav_title: { max: 40 },
  footer_contact_title: { max: 40 },
  footer_social_title: { max: 40 },
  footer_links_title: { max: 40 },
} satisfies Record<string, TextRule>;

/** Logotipo do rodapé: oficial (arquivo do código), o institucional ou um próprio. */
export const FOOTER_LOGO_MODES = ["official", "institutional", "custom"] as const;
export type FooterLogoMode = (typeof FOOTER_LOGO_MODES)[number];
export const FOOTER_LOGO_MODE_LABELS: Record<FooterLogoMode, string> = {
  official: "Logotipo oficial da GeoLogar (padrão)",
  institutional: "O mesmo logotipo do cabeçalho",
  custom: "Logotipo próprio para o rodapé",
};

export const HEADER_STYLES = ["solid", "translucent"] as const;
export type HeaderStyle = (typeof HEADER_STYLES)[number];
export const HEADER_STYLE_LABELS: Record<HeaderStyle, string> = {
  solid: "Fundo branco (padrão)",
  translucent: "Fundo translúcido ao rolar",
};

/** Títulos padrão das colunas do rodapé (campos vazios). */
export const FOOTER_DEFAULT_TITLES = {
  footer_nav_title: "Navegação",
  footer_contact_title: "Contato",
  footer_social_title: "Redes sociais",
  footer_links_title: "Links úteis",
} as const;

/** Texto de apresentação do rodapé quando o campo está vazio (editável no CMS). */
export const FOOTER_DEFAULT_DESCRIPTION =
  "Ciência para compreender o território, valorizar os recursos naturais e construir um futuro sustentável.";

export const siteSettingsFields = [
  "site_name",
  "institutional_name",
  "tagline",
  "short_description",
  "contact_email",
  "contact_phone",
  "contact_whatsapp",
  "address",
  "city",
  "state",
  "country",
  "logo_path",
  "favicon_path",
  "footer_description",
  "footer_note",
  "footer_nav_title",
  "footer_contact_title",
  "footer_social_title",
  "footer_links_title",
  "footer_logo_mode",
  "footer_logo_path",
  "header_style",
] as const;

export type SiteSettingsField = (typeof siteSettingsFields)[number];
export type SiteSettingsRecord = Pick<Tables<"site_settings">, SiteSettingsField>;
export type SiteSettingsFormValues = Record<SiteSettingsField, string>;
export type SiteSettingsFieldErrors = Partial<Record<SiteSettingsField, string>>;

export function toSiteSettingsFormValues(record: SiteSettingsRecord): SiteSettingsFormValues {
  return Object.fromEntries(
    siteSettingsFields.map((field) => [field, record[field] ?? ""]),
  ) as SiteSettingsFormValues;
}

export function readSiteSettingsForm(formData: FormData): SiteSettingsFormValues {
  return Object.fromEntries(
    siteSettingsFields.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  ) as SiteSettingsFormValues;
}

/**
 * Normaliza e valida; dados de contato são gravados como informados.
 * `current`: logotipo e favicon gravados (aceitos sem alteração).
 */
export function parseSiteSettingsValues(
  values: SiteSettingsFormValues,
  current: { logoPath: string | null; faviconPath: string | null; footerLogoPath?: string | null },
): {
  data: SiteSettingsRecord;
  errors: SiteSettingsFieldErrors;
} {
  const errors: SiteSettingsFieldErrors = {};

  const logo = parseImageReference(values.logo_path, current.logoPath);
  if (logo.error) errors.logo_path = logo.error;
  const favicon = parseImageReference(values.favicon_path, current.faviconPath);
  if (favicon.error) errors.favicon_path = favicon.error;
  const footerLogo = parseImageReference(values.footer_logo_path, current.footerLogoPath ?? null);
  if (footerLogo.error) errors.footer_logo_path = footerLogo.error;

  const footerLogoMode = (FOOTER_LOGO_MODES as readonly string[]).includes(values.footer_logo_mode)
    ? (values.footer_logo_mode as FooterLogoMode)
    : null;
  if (!footerLogoMode) errors.footer_logo_mode = "Escolha uma das opções.";
  else if (footerLogoMode === "custom" && !footerLogo.value && !footerLogo.error) {
    errors.footer_logo_path = "Selecione o logotipo do rodapé ou escolha outra opção.";
  }
  const headerStyle = (HEADER_STYLES as readonly string[]).includes(values.header_style)
    ? (values.header_style as HeaderStyle)
    : null;
  if (!headerStyle) errors.header_style = "Escolha uma das opções.";
  const text = (field: keyof typeof siteSettingsTextRules) => {
    const rule: TextRule = siteSettingsTextRules[field];
    const value = normalizeText(values[field], rule.multiline);
    const error = validateText(value, rule);
    if (error) errors[field] = error;
    return value;
  };

  const email = normalizeText(values.contact_email);
  const emailError = validateEmail(email);
  if (emailError) errors.contact_email = emailError;

  const phone = normalizeText(values.contact_phone);
  const phoneError = validatePhone(phone);
  if (phoneError) errors.contact_phone = phoneError;

  // WhatsApp só quando cadastrado: nunca copiado do telefone.
  const whatsapp = normalizeText(values.contact_whatsapp);
  const whatsappError = validateWhatsapp(whatsapp);
  if (whatsappError) errors.contact_whatsapp = whatsappError;

  const data: SiteSettingsRecord = {
    site_name: text("site_name") ?? "",
    institutional_name: text("institutional_name"),
    tagline: text("tagline"),
    short_description: text("short_description"),
    contact_email: email,
    contact_phone: phone,
    contact_whatsapp: whatsapp,
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    logo_path: logo.value,
    favicon_path: favicon.value,
    footer_description: text("footer_description"),
    footer_note: text("footer_note"),
    footer_nav_title: text("footer_nav_title"),
    footer_contact_title: text("footer_contact_title"),
    footer_social_title: text("footer_social_title"),
    footer_links_title: text("footer_links_title"),
    footer_logo_mode: footerLogoMode ?? "official",
    // O arquivo próprio fica guardado mesmo com outra opção ativa.
    footer_logo_path: footerLogo.value,
    header_style: headerStyle ?? "solid",
  };
  return { data, errors };
}
