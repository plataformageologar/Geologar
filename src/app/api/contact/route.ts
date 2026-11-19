import { getContactConfig } from "@/lib/contact/config";
import { handleContactRequest } from "@/lib/contact/handler";
import { getContactRateLimiter } from "@/lib/contact/rate-limit";

/**
 * Formulário de contato: valida, confere o Turnstile e envia pelo Resend.
 * Nenhuma mensagem é gravada no banco. Ver docs/contact-form.md.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleContactRequest(request, {
    config: getContactConfig().config,
    rateLimiter: await getContactRateLimiter(),
  });
}
