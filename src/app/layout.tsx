import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { mainNavigation, siteSettings, socialLinks } from "@/data/site";
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

export const metadata: Metadata = {
  title: "GeoLogar",
  description:
    "Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        <Header
          navigation={mainNavigation}
          institutionalName={siteSettings.institutional_name}
        />
        <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer
          settings={siteSettings}
          navigation={mainNavigation}
          socialLinks={socialLinks}
        />
      </body>
    </html>
  );
}
