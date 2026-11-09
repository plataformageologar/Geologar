# Modelo de dados — GeoLogar

Schema do banco PostgreSQL (Supabase) que sustenta o conteúdo institucional do
portal. A fonte de verdade é a pasta [`supabase/migrations/`](../supabase/migrations/);
este documento descreve o estado definido por:

- `20261103141529_initial_geologar_content_schema.sql` (conteúdo)
- `20261103190445_admin_memberships.sql` (autorização administrativa)
- `20261109152838_enable_homepage_cms_updates.sql` (escrita da homepage pelo CMS)
- `20261109161944_enable_research_lines_projects_cms.sql` (CMS de linhas de
  pesquisa e projetos: políticas, constraints, FKs e `save_project`)

As migrations `20261103154631_initial_homepage_content.sql` e
`20261103183909_homepage_links_to_internal_pages.sql` apenas inserem e ajustam
dados, sem alterar a estrutura.

Toda alteração estrutural deve ser feita por uma nova migration. Não altere o
banco remoto manualmente pelo painel do Supabase.

## Visão geral

| Tabela                       | Tipo              | Visibilidade pública                     |
| ---------------------------- | ----------------- | ---------------------------------------- |
| `site_settings`              | Singleton         | Sempre                                   |
| `homepage_content`           | Singleton         | Sempre                                   |
| `research_lines`             | Conteúdo editorial | `is_published = true`                   |
| `projects`                   | Conteúdo editorial | `is_published = true`                   |
| `publications`               | Conteúdo editorial | `is_published = true`                   |
| `institutions`               | Conteúdo editorial | `is_published = true`                   |
| `institution_categories`     | Classificação     | Sempre                                   |
| `social_links`               | Configuração      | `is_active = true`                       |
| `project_research_lines`     | Relação N:N       | Quando os dois lados estão publicados    |
| `publication_projects`       | Relação N:N       | Quando os dois lados estão publicados    |
| `publication_research_lines` | Relação N:N       | Quando os dois lados estão publicados    |
| `admin_memberships`          | Autorização       | Nunca (cada usuário lê só o próprio registro) |

## Diagrama relacional

```mermaid
erDiagram
    research_lines ||--o{ project_research_lines : ""
    projects ||--o{ project_research_lines : ""
    projects ||--o{ publication_projects : ""
    publications ||--o{ publication_projects : ""
    publications ||--o{ publication_research_lines : ""
    research_lines ||--o{ publication_research_lines : ""
    institution_categories ||--o{ institutions : "RESTRICT"

    research_lines {
        uuid id PK
        text title
        text slug UK
        int sort_order
        bool is_featured
        bool is_published
        timestamptz published_at
    }
    projects {
        uuid id PK
        text title
        text slug UK
        text project_status "ongoing | completed"
        date start_date
        date end_date
        int sort_order
        bool is_featured
        bool is_published
        timestamptz published_at
    }
    publications {
        uuid id PK
        text title
        text slug UK
        text authors
        smallint publication_year
        text doi UK "opcional"
        int sort_order
        bool is_featured
        bool is_published
        timestamptz published_at
    }
    project_research_lines {
        uuid project_id PK, FK
        uuid research_line_id PK, FK
    }
    publication_projects {
        uuid publication_id PK, FK
        uuid project_id PK, FK
    }
    publication_research_lines {
        uuid publication_id PK, FK
        uuid research_line_id PK, FK
    }
    institution_categories {
        uuid id PK
        text name UK
        text slug UK
        int sort_order
    }
    institutions {
        uuid id PK
        uuid category_id FK
        text name
        int sort_order
        bool is_featured
        bool is_published
        timestamptz published_at
    }
    site_settings {
        uuid id PK
        text site_name
        text institutional_name
    }
    homepage_content {
        uuid id PK
        text hero_title
        text about_title
        text cooperation_title
    }
    social_links {
        uuid id PK
        text platform
        text url UK
        int sort_order
        bool is_active
    }
```

Navegação possível sem duplicar registros:

```
Linha de pesquisa ─┬─ Projetos     (project_research_lines)
                   └─ Publicações  (publication_research_lines)

Projeto ───────────┬─ Linhas de pesquisa (project_research_lines)
                   └─ Publicações        (publication_projects)

Publicação ────────┬─ Projetos           (publication_projects)
                   └─ Linhas de pesquisa (publication_research_lines)

Categoria ─────────── Instituições       (institutions.category_id)
```

## Tabelas

### `site_settings`

Configurações institucionais gerais (nome, contato, endereço, logotipo). Registro
único, garantido pelo índice `site_settings_singleton`. Informações de contato
ficam aqui; não há tabela de contato separada.

A migration insere o único registro com os dados confirmados:
`site_name = 'GeoLogar'` e
`institutional_name = 'Rede de Pesquisa em Geociências — Recursos Naturais e Sustentabilidade'`.
Os demais campos permanecem `NULL` até serem confirmados.

### `homepage_content`

Textos e chamadas dos blocos fixos da homepage (hero, sobre, cooperação) em
colunas estruturadas, não em JSON. Registro único (`homepage_content_singleton`).
Todos os campos aceitam `NULL`. A tabela nasce vazia.

### `research_lines`

Linhas de pesquisa. `slug` único. Constraints da Etapa 7.2:
`research_lines_title_not_blank`, `research_lines_slug_length` (≤ 160) e
`research_lines_sort_order_nonnegative`. Gerenciada pelo CMS
(ver [`cms.md`](cms.md#linhas-de-pesquisa-adminlinhas-de-pesquisa)).

### `projects`

Projetos de pesquisa. `project_status` aceita `ongoing` ou `completed` via
constraint `projects_status_check` (para novos status, altere apenas essa
constraint numa nova migration). `end_date` não pode ser anterior a
`start_date`. As linhas de pesquisa ficam em `project_research_lines`, não
nesta tabela. Mesmas constraints de título, slug e ordem das linhas de pesquisa
(`projects_title_not_blank`, `projects_slug_length`,
`projects_sort_order_nonnegative`).

**`public.save_project(...)`** (Etapa 7.2) grava o projeto e seus vínculos com
linhas de pesquisa numa única transação. `p_id` nulo cria; preenchido atualiza
somente se `updated_at` for igual a `p_expected_updated_at`. Erros próprios:
`GL404` (projeto inexistente), `GL409` (alterado por outra pessoa); `42501`
sem papel admin/editor; `22023` para lista de linhas inválida (nulos,
duplicatas ou mais de 100). É `SECURITY INVOKER` (respeita RLS) e só
`authenticated` pode executá-la.

### `publications`

Publicações científicas.

- `title` no idioma original da publicação.
- `authors`: texto no formato de citação, autores separados por `; `
  (ex.: `Silva, A.; Souza, B.`). Não há tabela de autores nesta fase.
- `publication_year`: entre 1800 e 2100, opcional.
- `doi`: opcional, sem prefixo de URL (ex.: `10.1234/abcd.5678`); único sem
  diferenciar maiúsculas/minúsculas. O CMS remove `https://doi.org/` e `doi:`
  antes de gravar.

**`public.save_publication(...)`** (Etapa 7.3) grava a publicação e seus
vínculos com projetos e linhas numa única transação, com verificação de versão
(`updated_at`; erros `GL404`/`GL409`) e validação das listas (`22023`). É
`SECURITY INVOKER` e só `authenticated` pode executá-la.

### `institution_categories`

Categorias de instituições parceiras. `name` e `slug` únicos. Nasce vazia.

### `institutions`

Instituições parceiras. `category_id` é obrigatório e usa `ON DELETE RESTRICT`:
uma categoria só pode ser excluída depois que suas instituições forem movidas ou
excluídas. Localização (`city`, `state`, `country`) é opcional.

### `social_links`

Redes sociais institucionais. `platform` é um identificador em minúsculas
(`instagram`, `youtube`, `linkedin`…). `url` é única. Só aparece publicamente
com `is_active = true`.

### `admin_memberships`

Vínculo administrativo de uma conta do Supabase Auth. Sem registro (ou com
`is_active = false`) a conta não acessa `/admin`. Detalhes de uso em
[`admin-auth.md`](admin-auth.md).

| Coluna       | Tipo          | Regra                                                      |
| ------------ | ------------- | ---------------------------------------------------------- |
| `user_id`    | `uuid`        | PK; FK para `auth.users(id)` com `ON DELETE CASCADE`        |
| `role`       | `text`        | `admin` ou `editor` (constraint `admin_memberships_role_check`) |
| `is_active`  | `boolean`     | Padrão `true`; `false` suspende o acesso sem apagar a conta |
| `created_at` / `updated_at` | `timestamptz` | Padrão `now()`; trigger `set_updated_at`      |

- Índice parcial `admin_memberships_active_role_idx` em `role` (apenas ativos).
- O papel vem sempre desta tabela — nunca de `user_metadata`, que o próprio
  usuário pode alterar.
- A migration não cria registros: o primeiro administrador é vinculado
  manualmente (ver [`admin-auth.md`](admin-auth.md#criar-o-primeiro-administrador)).

### Relações N:N

`project_research_lines`, `publication_projects` e `publication_research_lines`
usam chave primária composta pelos dois IDs, mais `created_at`. Há índice no
segundo ID de cada relação (o primeiro é coberto pela PK).

Comportamento na exclusão (desde a Etapa 7.2):

| FK                                                  | `ON DELETE` |
| --------------------------------------------------- | ----------- |
| `project_research_lines.project_id`                 | `RESTRICT`  |
| `project_research_lines.research_line_id`           | `RESTRICT`  |
| `publication_projects.project_id`                   | `RESTRICT`  |
| `publication_research_lines.research_line_id`       | `RESTRICT`  |
| `publication_projects.publication_id`               | `RESTRICT` (Etapa 7.3) |
| `publication_research_lines.publication_id`         | `RESTRICT` (Etapa 7.3) |

Nenhum registro com vínculos pode ser excluído (erro `23503`): os vínculos
precisam ser desfeitos antes, na edição.

## Regras de conteúdo

### Publicação

Entidades editoriais (`research_lines`, `projects`, `publications`,
`institutions`) usam:

- `is_published` (padrão `false`): o conteúdo só é público quando `true`.
- `published_at`: preenchido automaticamente na primeira publicação, se vazio
  (trigger `set_published_at`). Pode ser definido manualmente.

Não há outros estados editoriais nesta fase.

### Destaques e ordenação

`is_featured` indica presença na homepage e `sort_order` (padrão `0`) controla a
posição, em ordem crescente. Usados em linhas de pesquisa, projetos, publicações
e instituições; `sort_order` também existe em categorias e redes sociais.

### Slugs

Obrigatórios e únicos em `research_lines`, `projects`, `publications` e
`institution_categories`. O banco valida o formato: apenas `a-z`, `0-9` e
hífens simples entre palavras (`^[a-z0-9]+(-[a-z0-9]+)*$`). O CMS gera o slug
a partir do título (linhas de pesquisa e projetos limitados a 160 caracteres).

### Imagens

Caminhos de imagem (`image_path`, `hero_image_path`, `logo_path`) exigem o
texto alternativo correspondente (`image_alt`, `hero_image_alt`, `logo_alt`).
O upload (Supabase Storage) ainda não foi implementado.

### URLs

Campos de URL externa (`external_url`, `website_url`, `social_links.url`)
precisam começar com `http://` ou `https://`. Os campos `*_cta_href` da homepage
aceitam também caminhos internos (ex.: `/projetos`) e não são validados.

### Datas

Todas as tabelas têm `created_at` (relações N:N só `created_at`) e
`updated_at`, ambos `timestamptz` com padrão `now()`. A função compartilhada
`public.set_updated_at()` atualiza `updated_at` em todo `UPDATE`, via trigger
`set_updated_at` em cada tabela.

## Segurança

### Row Level Security

RLS está habilitado em **todas** as 12 tabelas. Políticas públicas de
`SELECT` nas 11 tabelas de conteúdo, para os papéis `anon` e `authenticated`:

| Tabela                                       | Condição de leitura                      |
| -------------------------------------------- | ---------------------------------------- |
| `site_settings`, `homepage_content`, `institution_categories` | sempre                   |
| `research_lines`, `projects`, `publications`, `institutions`  | `is_published`           |
| `social_links`                               | `is_active`                              |
| tabelas N:N                                  | as duas entidades vinculadas publicadas  |

Em `admin_memberships`, apenas `authenticated` tem `SELECT`, com a política
*"Users can read their own admin membership"* (`auth.uid() = user_id`); `anon`
não tem nenhum privilégio.

### Escrita

`anon` não escreve em nenhuma tabela. Para `authenticated`, as escritas
liberadas exigem vínculo ativo em `admin_memberships` (`user_id = auth.uid()`)
e se limitam a:

| Tabela                   | Operação | Quem          | Colunas / condição                                   |
| ------------------------ | -------- | ------------- | ---------------------------------------------------- |
| `homepage_content`       | UPDATE   | admin, editor | 13 colunas editoriais (Etapa 7.1)                    |
| `research_lines`         | INSERT   | admin, editor | `title`, `slug`, descrições, `sort_order`, `is_featured`, `is_published` |
| `research_lines`         | UPDATE   | admin, editor | as mesmas + `image_alt`                              |
| `research_lines`         | DELETE   | admin         | somente `is_published = false`                       |
| `projects`               | INSERT   | admin, editor | colunas editoriais (sem `id`, datas de controle, `published_at`, `image_path`) |
| `projects`               | UPDATE   | admin, editor | as mesmas + `image_alt`                              |
| `projects`               | DELETE   | admin         | somente `is_published = false`                       |
| `project_research_lines` | INSERT, DELETE | admin, editor | `project_id`, `research_line_id`               |
| `publications`           | INSERT, UPDATE | admin, editor | colunas editoriais (sem `id`, datas de controle, `published_at`) |
| `publications`           | DELETE   | admin         | somente `is_published = false`                       |
| `publication_projects`, `publication_research_lines` | INSERT, DELETE | admin, editor | os dois IDs     |
| `institutions`           | INSERT   | admin, editor | colunas editoriais (sem `logo_path`, `logo_alt`)     |
| `institutions`           | UPDATE   | admin, editor | as mesmas + `logo_alt`                               |
| `institutions`           | DELETE   | admin         | somente `is_published = false`                       |
| `institution_categories` | INSERT, UPDATE, DELETE | admin | `name`, `slug`, `description`, `sort_order`  |
| `site_settings`          | UPDATE   | admin         | 10 colunas textuais (sem `logo_path`, `favicon_path`) |
| `social_links`           | INSERT, UPDATE, DELETE | admin | `platform`, `label`, `url`, `sort_order`, `is_active` |

Admin e editor também leem rascunhos de `research_lines`, `projects`,
`publications`, `institutions`, os links inativos de `social_links` e as três
tabelas N:N (políticas *"CMS staff can read all …"*). As políticas usam a
função `public.has_cms_role(text[])` (`SECURITY INVOKER`, `search_path` vazio,
executável só por `authenticated`).

`id`, `created_at`, `updated_at`, `published_at`, `image_path`, `logo_path` e
`favicon_path` não recebem GRANT de escrita. `site_settings` não tem INSERT nem
DELETE (registro único). Testes em
`supabase/tests/database/homepage_content_rls.test.sql`,
`research_lines_projects_rls.test.sql` e
`publications_institutions_settings_rls.test.sql`.

`service_role` ignora RLS e não é usado pelo CMS. `admin_memberships` não tem
escrita: nenhum usuário cria, altera ou promove o próprio vínculo; o primeiro
administrador é vinculado pelo SQL Editor. As políticas das próximas tabelas
serão criadas módulo a módulo (ver [`cms.md`](cms.md)).

As funções de trigger usam `search_path` vazio e não podem ser executadas
diretamente por `anon`/`authenticated`.

## Ainda não implementado

- Gestão de usuários pelo painel.
- Supabase Storage (buckets e políticas de arquivos).
- Tabela de autores de publicações.
- Formulário de contato (mensagens recebidas).
- Conteúdo inicial: linhas de pesquisa, categorias, instituições, projetos,
  publicações, redes sociais e textos da homepage.
