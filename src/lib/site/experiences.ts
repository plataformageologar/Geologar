import { countCharacters, isUuid, normalizeText, validateText, type TextRule } from "@/lib/admin/validation";

/**
 * Experiências digitais (Etapa 10.6): cards da seção `experiences` da página
 * inicial, com link para aplicações externas (tours 360°, aplicações 3D,
 * mapas…). Mesmas regras de public.is_valid_experience_list e
 * public.is_valid_experience_url (migration 20261124120000): chaves
 * conhecidas, id UUID único, textos com limite, disponibilidade fechada e
 * endereço https:// exigido quando a experiência está disponível. O portal
 * nunca acessa o endereço (sem verificação automática no servidor).
 */

export const EXPERIENCES_MAX = 12;
export const EXPERIENCE_COLUMN_OPTIONS = [2, 3] as const;
export type ExperienceColumns = (typeof EXPERIENCE_COLUMN_OPTIONS)[number];

export const EXPERIENCE_AVAILABILITY = ["available", "coming_soon", "unavailable"] as const;
export type ExperienceAvailability = (typeof EXPERIENCE_AVAILABILITY)[number];

export const AVAILABILITY_LABELS: Record<ExperienceAvailability, string> = {
  available: "Disponível",
  coming_soon: "Em breve",
  unavailable: "Temporariamente indisponível",
};

/** Texto exibido no lugar do botão quando a experiência não está disponível. */
export const DEFAULT_UNAVAILABLE_LABELS: Record<Exclude<ExperienceAvailability, "available">, string> = {
  coming_soon: "Em breve",
  unavailable: "Temporariamente indisponível",
};

export const DEFAULT_BUTTON_LABEL = "Iniciar experiência";

export type Experience = {
  id: string;
  title: string;
  label?: string;
  description?: string;
  image_path?: string;
  image_alt?: string;
  external_url?: string;
  button_label?: string;
  unavailable_label?: string;
  availability: ExperienceAvailability;
  is_visible: boolean;
  open_in_new_tab: boolean;
};

export const EXPERIENCE_TEXT_RULES = {
  title: { max: 120, required: true },
  label: { max: 60 },
  description: { max: 400, multiline: true },
  image_alt: { max: 200 },
  button_label: { max: 40 },
  unavailable_label: { max: 40 },
} satisfies Record<string, TextRule>;

type ExperienceTextKey = keyof typeof EXPERIENCE_TEXT_RULES;
const TEXT_KEYS = Object.keys(EXPERIENCE_TEXT_RULES) as ExperienceTextKey[];

const EXPERIENCE_KEYS = new Set<string>([
  "id",
  "title",
  "label",
  "description",
  "image_path",
  "image_alt",
  "external_url",
  "button_label",
  "unavailable_label",
  "availability",
  "is_visible",
  "open_in_new_tab",
]);

export const EXPERIENCE_URL_MAX = 300;

/** Mesmo padrão do banco: https://, domínio com ponto, porta opcional. */
const HTTPS_URL = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]{1,5})?([/?#].*)?$/i;
const FORBIDDEN_URL_CHARS = /[\s\u0000-\u001F\u007F\\]/;

/**
 * Endereço de uma experiência: somente https://, com domínio, sem usuário ou
 * senha embutidos. Recusa javascript:, data:, file:, "#", endereços
 * malformados e com espaços.
 */
export function isValidExperienceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (countCharacters(value) > EXPERIENCE_URL_MAX || value.length < 12) return false;
  if (FORBIDDEN_URL_CHARS.test(value) || !HTTPS_URL.test(value) || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && url.username === "" && url.password === "";
}

function urlError(value: string): string | null {
  if (isValidExperienceUrl(value)) return null;
  if (/^http:\/\//i.test(value)) return "Use um endereço seguro, começando com https://.";
  return "Informe um endereço completo e seguro, começando com https:// (ex.: https://exemplo.org/experiencia).";
}

export type ExperienceFieldErrors = Partial<Record<keyof Experience, string>>;

/** Experiência visível no site com link funcional. */
export function experienceLink(experience: Experience): string | null {
  return experience.availability === "available" && isValidExperienceUrl(experience.external_url)
    ? experience.external_url
    : null;
}

/** Texto do estado sem link (em breve / indisponível). */
export function unavailableText(experience: Experience): string {
  if (experience.unavailable_label) return experience.unavailable_label;
  return experience.availability === "unavailable"
    ? DEFAULT_UNAVAILABLE_LABELS.unavailable
    : DEFAULT_UNAVAILABLE_LABELS.coming_soon;
}

/** Nova experiência (CMS e editor visual). O id é gerado no navegador e fica estável. */
export function newExperience(id: string): Experience {
  return {
    id,
    title: "Nova experiência",
    label: "Experiência interativa",
    button_label: DEFAULT_BUTTON_LABEL,
    unavailable_label: DEFAULT_UNAVAILABLE_LABELS.coming_soon,
    availability: "coming_soon",
    is_visible: true,
    open_in_new_tab: true,
  };
}

/** Gera um UUID v4 para um card novo (navegador ou servidor). */
export function experienceId(): string {
  return crypto.randomUUID();
}

function oneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return (options as readonly unknown[]).includes(value);
}

/**
 * Leitura tolerante (renderização): só cards bem formados, com chaves
 * conhecidas. Um valor inesperado no banco nunca chega aos componentes.
 */
export function sanitizeExperiences(raw: unknown, isImage: (value: unknown) => value is string): Experience[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Experience[] = [];
  for (const entry of raw.slice(0, EXPERIENCES_MAX)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    if (!isUuid(item.id) || seen.has(item.id)) continue;
    if (typeof item.title !== "string" || item.title.trim() === "") continue;
    seen.add(item.id);
    const experience: Experience = {
      id: item.id,
      title: item.title,
      availability: oneOf(EXPERIENCE_AVAILABILITY, item.availability) ? item.availability : "coming_soon",
      is_visible: item.is_visible !== false,
      open_in_new_tab: item.open_in_new_tab !== false,
    };
    for (const key of TEXT_KEYS) {
      if (key === "title") continue;
      const value = item[key];
      if (typeof value === "string" && value.trim() !== "" && value.length <= EXPERIENCE_TEXT_RULES[key].max * 2) {
        experience[key] = value;
      }
    }
    if (isImage(item.image_path)) experience.image_path = item.image_path;
    if (isValidExperienceUrl(item.external_url)) experience.external_url = item.external_url;
    // Disponível sem endereço válido nunca vira link: mostra "em breve".
    if (experience.availability === "available" && !experience.external_url) experience.availability = "coming_soon";
    result.push(experience);
  }
  return result;
}

/**
 * Validação definitiva da lista (Server Action) e retorno imediato
 * (formulários). `imageAccepted` aplica a regra de imagens da seção.
 */
export function validateExperiences(
  raw: unknown,
  imageAccepted: (value: string) => boolean,
): { data: Experience[]; errors: Record<string, ExperienceFieldErrors>; listError: string | null } {
  const errors: Record<string, ExperienceFieldErrors> = {};
  if (!Array.isArray(raw)) return { data: [], errors, listError: "Lista de experiências inválida." };
  if (raw.length > EXPERIENCES_MAX) {
    return { data: [], errors, listError: `A seção aceita até ${EXPERIENCES_MAX} experiências.` };
  }

  const data: Experience[] = [];
  const seen = new Set<string>();
  let listError: string | null = null;

  raw.forEach((entry: unknown) => {
    const item =
      typeof entry === "object" && entry !== null && !Array.isArray(entry) ? (entry as Record<string, unknown>) : null;
    if (!item || !isUuid(item.id) || seen.has(item.id)) {
      listError = "A lista de experiências mudou. Recarregue a página.";
      return;
    }
    if (Object.keys(item).some((key) => !EXPERIENCE_KEYS.has(key))) {
      listError = "Configuração de experiência inválida.";
      return;
    }
    seen.add(item.id);
    const cardErrors: ExperienceFieldErrors = {};

    if (!oneOf(EXPERIENCE_AVAILABILITY, item.availability)) cardErrors.availability = "Escolha uma das opções.";
    if (typeof item.is_visible !== "boolean" || typeof item.open_in_new_tab !== "boolean") {
      listError = "Configuração de experiência inválida.";
      return;
    }

    const experience: Experience = {
      id: item.id,
      title: "",
      availability: oneOf(EXPERIENCE_AVAILABILITY, item.availability) ? item.availability : "coming_soon",
      is_visible: item.is_visible,
      open_in_new_tab: item.open_in_new_tab,
    };

    for (const key of TEXT_KEYS) {
      const value = item[key] ?? "";
      if (typeof value !== "string") {
        cardErrors[key] = "Valor inválido.";
        continue;
      }
      const rule: TextRule = EXPERIENCE_TEXT_RULES[key];
      const text = normalizeText(value, rule.multiline);
      const error = validateText(text, rule);
      if (error) cardErrors[key] = key === "title" && text === null ? "Informe o título da experiência." : error;
      else if (text !== null) experience[key] = text;
    }

    const imagePath = item.image_path ?? "";
    if (typeof imagePath !== "string" || (imagePath !== "" && !imageAccepted(imagePath))) {
      cardErrors.image_path = "Selecione uma imagem da biblioteca de mídia.";
    } else if (imagePath !== "") {
      experience.image_path = imagePath;
    }

    const urlRaw = item.external_url ?? "";
    const url = typeof urlRaw === "string" ? normalizeText(urlRaw) : null;
    if (typeof urlRaw !== "string") cardErrors.external_url = "Informe um endereço válido.";
    else if (url !== null) {
      const error = urlError(url);
      if (error) cardErrors.external_url = error;
      else experience.external_url = url;
    }
    if (experience.availability === "available" && url === null && !cardErrors.external_url) {
      cardErrors.external_url = "Para marcar como disponível, informe o endereço da experiência (ou escolha “Em breve”).";
    }

    if (Object.keys(cardErrors).length > 0) errors[item.id] = cardErrors;
    else data.push(experience);
  });

  return { data, errors, listError };
}

/** Rótulos dos campos (comparação de versões e mensagens). */
export const EXPERIENCE_FIELD_LABELS: Record<keyof Experience, string> = {
  id: "Identificador",
  title: "Título",
  label: "Identificação complementar",
  description: "Descrição",
  image_path: "Imagem de capa",
  image_alt: "Texto alternativo da imagem",
  external_url: "Endereço de acesso",
  button_label: "Texto do botão",
  unavailable_label: "Texto quando indisponível",
  availability: "Disponibilidade",
  is_visible: "Visibilidade",
  open_in_new_tab: "Abertura",
};
