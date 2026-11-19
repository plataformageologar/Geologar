/**
 * Utilitários dos testes do formulário de contato. Endereços somente em
 * domínios reservados para documentação (example.com / example.org).
 */

import type { ContactConfig } from "../../src/lib/contact/config";

export const ORIGIN = "https://geologar.example.org";
export const SUBMISSION_ID = "3f2c8a51-6b7d-4e2f-9a10-1c2d3e4f5a6b";

export const config: ContactConfig = {
  resendApiKey: "re_test_fake_key_123",
  fromEmail: "GeoLogar <contato@geologar.example.org>",
  toEmails: ["equipe@geologar.example.org"],
  turnstileSiteKey: "site_key_fake_123",
  turnstileSecretKey: "secret_key_fake_123",
};

export function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: SUBMISSION_ID,
    name: "Maria da Conceição",
    email: "maria@example.com",
    subject: "cooperacao",
    message: "Olá, equipe GeoLogar!\nGostaria de saber mais sobre cooperação.\n\nAtenciosamente.",
    turnstileToken: "token.valido-123_ABC",
    website: "",
    ...overrides,
  };
}

export function contactRequest(
  body: unknown,
  { origin = ORIGIN, contentType = "application/json", headers = {} as Record<string, string> } = {},
) {
  const requestHeaders: Record<string, string> = { "content-type": contentType, ...headers };
  if (origin) requestHeaders.origin = origin;
  return new Request(`${ORIGIN}/api/contact`, {
    method: "POST",
    headers: requestHeaders,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export type FetchCall = { url: string; init: RequestInit };

/** `fetch` simulado: responde por URL e registra as chamadas. */
export function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: FetchCall[] = [];
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const route = routes[url];
    if (!route) throw new Error(`rota não simulada: ${url}`);
    return route();
  }) as typeof fetch;
  return { impl, calls };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const NOW = Date.parse("2026-11-19T15:00:00Z");

export function siteverifyOk(overrides: Record<string, unknown> = {}) {
  return jsonResponse({
    success: true,
    "error-codes": [],
    challenge_ts: new Date(NOW - 30_000).toISOString(),
    hostname: "geologar.example.org",
    action: "contact",
    ...overrides,
  });
}
