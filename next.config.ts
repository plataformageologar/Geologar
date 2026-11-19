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

const nextConfig: NextConfig = {
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
