import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeAdminPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Tipos de link por e-mail aceitos via `token_hash` (modelos personalizados).
const OTP_TYPES = new Set<EmailOtpType>(["recovery", "invite", "email"]);

function redirectTo(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Retorno dos links enviados pelo Supabase Auth (recuperação de senha e
 * convites). Aceita:
 * - `code` (fluxo PKCE padrão): trocado pela sessão com `exchangeCodeForSession`;
 * - `token_hash` + `type`: verificado com `verifyOtp` (modelos de e-mail
 *   personalizados, que funcionam também em outro navegador).
 * O destino (`next`) só pode ser um caminho interno de /admin.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeAdminPath(params.get("next"));
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = true;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn("[auth] Código de retorno recusado:", error.code ?? error.status);
    failed = Boolean(error);
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) console.warn("[auth] Link de e-mail recusado:", error.code ?? error.status);
    failed = Boolean(error);
  }

  // Link expirado, já utilizado, aberto em outro navegador (PKCE) ou inválido.
  return redirectTo(request, failed ? "/admin/login?erro=link-invalido" : next);
}
