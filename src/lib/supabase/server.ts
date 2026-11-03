import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

import { authCookieOptions } from "./cookies";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase com a sessão da requisição (cookies), para Server
 * Components, Server Actions e Route Handlers.
 *
 * Crie um novo cliente a cada requisição; nunca compartilhe entre requisições.
 */
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components não podem gravar cookies: nesse caso a sessão
          // já foi renovada pelo proxy (src/proxy.ts) antes da renderização.
        }
      },
    },
  });
}
