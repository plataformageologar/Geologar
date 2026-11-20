import type { ReactNode } from "react";

import { getActiveSocialLinks, getSiteSettings } from "@/lib/queries/settings";
import { resolveImageSrc } from "@/lib/queries/shared";
import { getAppearance, getNavigation } from "@/lib/queries/site-config";
import { appearanceCss } from "@/lib/site/appearance";

import { EditPageButton } from "./edit-page-button";
import { Footer } from "./footer";
import { Header } from "./header";

/**
 * Estrutura do site público: link de acesso ao conteúdo, cabeçalho
 * institucional, rodapé e a aparência configurada no CMS. Usada pelo layout
 * `(public)` e pela página 404 global (endereços inexistentes), que fica
 * fora dos grupos de rotas.
 */
export async function PublicShell({ children }: { children: ReactNode }) {
  const [settings, socialLinks, navigation, appearance] = await Promise.all([
    getSiteSettings(),
    getActiveSocialLinks(),
    getNavigation(),
    getAppearance(),
  ]);
  // Somente variáveis CSS geradas de valores validados (cores #rrggbb e
  // opções fixas); vazio quando tudo segue o padrão do design system.
  const themeCss = appearanceCss(appearance);

  return (
    <>
      {themeCss && <style>{themeCss}</style>}
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-primary px-5 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header
        navigation={navigation.header}
        institutionalName={settings.institutional_name}
        logoSrc={resolveImageSrc(settings.logo_path)}
        headerStyle={settings.header_style}
      />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer settings={settings} navigation={navigation.footer} socialLinks={socialLinks} />
      <EditPageButton />
    </>
  );
}
