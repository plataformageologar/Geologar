/**
 * Camada de e-mail do formulário de contato (Resend, via `fetch`).
 *
 * - Remetente: `CONTACT_FROM_EMAIL` (domínio verificado). O e-mail do
 *   visitante vai somente em `reply_to`, nunca como remetente.
 * - Conteúdo do visitante: escapado no HTML e enviado também em texto puro.
 * - Cabeçalhos: o assunto vem da lista fixa e os campos não aceitam quebras
 *   de linha (validados em `schema.ts`); a API JSON monta os cabeçalhos.
 * - Idempotência: `Idempotency-Key` derivada do envio (24 h no Resend), para
 *   que repetir o mesmo envio não gere outro e-mail.
 *
 * Sem dependências do projeto (testado com `node --test` e `fetch` simulado).
 */

import type { ContactSubmission } from "./schema";

export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

export type ContactEmail = { subject: string; text: string; html: string };

export type SendResult =
  | { ok: true }
  | { ok: false; code: "provider-rejected" | "provider-auth" | "provider-rate-limited" | "provider-unavailable"; status?: number };

const sentAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bahia",
});

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Remove quebras de linha e caracteres de controle de um valor de cabeçalho. */
function headerSafe(value: string) {
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").trim();
}

export function buildContactEmail(submission: ContactSubmission, sentAt: Date): ContactEmail {
  const subject = headerSafe(`[GeoLogar] Novo contato: ${submission.subjectLabel}`);
  const when = sentAtFormatter.format(sentAt);

  const text = [
    "Nova mensagem enviada pelo formulário de contato do site da GeoLogar.",
    "",
    `Nome: ${submission.name}`,
    `E-mail: ${submission.email}`,
    `Assunto: ${submission.subjectLabel}`,
    `Enviada em: ${when} (horário de Brasília)`,
    "",
    "Mensagem:",
    submission.message,
    "",
    "--",
    "Para responder, use a opção Responder: a resposta vai para o e-mail informado no formulário.",
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><th align="left" style="padding:4px 12px 4px 0;color:#4b5563;font-weight:600;vertical-align:top">${label}</th>` +
    `<td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const message = escapeHtml(submission.message).replace(/\n/g, "<br>");

  const html =
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>` +
    `<body style="margin:0;padding:24px;background:#f6f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2933;font-size:15px;line-height:1.5">` +
    `<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e3e6e1;border-radius:8px;padding:24px">` +
    `<p style="margin:0 0 16px">Nova mensagem enviada pelo formulário de contato do site da GeoLogar.</p>` +
    `<table role="presentation" style="border-collapse:collapse;margin:0 0 16px">` +
    row("Nome", submission.name) +
    row("E-mail", submission.email) +
    row("Assunto", submission.subjectLabel) +
    row("Enviada em", `${when} (horário de Brasília)`) +
    `</table>` +
    `<p style="margin:0 0 4px;font-weight:600">Mensagem</p>` +
    `<div style="padding:12px 16px;background:#f6f7f5;border-radius:6px;word-break:break-word">${message}</div>` +
    `<p style="margin:16px 0 0;color:#4b5563;font-size:13px">Para responder, use a opção Responder: a resposta vai para o e-mail informado no formulário.</p>` +
    `</div></body></html>`;

  return { subject, text, html };
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Chave de idempotência: o mesmo envio (identificador gerado no navegador e
 * mesmo conteúdo) produz a mesma chave; conteúdo alterado gera outra.
 */
export async function contactIdempotencyKey(submissionId: string, submission: ContactSubmission) {
  const material = JSON.stringify([submissionId, submission.name, submission.email, submission.subject, submission.message]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return `geologar-contact-${toHex(digest).slice(0, 48)}`;
}

export async function sendContactEmail(options: {
  apiKey: string;
  from: string;
  to: string[];
  replyTo: string;
  email: ContactEmail;
  idempotencyKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<SendResult> {
  const { apiKey, from, to, replyTo, email, idempotencyKey, fetchImpl = fetch, timeoutMs = 10000 } = options;

  try {
    const response = await fetchImpl(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.ok) {
      // Aceito pelo provedor (não é garantia de entrega na caixa de entrada).
      const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
      return typeof body?.id === "string" ? { ok: true } : { ok: false, code: "provider-unavailable", status: response.status };
    }
    if (response.status === 401 || response.status === 403) return { ok: false, code: "provider-auth", status: response.status };
    if (response.status === 429) return { ok: false, code: "provider-rate-limited", status: response.status };
    if (response.status >= 500) return { ok: false, code: "provider-unavailable", status: response.status };
    return { ok: false, code: "provider-rejected", status: response.status };
  } catch {
    return { ok: false, code: "provider-unavailable" };
  }
}
