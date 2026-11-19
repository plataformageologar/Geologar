import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { RateLimiter } from "./handler";

declare global {
  interface CloudflareEnv {
    /** Binding `ratelimits` do wrangler.jsonc (limite de envios do formulário de contato). */
    CONTACT_RATE_LIMITER?: RateLimiter;
  }
}

/**
 * Binding de rate limiting do Cloudflare Workers, ou `null` fora do runtime
 * do Workers (`next dev`), onde o formulário segue protegido pelo Turnstile.
 */
export async function getContactRateLimiter(): Promise<RateLimiter | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.CONTACT_RATE_LIMITER ?? null;
  } catch {
    return null;
  }
}
