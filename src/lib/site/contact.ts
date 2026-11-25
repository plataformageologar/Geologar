/**
 * Contato institucional (ajuste complementar da Etapa 10.7). O formulário de
 * contato está desativado por decisão de escopo; os canais oficiais ficam na
 * coluna "Contato" do rodapé, presente em todas as páginas (âncora #contato).
 * Módulo puro: usado pelo site, pelo CMS e pelo editor visual.
 */

export const CONTACT_ANCHOR = "contato";

/** Valor guardado no CMS (menus, botões) para levar ao contato do rodapé. */
export const CONTACT_HREF = `/#${CONTACT_ANCHOR}`;

/** Endereço da antiga página de contato (redirecionada para /#contato). */
const LEGACY_CONTACT_PATHS = new Set(["/contato", "/contato/"]);

export function isContactHref(href: string): boolean {
  const value = href.trim();
  return value === CONTACT_HREF || LEGACY_CONTACT_PATHS.has(value);
}

/**
 * Destino renderizado de um link cadastrado. O contato vira "#contato": o
 * rodapé existe em todas as páginas, então o visitante rola até ele sem sair
 * da página atual. Os demais destinos são mantidos.
 */
export function resolveSiteHref(href: string): string {
  return isContactHref(href) ? `#${CONTACT_ANCHOR}` : href;
}

/** Link só com fragmento (âncora na própria página): usar `<a>` simples. */
export function isHashHref(href: string): boolean {
  return href.startsWith("#");
}

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Link `tel:` (mantém o + do código do país). */
export function telHref(phone: string): string | null {
  const count = digits(phone);
  if (count.length < 8) return null;
  return `tel:${phone.trim().startsWith("+") ? "+" : ""}${count}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}

/** Mesmo formato da constraint site_settings_contact_whatsapp_format. */
const WHATSAPP_PATTERN = /^\+[0-9][0-9 ()./-]{9,24}$/;
export const WHATSAPP_MAX_LENGTH = 26;

/**
 * WhatsApp oficial em formato internacional (+55 …), com 10 a 15 dígitos.
 * Nunca é deduzido do telefone: só aparece quando cadastrado.
 */
export function validateWhatsapp(value: string | null): string | null {
  if (value === null) return null;
  const count = digits(value).length;
  if (!WHATSAPP_PATTERN.test(value) || count < 10 || count > 15) {
    return "Informe o número com + e o código do país (ex.: +55 e o DDD), usando apenas números, espaços, ( ), - ou /.";
  }
  return null;
}

/** Link de conversa do WhatsApp (wa.me), ou `null` se o número for inválido. */
export function whatsappHref(value: string): string | null {
  return validateWhatsapp(value.trim()) === null ? `https://wa.me/${digits(value)}` : null;
}
