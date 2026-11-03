import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  // Sem cache incremental (R2) nesta fase: a homepage é renderizada sob demanda.
  // Ver docs/deployment.md antes de habilitar ISR no Cloudflare.
  ...defineCloudflareConfig({}),
  // `npm run build` executa o OpenNext; aqui ele chama o Next.js diretamente
  // (sem isso, chamaria `npm run build` de novo, em recursão).
  buildCommand: "npx next build",
};

export default config;
