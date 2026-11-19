/**
 * Processamento de `POST /api/contact`, com dependências injetadas para que
 * o fluxo completo seja testável sem rede (`tests/contact`).
 *
 * Ordem: configuração → origem → tipo e tamanho do corpo → estrutura e campos
 * → honeypot → limite de envios → Turnstile → envio ao provedor.
 * Sucesso só depois que o provedor aceita a mensagem.
 *
 * Logs: JSON estruturado com códigos genéricos; nunca nome, e-mail, mensagem,
 * IP, token ou chaves.
 */

import type { ContactConfig } from "./config";
import { buildContactEmail, contactIdempotencyKey, sendContactEmail } from "./email";
import { CONTACT_MESSAGES } from "./messages";
import { CONTACT_BODY_MAX_BYTES, parseContactPayload, type ContactFieldErrors } from "./schema";
import { verifyTurnstile } from "./turnstile";

export type ContactErrorCode = "validation" | "verification" | "rate-limited" | "unavailable" | "rejected";

export type ContactResponseBody =
  | { status: "success"; message: string }
  | { status: "error"; code: ContactErrorCode; message: string; fieldErrors?: ContactFieldErrors };

export type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type ContactLogEvent = { event: "contact_sent" } | { event: "contact_rejected"; code: string; status?: number };

export type ContactDeps = {
  config: ContactConfig | null;
  /** Binding de rate limiting do Workers; `null` quando indisponível (ex.: `next dev`). */
  rateLimiter: RateLimiter | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
  log?: (entry: ContactLogEvent) => void;
};

export function logContactEvent(entry: ContactLogEvent) {
  const line = JSON.stringify({ scope: "contact", ...entry });
  if (entry.event === "contact_sent") console.info(line);
  else console.warn(line);
}

function json(body: ContactResponseBody, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Lê o corpo como texto UTF-8 sem ultrapassar `maxBytes` (mesmo sem Content-Length). */
export async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Mesma origem: `Origin` obrigatório e igual ao da requisição. */
function isSameOrigin(request: Request, requestUrl: URL) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    if (new URL(origin).origin !== requestUrl.origin) return false;
  } catch {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

/** Chave do limite por visitante: HMAC do IP (o IP não é guardado nem registrado). */
export async function rateLimitKey(ip: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`geologar-contact-rate:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `contact:${hex.slice(0, 32)}`;
}

export async function handleContactRequest(request: Request, deps: ContactDeps): Promise<Response> {
  const { config, rateLimiter, fetchImpl = fetch, now = Date.now, log = logContactEvent } = deps;
  const reject = (code: string, body: ContactResponseBody, status: number) => {
    log({ event: "contact_rejected", code, status });
    return json(body, status);
  };
  const failure = (code: ContactErrorCode, message: string = CONTACT_MESSAGES.failure) =>
    ({ status: "error", code, message }) as const;

  if (!config) return reject("not-configured", failure("unavailable"), 503);

  const url = new URL(request.url);
  if (!isSameOrigin(request, url)) return reject("origin", failure("rejected"), 403);

  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(\s*;\s*charset=utf-8)?$/i.test(contentType.trim())) {
    return reject("content-type", failure("rejected"), 415);
  }

  const text = await readLimitedText(request, CONTACT_BODY_MAX_BYTES);
  if (text === null) return reject("body-too-large", failure("rejected"), 413);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reject("malformed-json", failure("rejected"), 400);
  }

  const parsed = parseContactPayload(raw);
  switch (parsed.kind) {
    case "malformed":
      return reject("malformed-payload", failure("rejected"), 400);
    case "honeypot":
      return reject("honeypot", failure("verification", CONTACT_MESSAGES.verification), 400);
    case "invalid":
      return reject(
        "validation",
        { status: "error", code: "validation", message: CONTACT_MESSAGES.validation, fieldErrors: parsed.fieldErrors },
        422,
      );
    case "missing-token":
      return reject("turnstile-missing", failure("verification", CONTACT_MESSAGES.verification), 400);
    case "ok":
      break;
  }

  if (rateLimiter) {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    try {
      const { success } = await rateLimiter.limit({ key: await rateLimitKey(ip, config.turnstileSecretKey) });
      if (!success) return reject("rate-limited", failure("rate-limited", CONTACT_MESSAGES.rateLimited), 429);
    } catch {
      // Falha do contador não impede o envio: o Turnstile continua obrigatório.
      log({ event: "contact_rejected", code: "rate-limit-unavailable" });
    }
  }

  const verification = await verifyTurnstile({
    secret: config.turnstileSecretKey,
    token: parsed.turnstileToken,
    expectedHostname: url.hostname,
    fetchImpl,
    now: now(),
  });
  if (!verification.ok) {
    return verification.code === "unavailable"
      ? reject("turnstile-unavailable", failure("unavailable"), 503)
      : reject(`turnstile-${verification.code}`, failure("verification", CONTACT_MESSAGES.verification), 400);
  }

  const sent = await sendContactEmail({
    apiKey: config.resendApiKey,
    from: config.fromEmail,
    to: config.toEmails,
    replyTo: parsed.submission.email,
    email: buildContactEmail(parsed.submission, new Date(now())),
    idempotencyKey: await contactIdempotencyKey(parsed.submissionId, parsed.submission),
    fetchImpl,
  });
  if (!sent.ok) return reject(sent.code, failure("unavailable"), 502);

  log({ event: "contact_sent" });
  return json({ status: "success", message: CONTACT_MESSAGES.success }, 200);
}
