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
| `wrangler.jsonc`                | Worker `geologar`, assets estáticos, imagens, limite de envios do formulário de contato (`ratelimits`) e autorreferência exigida pelo OpenNext |
| `open-next.config.ts`           | Configuração do adaptador (sem cache incremental)        |
| `public/_headers`               | Cache longo (`immutable`) para `/_next/static/*`         |
| `scripts/assert-no-secret-env.mjs` | Bloqueia deploy local se houver chave secreta (`SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`) em `.env*` |
| `.dev.vars.example`             | Modelo das variáveis de runtime para o Worker local (copiar para `.dev.vars`, não versionado) |

Com `wrangler.jsonc` no repositório, o Wrangler considera o projeto já
configurado e **não executa mais a configuração automática** (`@opennextjs/cloudflare
migrate --force-install`, com versões `@latest`) a cada build.

Não há R2, D1, KV nem Durable Objects: não são necessários enquanto a homepage
for renderizada sob demanda (ver abaixo). O único binding adicional é o
`CONTACT_RATE_LIMITER` (Rate Limiting do Workers, sem armazenamento), usado
pelo formulário de contato.

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

### Variáveis de runtime (formulário de contato)

O formulário de `/contato` lê suas variáveis **em tempo de execução**, em
*Workers & Pages → geologar → Settings → Variables and Secrets* (não na seção
*Build*). Valores fornecidos pela GeoLogar; nunca no repositório, no
`wrangler.jsonc` ou em `.env*`.

| Variável | Tipo |
|---|---|
| `CONTACT_FORM_ENABLED` | Text (`true` ativa) |
| `CONTACT_TO_EMAIL` | Text |
| `CONTACT_FROM_EMAIL` | Text |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Text |
| `RESEND_API_KEY` | **Secret** |
| `TURNSTILE_SECRET_KEY` | **Secret** |

- Sem todas elas (ou com `CONTACT_FORM_ENABLED` diferente de `true`), o
  formulário não aparece e o site continua igual. Alterar esses valores não
  exige novo build: vale para as próximas requisições.
- `keep_vars: true` (`wrangler.jsonc`) preserva o que foi cadastrado no painel
  a cada deploy.
- Turnstile: o widget deve listar `geologar.plataformageologar.workers.dev`
  (e o domínio oficial, quando houver).
- Detalhes, testes e checklist de ativação em
  [`contact-form.md`](contact-form.md).

## Desenvolvimento e testes locais

```bash
npm run dev       # Next.js em modo desenvolvimento (Node.js)
npm run preview   # build do OpenNext + Worker local no runtime do Cloudflare (workerd)
npm test          # testes unitários (node --test), sem rede
```

Variáveis de runtime do Worker local (formulário de contato) ficam em
`.dev.vars` (modelo em `.dev.vars.example`, não versionado), que o Wrangler lê
no `preview` e o build **não** embute no Worker.

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
as leituras são compartilhadas com `cache` do React. Alterações **publicadas**
no CMS (botão “Publicar alterações”, Etapa 9.6) aparecem na próxima
requisição, sem novo deploy; rascunhos nunca chegam ao site público. Páginas
personalizadas (`/paginas/[slug]`) também são dinâmicas e respondem 404 quando
não estão publicadas.

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

## Imagens remotas (Supabase Storage)

As imagens da biblioteca de mídia vêm do bucket público `geologar-media`.
`next.config.ts` libera em `images.remotePatterns` **somente** o host do
projeto (lido de `NEXT_PUBLIC_SUPABASE_URL` no build) e o caminho
`/storage/v1/object/public/geologar-media/uploads/**` — sem curingas de host.
No Worker, `/_next/image` busca a imagem e a otimiza com o binding `IMAGES`
já declarado em `wrangler.jsonc`; nenhum binding, R2, KV ou Cloudflare Images
novo foi adicionado. O envio de arquivos vai direto do navegador ao Storage
(URL assinada), sem passar pelo Worker. Como o host entra no build, trocar o
projeto Supabase exige um novo build. Ver [`media-library.md`](media-library.md).

## Proxy e área administrativa

`src/proxy.ts` (antigo *middleware*) renova a sessão do Supabase Auth nas rotas
`/admin` e `/admin/:path*`. No Next.js 16 o proxy roda no runtime Node.js, que
o OpenNext suporta no Workers em modo **experimental** (o build mostra
*"Node.js middleware support is experimental in cloudflare"*). O
funcionamento foi validado no `npm run preview` (redirecionamentos, renovação
e limpeza de cookies, rejeição de tokens forjados). Após atualizar Next.js ou
OpenNext, repita a validação antes do deploy. Nenhum binding, KV, R2 ou
Durable Object foi adicionado; o login usa apenas as variáveis
`NEXT_PUBLIC_*` já existentes. Configuração do Supabase Auth (Site URL,
Redirect URLs, cadastro público) em [`admin-auth.md`](admin-auth.md).

## Checklist pós-deploy

- [ ] Build e deploy concluídos no Workers Builds.
- [ ] `GET /` responde `200` com o conteúdo do banco (hero, A Rede, 6 linhas de
      pesquisa, contato).
- [ ] Páginas internas (`/rede`, `/pesquisa`, `/projetos`, `/publicacoes`,
      `/instituicoes`, `/contato`) em `200`; slug inexistente em `404`.
- [ ] Assets `/_next/static/*` com `Cache-Control: public,max-age=31536000,immutable`.
- [ ] Logotipo (`/_next/image`) carregando; favicon em `/brand/favicon.png`
      (ou o configurado no CMS).
- [ ] Imagens da biblioteca (`/storage/v1/object/public/geologar-media/…`)
      carregando via `/_next/image` (binding `IMAGES`).
- [ ] Sem erros no console nem falhas de hidratação; menu mobile funcionando.
- [ ] Nenhuma chave secreta no HTML/JS publicado.
- [ ] `GET /admin` sem sessão em `307` para `/admin/login`, com
      `Cache-Control: private, no-store`; `/admin/login` em `200`.
- [ ] Login, painel, "Meu perfil" e "Sair" funcionando com uma conta vinculada.
- [ ] Observability do Worker sem erros (*Workers → geologar → Logs*).
- [ ] `/contato`: sem as variáveis do formulário, apenas canais/aviso vazio e
      nenhum script do Turnstile; `POST /api/contact` em `503`.
- [ ] Com o formulário ativado: envio real de teste recebido, token inválido
      recusado e limite de envios funcionando (ver
      [`contact-form.md`](contact-form.md#checklist-de-ativação)).

## Problemas comuns

| Sintoma                                   | Causa provável                                    |
| ----------------------------------------- | ------------------------------------------------- |
| Deploy falha: *"Could not find compiled Open Next config"* | O build não gerou `.open-next/`: o build command deve ser `npm run build` (que executa o OpenNext), não `next build` |
| `GET /` em 500 com *"code had hung"*      | Cache Components reativado: ver "Renderização e cache" |
| Site só com hero, A Rede e contato        | Variáveis `NEXT_PUBLIC_*` ausentes no build: cadastre e refaça o build |
| Link de recuperação volta com "link inválido" | Aberto em outro navegador (PKCE) ou Redirect URL ausente no Supabase: ver [`admin-auth.md`](admin-auth.md) |
| Login correto leva a "acesso negado"      | Conta sem registro ativo em `admin_memberships`   |
| Formulário de contato não aparece        | Alguma variável de runtime ausente ou inválida, ou `CONTACT_FORM_ENABLED` diferente de `true` |
| Envio sempre falha                        | Ver o código no log (`provider-auth`, `turnstile-hostname-mismatch`…) em [`contact-form.md`](contact-form.md#códigos-de-log) |

## Domínio oficial

Ainda não configurado. Quando for, a configuração deve ser planejada à parte
(*Workers → geologar → Settings → Domains & Routes*), sem alterar o DNS atual
antes da validação.
