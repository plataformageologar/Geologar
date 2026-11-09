# GeoLogar

Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade.

Portal institucional da GeoLogar. Nesta fase o repositório contém a homepage
e as páginas públicas (A Rede, Pesquisa, Projetos, Publicações, Instituições e
Contato), integradas ao Supabase (leitura pública via RLS), e a área
administrativa (`/admin`: login, autorização por papel, painel e o primeiro
módulo do CMS, a edição da homepage). Os demais módulos do CMS virão nas
próximas etapas.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org) (modo estrito)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [OpenNext](https://opennext.js.org/cloudflare) (deploy)

## Desenvolvimento local

Requisitos: Node.js 20.9 ou superior (recomendado: versão do `.nvmrc`) e npm.

```bash
git clone https://github.com/plataformageologar/Geologar.git
cd Geologar
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

A aplicação ficará disponível em <http://localhost:3000>.

## Variáveis de ambiente

O arquivo `.env.local` deve ser criado a partir de `.env.example` e **nunca** é
versionado (`.env*` está no `.gitignore`, exceto `.env.example`).

| Variável                               | Descrição                                                    |
| -------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL do projeto Supabase                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública `sb_publishable_...` (ou a chave legada `anon`) |
| `SUPABASE_SECRET_KEY`                  | Chave secreta `sb_secret_...` — **somente servidor**, ignora RLS |

Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao navegador. Nunca use esse
prefixo para segredos, e nunca coloque a chave secreta / `service_role` no
frontend ou no repositório. A `SUPABASE_SECRET_KEY` ainda não é usada pelo
código; quando for, deve ser lida apenas em código de servidor.

## Scripts

| Comando             | Descrição                                                 |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                               |
| `npm run build`     | Build de produção para o Cloudflare (OpenNext: `next build` + Worker em `.open-next/`) |
| `npm run start`     | Executa o build de produção localmente                    |
| `npm run lint`      | ESLint (regras do Next.js + TypeScript)                   |
| `npm run typecheck` | Gera os tipos de rotas (`next typegen`) e roda `tsc --noEmit` |
| `npm run db:types`  | Regenera `src/types/database.types.ts` a partir do projeto Supabase vinculado |

## Estrutura

```
public/patterns/        Padrão vetorial de curvas de nível
src/
  app/                  Rotas (App Router), layout raiz, CSS global e favicon
    (public)/           Site público (layout com cabeçalho e rodapé)
    admin/              Área administrativa: (auth) login/recuperação, (protected) painel
    auth/callback/      Retorno dos links de e-mail do Supabase Auth
  proxy.ts              Sessão do Supabase Auth nas rotas /admin
  assets/brand/         Logotipo oficial (importado via next/image)
  components/
    ui/                 Design system: Button, Badge, Container, SectionHeading, CardMedia,
                        PageHeader, Breadcrumb, EmptyState, Pagination, TextLink, RichText
    layout/             Header, menu mobile, NavLink (item ativo), Footer, logotipo e PublicShell
    admin/              Barra lateral, cabeçalho, cartão de login e controles de formulário do painel
      homepage/         Formulário do módulo Homepage do CMS
    home/               Seções da homepage
    research/ projects/ publications/ institutions/ network/
                        Cards e listas compartilhados entre homepage e páginas internas
  data/
    site.ts             Navegação, pilares e fallbacks do conteúdo essencial
    admin-navigation.ts Módulos do painel administrativo
  lib/
    admin/              CMS: campos editáveis, validação e Server Actions de gravação
    auth/               Autorização administrativa, Server Actions de login e redirecionamentos seguros
    queries/            Consultas de conteúdo (públicas e contagens do painel)
    supabase/           Clientes Supabase (navegador, servidor e público)
    utils/              Utilitários (datas, DOI, links externos, parâmetros de URL)
  types/
    content.ts          Formatos de conteúdo derivados do schema
    database.types.ts   Tipos do banco gerados pelo Supabase CLI (não editar)
supabase/
  config.toml           Configuração do Supabase CLI (ambiente local)
  migrations/           Migrations SQL versionadas
docs/
  admin-auth.md         Autenticação, autorização e primeiro administrador
  cms.md                CMS: módulo Homepage, validação, salvamento e RLS de escrita
  database-schema.md    Modelo de dados
  deployment.md         Deploy no Cloudflare Workers e checklist de produção
  design-system.md      Tokens, tipografia, componentes e breakpoints
  public-pages.md       Rotas, filtros, consultas e regras das páginas públicas
```

Importações internas usam o alias `@/*` → `src/*`.

## Conteúdo da homepage

A homepage é um Server Component que lê o conteúdo publicado no Supabase pela
camada `src/lib/queries/`, em paralelo (`getHomepageData()`):

| Seção                  | Origem                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Hero, A Rede, Contato  | `homepage_content` (registro único)                         |
| Linhas de pesquisa     | `research_lines` publicadas (destaques primeiro, até 6)     |
| Projetos               | `projects` publicados e em destaque (até 3)                 |
| Publicações            | `publications` publicadas (destaques, depois mais recentes; até 5) |
| Instituições           | `institutions` publicadas, agrupadas por `institution_categories` |
| Rodapé e metadados     | `site_settings` e `social_links` ativos                     |

Regras:

- **Somente leitura pública** com a chave publishable: o RLS decide o que é
  visível (apenas registros publicados/ativos). A chave secreta não é usada.
- **Seções sem conteúdo não são renderizadas**; cada seção tem um link
  para a página interna correspondente ("Ver todas as linhas", "Ver todos os
  projetos"…).
- **Falhas de banco** são registradas no log do servidor (`[supabase] ...`) e
  nunca exibidas ao visitante. Textos essenciais (hero, apresentação, contato e
  nome institucional) têm fallback em `src/data/site.ts`; listas viram vazias.
- **Imagens**: os campos `*_path` aceitam por enquanto apenas caminhos locais
  (`/...` em `public/`). Caminhos do Storage são ignorados até que os buckets
  sejam configurados (`resolveImageSrc` em `src/lib/queries/shared.ts`).
- **Renderização sob demanda**: a homepage usa `dynamic = "force-dynamic"` e
  lê o banco a cada requisição, sem ISR. Dentro de uma mesma requisição as
  leituras são compartilhadas (`cache` do React), então layout e página não
  repetem consultas. Cache Components está desativado por incompatibilidade
  com o runtime do Cloudflare Workers (ver [`docs/deployment.md`](docs/deployment.md)).

## Páginas internas

A navegação principal aponta para as rotas reais (`/rede`, `/pesquisa`,
`/projetos`, `/publicacoes`, `/contato`; `/instituicoes` fica no rodapé), com
indicação do item ativo. Rotas, filtros, consultas, estados vazios e regras de
erro/404 estão em [`docs/public-pages.md`](docs/public-pages.md).

## Área administrativa

`/admin` usa Supabase Auth (e-mail e senha, sem cadastro público) e um vínculo
em `admin_memberships` (papéis `admin` e `editor`), verificado a cada
requisição. Não há usuário padrão: o primeiro administrador é criado no painel
do Supabase e vinculado por SQL. Fluxos, cookies, configuração de Redirect
URLs e passo a passo em [`docs/admin-auth.md`](docs/admin-auth.md).

### CMS

Primeiro módulo funcional: **`/admin/homepage`**, para administradores e
editores ativos. Edita os textos e botões da homepage (banner, apresentação da
rede e chamada para cooperação); ao salvar, o site público passa a exibir o
novo conteúdo na próxima requisição, sem build nem deploy.

- A gravação usa a sessão do próprio usuário: a Server Action confere vínculo,
  valida os campos e detecta edição simultânea; o banco aplica a policy de
  UPDATE da migration `20261109152838_enable_homepage_cms_updates.sql`
  (somente campos editoriais, somente `admin`/`editor` ativos).
- Testes de RLS: `npx supabase test db` (local) ou `npx supabase test db --remote`
  (transação desfeita no final).

**`/admin/linhas-de-pesquisa`** e **`/admin/projetos`**: listagem, cadastro,
edição, publicação, destaque, ordem e slug; projetos com busca, filtros e
paginação, e vínculo N:N com linhas de pesquisa. Novos registros começam como
rascunho; só administradores excluem, e apenas rascunhos sem vínculos. O
projeto e seus vínculos são salvos numa única transação (`save_project`).
Políticas e permissões na migration
`20261109161944_enable_research_lines_projects_cms.sql`.

Detalhes em [`docs/cms.md`](docs/cms.md).

## Supabase

O projeto usa o Supabase para banco de dados (PostgreSQL com Row Level
Security) e autenticação da área administrativa (Supabase Auth); o
armazenamento de arquivos virá nas próximas etapas. O modelo
de dados está documentado em [`docs/database-schema.md`](docs/database-schema.md).

Clientes disponíveis (tipados com `Database`):

- `@/lib/supabase/client` — para Client Components (navegador).
- `@/lib/supabase/server` — para Server Components, Server Actions e Route
  Handlers que dependem da sessão (cookies).
- `@/lib/supabase/public` — leitura de conteúdo público, sem sessão; pode ser
  usado em qualquer Server Component.

### Migrations

O banco é gerenciado **exclusivamente por migrations** versionadas em
`supabase/migrations/`, que são a fonte de verdade do schema. Evite alterar a
estrutura do banco remoto pelo painel do Supabase: toda mudança deve virar uma
migration no Git.

O Supabase CLI está instalado como dependência de desenvolvimento
(`npx supabase ...`).

Vincular o repositório ao projeto remoto (uma vez por máquina; o `link` pede a
senha do banco, em *Project Settings → Database*):

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

O `<project-ref>` é o subdomínio de `NEXT_PUBLIC_SUPABASE_URL`.

Criar e aplicar uma migration:

```bash
npx supabase migration new <nome_descritivo>
npx supabase db push --dry-run   # revisa o que será aplicado
npx supabase db push
```

Regenerar os tipos TypeScript após mudanças no schema:

```bash
npm run db:types
```

Para rodar o Supabase localmente (`npx supabase start`) é necessário Docker.

## Deploy

O site é publicado no **Cloudflare Workers** com o adaptador
[OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). A
configuração está versionada (`wrangler.jsonc`, `open-next.config.ts`,
`public/_headers`); a branch `main` é a de produção.

| Comando           | Descrição                                                         |
| ----------------- | ----------------------------------------------------------------- |
| `npm run preview` | Gera o Worker (`.open-next/`) e o executa localmente no runtime do Cloudflare (`http://localhost:8787`) |
| `npm run deploy`  | Gera e publica o Worker (exige `wrangler login`; em produção o deploy é feito pelo Workers Builds) |
| `npm run upload`  | Gera e envia uma nova versão sem publicá-la                       |

Passo a passo, configuração do painel e checklist em
[`docs/deployment.md`](docs/deployment.md).
