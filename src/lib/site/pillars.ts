import { normalizeText, validateText, type TextRule } from "@/lib/admin/validation";

import { isUuidOrNull } from "./lists";

/**
 * Pilares da rede (tabela site_pillars). Ícones de uma lista fechada,
 * mapeados para componentes em components/network/pillar-list.tsx.
 */

export const PILLAR_ICONS = [
  "microscope",
  "graduation-cap",
  "mountain",
  "handshake",
  "globe",
  "leaf",
  "gem",
  "layers",
  "map",
  "users",
  "book-open",
  "flask",
] as const;

export type PillarIcon = (typeof PILLAR_ICONS)[number];

export const PILLAR_ICON_LABELS: Record<PillarIcon, string> = {
  microscope: "Microscópio (pesquisa)",
  "graduation-cap": "Capelo (formação)",
  mountain: "Montanha (território)",
  handshake: "Aperto de mãos (cooperação)",
  globe: "Globo",
  leaf: "Folha",
  gem: "Mineral",
  layers: "Camadas",
  map: "Mapa",
  users: "Pessoas",
  "book-open": "Livro",
  flask: "Laboratório",
};

export const PILLARS_MAX = 12;

export const PILLAR_RULES = {
  title: { max: 60, required: true },
  description: { max: 300 },
} satisfies Record<string, TextRule>;

export type Pillar = {
  id: string;
  title: string;
  description: string | null;
  icon: PillarIcon;
};

export type PillarDraft = {
  id: string | null;
  key: string;
  title: string;
  description: string;
  icon: PillarIcon;
  is_visible: boolean;
};

export type PillarFieldErrors = Partial<Record<"title" | "description" | "icon", string>>;

export function isPillarIcon(value: unknown): value is PillarIcon {
  return typeof value === "string" && (PILLAR_ICONS as readonly string[]).includes(value);
}

export type ValidPillar = { id: string | null; title: string; description: string | null; icon: PillarIcon; is_visible: boolean };

/** Valida a lista completa (ordem = posição no array). */
export function validatePillarList(raw: unknown): {
  items: ValidPillar[];
  errors: Record<string, PillarFieldErrors>;
  listError: string | null;
} {
  const errors: Record<string, PillarFieldErrors> = {};
  if (!Array.isArray(raw) || raw.length > PILLARS_MAX) {
    return { items: [], errors, listError: `Cadastre no máximo ${PILLARS_MAX} pilares.` };
  }
  const items: ValidPillar[] = [];
  const ids = new Set<string>();
  let listError: string | null = null;

  raw.forEach((entry: unknown, index) => {
    const item = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    const key = typeof item.key === "string" ? item.key : String(index);
    const id = item.id ?? null;
    if (!isUuidOrNull(id) || (id !== null && ids.has(id)) || typeof item.is_visible !== "boolean") {
      listError = "Lista de pilares inválida. Recarregue a página.";
      return;
    }
    if (id !== null) ids.add(id);

    const fieldErrors: PillarFieldErrors = {};
    const title = normalizeText(typeof item.title === "string" ? item.title : "");
    const titleError = validateText(title, PILLAR_RULES.title);
    if (titleError) fieldErrors.title = titleError;
    const description = normalizeText(typeof item.description === "string" ? item.description : "");
    const descriptionError = validateText(description, PILLAR_RULES.description);
    if (descriptionError) fieldErrors.description = descriptionError;
    if (!isPillarIcon(item.icon)) fieldErrors.icon = "Escolha um dos ícones.";

    if (Object.keys(fieldErrors).length > 0) errors[key] = fieldErrors;
    items.push({
      id,
      title: title ?? "",
      description,
      icon: isPillarIcon(item.icon) ? item.icon : "microscope",
      is_visible: item.is_visible,
    });
  });

  return { items, errors, listError };
}

/** Pilares do conteúdo inicial (fallback quando o banco não responde). */
export const DEFAULT_PILLARS: Pillar[] = [
  {
    id: "pesquisa",
    title: "Pesquisa",
    description: "Desenvolvimento de estudos e projetos científicos.",
    icon: "microscope",
  },
  {
    id: "formacao",
    title: "Formação",
    description: "Integração entre pesquisa, ensino e formação acadêmica.",
    icon: "graduation-cap",
  },
  {
    id: "territorio",
    title: "Território",
    description: "Conhecimento da geodiversidade, dos recursos naturais e do patrimônio geológico.",
    icon: "mountain",
  },
  {
    id: "cooperacao",
    title: "Cooperação",
    description: "Articulação entre instituições e parceiros nacionais e internacionais.",
    icon: "handshake",
  },
];
