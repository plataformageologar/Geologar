/**
 * Validação do token do Cloudflare Turnstile no servidor (siteverify).
 *
 * Confere: sucesso, hostname esperado (o da requisição), ação `contact`,
 * idade do desafio (≤ 5 min) e reutilização (`timeout-or-duplicate`: cada
 * token vale uma única vez). Sem dependências do projeto (testado com
 * `node --test` e `fetch` simulado).
 */

export const TURNSTILE_ACTION = "contact";
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Validade de um token segundo a documentação do Turnstile. */
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000;
/** Tolerância a diferenças de relógio. */
const CLOCK_SKEW_MS = 60 * 1000;

export type TurnstileFailure =
  | "invalid-token"
  | "expired-or-duplicate"
  | "hostname-mismatch"
  | "action-mismatch"
  | "stale"
  | "testing-key"
  | "unavailable";

export type TurnstileResult = { ok: true } | { ok: false; code: TurnstileFailure };

type SiteverifyResponse = {
  success?: unknown;
  "error-codes"?: unknown;
  hostname?: unknown;
  action?: unknown;
  challenge_ts?: unknown;
  metadata?: { result_with_testing_key?: unknown } | null;
};

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname);
}

export async function verifyTurnstile(options: {
  secret: string;
  token: string;
  /** Hostname da página que exibiu o widget (o da própria requisição). */
  expectedHostname: string;
  fetchImpl?: typeof fetch;
  now?: number;
  timeoutMs?: number;
}): Promise<TurnstileResult> {
  const { secret, token, expectedHostname, fetchImpl = fetch, now = Date.now(), timeoutMs = 8000 } = options;

  let body: SiteverifyResponse;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, code: "unavailable" };
    body = (await response.json()) as SiteverifyResponse;
  } catch {
    return { ok: false, code: "unavailable" };
  }

  if (body.success !== true) {
    const codes = Array.isArray(body["error-codes"]) ? body["error-codes"] : [];
    if (codes.includes("timeout-or-duplicate")) return { ok: false, code: "expired-or-duplicate" };
    if (codes.some((code) => typeof code === "string" && /secret|bad-request|internal-error/.test(code))) {
      return { ok: false, code: "unavailable" };
    }
    return { ok: false, code: "invalid-token" };
  }

  // Chaves de teste públicas do Turnstile respondem com hostname fictício e
  // sem ação: aceitas somente em execução local (localhost), nunca publicada.
  if (body.metadata?.result_with_testing_key === true) {
    return isLocalHostname(expectedHostname) ? { ok: true } : { ok: false, code: "testing-key" };
  }

  if (typeof body.hostname !== "string" || body.hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
    return { ok: false, code: "hostname-mismatch" };
  }
  if (body.action !== TURNSTILE_ACTION) return { ok: false, code: "action-mismatch" };

  const issuedAt = typeof body.challenge_ts === "string" ? Date.parse(body.challenge_ts) : Number.NaN;
  if (Number.isNaN(issuedAt) || now - issuedAt > MAX_TOKEN_AGE_MS || issuedAt - now > CLOCK_SKEW_MS) {
    return { ok: false, code: "stale" };
  }

  return { ok: true };
}
