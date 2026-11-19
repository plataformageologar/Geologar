import { parseImageReference } from "@/lib/media/references";
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
} satisfies Record<string, TextRule>;

export const siteSettingsFields = [
  "site_name",
  "institutional_name",
  "tagline",
  "short_description",
  "contact_email",
  "contact_phone",
  "address",
  "city",
  "state",
  "country",
  "logo_path",
  "favicon_path",
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
  current: { logoPath: string | null; faviconPath: string | null },
): {
  data: SiteSettingsRecord;
  errors: SiteSettingsFieldErrors;
} {
  const errors: SiteSettingsFieldErrors = {};

  const logo = parseImageReference(values.logo_path, current.logoPath);
  if (logo.error) errors.logo_path = logo.error;
  const favicon = parseImageReference(values.favicon_path, current.faviconPath);
  if (favicon.error) errors.favicon_path = favicon.error;
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

  const data: SiteSettingsRecord = {
    site_name: text("site_name") ?? "",
    institutional_name: text("institutional_name"),
    tagline: text("tagline"),
    short_description: text("short_description"),
    contact_email: email,
    contact_phone: phone,
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    logo_path: logo.value,
    favicon_path: favicon.value,
  };
  return { data, errors };
}
