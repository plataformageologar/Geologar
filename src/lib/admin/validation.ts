/**
 * Validação dos formulários do CMS. Compartilhada entre o navegador (retorno
 * imediato ao editor) e as Server Actions, onde a validação é definitiva.
 */

export type TextRule = {
  max: number;
  required?: boolean;
  /** Aceita quebras de linha (textarea). */
  multiline?: boolean;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Número de caracteres como o editor os vê (acentos e emojis contam 1). */
export function countCharacters(value: string) {
  return Array.from(value).length;
}

/**
 * Normaliza um texto sem alterar o conteúdo: remove espaços nas extremidades
 * e padroniza quebras de linha. Vazio vira `null` (campo opcional sem valor).
 */
export function normalizeText(value: string, multiline = false): string | null {
  const text = multiline ? value.replace(/\r\n?/g, "\n") : value;
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/** Mensagem de erro do texto, ou `null` quando válido. */
export function validateText(value: string | null, rule: TextRule): string | null {
  if (value === null) return rule.required ? "Preencha este campo." : null;
  if (CONTROL_CHARS.test(value)) return "O texto contém caracteres inválidos.";
  if (!rule.multiline && /[\r\n]/.test(value)) return "Use apenas uma linha neste campo.";
  if (countCharacters(value) > rule.max) {
    return `O texto excede o limite de ${rule.max} caracteres.`;
  }
  return null;
}

export const LINK_MAX_LENGTH = 300;

// Caminho interno: começa com uma única "/" (bloqueia "//site" e "/\site").
const INTERNAL_PATH = /^\/(?![/\\])[^\s\\]*$/;

/**
 * Destinos aceitos em botões e links editáveis:
 * - caminhos internos do site (`/contato`, `/projetos?situacao=em-andamento`,
 *   `/#pesquisa`);
 * - URLs externas completas `http://` ou `https://`, sem usuário/senha.
 * Bloqueia `javascript:`, `data:`, `//site`, endereços relativos ambíguos e
 * valores malformados.
 */
export function validateHref(value: string | null): string | null {
  if (value === null) return null;
  if (countCharacters(value) > LINK_MAX_LENGTH || CONTROL_CHARS.test(value)) {
    return "Informe um endereço válido.";
  }
  if (value.startsWith("/")) {
    return INTERNAL_PATH.test(value) ? null : "Informe um endereço válido.";
  }

  if (!URL.canParse(value)) {
    return "Informe um endereço válido: um caminho do site (ex.: /contato) ou uma URL completa começando com https://.";
  }
  return isSafeWebUrl(value) ? null : "Informe um endereço válido: use apenas links http:// ou https://.";
}

/** URL absoluta http(s) com domínio e sem usuário/senha embutidos. */
function isSafeWebUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    !/\s/.test(value) &&
    url.hostname.includes(".") &&
    url.username === "" &&
    url.password === ""
  );
}

/** Link para fora do portal (ex.: página do projeto): somente http(s). */
export function validateExternalUrl(value: string | null): string | null {
  if (value === null) return null;
  if (countCharacters(value) > LINK_MAX_LENGTH || CONTROL_CHARS.test(value)) {
    return "Informe um endereço válido.";
  }
  return isSafeWebUrl(value)
    ? null
    : "Informe um endereço completo começando com https:// (sem usuário ou senha).";
}

// Slugs ----------------------------------------------------------------------------

/** Mesmo limite e formato das constraints `*_slug_length` e `*_slug_format`. */
export const SLUG_MAX_LENGTH = 160;
const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Sugestão de slug a partir do título: minúsculas, sem acentos, palavras
 * separadas por um único hífen ("Geologia e Geodiversidade" →
 * "geologia-e-geodiversidade").
 */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
}

export function validateSlug(value: string | null): string | null {
  if (value === null) return "Preencha este campo.";
  if (value.length > SLUG_MAX_LENGTH) {
    return `O slug excede o limite de ${SLUG_MAX_LENGTH} caracteres.`;
  }
  if (!SLUG_FORMAT.test(value)) {
    return "Use apenas letras minúsculas sem acento, números e hífens entre as palavras (ex.: geologia-ambiental).";
  }
  return null;
}

// Números e datas --------------------------------------------------------------------

export const SORT_ORDER_MAX = 999_999;

/** Ordenação: inteiro de 0 a 999999 (constraint `*_sort_order_nonnegative`). */
export function parseSortOrder(value: string): { value: number; error: string | null } {
  const text = value.trim();
  if (text === "") return { value: 0, error: null };
  if (!/^\d{1,6}$/.test(text)) {
    return { value: 0, error: "Informe um número inteiro igual ou maior que zero." };
  }
  return { value: Number(text), error: null };
}

/** Data `AAAA-MM-DD` (formato do `<input type="date">` e do PostgreSQL). */
export function validateDate(value: string | null): string | null {
  if (value === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "Informe uma data válida.";
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    year >= 1900 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? null : "Informe uma data válida.";
}

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_FORMAT.test(value);
}

/**
 * Botão = texto + destino. Os dois vazios removem o botão de propósito;
 * apenas um deles preenchido é um botão incompleto.
 */
export function validateCta(
  label: string | null,
  href: string | null,
): { label?: string; href?: string } {
  const errors: { label?: string; href?: string } = {};
  const hrefError = validateHref(href);
  if (hrefError) errors.href = hrefError;
  else if (label !== null && href === null) errors.href = "O botão precisa de um destino válido.";
  if (href !== null && label === null) errors.label = "Informe o texto do botão ou apague o destino.";
  return errors;
}
