import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Conteúdo público vindo do Supabase: revalida a cada 5 minutos.
    content: {
      stale: 60 * 5,
      revalidate: 60 * 5,
      expire: 60 * 60 * 24,
    },
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
