import type { ReactNode } from "react";

import { footerNavigation, mainNavigation } from "@/data/site";
import { getActiveSocialLinks, getSiteSettings } from "@/lib/queries/settings";

import { Footer } from "./footer";
import { Header } from "./header";

/**
 * Estrutura do site público: link de acesso ao conteúdo, cabeçalho
 * institucional e rodapé. Usada pelo layout `(public)` e pela página 404
 * global (endereços inexistentes), que fica fora dos grupos de rotas.
 */
export async function PublicShell({ children }: { children: ReactNode }) {
  const [settings, socialLinks] = await Promise.all([getSiteSettings(), getActiveSocialLinks()]);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-primary px-5 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header navigation={mainNavigation} institutionalName={settings.institutional_name} />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer settings={settings} navigation={footerNavigation} socialLinks={socialLinks} />
    </>
  );
}
