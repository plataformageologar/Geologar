import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authCookieOptions } from "@/lib/supabase/cookies";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

// Telas da área administrativa acessíveis sem sessão.
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/recuperar-senha"]);

/**
 * Sessão do Supabase Auth na área administrativa.
 *
 * 1. Lê os cookies da requisição e valida o JWT com `getClaims()`.
 * 2. Renova a sessão quando o access token está para expirar e grava os
 *    novos cookies na requisição (para a renderização) e na resposta.
 * 3. Sem sessão válida, redireciona as rotas protegidas para o login.
 *
 * O proxy não consulta permissões: a autorização (vínculo em
 * `admin_memberships`) é verificada em cada página e Server Action. O site
 * público fica fora do `matcher` e não passa por aqui.
 */
export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims.sub);
  const { pathname } = request.nextUrl;
  // Server Actions verificam a sessão por conta própria e respondem com um
  // erro estruturado (ex.: sessão expirada) sem descartar o formulário; um
  // redirecionamento aqui quebraria a resposta da action.
  const isServerAction = request.method === "POST" && request.headers.has("next-action");

  if (!authenticated && !PUBLIC_ADMIN_PATHS.has(pathname) && !isServerAction) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") loginUrl.searchParams.set("next", pathname);

    const redirect = NextResponse.redirect(loginUrl);
    // Preserva a limpeza de cookies feita pelo Supabase (sessão inválida).
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  // Páginas administrativas nunca entram em cache compartilhado.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
