# GeoLogar

Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade.

Portal institucional da GeoLogar. Este repositório contém, por enquanto, apenas a
fundação técnica da aplicação; homepage, páginas internas, CMS e autenticação
serão implementados nas próximas etapas.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org) (modo estrito)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Storage)
- [Netlify](https://www.netlify.com) (deploy)

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
| `SHOW_CONTENT_PLACEHOLDERS`            | `true` exibe o conteúdo provisório em builds de revisão (ver abaixo) |

Variáveis com prefixo `NEXT_PUBLIC_` são expostas ao navegador. Nunca use esse
prefixo para segredos, e nunca coloque a chave secreta / `service_role` no
frontend ou no repositório. A `SUPABASE_SECRET_KEY` ainda não é usada pelo
código; quando for, deve ser lida apenas em código de servidor.

## Scripts

| Comando             | Descrição                                                 |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                               |
| `npm run build`     | Build de produção                                         |
| `npm run start`     | Executa o build de produção localmente                    |
| `npm run lint`      | ESLint (regras do Next.js + TypeScript)                   |
| `npm run typecheck` | Gera os tipos de rotas (`next typegen`) e roda `tsc --noEmit` |
| `npm run db:types`  | Regenera `src/types/database.types.ts` a partir do projeto Supabase vinculado |

## Estrutura

```
public/patterns/        Padrão vetorial de curvas de nível
src/
  app/                  Rotas (App Router), layout raiz, CSS global e favicon
  assets/brand/         Logotipo oficial (importado via next/image)
  components/
    ui/                 Design system: Button, Badge, Container, SectionHeading, CardMedia
    layout/             Header, menu mobile, Footer e logotipo
    home/               Seções e cards da homepage
  data/
    site.ts             Conteúdo validado do briefing (temporário, até o Supabase)
    placeholders.ts     Conteúdo provisório apenas para revisão de layout
  lib/
    supabase/           Clientes Supabase (navegador e servidor)
    utils/              Utilitários compartilhados
  types/
    content.ts          Formatos de conteúdo derivados do schema
    database.types.ts   Tipos do banco gerados pelo Supabase CLI (não editar)
supabase/
  config.toml           Configuração do Supabase CLI (ambiente local)
  migrations/           Migrations SQL versionadas
docs/
  database-schema.md    Modelo de dados
  design-system.md      Tokens, tipografia, componentes e breakpoints
```

Importações internas usam o alias `@/*` → `src/*`.

## Conteúdo da homepage

Nesta fase a homepage usa dados locais; a integração com o Supabase virá na
próxima etapa, sem mudar os componentes (as props seguem os tipos do schema).

- `src/data/site.ts`: textos do briefing (hero, apresentação, pilares, linhas
  de pesquisa, chamada de cooperação).
- `src/data/placeholders.ts`: projetos, publicações e instituições de
  **exemplo**, com textos genéricos e marcados como "Conteúdo provisório".
  Aparecem em `npm run dev` ou com `SHOW_CONTENT_PLACEHOLDERS=true`; no build
  de produção padrão, as seções mostram apenas uma mensagem de "em breve".

Enquanto as páginas internas não existem, a navegação aponta para as seções
da homepage (`/#pesquisa`, `/#projetos`…) e ações sem destino real (como
"Ver todos", "Conheça a GeoLogar" e "Fale com a GeoLogar") não são exibidas.

## Supabase

O projeto usa o Supabase para banco de dados (PostgreSQL com Row Level
Security), e futuramente para autenticação e armazenamento de arquivos. O modelo
de dados está documentado em [`docs/database-schema.md`](docs/database-schema.md).

Clientes disponíveis (tipados com `Database`):

- `@/lib/supabase/client` — para Client Components (navegador).
- `@/lib/supabase/server` — para Server Components, Server Actions e Route Handlers.

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

O deploy será feito no Netlify, que detecta projetos Next.js automaticamente.
Não há configuração específica (`netlify.toml`) por enquanto.
