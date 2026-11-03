import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Cookies da sessão do Supabase Auth (gravados pelo `@supabase/ssr`).
 *
 * - `httpOnly`: a sessão só é lida no servidor (proxy, Server Components e
 *   Server Actions); nenhum código no navegador precisa dos tokens.
 * - `secure` em produção (HTTPS). Navegadores aceitam cookies `Secure` em
 *   `http://localhost`, o que mantém o `npm run preview` funcional.
 * - `sameSite: "lax"` e `path: "/"` são os padrões da biblioteca.
 */
export const authCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};
