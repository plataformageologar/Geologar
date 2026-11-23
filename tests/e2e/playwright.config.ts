import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta do VISITANTE (Etapa 10). Somente leitura: sem login,
 * sem credenciais, sem envio de formulários e sem gravação no banco.
 *
 * Rodam contra um servidor já iniciado — por padrão o preview local do
 * Worker (`npm run preview`, porta 8787). Outro endereço: `E2E_BASE_URL`.
 * Ver docs/qa-report.md.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../../test-results/e2e",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8787",
    locale: "pt-BR",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
});
