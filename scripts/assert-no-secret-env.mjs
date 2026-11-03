// Impede `npm run deploy` / `npm run upload` quando algum arquivo .env* local
// define SUPABASE_SECRET_KEY: o build do OpenNext copia todas as variáveis
// desses arquivos para o Worker (.open-next/cloudflare/next-env.mjs), e a
// chave secreta seria publicada junto com o código.
import { existsSync, readFileSync } from "node:fs";

const files = [".env", ".env.production", ".env.local", ".env.production.local"];
const offending = files.filter(
  (file) =>
    existsSync(file) &&
    /^\s*SUPABASE_SECRET_KEY\s*=\s*\S/m.test(readFileSync(file, "utf8")),
);

if (offending.length > 0) {
  console.error(
    `Deploy bloqueado: SUPABASE_SECRET_KEY está definida em ${offending.join(", ")}.\n` +
      "O OpenNext embutiria essa chave no Worker. Publique pelo Workers Builds " +
      "(push na main) ou remova a variável desses arquivos antes do deploy local.",
  );
  process.exit(1);
}
