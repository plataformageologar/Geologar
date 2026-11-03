import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { getSupabaseEnv } from "./env";

/**
 * Cliente para leitura de conteúdo público, sem sessão nem cookies.
 *
 * Usa a chave publishable e, portanto, as mesmas permissões (RLS) de um
 * visitante anônimo. Por não depender da requisição, pode ser usado dentro de
 * funções com `"use cache"`.
 */
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
