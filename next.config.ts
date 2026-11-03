import type { NextConfig } from "next";

// Cache Components (`cacheComponents`) e `partialPrefetching` ficam desativados:
// no runtime do Cloudflare Workers a renderização com Cache Components trava
// (aviso sobre `setTimeout()`) e a requisição termina em HTTP 500.
// Ver docs/deployment.md antes de reativar.
const nextConfig: NextConfig = {
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
