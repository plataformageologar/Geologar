import type { NextConfig } from "next";

// Cache Components (`cacheComponents`) e `partialPrefetching` ficam desativados:
// no runtime do Cloudflare Workers a renderização com Cache Components trava
// (aviso sobre `setTimeout()`) e a requisição termina em HTTP 500.
// Ver docs/deployment.md antes de reativar.
// Imagens da biblioteca de mídia: somente o bucket geologar-media do projeto
// Supabase configurado (NEXT_PUBLIC_SUPABASE_URL, disponível no build).
function mediaRemotePatterns(): URL[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return [];
  try {
    return [new URL(`${new URL(base).origin}/storage/v1/object/public/geologar-media/uploads/**`)];
  } catch {
    return [];
  }
}

// Cabeçalhos de segurança de todas as respostas. A área administrativa
// recebe ainda `Cache-Control: no-store` e `frame-ancestors 'self'` em
// src/proxy.ts. SAMEORIGIN mantém o editor visual (iframe do próprio site).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: mediaRemotePatterns(),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
