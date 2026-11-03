import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getMainNavigation } from "@/lib/queries/homepage";
import { getActiveSocialLinks, getSiteSettings } from "@/lib/queries/settings";
import "./globals.css";

// Texto e interface.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

// Títulos: serifa editorial para reforçar o caráter científico.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600"],
});

// Renderização sob demanda: o conteúdo vem do Supabase a cada requisição, sem
// depender de ISR (ainda não há cache incremental configurado no Cloudflare).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: settings.site_name,
    description: settings.short_description ?? settings.institutional_name,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, navigation, socialLinks] = await Promise.all([
    getSiteSettings(),
    getMainNavigation(),
    getActiveSocialLinks(),
  ]);

  return (
    <html
      lang="pt-BR"
      className={`${sourceSans.variable} ${sourceSerif.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-full bg-primary px-5 py-3 text-label text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        <Header navigation={navigation} institutionalName={settings.institutional_name} />
        <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer settings={settings} navigation={navigation} socialLinks={socialLinks} />
      </body>
    </html>
  );
}
