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

## Estrutura

```
public/                 Arquivos estáticos
src/
  app/                  Rotas (App Router), layout raiz e CSS global
  components/
    layout/             Componentes estruturais (ex.: Container)
  lib/
    supabase/           Clientes Supabase (navegador e servidor)
supabase/
  config.toml           Configuração do Supabase CLI (ambiente local)
  migrations/           Migrations SQL versionadas
```

Pastas previstas para as próximas etapas, criadas quando houver uso real:
`src/components/ui/` (design system), `src/lib/utils/` (utilitários
compartilhados) e `src/types/` (tipos compartilhados, incluindo os tipos gerados
do banco).

Importações internas usam o alias `@/*` → `src/*`.

## Supabase

O projeto utilizará o Supabase para banco de dados (PostgreSQL com Row Level
Security), autenticação e armazenamento de arquivos. **O schema de negócio ainda
não foi implementado** — será modelado na próxima etapa por meio de migrations
versionadas em `supabase/migrations/`.

Clientes disponíveis:

- `@/lib/supabase/client` — para Client Components (navegador).
- `@/lib/supabase/server` — para Server Components, Server Actions e Route Handlers.

O Supabase CLI está instalado como dependência de desenvolvimento
(`npx supabase ...`). Comandos úteis quando o banco for modelado:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration new <nome>
npx supabase db push
npx supabase gen types typescript --remote > src/types/database.types.ts
```

Para rodar o Supabase localmente (`npx supabase start`) é necessário Docker.

## Deploy

O deploy será feito no Netlify, que detecta projetos Next.js automaticamente.
Não há configuração específica (`netlify.toml`) por enquanto.
