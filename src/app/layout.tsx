import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Fonte provisória até a definição da identidade tipográfica.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoLogar",
  description:
    "Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
