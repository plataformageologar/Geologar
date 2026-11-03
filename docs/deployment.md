# Deploy — GeoLogar

O portal é publicado no **Cloudflare Workers** com o adaptador
[OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`), que
converte o build do Next.js em um Worker.

| Item               | Valor                                                    |
| ------------------ | -------------------------------------------------------- |
| Repositório        | `plataformageologar/Geologar` (GitHub)                   |
| Branch de produção | `main` (cada push gera um novo deploy pelo Workers Builds) |
| Worker             | `geologar` → <https://geologar.plataformageologar.workers.dev> |
| Adaptador          | `@opennextjs/cloudflare` 1.20.15 e `wrangler` 4.157.0 (versões fixas) |
| Node.js            | versão do `.nvmrc` (22)                                  |
| Domínio            | ainda **não** configurado — apenas `*.workers.dev`       |

## Arquivos versionados

| Arquivo                         | Função                                                   |
| ------------------------------- | -------------------------------------------------------- |
| `wrangler.jsonc`                | Worker `geologar`, assets estáticos, imagens e autorreferência exigida pelo OpenNext |
| `open-next.config.ts`           | Configuração do adaptador (sem cache incremental)        |
| `public/_headers`               | Cache longo (`immutable`) para `/_next/static/*`         |
| `scripts/assert-no-secret-env.mjs` | Bloqueia deploy local se houver chave secreta em `.env*` |

Com `wrangler.jsonc` no repositório, o Wrangler considera o projeto já
configurado e **não executa mais a configuração automática** (`@opennextjs/cloudflare
migrate --force-install`, com versões `@latest`) a cada build.

Não há R2, D1, KV nem Durable Objects: não são necessários enquanto a homepage
for renderizada sob demanda (ver abaixo).

## Configuração no painel do Cloudflare

Em *Workers & Pages → geologar → Settings → Build*:

| Campo                 | Valor                                   |
| --------------------- | --------------------------------------- |
| Git repository        | `plataformageologar/Geologar`           |
| Branch (production)   | `main`                                  |
| Root directory        | `/` (raiz)                              |
| Build command         | `npm run build`                         |
| Deploy command        | `npx wrangler deploy`                   |

`npm run build` executa `opennextjs-cloudflare build`, que roda o `next build`
(definido em `buildCommand`, no `open-next.config.ts`) e gera o Worker em
`.open-next/`. Em seguida, `npx wrangler deploy` detecta o projeto OpenNext e
delega para `opennextjs-cloudflare deploy`. Se o build command do painel for
só `next build`, o deploy falha com *"Could not find compiled Open Next
config"*.

### Variáveis de ambiente

Cadastre em *Settings → Build → Variables and secrets* (variáveis **de build**:
o Next.js embute os valores `NEXT_PUBLIC_*` durante o build). Os valores estão
no painel do Supabase, em *Project Settings → API Keys*; **nunca** os escreva no
repositório.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- Ambas são públicas por natureza; a proteção dos dados é feita pelo RLS.
- **Não** cadastre `SUPABASE_SECRET_KEY`: o site não a utiliza.
- Depois de alterar uma variável, dispare um novo build (*Deployments → Retry
  build*, ou um novo push na `main`).

## Desenvolvimento e testes locais

```bash
npm run dev       # Next.js em modo desenvolvimento (Node.js)
npm run preview   # build do OpenNext + Worker local no runtime do Cloudflare (workerd)
```

O `preview` (porta 8787) reproduz o ambiente de produção e é o teste que vale
antes de qualquer mudança em cache, renderização ou dependências do servidor.
No Windows o OpenNext funciona, mas emite um aviso recomendando WSL.

### Atenção: chave secreta em `.env.local`

O build do OpenNext copia **todas** as variáveis de `.env`, `.env.local` e
`.env.production*` para o Worker (`.open-next/cloudflare/next-env.mjs`). Se
`SUPABASE_SECRET_KEY` estiver no `.env.local`, um deploy feito a partir da sua
máquina publicaria a chave junto com o código. Por isso:

- o deploy de produção é feito apenas pelo Workers Builds (sem `.env*`);
- `npm run deploy` e `npm run upload` executam
  `scripts/assert-no-secret-env.mjs` e são interrompidos se a chave estiver
  definida localmente;
- `npm run preview` continua permitido (o Worker local não sai da máquina) e
  `.open-next/` está no `.gitignore`.

## Renderização e cache

A homepage e as páginas internas usam `export const dynamic = "force-dynamic"`:
cada requisição lê o Supabase (7 consultas em paralelo, ~0,8 s no total). Dentro de uma requisição
as leituras são compartilhadas com `cache` do React. Alterações publicadas no
banco aparecem imediatamente, sem novo deploy.

`cacheComponents` e `partialPrefetching` estão **desativados** em
`next.config.ts`. Motivo (causa confirmada do HTTP 500 em produção):

1. Com Cache Components ativo e sem cache incremental, o OpenNext renderiza a
   homepage a cada requisição dentro do Worker.
2. O Next.js avisa que não garante o funcionamento de Cache Components com a
   implementação de `setTimeout()` do runtime do Workers.
3. A renderização trava depois que as consultas terminam: no `preview` local,
   as 7 requisições ao Supabase concluíram com sucesso (~300–600 ms cada) e,
   em seguida, o runtime cancelou a requisição com *"Worker's code had hung and
   would never generate a response"* — o mesmo erro do log de produção.
4. Com Cache Components desativado e renderização dinâmica, o mesmo Worker
   responde `200` (~0,8–1,6 s).

### Reativar cache no futuro

Antes de qualquer mudança, validar com `npm run preview`:

- **ISR / `unstable_cache`**: exige cache incremental persistente no Cloudflare
  (R2 + `r2IncrementalCache` em `open-next.config.ts`); avaliar quando o volume
  de acesso justificar.
- **Cache Components**: só reativar quando Next.js/OpenNext suportarem
  oficialmente esse modo no runtime do Workers.

## Checklist pós-deploy

- [ ] Build e deploy concluídos no Workers Builds.
- [ ] `GET /` responde `200` com o conteúdo do banco (hero, A Rede, 6 linhas de
      pesquisa, contato).
- [ ] Páginas internas (`/rede`, `/pesquisa`, `/projetos`, `/publicacoes`,
      `/instituicoes`, `/contato`) em `200`; slug inexistente em `404`.
- [ ] Assets `/_next/static/*` com `Cache-Control: public,max-age=31536000,immutable`.
- [ ] Logotipo (`/_next/image`) carregando.
- [ ] Sem erros no console nem falhas de hidratação; menu mobile funcionando.
- [ ] Nenhuma chave secreta no HTML/JS publicado.
- [ ] Observability do Worker sem erros (*Workers → geologar → Logs*).

## Problemas comuns

| Sintoma                                   | Causa provável                                    |
| ----------------------------------------- | ------------------------------------------------- |
| Deploy falha: *"Could not find compiled Open Next config"* | O build não gerou `.open-next/`: o build command deve ser `npm run build` (que executa o OpenNext), não `next build` |
| `GET /` em 500 com *"code had hung"*      | Cache Components reativado: ver "Renderização e cache" |
| Site só com hero, A Rede e contato        | Variáveis `NEXT_PUBLIC_*` ausentes no build: cadastre e refaça o build |

## Domínio oficial

Ainda não configurado. Quando for, a configuração deve ser planejada à parte
(*Workers → geologar → Settings → Domains & Routes*), sem alterar o DNS atual
antes da validação.
