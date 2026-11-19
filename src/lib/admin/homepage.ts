import { parseImageReference } from "@/lib/media/references";
import type { Tables } from "@/types/database.types";

import { normalizeText, validateCta, validateText, type TextRule } from "./validation";

/**
 * Campos de `homepage_content` editáveis pelo CMS. Devem coincidir com o
 * GRANT UPDATE das migrations enable_homepage_cms_updates e
 * enable_media_library (hero_image_path).
 */
export const homepageTextRules = {
  hero_title: { max: 160, required: true },
  hero_description: { max: 500, multiline: true },
  hero_image_alt: { max: 200 },
  hero_primary_cta_label: { max: 60 },
  hero_secondary_cta_label: { max: 60 },
  about_title: { max: 160 },
  about_description: { max: 2000, multiline: true },
  cooperation_title: { max: 160 },
  cooperation_description: { max: 600, multiline: true },
  cooperation_cta_label: { max: 60 },
} satisfies Record<string, TextRule>;

export const homepageLinkFields = [
  "hero_primary_cta_href",
  "hero_secondary_cta_href",
  "cooperation_cta_href",
] as const;

/** Referência da imagem de fundo (objeto da biblioteca ou caminho local legado). */
export const homepageImageField = "hero_image_path";

export type HomepageField =
  | keyof typeof homepageTextRules
  | (typeof homepageLinkFields)[number]
  | typeof homepageImageField;

export const homepageFields = [
  ...(Object.keys(homepageTextRules) as (keyof typeof homepageTextRules)[]),
  ...homepageLinkFields,
  homepageImageField,
] as HomepageField[];

/** Registro como gravado no banco (campos opcionais podem ser `null`). */
export type HomepageRecord = Pick<Tables<"homepage_content">, HomepageField>;

/** Valores do formulário: textos simples, `""` representa campo vazio. */
export type HomepageFormValues = Record<HomepageField, string>;

export type HomepageFieldErrors = Partial<Record<HomepageField, string>>;

export function toFormValues(record: HomepageRecord): HomepageFormValues {
  return Object.fromEntries(
    homepageFields.map((field) => [field, record[field] ?? ""]),
  ) as HomepageFormValues;
}

const ctas = [
  ["hero_primary_cta_label", "hero_primary_cta_href"],
  ["hero_secondary_cta_label", "hero_secondary_cta_href"],
  ["cooperation_cta_label", "cooperation_cta_href"],
] as const;

/**
 * Normaliza e valida os valores enviados. O texto alternativo só existe (e
 * é obrigatório, pela constraint homepage_content_hero_image_alt) com imagem.
 * `currentImagePath`: imagem gravada no registro (aceita sem alteração).
 */
export function parseHomepageValues(
  values: HomepageFormValues,
  { currentImagePath }: { currentImagePath: string | null },
): { data: HomepageRecord; errors: HomepageFieldErrors } {
  const errors: HomepageFieldErrors = {};
  const data = {} as HomepageRecord;

  const image = parseImageReference(values.hero_image_path ?? "", currentImagePath);
  if (image.error) errors.hero_image_path = image.error;
  const hasImage = image.value !== null;
  data.hero_image_path = image.value;

  for (const [field, rule] of Object.entries(homepageTextRules) as [
    keyof typeof homepageTextRules,
    TextRule,
  ][]) {
    if (field === "hero_image_alt" && !hasImage) continue;
    const value = normalizeText(values[field] ?? "", rule.multiline);
    const required = rule.required || (field === "hero_image_alt" && hasImage);
    const error = validateText(value, { ...rule, required });
    if (error) errors[field] = error;
    data[field] = value;
  }

  for (const field of homepageLinkFields) {
    data[field] = normalizeText(values[field] ?? "");
  }

  for (const [labelField, hrefField] of ctas) {
    const ctaErrors = validateCta(data[labelField], data[hrefField]);
    if (ctaErrors.label && !errors[labelField]) errors[labelField] = ctaErrors.label;
    if (ctaErrors.href) errors[hrefField] = ctaErrors.href;
  }

  // Imagem e texto alternativo são gravados juntos (sem imagem, alt = null).
  if (!hasImage) data.hero_image_alt = null;
  return { data, errors };
}
