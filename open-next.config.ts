import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental (R2) nesta fase: a homepage é renderizada sob demanda.
// Ver docs/deployment.md antes de habilitar ISR no Cloudflare.
export default defineCloudflareConfig({});
