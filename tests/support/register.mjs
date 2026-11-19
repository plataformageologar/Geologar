// Testes unitários com `node --test` (Node 22+, remoção nativa de tipos).
// Resolve imports relativos sem extensão (`./schema`) para arquivos `.ts`,
// como faz o bundler do Next.js. Sem dependências externas.
import { register } from "node:module";

register("./resolve-ts.mjs", import.meta.url);
