# GeoLogar

Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade.

Portal institucional da GeoLogar. Nesta fase o repositório contém a homepage
e as páginas públicas (A Rede, Pesquisa, Projetos, Publicações, Instituições e
Contato), integradas ao Supabase (leitura pública via RLS), e a área
administrativa (`/admin`: login, autorização por papel, painel e o CMS de
homepage, linhas de pesquisa, projetos, publicações, instituições,
informações institucionais e redes sociais). Upload de imagens e biblioteca de
mídia virão na próxima etapa.

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

As variáveis do formulário de contato (`CONTACT_FORM_ENABLED`,
`CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
`RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`) são de **runtime** do Worker: no
painel do Cloudflare em produção e em `.dev.vars` localmente (modelo em
`.dev.vars.example`) — nunca em `.env*`. Ver
[`docs/contact-form.md`](docs/contact-form.md).

## Scripts

| Comando             | Descrição                                                 |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                               |
| `npm run build`     | Build de produção para o Cloudflare (OpenNext: `next build` + Worker em `.open-next/`) |
| `npm run start`     | Executa o build de produção localmente                    |
| `npm run lint`      | ESLint (regras do Next.js + TypeScript)                   |
| `npm run typecheck` | Gera os tipos de rotas (`next typegen`) e roda `tsc --noEmit` |
| `npm test`          | Testes unitários do formulário de contato (`node --test`, sem rede) |
| `npm run db:types`  | Regenera `src/types/database.types.ts` a partir do projeto Supabase vinculado |

## Estrutura

```
public/patterns/        Padrão vetorial de curvas de nível
public/brand/           Favicon oficial (fallback do favicon configurável)
src/
  app/                  Rotas (App Router), layout raiz (metadados e favicon) e CSS global
    (public)/           Site público (layout com cabeçalho e rodapé)
    admin/              Área administrativa: (auth) login/recuperação, (protected) painel,
                        (preview) prévia de demonstração
    auth/callback/      Retorno dos links de e-mail do Supabase Auth
    api/contact/        Envio do formulário de contato (POST)
  proxy.ts              Sessão do Supabase Auth nas rotas /admin
  assets/brand/         Logotipo oficial (importado via next/image)
  components/
    ui/                 Design system: Button, Badge, Container, SectionHeading, CardMedia,
                        PageHeader, Breadcrumb, EmptyState, Pagination, TextLink, RichText
    layout/             Header, menu mobile, NavLink (item ativo), Footer, logotipo e PublicShell
    admin/              Barra lateral, cabeçalho, cartão de login e controles de formulário do painel
      homepage/         Formulário do módulo Homepage do CMS
      media/            Biblioteca de mídia: grade, envio, seletor e campo de imagem
    home/               Seções da homepage
    contact/            Formulário de contato e widget do Turnstile
    demo/               Notas da prévia de demonstração (somente /admin/demonstracao)
    research/ projects/ publications/ institutions/ network/
                        Cards e listas compartilhados entre homepage e páginas internas
  data/
    site.ts             Navegação, pilares e fallbacks do conteúdo essencial
    admin-navigation.ts Módulos do painel administrativo
  lib/
    admin/              CMS: campos editáveis, validação e Server Actions de gravação
    auth/               Autorização administrativa, Server Actions de login e redirecionamentos seguros
    contact/            Formulário de contato: validação, Turnstile, e-mail (Resend) e limite de envios
    media/              Bucket, limites, verificação de arquivos e referências de imagem
    queries/            Consultas de conteúdo (públicas e contagens do painel)
    supabase/           Clientes Supabase (navegador, servidor e público)
    utils/              Utilitários (datas, DOI, links externos, parâmetros de URL)
  types/
    content.ts          Formatos de conteúdo derivados do schema
    database.types.ts   Tipos do banco gerados pelo Supabase CLI (não editar)
tests/
  contact/              Testes unitários do formulário de contato
  support/              Resolução de imports .ts para o node --test
supabase/
  config.toml           Configuração do Supabase CLI (ambiente local)
  migrations/           Migrations SQL versionadas
docs/
  admin-auth.md         Autenticação, autorização e primeiro administrador
  cms.md                CMS: módulos, validação, salvamento, exclusão e RLS de escrita
  contact-form.md       Formulário de contato: segurança, variáveis, testes e ativação
  content-handover.md   Conteúdos que a equipe GeoLogar precisa fornecer ou aprovar
  database-schema.md    Modelo de dados
  deployment.md         Deploy no Cloudflare Workers e checklist de produção
  design-system.md      Tokens, tipografia, componentes e breakpoints
  initial-content-manifest.md  Materiais de referência: o que foi importado, associado ou descartado
  media-library.md      Biblioteca de mídia (Supabase Storage), imagens e exclusão segura
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
- **Imagens**: os campos `*_path` guardam objetos da biblioteca de mídia
  (`uploads/<uuid>.<ext>` no bucket `geologar-media`) ou caminhos locais
  legados (`/...`); `resolveImageSrc` (`src/lib/queries/shared.ts`) gera a
  URL pública e ignora qualquer outro valor.
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

**`/admin/publicacoes`**, **`/admin/instituicoes`** (com
`/admin/instituicoes/categorias`), **`/admin/configuracoes`** e
**`/admin/redes-sociais`**: publicações com DOI normalizado e vínculos com
projetos e linhas (gravação atômica em `save_publication`); instituições por
categoria; informações institucionais usadas no rodapé, em `/contato` e nos
metadados; redes sociais ativas no rodapé. Categorias, configurações e redes
sociais são editadas só por administradores. Políticas na migration
`20261109175247_enable_publications_institutions_settings_cms.sql`.

**`/admin/midias`** (Biblioteca de mídia): envio de imagens JPEG, PNG e WebP
(até 5 MB) direto para o bucket público `geologar-media` do Supabase Storage,
busca, filtro de arquivos sem uso, cópia da URL e exclusão segura (somente
admin, somente arquivos sem uso). Os formulários de homepage, linhas de
pesquisa, projetos, instituições e configurações (logotipo e favicon) escolhem
imagens da biblioteca. Migration `20261119120000_enable_media_library.sql`;
detalhes e o guia "Como adicionar uma imagem a um projeto" em
[`docs/media-library.md`](docs/media-library.md).

**`/admin/demonstracao`** (Prévia de demonstração): a homepage com os mesmos
componentes do site, mais os rascunhos de projeto e notas sobre o que está
publicado, em rascunho ou pendente. Exige login (admin ou editor), não é
indexada e não altera nada.

Detalhes em [`docs/cms.md`](docs/cms.md).

### População inicial (Etapa 8.5)

O conteúdo de demonstração foi preparado a partir da referência visual e do
pacote de imagens recebidos em 19/11/2026: seis imagens provisórias nas
linhas de pesquisa (recortes do mockup, publicados como demonstração) e três
projetos em rascunho com situação "A confirmar"
(migration `20261119180000_allow_project_drafts_without_status.sql`). Logotipos
de instituições, publicações e contatos do mockup não foram usados. O que foi
importado, de onde e por quê está em
[`docs/initial-content-manifest.md`](docs/initial-content-manifest.md); o que
a equipe precisa fornecer ou aprovar está em
[`docs/content-handover.md`](docs/content-handover.md). Importado não
significa aprovado.

### Formulário de contato (Etapa 9)

`/contato` tem um formulário (nome, e-mail, assunto fixo e mensagem) enviado
por e-mail via Resend, protegido por Cloudflare Turnstile, honeypot, limite de
5 envios/minuto por visitante (binding de Rate Limiting do Workers) e
validação estrita no servidor (`/api/contact`). Nenhuma mensagem é gravada no
banco. **Fica oculto até que as variáveis de runtime sejam configuradas**
com os dados da GeoLogar; até lá a página mostra só os canais publicados.
Detalhes, testes e checklist de ativação em
[`docs/contact-form.md`](docs/contact-form.md).

### Editor visual e personalização (Etapa 9.5)

**`/admin/editor?pagina=/`** abre o editor visual: a página real renderizada
com os componentes públicos, seleção por clique, painel de propriedades,
prévia em celular/tablet/computador, desfazer/refazer, `Ctrl+S` e detecção de
edição simultânea. Com sessão, o site mostra o botão **“Editar esta página”**
(verificado no servidor; nenhum código do editor vai para visitantes).

Novas telas no grupo **Site** do painel: seções e blocos (`/admin/secoes`),
pilares, textos das páginas internas, navegação e aparência. Pilares, menus,
seções, textos, rodapé e aparência agora ficam no banco (migration
`20261120090000_visual_editor_customization.sql`), com validação de JSONB,
RLS por papel e gravação atômica das listas. Documentação técnica em
[`docs/visual-editor.md`](docs/visual-editor.md); guia para a equipe em
[`docs/guia-edicao-geologar.md`](docs/guia-edicao-geologar.md).

## Supabase

O projeto usa o Supabase para banco de dados (PostgreSQL com Row Level
Security), autenticação da área administrativa (Supabase Auth) e
armazenamento das imagens do portal (Supabase Storage, bucket
`geologar-media`). O modelo
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
