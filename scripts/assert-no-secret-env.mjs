// Impede `npm run deploy` / `npm run upload` quando algum arquivo .env* local
// define uma chave secreta: o build do OpenNext copia todas as variáveis
// desses arquivos para o Worker (.open-next/cloudflare/next-env.mjs), e a
// chave seria publicada junto com o código. Secrets de runtime (Resend,
// Turnstile) ficam no painel do Cloudflare ou, localmente, em `.dev.vars`.
import { existsSync, readFileSync } from "node:fs";

const files = [".env", ".env.production", ".env.local", ".env.production.local"];
const secrets = ["SUPABASE_SECRET_KEY", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY"];

const offending = files.flatMap((file) => {
  if (!existsSync(file)) return [];
  const content = readFileSync(file, "utf8");
  return secrets
    .filter((name) => new RegExp(`^\\s*${name}\\s*=\\s*\\S`, "m").test(content))
    .map((name) => `${name} (${file})`);
});

if (offending.length > 0) {
  console.error(
    `Deploy bloqueado: chave secreta definida em arquivo .env*: ${offending.join(", ")}.\n` +
      "O OpenNext embutiria essa chave no Worker. Publique pelo Workers Builds " +
      "(push na main) ou remova a variável desses arquivos antes do deploy local.",
  );
  process.exit(1);
}
