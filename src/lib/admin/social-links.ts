import type { Tables } from "@/types/database.types";

import {
  normalizeText,
  parseSortOrder,
  validateExternalUrl,
  validatePlatform,
  validateText,
  type TextRule,
} from "./validation";

/** Plataformas sugeridas; outras são aceitas no formato da constraint. */
export const socialPlatformOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
  { value: "researchgate", label: "ResearchGate" },
  { value: "lattes", label: "Lattes" },
] as const;

/** Valor do seletor que libera o campo de plataforma personalizada. */
export const CUSTOM_PLATFORM = "outra";

export function platformLabel(platform: string) {
  return socialPlatformOptions.find((option) => option.value === platform)?.label ?? platform;
}

export const socialLinkTextRules = {
  label: { max: 80 },
} satisfies Record<string, TextRule>;

export type SocialLinkRecord = Pick<Tables<"social_links">, "platform" | "label" | "url" | "sort_order" | "is_active">;

export type SocialLinkFormValues = {
  platform: string;
  label: string;
  url: string;
  sort_order: string;
  is_active: boolean;
};

export type SocialLinkField = keyof SocialLinkFormValues;
export type SocialLinkFieldErrors = Partial<Record<SocialLinkField, string>>;

export const emptySocialLinkValues: SocialLinkFormValues = {
  platform: "",
  label: "",
  url: "",
  sort_order: "0",
  is_active: true,
};

export function toSocialLinkFormValues(record: SocialLinkRecord): SocialLinkFormValues {
  return {
    platform: record.platform,
    label: record.label ?? "",
    url: record.url,
    sort_order: String(record.sort_order),
    is_active: record.is_active,
  };
}

export function readSocialLinkForm(formData: FormData): SocialLinkFormValues {
  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };
  return {
    platform: text("platform"),
    label: text("label"),
    url: text("url"),
    sort_order: text("sort_order"),
    is_active: formData.get("is_active") === "on",
  };
}

export function parseSocialLinkValues(values: SocialLinkFormValues): {
  data: SocialLinkRecord;
  errors: SocialLinkFieldErrors;
} {
  const errors: SocialLinkFieldErrors = {};

  const platform = normalizeText(values.platform)?.toLowerCase() ?? null;
  const platformError = validatePlatform(platform);
  if (platformError) errors.platform = platformError;

  const label = normalizeText(values.label);
  const labelError = validateText(label, socialLinkTextRules.label);
  if (labelError) errors.label = labelError;

  const url = normalizeText(values.url);
  const urlError = url === null ? "Informe o endereço do perfil." : validateExternalUrl(url);
  if (urlError) errors.url = urlError;

  const sortOrder = parseSortOrder(values.sort_order);
  if (sortOrder.error) errors.sort_order = sortOrder.error;

  return {
    data: {
      platform: platform ?? "",
      label,
      url: url ?? "",
      sort_order: sortOrder.value,
      is_active: values.is_active,
    },
    errors,
  };
}
