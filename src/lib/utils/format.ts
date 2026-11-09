/**
 * Formatação de valores do banco para exibição (pt-BR). Valores ausentes ou
 * inválidos retornam `null` para que a interface simplesmente os omita.
 */

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Datas `date` do Postgres (AAAA-MM-DD) por extenso; fuso fixo evita trocar o dia. */
export function formatDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

/**
 * Período de execução sem completar datas ausentes: com só uma das datas,
 * informa apenas o início ou o término.
 */
export function formatPeriod(start: string | null, end: string | null): string | null {
  const from = formatDate(start);
  const to = formatDate(end);
  if (from && to) return `${from} a ${to}`;
  if (from) return `Início em ${from}`;
  if (to) return `Término em ${to}`;
  return null;
}

/**
 * Normaliza um DOI ("10.xxxx/...", "doi:10.xxxx/..." ou URL do doi.org) para
 * o identificador e o link canônico. DOIs fora do padrão são ignorados.
 */
export function normalizeDoi(value: string | null): { doi: string; url: string } | null {
  if (!value) return null;
  const doi = value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "");
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) return null;
  return { doi, url: `https://doi.org/${doi}` };
}

/** Aceita apenas links http(s) absolutos vindos do banco. */
export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Data e hora de um `timestamptz` no horário de Brasília (ex.: 09/11/2026, 13:44). */
export function formatAdminDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}
