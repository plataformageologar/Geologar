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

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Informe um endereço válido: um caminho do site (ex.: /contato) ou uma URL completa começando com https://.";
  }
  const valid =
    (url.protocol === "https:" || url.protocol === "http:") &&
    !/\s/.test(value) &&
    url.hostname.includes(".") &&
    url.username === "" &&
    url.password === "";
  return valid ? null : "Informe um endereço válido: use apenas links http:// ou https://.";
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
