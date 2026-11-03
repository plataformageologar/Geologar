/**
 * Variáveis públicas do Supabase.
 *
 * Os acessos a `process.env.NEXT_PUBLIC_*` precisam ser estáticos para que o
 * Next.js consiga incorporá-los ao bundle do navegador. Somente valores
 * públicos (URL e chave publishable) podem ser lidos aqui — nunca a chave
 * secreta ou `service_role`.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.example).",
    );
  }

  return { url, publishableKey };
}
