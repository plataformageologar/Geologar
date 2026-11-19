import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { getSiteSettings } from "@/lib/queries/settings";
import { resolveImageSrc } from "@/lib/queries/shared";
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

/** Ícone oficial (public/brand). Fica fora de `app/` de propósito: um
 * `app/icon.png` teria prioridade sobre os metadados e impediria a troca pelo
 * CMS. */
const officialFavicon = { url: "/brand/favicon.png", type: "image/png", sizes: "256x256" };

const faviconTypes: Record<string, string> = { png: "image/png", webp: "image/webp", jpg: "image/jpeg" };

function favicon(path: string | null) {
  const src = resolveImageSrc(path);
  if (!src) return officialFavicon;
  const extension = src.split(".").pop() ?? "";
  return { url: src, type: faviconTypes[extension] ?? "image/png" };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: { default: settings.site_name, template: `%s | ${settings.site_name}` },
    description: settings.short_description ?? settings.institutional_name,
    icons: { icon: [favicon(settings.favicon_path)] },
  };
}

/**
 * Layout raiz: apenas o que é comum às duas áreas (documento, fontes e CSS).
 * O site público (`(public)/layout.tsx`) e a área administrativa
 * (`admin/layout.tsx`) definem cada um a própria estrutura e navegação.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${sourceSans.variable} ${sourceSerif.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
